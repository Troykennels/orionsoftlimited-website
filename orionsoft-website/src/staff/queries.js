// Staff queries: helpers shared by the Staff Office (modules/Queries.jsx,
// Performance) and the admin dashboard (admin/QueriesAdmin.jsx).
import { C } from "./theme.js";
import { api } from "./api.js";
import { toast } from "./components.jsx";

export const STATUS = {
  open: { label: "Awaiting response", color: C.amber },
  responded: { label: "Responded", color: C.blue },
  closed: { label: "Closed", color: C.mint },
  withdrawn: { label: "Withdrawn", color: C.textMuted },
};
export const lagosToday = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);
export const inDays = n => new Date(Date.now() + 3600000 + n * 86400000).toISOString().slice(0, 10);
export const isOverdue = q => q.status === "open" && q.respondBy && q.respondBy < lagosToday();

export const postQuery = body => api("/api/staff/queries", { method: "POST", body });
export const issueAsStaff = form => postQuery({ action: "issue", ...form });

export async function askWithdraw(q, submit, onDone) {
  const reason = prompt(`Withdraw the query to ${q.employeeName}? They'll be told no response is needed.\n\nReason (optional):`);
  if (reason === null) return;
  try { await submit({ id: q.id, reason }); toast("Query withdrawn"); onDone?.(); }
  catch (e) { toast(e.message, "err"); }
}

// A query letter started from someone's scorecard: the facts are filled in.
export function queryFromCard(card, range) {
  const lines = [
    `Your performance score for ${range.from} to ${range.to} is ${card.overall} (grade ${card.grade}).`,
    ...card.flags.map(f => `- ${f.text}`),
    "",
    "Please explain in writing why your performance has fallen below what is expected, and what you will do to improve it.",
  ];
  return { employeeId: card.employeeId, category: "performance", subject: `Performance below expectations (${range.from} to ${range.to})`, details: lines.join("\n") };
}
