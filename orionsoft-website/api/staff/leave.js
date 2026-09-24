import { newId, putRecord, getRecord, listRecords, listByArrayIndex, addToArrayIndex } from "../_lib/records.js";
import { officeContext, notify, logActivity } from "../_lib/office.js";
import { approversFor, canApproveFor } from "../_lib/roles.js";
import { notifyLeaveSubmitted, notifyLeaveDecision } from "../_lib/emailTemplates.js";

const TYPES = ["annual", "sick", "casual", "maternity", "paternity", "study", "compassionate", "unpaid", "other"];

function workingDays(start, end) {
  let n = 0;
  for (let t = Date.parse(start); t <= Date.parse(end); t += 86400000) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Role, department and reporting line come from the live employee record
  // (via officeContext), never the session token, so a demotion or transfer
  // takes effect immediately.
  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, catalog, session } = ctx;
  const byId = new Map(employees.map(e => [e.id, e]));

  if (req.method === "GET") {
    if (req.query.scope === "team") {
      const all = await listRecords("leave");
      const team = all.filter(l => canApproveFor(me, byId.get(l.employeeId), employees, catalog));
      return res.json({ ok: true, leave: team.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)) });
    }
    const leave = await listByArrayIndex("leave", "employee", session.sub);
    const year = new Date().toISOString().slice(0, 4);
    const used = leave.filter(l => l.status === "approved" && l.type === "annual" && l.startDate.startsWith(year)).reduce((n, l) => n + workingDays(l.startDate, l.endDate), 0);
    const allowance = Number(me.leaveAllowance) || 20;
    return res.json({
      ok: true, types: TYPES,
      balance: { allowance, used, remaining: Math.max(0, allowance - used) },
      leave: leave.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
    });
  }

  if (req.method === "POST") {
    const { type, startDate, endDate, reason, handoverTo } = req.body || {};
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ error: "type, startDate, and endDate are required" });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: "endDate cannot be before startDate" });
    }
    const id = newId("lv");
    const leave = {
      id, employeeId: session.sub, type: TYPES.includes(type) ? type : "other", startDate, endDate, reason: String(reason || "").slice(0, 1000),
      days: workingDays(startDate, endDate), handoverTo: byId.has(handoverTo) ? handoverTo : null,
      status: "pending", decidedBy: null, decidedByName: "", decisionNotes: "",
      submittedAt: new Date().toISOString(), decidedAt: null,
    };
    await putRecord("leave", id, leave);
    await addToArrayIndex("leave", "employee", session.sub, id);

    await notify(approversFor(me, employees, catalog), { type: "approval", title: `${me.fullName} requested ${leave.type} leave`, body: `${startDate} to ${endDate} (${leave.days} working day${leave.days === 1 ? "" : "s"})`, link: "approvals", actorId: me.id });
    if (leave.handoverTo) await notify([leave.handoverTo], { type: "leave", title: `${me.fullName} named you as their handover while on leave`, body: `${startDate} to ${endDate}`, link: "leave", actorId: me.id });
    try { await notifyLeaveSubmitted(leave, me); } catch { /* email is best-effort */ }

    return res.json({ ok: true, leave });
  }

  if (req.method === "PATCH") {
    const { id, status, decisionNotes } = req.body || {};
    if (!id || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "id and a valid status are required" });
    }
    const leave = await getRecord("leave", id);
    if (!leave) return res.status(404).json({ error: "Leave request not found" });
    const target = byId.get(leave.employeeId);
    if (!canApproveFor(me, target, employees, catalog)) {
      return res.status(403).json({ error: "You can only decide leave for people in your reporting line" });
    }
    if (leave.status !== "pending") return res.status(400).json({ error: "This request has already been decided" });

    leave.status = status;
    leave.decisionNotes = String(decisionNotes || "").slice(0, 600);
    leave.decidedBy = session.sub;
    leave.decidedByName = me.fullName;
    leave.decidedAt = new Date().toISOString();
    await putRecord("leave", id, leave);

    await notify([leave.employeeId], { type: "approval", title: `Your ${leave.type} leave was ${status}`, body: leave.decisionNotes || `${leave.startDate} to ${leave.endDate}`, link: "leave", actorId: me.id });
    if (status === "approved") await logActivity(leave.employeeId, "leave", `Leave approved: ${leave.startDate} to ${leave.endDate}`);
    try { await notifyLeaveDecision(leave, target); } catch { /* best-effort */ }

    return res.json({ ok: true, leave });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
