// Shared transactional email sender — Gmail/nodemailer first (works for any
// recipient), Resend REST API fallback. Extracted from the original api/contact.js
// so every new automation (contracts, payroll, staff, leave, payments) uses one
// implementation. Every send is logged to orionsoft:emails:sent for the admin
// "Email Log" section.
import { push } from "../store.js";

const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "Orion Soft <onboarding@resend.dev>";

async function sendViaResend(to, subject, html, apiKey, attachments) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM, to: [to], subject, html,
        attachments: attachments?.map(a => ({ filename: a.filename, content: a.content.toString("base64") })),
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.error(`[mailer] Resend send to ${to} failed: HTTP ${r.status} ${body}`);
    }
    return r.ok;
  } catch (err) {
    console.error(`[mailer] Resend send to ${to} threw:`, err.message);
    return false;
  }
}

async function sendViaGmail(to, subject, html, attachments) {
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      // Belt-and-suspenders alongside server.js's dns.setDefaultResultOrder:
      // force IPv4 so hosts without IPv6 egress (e.g. Railway) don't hit
      // ENETUNREACH connecting to Gmail's IPv6 SMTP address.
      family: 4,
    });
    await transporter.sendMail({
      from: `"Orion Soft" <${process.env.GMAIL_USER}>`, to, subject, html,
      attachments: attachments?.map(a => ({ filename: a.filename, content: a.content })),
    });
    return true;
  } catch (err) {
    console.error(`[mailer] Gmail send to ${to} failed:`, err.message, err.code || "");
    return false;
  }
}

// Gmail first — works for ANY recipient email address. Resend with the default
// onboarding@resend.dev sender is restricted to the account owner only, so it
// silently fails for client/staff emails. Gmail has no such restriction.
// `attachments`: [{ filename, content: Buffer }] — used for PDF letterheads/payslips.
export async function sendEmail(to, subject, html, { attachments, kind } = {}) {
  let ok = false;
  if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER) {
    ok = await sendViaGmail(to, subject, html, attachments);
  }
  if (!ok && process.env.RESEND_API_KEY) {
    ok = await sendViaResend(to, subject, html, process.env.RESEND_API_KEY, attachments);
  }
  if (!ok && !process.env.GMAIL_APP_PASSWORD && !process.env.RESEND_API_KEY) {
    console.error("[mailer] No email provider configured (GMAIL_APP_PASSWORD/RESEND_API_KEY both unset)");
  }
  try {
    await push("orionsoft:emails:sent", {
      to, subject, kind: kind || "generic", ok, sentAt: new Date().toISOString(),
    });
  } catch { /* logging failure must never block the caller */ }
  return ok;
}

export function brandedShell(bodyHtml, { title = "Orion Soft Limited" } = {}) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F6FA;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(10,37,64,0.08);">
<tr><td style="background:#0A2540;padding:24px 32px;">
  <span style="color:#FFFFFF;font-size:18px;font-weight:800;letter-spacing:-0.02em;">Orion<span style="color:#C8A850;">Soft</span></span>
  <div style="color:#9FB3C8;font-size:12px;margin-top:4px;">${title}</div>
</td></tr>
<tr><td style="padding:32px;">${bodyHtml}</td></tr>
<tr><td style="padding:20px 32px;background:#F4F6FA;border-top:1px solid #E5E9F0;">
  <p style="color:#6B7A96;font-size:11.5px;margin:0;line-height:1.6;">Orion Soft Limited · RC 9535128 · orionsoftlimited@gmail.com · 08169577059</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
