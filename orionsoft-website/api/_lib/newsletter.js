// Newsletter: subscribers, the send queue, and the automatic emails.
//
// Subscribers are everyone who signed up on the website (newsletter leads)
// plus people the admin added. Each has an unsubscribe token and every email
// carries an unsubscribe link (/api/public/unsubscribe).
//
// Nothing is sent in one big burst. Every newsletter goes into an outbox and
// processOutbox() (run by the automations every 5 minutes, and straight away
// after queuing) sends it in small batches under a daily cap, so Gmail's
// daily limit is never blown and a restart just carries on where it stopped.
// Every active subscriber gets every newsletter, even on a big list; it just
// takes more than one day.
//
// Automatic emails:
//  - a welcome email when someone subscribes on the website;
//  - each newly published blog post, emailed to all active subscribers
//    (switch off in Admin → Newsletter).
import { randomBytes } from "node:crypto";
import { list, get, set, del, claim, incr } from "../store.js";
import { sendEmail, brandedShell } from "./mailer.js";
import { escapeHtml } from "./office.js";
import { readAllContent, publicView } from "./content.js";

export const SUBS_KEY = "orionsoft:newsletter:subs";
export const OUTBOX_KEY = "orionsoft:newsletter:outbox";
export const SETTINGS_KEY = "orionsoft:newsletter:settings";
const SENT_POSTS_KEY = "orionsoft:newsletter:blog-sent";
const DAILY_LIMIT = Number(process.env.NEWSLETTER_DAILY_LIMIT) || 400;
const PER_RUN = 40;

const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const siteUrl = () => (process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "");
export const unsubscribeLink = s => `${siteUrl()}/api/public/unsubscribe?e=${encodeURIComponent(s.email)}&t=${s.token}`;
const newToken = () => randomBytes(12).toString("base64url");
const lagosDay = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);

export async function newsletterSettings() {
  return { autoBlog: true, welcome: true, ...((await get(SETTINGS_KEY)) || {}) };
}

// The subscriber map, with any new website signups folded in.
export async function loadSubscribers() {
  const [map, leads] = await Promise.all([get(SUBS_KEY), list("orionsoft:leads", 5000)]);
  const subs = map || {};
  let changed = !map;
  for (const l of leads) {
    if (l?.type !== "newsletter") continue;
    const email = String(l.email || "").trim().toLowerCase();
    if (!validEmail(email)) continue;
    const cur = subs[email];
    const at = l.submittedAt || new Date().toISOString();
    if (!cur) { subs[email] = { email, name: l.name || "", source: "website", subscribedAt: at, active: true, token: newToken() }; changed = true; }
    // Signed up again on the website after unsubscribing: active again.
    else if (!cur.active && cur.unsubscribedAt && at > cur.unsubscribedAt) { Object.assign(cur, { active: true, removed: false, unsubscribedAt: null, subscribedAt: at }); changed = true; }
  }
  if (changed) await set(SUBS_KEY, subs);
  return subs;
}

// Adds (or re-activates) one subscriber and returns their record.
export async function addSubscriber(email, { name = "", source = "website" } = {}) {
  email = String(email || "").trim().toLowerCase();
  if (!validEmail(email)) return null;
  const subs = await loadSubscribers();
  const cur = subs[email];
  const wasActive = !!cur?.active && !cur?.removed;
  subs[email] = { ...(cur || {}), email, name: String(name || cur?.name || "").slice(0, 100), source: cur?.source || source, subscribedAt: wasActive ? cur.subscribedAt : new Date().toISOString(), active: true, removed: false, unsubscribedAt: null, token: cur?.token || newToken() };
  await set(SUBS_KEY, subs);
  return { sub: subs[email], isNew: !wasActive };
}

// ─── Email body ──────────────────────────────────────────────────────────────
// Plain text with blank-line paragraphs → email HTML (escaped; https links clickable).
function bodyHtml(text) {
  return String(text).replace(/\r/g, "").split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p style="color:#3A4556;font-size:14.5px;line-height:1.75;margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, "<br>").replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0A2540;">$1</a>')}</p>`).join("");
}
export function newsletterEmail(c, sub) {
  const button = c.link ? `<p style="margin:18px 0 6px;"><a href="${escapeHtml(c.link)}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">${escapeHtml(c.linkText || "Read more")}</a></p>` : "";
  const cover = c.image ? `<img src="${escapeHtml(c.image)}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:10px;margin:0 0 18px;">` : "";
  return brandedShell(`${cover}${c.heading ? `<h2 style="color:#0A2540;font-size:20px;margin:0 0 14px;">${escapeHtml(c.heading)}</h2>` : ""}${bodyHtml(c.body)}${button}
    <p style="color:#8094A8;font-size:11.5px;line-height:1.6;margin:22px 0 0;border-top:1px solid #E5E9F0;padding-top:14px;">You're receiving this because you subscribed to Orion Soft updates. <a href="${sub ? unsubscribeLink(sub) : "#"}" style="color:#8094A8;">Unsubscribe</a></p>`, { title: escapeHtml(c.subject) });
}

