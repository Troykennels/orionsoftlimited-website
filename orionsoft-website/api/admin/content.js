// Admin: read all website content (including drafts) and publish changes.
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { CONTENT_KEYS, MAX_CONTENT_BYTES, readAllContent, writeContent, contentMeta } from "../_lib/content.js";

const LABELS = {
  orionsoft_careers_v1: "careers", orionsoft_blog_v1: "blog", orionsoft_announce_v1: "announcements",
  orionsoft_products_v1: "products", orionsoft_services_v1: "services", orionsoft_portfolio_v1: "case studies",
  orionsoft_testimonials_v1: "testimonials", orionsoft_faqs_v1: "FAQs", orionsoft_homepage_v1: "homepage",
  orionsoft_clients_v1: "clients", orionsoft_menus_v1: "navigation", orionsoft_team_v1: "team",
  orionsoft_seo_v1: "SEO", orionsoft_features_v1: "site features", orionsoft_settings_v1: "site settings",
  orionsoft_theme_v1: "theme & colours",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const [content, meta] = await Promise.all([readAllContent(), contentMeta()]);
    return res.json({ ok: true, content, meta, keys: CONTENT_KEYS });
  }

  if (req.method === "PUT") {
    const { key, value } = req.body || {};
    if (!CONTENT_KEYS.includes(key)) return res.status(400).json({ error: "Unknown content section" });
    if (value === undefined) return res.status(400).json({ error: "Nothing to save" });
    const bytes = Buffer.byteLength(JSON.stringify(value));
    if (bytes > MAX_CONTENT_BYTES) {
      return res.status(413).json({ error: `Too large to publish (${Math.round(bytes / 1024)} KB, limit ${Math.round(MAX_CONTENT_BYTES / 1024)} KB). Use smaller images or image links instead of uploads.` });
    }
    const at = await writeContent(key, value);
    await logAudit(session, "publish_content", LABELS[key] || key, Array.isArray(value) ? `${value.length} item(s)` : "");
    return res.json({ ok: true, key, publishedAt: at });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
