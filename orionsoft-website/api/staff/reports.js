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

  // Re-checked against the live employee record, not the (up to 8h old)
  // session token — see api/staff/leave.js for the same fix and why.
  const actingEmployee = await getRecord("employees", session.sub);
  if (!actingEmployee) return res.status(404).json({ error: "Employee record not found" });

  if (req.method === "GET") {
    if (req.query.scope === "team") {
      if (actingEmployee.staffRole !== "manager") return res.status(403).json({ error: "Only managers can view team reports" });
      const employees = await listRecords("employees");
      const teamIds = employees.filter(e => e.department === actingEmployee.department && e.id !== session.sub).map(e => e.id);
      const allReports = await listRecords("reports");
      const teamReports = allReports.filter(r => teamIds.includes(r.employeeId));
      return res.json({ ok: true, reports: teamReports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
    }
    const reports = await listByArrayIndex("reports", "employee", session.sub);
    return res.json({ ok: true, reports: reports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
  }

  if (req.method === "POST") {
    const {
      weekStart, weekEnd, territory, reportingManager, productFocus, summary,
      totals, prospects, sales, followUps, challenges, objections, supportNeeded,
      competitors, competitorPricing, marketTrends, otherInfo, nextWeekPlan,
      keyTargets, declarationConfirmed,
    } = req.body || {};
    if (!weekStart || !weekEnd || !summary || !declarationConfirmed) {
      return res.status(400).json({ error: "weekStart, weekEnd, a summary, and the declaration confirmation are required" });
    }
    const id = newId("rpt");
    const report = {
      id, employeeId: session.sub, weekStart, weekEnd,
      territory: territory || "", reportingManager: reportingManager || "",
      productFocus: productFocus || "", summary,
      totals: {
        prospectsContacted: 0, physicalVisits: 0, meetingsHeld: 0, productDemos: 0,
        proposalsSent: 0, newLeadsGenerated: 0, salesClosed: 0, salesValue: 0,
        ...totals,
      },
      prospects: Array.isArray(prospects) ? prospects : [],
      sales: Array.isArray(sales) ? sales : [],
      followUps: Array.isArray(followUps) ? followUps : [],
      challenges: challenges || "", objections: objections || "", supportNeeded: supportNeeded || "",
      competitors: competitors || "", competitorPricing: competitorPricing || "",
      marketTrends: marketTrends || "", otherInfo: otherInfo || "",
      nextWeekPlan: {
        organisationsToVisit: 0, prospectsToFollowUp: 0, meetingsPlanned: 0, demosPlanned: 0,
        expectedProposals: 0, expectedSales: 0,
        ...nextWeekPlan,
      },
      keyTargets: Array.isArray(keyTargets) ? keyTargets.filter(Boolean) : [],
      declarationConfirmed: true,
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
