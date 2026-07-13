// Lightweight page view + event tracker — no auth required
// Writes to Upstash: total counter, per-page hash, daily hash, referrer hash
import { incr, hincr, available } from "./store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  if (!available()) return res.status(200).json({ ok: true });

  const { page = "/", referrer = "", event = "pageview" } = req.body || {};

  const writes = [incr("orionsoft:visits:total")];

  if (event === "pageview") {
    // Per-page counter (strip non-alphanumeric for key safety)
    const safe = page.replace(/[^a-zA-Z0-9/_-]/g, "_").slice(0, 100) || "home";
    writes.push(hincr("orionsoft:visits:pages", safe));

    // Daily counter key: YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    writes.push(hincr("orionsoft:visits:daily", today));

    // Referrer domain tracking
    let source = "direct";
    if (referrer) {
      try {
        const u = new URL(referrer);
        source = u.hostname.replace(/^www\./, "") || "direct";
      } catch { source = "direct"; }
    }
    writes.push(hincr("orionsoft:visits:referrers", source));
  }

  await Promise.all(writes);
  return res.status(200).json({ ok: true });
}
