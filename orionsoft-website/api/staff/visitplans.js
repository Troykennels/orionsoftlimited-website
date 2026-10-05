// Visit plans: GET ?date=&employeeId= (yours, or someone in your reporting
// line); PUT { date, employeeId?, stops } saves the plan for that day.
import { getRecord, putRecord, listRecords } from "../_lib/records.js";
import { officeContext, notify } from "../_lib/office.js";
import { subordinates, fieldWatchers } from "../_lib/roles.js";
import { lagosDate, toLagos } from "../_lib/automations.js";
import { planId, cleanStops, comparePlan } from "../_lib/visitPlans.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog } = ctx;
  const companyWide = ctx.can("org.approve") || ctx.can("hr.records");
  const team = new Set(subordinates(me, employees, catalog).map(e => e.id));
  const canSee = id => id === me.id || companyWide || team.has(id);
  const today = lagosDate();
  const q = { ...(req.query || {}), ...(req.body || {}) };
  const date = DATE.test(q.date || "") ? q.date : today;
  const employeeId = q.employeeId || me.id;
  if (!canSee(employeeId)) return res.status(403).json({ error: "You can only plan for yourself or people who report to you" });
  const target = employees.find(e => e.id === employeeId);
  if (!target) return res.status(404).json({ error: "Employee not found" });

  if (req.method === "GET") {
    const plan = await getRecord("visitplans", planId(employeeId, date));
    const visits = (await listRecords("visits")).filter(v => v.employeeId === employeeId && toLagos(v.checkIn.at).slice(0, 10) === date);
    return res.json({ ok: true, date, employeeId, plan: plan || null, compare: comparePlan(plan, visits, { dayOver: date < today }) });
  }

  if (req.method === "PUT") {
    if (date < today) return res.status(400).json({ error: "Past days can't be re-planned" });
    const id = planId(employeeId, date);
    const prev = await getRecord("visitplans", id);
    const plan = { id, employeeId, date, stops: cleanStops(q.stops), createdBy: prev?.createdBy || me.id, updatedBy: me.id, updatedAt: new Date().toISOString(), createdAt: prev?.createdAt || new Date().toISOString() };
    await putRecord("visitplans", id, plan);
    if (employeeId !== me.id) {
      await notify([employeeId], { type: "task", title: `${me.fullName} planned your client visits for ${date === today ? "today" : date}`, body: plan.stops.map(s => s.organisation).join(", "), link: "visits", actorId: me.id });
    } else if (!prev) {
      await notify(fieldWatchers(me, employees, catalog), { type: "field", title: `${me.fullName} planned ${plan.stops.length} client visit${plan.stops.length === 1 ? "" : "s"} for ${date === today ? "today" : date}`, body: plan.stops.map(s => s.organisation).join(", "), link: "team:field", actorId: me.id });
    }
    return res.json({ ok: true, plan });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
