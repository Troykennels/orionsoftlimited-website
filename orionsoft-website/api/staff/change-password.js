import { getRecord, putRecord } from "../_lib/records.js";
import { requireAuth, hashPassword, verifyPassword } from "../_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = requireAuth(req, res, "staff");
  if (!session) return;

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password are required" });
  if (newPassword.length < 10) return res.status(400).json({ error: "New password must be at least 10 characters" });

  const employee = await getRecord("employees", session.sub);
  if (!employee) return res.status(404).json({ error: "Employee record not found" });

  const ok = await verifyPassword(currentPassword, employee.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  employee.passwordHash = await hashPassword(newPassword);
  employee.updatedAt = new Date().toISOString();
  await putRecord("employees", employee.id, employee);

  return res.json({ ok: true });
}
