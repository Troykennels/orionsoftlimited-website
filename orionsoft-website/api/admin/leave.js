import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { notifyLeaveDecision } from "../_lib/emailTemplates.js";
import { notify, logActivity } from "../_lib/office.js";
import { logAudit } from "../_lib/audit.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    let leave = await listRecords("leave");
    if (req.query.employeeId) leave = leave.filter(l => l.employeeId === req.query.employeeId);
    if (req.query.status) leave = leave.filter(l => l.status === req.query.status);
    return res.json({ ok: true, leave: leave.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
  }

  if (req.method === "PATCH") {
    const { id, status, decisionNotes } = req.body || {};
    if (!id || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "id and a valid status are required" });
    }
    const leave = await getRecord("leave", id);
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    leave.status = status;
    leave.decisionNotes = decisionNotes || "";
    leave.decidedBy = session.sub;
    leave.decidedAt = new Date().toISOString();
    leave.decidedByName = session.name || "Admin";
    await putRecord("leave", id, leave);
    await notify([leave.employeeId], { type: "approval", title: `Your ${leave.type} leave was ${status}`, body: leave.decisionNotes || `${leave.startDate} to ${leave.endDate}`, link: "leave" });
    if (status === "approved") await logActivity(leave.employeeId, "leave", `Leave approved: ${leave.startDate} to ${leave.endDate}`);
    await logAudit(session, `${status}_leave`, `leave ${id}`);

    try {
      const employee = await getRecord("employees", leave.employeeId);
      await notifyLeaveDecision(leave, employee);
    } catch { /* best-effort */ }

    return res.json({ ok: true, leave });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
