// Public contract e-signing endpoint — gated by a short-lived, contract-scoped
// JWT embedded in the "sent" email link (see api/admin/contracts.js "send"
// action), NOT by a cookie session. Anyone with a valid token for a given
// contract may view and sign it; the token cannot be reused for any other
// contract or admin/staff action.
import { getRecord, putRecord, listRecords } from "../_lib/records.js";
import { verifySession } from "../_lib/auth.js";
import { set } from "../store.js";
import { renderContractPdf } from "../_lib/pdf.js";
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

  if (req.method === "GET") {
    return res.json({
      ok: true,
      contract: {
        id: contract.id, title: contract.title, recipientName: contract.recipientName,
        bodyFilled: contract.bodyFilled, status: contract.status, pdfKey: contract.pdfKey,
        amount: contract.amount, currency: contract.currency,
      },
    });
  }

  if (req.method === "POST") {
    if (contract.status === "signed" || contract.status === "active" || contract.status === "completed") {
      return res.status(400).json({ error: "This contract has already been signed" });
    }
    const { signedByName, consent } = req.body || {};
    if (!signedByName || !consent) {
      return res.status(400).json({ error: "Your name and consent are required to sign" });
    }

    contract.status = "signed";
    contract.signedAt = new Date().toISOString();
    contract.signedByName = signedByName;
    contract.signedIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";

    const allSignatories = await listRecords("signatories");
    const signatories = allSignatories.filter(s => (contract.signatoryIds || []).includes(s.id));
    const pdfBytes = await renderContractPdf(contract, signatories);
    const signedKey = `orionsoft:files:contract_signed_${contract.id}`;
    await set(signedKey, Buffer.from(pdfBytes).toString("base64"));
    contract.signedPdfKey = signedKey;
    contract.updatedAt = new Date().toISOString();

    await putRecord("contracts", contract.id, contract);

    try { await notifyContractSigned(contract); } catch { /* best-effort */ }

    return res.json({ ok: true, contract: { id: contract.id, status: contract.status, signedPdfKey: contract.signedPdfKey } });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
