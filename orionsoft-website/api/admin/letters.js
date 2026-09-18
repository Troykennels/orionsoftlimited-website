// Free-form letterhead letters — no template, no {{placeholders}}: the admin
// types the whole body directly and it's rendered onto the real Orion Soft
// letterhead. Separate from Contracts/Templates, which are for structured,
// recipient-signed documents.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { get, set } from "../store.js";
import { renderLetterPdf } from "../_lib/pdf.js";
import { sendEmail, brandedShell } from "../_lib/mailer.js";
import { logAudit } from "../_lib/audit.js";

async function storePdf(key, pdfBytes) {
  await set(key, Buffer.from(pdfBytes).toString("base64"));
}

async function generateAndStorePdf(letter, signatory) {
  const pdfBytes = await renderLetterPdf(letter, signatory);
  const key = `orionsoft:files:letter_${letter.id}`;
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
      const letter = await getRecord("letters", req.query.id);
      if (!letter) return res.status(404).json({ error: "Letter not found" });
      return res.json({ ok: true, letter });
    }
    const letters = await listRecords("letters");
    return res.json({ ok: true, letters: letters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  }

  if (req.method === "POST") {
    const { subject, recipientName, recipientAddress, recipientEmail, bodyMarkup, signatoryId } = req.body || {};
    if (!recipientName || !bodyMarkup) {
      return res.status(400).json({ error: "recipientName and bodyMarkup are required" });
    }
    const id = newId("ltr");
    const letter = {
      id, subject: subject || "", recipientName, recipientAddress: recipientAddress || "",
      recipientEmail: recipientEmail || "", bodyMarkup, signatoryId: signatoryId || null,
      status: "draft", pdfKey: null,
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };
    const signatory = signatoryId ? await getRecord("signatories", signatoryId) : null;
    letter.pdfKey = await generateAndStorePdf(letter, signatory);
    await putRecord("letters", id, letter);
    await logAudit(session, "create_letter", `letter ${id}`, letter.subject || letter.recipientName);
    return res.json({ ok: true, letter });
  }

  if (req.method === "PATCH") {
    const { id, action } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const letter = await getRecord("letters", id);
    if (!letter) return res.status(404).json({ error: "Letter not found" });

    if (action === "send") {
      if (!letter.recipientEmail) return res.status(400).json({ error: "This letter has no recipient email on file." });
      const pdfB64 = await get(letter.pdfKey);
      const pdfBuffer = pdfB64 ? Buffer.from(pdfB64, "base64") : null;
      const html = brandedShell(
        `<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">${letter.subject || "Correspondence"}</h2>
         <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${letter.recipientName}, please find the attached letter from Orion Soft Limited.</p>`,
        { title: "Letter From Orion Soft Limited" },
      );
      await sendEmail(letter.recipientEmail, letter.subject || "Letter from Orion Soft Limited", html, {
        kind: "letter_sent",
        attachments: pdfBuffer ? [{ filename: `${(letter.subject || "letter").replace(/[^a-z0-9]+/gi, "-")}.pdf`, content: pdfBuffer }] : undefined,
      });
      letter.status = "sent";
      letter.sentAt = new Date().toISOString();
      letter.updatedAt = new Date().toISOString();
      await putRecord("letters", id, letter);
      await logAudit(session, "send_letter", `letter ${id}`, letter.subject || letter.recipientName);
      return res.json({ ok: true, letter });
    }

    const { subject, recipientName, recipientAddress, recipientEmail, bodyMarkup, signatoryId } = req.body;
    if (subject !== undefined) letter.subject = subject;
    if (recipientName !== undefined) letter.recipientName = recipientName;
    if (recipientAddress !== undefined) letter.recipientAddress = recipientAddress;
    if (recipientEmail !== undefined) letter.recipientEmail = recipientEmail;
    if (bodyMarkup !== undefined) letter.bodyMarkup = bodyMarkup;
    if (signatoryId !== undefined) letter.signatoryId = signatoryId;
    letter.updatedAt = new Date().toISOString();
    const signatory = letter.signatoryId ? await getRecord("signatories", letter.signatoryId) : null;
    letter.pdfKey = await generateAndStorePdf(letter, signatory);
    await putRecord("letters", id, letter);
    return res.json({ ok: true, letter });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const letter = await getRecord("letters", id);
    if (!letter) return res.status(404).json({ error: "Letter not found" });
    await deleteRecord("letters", id);
    await logAudit(session, "delete_letter", `letter ${id}`, letter.subject || letter.recipientName);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
