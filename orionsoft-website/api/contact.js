import { push } from "./store.js";

const rateMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 15 * 60 * 1000;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com";
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "Orion Soft <onboarding@resend.dev>";

const TYPE_LABELS = {
  demo: "Demo Booking", contact: "General Contact", quote: "Quote Request",
  support: "Support Ticket", partnership: "Partnership Application",
  career: "Career Application", newsletter: "Newsletter Subscription",
};

const NEXT_STEPS = {
  demo: "Your demo booking has been received and confirmed ✅ Our team will contact you within 1 business day to confirm the exact time and send you a meeting link. Please check your phone and email.",
  contact: "A member of our team will get back to you within 1–2 business days.",
  quote: "Your quote request has been received ✅ Our sales team will prepare a tailored proposal and reach out within 1 business day.",
  support: "Your support ticket has been logged ✅ Our support team will pick it up within 4 business hours.",
  partnership: "Our business development team will be in touch within 3 business days.",
  career: "Your application has been received ✅ Our HR team will review it and respond within 5 business days.",
  newsletter: "You're now subscribed! You'll receive our next update shortly.",
};

// Product catalogue — used to personalise client emails
const PRODUCT_INFO = {
  carecore:       { name: "CareCore",       full: "CareCore — Hospital Management System",    color: "#4F8EF7", emoji: "🏥",
    tagline: "The complete operating system for your hospital.",
    bullets: ["Patient records & clinical workflows","Pharmacy, laboratory & billing","Ward & bed management","Real-time executive analytics"] },
  schoolcore:     { name: "SchoolCore",     full: "SchoolCore — School Management System",    color: "#10B981", emoji: "🎓",
    tagline: "One platform for admissions, results, fees, and parents.",
    bullets: ["Admissions & attendance tracking","Academic results & CBT exams","Fee management & payment receipts","Parent portal & SMS communication"] },
  compliancecore: { name: "ComplianceCore", full: "ComplianceCore — Compliance & Risk",       color: "#F59E0B", emoji: "✅",
    tagline: "Stay audit-ready across every Nigerian regulation.",
    bullets: ["Policy & risk register management","CAC, NDPR, CBN, NAFDAC tracking","Audit trail & incident reporting","Compliance health dashboard"] },
  inventorycore:  { name: "InventoryCore",  full: "InventoryCore — Inventory & Supply Chain", color: "#8B5CF6", emoji: "📦",
    tagline: "Real-time stock visibility across every location.",
    bullets: ["Multi-warehouse stock tracking","Purchase orders & supplier management","Barcode/QR scanning & batch tracking","Expiry management & reorder alerts"] },
  financecore:    { name: "FinanceCore",    full: "FinanceCore — Finance & Accounting",       color: "#C8A850", emoji: "💰",
    tagline: "Built for Nigerian businesses — PAYE, VAT, pension and all.",
    bullets: ["Invoicing & accounts payable/receivable","Payroll with PAYE & pension (PFA)","Bank reconciliation & financial statements","Budget, forecast & tax management"] },
  hrcore:         { name: "HRCore",         full: "HRCore — Human Resources Management",      color: "#F43F5E", emoji: "👥",
    tagline: "Manage your full team lifecycle in one place.",
    bullets: ["Employee records & recruitment","Leave, attendance & time tracking","Performance reviews & training","Payroll integration with FinanceCore"] },
  churchcore:     { name: "ChurchCore",     full: "ChurchCore — Church Management System",    color: "#7C3AED", emoji: "⛪",
    tagline: "Built for Nigerian church culture — zones, units, cell groups.",
    bullets: ["Member database & attendance","Cell groups & giving/tithe tracking","Events management & SMS/email comms","Volunteer management & leadership reports"] },
  fleetcore:      { name: "FleetCore",      full: "FleetCore — Fleet Management",             color: "#06B6D4", emoji: "🚗",
    tagline: "Track every vehicle, driver, and trip in real time.",
    bullets: ["Vehicle registry & driver management","Fuel tracking & maintenance scheduling","Trip management & GPS integration","Insurance docs & compliance alerts"] },
  telehealth:     { name: "TeleHealth",     full: "TeleHealth — Telemedicine Platform",       color: "#4F8EF7", emoji: "💊",
    tagline: "Extending care beyond hospital walls — coming 2026.",
    bullets: ["Video consultations & digital prescriptions","Patient scheduling & remote monitoring","CareCore integration","Specialist referral system"] },
};

function checkRate(ip) {
  const now = Date.now();
  const e = rateMap.get(ip) || { count: 0, start: now };
  if (now - e.start > RATE_WINDOW) { rateMap.set(ip, { count: 1, start: now }); return true; }
  if (e.count >= RATE_LIMIT) return false;
  e.count++;
  rateMap.set(ip, e);
  return true;
}

