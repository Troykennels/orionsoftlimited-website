// Website content managed from the admin dashboard (careers, blog,
// announcements, products, services, case studies, testimonials, FAQs,
// homepage, menus, SEO, settings…). Stored on the server so every visitor
// sees what the admin publishes. The keys match the browser-storage keys the
// website and admin already use.
import { get, set, mget } from "../store.js";

export const CONTENT_KEYS = [
  "orionsoft_settings_v1",
  "orionsoft_homepage_v1",
  "orionsoft_testimonials_v1",
  "orionsoft_faqs_v1",
  "orionsoft_blog_v1",
  "orionsoft_careers_v1",
  "orionsoft_clients_v1",
  "orionsoft_menus_v1",
  "orionsoft_team_v1",
  "orionsoft_seo_v1",
  "orionsoft_announce_v1",
  "orionsoft_features_v1",
  "orionsoft_products_v1",
  "orionsoft_portfolio_v1",
  "orionsoft_services_v1",
  "orionsoft_theme_v1",
];

// Upstash accepts values up to 1MB per request; leave headroom.
export const MAX_CONTENT_BYTES = 900 * 1024;

const storeKey = k => `orionsoft:content:${k}`;
const META_KEY = "orionsoft:content:_meta";

export async function readAllContent() {
  const vals = await mget(CONTENT_KEYS.map(storeKey));
  const out = {};
  CONTENT_KEYS.forEach((k, i) => { if (vals[i] != null) out[k] = vals[i]; });
  return out;
}

export async function writeContent(key, value) {
  await set(storeKey(key), value);
  const meta = (await get(META_KEY)) || {};
  meta[key] = new Date().toISOString();
  await set(META_KEY, meta);
  return meta[key];
}

export async function contentMeta() {
  return (await get(META_KEY)) || {};
}

// What visitors may see: drafts, closed jobs and unpublished items are
// removed, so they never leave the server.
const isHidden = item => item && typeof item === "object" && (item.published === false || item.status === "draft");
export function publicView(content) {
  const out = {};
  for (const [k, v] of Object.entries(content)) out[k] = Array.isArray(v) ? v.filter(x => !isHidden(x)) : v;
  return out;
}
