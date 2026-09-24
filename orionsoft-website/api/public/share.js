// Share landing page with Open Graph / Twitter meta tags. The site is a
// client-rendered SPA, so crawlers from LinkedIn, X, Facebook and WhatsApp
// would otherwise see a generic preview. Staff share links point here:
//   /api/public/share?person=<slug>[&post=<id>]
// Crawlers read the tags; humans are immediately redirected to the real page.
import { listRecords, getRecord } from "../_lib/records.js";
import { escapeHtml } from "../_lib/office.js";

const BASE = process.env.APP_BASE_URL || "https://orionsoftlimited.com";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
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
      return sendPage(res, { title, description, target, image: `${BASE}/og-image.png` });
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
  return sendPage(res, { title, description, target, image: `${BASE}/og-image.png`, name: person.fullName });
}

function sendPage(res, { title, description, target, image, name = "Orion Soft" }) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description.slice(0, 200))}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="Orion Soft Limited">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description.slice(0, 200))}">
<meta property="og:url" content="${escapeHtml(target)}"><meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description.slice(0, 200))}"><meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="canonical" href="${escapeHtml(target)}"><meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
</head><body><a href="${escapeHtml(target)}">Continue to ${escapeHtml(name)}</a></body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).send(html);
}
