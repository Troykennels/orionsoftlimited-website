import { newId, putRecord } from "../_lib/records.js";
import { notifyNewApplicant } from "../_lib/emailTemplates.js";

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

  const id = newId("app");
  const applicant = {
    id,
    fullName, email, phone: phone || "", location: location || "",
    roleAppliedFor: role, experience: experience || "", qualification: qualification || "",
    availability: availability || "", cvLink: cvLink || "", portfolio: portfolio || "",
    referral: referral || "", coverNote: whyOrion || "",
    source: "website",
    status: "applied",
    score: null,
    reviewer: "",
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await putRecord("applicants", id, applicant);

  try { await notifyNewApplicant(applicant); } catch { /* best-effort */ }

  return res.json({ ok: true, applicantId: id });
}
