// Goals & progress (OKR-style). Staff track goals with measurable key results,
// post check-ins, and can publish progress to the office feed or publicly.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { officeContext, notify, award, logActivity, addAchievement, systemPost } from "../_lib/office.js";
import { managerChain, subordinates } from "../_lib/roles.js";

const CATEGORIES = ["Sales & revenue", "Project delivery", "Learning & growth", "Customer success", "Team", "Personal"];

function computeProgress(goal) {
  const krs = goal.keyResults || [];
  if (!krs.length) return Math.min(100, Math.max(0, Math.round(Number(goal.progress) || 0)));
  const pcts = krs.map(k => {
    const target = Number(k.target) || 0;
    if (target <= 0) return 0;
    return Math.min(100, Math.max(0, (Number(k.current) || 0) / target * 100));
  });
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

function cleanKrs(krs) {
  return (Array.isArray(krs) ? krs : []).filter(k => k && String(k.title || "").trim()).slice(0, 8).map(k => ({
    id: k.id || newId("kr"), title: String(k.title).slice(0, 140), target: Number(k.target) || 0,
    current: Number(k.current) || 0, unit: String(k.unit || "").slice(0, 20),
  }));
}

async function onCompleted(goal, owner, employees, catalog) {
  goal.status = "completed";
  goal.completedAt = new Date().toISOString();
  await award(owner.id, "goal_completed");
  await addAchievement(owner.id, `Completed goal: ${goal.title}`, "goal");
  await logActivity(owner.id, "goal", `Completed goal "${goal.title}"`);
  const post = await systemPost({ type: "win", authorId: owner.id, text: `🏆 Goal achieved: ${goal.title}`, meta: { kind: "goal_completed", goalId: goal.id } });
  const manager = managerChain(owner, employees, catalog)[0];
  if (manager) await notify([manager.id], { type: "goal", title: `${owner.fullName} completed a goal 🏆`, body: goal.title, link: `feed:${post.id}` });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog } = ctx;
  const mySubs = new Set(subordinates(me, employees, catalog).map(e => e.id));
  const canManage = g => g.ownerId === me.id || mySubs.has(g.ownerId);

  if (req.method === "GET") {
    const all = await listRecords("goals");
    let goals;
    if (req.query.scope === "team") goals = all.filter(g => mySubs.has(g.ownerId) && g.visibility !== "private");
    else if (req.query.owner) goals = all.filter(g => g.ownerId === req.query.owner && (g.visibility !== "private" || canManage(g)));
    else goals = all.filter(g => g.ownerId === me.id);
    goals.sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return res.json({ ok: true, goals, categories: CATEGORIES });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    if (b.action === "checkin") {
      const goal = await getRecord("goals", b.id);
      if (!goal) return res.status(404).json({ error: "Goal not found" });
      if (goal.ownerId !== me.id) return res.status(403).json({ error: "Only the goal owner can check in" });
      if (Array.isArray(b.keyResults)) {
        const updates = new Map(b.keyResults.map(k => [k.id, Number(k.current) || 0]));
        goal.keyResults = (goal.keyResults || []).map(k => updates.has(k.id) ? { ...k, current: updates.get(k.id) } : k);
      }
      if (!(goal.keyResults || []).length && b.progress !== undefined) goal.progress = Number(b.progress) || 0;
      const before = goal.progress || 0;
      goal.progress = computeProgress(goal);
      const note = String(b.note || "").slice(0, 600);
      goal.checkins = [{ id: newId("chk"), at: new Date().toISOString(), progress: goal.progress, note, confidence: b.confidence || "on_track" }, ...(goal.checkins || [])].slice(0, 60);
      goal.updatedAt = new Date().toISOString();
      await award(me.id, "goal_checkin");
      await logActivity(me.id, "progress", `"${goal.title}" moved to ${goal.progress}%`);
      let post = null;
      if (b.shareToFeed && goal.progress !== before) {
        post = await systemPost({ type: "progress", authorId: me.id, text: `📈 Progress update on "${goal.title}": ${before}% → ${goal.progress}%${note ? `\n\n${note}` : ""}`, meta: { kind: "progress", goalId: goal.id, progress: goal.progress } });
        post.automated = false;
        post.visibility = b.public ? "public" : "company";
        await putRecord("posts", post.id, post);
      }
      if (goal.progress >= 100 && goal.status === "active") await onCompleted(goal, me, employees, catalog);
      await putRecord("goals", goal.id, goal);
      return res.json({ ok: true, goal, post });
    }

    const ownerId = b.ownerId && b.ownerId !== me.id ? b.ownerId : me.id;
    if (ownerId !== me.id && !(ctx.can("tasks.assign") && mySubs.has(ownerId))) {
      return res.status(403).json({ error: "You can only set goals for people who report to you" });
    }
    if (!String(b.title || "").trim()) return res.status(400).json({ error: "A goal title is required" });
    const id = newId("goal");
    const goal = {
      id, ownerId, title: String(b.title).slice(0, 160), description: String(b.description || "").slice(0, 1500),
      category: CATEGORIES.includes(b.category) ? b.category : CATEGORIES[0],
      keyResults: cleanKrs(b.keyResults), progress: 0, status: "active",
      visibility: ["private", "team", "public"].includes(b.visibility) ? b.visibility : "team",
      dueDate: b.dueDate || "", checkins: [], assignedBy: ownerId === me.id ? null : me.id,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    goal.progress = computeProgress(goal);
    await putRecord("goals", id, goal);
    await logActivity(ownerId, "goal", `Set a new goal: "${goal.title}"`);
    if (ownerId !== me.id) await notify([ownerId], { type: "goal", title: `${me.fullName} set a goal for you`, body: goal.title, link: `goals:${id}`, actorId: me.id });
    return res.json({ ok: true, goal });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const goal = await getRecord("goals", b.id);
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (!canManage(goal)) return res.status(403).json({ error: "Not your goal" });
    for (const k of ["title", "description", "dueDate"]) if (b[k] !== undefined) goal[k] = String(b[k]).slice(0, k === "description" ? 1500 : 160);
    if (b.category && CATEGORIES.includes(b.category)) goal.category = b.category;
    if (["private", "team", "public"].includes(b.visibility)) goal.visibility = b.visibility;
    if (["active", "completed", "archived"].includes(b.status)) goal.status = b.status;
    if (b.keyResults) goal.keyResults = cleanKrs(b.keyResults);
    goal.progress = computeProgress(goal);
    goal.updatedAt = new Date().toISOString();
    await putRecord("goals", goal.id, goal);
    return res.json({ ok: true, goal });
  }

  if (req.method === "DELETE") {
    const goal = await getRecord("goals", req.query.id);
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (!canManage(goal)) return res.status(403).json({ error: "Not your goal" });
    await deleteRecord("goals", goal.id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
