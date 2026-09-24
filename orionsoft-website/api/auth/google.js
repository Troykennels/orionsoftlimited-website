// "Continue with Google" for the Staff Office.
//
// The browser gets a Google ID token from Google Identity Services and posts
// it here. We verify it with Google (signature, audience = our client id,
// issuer, expiry, verified email), then match it to an ACTIVE employee:
//   1. an account previously linked to this Google user id (sub), else
//   2. an employee whose work email equals the Google email, else
//   3. an employee who linked this Google email from their profile.
// No employee match means no access: Google sign-in never creates accounts.
//
// Also: action "link" / "unlink" (signed-in staff connect a Google account
// whose address differs from their work email, e.g. a personal Gmail).
//
// Requires env GOOGLE_CLIENT_ID (OAuth 2.0 Web client id from Google Cloud
// Console, with https://orionsoftlimited.com as an authorised JS origin).
import { getByLookup, putRecord, setLookup, deleteLookup } from "../_lib/records.js";
import { signSession, setSessionCookie, requireStaff, REMEMBER_TTL_SECONDS } from "../_lib/auth.js";
import { staffPayload } from "./login.js";

async function verifyGoogleToken(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw Object.assign(new Error("Google sign-in isn't configured on the server"), { status: 503 });
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!r.ok) throw Object.assign(new Error("Google couldn't verify that sign-in. Please try again."), { status: 401 });
  const t = await r.json();
  const validIssuer = t.iss === "accounts.google.com" || t.iss === "https://accounts.google.com";
  if (t.aud !== clientId || !validIssuer || Number(t.exp) * 1000 < Date.now()) {
    throw Object.assign(new Error("That Google sign-in isn't valid for this site"), { status: 401 });
  }
  if (t.email_verified !== "true" && t.email_verified !== true) {
    throw Object.assign(new Error("Your Google email address isn't verified"), { status: 401 });
  }
  return { sub: String(t.sub), email: String(t.email).toLowerCase(), picture: t.picture || "", name: t.name || "" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { credential, action } = req.body || {};

  if (action === "unlink") {
    const auth = await requireStaff(req, res);
    if (!auth) return;
    const emp = auth.employee;
    if (emp.googleSub) await deleteLookup("employees", "google", emp.googleSub);
    if (emp.googleEmail) await deleteLookup("employees", "googleemail", emp.googleEmail);
    emp.googleSub = null; emp.googleEmail = null;
    await putRecord("employees", emp.id, emp);
    return res.json({ ok: true });
  }

  if (!credential) return res.status(400).json({ error: "Missing Google credential" });
  let g;
  try { g = await verifyGoogleToken(credential); }
  catch (err) { return res.status(err.status || 401).json({ error: err.message }); }

  if (action === "link") {
    const auth = await requireStaff(req, res);
    if (!auth) return;
    const emp = auth.employee;
    const owner = await getByLookup("employees", "google", g.sub);
    if (owner && owner.id !== emp.id) return res.status(409).json({ error: "That Google account is already linked to another staff member" });
    if (emp.googleSub && emp.googleSub !== g.sub) await deleteLookup("employees", "google", emp.googleSub);
    if (emp.googleEmail && emp.googleEmail !== g.email) await deleteLookup("employees", "googleemail", emp.googleEmail);
    emp.googleSub = g.sub; emp.googleEmail = g.email;
    await putRecord("employees", emp.id, emp);
    await setLookup("employees", "google", g.sub, emp.id);
    await setLookup("employees", "googleemail", g.email, emp.id);
    return res.json({ ok: true, googleEmail: g.email });
  }

  // Sign in.
  const employee = (await getByLookup("employees", "google", g.sub))
    || (await getByLookup("employees", "email", g.email))
    || (await getByLookup("employees", "googleemail", g.email));
  if (!employee) {
    return res.status(403).json({ error: `${g.email} isn't registered as Orion Soft staff. Sign in with your work email and password, then link Google from your profile.` });
  }
  if (employee.status !== "active") return res.status(403).json({ error: "Your staff account is not active. Contact HR." });
  // A Google account linked to this employee must be the one signing in.
  if (employee.googleSub && employee.googleSub !== g.sub) {
    return res.status(403).json({ error: "This staff account is linked to a different Google account" });
  }
  if (!employee.googleSub) {
    employee.googleSub = g.sub;
    employee.googleEmail = g.email;
    if (!employee.avatarDataUrl && g.picture) employee.googlePicture = g.picture;
    await putRecord("employees", employee.id, employee);
    await setLookup("employees", "google", g.sub, employee.id);
  }
  employee.lastLoginAt = new Date().toISOString();
  employee.lastLoginMethod = "google";
  await putRecord("employees", employee.id, employee);

  const payload = staffPayload(employee);
  setSessionCookie(res, signSession(payload, REMEMBER_TTL_SECONDS), undefined, REMEMBER_TTL_SECONDS);
  return res.json({ ok: true, user: { id: employee.id, name: payload.name, email: employee.email, role: "staff", staffRole: payload.staffRole } });
}
