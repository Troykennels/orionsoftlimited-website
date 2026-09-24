// Task & project board — Kanban-style work tracking assignable to employees.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { notify } from "../_lib/office.js";

const STATUSES = ["todo", "in_progress", "review", "done"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const tasks = await listRecords("tasks");
    return res.json({ ok: true, tasks: tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  }

  if (req.method === "POST") {
    const { title, description, project, assigneeId, priority, dueDate } = req.body || {};
    if (!title) return res.status(400).json({ error: "title is required" });
    const id = newId("task");
    const task = {
      id, title, description: description || "", project: project || "",
      assigneeId: assigneeId || null, priority: PRIORITIES.includes(priority) ? priority : "medium",
      status: "todo", dueDate: dueDate || null,
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };
    await putRecord("tasks", id, task);
    await logAudit(session, "create_task", `task ${id}`, title);
    if (task.assigneeId) await notify([task.assigneeId], { type: "task", title: "Management assigned you a task", body: title, link: `tasks:${id}` });
    return res.json({ ok: true, task });
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const task = await getRecord("tasks", id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (updates.status !== undefined && !STATUSES.includes(updates.status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const allowed = ["title", "description", "project", "assigneeId", "priority", "status", "dueDate"];
    if (updates.assigneeId && updates.assigneeId !== task.assigneeId) {
      await notify([updates.assigneeId], { type: "task", title: "Management assigned you a task", body: task.title, link: `tasks:${id}` });
    }
    for (const key of allowed) {
      if (updates[key] !== undefined) task[key] = updates[key];
    }
    task.updatedAt = new Date().toISOString();
    await putRecord("tasks", id, task);
    return res.json({ ok: true, task });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteRecord("tasks", id);
    await logAudit(session, "delete_task", `task ${id}`);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
