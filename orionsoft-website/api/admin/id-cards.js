// Admin: view / print any employee's ID card, sign and authorise it, or
// reissue it (a lost card, new photo or new role). Reissuing replaces the
// verification code, so the old card no longer verifies, and the new card
// needs authorising again.
import { requireAuth } from "../_lib/auth.js";
import { getRecord, putRecord } from "../_lib/records.js";
import { logAudit } from "../_lib/audit.js";
import { ensureIdCard, cardPayload, validPassport, setPassport } from "../_lib/idcard.js";
import { notify } from "../_lib/office.js";

export default async function handler(req, res) {
  const session = requireAuth(req, res, "admin");
  if (!session) return;
  const id = req.query.employeeId || req.body?.employeeId;
  if (!id) return res.status(400).json({ error: "employeeId is required" });
  const emp = await getRecord("employees", id);
  if (!emp) return res.status(404).json({ error: "Employee not found" });

  if (req.method === "GET") {
    await ensureIdCard(emp);
    return res.json({ ok: true, ...(await cardPayload(emp, { forAdmin: true })) });
  }

  const action = req.body?.action;
  if (req.method === "POST" && action === "reissue") {
    await ensureIdCard(emp, { reissue: true });
    await logAudit(session, "reissue_id_card", `employee ${emp.id}`, `${emp.fullName} · card v${emp.idCard.version}`);
    return res.json({ ok: true, ...(await cardPayload(emp, { forAdmin: true })) });
  }

  // Passport photo (uploaded by the admin, or the profile photo reused).
  if (req.method === "POST" && action === "photo") {
    await ensureIdCard(emp);
    const dataUrl = req.body.useProfilePhoto ? emp.avatarDataUrl : req.body.dataUrl;
    if (!validPassport(dataUrl)) return res.status(400).json({ error: req.body.useProfilePhoto ? "This staff member has no profile photo to use" : "Upload a JPEG or PNG photo under about 1 MB" });
    await setPassport(emp, dataUrl, { fromProfile: !!req.body.fromProfile || !!req.body.useProfilePhoto });
    await logAudit(session, "set_id_photo", `employee ${emp.id}`, emp.fullName);
    return res.json({ ok: true, ...(await cardPayload(emp, { forAdmin: true })) });
  }

  // Sign & authorise: the chosen signatory's signature is printed on the back.
  if (req.method === "POST" && action === "authorize") {
    await ensureIdCard(emp);
    const sig = await getRecord("signatories", req.body.signatoryId);
    if (!sig?.signatureImageDataUrl) return res.status(400).json({ error: "Choose or draw the signature to authorise this card with" });
    if (emp.status !== "active") return res.status(400).json({ error: "Only active staff can be issued an authorised card" });
    if (!emp.idPhotoDataUrl) return res.status(400).json({ error: "Add a passport photo before authorising this card" });
    emp.idCard = { ...emp.idCard, authorizedAt: new Date().toISOString(), authorizedBy: session.name || "Admin", signatoryId: sig.id };
    await putRecord("employees", emp.id, emp);
    await logAudit(session, "authorize_id_card", `employee ${emp.id}`, `${emp.fullName} · card v${emp.idCard.version} · signed by ${sig.fullName}`);
    try { await notify([emp.id], { type: "system", title: "Your staff ID card is ready", body: "It has been signed and authorised. Open My Profile → My ID card to view or print it.", link: "profile" }); } catch { /* best-effort */ }
    return res.json({ ok: true, ...(await cardPayload(emp, { forAdmin: true })) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
