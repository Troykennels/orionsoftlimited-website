import { getByLookup } from "../_lib/records.js";
import { verifyPassword, signSession, setSessionCookie } from "../_lib/auth.js";

const rateMap = new Map();
const RATE_LIMIT = 8;
const RATE_WINDOW = 15 * 60 * 1000;

function checkRate(ip) {
  const now = Date.now();
  const e = rateMap.get(ip) || { count: 0, start: now };
  if (now - e.start > RATE_WINDOW) { rateMap.set(ip, { count: 1, start: now }); return true; }
  if (e.count >= RATE_LIMIT) return false;
  e.count++;
  rateMap.set(ip, e);
  return true;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRate(ip)) {
    return res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
  }

  const { email, password, portal } = req.body || {};
  if (!email || !password || !["admin", "staff"].includes(portal)) {
    return res.status(400).json({ error: "email, password, and portal are required" });
  }

  const entity = portal === "admin" ? "admins" : "employees";
  const user = await getByLookup(entity, "email", email);
  if (!user || user.status !== "active") {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const payload =
    portal === "admin"
      ? { sub: user.id, role: "admin", adminRole: user.role, name: user.username, email: user.email }
      : { sub: user.id, role: "staff", staffRole: user.staffRole || "staff", department: user.department || "", name: user.fullName, email: user.email, title: user.title };

  const token = signSession(payload);
  setSessionCookie(res, token);

  return res.json({ ok: true, user: { id: user.id, name: payload.name, email: user.email, role: payload.role, staffRole: payload.staffRole, adminRole: payload.adminRole } });
}
