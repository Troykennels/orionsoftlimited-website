// /blog/<slug> for posts published after the site was last built. Built posts
// are static files (scripts/prerender-seo.mjs) and Vercel serves those first;
// anything else under /blog/ is rewritten here (vercel.json), so a brand-new
// post still gives Facebook, LinkedIn, X and WhatsApp its own title,
// description and image, at its real address with no redirects.
// The page is the site's own /blog page with the post's tags swapped in, so
// visitors get the normal app.
import { readAllContent, publicView } from "../_lib/content.js";
import { escapeHtml as esc } from "../_lib/office.js";

const BASE = (process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "").replace("://orionsoftlimited.com", "://www.orionsoftlimited.com");

let shell = { html: "", at: 0 };
async function blogShell() {
  if (shell.html && Date.now() - shell.at < 10 * 60000) return shell.html;
  const r = await fetch(`${BASE}/blog`, { signal: AbortSignal.timeout(8000) });
  const html = await r.text();
  if (r.ok && html.includes('<div id="root">')) shell = { html, at: Date.now() };
  return shell.html || html;
}

const tag = (html, re, replacement) => re.test(html) ? html.replace(re, replacement) : html.replace("</head>", `  ${replacement}\n  </head>`);

export function renderPost(base, post) {
  const slug = String(post.slug || post.id);
  const url = `${BASE}/blog/${encodeURIComponent(slug)}`;
  const title = /orion soft/i.test(post.title) ? post.title : `${post.title} | Orion Soft`;
  const plain = String(post.content || "").replace(/<[^>]+>/g, " ").replace(/[#*_>`-]+/g, " ").replace(/\s+/g, " ").trim();
  const desc = String(post.excerpt || plain).slice(0, 160);
  const cover = /^https:\/\//.test(post.coverImage || "") ? post.coverImage : /^\//.test(post.coverImage || "") ? `${BASE}${post.coverImage}` : "";
  // No cover picture: a branded image with the post's title (api/public/og.js).
  const image = cover || `${BASE}/api/public/og?blog=${encodeURIComponent(slug)}`;
  let html = base;
  html = tag(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = tag(html, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(desc)}" />`);
  html = tag(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`);
  html = tag(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`);
  html = tag(html, /<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="article" />`);
  html = tag(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}" />`);
  html = tag(html, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(desc)}" />`);
  html = tag(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  html = tag(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(desc)}" />`);
  html = tag(html, /<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(image)}" />`);
  html = tag(html, /<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${esc(image)}" />`);
  html = html.replace(/<meta (property="og:image:alt"|name="twitter:image:alt") content="[^"]*"\s*\/?>/g, (_, attr) => `<meta ${attr} content="${esc(title)}" />`);
  // The size tags describe a 1200×630 picture; a cover picture may differ.
  if (cover) html = html.replace(/\s*<meta property="og:image:(width|height)" content="[^"]*"\s*\/?>/g, "");
  // The readable text version (crawlers; hidden once the app starts).
  html = html.replace(/<main id="seo-fallback"([^>]*)>[\s\S]*?<\/main>/, (_, attrs) =>
    `<main id="seo-fallback"${attrs}><h1 style="color:#F2F6FF">${esc(post.title)}</h1><p>${esc(desc)}</p>${plain ? `<p>${esc(plain.slice(0, 2500))}</p>` : ""}<p><a href="/blog" style="color:#C8A850">More from the Orion Soft blog</a></p></main>`);
  return html;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  const want = String(req.query.slug || "");
  let base;
  try { base = await blogShell(); } catch { base = ""; }
  const posts = publicView(await readAllContent()).orionsoft_blog_v1 || [];
  const post = posts.find(p => p && p.title && p.published !== false && (p.slug === want || p.id === want));
  if (!base) { res.setHeader("Location", `${BASE}/blog`); return res.status(302).end(); }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  // Unknown post: the blog page itself (the app shows "not found").
  return res.status(post ? 200 : 404).send(post ? renderPost(base, post) : base);
}
