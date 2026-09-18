// Aggregates cross-module items that need an admin's attention today: pending
// leave requests, unreviewed weekly reports, contracts sent but not yet
// signed, payroll issued but not yet paid, and new (unreviewed) applicants.
// Single source of truth for both the Dashboard's "needs attention" widget
// and the notification bell, so the two never disagree with each other.
import { listRecords } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  const [leave, reports, contracts, payroll, applicants, employees, expenses, tickets, invoices] = await Promise.all([
    listRecords("leave"), listRecords("reports"), listRecords("contracts"),
    listRecords("payroll"), listRecords("applicants"), listRecords("employees"),
    listRecords("expenses"), listRecords("tickets"), listRecords("invoices"),
  ]);

  const employeeName = (id) => employees.find(e => e.id === id)?.fullName || "Unknown";

  const items = [];

  for (const l of leave.filter(l => l.status === "pending")) {
    items.push({ id: `leave_${l.id}`, type: "leave", label: `${employeeName(l.employeeId)} requested ${l.type} leave`, detail: `${l.startDate} to ${l.endDate}`, at: l.submittedAt, nav: "leave-requests" });
  }
  for (const r of reports.filter(r => r.status === "submitted")) {
    items.push({ id: `report_${r.id}`, type: "report", label: `${employeeName(r.employeeId)} submitted a weekly report`, detail: `${r.weekStart} to ${r.weekEnd}`, at: r.submittedAt, nav: "weekly-reports" });
  }
  for (const c of contracts.filter(c => c.status === "sent")) {
    items.push({ id: `contract_${c.id}`, type: "contract", label: `"${c.title}" awaiting signature`, detail: c.recipientEmail, at: c.sentAt, nav: "contracts" });
  }
  for (const p of payroll.filter(p => p.status === "issued")) {
    items.push({ id: `payroll_${p.id}`, type: "payroll", label: `${employeeName(p.employeeId)}: ${p.period} payslip issued, not yet paid`, detail: `${p.currency} ${p.netAmount}`, at: p.issuedAt, nav: "payroll" });
  }
  for (const a of applicants.filter(a => a.status === "applied")) {
    items.push({ id: `applicant_${a.id}`, type: "applicant", label: `${a.fullName} applied for ${a.roleAppliedFor}`, detail: a.email, at: a.createdAt, nav: "applicants" });
  }
  for (const e of expenses.filter(e => e.status === "pending")) {
    items.push({ id: `expense_${e.id}`, type: "expense", label: `${e.employeeName} submitted a ${e.category} expense`, detail: `${e.currency} ${e.amount}`, at: e.createdAt, nav: "expenses" });
  }
  for (const t of tickets.filter(t => t.status === "open")) {
    items.push({ id: `ticket_${t.id}`, type: "ticket", label: `New ${t.category} ticket: ${t.subject}`, detail: t.raisedByName, at: t.createdAt, nav: "tickets" });
  }
  const now = Date.now();
  for (const i of invoices.filter(i => i.status === "sent" && i.dueDate && new Date(i.dueDate).getTime() < now)) {
    items.push({ id: `invoice_${i.id}`, type: "invoice", label: `Invoice ${i.invoiceNumber} is overdue`, detail: i.clientName, at: i.dueDate, nav: "invoices" });
  }

  items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  const counts = {
    leave: leave.filter(l => l.status === "pending").length,
    reports: reports.filter(r => r.status === "submitted").length,
    contracts: contracts.filter(c => c.status === "sent").length,
    payroll: payroll.filter(p => p.status === "issued").length,
    applicants: applicants.filter(a => a.status === "applied").length,
    expenses: expenses.filter(e => e.status === "pending").length,
    tickets: tickets.filter(t => t.status === "open").length,
    invoices: invoices.filter(i => i.status === "sent" && i.dueDate && new Date(i.dueDate).getTime() < now).length,
  };

  return res.json({ ok: true, items, counts, total: items.length });
}
