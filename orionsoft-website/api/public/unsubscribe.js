// One-click newsletter unsubscribe (the link at the foot of every newsletter).
// Shows a small confirmation page; no login needed, the token proves it.
import { get, set } from "../store.js";
import { SUBS_KEY } from "../_lib/newsletter.js";
import { escapeHtml } from "../_lib/office.js";

function page(res, status, title, text) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  return res.status(status).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#F4F6FA;font-family:Arial,Helvetica,sans-serif;"><div style="max-width:480px;margin:60px auto;background:#fff;border-radius:14px;padding:28px 24px;text-align:center;">
<div style="font-size:18px;font-weight:800;color:#0A2540;">Orion<span style="color:#C8A850;">Soft</span></div>
<h1 style="font-size:20px;color:#0A2540;margin:18px 0 10px;">${escapeHtml(title)}</h1><p style="color:#3A4556;line-height:1.6;margin:0;">${escapeHtml(text)}</p>
<p style="margin:22px 0 0;"><a href="https://www.orionsoftlimited.com" style="color:#0A2540;font-weight:700;">Visit orionsoftlimited.com</a></p></div></body></html>`);
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).end();
  const email = String(req.query.e || "").toLowerCase();
  const token = String(req.query.t || "");
  const subs = (await get(SUBS_KEY)) || {};
  const s = subs[email];
  if (!s || !token || s.token !== token) return page(res, 400, "Link not recognised", "This unsubscribe link isn't valid. If you keep getting our emails, reply to one and we'll remove you.");
  // GET only asks: mail scanners open links in emails, and that must not
  // unsubscribe anyone. The button POSTs back here.
  if (req.method === "GET" && s.active) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");
    return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head>
<body style="margin:0;background:#F4F6FA;font-family:Arial,Helvetica,sans-serif;"><form method="post" style="max-width:480px;margin:60px auto;background:#fff;border-radius:14px;padding:28px 24px;text-align:center;">
<div style="font-size:18px;font-weight:800;color:#0A2540;">Orion<span style="color:#C8A850;">Soft</span></div>
<h1 style="font-size:20px;color:#0A2540;margin:18px 0 10px;">Unsubscribe ${escapeHtml(email)}?</h1><p style="color:#3A4556;line-height:1.6;">You'll stop receiving Orion Soft newsletters.</p>
<button type="submit" style="background:#0A2540;color:#fff;border:none;border-radius:9px;padding:12px 22px;font-weight:700;font-size:15px;cursor:pointer;">Unsubscribe</button></form></body></html>`);
  }
  if (s.active) {
    s.active = false;
    s.unsubscribedAt = new Date().toISOString();
    s.unsubscribedVia = "link";
    await set(SUBS_KEY, subs);
  }
  return page(res, 200, "You're unsubscribed", `${email} won't receive Orion Soft newsletters any more.`);
}
