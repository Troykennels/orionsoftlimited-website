// /sitemap.xml (vercel.json rewrites it here): the fixed pages plus what the
// admin has published — blog posts, products added in the admin, public staff
// profiles — so new content is found by search engines without a redeploy.
// Products and pages switched off in the admin are left out.
import { readAllContent, publicView } from "../_lib/content.js";
import { listRecords } from "../_lib/records.js";
import { VIDEO_PAGES } from "../../shared/demoVideo.js";

// Always the www address: the bare domain redirects there, and Search Console
// ignores sitemap entries on a different host from the property.
const SITE = (process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "").replace("://orionsoftlimited.com", "://www.orionsoftlimited.com");
const BUILTIN_PRODUCTS = ["carecore", "schoolcore", "compliancecore", "inventorycore", "financecore", "hrcore", "staffcore", "orion-crm", "directors-portal", "license-manager", "churchcore", "fleetcore", "telehealth"];
const PAGES = [
  ["/", "weekly", 1.0], ["/products", "weekly", 0.9], ["/paye-calculator", "monthly", 0.9], ["/kenya-paye-calculator", "monthly", 0.9], ["/ghana-paye-calculator", "monthly", 0.9], ["/international", "monthly", 0.9], ["/developers", "monthly", 0.7], ["/demo", "monthly", 0.8], ["/staffcore-demo", "monthly", 0.8], ["/schoolcore-demo", "monthly", 0.8], ["/carecore-demo", "monthly", 0.8], ["/compliancecore-demo", "monthly", 0.8], ["/orion-crm-demo", "monthly", 0.7], ["/directors-portal-demo", "monthly", 0.7], ["/license-manager-demo", "monthly", 0.6], ["/press", "monthly", 0.5],
  ["/industries", "monthly", 0.8], ["/solutions", "monthly", 0.8], ["/services", "monthly", 0.8], ["/resources", "monthly", 0.6], ["/pricing", "monthly", 0.8],
  ["/about", "monthly", 0.7], ["/why", "monthly", 0.7], ["/process", "monthly", 0.6], ["/work", "monthly", 0.7],
  ["/case-studies", "monthly", 0.7], ["/clients", "monthly", 0.6], ["/testimonials", "monthly", 0.6], ["/success-stories", "monthly", 0.6],
  ["/security", "yearly", 0.6], ["/support", "monthly", 0.6], ["/partners", "monthly", 0.5], ["/tech", "monthly", 0.5],
  ["/team", "monthly", 0.6], ["/people", "weekly", 0.6], ["/careers", "weekly", 0.8], ["/blog", "weekly", 0.7], ["/events", "weekly", 0.5],
  ["/faq", "monthly", 0.6], ["/docs", "monthly", 0.5], ["/contact", "yearly", 0.8], ["/consultation", "yearly", 0.7],
  ["/privacy", "yearly", 0.3], ["/terms", "yearly", 0.3],
];
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const day = d => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? t.toISOString().slice(0, 10) : ""; };

// Every public URL (path, change frequency, priority, last modified). Also
// used to tell search engines about changes (IndexNow).
export async function sitemapUrls() {
  let content = {}, employees = [];
  try { [content, employees] = await Promise.all([readAllContent().then(publicView), listRecords("employees")]); } catch { /* fixed pages still go out */ }
  const flags = content.orionsoft_features_v1 || {};
  const products = Array.isArray(content.orionsoft_products_v1) && content.orionsoft_products_v1.length ? content.orionsoft_products_v1 : null;
  const urls = PAGES.filter(([p]) => !["blog", "team", "careers", "pricing", "resources"].some(k => p === `/${k}` && flags[k] === false))
    .map(([p, freq, pri]) => ({ loc: p, freq, pri }));
  for (const id of products ? products.filter(p => p?.id && p.published !== false).map(p => p.id) : BUILTIN_PRODUCTS) {
    urls.push({ loc: `/${encodeURIComponent(id)}`, freq: "monthly", pri: BUILTIN_PRODUCTS.includes(id) ? 0.8 : 0.7 });
  }
  if (flags.blog !== false) {
    for (const p of content.orionsoft_blog_v1 || []) {
      if (p?.title && (p.slug || p.id)) urls.push({ loc: `/blog/${encodeURIComponent(p.slug || p.id)}`, freq: "monthly", pri: 0.6, mod: day(p.updatedAt || p.date || p.createdAt) });
    }
  }
  for (const e of employees) {
    if (e.status === "active" && e.publicProfile && e.slug) urls.push({ loc: `/people/${encodeURIComponent(e.slug)}`, freq: "monthly", pri: 0.4 });
  }
  return [...new Map(urls.map(u => [u.loc, u])).values()];
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  const urls = await sitemapUrls();
  // Product tour pages also list their video, which is how Search Console
  // counts "discovered videos".
  // Playlist pages list each part as well.
  const entry = (v, title, description, seconds) => `<video:video><video:thumbnail_loc>${esc(SITE + v.thumbnail)}</video:thumbnail_loc><video:title>${esc(title)}</video:title><video:description>${esc(description)}</video:description><video:content_loc>${esc(SITE + v.src)}</video:content_loc><video:duration>${seconds}</video:duration><video:publication_date>${v.uploadDate}</video:publication_date><video:family_friendly>yes</video:family_friendly></video:video>`;
  const video = loc => {
    const v = VIDEO_PAGES[loc];
    if (!v) return "";
    const product = v.overview ? v.overview.label.replace(/ in 2 minutes$/i, "") : "";
    return entry(v, v.title, v.description, v.seconds) + (v.parts || []).map(p => {
      const [m, sec] = p.length.split(":").map(Number);
      return entry({ ...p, uploadDate: v.uploadDate }, `${product} Demo Part ${p.n}: ${p.title}`, `${p.about}. Part ${p.n} of ${v.parts.length} of the ${product} demo by Orion Soft Limited.`, m * 60 + sec);
    }).join("");
  };
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.map(u =>
    `  <url><loc>${esc(SITE + u.loc)}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ""}<changefreq>${u.freq}</changefreq><priority>${u.pri.toFixed(1)}</priority>${video(u.loc)}</url>`).join("\n")}\n</urlset>\n`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(xml);
}
