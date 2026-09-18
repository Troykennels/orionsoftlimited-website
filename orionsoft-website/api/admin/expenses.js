// Expense & reimbursement tracking — logged against an employee, approved or
// rejected by an admin, then marked reimbursed once actually paid out.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

const CATEGORIES = ["Travel", "Meals & Entertainment", "Office Supplies", "Software & Subscriptions", "Client Costs", "Other"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const expenses = await listRecords("expenses");
    return res.json({ ok: true, expenses: expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), categories: CATEGORIES });
  }

  if (req.method === "POST") {
    const { employeeId, category, amount, currency, description, expenseDate, receiptDataUrl } = req.body || {};
    if (!employeeId || !amount) return res.status(400).json({ error: "employeeId and amount are required" });
    const employee = await getRecord("employees", employeeId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const id = newId("exp");
    const expense = {
      id, employeeId, employeeName: employee.fullName,
      category: CATEGORIES.includes(category) ? category : "Other",
      amount: Number(amount) || 0, currency: currency || "NGN",
      description: description || "", expenseDate: expenseDate || new Date().toISOString().slice(0, 10),
      receiptDataUrl: receiptDataUrl || "", status: "pending",
      decisionNotes: "", decidedBy: "", decidedAt: null,
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };
    await putRecord("expenses", id, expense);
    await logAudit(session, "submit_expense", `expense ${id}`, `${employee.fullName}: ${expense.currency} ${expense.amount}`);
    return res.json({ ok: true, expense });
  }

  if (req.method === "PATCH") {
    const { id, action, decisionNotes } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const expense = await getRecord("expenses", id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    if (action === "approve" || action === "reject") {
      if (expense.status !== "pending") return res.status(400).json({ error: "Only a pending expense can be approved or rejected." });
      expense.status = action === "approve" ? "approved" : "rejected";
      expense.decisionNotes = decisionNotes || "";
      expense.decidedBy = session.name || session.email || "Admin";
      expense.decidedAt = new Date().toISOString();
      expense.updatedAt = new Date().toISOString();
      await putRecord("expenses", id, expense);
      await logAudit(session, `${action}_expense`, `expense ${id}`, expense.employeeName);
      return res.json({ ok: true, expense });
    }

    if (action === "mark_reimbursed") {
      if (expense.status !== "approved") return res.status(400).json({ error: "Only an approved expense can be marked reimbursed." });
      expense.status = "reimbursed";
      expense.reimbursedAt = new Date().toISOString();
      expense.updatedAt = new Date().toISOString();
      await putRecord("expenses", id, expense);
      await logAudit(session, "reimburse_expense", `expense ${id}`, expense.employeeName);
      return res.json({ ok: true, expense });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteRecord("expenses", id);
    await logAudit(session, "delete_expense", `expense ${id}`);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
