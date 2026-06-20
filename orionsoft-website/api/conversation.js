// Save a completed chatbot conversation server-side
import { push } from "./store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body || {};
  if (!body.id) return res.status(400).json({ error: "Conversation ID required" });

  const conv = {
    id: body.id,
    startedAt: body.startedAt || new Date().toISOString(),
    savedAt: new Date().toISOString(),
    status: body.status || "completed",
    escalated: body.escalated || false,
    lead: body.lead || null,
    messages: (body.messages || []).slice(-30), // keep last 30 msgs
    source: "chatbot",
  };

  await push("orionsoft:conversations", conv);

  return res.json({ ok: true });
}
