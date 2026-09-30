// Generic website form endpoint (the Consultation page and any older form
// that still posts here). Every submission is saved as a lead, so it shows in
// Admin → Contact Forms even if the notification email fails, and the admin
// is emailed through the shared mailer (Gmail first, Resend fallback).
import { push } from "./store.js";
import { sendEmail, brandedShell } from "./_lib/mailer.js";
import { escapeHtml } from "./_lib/office.js";

const ADMIN_EMAIL = process.env.FORM_TO_EMAIL || process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com";
const MAX_FIELDS = 40;

const rateMap = new Map();
function limited(ip) {
  const now = Date.now(), e = rateMap.get(ip) || { n: 0, t: now };
  if (now - e.t > 15 * 60 * 1000) { rateMap.set(ip, { n: 1, t: now }); return false; }
  e.n++; rateMap.set(ip, e);
  return e.n > 10;
}

// Flat, size-capped copy of what was submitted.
function cleanPayload(body) {
  const out = {};
  for (const [k, v] of Object.entries(body || {}).slice(0, MAX_FIELDS)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k) || v == null) continue;
    out[k] = Array.isArray(v) ? v.map(x => String(x).slice(0, 200)).slice(0, 30) : String(v).slice(0, 4000);
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (limited(ip)) return res.status(429).json({ ok: false, error: "Too many submissions. Please wait a few minutes." });

  const payload = cleanPayload(req.body);
  if (req.body?.website) return res.json({ ok: true }); // honeypot
  if (!payload.type) return res.status(400).json({ ok: false, error: "Missing submission type" });
  const email = String(payload.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: "A valid email address is required" });

  const ref = `ORN-${Date.now().toString(36).toUpperCase().slice(-7)}`;
  const name = payload.fullName || payload.name || "";
  const lead = {
    ...payload,
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ref, type: payload.type, status: "new", source: "Website Form", submittedAt: new Date().toISOString(),
    contactName: name, name, email, phone: payload.phone || "", company: payload.orgName || payload.company || "",
    interestedService: Array.isArray(payload.products) ? payload.products.join(", ") : payload.products || payload.type,
    message: payload.challenge || payload.message || "",
  };
  await push("orionsoft:leads", lead);

  const rows = Object.entries(payload).map(([k, v]) => `<tr>
    <td style="padding:8px 10px;border:1px solid #E5E9F0;font-weight:700;background:#F8FAFC;vertical-align:top;">${escapeHtml(k)}</td>
    <td style="padding:8px 10px;border:1px solid #E5E9F0;vertical-align:top;">${escapeHtml(Array.isArray(v) ? v.join(", ") : v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  try {
    await sendEmail(ADMIN_EMAIL, `[${ref}] New ${payload.type} from ${name || email}`, brandedShell(
      `<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">New ${escapeHtml(payload.type)} request</h2>
       <table style="border-collapse:collapse;width:100%;font-size:13.5px;color:#3A4556;">${rows}</table>
       <p style="color:#6B7A96;font-size:12px;margin-top:14px;">Also saved in Admin → Contact Forms (${ref}).</p>`,
      { title: "Website submission" }), { kind: "website_form" });
  } catch { /* the lead is saved; the admin sees it in the dashboard */ }

  return res.json({ ok: true, ref });
}
