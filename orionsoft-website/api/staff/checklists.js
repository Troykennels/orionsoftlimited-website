// Staff: the onboarding / offboarding items that are yours to do. Employees
// see their own items, line managers the manager items for their reports, and
// HR (hr.records) the HR and IT items for everyone.
import { listRecords, getRecord } from "../_lib/records.js";
import { officeContext, notify } from "../_lib/office.js";
import { managerChain } from "../_lib/roles.js";
import { toggleItem, progress, OWNERS } from "../_lib/checklists.js";

function myItems(list, me, employees, catalog, isHr) {
  const target = employees.find(e => e.id === list.employeeId);
  if (!target) return [];
  const isManager = managerChain(target, employees, catalog)[0]?.id === me.id;
  return list.items.filter(i => (i.owner === "employee" && list.employeeId === me.id)
    || (i.owner === "manager" && isManager)
    || ((i.owner === "hr" || i.owner === "it") && isHr));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog } = ctx;
  const isHr = ctx.can("hr.records");

  if (req.method === "GET") {
    const lists = (await listRecords("checklists")).filter(c => c.status !== "done");
    const out = lists.map(c => {
      const mine = myItems(c, me, employees, catalog, isHr);
      return mine.length ? { id: c.id, kind: c.kind, employeeId: c.employeeId, employeeName: employees.find(e => e.id === c.employeeId)?.fullName || "", progress: progress(c), items: mine } : null;
    }).filter(Boolean);
    return res.json({ ok: true, checklists: out, owners: OWNERS });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const list = await getRecord("checklists", b.id);
    if (!list) return res.status(404).json({ error: "Checklist not found" });
    if (!myItems(list, me, employees, catalog, isHr).some(i => i.id === b.itemId)) return res.status(403).json({ error: "That item isn't yours to tick off" });
    await toggleItem(list, b.itemId, b.done, me.fullName);
    if (list.status === "done") {
      const owners = employees.filter(e => e.status === "active" && (e.staffRole === "owner" || e.staffRole === "hr_manager")).map(e => e.id);
      await notify(owners, { type: "system", title: `${list.kind === "onboarding" ? "Onboarding" : "Offboarding"} complete for ${employees.find(e => e.id === list.employeeId)?.fullName || "a colleague"} ✅`, link: "home", actorId: me.id });
    }
    return res.json({ ok: true, progress: progress(list) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
