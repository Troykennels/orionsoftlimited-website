// Real server-verified auth: bcrypt password hashes + signed httpOnly JWT session cookies.
// Replaces the old client-trusted localStorage session and shared x-admin-key header.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "orionsoft_session";
// Job applicants get their own cookie so a candidate signing in to track an
// application on a shared machine never replaces an admin/staff session.
export const APPLICANT_COOKIE = "orionsoft_applicant";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours
// "Keep me signed in" for staff on a trusted device (and Google sign-in).
// Staff routes re-check the live employee record on every request, so a
// suspended account is locked out immediately regardless of token lifetime.
export const REMEMBER_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Minimal, dependency-free Set-Cookie serializer (RFC 6265) — avoids pulling in
// a cookie library whose API shape may drift across major versions.
function serialize(name, value, opts = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge != null) str += `; Max-Age=${Math.floor(opts.maxAge)}`;
  if (opts.path) str += `; Path=${opts.path}`;
  if (opts.httpOnly) str += `; HttpOnly`;
  if (opts.secure) str += `; Secure`;
  if (opts.sameSite) str += `; SameSite=${opts.sameSite[0].toUpperCase()}${opts.sameSite.slice(1)}`;
  return str;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET env var is not set");
  return s;
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

// payload: { sub: userId, role: "admin"|"staff", name, email }
// expiresInSeconds defaults to the normal 8h session TTL — pass a longer value
// for special-purpose tokens like contract sign links.
export function signSession(payload, expiresInSeconds = SESSION_TTL_SECONDS) {
  return jwt.sign(payload, secret(), { expiresIn: expiresInSeconds });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token, name = COOKIE_NAME, maxAge = SESSION_TTL_SECONDS) {
  const cookie = serialize(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res, name = COOKIE_NAME) {
  const cookie = serialize(name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookie);
}

function readToken(req, name = COOKIE_NAME) {
  if (req.cookies && req.cookies[name]) return req.cookies[name];
  const header = req.headers?.cookie || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getSessionFromRequest(req, name = COOKIE_NAME) {
  const token = readToken(req, name);
  if (!token) return null;
  return verifySession(token);
}

// Returns the session payload if valid and (when role given) matching, else sends 401 and returns null.
export function requireAuth(req, res, role) {
  const session = getSessionFromRequest(req);
  if (!session || (role && session.role !== role)) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
}

// Staff endpoints: verifies the session AND loads the live employee record, so
// role/department/manager changes take effect immediately rather than after
// the (up to 8h old) token expires. Suspended staff are rejected outright.
//
// A website admin (the owner) can also use the Staff Office with their admin
// session, once an owner employee record is linked to their admin account
// (created from the admin dashboard). No second password needed.
export async function requireStaff(req, res) {
  const raw = getSessionFromRequest(req);
  if (!raw || !["staff", "admin"].includes(raw.role)) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const { getRecord, getByLookup } = await import("./records.js");
  const employee = raw.role === "staff" ? await getRecord("employees", raw.sub) : await getByLookup("employees", "admin", raw.sub);
  if (!employee && raw.role === "admin") {
    res.status(403).json({ error: "No owner office account yet", needsOwnerSetup: true });
    return null;
  }
  const session = raw.role === "staff" ? raw : { ...raw, sub: employee.id, viaAdmin: true };
  if (!employee || employee.status !== "active") {
    res.status(401).json({ error: "Your staff account is not active" });
    return null;
  }
  return { session, employee };
}
