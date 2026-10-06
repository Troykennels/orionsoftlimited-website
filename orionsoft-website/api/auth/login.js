import { getByLookup, getRecord, putRecord } from "../_lib/records.js";
import { checkSecondFactor } from "../_lib/totp.js";
import { logAudit } from "../_lib/audit.js";
import { verifyPassword, signSession, setSessionCookie, clearSessionCookie, getSessionFromRequest, REMEMBER_TTL_SECONDS, ADMIN_REMEMBER_TTL_SECONDS, ADMIN_COOKIE } from "../_lib/auth.js";

// Only FAILED attempts count, keyed by IP + email. A whole office behind one
// Wi-Fi IP can sign in freely; brute-forcing one account is still capped.
const failMap = new Map();
const MAX_FAILS = 8;
const WINDOW = 15 * 60 * 1000;

function blocked(key) {
  const e = failMap.get(key);
  if (!e) return false;
  if (Date.now() - e.start > WINDOW) { failMap.delete(key); return false; }
  return e.count >= MAX_FAILS;
}
function recordFail(key) {
  const e = failMap.get(key);
  if (!e || Date.now() - e.start > WINDOW) failMap.set(key, { count: 1, start: Date.now() });
  else e.count++;
}

export function staffPayload(user) {
  return { sub: user.id, role: "staff", staffRole: user.staffRole || "staff", department: user.department || "", name: user.fullName, email: user.email, title: user.title };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password, portal, remember, code } = req.body || {};
  if (!email || !password || !["admin", "staff"].includes(portal)) {
    return res.status(400).json({ error: "email, password, and portal are required" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const key = `${ip}|${String(email).toLowerCase()}`;
  if (blocked(key)) {
    return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  }

  const entity = portal === "admin" ? "admins" : "employees";
  const user = await getByLookup(entity, "email", email);
  if (!user || user.status !== "active") {
    recordFail(key);
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // The owner's office account is linked to their admin account and has no
  // password of its own: in the Staff Office app (e.g. the iPhone home-screen
  // app, which doesn't share Safari's sign-in) they use their admin password,
  // and their admin two-step code if it's on.
  let authRec = user, authEntity = entity;
  let ok = await verifyPassword(password, user.passwordHash);
  if (!ok && portal === "staff" && user.linkedAdminId) {
    const admin = await getRecord("admins", user.linkedAdminId);
    if (admin && admin.status === "active" && await verifyPassword(password, admin.passwordHash)) { ok = true; authRec = admin; authEntity = "admins"; }
  }
  if (!ok) {
    recordFail(key);
    return res.status(401).json({ error: "Invalid email or password" });
  }
  // Two-step sign-in: the password was right, now the authenticator code.
  if (authRec.totpEnabled) {
    if (!code) return res.json({ ok: false, needsCode: true });
    const second = await checkSecondFactor(authRec, code);
    if (!second) {
      recordFail(key);
      return res.status(401).json({ error: "That code didn't work. Use the newest code from your authenticator app, or a recovery code.", needsCode: true });
    }
    const usedRecovery = !!second.usedRecovery;
    delete second.usedRecovery;
    await putRecord(authEntity, authRec.id, { ...authRec, ...second });
    if (usedRecovery && authEntity === "admins") await logAudit({ sub: authRec.id, name: authRec.username, role: "admin" }, "2fa_recovery_code_used", `admin ${authRec.id}`);
  }
  failMap.delete(key);

  const payload =
    portal === "admin"
      ? { sub: user.id, role: "admin", adminRole: user.role, name: user.username, email: user.email }
      : staffPayload(user);

  // Either portal can stay signed in on a trusted device (admin for 7 days,
  // staff for 30); otherwise sessions last 8 hours.
  const ttl = remember ? (portal === "admin" ? ADMIN_REMEMBER_TTL_SECONDS : REMEMBER_TTL_SECONDS) : undefined;
  const token = signSession(payload, ttl);
  if (portal === "admin") {
    setSessionCookie(res, token, ADMIN_COOKIE, ttl);
    // Free the staff cookie if an old admin session is still parked in it.
    if (getSessionFromRequest(req)?.role === "admin") clearSessionCookie(res);
  } else {
    setSessionCookie(res, token, undefined, ttl);
  }

  return res.json({ ok: true, user: { id: user.id, name: payload.name, email: user.email, role: payload.role, staffRole: payload.staffRole, adminRole: payload.adminRole } });
}
