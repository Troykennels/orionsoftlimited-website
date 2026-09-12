import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { notifyReportReviewed } from "../_lib/emailTemplates.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    let reports = await listRecords("reports");
    if (req.query.employeeId) reports = reports.filter(r => r.employeeId === req.query.employeeId);
    if (req.query.status) reports = reports.filter(r => r.status === req.query.status);
    return res.json({ ok: true, reports: reports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
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
    await putRecord("reports", id, report);

    try {
      const employee = await getRecord("employees", report.employeeId);
      await notifyReportReviewed(report, employee);
    } catch { /* best-effort */ }

    return res.json({ ok: true, report });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
