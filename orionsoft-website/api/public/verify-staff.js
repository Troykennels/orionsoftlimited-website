// Public: scan a staff ID card's QR code → is this a current Orion Soft staff
// member? No login. Unknown or replaced codes return 404.
import { verifyCard } from "../_lib/idcard.js";
import { requestMeta } from "../_lib/fieldIntel.js";

const hits = new Map();
function limited(ip) {
  const now = Date.now(), e = hits.get(ip) || { n: 0, t: now };
  if (now - e.t > 600000) { hits.set(ip, { n: 1, t: now }); return false; }
  e.n++; hits.set(ip, e);
  return e.n > 60;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (limited(requestMeta(req).ip)) return res.status(429).json({ error: "Too many checks. Try again in a few minutes." });
  const result = await verifyCard(req.query.code);
  if (!result) return res.status(404).json({ ok: false, error: "This is not a valid Orion Soft staff card, or it has been replaced." });
  return res.json({ ok: true, ...result });
}
