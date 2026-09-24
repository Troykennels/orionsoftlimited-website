import { getByLookup } from "../_lib/records.js";
import { verifyPassword, signSession, setSessionCookie, REMEMBER_TTL_SECONDS } from "../_lib/auth.js";

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

  const { email, password, portal, remember } = req.body || {};
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

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    recordFail(key);
    return res.status(401).json({ error: "Invalid email or password" });
  }
  failMap.delete(key);

  const payload =
    portal === "admin"
      ? { sub: user.id, role: "admin", adminRole: user.role, name: user.username, email: user.email }
      : staffPayload(user);

  // Staff can stay signed in on a trusted device; admin sessions stay short.
  const ttl = portal === "staff" && remember ? REMEMBER_TTL_SECONDS : undefined;
  const token = signSession(payload, ttl);
  setSessionCookie(res, token, undefined, ttl);

  return res.json({ ok: true, user: { id: user.id, name: payload.name, email: user.email, role: payload.role, staffRole: payload.staffRole, adminRole: payload.adminRole } });
}
