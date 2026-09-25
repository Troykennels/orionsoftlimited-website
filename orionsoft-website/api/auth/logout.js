import { clearSessionCookie, getSessionFromRequest, ADMIN_COOKIE } from "../_lib/auth.js";

// Signs out of one portal (?portal=admin|staff, or in the body) and leaves
// the other signed in. With no portal given, signs out of both.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const portal = req.query?.portal || req.body?.portal;
  const shared = getSessionFromRequest(req);
  if (portal !== "staff") {
    clearSessionCookie(res, ADMIN_COOKIE);
    if (shared?.role === "admin") clearSessionCookie(res); // pre-split admin session
  }
  if (portal !== "admin" && shared?.role !== "admin") clearSessionCookie(res);
  return res.json({ ok: true });
}
