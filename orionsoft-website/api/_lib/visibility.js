// Getting found: tell search engines about new and changed pages (IndexNow:
// Bing, Yandex, Seznam, Naver and the AI assistants that use Bing), ask happy
// clients for a Google review, and turn each new blog post into a share kit
// so every staff member can post it.
import { get, set, claim } from "../store.js";
import { listRecords, putRecord, newId } from "./records.js";
import { notify } from "./office.js";

// The matching key file is public/<key>.txt, which proves we own the site.
export const INDEXNOW_KEY = "a6da13b55322b6a6d6913201910ce936";
const SITE = () => (process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "");
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

export async function indexNow(paths) {
  const site = SITE();
  const urlList = [...new Set(paths.map(p => (/^https?:/.test(p) ? p : `${site}${p}`)))].slice(0, 10000);
  if (!urlList.length || process.env.NODE_ENV === "test" || !process.env.UPSTASH_REDIS_REST_URL) return 0;
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(site).host, key: INDEXNOW_KEY, keyLocation: `${site}/${INDEXNOW_KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok && r.status !== 202) throw new Error(`IndexNow ${r.status}`);
  return urlList.length;
}

// After each new release, submit the whole site once (the pages and their
// titles may have changed). New blog posts are submitted as they appear.
export async function indexNowOnRelease() {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || "";
  if (!sha || (await get("orionsoft:indexnow:release")) === sha) return 0;
  const { sitemapUrls } = await import("../public/sitemap.js");
  const n = await indexNow((await sitemapUrls()).map(u => u.loc));
  await set("orionsoft:indexnow:release", sha);
  return n;
}

export async function reviewUrl() {
  if (process.env.GOOGLE_REVIEW_URL) return process.env.GOOGLE_REVIEW_URL;
  const s = (await get("orionsoft:content:orionsoft_settings_v1")) || {};
  const u = String(s.googleReviewUrl || "").trim();
  return /^https:\/\//.test(u) ? u : "";
}

// Three days after a client finishes paying for a contract or plan, ask them
// (once, ever) for a Google review. Needs the review link (Site Settings →
// Google review link, or GOOGLE_REVIEW_URL).
export async function reviewRequests(today) {
  const link = await reviewUrl();
  if (!link) return 0;
  const [contracts, payments] = await Promise.all([listRecords("contracts"), listRecords("payments")]);
  const { normaliseContract, paymentSummary } = await import("./contracts.js");
  const { sendEmail, brandedShell } = await import("./mailer.js");
  let sent = 0;
  for (const raw of contracts) {
    const c = normaliseContract(raw);
    const email = String(c.client?.email || "").trim().toLowerCase();
    if (!email || !(c.amount > 0) || c.status === "cancelled" || raw.reviewAsked) continue;
    const sum = paymentSummary(c, payments.filter(p => p.contractId === c.id));
    if (sum.balance > 0) continue;
    const last = sum.receipts.map(r => String(r.paidAt || "").slice(0, 10)).filter(Boolean).sort().pop();
    if (!last || (Date.parse(today) - Date.parse(last)) / 86400000 < 3) continue;
    raw.reviewAsked = today;
    await putRecord("contracts", raw.id, raw);
    if (!(await claim(`orionsoft:review:asked:${email}`, 60 * 60 * 24 * 365 * 5))) continue;
    await sendEmail(email, "How did we do? A quick favour from Orion Soft", brandedShell(`
      <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Thank you for working with us</h2>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${esc(c.client.name || "Sir/Madam")}, thank you for choosing Orion Soft Limited for ${esc(c.title)}. We'd be grateful if you could take one minute to share your experience on Google. It helps other organisations find us and helps us keep improving.</p>
      <p style="margin:18px 0;"><a href="${esc(link)}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Leave a Google review ★★★★★</a></p>
      <p style="color:#6B7A96;font-size:12.5px;line-height:1.6;">Something not right? Just reply to this email and we'll fix it.</p>`, { title: "How did we do?" }), { kind: "review_request" });
    sent++;
  }
  return sent;
}

// A new blog post becomes a share kit for all staff (caption, link with a
// rich preview, hashtags), so the whole team can post it in one tap.
export async function blogShareKits(posts) {
  if (!posts.length) return 0;
  const site = SITE();
  const active = (await listRecords("employees")).filter(e => e.status === "active");
  for (const p of posts) {
    const slug = encodeURIComponent(p.slug || p.id);
    const id = newId("kit");
    const tags = [...new Set(["OrionSoft", "Nigeria", "Tech", ...(Array.isArray(p.tags) ? p.tags : String(p.tags || p.category || "").split(","))]
      .map(t => String(t).replace(/[^A-Za-z0-9]/g, "")).filter(Boolean))].slice(0, 6).map(t => `#${t}`).join(" ");
    await putRecord("sharekits", id, {
      id, title: `Blog: ${String(p.title).slice(0, 110)}`,
      caption: `${p.title}\n\n${String(p.excerpt || "").slice(0, 400) || "New on the Orion Soft blog."}\n\nRead it here 👇`.slice(0, 2000),
      link: `${site}/api/public/share?blog=${slug}`, hashtags: tags, imageDataUrl: "", shares: {}, platformShares: {},
      createdBy: "Automatic (new blog post)", createdById: "system", createdAt: new Date().toISOString(), archived: false,
    });
    if (active.length) await notify(active.map(e => e.id), { type: "sharekit", title: "New blog post: please share it 📣", body: p.title, link: "social" });
  }
  try { await indexNow(posts.map(p => `/blog/${encodeURIComponent(p.slug || p.id)}`)); } catch (err) { console.error("[indexnow]", err.message); }
  return posts.length;
}
