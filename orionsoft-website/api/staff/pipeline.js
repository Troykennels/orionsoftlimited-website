// Business development pipeline (role-gated: "pipeline"). Deal owners see
// their own deals, managers see their reporting line's, "pipeline.all" sees
// everything. Winning a deal auto-celebrates on the feed and notifies the
// owner's manager.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { officeContext, notify, award, logActivity, addAchievement, systemPost } from "../_lib/office.js";
import { managerChain, subordinates } from "../_lib/roles.js";

export const STAGES = [
  { id: "lead", label: "New lead", probability: 10 },
  { id: "contacted", label: "Contacted", probability: 20 },
  { id: "meeting", label: "Meeting held", probability: 35 },
  { id: "demo", label: "Demo done", probability: 50 },
  { id: "proposal", label: "Proposal sent", probability: 65 },
  { id: "negotiation", label: "Negotiation", probability: 80 },
  { id: "won", label: "Won", probability: 100 },
  { id: "lost", label: "Lost", probability: 0 },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog } = ctx;
  const subs = new Set(subordinates(me, employees, catalog).map(e => e.id));
  const all = ctx.can("pipeline.all");
  if (!ctx.can("pipeline") && !all && !ctx.can("team.view")) return res.status(403).json({ error: "The deal pipeline isn't part of your role" });
  const visible = d => all || d.ownerId === me.id || subs.has(d.ownerId);
  const editable = d => d.ownerId === me.id || all || subs.has(d.ownerId);

  if (req.method === "GET") {
    const deals = (await listRecords("deals")).filter(visible).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    const open = deals.filter(d => !["won", "lost"].includes(d.stage));
    const month = new Date().toISOString().slice(0, 7);
    return res.json({
      ok: true, deals, stages: STAGES,
      summary: {
        openCount: open.length,
        openValue: open.reduce((n, d) => n + (Number(d.value) || 0), 0),
        weighted: Math.round(open.reduce((n, d) => n + (Number(d.value) || 0) * (STAGES.find(s => s.id === d.stage)?.probability || 0) / 100, 0)),
        wonThisMonth: deals.filter(d => d.stage === "won" && (d.wonAt || "").startsWith(month)).reduce((n, d) => n + (Number(d.value) || 0), 0),
        winRate: (() => { const closed = deals.filter(d => ["won", "lost"].includes(d.stage)); return closed.length ? Math.round(closed.filter(d => d.stage === "won").length / closed.length * 100) : 0; })(),
      },
    });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    if (b.action === "note") {
      const d = await getRecord("deals", b.id);
      if (!d || !visible(d)) return res.status(404).json({ error: "Deal not found" });
      d.timeline = [{ at: new Date().toISOString(), by: me.id, text: String(b.text || "").slice(0, 1000), kind: b.kind || "note" }, ...(d.timeline || [])].slice(0, 100);
      d.updatedAt = new Date().toISOString();
      await putRecord("deals", d.id, d);
      return res.json({ ok: true, deal: d });
    }
    if (!ctx.can("pipeline") && !all) return res.status(403).json({ error: "Your role can't add deals" });
    if (!String(b.organisation || "").trim()) return res.status(400).json({ error: "Organisation is required" });
    const id = newId("deal");
    const deal = {
      id, ownerId: me.id, organisation: String(b.organisation).slice(0, 140), contactPerson: String(b.contactPerson || "").slice(0, 100),
      contactPhone: String(b.contactPhone || "").slice(0, 40), contactEmail: String(b.contactEmail || "").slice(0, 120),
      product: String(b.product || "").slice(0, 60), value: Number(b.value) || 0, currency: "NGN",
      stage: STAGES.some(s => s.id === b.stage) ? b.stage : "lead", source: String(b.source || "").slice(0, 60),
      nextFollowUp: b.nextFollowUp || "", nextAction: String(b.nextAction || "").slice(0, 200),
      timeline: [{ at: new Date().toISOString(), by: me.id, text: "Deal created", kind: "system" }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await putRecord("deals", id, deal);
    await logActivity(me.id, "pipeline", `Added a new opportunity: ${deal.organisation}`);
    return res.json({ ok: true, deal });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const d = await getRecord("deals", b.id);
    if (!d || !editable(d)) return res.status(404).json({ error: "Deal not found" });
    for (const k of ["organisation", "contactPerson", "contactPhone", "contactEmail", "product", "source", "nextFollowUp", "nextAction", "lostReason"]) {
      if (b[k] !== undefined) d[k] = String(b[k]).slice(0, 200);
    }
    if (b.value !== undefined) d.value = Number(b.value) || 0;
    if (b.stage && b.stage !== d.stage && STAGES.some(s => s.id === b.stage)) {
      const from = STAGES.find(s => s.id === d.stage)?.label, to = STAGES.find(s => s.id === b.stage).label;
      d.timeline = [{ at: new Date().toISOString(), by: me.id, text: `Stage: ${from} → ${to}`, kind: "stage" }, ...(d.timeline || [])];
      d.stage = b.stage;
      if (b.stage === "won") {
        d.wonAt = new Date().toISOString();
        const owner = employees.find(e => e.id === d.ownerId) || me;
        await award(owner.id, "deal_won");
        await addAchievement(owner.id, `Closed a deal with ${d.organisation}`, "deal");
        await logActivity(owner.id, "deal", `Won ${d.organisation}${d.value ? ` (₦${Number(d.value).toLocaleString()})` : ""}`);
        const post = await systemPost({ type: "win", authorId: owner.id, text: `🎉 Deal closed! @${owner.slug} just won ${d.organisation}${d.product ? ` for ${d.product}` : ""}. Congratulations!`, meta: { kind: "deal_won", dealId: d.id } });
        const mgr = managerChain(owner, employees, catalog)[0];
        await notify([mgr?.id].filter(Boolean), { type: "pipeline", title: `🎉 ${owner.fullName} won ${d.organisation}`, body: d.value ? `₦${Number(d.value).toLocaleString()}` : "", link: `feed:${post.id}` });
      }
    }
    d.updatedAt = new Date().toISOString();
    await putRecord("deals", d.id, d);
    return res.json({ ok: true, deal: d });
  }

  if (req.method === "DELETE") {
    const d = await getRecord("deals", req.query.id);
    if (!d || d.ownerId !== me.id) return res.status(403).json({ error: "You can only delete your own deals" });
    await deleteRecord("deals", d.id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
