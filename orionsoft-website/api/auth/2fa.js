// Set up / turn off two-step sign-in for the signed-in admin or staff member.
//   GET  ?portal=admin|staff          → { enabled, recoveryLeft }
//   POST { portal, action: "setup" }  → new secret + QR code (not active yet)
//   POST { portal, action: "enable", code }   → turns it on, returns recovery codes
//   POST { portal, action: "disable", password, code } → turns it off
import QRCode from "qrcode";
import { getRecord, putRecord } from "../_lib/records.js";
import { getAdminSession, getStaffSession, verifyPassword } from "../_lib/auth.js";
import { newSecret, otpauthUrl, verifyTotp, newRecoveryCodes, checkSecondFactor } from "../_lib/totp.js";
import { logAudit } from "../_lib/audit.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const portal = (req.query?.portal || req.body?.portal) === "admin" ? "admin" : "staff";
  const session = portal === "admin" ? getAdminSession(req) : getStaffSession(req);
  if (!session) return res.status(401).json({ error: "Please sign in again" });
  const entity = portal === "admin" ? "admins" : "employees";
  const user = await getRecord(entity, session.sub);
  if (!user) return res.status(404).json({ error: "Account not found" });

  if (req.method === "GET") {
    return res.json({ ok: true, enabled: !!user.totpEnabled, recoveryLeft: (user.totpRecovery || []).length });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};

  if (b.action === "setup") {
    if (user.totpEnabled) return res.status(400).json({ error: "Two-step sign-in is already on" });
    user.totpPending = newSecret();
    await putRecord(entity, user.id, user);
    const url = otpauthUrl(user.totpPending, user.email || user.username || "account");
    return res.json({ ok: true, secret: user.totpPending, otpauth: url, qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }) });
  }

  if (b.action === "enable") {
    if (!user.totpPending) return res.status(400).json({ error: "Start the set-up first" });
    const step = verifyTotp(user.totpPending, b.code);
    if (step == null) return res.status(400).json({ error: "That code didn't match. Check the time on your phone and try the newest code." });
    const { plain, hashed } = await newRecoveryCodes();
    user.totpSecret = user.totpPending; user.totpPending = null;
    user.totpEnabled = true; user.totpLastStep = step; user.totpRecovery = hashed;
    await putRecord(entity, user.id, user);
    if (portal === "admin") await logAudit(session, "enable_2fa", `admin ${user.id}`);
    return res.json({ ok: true, recoveryCodes: plain });
  }

  if (b.action === "disable") {
    if (!user.totpEnabled) return res.json({ ok: true });
    if (!(await verifyPassword(String(b.password || ""), user.passwordHash))) return res.status(401).json({ error: "Wrong password" });
    if (!(await checkSecondFactor(user, b.code))) return res.status(401).json({ error: "Wrong code" });
    user.totpEnabled = false; user.totpSecret = null; user.totpRecovery = []; user.totpLastStep = null;
    await putRecord(entity, user.id, user);
    if (portal === "admin") await logAudit(session, "disable_2fa", `admin ${user.id}`);
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}
