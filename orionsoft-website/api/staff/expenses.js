// Staff expense claims. Writes into the same "expenses" records the admin
// Expenses section manages (admin still marks them reimbursed). Anyone with
// "finance.approve" can approve/reject other people's claims from the office.
import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { officeContext, notify } from "../_lib/office.js";
import { can } from "../_lib/roles.js";

const CATEGORIES = ["Travel", "Meals & Entertainment", "Office Supplies", "Software & Subscriptions", "Client Costs", "Other"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, active, catalog } = ctx;

  if (req.method === "GET") {
    const all = await listRecords("expenses");
    const mine = all.filter(x => x.employeeId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const toApprove = ctx.can("finance.approve") ? all.filter(x => x.status === "pending" && x.employeeId !== me.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [];
    return res.json({ ok: true, expenses: mine, toApprove, categories: CATEGORIES });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const amount = Number(b.amount);
    if (!(amount > 0)) return res.status(400).json({ error: "Enter the amount spent" });
    if (b.receiptDataUrl && (!/^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,/.test(b.receiptDataUrl) || b.receiptDataUrl.length > 2_000_000)) {
      return res.status(400).json({ error: "Receipt must be an image or PDF under ~1.5MB" });
    }
    const id = newId("exp");
    const expense = {
      id, employeeId: me.id, employeeName: me.fullName, category: CATEGORIES.includes(b.category) ? b.category : "Other",
      amount, currency: "NGN", description: String(b.description || "").slice(0, 600),
      expenseDate: b.expenseDate || new Date().toISOString().slice(0, 10), receiptDataUrl: b.receiptDataUrl || "",
      status: "pending", decisionNotes: "", decidedBy: "", decidedAt: null, source: "staff_office",
      createdAt: new Date().toISOString(), createdBy: me.id, updatedAt: new Date().toISOString(),
    };
    await putRecord("expenses", id, expense);
    const approvers = active.filter(e => e.id !== me.id && can(e, "finance.approve", catalog)).map(e => e.id);
    await notify(approvers, { type: "approval", title: `${me.fullName} submitted an expense claim`, body: `₦${amount.toLocaleString()} · ${expense.category}`, link: "approvals", actorId: me.id });
    return res.json({ ok: true, expense });
  }

  if (req.method === "PATCH") {
    if (!ctx.can("finance.approve")) return res.status(403).json({ error: "Your role can't approve expenses" });
    const { id, action, decisionNotes } = req.body || {};
    const x = await getRecord("expenses", id);
    if (!x) return res.status(404).json({ error: "Expense not found" });
    if (x.employeeId === me.id) return res.status(403).json({ error: "You can't approve your own claim" });
    if (x.status !== "pending") return res.status(400).json({ error: "Only pending claims can be decided" });
    if (!["approve", "reject"].includes(action)) return res.status(400).json({ error: "Invalid action" });
    x.status = action === "approve" ? "approved" : "rejected";
    x.decisionNotes = String(decisionNotes || "").slice(0, 400);
    x.decidedBy = me.fullName;
    x.decidedAt = new Date().toISOString();
    x.updatedAt = x.decidedAt;
    await putRecord("expenses", x.id, x);
    await notify([x.employeeId], { type: "approval", title: `Your expense claim was ${x.status}`, body: `₦${Number(x.amount).toLocaleString()}${x.decisionNotes ? ` · ${x.decisionNotes}` : ""}`, link: "expenses", actorId: me.id });
    return res.json({ ok: true, expense: x });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
