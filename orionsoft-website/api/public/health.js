// Uptime check for monitors (Better Stack, UptimeRobot…): 200 when the API
// can read and write its database, 503 otherwise. No private details.
import { set, get, available, storeError } from "../store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const started = Date.now();
  let db;
  try {
    const stamp = String(started);
    await set("orionsoft:health:ping", stamp);
    db = String(await get("orionsoft:health:ping")) === stamp;
  } catch { db = false; }
  const body = { ok: db, database: db ? "ok" : "down", persistent: available(), ...(db ? {} : { error: storeError()?.message || "" }), ms: Date.now() - started, at: new Date().toISOString() };
  return res.status(db ? 200 : 503).json(body);
}
