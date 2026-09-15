import { requireAuth } from "../_lib/auth.js";
import { listBanks } from "../_lib/paystackTransfer.js";

// The bank list barely ever changes — cache it in-process (this runs as a
// persistent Railway service, not a cold-starting function) so opening the
// pay panel doesn't hit Paystack every time.
let cache = null;
let cachedAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (!cache || Date.now() - cachedAt > CACHE_TTL) {
    try {
      cache = await listBanks();
      cachedAt = Date.now();
    } catch (err) {
      return res.status(502).json({ error: err.message || "Could not fetch bank list from Paystack" });
    }
  }

  return res.json({ ok: true, banks: cache });
}
