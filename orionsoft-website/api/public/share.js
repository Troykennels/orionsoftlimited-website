// Share landing page with Open Graph / Twitter meta tags. The site is a
// client-rendered SPA, so crawlers from LinkedIn, X, Facebook and WhatsApp
// would otherwise see a generic preview. Staff share links point here:
//   /api/public/share?person=<slug>[&post=<id>]
// Link-preview crawlers get the tags, with og:url pointing back at this same
// link (if it pointed at the app page, Facebook would follow it, read that
// page's generic tags, and then hang when posting). People are redirected
// straight to the real page.
// Blog posts are shared at their real /blog/<slug> address now, which has its
// own tags; old ?blog= links redirect there permanently.
import { listRecords, getRecord } from "../_lib/records.js";
import { escapeHtml } from "../_lib/office.js";
import { readAllContent, publicView } from "../_lib/content.js";

// The bare domain redirects to www; preview images and links behind a redirect
// are sometimes dropped by WhatsApp and LinkedIn, so always point at www.
const BASE = (process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "").replace("://orionsoftlimited.com", "://www.orionsoftlimited.com");

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  // Old blog share links: /api/public/share?blog=<slug or id> → the post itself.
  if (req.query.blog) {
    const want = String(req.query.blog);
    const posts = publicView(await readAllContent()).orionsoft_blog_v1 || [];
    const post = posts.find(p => p && (p.slug === want || p.id === want));
    res.setHeader("Location", post ? `${BASE}/blog/${encodeURIComponent(post.slug || post.id)}` : `${BASE}/blog`);
    return res.status(post ? 301 : 302).end();
  }
  const self = `${BASE}/api/public/share?${new URLSearchParams(Object.entries(req.query).filter(([k]) => k === "person" || k === "post").map(([k, v]) => [k, String(v)]))}`;
  const bot = isPreviewBot(req.headers["user-agent"]);
  const slug = String(req.query.person || "").toLowerCase();
  const employees = await listRecords("employees");
  const person = employees.find(e => e.slug === slug && e.publicProfile && e.status === "active");
  if (!person && req.query.post) {
    // A public company announcement shared by staff (no personal profile needed).
    const post = await getRecord("posts", String(req.query.post));
    if (post && post.visibility === "public") {
      const title = post.type === "announcement" ? "📣 News from Orion Soft Limited" : "Update from the Orion Soft team";
      const description = String(post.text || "").slice(0, 200);
      const target = post.link || `${BASE}/`;
      return sendPage(res, { title, description, target, image: `${BASE}/og-image.png`, self, bot });
    }
  }
  if (!person) { res.setHeader("Location", `${BASE}/people`); return res.status(302).end(); }

  let title = `${person.fullName} · ${person.title} at Orion Soft`;
  let description = person.headline || person.bio || `${person.fullName} works at Orion Soft Limited, building software for African organisations.`;
  let target = `${BASE}/people/${person.slug}`;
  if (req.query.post) {
    const post = await getRecord("posts", String(req.query.post));
    if (post && post.visibility === "public" && (post.authorId === person.id || post.kudosTo === person.id)) {
      const label = { win: "🏆 A win", progress: "📈 Progress update", kudos: "🙌 Kudos", announcement: "📣 Announcement" }[post.type] || "Update";
      title = `${label} from ${person.fullName} · Orion Soft`;
      description = post.text || description;
      target = `${target}?post=${encodeURIComponent(post.id)}`;
    }
  }
  return sendPage(res, { title, description, target, image: `${BASE}/og-image.png`, name: person.fullName, self, bot });
}

// Link-preview crawlers (they read tags and don't run scripts).
const BOTS = /facebookexternalhit|facebot|meta-externalagent|linkedinbot|twitterbot|whatsapp|telegrambot|slackbot|discordbot|skypeuripreview|pinterest|redditbot|embedly|iframely|applebot|googlebot|bingbot|vkshare|tumblr|bitlybot|quora link preview|outbrain|google-inspectiontool|bot\b|crawler|spider|preview/i;
const isPreviewBot = ua => BOTS.test(String(ua || ""));

function sendPage(res, { title, description, target, image, name = "Orion Soft", type = "profile", self, bot }) {
  // People go straight to the real page.
  if (!bot) { res.setHeader("Location", target); res.setHeader("Cache-Control", "no-store"); return res.status(302).end(); }
  const isDefault = image.endsWith("/og-image.png");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description.slice(0, 200))}">
<meta property="og:type" content="${escapeHtml(type)}"><meta property="og:site_name" content="Orion Soft Limited">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description.slice(0, 200))}">
<meta property="og:url" content="${escapeHtml(self)}"><meta property="og:image" content="${escapeHtml(image)}">${isDefault ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : ""}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description.slice(0, 200))}"><meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="canonical" href="${escapeHtml(self)}">
</head><body><a href="${escapeHtml(target)}">Continue to ${escapeHtml(name)}</a><script>location.replace(${JSON.stringify(target).replace(/</g, "\\u003c")})</script></body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // The same link answers crawlers and people differently: never share a cached copy.
  res.setHeader("Cache-Control", "private, max-age=300");
  res.setHeader("Vary", "User-Agent");
  return res.status(200).send(html);
}
