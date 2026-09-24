// Staff side of the shared task board (same "tasks" records the admin Tasks &
// Projects section manages). Staff see their own tasks; anyone with
// tasks.assign also sees and assigns work down their reporting line.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { officeContext, notify, award, logActivity } from "../_lib/office.js";
import { subordinates } from "../_lib/roles.js";

const STATUSES = ["todo", "in_progress", "review", "done"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog } = ctx;
  const team = new Set(ctx.can("tasks.assign") ? subordinates(me, employees, catalog).map(e => e.id) : []);
  const visible = t => t.assigneeId === me.id || t.createdByEmployee === me.id || team.has(t.assigneeId);

  if (req.method === "GET") {
    const tasks = (await listRecords("tasks")).filter(visible)
      .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    return res.json({ ok: true, tasks, team: [...team] });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    if (b.action === "comment") {
      const t = await getRecord("tasks", b.id);
      if (!t || !visible(t)) return res.status(404).json({ error: "Task not found" });
      const text = String(b.text || "").trim().slice(0, 1500);
      if (!text) return res.status(400).json({ error: "Comment can't be empty" });
      t.comments = [...(t.comments || []), { id: newId("tc"), authorId: me.id, text, at: new Date().toISOString() }];
      t.updatedAt = new Date().toISOString();
      await putRecord("tasks", t.id, t);
      await notify([t.assigneeId, t.createdByEmployee].filter(Boolean), { type: "task", title: `${me.fullName} commented on "${t.title}"`, body: text, link: `tasks:${t.id}`, actorId: me.id });
      return res.json({ ok: true, task: t });
    }
    if (!String(b.title || "").trim()) return res.status(400).json({ error: "A task title is required" });
    const assigneeId = b.assigneeId || me.id;
    if (assigneeId !== me.id && !team.has(assigneeId)) return res.status(403).json({ error: "You can only assign tasks to people who report to you" });
    const id = newId("task");
    const task = {
      id, title: String(b.title).slice(0, 160), description: String(b.description || "").slice(0, 3000), project: String(b.project || "").slice(0, 80),
      assigneeId, priority: PRIORITIES.includes(b.priority) ? b.priority : "medium", status: "todo", dueDate: b.dueDate || null,
      createdAt: new Date().toISOString(), createdBy: me.id, createdByEmployee: me.id, updatedAt: new Date().toISOString(), comments: [],
    };
    await putRecord("tasks", id, task);
    if (assigneeId !== me.id) await notify([assigneeId], { type: "task", title: `${me.fullName} assigned you a task`, body: task.title, link: `tasks:${id}`, actorId: me.id });
    return res.json({ ok: true, task });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const t = await getRecord("tasks", b.id);
    if (!t || !visible(t)) return res.status(404).json({ error: "Task not found" });
    const manager = t.createdByEmployee === me.id || team.has(t.assigneeId);
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) return res.status(400).json({ error: "Invalid status" });
      const wasDone = t.status === "done";
      t.status = b.status;
      if (b.status === "done" && !wasDone) {
        t.completedAt = new Date().toISOString();
        await award(t.assigneeId, "task_done");
        await logActivity(t.assigneeId, "task", `Completed task "${t.title}"`);
        const notifyId = t.createdByEmployee && t.createdByEmployee !== t.assigneeId ? t.createdByEmployee : null;
        if (notifyId) await notify([notifyId], { type: "task", title: `✅ ${me.fullName} completed "${t.title}"`, link: `tasks:${t.id}`, actorId: me.id });
      }
    }
    if (manager) {
      for (const k of ["title", "description", "project", "dueDate"]) if (b[k] !== undefined) t[k] = b[k];
      if (b.priority && PRIORITIES.includes(b.priority)) t.priority = b.priority;
      if (b.assigneeId && (b.assigneeId === me.id || team.has(b.assigneeId))) t.assigneeId = b.assigneeId;
    }
    t.updatedAt = new Date().toISOString();
    await putRecord("tasks", t.id, t);
    return res.json({ ok: true, task: t });
  }

  if (req.method === "DELETE") {
    const t = await getRecord("tasks", req.query.id);
    if (!t || t.createdByEmployee !== me.id) return res.status(403).json({ error: "You can only delete tasks you created" });
    await deleteRecord("tasks", t.id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
