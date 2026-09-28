// Public contract e-signing endpoint — gated by a short-lived, contract-scoped
// JWT embedded in the "sent" email link (see api/admin/contracts.js "send"
// action), NOT by a cookie session. Anyone with a valid token for a given
// contract may view and sign it; the token cannot be reused for any other
// contract or admin/staff action.
import { getRecord, putRecord, listRecords } from "../_lib/records.js";
import { verifySession } from "../_lib/auth.js";
import { set } from "../store.js";
import { renderContractPdfV2 } from "../_lib/contractPdf.js";
import { normaliseContract, payLink } from "../_lib/contracts.js";
import { CONTRACT_TEMPLATES } from "../_lib/contractTemplates.js";
import { sendPaymentLinkEmail } from "../admin/contracts.js";
import { notifyContractSigned } from "../_lib/emailTemplates.js";

function checkToken(token, contractId) {
  const payload = verifySession(token);
  if (!payload || payload.role !== "contract-sign" || payload.contractId !== contractId) return null;
  return payload;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const contractId = req.query.contractId || req.body?.contractId;
  const token = req.query.token || req.body?.token;
  if (!contractId || !token || !checkToken(token, contractId)) {
    return res.status(401).json({ error: "Invalid or expired signing link" });
  }

  const contract = await getRecord("contracts", contractId);
  if (!contract) return res.status(404).json({ error: "Contract not found" });

  const signedAlready = ["signed", "active", "completed"].includes(contract.status);
  const c = normaliseContract(contract);
  const payable = c.amount > 0 && c.kind !== "certificate";

  if (req.method === "GET") {
    return res.json({
      ok: true,
      contract: {
        id: c.id, number: c.number, title: c.title, docLabel: c.docLabel || "Agreement", kind: c.kind || "agreement",
        recipientName: c.client.name, organisation: c.client.organisation,
        bodyFilled: contract.bodyFilled, status: c.status, pdfKey: contract.signedPdfKey || contract.pdfKey,
        amount: c.amount, currency: c.currency, signedByName: c.signedByName || "", signedAt: c.signedAt || null,
        effectiveDate: c.effectiveDate || null, endDate: c.endDate || null, scope: c.scope || "", deliverables: c.deliverables,
        schedule: c.schedule.map(m => ({ id: m.id, title: m.title, amount: m.amount, dueDate: m.dueDate || null, trigger: m.trigger || "" })),
      },
      payLink: signedAlready && payable ? payLink(contract) : "",
    });
  }

  if (req.method === "POST") {
    if (contract.status === "cancelled") return res.status(400).json({ error: "This contract has been withdrawn. Please contact us." });
    if (signedAlready) {
      return res.status(400).json({ error: "This contract has already been signed" });
    }
    const { consent, signatureImageDataUrl } = req.body || {};
    const signedByName = String(req.body?.signedByName || "").trim().slice(0, 120);
    const signedByTitle = String(req.body?.signedByTitle || "").trim().slice(0, 120);
    if (signedByName.length < 2 || !consent) {
      return res.status(400).json({ error: "Your full name and consent are required to sign" });
    }
    if (signatureImageDataUrl && (typeof signatureImageDataUrl !== "string" || !/^data:image\/(png|jpe?g);base64,/.test(signatureImageDataUrl) || signatureImageDataUrl.length > 1_500_000)) {
      return res.status(400).json({ error: "Signature image is invalid" });
    }

    contract.status = "signed";
    contract.signedAt = new Date().toISOString();
    contract.signedByName = signedByName;
    contract.signedByTitle = signedByTitle;
    contract.signedSignatureImageDataUrl = signatureImageDataUrl || "";
    contract.signatureMethod = signatureImageDataUrl ? "drawn" : "typed";
    contract.signedIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";

    const allSignatories = await listRecords("signatories");
    const signatories = allSignatories.filter(s => (contract.signatoryIds || []).includes(s.id));
    const template = await getRecord("templates", contract.templateId);
    const def = CONTRACT_TEMPLATES[contract.type] || {};
    const pdfBytes = await renderContractPdfV2(contract, signatories, {
      template: { kind: contract.kind || def.kind, docLabel: contract.docLabel || def.docLabel, name: template?.name },
      payments: [], payLinkUrl: payable ? payLink(contract) : "",
    });
    const signedKey = `orionsoft:files:contract_signed_${contract.id}`;
    await set(signedKey, Buffer.from(pdfBytes).toString("base64"));
    contract.signedPdfKey = signedKey;
    contract.updatedAt = new Date().toISOString();

    await putRecord("contracts", contract.id, contract);

    try { await notifyContractSigned(contract); } catch { /* best-effort */ }
    // Payable contracts: the client gets their payment link straight away.
    if (payable && c.client.email) { try { await sendPaymentLinkEmail(contract); } catch { /* the page shows the link too */ } }

    return res.json({ ok: true, contract: { id: contract.id, status: contract.status, signedPdfKey: contract.signedPdfKey }, payLink: payable ? payLink(contract) : "" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
