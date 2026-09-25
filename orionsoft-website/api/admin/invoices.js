// Invoices: create, edit drafts, send / remind by email, record (and undo)
// payments, void, duplicate. Same rules as the Orion License Manager:
//   draft → sent → partially_paid → paid, or → void (never once fully paid).
// Totals, overdue and amount-in-words come from api/_lib/invoicing.js.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { get, set, incr } from "../store.js";
import { renderInvoicePdf } from "../_lib/pdf.js";
import { sendEmail, brandedShell } from "../_lib/mailer.js";
import { logAudit } from "../_lib/audit.js";
import { getCompanySettings } from "../_lib/settings.js";
import { computeTotals, normaliseInvoice, statusAfterPayment, isOverdue, PAYMENT_METHODS, INVOICE_TEMPLATES } from "../_lib/invoicing.js";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];
const today = () => new Date().toISOString().slice(0, 10);
const isDate = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function nextInvoiceNumber() {
  const next = await incr("orionsoft:invoices:seq");
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(next).padStart(4, "0")}`;
}

async function storePdf(invoice) {
  const key = `orionsoft:files:invoice_${invoice.id}`;
  await set(key, Buffer.from(await renderInvoicePdf(invoice)).toString("base64"));
  return key;
}

// What the admin UI receives: the record plus its computed money fields.
function decorate(inv) {
  const n = normaliseInvoice(inv);
  return { ...n, ...computeTotals(n), overdue: isOverdue(n) };
}

// Validates and cleans the editable fields. Returns { data } or { error }.
function cleanFields(b, { partial = false } = {}) {
  const d = {};
  const str = (k, max = 300) => { if (b[k] !== undefined) d[k] = String(b[k] ?? "").trim().slice(0, max); };
  str("clientName", 160); str("clientEmail", 160); str("clientPhone", 40); str("clientAddress", 500);
  str("notes", 2000); str("terms", 2000); str("taxLabel", 20);
  if (b.template !== undefined) d.template = INVOICE_TEMPLATES.includes(b.template) ? b.template : "";
  if (!partial && !d.clientName) return { error: "Client name is required" };
  if (d.clientEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.clientEmail)) return { error: "Client email doesn't look right" };
  if (b.items !== undefined) {
    if (!Array.isArray(b.items)) return { error: "Line items are missing" };
    d.items = b.items
      .map(it => ({ description: String(it.description || "").trim().slice(0, 500), qty: Number(it.qty), unitPrice: Number(it.unitPrice) }))
      .filter(it => it.description);
    if (!d.items.length) return { error: "Add at least one line item with a description" };
    if (d.items.some(it => !(it.qty > 0))) return { error: "Each line item needs a quantity above 0" };
    if (d.items.some(it => !(it.unitPrice >= 0))) return { error: "Unit prices can't be negative" };
  } else if (!partial) return { error: "Add at least one line item with a description" };
  if (b.currency !== undefined) {
    if (!CURRENCIES.includes(b.currency)) return { error: `Currency must be one of ${CURRENCIES.join(", ")}` };
    d.currency = b.currency;
  }
  if (b.taxPercent !== undefined) {
    const v = Number(b.taxPercent) || 0;
    if (v < 0 || v > 100) return { error: "Tax must be between 0 and 100%" };
    d.taxPercent = v;
  }
  if (b.discountType !== undefined) d.discountType = ["percent", "fixed"].includes(b.discountType) ? b.discountType : null;
  if (b.discountValue !== undefined) {
    const v = Number(b.discountValue) || 0;
    if (v < 0) return { error: "Discount can't be negative" };
    if ((b.discountType ?? d.discountType) === "percent" && v > 100) return { error: "A percentage discount can't be over 100%" };
    d.discountValue = v;
  }
  for (const k of ["issueDate", "dueDate"]) {
    if (b[k] === undefined) continue;
    if (b[k] === "" || b[k] === null) { d[k] = k === "issueDate" ? today() : null; continue; }
    if (!isDate(b[k])) return { error: `${k === "issueDate" ? "Issue" : "Due"} date is not a valid date` };
    d[k] = b[k];
  }
  const issue = d.issueDate || b.issueDate, due = d.dueDate;
  if (issue && due && due < issue) return { error: "The due date can't be before the issue date" };
  return { data: d };
}

function cleanPayment(b, balance) {
  const amount = Math.round((Number(b.amount) || 0) * 100) / 100;
  if (!(amount > 0)) return { error: "Enter a payment amount above 0" };
  if (amount > balance + 0.004) return { error: `That's more than the balance of ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` };
  if (b.paidAt && !isDate(b.paidAt)) return { error: "Payment date is not a valid date" };
  return { payment: {
    id: newId("pay"), amount, method: PAYMENT_METHODS.includes(b.method) ? b.method : "bank_transfer",
    reference: String(b.reference || "").trim().slice(0, 80), paidAt: b.paidAt || today(),
    notes: String(b.notes || "").trim().slice(0, 300), recordedAt: new Date().toISOString(),
  } };
}

