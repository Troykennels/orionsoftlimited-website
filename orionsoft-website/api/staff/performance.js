// Performance scorecards in the Staff Office. Everyone sees their own (so
// the system is transparent and staff can improve); managers see their
// reporting line; HR / executives see the whole company.
import { listRecords } from "../_lib/records.js";
import { officeContext } from "../_lib/office.js";
import { getRoleCatalog, subordinates } from "../_lib/roles.js";
import { computeScorecards, loadPerformanceData, WEIGHTS } from "../_lib/performance.js";
import { lagosDate } from "../_lib/automations.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog } = ctx;
  const today = lagosDate();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || "") ? req.query.from : `${today.slice(0, 8)}01`;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || "") ? req.query.to : today;

  const companyWide = ctx.can("org.approve") || ctx.can("hr.records");
  const team = companyWide ? employees.filter(e => e.id !== me.id) : subordinates(me, employees, catalog);
  const wanted = new Set([me.id, ...(req.query.scope === "team" && (companyWide || ctx.can("team.view")) ? team.map(e => e.id) : [])]);

  const data = await loadPerformanceData(listRecords, getRoleCatalog);
  data.employees = data.employees.filter(e => wanted.has(e.id));
  const cards = computeScorecards(data, from, to, today);
  return res.json({ ok: true, from, to, weights: WEIGHTS, me: cards.find(c => c.employeeId === me.id) || null, team: cards.filter(c => c.employeeId !== me.id), companyWide });
}
