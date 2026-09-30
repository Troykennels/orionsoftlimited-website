// Admin: website leads (contact forms, demos, quotes, chatbot…) with their
// follow-up status stored on the server, so every admin on every device sees
// the same status, and a deleted lead stays deleted. The submissions
// themselves live in the orionsoft:leads list; the status lives in a map
// keyed by lead id.
import { list, get, set } from "../store.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

const STATE_KEY = "orionsoft:leads:state";
const STATUSES = ["new", "contacted", "qualified", "converted", "closed", "lost", "spam"];

export async function leadsWithState() {
  const [leads, state] = await Promise.all([list("orionsoft:leads", 5000), get(STATE_KEY)]);
  const st = state || {};
  return leads
    .filter(l => l && !st[l.id]?.deleted)
    .map(l => ({ ...l, ...(st[l.id] ? { status: st[l.id].status || l.status, read: !!st[l.id].read, updatedAt: st[l.id].updatedAt } : {}) }));
}

export default async function handler(req, res) {
  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") return res.json({ ok: true, leads: await leadsWithState(), statuses: STATUSES });

  if (req.method === "PATCH") {
    const { id, status, read, deleted } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status" });
    const state = (await get(STATE_KEY)) || {};
    const cur = state[id] || {};
    state[id] = {
      ...cur,
      ...(status !== undefined ? { status, read: true } : {}),
      ...(read !== undefined ? { read: !!read } : {}),
      ...(deleted ? { deleted: true } : {}),
      updatedAt: new Date().toISOString(), by: session.name || "Admin",
    };
    await set(STATE_KEY, state);
    if (status !== undefined || deleted) await logAudit(session, deleted ? "delete_lead" : "update_lead", `lead ${id}`, deleted ? "deleted" : status);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
