import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const signatories = await listRecords("signatories");
    return res.json({ ok: true, signatories });
  }

  if (req.method === "POST") {
    const { fullName, title, email, signatureImageDataUrl } = req.body || {};
    if (!fullName || !signatureImageDataUrl) {
      return res.status(400).json({ error: "fullName and signatureImageDataUrl are required" });
    }
    if (!/^data:image\/(png|jpe?g);base64,/.test(signatureImageDataUrl)) {
      return res.status(400).json({ error: "signatureImageDataUrl must be a base64 PNG or JPEG data URL" });
    }
    const id = newId("sig");
    const signatory = { id, fullName, title: title || "", email: email || "", signatureImageDataUrl, createdAt: new Date().toISOString() };
    await putRecord("signatories", id, signatory);
    return res.json({ ok: true, signatory });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const existing = await getRecord("signatories", id);
    if (!existing) return res.status(404).json({ error: "Signatory not found" });
    await deleteRecord("signatories", id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
