// A separate, short numeric PIN required to approve the highest-stakes
// action in the system (sending a real bank transfer via payroll "pay") —
// on top of the superadmin role gate, not instead of it. Deliberately
// distinct from the account password: a password proves who you are for a
// whole session, a PIN proves you specifically mean to approve *this*
// action right now, and can't be reused from a browser left open/unlocked.
import { getRecord, putRecord } from "../_lib/records.js";
import { requireAuth, hashPassword, verifyPassword } from "../_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const admin = await getRecord("admins", session.sub);
    return res.json({ ok: true, hasPin: !!admin?.securityPinHash });
  }

  if (req.method === "POST") {
    const { currentPassword, pin } = req.body || {};
    if (!currentPassword || !pin) return res.status(400).json({ error: "Current password and a new PIN are required" });
    if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: "PIN must be 4 to 6 digits" });

    const admin = await getRecord("admins", session.sub);
    if (!admin) return res.status(404).json({ error: "Admin account not found" });

    const ok = await verifyPassword(currentPassword, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    admin.securityPinHash = await hashPassword(pin);
    admin.updatedAt = new Date().toISOString();
    await putRecord("admins", admin.id, admin);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
