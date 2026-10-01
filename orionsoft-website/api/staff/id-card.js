// The signed-in staff member's own ID card (issued on first view; printable
// once an admin has signed and authorised it). Staff can upload their own
// passport photo until the card is signed and authorised; after that the
// photo is locked and only the admin can change it.
import { requireStaff } from "../_lib/auth.js";
import { ensureIdCard, cardPayload, validPassport, setPassport } from "../_lib/idcard.js";

export default async function handler(req, res) {
  const ctx = await requireStaff(req, res);
  if (!ctx) return;
  const emp = ctx.employee;
  await ensureIdCard(emp);
  if (req.method === "GET") return res.json({ ok: true, ...(await cardPayload(emp)) });
  if (req.method === "POST" && req.body?.action === "photo") {
    if (emp.idCard?.authorizedAt) {
      return res.status(403).json({ error: "Your ID card has been signed and authorised, so its photo can't be changed. Ask the admin if it needs updating." });
    }
    const dataUrl = req.body.useProfilePhoto ? emp.avatarDataUrl : req.body.dataUrl;
    if (!validPassport(dataUrl)) return res.status(400).json({ error: req.body.useProfilePhoto ? "You don't have a profile photo yet" : "Upload a JPEG or PNG photo under about 1 MB" });
    const wasAuthorized = !!emp.idCard?.authorizedAt;
    await setPassport(emp, dataUrl, { fromProfile: !!req.body.fromProfile || !!req.body.useProfilePhoto });
    return res.json({ ok: true, needsResign: wasAuthorized, ...(await cardPayload(emp)) });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