// ─── Outbox ──────────────────────────────────────────────────────────────────
// Queues a newsletter for every subscriber active right now.
export async function enqueueNewsletter({ subject, body, heading = "", link = "", linkText = "", image = "", kind = "manual", by = "Admin" }) {
  const subs = await loadSubscribers();
  const recipients = Object.values(subs).filter(s => s.active && !s.removed).map(s => s.email);
  const campaign = {
    id: `nl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    subject: String(subject).slice(0, 150), body: String(body).slice(0, 20000), heading, link, linkText, image, kind, by,
    createdAt: new Date().toISOString(), recipients, sent: [], failed: [], skipped: [], done: recipients.length === 0, finishedAt: recipients.length ? null : new Date().toISOString(),
  };
  const outbox = (await get(OUTBOX_KEY)) || [];
  outbox.unshift(campaign);
  await set(OUTBOX_KEY, outbox.slice(0, 100));
  return campaign;
}

// Sends the next batch. Safe to call from anywhere: one run at a time.
export async function processOutbox() {
  if (!(await claim("orionsoft:lock:newsletter", 240))) return { busy: true };
  let sentThisRun = 0;
  try {
    const outbox = (await get(OUTBOX_KEY)) || [];
    const pending = outbox.filter(c => !c.done).reverse(); // oldest first
    if (!pending.length) return { sent: 0 };
    const subs = await loadSubscribers();
    const dayKey = `orionsoft:newsletter:count:${lagosDay()}`;
    const usedToday = Number(await get(dayKey)) || 0;
    let budget = Math.min(PER_RUN, DAILY_LIMIT - usedToday);
    for (const c of pending) {
      const handled = new Set([...c.sent, ...c.failed, ...c.skipped]);
      for (const email of c.recipients) {
        if (budget <= 0) break;
        if (handled.has(email)) continue;
        const s = subs[email];
        // Unsubscribed since it was queued: never email them.
        if (!s || !s.active || s.removed) { c.skipped.push(email); continue; }
        const ok = await sendEmail(email, c.subject, newsletterEmail(c, s), { kind: `newsletter_${c.kind}` });
        (ok ? c.sent : c.failed).push(email);
        budget--; sentThisRun++;
        await incr(dayKey);
      }
      if (c.sent.length + c.failed.length + c.skipped.length >= c.recipients.length) { c.done = true; c.finishedAt = new Date().toISOString(); }
      if (budget <= 0) break;
    }
    // Merge into the latest outbox (a campaign may have been queued meanwhile).
    const fresh = (await get(OUTBOX_KEY)) || [];
    const byId = new Map(pending.map(c => [c.id, c]));
    await set(OUTBOX_KEY, fresh.map(c => byId.get(c.id) || c));
    return { sent: sentThisRun };
  } finally {
    // Release early so the next scheduled run can continue.
    await del("orionsoft:lock:newsletter").catch(() => {});
  }
}

// ─── Automatic emails ────────────────────────────────────────────────────────
export async function sendWelcome(email, name = "") {
  const settings = await newsletterSettings();
  const res = await addSubscriber(email, { name, source: "website" });
  if (!res?.isNew || !settings.welcome) return false;
  return sendEmail(res.sub.email, "Welcome to Orion Soft updates", newsletterEmail({
    subject: "Welcome to Orion Soft updates", heading: `Thanks for subscribing${name ? `, ${String(name).split(" ")[0]}` : ""}!`,
    body: "You'll get our product news, practical insights and company updates by email, and every new article from our blog as soon as it's published.\n\nNo spam, and you can unsubscribe at any time with the link at the bottom of any email.",
    link: `${siteUrl()}/blog`, linkText: "Read the blog",
  }, res.sub), { kind: "newsletter_welcome" });
}

// Queues an email for each blog post published since the last check. The
// first run only records what's already published, so old posts are never
// sent out.
export async function queueNewBlogPosts() {
  const settings = await newsletterSettings();
  const posts = (publicView(await readAllContent()).orionsoft_blog_v1 || []).filter(p => p && p.title && (p.id || p.slug));
  const sent = await get(SENT_POSTS_KEY);
  const keyOf = p => String(p.id || p.slug);
  if (!Array.isArray(sent)) { await set(SENT_POSTS_KEY, posts.map(keyOf)); return 0; }
  const fresh = posts.filter(p => !sent.includes(keyOf(p)));
  if (!fresh.length) return 0;
  await set(SENT_POSTS_KEY, [...sent, ...fresh.map(keyOf)].slice(-1000));
  // Share kit for staff + tell search engines, whatever the newsletter setting.
  try { const { blogShareKits } = await import("./visibility.js"); await blogShareKits(fresh); }
  catch (err) { console.error("[blog-sharekit]", err.message); }
  if (!settings.autoBlog) return 0;
  for (const p of fresh) {
    const url = `${siteUrl()}/blog/${encodeURIComponent(p.slug || p.id)}`;
    const image = /^https:\/\//.test(p.coverImage || "") ? p.coverImage : /^\//.test(p.coverImage || "") ? `${siteUrl()}${p.coverImage}` : "";
    await enqueueNewsletter({
      subject: `New on the Orion Soft blog: ${p.title}`, heading: p.title, image,
      body: p.excerpt || String(p.content || "").replace(/[#*_[\]()]/g, "").slice(0, 400),
      link: url, linkText: "Read the full article", kind: "blog", by: "Automatic (blog)",
    });
  }
  return fresh.length;
}

export async function newsletterJobs() {
  await queueNewBlogPosts();
  await processOutbox();
}
