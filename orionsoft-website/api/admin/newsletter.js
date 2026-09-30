// Admin → Newsletter: subscribers, automatic-email settings, and sending.
// Sending queues the newsletter; it goes out in batches (see _lib/newsletter.js).
import { get, set } from "../store.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { sendEmail } from "../_lib/mailer.js";
import {
  SUBS_KEY, OUTBOX_KEY, SETTINGS_KEY, loadSubscribers, addSubscriber, newsletterSettings,
  enqueueNewsletter, processOutbox, newsletterEmail,
} from "../_lib/newsletter.js";

const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const campaignView = c => ({
  id: c.id, subject: c.subject, kind: c.kind, by: c.by, createdAt: c.createdAt, finishedAt: c.finishedAt, done: c.done,
  recipients: c.recipients.length, sent: c.sent.length, failed: c.failed.length, skipped: c.skipped.length,
});

export default async function handler(req, res) {
  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const [subs, outbox, settings] = await Promise.all([loadSubscribers(), get(OUTBOX_KEY), newsletterSettings()]);
    return res.json({
      ok: true, settings,
      subscribers: Object.values(subs).filter(s => !s.removed).map(({ token, ...s }) => s)
        .sort((a, b) => String(b.subscribedAt).localeCompare(String(a.subscribedAt))),
      campaigns: (outbox || []).map(campaignView),
    });
  }

  const b = req.body || {};

  if (req.method === "POST" && b.action === "settings") {
    const next = { ...(await newsletterSettings()), ...(b.autoBlog !== undefined ? { autoBlog: !!b.autoBlog } : {}), ...(b.welcome !== undefined ? { welcome: !!b.welcome } : {}) };
    await set(SETTINGS_KEY, next);
    await logAudit(session, "newsletter_settings", "newsletter", `auto blog ${next.autoBlog ? "on" : "off"}, welcome ${next.welcome ? "on" : "off"}`);
    return res.json({ ok: true, settings: next });
  }

  if (req.method === "POST" && b.action === "add") {
    const email = String(b.email || "").trim().toLowerCase();
    if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address" });
    const r = await addSubscriber(email, { name: b.name, source: "admin" });
    if (!r.isNew) return res.status(409).json({ error: "Already subscribed" });
    await logAudit(session, "add_subscriber", "newsletter", email);
    return res.json({ ok: true });
  }

  if (req.method === "PATCH" || req.method === "DELETE") {
    const subs = await loadSubscribers();
    const email = String(req.method === "DELETE" ? req.query.email : b.email || "").toLowerCase();
    const s = subs[email];
    if (!s) return res.status(404).json({ error: "Subscriber not found" });
    const on = req.method === "PATCH" && !!b.active;
    // Removed people are kept as unsubscribed, so a later website sync can't
    // quietly add them back.
    Object.assign(s, { active: on, removed: req.method === "DELETE", unsubscribedAt: on ? null : new Date().toISOString() });
    await set(SUBS_KEY, subs);
    await logAudit(session, req.method === "DELETE" ? "delete_subscriber" : on ? "resubscribe" : "unsubscribe", "newsletter", email);
    return res.json({ ok: true });
  }

  if (req.method === "POST" && (b.action === "test" || b.action === "send")) {
    const subject = String(b.subject || "").trim().slice(0, 150);
    const body = String(b.body || "").trim().slice(0, 20000);
    if (!subject || !body) return res.status(400).json({ error: "Write a subject and the newsletter text" });
    const link = /^https:\/\//.test(String(b.link || "")) ? b.link : "";

    if (b.action === "test") {
      const to = validEmail(String(b.to || "")) ? b.to : session.email;
      const ok = await sendEmail(to, `[TEST] ${subject}`, newsletterEmail({ subject, body, link, linkText: b.linkText || "" }, null), { kind: "newsletter_test" });
      return ok ? res.json({ ok: true, sentTo: to }) : res.status(502).json({ error: "The test email couldn't be sent. Check the email settings (Gmail / Resend)." });
    }

    const campaign = await enqueueNewsletter({ subject, body, link, linkText: String(b.linkText || "").slice(0, 60), kind: "manual", by: session.name || "Admin" });
    if (!campaign.recipients.length) return res.status(400).json({ error: "There are no active subscribers yet" });
    await logAudit(session, "send_newsletter", "newsletter", `${subject} · ${campaign.recipients.length} recipient(s)`);
    // Start straight away; the rest goes out on the automatic 5-minute runs.
    processOutbox().catch(err => console.error("[newsletter]", err.message));
    return res.json({ ok: true, campaign: campaignView(campaign) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
