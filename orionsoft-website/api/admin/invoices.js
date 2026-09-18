import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { get, set, incr } from "../store.js";
import { renderInvoicePdf } from "../_lib/pdf.js";
import { sendEmail, brandedShell } from "../_lib/mailer.js";
import { logAudit } from "../_lib/audit.js";

async function storePdf(key, pdfBytes) { await set(key, Buffer.from(pdfBytes).toString("base64")); }

function computeTotal(invoice) {
  const subtotal = (invoice.items || []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const discount = Number(invoice.discount) || 0;
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = taxable * ((Number(invoice.taxPercent) || 0) / 100);
  return { subtotal, total: taxable + taxAmount };
}

async function nextInvoiceNumber() {
  const next = await incr("orionsoft:invoices:seq");
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(next).padStart(4, "0")}`;
}

async function generateAndStorePdf(invoice) {
  const pdfBytes = await renderInvoicePdf(invoice);
  const key = `orionsoft:files:invoice_${invoice.id}`;
  await storePdf(key, pdfBytes);
  return key;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    if (req.query.id) {
      const invoice = await getRecord("invoices", req.query.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      return res.json({ ok: true, invoice });
    }
    const invoices = await listRecords("invoices");
    return res.json({ ok: true, invoices: invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  }

  if (req.method === "POST") {
    const { clientName, clientEmail, clientAddress, items, currency, taxPercent, discount, issueDate, dueDate, notes } = req.body || {};
    if (!clientName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "clientName and at least one line item are required" });
    }
    const id = newId("inv");
    const invoice = {
      id, invoiceNumber: await nextInvoiceNumber(),
      clientName, clientEmail: clientEmail || "", clientAddress: clientAddress || "",
      items: items.map(it => ({ description: it.description || "", qty: Number(it.qty) || 1, unitPrice: Number(it.unitPrice) || 0 })),
      currency: currency || "NGN", taxPercent: Number(taxPercent) || 0, discount: Number(discount) || 0,
      issueDate: issueDate || new Date().toISOString().slice(0, 10), dueDate: dueDate || null, notes: notes || "",
      status: "draft", pdfKey: null, paidAt: null,
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };
    invoice.pdfKey = await generateAndStorePdf(invoice);
    await putRecord("invoices", id, invoice);
    await logAudit(session, "create_invoice", `invoice ${invoice.invoiceNumber}`, clientName);
    return res.json({ ok: true, invoice });
  }

  if (req.method === "PATCH") {
    const { id, action } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const invoice = await getRecord("invoices", id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    if (action === "send") {
      if (!invoice.clientEmail) return res.status(400).json({ error: "This invoice has no client email on file." });
      const pdfB64 = await get(invoice.pdfKey);
      const pdfBuffer = pdfB64 ? Buffer.from(pdfB64, "base64") : null;
      const { total } = computeTotal(invoice);
      const html = brandedShell(
        `<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Invoice ${invoice.invoiceNumber}</h2>
         <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${invoice.clientName}, please find attached an invoice for ${invoice.currency} ${total.toLocaleString()}${invoice.dueDate ? `, due ${new Date(invoice.dueDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}` : ""}.</p>`,
        { title: "Invoice From Orion Soft Limited" },
      );
      await sendEmail(invoice.clientEmail, `Invoice ${invoice.invoiceNumber}`, html, {
        kind: "invoice_sent",
        attachments: pdfBuffer ? [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer }] : undefined,
      });
      invoice.status = "sent";
      invoice.sentAt = new Date().toISOString();
      invoice.updatedAt = new Date().toISOString();
      await putRecord("invoices", id, invoice);
      await logAudit(session, "send_invoice", `invoice ${invoice.invoiceNumber}`, invoice.clientName);
      return res.json({ ok: true, invoice });
    }

    if (action === "mark_paid") {
      invoice.status = "paid";
      invoice.paidAt = new Date().toISOString();
      invoice.updatedAt = new Date().toISOString();
      await putRecord("invoices", id, invoice);
      await logAudit(session, "mark_invoice_paid", `invoice ${invoice.invoiceNumber}`, invoice.clientName);
      return res.json({ ok: true, invoice });
    }

    if (action === "cancel") {
      invoice.status = "cancelled";
      invoice.updatedAt = new Date().toISOString();
      await putRecord("invoices", id, invoice);
      await logAudit(session, "cancel_invoice", `invoice ${invoice.invoiceNumber}`, invoice.clientName);
      return res.json({ ok: true, invoice });
    }

    if (invoice.status !== "draft") {
      return res.status(400).json({ error: "Only draft invoices can be edited directly. Use an action instead." });
    }
    const { clientName, clientEmail, clientAddress, items, currency, taxPercent, discount, issueDate, dueDate, notes } = req.body;
    if (clientName !== undefined) invoice.clientName = clientName;
    if (clientEmail !== undefined) invoice.clientEmail = clientEmail;
    if (clientAddress !== undefined) invoice.clientAddress = clientAddress;
    if (items !== undefined) invoice.items = items.map(it => ({ description: it.description || "", qty: Number(it.qty) || 1, unitPrice: Number(it.unitPrice) || 0 }));
    if (currency !== undefined) invoice.currency = currency;
    if (taxPercent !== undefined) invoice.taxPercent = Number(taxPercent) || 0;
    if (discount !== undefined) invoice.discount = Number(discount) || 0;
    if (issueDate !== undefined) invoice.issueDate = issueDate;
    if (dueDate !== undefined) invoice.dueDate = dueDate;
    if (notes !== undefined) invoice.notes = notes;
    invoice.updatedAt = new Date().toISOString();
    invoice.pdfKey = await generateAndStorePdf(invoice);
    await putRecord("invoices", id, invoice);
    return res.json({ ok: true, invoice });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const invoice = await getRecord("invoices", id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status !== "draft") return res.status(400).json({ error: "Only draft invoices can be deleted" });
    await deleteRecord("invoices", id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
