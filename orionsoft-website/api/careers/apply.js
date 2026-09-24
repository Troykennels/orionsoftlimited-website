import { newId, putRecord, setLookup, getByLookup } from "../_lib/records.js";
import { notifyNewApplicant, sendApplicationReceived } from "../_lib/emailTemplates.js";
import { signSession, setSessionCookie, APPLICANT_COOKIE } from "../_lib/auth.js";
import { portalLinkFor } from "../applicant/portal.js";

async function uniqueReference() {
  for (let i = 0; i < 5; i++) {
    const ref = `ORN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (!(await getByLookup("applicants", "reference", ref))) return ref;
  }
  return `ORN-${Date.now().toString(36).toUpperCase()}`;
}

const rateMap = new Map();
const RATE_LIMIT = 5;
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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRate(ip)) {
    return res.status(429).json({ error: "Too many applications from this connection. Please try again later." });
  }

  const {
    fullName, email, phone, location, role, experience, qualification,
    availability, cvLink, portfolio, referral, whyOrion,
  } = req.body || {};

  if (!fullName || !email || !role) {
    return res.status(400).json({ error: "fullName, email, and role are required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  const id = newId("app");
  const reference = await uniqueReference();
  const now = new Date().toISOString();
  const cut = (v, n = 500) => String(v || "").slice(0, n);
  const applicant = {
    id, reference,
    fullName: cut(fullName, 120), email: String(email).trim().toLowerCase(), phone: cut(phone, 40), location: cut(location, 120),
    roleAppliedFor: cut(role, 120), experience: cut(experience, 120), qualification: cut(qualification, 200),
    availability: cut(availability, 120), cvLink: cut(cvLink, 400), portfolio: cut(portfolio, 400),
    referral: cut(referral, 200), coverNote: cut(whyOrion, 4000),
    source: "website",
    status: "applied",
    score: null,
    reviewer: "",
    notes: [],
    statusHistory: [{ status: "applied", at: now }],
    messages: [],
    unreadForAdmin: true,
    createdAt: now,
    updatedAt: now,
  };

  await putRecord("applicants", id, applicant);
  await setLookup("applicants", "reference", reference, id);

  try { await notifyNewApplicant(applicant); } catch { /* best-effort */ }
  try { await sendApplicationReceived(applicant, portalLinkFor(applicant.email)); } catch { /* best-effort */ }

  // Sign the candidate straight into their applicant portal.
  try {
    setSessionCookie(res, signSession({ role: "applicant", email: applicant.email }, 60 * 60 * 24 * 30), APPLICANT_COOKIE, 60 * 60 * 24 * 30);
  } catch { /* SESSION_SECRET missing: portal sign-in still works via email + reference */ }

  return res.json({ ok: true, applicantId: id, reference });
}
