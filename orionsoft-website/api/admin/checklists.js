// Admin: onboarding / offboarding checklists for an employee.
import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { createChecklist, toggleItem, progress, OWNERS } from "../_lib/checklists.js";
import { newId } from "../_lib/records.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const [lists, employees] = await Promise.all([listRecords("checklists"), listRecords("employees")]);
    const name = id => employees.find(e => e.id === id)?.fullName || "Former staff";
    const out = lists.filter(c => !req.query.employeeId || c.employeeId === req.query.employeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(c => ({ ...c, employeeName: name(c.employeeId), progress: progress(c) }));
    return res.json({ ok: true, checklists: out, owners: OWNERS });
  }

  const b = req.body || {};
  if (req.method === "POST") {
    const emp = await getRecord("employees", b.employeeId);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    if (!["onboarding", "offboarding"].includes(b.kind)) return res.status(400).json({ error: "kind must be onboarding or offboarding" });
    const list = await createChecklist(emp, b.kind);
    await logAudit(session, "create_checklist", `employee ${emp.id}`, b.kind);
    return res.json({ ok: true, checklist: { ...list, progress: progress(list) } });
  }

  if (req.method === "PATCH") {
    const list = await getRecord("checklists", b.id);
    if (!list) return res.status(404).json({ error: "Checklist not found" });
    if (b.action === "toggle") {
      try { await toggleItem(list, b.itemId, b.done, session.name || "Admin"); } catch (e) { return res.status(400).json({ error: e.message }); }
    } else if (b.action === "add-item") {
      const text = String(b.text || "").trim().slice(0, 200);
      if (!text) return res.status(400).json({ error: "Write the item first" });
      list.items.push({ id: newId("chk"), owner: OWNERS[b.owner] ? b.owner : "hr", text, done: false, doneAt: null, doneBy: null });
      list.status = "open";
      await putRecord("checklists", list.id, list);
    } else if (b.action === "remove-item") {
      list.items = list.items.filter(i => i.id !== b.itemId);
      await putRecord("checklists", list.id, list);
    } else return res.status(400).json({ error: "Unknown action" });
    return res.json({ ok: true, checklist: { ...list, progress: progress(list) } });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
