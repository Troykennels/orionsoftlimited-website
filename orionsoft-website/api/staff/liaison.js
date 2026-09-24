// Stakeholder & partner liaison register (role-gated: "liaison"). Tracks
// relationships with government bodies, regulators, partners, associations
// and media: every engagement, its outcome, MoU status, and the next follow-up.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { officeContext, logActivity, notify } from "../_lib/office.js";
import { subordinates, managerChain } from "../_lib/roles.js";

const CATEGORIES = ["Government / Ministry", "Regulator", "Technology partner", "Channel / reseller partner", "Hospital / health body", "School / education body", "NGO / Development partner", "Professional association", "Media", "Investor", "Other"];
const RELATIONSHIP = ["new", "engaged", "strong", "at_risk", "dormant"];
const ENGAGEMENT_TYPES = ["meeting", "call", "email", "visit", "event", "letter", "mou", "other"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog } = ctx;
  if (!ctx.can("liaison") && !ctx.can("liaison.all")) return res.status(403).json({ error: "The liaison register isn't part of your role" });
  const subs = new Set(subordinates(me, employees, catalog).map(e => e.id));
  const visible = s => ctx.can("liaison.all") || s.ownerId === me.id || subs.has(s.ownerId);

  if (req.method === "GET") {
    const items = (await listRecords("liaisons")).filter(visible).sort((a, b) => (b.lastEngagement || "").localeCompare(a.lastEngagement || ""));
    return res.json({ ok: true, stakeholders: items, categories: CATEGORIES, relationship: RELATIONSHIP, engagementTypes: ENGAGEMENT_TYPES });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    if (b.action === "engagement") {
      const s = await getRecord("liaisons", b.id);
      if (!s || !visible(s)) return res.status(404).json({ error: "Stakeholder not found" });
      const eng = {
        id: newId("eng"), at: b.date || new Date().toISOString().slice(0, 10), type: ENGAGEMENT_TYPES.includes(b.type) ? b.type : "meeting",
        summary: String(b.summary || "").slice(0, 2000), outcome: String(b.outcome || "").slice(0, 600), by: me.id,
      };
      if (!eng.summary) return res.status(400).json({ error: "Summarise the engagement" });
      s.engagements = [eng, ...(s.engagements || [])].slice(0, 200);
      s.lastEngagement = eng.at;
      if (b.nextFollowUp !== undefined) s.nextFollowUp = b.nextFollowUp;
      if (b.nextAction !== undefined) s.nextAction = String(b.nextAction).slice(0, 200);
      if (RELATIONSHIP.includes(b.relationship)) s.relationship = b.relationship;
      s.updatedAt = new Date().toISOString();
      await putRecord("liaisons", s.id, s);
      await logActivity(me.id, "liaison", `Logged a ${eng.type} with ${s.organisation}`);
      if (s.relationship === "at_risk") {
        const mgr = managerChain(me, employees, catalog)[0];
        if (mgr) await notify([mgr.id], { type: "liaison", title: `Relationship at risk: ${s.organisation}`, body: eng.summary, link: `liaison:${s.id}`, actorId: me.id });
      }
      return res.json({ ok: true, stakeholder: s });
    }
    if (!String(b.organisation || "").trim()) return res.status(400).json({ error: "Organisation is required" });
    const id = newId("stk");
    const s = {
      id, ownerId: me.id, organisation: String(b.organisation).slice(0, 160), category: CATEGORIES.includes(b.category) ? b.category : "Other",
      contactPerson: String(b.contactPerson || "").slice(0, 100), contactRole: String(b.contactRole || "").slice(0, 100),
      phone: String(b.phone || "").slice(0, 40), email: String(b.email || "").slice(0, 120),
      relationship: RELATIONSHIP.includes(b.relationship) ? b.relationship : "new", mouStatus: ["none", "drafting", "signed"].includes(b.mouStatus) ? b.mouStatus : "none",
      interest: String(b.interest || "").slice(0, 600), nextFollowUp: b.nextFollowUp || "", nextAction: String(b.nextAction || "").slice(0, 200),
      engagements: [], lastEngagement: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await putRecord("liaisons", id, s);
    await logActivity(me.id, "liaison", `Added stakeholder ${s.organisation}`);
    return res.json({ ok: true, stakeholder: s });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const s = await getRecord("liaisons", b.id);
    if (!s || !visible(s)) return res.status(404).json({ error: "Stakeholder not found" });
    for (const k of ["organisation", "contactPerson", "contactRole", "phone", "email", "interest", "nextFollowUp", "nextAction"]) if (b[k] !== undefined) s[k] = String(b[k]).slice(0, 600);
    if (CATEGORIES.includes(b.category)) s.category = b.category;
    if (RELATIONSHIP.includes(b.relationship)) s.relationship = b.relationship;
    if (["none", "drafting", "signed"].includes(b.mouStatus)) s.mouStatus = b.mouStatus;
    s.updatedAt = new Date().toISOString();
    await putRecord("liaisons", s.id, s);
    return res.json({ ok: true, stakeholder: s });
  }

  if (req.method === "DELETE") {
    const s = await getRecord("liaisons", req.query.id);
    if (!s || (s.ownerId !== me.id && !ctx.can("liaison.all"))) return res.status(403).json({ error: "Not allowed" });
    await deleteRecord("liaisons", s.id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
