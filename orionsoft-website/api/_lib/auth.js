// Real server-verified auth: bcrypt password hashes + signed httpOnly JWT session cookies.
// Replaces the old client-trusted localStorage session and shared x-admin-key header.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "orionsoft_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

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

export function setSessionCookie(res, token) {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res) {
  const cookie = serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookie);
}

function readToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers?.cookie || "";
  const match = header.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getSessionFromRequest(req) {
  const token = readToken(req);
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
