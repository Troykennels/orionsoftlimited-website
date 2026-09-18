// Performance review / appraisal cycles — per-employee ratings across a
// fixed rubric, plus free-text strengths, growth areas, and next-cycle goals.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

const RUBRIC = ["communication", "quality", "teamwork", "ownership", "initiative"];

function overallOf(ratings) {
  const vals = RUBRIC.map(k => Number(ratings?.[k]) || 0).filter(v => v > 0);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const appraisals = await listRecords("appraisals");
    return res.json({ ok: true, appraisals: appraisals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), rubric: RUBRIC });
  }

  if (req.method === "POST") {
    const { employeeId, cycle, reviewerName, ratings, strengths, areasForImprovement, goals } = req.body || {};
    if (!employeeId || !cycle) return res.status(400).json({ error: "employeeId and cycle are required" });
    const employee = await getRecord("employees", employeeId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const id = newId("apr");
    const appraisal = {
      id, employeeId, employeeName: employee.fullName, cycle,
      reviewerName: reviewerName || session.name || "Admin",
      ratings: RUBRIC.reduce((o, k) => ({ ...o, [k]: Number(ratings?.[k]) || 0 }), {}),
      overallRating: overallOf(ratings),
      strengths: strengths || "", areasForImprovement: areasForImprovement || "",
      goals: Array.isArray(goals) ? goals : [],
      status: "draft", acknowledgedAt: null,
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };
    await putRecord("appraisals", id, appraisal);
    await logAudit(session, "create_appraisal", `appraisal ${id}`, `${employee.fullName} — ${cycle}`);
    return res.json({ ok: true, appraisal });
  }

  if (req.method === "PATCH") {
    const { id, action } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const appraisal = await getRecord("appraisals", id);
    if (!appraisal) return res.status(404).json({ error: "Appraisal not found" });

    if (action === "finalize") {
      appraisal.status = "finalized";
      appraisal.updatedAt = new Date().toISOString();
      await putRecord("appraisals", id, appraisal);
      await logAudit(session, "finalize_appraisal", `appraisal ${id}`, appraisal.employeeName);
      return res.json({ ok: true, appraisal });
    }
    if (action === "acknowledge") {
      appraisal.status = "acknowledged";
      appraisal.acknowledgedAt = new Date().toISOString();
      appraisal.updatedAt = new Date().toISOString();
      await putRecord("appraisals", id, appraisal);
      return res.json({ ok: true, appraisal });
    }

    const { cycle, reviewerName, ratings, strengths, areasForImprovement, goals } = req.body;
    if (appraisal.status !== "draft") return res.status(400).json({ error: "Only a draft appraisal can be edited directly. Use an action instead." });
    if (cycle !== undefined) appraisal.cycle = cycle;
    if (reviewerName !== undefined) appraisal.reviewerName = reviewerName;
    if (ratings !== undefined) { appraisal.ratings = RUBRIC.reduce((o, k) => ({ ...o, [k]: Number(ratings?.[k]) || 0 }), {}); appraisal.overallRating = overallOf(ratings); }
    if (strengths !== undefined) appraisal.strengths = strengths;
    if (areasForImprovement !== undefined) appraisal.areasForImprovement = areasForImprovement;
    if (goals !== undefined) appraisal.goals = Array.isArray(goals) ? goals : [];
    appraisal.updatedAt = new Date().toISOString();
    await putRecord("appraisals", id, appraisal);
    return res.json({ ok: true, appraisal });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteRecord("appraisals", id);
    await logAudit(session, "delete_appraisal", `appraisal ${id}`);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