const money = (n, c) => `${c} ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longDate = d => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

async function emailInvoice(invoice, kind) {
  const company = await getCompanySettings();
  const t = computeTotals(invoice);
  const pdf = Buffer.from(await renderInvoicePdf(invoice));
  const due = invoice.dueDate ? longDate(invoice.dueDate) : "";
  const bank = String(company.bankDetails || "").trim();
  const lead = {
    invoice: `Please find attached invoice <strong>${esc(invoice.invoiceNumber)}</strong> for <strong>${money(t.total, invoice.currency)}</strong>${due ? `, due on ${due}` : ""}.`,
    reminder: `This is a friendly reminder that invoice <strong>${esc(invoice.invoiceNumber)}</strong> has a balance of <strong>${money(t.balance, invoice.currency)}</strong>${due ? `, ${isOverdue(invoice) ? "which was due on" : "due on"} ${due}` : ""}. The latest copy is attached.`,
    receipt: `Thank you. We've received your payment towards invoice <strong>${esc(invoice.invoiceNumber)}</strong>. ${t.balance > 0 ? `The remaining balance is <strong>${money(t.balance, invoice.currency)}</strong>.` : "The invoice is now <strong>fully paid</strong>."} An updated copy is attached.`,
  }[kind];
  const html = brandedShell(
    `<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">${kind === "receipt" ? "Payment received" : `Invoice ${esc(invoice.invoiceNumber)}`}</h2>
     <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${esc(invoice.clientName)},</p>
     <p style="color:#3A4556;font-size:14px;line-height:1.7;">${lead}</p>
     ${kind !== "receipt" && bank ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;"><strong>Payment details</strong><br>${esc(bank).replace(/\n/g, "<br>")}<br>Reference: ${esc(invoice.invoiceNumber)}</p>` : ""}
     <p style="color:#3A4556;font-size:14px;line-height:1.7;">Kind regards,<br>${esc(company.companyName)}</p>`,
    { title: kind === "receipt" ? `Payment received: ${invoice.invoiceNumber}` : `Invoice from ${company.companyName}` },
  );
  const subject = { invoice: `Invoice ${invoice.invoiceNumber} from ${company.companyName}`, reminder: `Reminder: invoice ${invoice.invoiceNumber}`, receipt: `Payment received for invoice ${invoice.invoiceNumber}` }[kind];
  await sendEmail(invoice.clientEmail, subject, html, { kind: `invoice_${kind}`, attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdf }] });
}

async function save(invoice) {
  invoice.updatedAt = new Date().toISOString();
  invoice.pdfKey = await storePdf(invoice);
  await putRecord("invoices", invoice.id, invoice);
  return decorate(invoice);
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
    // Always-current PDF (the OVERDUE stamp depends on today's date).
    if (req.query.pdf) {
      const inv = await getRecord("invoices", req.query.pdf);
      if (!inv) return res.status(404).json({ error: "Invoice not found" });
      const pdf = Buffer.from(await renderInvoicePdf(inv));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${req.query.download ? "attachment" : "inline"}; filename="${inv.invoiceNumber}.pdf"`);
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(pdf);
    }
    if (req.query.id) {
      const invoice = await getRecord("invoices", req.query.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      return res.json({ ok: true, invoice: decorate(invoice) });
    }
    const [invoices, company] = await Promise.all([listRecords("invoices"), getCompanySettings()]);
    return res.json({
      ok: true,
      invoices: invoices.map(decorate).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      defaults: { terms: company.invoiceTerms || "", bankDetails: company.bankDetails || "", template: company.invoiceTemplate || "classic" },
    });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const { data, error } = cleanFields(b);
    if (error) return res.status(400).json({ error });
    const company = await getCompanySettings();
    const id = newId("inv");
    const invoice = {
      id, invoiceNumber: await nextInvoiceNumber(),
      clientName: "", clientEmail: "", clientPhone: "", clientAddress: "",
      currency: "NGN", taxPercent: 0, taxLabel: "VAT", discountType: null, discountValue: 0,
      issueDate: today(), dueDate: null, notes: "", terms: b.terms === undefined ? company.invoiceTerms || "" : "",
      ...data,
      status: "draft", payments: [], pdfKey: null, paidAt: null,
      createdAt: new Date().toISOString(), createdBy: session.sub,
    };
    // Paid (or partly paid) on the spot: the invoice is issued with the payment.
    if (b.initialPayment && Number(b.initialPayment.amount) > 0) {
      const { payment, error: pErr } = cleanPayment(b.initialPayment, computeTotals(invoice).total);
      if (pErr) return res.status(400).json({ error: pErr });
      invoice.payments.push({ ...payment, recordedBy: session.sub });
      const t = computeTotals(invoice);
      invoice.status = statusAfterPayment(t.total, t.amountPaid);
      invoice.sentAt = new Date().toISOString();
      if (invoice.status === "paid") invoice.paidAt = new Date().toISOString();
    }
    const out = await save(invoice);
    await logAudit(session, "create_invoice", `invoice ${invoice.invoiceNumber}`, invoice.clientName);
    return res.json({ ok: true, invoice: out });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    if (!b.id) return res.status(400).json({ error: "id is required" });
    const stored = await getRecord("invoices", b.id);
    if (!stored) return res.status(404).json({ error: "Invoice not found" });
    const invoice = normaliseInvoice(stored);
    const t = computeTotals(invoice);
    const ref = `invoice ${invoice.invoiceNumber}`;

    // Email the invoice (a draft becomes "sent"; an outstanding one gets a reminder).
    if (b.action === "send") {
      if (!invoice.clientEmail) return res.status(400).json({ error: "Add the client's email to send this invoice." });
      if (!invoice.items?.length) return res.status(400).json({ error: "Can't send an invoice with no line items." });
      if (["paid", "void"].includes(invoice.status)) return res.status(400).json({ error: `This invoice is ${invoice.status === "paid" ? "already paid" : "void"}.` });
      const reminder = invoice.status !== "draft";
      try { await emailInvoice(invoice, reminder ? "reminder" : "invoice"); }
      catch (e) { return res.status(502).json({ error: `The email couldn't be sent: ${e.message}` }); }
      if (!reminder) { invoice.status = "sent"; invoice.sentAt = new Date().toISOString(); }
      invoice.lastEmailedAt = new Date().toISOString();
      invoice.reminders = (invoice.reminders || 0) + (reminder ? 1 : 0);
      const out = await save(invoice);
      await logAudit(session, reminder ? "remind_invoice" : "send_invoice", ref, invoice.clientName);
      return res.json({ ok: true, invoice: out });
    }

    // Delivered another way (WhatsApp, by hand): issue it without emailing.
    if (b.action === "mark_sent") {
      if (invoice.status !== "draft") return res.status(400).json({ error: "Only draft invoices can be marked as sent" });
      if (!invoice.items?.length) return res.status(400).json({ error: "Can't issue an invoice with no line items." });
      invoice.status = "sent"; invoice.sentAt = new Date().toISOString();
      const out = await save(invoice);
      await logAudit(session, "issue_invoice", ref, invoice.clientName);
      return res.json({ ok: true, invoice: out });
    }

    if (b.action === "record_payment" || b.action === "mark_paid") {
      if (["draft", "void"].includes(invoice.status)) return res.status(400).json({ error: `Send the invoice before recording payments${invoice.status === "void" ? " (this one is void)" : ""}.` });
      if (invoice.status === "paid") return res.status(400).json({ error: "This invoice is already fully paid" });
      const input = b.action === "mark_paid" ? { amount: t.balance, method: b.method, reference: b.reference, paidAt: b.paidAt } : b;
      const { payment, error } = cleanPayment(input, t.balance);
      if (error) return res.status(400).json({ error });
      invoice.payments.push({ ...payment, recordedBy: session.sub });
      const after = computeTotals(invoice);
      invoice.status = statusAfterPayment(after.total, after.amountPaid);
      invoice.paidAt = invoice.status === "paid" ? new Date().toISOString() : null;
      const out = await save(invoice);
      await logAudit(session, "record_invoice_payment", ref, `${money(payment.amount, invoice.currency)} · ${invoice.status}`);
      let receipt = null;
      if (b.sendReceipt && invoice.clientEmail) {
        try { await emailInvoice(invoice, "receipt"); receipt = "sent"; } catch (e) { receipt = `failed: ${e.message}`; }
      }
      return res.json({ ok: true, invoice: out, receipt });
    }

    // Undo a payment recorded by mistake.
    if (b.action === "delete_payment") {
      if (invoice.status === "void") return res.status(400).json({ error: "This invoice is void" });
      const before = invoice.payments.length;
      invoice.payments = invoice.payments.filter(p => p.id !== b.paymentId);
      if (invoice.payments.length === before) return res.status(404).json({ error: "Payment not found" });
      const after = computeTotals(invoice);
      invoice.status = statusAfterPayment(after.total, after.amountPaid);
      invoice.paidAt = invoice.status === "paid" ? invoice.paidAt : null;
      const out = await save(invoice);
      await logAudit(session, "delete_invoice_payment", ref, b.paymentId);
      return res.json({ ok: true, invoice: out });
    }

    if (b.action === "void" || b.action === "cancel") {
      if (invoice.status === "void") return res.status(400).json({ error: "This invoice is already void" });
      if (invoice.status === "paid") return res.status(400).json({ error: "A fully paid invoice can't be voided" });
      invoice.status = "void"; invoice.voidedAt = new Date().toISOString();
      invoice.voidReason = String(b.reason || "").trim().slice(0, 300);
      const out = await save(invoice);
      await logAudit(session, "void_invoice", ref, invoice.voidReason);
      return res.json({ ok: true, invoice: out });
    }

    // New draft from an existing invoice (same client and items).
    if (b.action === "duplicate") {
      const days = invoice.dueDate && invoice.issueDate ? Math.round((Date.parse(invoice.dueDate) - Date.parse(invoice.issueDate)) / 86400000) : null;
      const copy = {
        ...invoice, id: newId("inv"), invoiceNumber: await nextInvoiceNumber(),
        status: "draft", payments: [], paidAt: null, sentAt: null, voidedAt: null, voidReason: "", lastEmailedAt: null, reminders: 0,
        issueDate: today(), dueDate: days != null ? new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) : null,
        createdAt: new Date().toISOString(), createdBy: session.sub, duplicatedFrom: invoice.invoiceNumber,
      };
      delete copy.discount;
      const out = await save(copy);
      await logAudit(session, "duplicate_invoice", `invoice ${copy.invoiceNumber}`, `from ${invoice.invoiceNumber}`);
      return res.json({ ok: true, invoice: out });
    }

    if (b.action) return res.status(400).json({ error: "Unknown action" });

    // Edit (drafts only, like the License Manager).
    if (invoice.status !== "draft") return res.status(400).json({ error: "Only draft invoices can be edited. Void it and duplicate it to reissue." });
    const { data, error } = cleanFields(b, { partial: true });
    if (error) return res.status(400).json({ error });
    Object.assign(invoice, data);
    delete invoice.discount;
    const out = await save(invoice);
    await logAudit(session, "edit_invoice", ref, invoice.clientName);
    return res.json({ ok: true, invoice: out });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const invoice = await getRecord("invoices", id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status !== "draft") return res.status(400).json({ error: "Only draft invoices can be deleted. Void it instead." });
    await deleteRecord("invoices", id);
    await logAudit(session, "delete_invoice", `invoice ${invoice.invoiceNumber}`, invoice.clientName);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

