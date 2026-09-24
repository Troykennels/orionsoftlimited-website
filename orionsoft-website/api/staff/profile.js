import { getRecord, putRecord, listRecords } from "../_lib/records.js";
import { requireStaff } from "../_lib/auth.js";
import { cleanSocials, slugify, logActivity } from "../_lib/office.js";

const SELF_EDITABLE = [
  "phone", "bankName", "bankAccountNumber", "bankAccountName",
  "avatarDataUrl", "dateOfBirth", "gender", "address", "bio",
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship",
  "headline", "location", "coverDataUrl", "whatsapp",
];

function publicShape(e) {
  const rest = { ...e };
  delete rest.passwordHash;
  return rest;
}

function validImage(d, max) {
  return typeof d === "string" && (d === "" || (/^data:image\/(png|jpe?g|webp);base64,/.test(d) && d.length <= max));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const auth = await requireStaff(req, res);
  if (!auth) return;
  const employee = auth.employee;

  if (req.method === "GET") {
    return res.json({ ok: true, employee: publicShape(employee) });
  }

  if (req.method === "PATCH") {
    const updates = req.body || {};
    if (updates.avatarDataUrl !== undefined && !validImage(updates.avatarDataUrl, 1_500_000)) {
      return res.status(400).json({ error: "Photo must be a PNG/JPEG under ~1MB" });
    }
    if (updates.coverDataUrl !== undefined && !validImage(updates.coverDataUrl, 1_500_000)) {
      return res.status(400).json({ error: "Cover image must be a PNG/JPEG under ~1MB" });
    }
    for (const key of SELF_EDITABLE) {
      if (updates[key] !== undefined) employee[key] = typeof updates[key] === "string" ? updates[key].slice(0, key.endsWith("DataUrl") ? 1_500_000 : 1500) : updates[key];
    }
    if (updates.skills !== undefined) {
      employee.skills = (Array.isArray(updates.skills) ? updates.skills : String(updates.skills).split(","))
        .map(s => String(s).trim()).filter(Boolean).slice(0, 20).map(s => s.slice(0, 40));
    }
    if (updates.socials !== undefined) employee.socials = cleanSocials(updates.socials);
    if (updates.showPhone !== undefined) employee.showPhone = !!updates.showPhone;
    if (updates.publicFields !== undefined) {
      employee.publicFields = { location: !!updates.publicFields.location, email: !!updates.publicFields.email, tenure: !!updates.publicFields.tenure };
    }
    if (updates.publicProfile !== undefined) {
      const turningOn = !employee.publicProfile && updates.publicProfile;
      employee.publicProfile = !!updates.publicProfile;
      if (turningOn) await logActivity(employee.id, "profile", "Published a public profile");
    }
    if (updates.slug !== undefined && updates.slug !== employee.slug) {
      const slug = slugify(updates.slug);
      const all = await listRecords("employees");
      if (all.some(e => e.id !== employee.id && e.slug === slug)) return res.status(409).json({ error: "That profile address is taken" });
      employee.slug = slug;
    }
    employee.updatedAt = new Date().toISOString();
    const fresh = await getRecord("employees", employee.id);
    // Keep fields other routes may have changed meanwhile (presence, achievements).
    const merged = { ...employee, presence: fresh?.presence || employee.presence, achievements: fresh?.achievements || employee.achievements };
    await putRecord("employees", merged.id, merged);
    return res.json({ ok: true, employee: publicShape(merged) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
