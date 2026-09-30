import { newId, putRecord, getRecord, listRecords, listByArrayIndex, addToArrayIndex } from "../_lib/records.js";
import { officeContext, notify, logActivity, awardOnce } from "../_lib/office.js";
import { approversFor, canApproveFor } from "../_lib/roles.js";
import { notifyReportSubmitted, notifyReportReviewed } from "../_lib/emailTemplates.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Reviewer rights are resolved from the live employee record and reporting
  // line (officeContext), never the up-to-8h-old session token.
  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog, session } = ctx;
  const byId = new Map(employees.map(e => [e.id, e]));

  if (req.method === "GET") {
    if (req.query.scope === "team") {
      const allReports = await listRecords("reports");
      const teamReports = allReports.filter(r => canApproveFor(me, byId.get(r.employeeId), employees, catalog));
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekStart)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(weekEnd))) {
      return res.status(400).json({ error: "weekStart and weekEnd must be dates" });
    }
    // Free text and lists are size-capped; totals are numbers only.
    const txt = (v, n = 3000) => (v == null ? "" : String(v).slice(0, n));
    const nums = o => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), Number(v) || 0]));
    const rows = a => (Array.isArray(a) ? a : []).slice(0, 100).map(r => (r && typeof r === "object" ? Object.fromEntries(Object.entries(r).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), typeof v === "number" ? v : txt(v, 500)])) : txt(r, 500)));
    const id = newId("rpt");
    const report = {
      id, employeeId: session.sub, weekStart, weekEnd,
      territory: txt(territory, 200), reportingManager: txt(reportingManager, 120),
      productFocus: txt(productFocus, 200), summary: txt(summary, 5000),
      totals: {
        prospectsContacted: 0, physicalVisits: 0, meetingsHeld: 0, productDemos: 0,
        proposalsSent: 0, newLeadsGenerated: 0, salesClosed: 0, salesValue: 0,
        ...nums(totals),
      },
      prospects: rows(prospects),
      sales: rows(sales),
      followUps: rows(followUps),
      challenges: txt(challenges), objections: txt(objections), supportNeeded: txt(supportNeeded),
      competitors: txt(competitors), competitorPricing: txt(competitorPricing),
      marketTrends: txt(marketTrends), otherInfo: txt(otherInfo),
      nextWeekPlan: {
        organisationsToVisit: 0, prospectsToFollowUp: 0, meetingsPlanned: 0, demosPlanned: 0,
        expectedProposals: 0, expectedSales: 0,
        ...nums(nextWeekPlan),
      },
      keyTargets: Array.isArray(keyTargets) ? keyTargets.filter(Boolean).slice(0, 30).map(t => txt(t, 300)) : [],
      declarationConfirmed: true,
      status: "submitted", reviewedBy: null, reviewNotes: "",
      submittedAt: new Date().toISOString(), reviewedAt: null,
    };
    await putRecord("reports", id, report);
    await addToArrayIndex("reports", "employee", session.sub, id);

    await awardOnce(me.id, "report", String(weekStart)); // one report per week earns points
    await logActivity(me.id, "report", `Submitted weekly report (${weekStart} to ${weekEnd})`);
    await notify(approversFor(me, employees, catalog), { type: "approval", title: `${me.fullName} submitted a weekly report`, body: summary.slice(0, 160), link: "approvals", actorId: me.id });
    try { await notifyReportSubmitted(report, me); } catch { /* email is best-effort, never block the submission */ }

    return res.json({ ok: true, report });
  }

  if (req.method === "PATCH") {
    const { id, status, reviewNotes } = req.body || {};
    if (!id || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "id and a valid status are required" });
    }
    const report = await getRecord("reports", id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    const targetEmployee = byId.get(report.employeeId);
    if (!canApproveFor(me, targetEmployee, employees, catalog)) {
      return res.status(403).json({ error: "You can only review reports from people in your reporting line" });
    }

    report.status = status;
    report.reviewNotes = String(reviewNotes || "").slice(0, 2000);
    report.reviewedBy = session.sub;
    report.reviewedByName = me.fullName;
    report.reviewedAt = new Date().toISOString();
    await putRecord("reports", id, report);
    await notify([report.employeeId], { type: "approval", title: `Your weekly report was ${status}`, body: report.reviewNotes, link: "reports", actorId: me.id });

    try { await notifyReportReviewed(report, targetEmployee); } catch { /* best-effort */ }

    return res.json({ ok: true, report });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
