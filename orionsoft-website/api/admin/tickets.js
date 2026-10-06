// Internal helpdesk — IT/HR/Facilities/Finance requests raised inside the
// company, assignable to an employee, with a threaded comment trail.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

const CATEGORIES = ["Client support", "IT", "HR", "Facilities", "Finance", "Other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in_progress", "resolved", "closed"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const tickets = await listRecords("tickets");
    return res.json({ ok: true, tickets: tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), categories: CATEGORIES });
  }

  if (req.method === "POST") {
    const { subject, description, category, priority, raisedByName, assignedToId } = req.body || {};
    if (!subject) return res.status(400).json({ error: "subject is required" });
    let assignedToName = "";
    if (assignedToId) {
      const employee = await getRecord("employees", assignedToId);
      if (employee) assignedToName = employee.fullName;
    }
    const id = newId("tkt");
    const ticket = {
      id, subject, description: description || "",
      category: CATEGORIES.includes(category) ? category : "Other",
      priority: PRIORITIES.includes(priority) ? priority : "medium",
      raisedByName: raisedByName || session.name || "Admin",
      assignedToId: assignedToId || null, assignedToName,
      status: "open", comments: [], resolvedAt: null,
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };
    await putRecord("tickets", id, ticket);
    await logAudit(session, "create_ticket", `ticket ${id}`, subject);
    return res.json({ ok: true, ticket });
  }

  if (req.method === "PATCH") {
    const { id, action } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const ticket = await getRecord("tickets", id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (action === "add_comment") {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Comment text is required" });
      ticket.comments = ticket.comments || [];
      ticket.comments.push({ id: newId("cmt"), author: session.name || session.email || "Admin", text, at: new Date().toISOString(), internal: !!req.body.internal });
      ticket.updatedAt = new Date().toISOString();
      await putRecord("tickets", id, ticket);
      // A client's ticket: email them the reply (internal notes stay internal).
      if (ticket.clientEmail && !req.body.internal) {
        try {
          const { sendEmail, brandedShell } = await import("../_lib/mailer.js");
          const { siteUrl } = await import("../_lib/contracts.js");
          const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
          await sendEmail(ticket.clientEmail, `Re: ${ticket.subject}`, brandedShell(`<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Reply from Orion Soft support</h2>
            <p style="color:#3A4556;font-size:14px;line-height:1.7;white-space:pre-wrap;background:#F4F6FA;border-radius:10px;padding:14px;">${esc(text)}</p>
            <p style="margin:18px 0;"><a href="${siteUrl()}/client" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Reply in your client portal</a></p>`, { title: "Support" }), { kind: "client_ticket_reply" });
        } catch { /* best-effort */ }
      }
      return res.json({ ok: true, ticket });
    }

    if (action === "assign") {
      const { assignedToId } = req.body;
      if (assignedToId) {
        const employee = await getRecord("employees", assignedToId);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        ticket.assignedToId = assignedToId;
        ticket.assignedToName = employee.fullName;
        if (ticket.status === "open") ticket.status = "in_progress";
      } else {
        ticket.assignedToId = null;
        ticket.assignedToName = "";
      }
      ticket.updatedAt = new Date().toISOString();
      await putRecord("tickets", id, ticket);
      return res.json({ ok: true, ticket });
    }

    if (updateStatusAction(action)) {
      ticket.status = action;
      if (action === "resolved") ticket.resolvedAt = new Date().toISOString();
      ticket.updatedAt = new Date().toISOString();
      await putRecord("tickets", id, ticket);
      await logAudit(session, `ticket_${action}`, `ticket ${id}`, ticket.subject);
      return res.json({ ok: true, ticket });
    }

    const { subject, description, category, priority } = req.body;
    if (subject !== undefined) ticket.subject = subject;
    if (description !== undefined) ticket.description = description;
    if (category !== undefined && CATEGORIES.includes(category)) ticket.category = category;
    if (priority !== undefined && PRIORITIES.includes(priority)) ticket.priority = priority;
    ticket.updatedAt = new Date().toISOString();
    await putRecord("tickets", id, ticket);
    return res.json({ ok: true, ticket });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteRecord("tickets", id);
    await logAudit(session, "delete_ticket", `ticket ${id}`);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function updateStatusAction(action) {
  return STATUSES.includes(action);
}
