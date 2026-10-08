// Staff queries: a formal written query to a staff member who isn't doing
// well (lateness, missed targets, conduct…). The admin, HR / executives, or
// anyone above the person in their reporting line can issue one. The staff
// member answers in writing by the "respond by" date; whoever issued it (or a
// manager above the person) then closes it with an outcome. Everything stays
// on record.
import { newId, putRecord, listRecords } from "./records.js";
import { notify } from "./office.js";
import { logAudit } from "./audit.js";
import { managerChain, isAbove, can } from "./roles.js";
import { lagosDate } from "./automations.js";

export const CATEGORIES = {
  performance: "Poor performance",
  targets: "Missed targets",
  attendance: "Absence",
  lateness: "Lateness",
  reporting: "Reports not submitted",
  conduct: "Misconduct",
  other: "Other",
};

export const OUTCOMES = {
  no_action: "Response accepted, no further action",
  warning: "Verbal / written warning",
  final_warning: "Final warning",
  escalated: "Escalated to HR / management",
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const clip = (v, n) => String(v || "").trim().slice(0, n);
const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const isOverdue = (q, today = lagosDate()) => q.status === "open" && !!q.respondBy && q.respondBy < today;

// HR / executives see and act on every query; managers on people below them.
export function companyWide(actor, catalog) {
  return can(actor, "hr.records", catalog) || can(actor, "org.approve", catalog);
}
export function canQuery(actor, target, employees, catalog) {
  if (!actor || !target || actor.id === target.id) return false;
  return companyWide(actor, catalog) || isAbove(actor, target, employees, catalog);
}
// May see the query and close it with an outcome (not answer it).
export function canManage(actor, q, employees, catalog) {
  if (q.issuedBy?.kind === "staff" && q.issuedBy.id === actor.id) return true;
  const target = employees.find(e => e.id === q.employeeId);
  return !!target && canQuery(actor, target, employees, catalog);
}

async function emailAdmin(subject, html) {
  try {
    const { sendEmail, brandedShell } = await import("./mailer.js");
    await sendEmail(ADMIN_EMAIL(), subject, brandedShell(html, { title: "Staff query" }), { kind: "staff_query" });
  } catch { /* the query is saved; the admin sees it in the dashboard */ }
}

// issuedBy: { kind: "admin" | "staff", id, name, title }
export async function createQuery({ employee, employees, catalog, issuedBy, session, body }) {
  const subject = clip(body.subject, 160);
  const details = clip(body.details, 5000);
  if (!subject) throw Object.assign(new Error("Give the query a subject"), { status: 400 });
  if (!details) throw Object.assign(new Error("Explain what the query is about"), { status: 400 });
  const today = lagosDate();
  const respondBy = DATE.test(body.respondBy || "") ? body.respondBy : addDays(today, 3);
  if (respondBy < today) throw Object.assign(new Error("The response date can't be in the past"), { status: 400 });
  const now = new Date().toISOString();
  const q = {
    id: newId("qry"), employeeId: employee.id, employeeName: employee.fullName,
    subject, details, category: CATEGORIES[body.category] ? body.category : "other", respondBy,
    issuedBy, status: "open", response: null, outcome: null, reminded: false,
    createdAt: now, updatedAt: now,
  };
  await putRecord("queries", q.id, q);
  await logAudit(session, "issue_query", `query ${q.id}`, `${employee.fullName}: ${subject}`);
  await notify([employee.id], {
    type: "system", title: `You have been issued a query: ${subject}`,
    body: `From ${issuedBy.name}. Please respond in writing by ${respondBy} (Queries).`, link: `queries:${q.id}`,
  });
  // The line manager is kept informed when someone else issues it.
  const lineManager = managerChain(employee, employees, catalog)[0];
  if (lineManager && lineManager.id !== issuedBy.id) {
    await notify([lineManager.id], { type: "system", title: `${employee.fullName} has been issued a query`, body: `${subject}. Issued by ${issuedBy.name}.`, link: `queries:${q.id}` });
  }
  return q;
}

export async function respondToQuery(q, text, me, employees, catalog, session) {
  if (q.status !== "open") throw Object.assign(new Error(q.status === "responded" ? "You've already responded to this query" : "This query is no longer open"), { status: 400 });
  const response = clip(text, 5000);
  if (response.length < 10) throw Object.assign(new Error("Write your response (at least a sentence)"), { status: 400 });
  q.response = { text: response, at: new Date().toISOString(), late: isOverdue(q) };
  q.status = "responded";
  q.updatedAt = q.response.at;
  await putRecord("queries", q.id, q);
  await logAudit(session, "respond_query", `query ${q.id}`, q.subject);
  const lineManager = managerChain(me, employees, catalog)[0];
  const tell = [q.issuedBy?.kind === "staff" ? q.issuedBy.id : null, lineManager?.id];
  await notify(tell, { type: "system", title: `${me.fullName} responded to their query`, body: q.subject, link: `queries:${q.id}`, actorId: me.id });
  if (q.issuedBy?.kind === "admin") {
    await emailAdmin(`${me.fullName} responded to the query "${q.subject}"`,
      `<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Query response from ${esc(me.fullName)}</h2>
       <p style="color:#6B7A96;font-size:13px;margin:0 0 6px;">Query: <strong>${esc(q.subject)}</strong></p>
       <div style="background:#F8FAFC;border:1px solid #E5E9F0;border-radius:8px;padding:12px;font-size:14px;color:#3A4556;white-space:pre-wrap;">${esc(response)}</div>
       <p style="color:#6B7A96;font-size:12px;margin-top:14px;">Close it with an outcome in Admin → Staff Queries.</p>`);
  }
  return q;
}

export async function closeQuery(q, { decision, note }, actorName, session) {
  if (q.status === "closed" || q.status === "withdrawn") throw Object.assign(new Error("This query is already closed"), { status: 400 });
  if (!OUTCOMES[decision]) throw Object.assign(new Error("Choose an outcome"), { status: 400 });
  q.outcome = { decision, note: clip(note, 2000), at: new Date().toISOString(), byName: actorName, beforeResponse: q.status === "open" };
  q.status = "closed";
  q.updatedAt = q.outcome.at;
  await putRecord("queries", q.id, q);
  await logAudit(session, "close_query", `query ${q.id}`, `${q.employeeName}: ${OUTCOMES[decision]}`);
  await notify([q.employeeId], { type: "system", title: `Your query has been closed: ${q.subject}`, body: `Outcome: ${OUTCOMES[decision]}${q.outcome.note ? `. ${q.outcome.note}` : ""}`, link: `queries:${q.id}` });
  return q;
}

export async function withdrawQuery(q, reason, actorName, session) {
  if (q.status === "closed" || q.status === "withdrawn") throw Object.assign(new Error("This query is already closed"), { status: 400 });
  q.status = "withdrawn";
  q.withdrawn = { reason: clip(reason, 1000), at: new Date().toISOString(), byName: actorName };
  q.updatedAt = q.withdrawn.at;
  await putRecord("queries", q.id, q);
  await logAudit(session, "withdraw_query", `query ${q.id}`, q.employeeName);
  await notify([q.employeeId], { type: "system", title: `A query has been withdrawn: ${q.subject}`, body: q.withdrawn.reason || "No response is needed.", link: `queries:${q.id}` });
  return q;
}

// Automation: once a query's response date has passed with no answer, remind
// the staff member and tell whoever issued it (flag prevents repeats).
export async function overdueQueryReminders(today = lagosDate()) {
  for (const q of await listRecords("queries")) {
    if (q.reminded || !isOverdue(q, today)) continue;
    q.reminded = true;
    await putRecord("queries", q.id, q);
    await notify([q.employeeId], { type: "system", title: `Your response to a query is overdue`, body: `"${q.subject}" was due ${q.respondBy}. Respond today in Queries.`, link: `queries:${q.id}` });
    if (q.issuedBy?.kind === "staff") await notify([q.issuedBy.id], { type: "system", title: `${q.employeeName} hasn't responded to a query`, body: `"${q.subject}" was due ${q.respondBy}. You can close it with an outcome.`, link: `queries:${q.id}` });
    else await emailAdmin(`${q.employeeName} hasn't responded to the query "${q.subject}"`,
      `<p style="font-size:14px;color:#3A4556;">${esc(q.employeeName)} was asked to respond to <strong>${esc(q.subject)}</strong> by ${esc(q.respondBy)} and hasn't yet.</p>
       <p style="color:#6B7A96;font-size:12px;">You can close it with an outcome in Admin → Staff Queries.</p>`);
  }
}
