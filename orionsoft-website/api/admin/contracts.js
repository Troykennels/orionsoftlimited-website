import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth, signSession } from "../_lib/auth.js";
import { get, set } from "../store.js";
import { renderTemplate } from "../_lib/templates.js";
import { renderContractPdf } from "../_lib/pdf.js";
import { sendContractEmail, notifyMilestoneCompleted } from "../_lib/emailTemplates.js";
import { logAudit } from "../_lib/audit.js";

const SIGN_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

async function storePdf(key, pdfBytes) {
  await set(key, Buffer.from(pdfBytes).toString("base64"));
}

async function generateAndStorePdf(contract) {
  const allSignatories = await listRecords("signatories");
  const signatories = allSignatories.filter(s => (contract.signatoryIds || []).includes(s.id));
  const pdfBytes = await renderContractPdf(contract, signatories);
  const key = `orionsoft:files:contract_${contract.id}`;
  await storePdf(key, pdfBytes);
  return { key, pdfBytes };
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
      const contract = await getRecord("contracts", req.query.id);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      return res.json({ ok: true, contract });
    }
    const contracts = await listRecords("contracts");
    return res.json({ ok: true, contracts: contracts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  }

  if (req.method === "POST") {
    const { templateId, recipientName, recipientEmail, employeeId, fillData, signatoryIds, amount, currency, title } = req.body || {};
    if (!templateId || !recipientName) {
      return res.status(400).json({ error: "templateId and recipientName are required" });
    }
    const template = await getRecord("templates", templateId);
    if (!template) return res.status(404).json({ error: "Template not found" });

    const id = newId("ctr");
    const bodyFilled = renderTemplate(template.bodyMarkup, { recipientName, ...(fillData || {}) });
    const contract = {
      id, templateId, type: template.type,
      title: title || `${template.name}: ${recipientName}`,
      recipientName, recipientEmail: recipientEmail || "", employeeId: employeeId || null,
      bodyFilled, signatoryIds: signatoryIds || [],
      amount: Number(amount) || 0, currency: currency || "NGN",
      status: "draft",
      milestones: [],
      pdfKey: null, signedPdfKey: null,
      sentAt: null, signedAt: null, signedByName: "", signedIp: "",
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };

    const { key } = await generateAndStorePdf(contract);
    contract.pdfKey = key;
    await putRecord("contracts", id, contract);

    return res.json({ ok: true, contract });
  }

  if (req.method === "PATCH") {
    const { id, action } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const contract = await getRecord("contracts", id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    if (action === "send") {
      if (contract.status !== "draft") return res.status(400).json({ error: "Only a draft contract can be sent. This one has already been sent, signed, or cancelled." });
      if (!contract.recipientEmail) return res.status(400).json({ error: "Contract has no recipient email" });
      const signToken = signSession({ sub: contract.id, role: "contract-sign", contractId: contract.id }, SIGN_TOKEN_TTL_SECONDS);
      const signLink = `${process.env.APP_BASE_URL || ""}/sign/${contract.id}?token=${signToken}`;
      const pdfB64 = await get(contract.pdfKey);
      const pdfBuffer = pdfB64 ? Buffer.from(pdfB64, "base64") : null;
      await sendContractEmail(contract, signLink, pdfBuffer);
      contract.status = "sent";
      contract.sentAt = new Date().toISOString();
      contract.updatedAt = new Date().toISOString();
      await putRecord("contracts", id, contract);
      await logAudit(session, "send_contract", `contract ${contract.id}`, contract.title);
      return res.json({ ok: true, contract });
    }

    if (action === "add_milestone") {
      const { title: msTitle, dueDate } = req.body;
      if (!msTitle) return res.status(400).json({ error: "milestone title is required" });
      contract.milestones = contract.milestones || [];
      contract.milestones.push({ id: newId("ms"), title: msTitle, dueDate: dueDate || null, status: "pending", completedAt: null });
      contract.updatedAt = new Date().toISOString();
      await putRecord("contracts", id, contract);
      return res.json({ ok: true, contract });
    }

    if (action === "update_milestone") {
      const { milestoneId, status } = req.body;
      const ms = (contract.milestones || []).find(m => m.id === milestoneId);
      if (!ms) return res.status(404).json({ error: "Milestone not found" });
      ms.status = status === "completed" ? "completed" : "pending";
      ms.completedAt = ms.status === "completed" ? new Date().toISOString() : null;
      contract.updatedAt = new Date().toISOString();
      await putRecord("contracts", id, contract);
      if (ms.status === "completed") {
        try { await notifyMilestoneCompleted(contract, ms); } catch { /* best-effort */ }
      }
      return res.json({ ok: true, contract });
    }

    if (action === "cancel") {
      contract.status = "cancelled";
      contract.updatedAt = new Date().toISOString();
      await putRecord("contracts", id, contract);
      await logAudit(session, "cancel_contract", `contract ${contract.id}`, contract.title);
      return res.json({ ok: true, contract });
    }

    // Generic field update — only while still a draft
    if (contract.status !== "draft") {
      return res.status(400).json({ error: "Only draft contracts can be edited directly. Use an action instead." });
    }
    const { recipientName, recipientEmail, amount, currency, fillData } = req.body;
    if (recipientName !== undefined) contract.recipientName = recipientName;
    if (recipientEmail !== undefined) contract.recipientEmail = recipientEmail;
    if (amount !== undefined) contract.amount = Number(amount) || 0;
    if (currency !== undefined) contract.currency = currency;
    if (fillData) {
      const template = await getRecord("templates", contract.templateId);
      contract.bodyFilled = renderTemplate(template.bodyMarkup, { recipientName: contract.recipientName, ...fillData });
    }
    contract.updatedAt = new Date().toISOString();
    const { key } = await generateAndStorePdf(contract);
    contract.pdfKey = key;
    await putRecord("contracts", id, contract);
    return res.json({ ok: true, contract });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const contract = await getRecord("contracts", id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });
    if (contract.status !== "draft") return res.status(400).json({ error: "Only draft contracts can be deleted" });
    await deleteRecord("contracts", id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
