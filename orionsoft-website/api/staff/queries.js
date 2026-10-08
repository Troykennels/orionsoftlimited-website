// Staff queries in the Staff Office. Everyone sees queries issued to them and
// answers them here; managers see and issue queries for people below them in
// their reporting line, HR / executives for everyone. See _lib/queries.js.
import { getRecord, listRecords } from "../_lib/records.js";
import { officeContext } from "../_lib/office.js";
import { roleOf } from "../_lib/roles.js";
import { CATEGORIES, OUTCOMES, canQuery, canManage, companyWide, createQuery, respondToQuery, closeQuery, withdrawQuery } from "../_lib/queries.js";

const newestFirst = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, active, catalog } = ctx;
  const audit = { name: me.fullName, sub: me.id };
  const fail = (e) => res.status(e.status || 500).json({ error: e.message || "Something went wrong" });

  if (req.method === "GET") {
    const all = (await listRecords("queries")).sort(newestFirst);
    const mine = all.filter(q => q.employeeId === me.id);
    const team = all.filter(q => q.employeeId !== me.id && canManage(me, q, employees, catalog));
    const canQueryIds = active.filter(e => canQuery(me, e, employees, catalog)).map(e => e.id);
    return res.json({ ok: true, mine, team, canQueryIds, companyWide: companyWide(me, catalog), categories: CATEGORIES, outcomes: OUTCOMES });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = req.body || {};

  try {
    if (body.action === "issue") {
      const employee = active.find(e => e.id === body.employeeId);
      if (!employee) return res.status(404).json({ error: "Staff member not found" });
      if (!canQuery(me, employee, employees, catalog)) return res.status(403).json({ error: "You can only query people in your reporting line" });
      const query = await createQuery({
        employee, employees, catalog, session: audit, body,
        issuedBy: { kind: "staff", id: me.id, name: me.fullName, title: me.title || roleOf(me, catalog).label },
      });
      return res.json({ ok: true, query });
    }

    const q = body.id ? await getRecord("queries", body.id) : null;
    if (!q) return res.status(404).json({ error: "Query not found" });

    if (body.action === "respond") {
      if (q.employeeId !== me.id) return res.status(404).json({ error: "Query not found" });
      return res.json({ ok: true, query: await respondToQuery(q, body.text, me, employees, catalog, audit) });
    }
    if (!canManage(me, q, employees, catalog)) return res.status(403).json({ error: "You can't act on this query" });
    if (body.action === "close") return res.json({ ok: true, query: await closeQuery(q, body, me.fullName, audit) });
    if (body.action === "withdraw") return res.json({ ok: true, query: await withdrawQuery(q, body.reason, me.fullName, audit) });
    return res.status(400).json({ error: "Unknown action" });
  } catch (e) { return fail(e); }
}
