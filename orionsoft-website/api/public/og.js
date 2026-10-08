// /api/public/og?blog=<slug> or ?page=<name>: the branded share image for a
// blog post or one of the named pages below. Only real content gets an image
// (no free text), so nobody can make pictures that say anything under our name.
import { readAllContent, publicView } from "../_lib/content.js";
import { ogPng } from "../_lib/ogImage.js";

const PAGES = {
  "paye-calculator": { title: "Nigeria PAYE & Take-Home Pay Calculator 2026", label: "Free tool" },
  press: { title: "Orion Soft Limited: press and media kit", label: "Press" },
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  let opts = PAGES[String(req.query.page || "")] || null;
  if (!opts && req.query.blog) {
    const want = String(req.query.blog);
    const post = (publicView(await readAllContent()).orionsoft_blog_v1 || []).find(p => p && p.title && p.published !== false && (p.slug === want || p.id === want));
    if (post) opts = { title: post.title, label: post.category ? String(post.category).slice(0, 32) : "Blog" };
  }
  if (!opts) { res.setHeader("Location", "/og-image.png"); return res.status(302).end(); }
  try {
    const png = await ogPng(opts);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.status(200).send(png);
  } catch (err) {
    console.error("[og]", err.message);
    res.setHeader("Location", "/og-image.png");
    return res.status(302).end();
  }
}
