// Admin: recurring billing (subscriptions) and an overview of proposals.
//   GET                                   → subscriptions + proposals
//   POST { ...fields }                    → new subscription
//   PATCH { id, ...fields }               → edit
//   PATCH { id, action: pause|resume|cancel|bill_now }
import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { createSubscription, cleanSubscription, billRenewal, INTERVALS } from "../_lib/subscriptions.js";
import { totals, effectiveStatus, quoteLink } from "../_lib/proposals.js";

export default async function handler(req, res) {
  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const [subs, proposals, employees] = await Promise.all([listRecords("subscriptions"), listRecords("proposals"), listRecords("employees")]);
    const name = id => employees.find(e => e.id === id)?.fullName || "";
    return res.json({
      ok: true, intervals: Object.keys(INTERVALS),
      subscriptions: subs.sort((a, b) => String(a.nextRenewal).localeCompare(String(b.nextRenewal))),
      proposals: proposals.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(p => ({
        id: p.id, number: p.number, title: p.title, client: p.client, status: effectiveStatus(p), total: totals(p).total, currency: p.currency || "NGN",
        owner: name(p.ownerId), sentAt: p.sentAt, viewedAt: p.viewedAt, acceptedBy: p.acceptedBy || null, contractNumber: p.contractNumber || "", link: p.code ? quoteLink(p) : "",
      })),
    });
  }

  if (req.method === "POST") {
    try {
      const s = await createSubscription({ ...req.body, startDate: req.body?.startDate });
      await logAudit(session, "create_subscription", `subscription ${s.id}`, `${s.client.organisation || s.client.name}: ${s.currency} ${s.amount}`);
      return res.json({ ok: true, subscription: s });
    } catch (e) { return res.status(400).json({ error: e.message }); }
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const s = await getRecord("subscriptions", b.id);
    if (!s) return res.status(404).json({ error: "Subscription not found" });
    if (b.action === "pause" || b.action === "resume" || b.action === "cancel") {
      s.status = b.action === "pause" ? "paused" : b.action === "resume" ? "active" : "cancelled";
      s.updatedAt = new Date().toISOString();
      await putRecord("subscriptions", s.id, s);
      await logAudit(session, `${b.action}_subscription`, `subscription ${s.id}`, s.title);
      return res.json({ ok: true, subscription: s });
    }
    if (b.action === "bill_now") {
      if (s.status !== "active") return res.status(400).json({ error: "Resume the subscription first" });
      if (s.lastBilled === s.nextRenewal) return res.status(400).json({ error: "This renewal has already been billed" });
      const plan = await billRenewal(s);
      await logAudit(session, "bill_subscription", `subscription ${s.id}`, plan.number);
      return res.json({ ok: true, subscription: await getRecord("subscriptions", s.id), planNumber: plan.number });
    }
    Object.assign(s, cleanSubscription(b, s), { updatedAt: new Date().toISOString() });
    if (!s.amount) return res.status(400).json({ error: "Add at least one item with an amount" });
    await putRecord("subscriptions", s.id, s);
    return res.json({ ok: true, subscription: s });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
