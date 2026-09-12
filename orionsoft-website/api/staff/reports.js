import { newId, putRecord, getRecord, listRecords, listByArrayIndex, addToArrayIndex } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { notifyReportSubmitted, notifyReportReviewed } from "../_lib/emailTemplates.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "staff");
  if (!session) return;

  if (req.method === "GET") {
    if (req.query.scope === "team") {
      if (session.staffRole !== "manager") return res.status(403).json({ error: "Only managers can view team reports" });
      const employees = await listRecords("employees");
      const teamIds = employees.filter(e => e.department === session.department && e.id !== session.sub).map(e => e.id);
      const allReports = await listRecords("reports");
      const teamReports = allReports.filter(r => teamIds.includes(r.employeeId));
      return res.json({ ok: true, reports: teamReports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
    }
    const reports = await listByArrayIndex("reports", "employee", session.sub);
    return res.json({ ok: true, reports: reports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
  }

  if (req.method === "POST") {
    const { weekStart, weekEnd, activities, metrics, notes } = req.body || {};
    if (!weekStart || !weekEnd || !Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({ error: "weekStart, weekEnd, and at least one activity are required" });
    }
    const id = newId("rpt");
    const report = {
      id, employeeId: session.sub, weekStart, weekEnd,
      activities, metrics: metrics || {}, notes: notes || "",
      status: "submitted", reviewedBy: null, reviewNotes: "",
      submittedAt: new Date().toISOString(), reviewedAt: null,
    };
    await putRecord("reports", id, report);
    await addToArrayIndex("reports", "employee", session.sub, id);

    try {
      const employee = await getRecord("employees", session.sub);
      await notifyReportSubmitted(report, employee);
    } catch { /* email is best-effort, never block the submission */ }

    return res.json({ ok: true, report });
  }

  if (req.method === "PATCH") {
    if (session.staffRole !== "manager") return res.status(403).json({ error: "Only managers can review reports" });
    const { id, status, reviewNotes } = req.body || {};
    if (!id || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "id and a valid status are required" });
    }
    const report = await getRecord("reports", id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    const targetEmployee = await getRecord("employees", report.employeeId);
    if (!targetEmployee || targetEmployee.department !== session.department) {
      return res.status(403).json({ error: "You can only review reports from your own department" });
    }

    report.status = status;
    report.reviewNotes = reviewNotes || "";
    report.reviewedBy = session.sub;
    report.reviewedAt = new Date().toISOString();
    await putRecord("reports", id, report);

    try { await notifyReportReviewed(report, targetEmployee); } catch { /* best-effort */ }

    return res.json({ ok: true, report });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
