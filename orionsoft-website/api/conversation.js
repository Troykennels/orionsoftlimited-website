// Save a completed chatbot conversation server-side
import { push, ltrim } from "./store.js";

const rateMap = new Map();
function limited(ip) {
  const now = Date.now(), e = rateMap.get(ip) || { n: 0, t: now };
  if (now - e.t > 15 * 60 * 1000) { rateMap.set(ip, { n: 1, t: now }); return false; }
  e.n++; rateMap.set(ip, e);
  return e.n > 30;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body || {};
  if (!body.id) return res.status(400).json({ error: "Conversation ID required" });
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "Too many requests" });

  // Unauthenticated, so everything is size-capped.
  const cut = (v, n) => String(v ?? "").slice(0, n);
  const lead = body.lead && typeof body.lead === "object"
    ? Object.fromEntries(Object.entries(body.lead).slice(0, 12).map(([k, v]) => [cut(k, 40), cut(v, 500)]))
    : null;
  const conv = {
    id: cut(body.id, 80),
    startedAt: cut(body.startedAt, 40) || new Date().toISOString(),
    savedAt: new Date().toISOString(),
    status: cut(body.status, 20) || "completed",
    escalated: !!body.escalated,
    lead,
    messages: (Array.isArray(body.messages) ? body.messages : []).slice(-30) // keep last 30 msgs
      .map(m => ({ role: m?.role === "user" ? "user" : "assistant", content: cut(m?.content, 2000), ...(m?.ts ? { ts: cut(m.ts, 40) } : {}) })),
    source: "chatbot",
  };

  await push("orionsoft:conversations", conv);
  await ltrim("orionsoft:conversations", 2000);

  return res.json({ ok: true });
}
