import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { notifyReportReviewed, notifyReportSubmitted } from "../_lib/emailTemplates.js";
import { notify } from "../_lib/office.js";
import { getRoleCatalog, reportManagers } from "../_lib/roles.js";
import { renderWeeklyReportPdf, reportPdfName } from "../_lib/reportPdf.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  async function managersOf(report) {
    const [employees, catalog] = await Promise.all([listRecords("employees"), getRoleCatalog()]);
    const target = employees.find(e => e.id === report.employeeId);
    return { target, managers: target ? reportManagers(report, target, employees, catalog) : [] };
  }

  if (req.method === "GET") {
    if (req.query.pdf) {
      const report = await getRecord("reports", String(req.query.pdf));
      if (!report) return res.status(404).json({ error: "Report not found" });
      const owner = await getRecord("employees", report.employeeId);
      const pdf = Buffer.from(await renderWeeklyReportPdf(report, owner));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${req.query.download ? "attachment" : "inline"}; filename="${reportPdfName(report, owner)}"`);
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(pdf);
    }
    let reports = await listRecords("reports");
    if (req.query.employeeId) reports = reports.filter(r => r.employeeId === req.query.employeeId);
    if (req.query.status) reports = reports.filter(r => r.status === req.query.status);
    if (req.query.id) {
      // Detail view: who this report goes to, so the admin can see and resend.
      const report = reports.find(r => r.id === req.query.id);
      if (!report) return res.status(404).json({ error: "Report not found" });
      const { managers } = await managersOf(report);
      return res.json({ ok: true, report, managers: managers.map(m => ({ id: m.id, fullName: m.fullName, email: m.email })) });
    }
    return res.json({ ok: true, reports: reports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
  }

  // Resend a report to the submitter's manager(s): in-app + full email.
  if (req.method === "POST" && req.body?.action === "forward") {
    const report = await getRecord("reports", req.body.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    const { target, managers } = await managersOf(report);
    if (!target) return res.status(404).json({ error: "The employee on this report no longer exists" });
    if (!managers.length) return res.status(400).json({ error: `${target.fullName} has no line manager set. Set one under Staff Office → Employees & Roles, then send again.` });
    await notify(managers.map(m => m.id), { type: "approval", title: `${target.fullName} submitted a weekly report`, body: String(report.summary || "").slice(0, 160), link: "approvals", actorId: target.id });
    try { await notifyReportSubmitted(report, target, managers); } catch { /* best-effort */ }
    return res.json({ ok: true, sentTo: managers.map(m => m.fullName) });
  }

  if (req.method === "PATCH") {
    const { id, status, reviewNotes } = req.body || {};
    if (!id || !["reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "id and a valid status are required" });
    }
    const report = await getRecord("reports", id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    report.status = status;
    report.reviewNotes = reviewNotes || "";
    report.reviewedBy = session.sub;
    report.reviewedAt = new Date().toISOString();
    report.reviewedByName = session.name || "Admin";
    await putRecord("reports", id, report);
    await notify([report.employeeId], { type: "approval", title: `Your weekly report was ${status}`, body: report.reviewNotes, link: "reports" });

    try {
      const employee = await getRecord("employees", report.employeeId);
      await notifyReportReviewed(report, employee);
    } catch { /* best-effort */ }

    return res.json({ ok: true, report });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
