import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { get, set, incr } from "../store.js";
import { renderPurchaseOrderPdf } from "../_lib/pdf.js";
import { sendEmail, brandedShell } from "../_lib/emailTemplates.js";
import { logAudit } from "../_lib/audit.js";

async function storePdf(key, pdfBytes) { await set(key, Buffer.from(pdfBytes).toString("base64")); }

async function nextPoNumber() {
  const next = await incr("orionsoft:po:seq");
  const d = new Date();
  return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(next).padStart(4, "0")}`;
}

async function generateAndStorePdf(po) {
  const pdfBytes = await renderPurchaseOrderPdf(po);
  const key = `orionsoft:files:po_${po.id}`;
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
      const po = await getRecord("purchaseOrders", req.query.id);
      if (!po) return res.status(404).json({ error: "Purchase order not found" });
      return res.json({ ok: true, po });
    }
    const pos = await listRecords("purchaseOrders");
    return res.json({ ok: true, purchaseOrders: pos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  }

  if (req.method === "POST") {
    const { vendorName, vendorEmail, items, currency, deliveryDate, terms } = req.body || {};
    if (!vendorName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "vendorName and at least one line item are required" });
    }
    const id = newId("po");
    const po = {
      id, poNumber: await nextPoNumber(),
      vendorName, vendorEmail: vendorEmail || "",
      items: items.map(it => ({ description: it.description || "", qty: Number(it.qty) || 1, unitCost: Number(it.unitCost) || 0 })),
      currency: currency || "NGN", deliveryDate: deliveryDate || null, terms: terms || "",
      status: "draft", approvedBy: "", pdfKey: null,
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };
    po.pdfKey = await generateAndStorePdf(po);
    await putRecord("purchaseOrders", id, po);
    await logAudit(session, "create_po", `PO ${po.poNumber}`, vendorName);
    return res.json({ ok: true, po });
  }

  if (req.method === "PATCH") {
    const { id, action } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const po = await getRecord("purchaseOrders", id);
    if (!po) return res.status(404).json({ error: "Purchase order not found" });

    if (action === "approve") {
      if (po.status !== "draft") return res.status(400).json({ error: "Only a draft PO can be approved." });
      po.status = "approved";
      po.approvedBy = session.name || session.email || "Admin";
      po.updatedAt = new Date().toISOString();
      po.pdfKey = await generateAndStorePdf(po);
      await putRecord("purchaseOrders", id, po);
      await logAudit(session, "approve_po", `PO ${po.poNumber}`, po.vendorName);
      return res.json({ ok: true, po });
    }

    if (action === "send") {
      if (po.status !== "approved") return res.status(400).json({ error: "Only an approved PO can be sent to the vendor." });
      if (!po.vendorEmail) return res.status(400).json({ error: "This PO has no vendor email on file." });
      const pdfB64 = await get(po.pdfKey);
      const pdfBuffer = pdfB64 ? Buffer.from(pdfB64, "base64") : null;
      const html = brandedShell(
        `<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Purchase Order ${po.poNumber}</h2>
         <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${po.vendorName}, please find our purchase order attached.</p>`,
        { title: "Purchase Order From Orion Soft Limited" },
      );
      await sendEmail(po.vendorEmail, `Purchase Order ${po.poNumber}`, html, {
        kind: "po_sent",
        attachments: pdfBuffer ? [{ filename: `${po.poNumber}.pdf`, content: pdfBuffer }] : undefined,
      });
      po.status = "sent";
      po.updatedAt = new Date().toISOString();
      await putRecord("purchaseOrders", id, po);
      await logAudit(session, "send_po", `PO ${po.poNumber}`, po.vendorName);
      return res.json({ ok: true, po });
    }

    if (action === "receive") {
      po.status = "received";
      po.receivedAt = new Date().toISOString();
      po.updatedAt = new Date().toISOString();
      await putRecord("purchaseOrders", id, po);
      await logAudit(session, "receive_po", `PO ${po.poNumber}`, po.vendorName);
      return res.json({ ok: true, po });
    }

    if (action === "cancel") {
      po.status = "cancelled";
      po.updatedAt = new Date().toISOString();
      await putRecord("purchaseOrders", id, po);
      await logAudit(session, "cancel_po", `PO ${po.poNumber}`, po.vendorName);
      return res.json({ ok: true, po });
    }

    if (po.status !== "draft") {
      return res.status(400).json({ error: "Only draft purchase orders can be edited directly. Use an action instead." });
    }
    const { vendorName, vendorEmail, items, currency, deliveryDate, terms } = req.body;
    if (vendorName !== undefined) po.vendorName = vendorName;
    if (vendorEmail !== undefined) po.vendorEmail = vendorEmail;
    if (items !== undefined) po.items = items.map(it => ({ description: it.description || "", qty: Number(it.qty) || 1, unitCost: Number(it.unitCost) || 0 }));
    if (currency !== undefined) po.currency = currency;
    if (deliveryDate !== undefined) po.deliveryDate = deliveryDate;
    if (terms !== undefined) po.terms = terms;
    po.updatedAt = new Date().toISOString();
    po.pdfKey = await generateAndStorePdf(po);
    await putRecord("purchaseOrders", id, po);
    return res.json({ ok: true, po });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const po = await getRecord("purchaseOrders", id);
    if (!po) return res.status(404).json({ error: "Purchase order not found" });
    if (po.status !== "draft") return res.status(400).json({ error: "Only draft purchase orders can be deleted" });
    await deleteRecord("purchaseOrders", id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
