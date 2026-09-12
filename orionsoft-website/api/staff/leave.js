import { newId, putRecord, getRecord, listRecords, listByArrayIndex, addToArrayIndex } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { notifyLeaveSubmitted, notifyLeaveDecision } from "../_lib/emailTemplates.js";

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
      if (session.staffRole !== "manager") return res.status(403).json({ error: "Only managers can view team leave requests" });
      const employees = await listRecords("employees");
      const teamIds = employees.filter(e => e.department === session.department && e.id !== session.sub).map(e => e.id);
      const allLeave = await listRecords("leave");
      const teamLeave = allLeave.filter(l => teamIds.includes(l.employeeId));
      return res.json({ ok: true, leave: teamLeave.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
    }
    const leave = await listByArrayIndex("leave", "employee", session.sub);
    return res.json({ ok: true, leave: leave.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
  }

  if (req.method === "POST") {
    const { type, startDate, endDate, reason } = req.body || {};
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ error: "type, startDate, and endDate are required" });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: "endDate cannot be before startDate" });
    }
    const id = newId("lv");
    const leave = {
      id, employeeId: session.sub, type, startDate, endDate, reason: reason || "",
      status: "pending", decidedBy: null, decisionNotes: "",
      submittedAt: new Date().toISOString(), decidedAt: null,
    };
    await putRecord("leave", id, leave);
    await addToArrayIndex("leave", "employee", session.sub, id);

    try {
      const employee = await getRecord("employees", session.sub);
      await notifyLeaveSubmitted(leave, employee);
    } catch { /* email is best-effort */ }

    return res.json({ ok: true, leave });
  }

  if (req.method === "PATCH") {
    if (session.staffRole !== "manager") return res.status(403).json({ error: "Only managers can decide on leave requests" });
    const { id, status, decisionNotes } = req.body || {};
    if (!id || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "id and a valid status are required" });
    }
    const leave = await getRecord("leave", id);
    if (!leave) return res.status(404).json({ error: "Leave request not found" });
    const targetEmployee = await getRecord("employees", leave.employeeId);
    if (!targetEmployee || targetEmployee.department !== session.department) {
      return res.status(403).json({ error: "You can only decide on leave requests from your own department" });
    }

    leave.status = status;
    leave.decisionNotes = decisionNotes || "";
    leave.decidedBy = session.sub;
    leave.decidedAt = new Date().toISOString();
    await putRecord("leave", id, leave);

    try { await notifyLeaveDecision(leave, targetEmployee); } catch { /* best-effort */ }

    return res.json({ ok: true, leave });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
