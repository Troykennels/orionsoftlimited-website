import { getRecord, putRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";

const SELF_EDITABLE = [
  "phone", "bankName", "bankAccountNumber", "bankAccountName",
  "avatarDataUrl", "dateOfBirth", "gender", "address", "bio",
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship",
];

function publicShape(e) {
  const rest = { ...e };
  delete rest.passwordHash;
  return rest;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "staff");
  if (!session) return;

  const employee = await getRecord("employees", session.sub);
  if (!employee) return res.status(404).json({ error: "Employee record not found" });

  if (req.method === "GET") {
    return res.json({ ok: true, employee: publicShape(employee) });
  }

  if (req.method === "PATCH") {
    const updates = req.body || {};
    if (updates.avatarDataUrl && (typeof updates.avatarDataUrl !== "string" || !/^data:image\/(png|jpe?g);base64,/.test(updates.avatarDataUrl) || updates.avatarDataUrl.length > 1_500_000)) {
      return res.status(400).json({ error: "Photo must be a PNG/JPEG under ~1MB" });
    }
    for (const key of SELF_EDITABLE) {
      if (updates[key] !== undefined) employee[key] = updates[key];
    }
    employee.updatedAt = new Date().toISOString();
    await putRecord("employees", employee.id, employee);
    return res.json({ ok: true, employee: publicShape(employee) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
