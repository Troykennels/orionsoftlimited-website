// Protected admin data endpoint — returns server-side leads, conversations, visitor stats
// Protected by a real signed session cookie (see api/_lib/auth.js) — no shared static secret.
import { list, getCount, hgetall, available } from "../store.js";
import { requireAuth } from "../_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  if (!requireAuth(req, res, "admin")) return;

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
