// Protected admin data endpoint — returns server-side leads, conversations, visitor stats
// Protected by ADMIN_SECRET env var (set to same value as VITE_ADMIN_PASSWORD in Vercel)
import { list, getCount, hgetall, available } from "../store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  // Auth check
  const provided = req.headers["x-admin-key"] || req.query.key || "";
  const secret = process.env.ADMIN_SECRET || process.env.VITE_ADMIN_PASSWORD || "orionsoft2026";
  if (provided !== secret) return res.status(401).json({ error: "Unauthorized" });

  if (!available()) {
    return res.json({ ok: true, upstashMissing: true, leads: [], conversations: [], stats: { totalVisits: 0, pages: {} } });
  }

  const resource = req.query.resource || "all";

  try {
    const result = { ok: true };

    if (resource === "all" || resource === "leads") {
      result.leads = await list("orionsoft:leads");
    }
    if (resource === "all" || resource === "conversations") {
      result.conversations = await list("orionsoft:conversations");
    }
    if (resource === "all" || resource === "stats") {
      const totalVisits = await getCount("orionsoft:visits:total");
      const pages = await hgetall("orionsoft:visits:pages");
      result.stats = { totalVisits, pages };
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Store error", details: err.message });
  }
}
