// Sales & cash at a glance for the owner: money collected, what's due and
// overdue, the deal pipeline, and field activity per salesperson.
import { listRecords } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { normaliseContract, paymentSummary } from "../_lib/contracts.js";
import { normaliseInvoice, computeTotals, isOverdue } from "../_lib/invoicing.js";
import { STAGES } from "../staff/pipeline.js";

const round = n => Math.round(Number(n || 0) * 100) / 100;
const lagos = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);

export default async function handler(req, res) {
  const session = requireAuth(req, res, "admin");
  if (!session) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const today = lagos(), month = today.slice(0, 7);
  const [contracts, payments, invoices, deals, visits, employees] = await Promise.all([
    listRecords("contracts"), listRecords("payments"), listRecords("invoices"), listRecords("deals"), listRecords("visits"), listRecords("employees"),
  ]);
  const name = id => employees.find(e => e.id === id)?.fullName || "Former staff";

  // Cash collected (NGN) per month, last 12 months: contract/plan payments + standalone invoice payments.
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(`${month}-15T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - (11 - i)); return d.toISOString().slice(0, 7); });
  const cash = Object.fromEntries(months.map(m => [m, 0]));
  for (const p of payments) if (p.status === "success" && (p.currency || "NGN") === "NGN") { const m = String(p.paidAt || p.verifiedAt || "").slice(0, 7); if (m in cash) cash[m] += Number(p.amount) || 0; }
  for (const inv of invoices) if (!inv.source?.contractId && (inv.currency || "NGN") === "NGN") for (const p of normaliseInvoice(inv).payments) { const m = String(p.paidAt || "").slice(0, 7); if (m in cash) cash[m] += Number(p.amount) || 0; }

  // Due vs collected, outstanding and overdue across live plans/contracts.
  let dueThisMonth = 0, collectedOfDue = 0, outstanding = 0;
  const overdue = [], clients = {};
  for (const raw of contracts) {
    const c = normaliseContract(raw);
    if (c.status === "draft" || c.status === "cancelled" || !(c.amount > 0) || c.currency !== "NGN") continue;
    const sum = paymentSummary(c, payments.filter(p => p.contractId === c.id));
    const who = c.client.organisation || c.client.name;
    clients[who] = clients[who] || { name: who, paid: 0, balance: 0 };
    clients[who].paid += sum.paid; clients[who].balance += sum.balance;
    outstanding += sum.balance;
    for (const m of sum.schedule) {
      if (m.dueDate && m.dueDate.slice(0, 7) === month) { dueThisMonth += m.amount; collectedOfDue += m.paid; }
      if (m.balance > 0 && m.dueDate && m.dueDate < today) overdue.push({ client: who, email: c.client.email, number: c.number, item: m.title, amount: m.balance, dueDate: m.dueDate, days: Math.round((Date.parse(today) - Date.parse(m.dueDate)) / 86400000) });
    }
  }
  for (const inv of invoices) {
    if (inv.source?.contractId || (inv.currency || "NGN") !== "NGN" || !["sent", "partially_paid"].includes(inv.status)) continue;
    const n = normaliseInvoice(inv), t = computeTotals(n);
    outstanding += t.balance;
    if (isOverdue(n, today)) overdue.push({ client: inv.clientName, email: inv.clientEmail, number: inv.invoiceNumber, item: "Invoice", amount: t.balance, dueDate: inv.dueDate, days: Math.round((Date.parse(today) - Date.parse(inv.dueDate)) / 86400000) });
  }
  overdue.sort((a, b) => b.days - a.days || b.amount - a.amount);

  // Pipeline.
  const PROB = Object.fromEntries(STAGES.map(st => [st.id, st.probability]));
  const pipeline = STAGES.map(st => {
    const ds = deals.filter(d => d.stage === st.id);
    return { stage: st.id, label: st.label, count: ds.length, value: round(ds.reduce((n, d) => n + (Number(d.value) || 0), 0)) };
  });
  const open = deals.filter(d => !["won", "lost"].includes(d.stage));
  const weighted = round(open.reduce((n, d) => n + (Number(d.value) || 0) * (PROB[d.stage] || 0) / 100, 0));
  const wonThisMonth = deals.filter(d => d.stage === "won" && String(d.wonAt || "").startsWith(month));

  // Field activity per salesperson this month.
  const people = {};
  for (const v of visits) {
    if (!String(v.checkIn?.at || "").startsWith(month)) continue;
    const p = people[v.employeeId] = people[v.employeeId] || { id: v.employeeId, name: name(v.employeeId), visits: 0, confirmed: 0, clients: new Set(), won: 0, wonValue: 0 };
    p.visits++; if (v.confirmation?.status === "confirmed") p.confirmed++; p.clients.add(String(v.organisation || "").toLowerCase());
  }
  for (const d of wonThisMonth) {
    const p = people[d.ownerId] = people[d.ownerId] || { id: d.ownerId, name: name(d.ownerId), visits: 0, confirmed: 0, clients: new Set(), won: 0, wonValue: 0 };
    p.won++; p.wonValue += Number(d.value) || 0;
  }
  const sales = Object.values(people).map(p => ({ ...p, clients: p.clients.size })).sort((a, b) => b.wonValue - a.wonValue || b.visits - a.visits);

  return res.json({
    ok: true, month,
    cashByMonth: months.map(m => ({ month: m, amount: round(cash[m]) })),
    collectedThisMonth: round(cash[month]),
    dueThisMonth: round(dueThisMonth), collectedOfDue: round(collectedOfDue),
    outstanding: round(outstanding), overdueTotal: round(overdue.reduce((n, o) => n + o.amount, 0)), overdue: overdue.slice(0, 50),
    pipeline, openDeals: open.length, pipelineValue: round(open.reduce((n, d) => n + (Number(d.value) || 0), 0)), weighted,
    wonThisMonth: { count: wonThisMonth.length, value: round(wonThisMonth.reduce((n, d) => n + (Number(d.value) || 0), 0)) },
    sales, topClients: Object.values(clients).sort((a, b) => b.paid - a.paid).slice(0, 8).map(c => ({ ...c, paid: round(c.paid), balance: round(c.balance) })),
  });
}