function confirmHtml({ type, name, ref, product, demoSlot }) {
  const label = TYPE_LABELS[type] || "Enquiry";
  const p = PRODUCT_INFO[product?.toLowerCase?.()];
  const next = type === "demo" && p
    ? `Your demo for <strong>${p.name}</strong> has been confirmed ✅${demoSlot ? ` Preferred time: <strong>${demoSlot}</strong>.` : ""} Our team will contact you within 1 business day to send a calendar invite and meeting link. Please check your phone and email.`
    : NEXT_STEPS[type] || NEXT_STEPS.contact;

  const productBlock = p ? `
    <div style="background:#060810;border:1px solid ${p.color}30;border-left:3px solid ${p.color};border-radius:10px;padding:18px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:22px;">${p.emoji}</span>
        <div>
          <p style="color:${p.color};font-size:11px;font-weight:700;letter-spacing:0.1em;margin:0 0 2px;">PRODUCT REQUESTED</p>
          <p style="color:#F2F6FF;font-size:16px;font-weight:700;margin:0;">${p.full}</p>
        </div>
      </div>
      <p style="color:#C8D0E0;font-size:13.5px;line-height:1.6;margin:0 0 12px;font-style:italic;">"${p.tagline}"</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${p.bullets.map(b => `<tr><td style="padding:4px 0;color:#C8D0E0;font-size:13px;">
          <span style="color:${p.color};margin-right:8px;">→</span>${b}
        </td></tr>`).join("")}
      </table>
    </div>` : "";

  const demoSlotBlock = demoSlot ? `
    <div style="background:#060810;border:1px solid rgba(200,168,80,0.2);border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="color:#6B7A96;font-size:11px;font-weight:700;letter-spacing:0.1em;margin:0 0 4px;">YOUR DEMO SLOT</p>
      <p style="color:#C8A850;font-size:15px;font-weight:700;margin:0;">📅 ${demoSlot}</p>
    </div>` : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orion Soft — ${label}</title></head>
<body style="margin:0;padding:0;background:#060810;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="text-align:center;padding-bottom:24px;">
    <div style="display:inline-block;background:#0F1828;border:1px solid rgba(200,168,80,0.3);border-radius:12px;padding:14px 22px;">
      <span style="color:#C8A850;font-size:18px;font-weight:800;">ORION SOFT</span>
      <span style="color:rgba(255,255,255,0.35);font-size:11px;margin-left:8px;">LIMITED</span>
    </div>
  </td></tr>
  <tr><td style="background:#0F1828;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:36px;">
    <div style="text-align:center;font-size:40px;margin-bottom:16px;">${type === "demo" ? "🗓️" : "✓"}</div>
    <h1 style="color:#F2F6FF;font-size:22px;font-weight:700;margin:0 0 6px;text-align:center;">${p ? p.name + " " : ""}${label} Confirmed</h1>
    <p style="color:#C8D0E0;font-size:15px;line-height:1.7;margin:0 0 26px;text-align:center;">Hi ${name || "there"} — thank you for reaching out to Orion Soft. We're excited to show you what we've built.</p>
    ${productBlock}
    ${demoSlotBlock}
    <div style="background:#060810;border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:18px;margin-bottom:22px;">
      <p style="color:#6B7A96;font-size:11px;font-weight:700;letter-spacing:0.1em;margin:0 0 6px;">WHAT HAPPENS NEXT</p>
      <p style="color:#C8D0E0;font-size:14px;line-height:1.65;margin:0;">${next}</p>
    </div>
    ${ref ? `<p style="color:#6B7A96;font-size:12px;text-align:center;margin:0 0 22px;">Reference: <strong style="color:#C8D0E0;">${ref}</strong></p>` : ""}
    <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:18px;">
      <p style="color:#6B7A96;font-size:11px;font-weight:700;letter-spacing:0.08em;margin:0 0 8px;">NEED IMMEDIATE HELP?</p>
      <p style="margin:0 0 5px;"><a href="mailto:orionsoftlimited@gmail.com" style="color:#4F8EF7;font-size:13px;text-decoration:none;">📧 orionsoftlimited@gmail.com</a></p>
      <p style="margin:0 0 5px;"><a href="tel:08169577059" style="color:#4F8EF7;font-size:13px;text-decoration:none;">📱 08169577059</a></p>
      <p style="margin:0;"><a href="https://wa.me/2348169577059" style="color:#25D366;font-size:13px;text-decoration:none;">💬 Chat on WhatsApp</a></p>
    </div>
  </td></tr>
  <tr><td style="padding:16px 0 0;text-align:center;">
    <p style="color:#3A4556;font-size:11px;margin:0;">© ${new Date().getFullYear()} Orion Soft Limited · CAC RC: 9535128 · NDPR Compliant</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function adminHtml(data) {
  const { type, honeypot: _h, timing: _t, ref, ...fields } = data;
  const label = TYPE_LABELS[type] || "Enquiry";
  const rows = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => {
      const display = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
      const val = Array.isArray(v) ? v.join(", ") : String(v);
      return `<tr>
        <td style="padding:9px 14px;color:#6B7A96;font-size:12px;font-weight:700;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.04);text-transform:uppercase;letter-spacing:0.06em;">${display}</td>
        <td style="padding:9px 14px;color:#C8D0E0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);word-break:break-word;">${val}</td>
      </tr>`;
    }).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>New ${label}</title></head>
<body style="margin:0;padding:0;background:#060810;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#0F1828;border:1px solid rgba(200,168,80,0.25);border-radius:16px;padding:28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td><h1 style="color:#F2F6FF;font-size:18px;font-weight:700;margin:0;">🔔 New ${label}</h1></td>
        <td align="right"><span style="background:rgba(200,168,80,0.12);color:#C8A850;border:1px solid rgba(200,168,80,0.3);border-radius:999px;padding:5px 14px;font-size:11px;font-weight:700;">${ref}</span></td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.05);border-radius:10px;overflow:hidden;">
      <tbody>${rows}</tbody>
    </table>
  </td></tr>
  <tr><td style="padding:14px 0 0;text-align:center;">
    <p style="color:#3A4556;font-size:11px;margin:0;">Submitted ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" })} WAT</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function sendViaResend(to, subject, html, apiKey) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });
    return r.ok;
  } catch { return false; }
}

