// Client portal sign-in, by email link (no password to remember):
//   POST { email }                    → emails a sign-in link if we know them
//   POST { action: "verify", token }  → swaps the link's token for a session
//   POST { action: "logout" }
// The answer to the first step is always the same, so the form can't be used
// to find out who our clients are.
import { listRecords } from "../_lib/records.js";
import { signSession, verifySession, setSessionCookie, clearSessionCookie } from "../_lib/auth.js";
import { sendEmail, brandedShell } from "../_lib/mailer.js";
import { claim } from "../store.js";
import { siteUrl } from "../_lib/contracts.js";

export const CLIENT_COOKIE = "orionsoft_client";
const LINK_TTL = 30 * 60;               // the emailed link: 30 minutes
const SESSION_TTL = 30 * 24 * 60 * 60;  // then signed in for 30 days

export async function knownClient(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  const [contracts, invoices] = await Promise.all([listRecords("contracts"), listRecords("invoices")]);
  const c = contracts.find(x => String(x.client?.email || x.recipientEmail || "").toLowerCase() === e && x.status !== "draft");
  const i = invoices.find(x => String(x.clientEmail || "").toLowerCase() === e && x.status !== "draft");
  if (!c && !i) return null;
  return { email: e, name: c?.client?.name || i?.clientName || "", organisation: c?.client?.organisation || "" };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};

  if (b.action === "logout") { clearSessionCookie(res, CLIENT_COOKIE); return res.json({ ok: true }); }

  if (b.action === "verify") {
    const p = verifySession(String(b.token || ""));
    if (!p || p.role !== "client-link") return res.status(401).json({ error: "This sign-in link has expired. Ask for a new one." });
    const who = await knownClient(p.email);
    if (!who) return res.status(401).json({ error: "We couldn't find your account." });
    setSessionCookie(res, signSession({ role: "client", email: who.email, name: who.name }, SESSION_TTL), CLIENT_COOKIE, SESSION_TTL);
    return res.json({ ok: true, client: who });
  }

  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Enter the email address we use for you." });
  const generic = { ok: true, message: "If that email is on our records, a sign-in link is on its way. It works for 30 minutes." };
  // At most one link per email per minute.
  if (!(await claim(`orionsoft:client:link:${email}`, 60))) return res.json(generic);
  const who = await knownClient(email);
  if (who) {
    const link = `${siteUrl()}/client?token=${encodeURIComponent(signSession({ role: "client-link", email }, LINK_TTL))}`;
    await sendEmail(email, "Your Orion Soft client portal link", brandedShell(`
      <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Sign in to your client portal</h2>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Hello${who.name ? ` ${who.name.split(" ")[0]}` : ""}, tap the button to see your payment plans, contracts, invoices and receipts, and to contact our support team.</p>
      <p style="margin:18px 0;"><a href="${link}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Open my client portal</a></p>
      <p style="color:#6B7A96;font-size:12.5px;line-height:1.6;">The link works for 30 minutes. If you didn't ask for it, you can ignore this email.</p>`, { title: "Client portal" }), { kind: "client_portal_link" });
  }
  return res.json(generic);
}
