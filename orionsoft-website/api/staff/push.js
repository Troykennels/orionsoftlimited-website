// Staff phone notifications: public key, subscribe/unsubscribe, and a test.
import { requireStaff } from "../_lib/auth.js";
import { getVapid, saveSubscription, removeSubscription, subscriptionCount, sendPush } from "../_lib/push.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const auth = await requireStaff(req, res);
  if (!auth) return;
  const me = auth.employee;

  if (req.method === "GET") {
    const { publicKey } = await getVapid();
    return res.json({ ok: true, publicKey, devices: await subscriptionCount(me.id) });
  }
  if (req.method === "POST") {
    const { subscription, action } = req.body || {};
    if (action === "test") {
      const sent = await sendPush(me.id, { title: "🔔 Notifications are working", body: "You'll get alerts for location checks, messages, meetings and approvals.", link: "home", type: "test" });
      return res.json({ ok: true, sent });
    }
    try { await saveSubscription(me.id, subscription, req.headers["user-agent"]); }
    catch (e) { return res.status(400).json({ error: e.message }); }
    return res.json({ ok: true, devices: await subscriptionCount(me.id) });
  }
  if (req.method === "DELETE") {
    await removeSubscription(me.id, String(req.body?.endpoint || req.query?.endpoint || ""));
    return res.json({ ok: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