async function sendViaGmail(to, subject, html) {
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({ from: `"Orion Soft" <${process.env.GMAIL_USER}>`, to, subject, html });
    return true;
  } catch { return false; }
}

// Gmail first — works for ANY recipient email address.
// Resend with onboarding@resend.dev is restricted to the account owner only,
// so it silently fails for client emails. Gmail has no such restriction.
async function sendEmail(to, subject, html) {
  if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER) {
    const ok = await sendViaGmail(to, subject, html);
    if (ok) return true;
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) return sendViaResend(to, subject, html, resendKey);
  return false;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRate(ip)) return res.status(429).json({ error: "Too many requests. Please wait a few minutes." });

  const body = req.body || {};

  // Honeypot & timing spam checks — fail silently
  if (body.honeypot) return res.status(200).json({ ok: true, ref: "OK" });
  if (typeof body.timing === "number" && body.timing < 3000) return res.status(200).json({ ok: true, ref: "OK" });

  // Allow chatbot-originated leads (type: "chatbot") to bypass strict validation
  const isChatbot = body.source === "chatbot";
  if (!isChatbot) {
    if (!body.type || !TYPE_LABELS[body.type]) return res.status(400).json({ error: "Invalid form type" });
    if (body.type !== "newsletter" && !body.name?.trim()) return res.status(400).json({ error: "Name is required" });
    if (!body.email?.trim() || !body.email.includes("@")) return res.status(400).json({ error: "Valid email is required" });
  } else {
    if (!body.email?.trim() || !body.email.includes("@")) return res.status(400).json({ error: "Valid email is required" });
    body.type = body.type || "demo";
  }

  const ref = body.ref || `ORN-${Date.now().toString(36).toUpperCase().slice(-7)}`;
  const emailData = { ...body, ref };

  // Store lead server-side (Upstash) — visible in admin panel from any device
  const lead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ref, type: body.type, status: "new",
    source: body.source === "chatbot" ? "Ori AI Chat" : "Website Form",
    submittedAt: new Date().toISOString(),
    contactName: body.name || "", email: body.email || "",
    phone: body.phone || "", company: body.company || body.org || "",
    interestedService: body.product || body.role || body.type,
    priority: body.priority || "Medium",
    message: body.message || body.description || "",
    ...Object.fromEntries(Object.entries(body).filter(([k]) =>
      !["honeypot","timing","source","ref"].includes(k)
    )),
  };
  await push("orionsoft:leads", lead);

  // Build product-aware subject lines
  const productMeta = PRODUCT_INFO[body.product?.toLowerCase?.()];
  const clientSubject = body.type === "demo" && productMeta
    ? `${productMeta.name} Demo Confirmed — Orion Soft [${ref}]`
    : `${TYPE_LABELS[body.type] || "Enquiry"} Received — Orion Soft [${ref}]`;
  const adminSubject = productMeta
    ? `[${ref}] ${TYPE_LABELS[body.type] || "Lead"} — ${productMeta.name} — ${body.name || body.email}`
    : `[${ref}] New ${TYPE_LABELS[body.type] || "Lead"} from ${body.name || body.email}`;

  // Send confirmation to the user (best-effort)
  if (body.email && body.type !== "newsletter") {
    await sendEmail(
      body.email,
      clientSubject,
      confirmHtml({ type: body.type, name: body.name, ref, product: body.product, demoSlot: body.demoSlot }),
    );
  }
  // Always notify admin
  await sendEmail(
    ADMIN_EMAIL,
    adminSubject,
    adminHtml(emailData),
  );

  return res.json({ ok: true, ref });
}
