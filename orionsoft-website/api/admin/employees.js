import { newId, listRecords, getByLookup, getRecord, putRecord, setLookup, deleteRecord, deleteLookup } from "../_lib/records.js";
import { requireAuth, hashPassword } from "../_lib/auth.js";
import { sendEmployeeWelcome } from "../_lib/emailTemplates.js";

function publicShape(e) {
  const rest = { ...e };
  delete rest.passwordHash;
  return rest;
}

function genTempPassword() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 8);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    if (req.query.id) {
      const employee = await getRecord("employees", req.query.id);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      return res.json({ ok: true, employee: publicShape(employee) });
    }
    const employees = await listRecords("employees");
    return res.json({ ok: true, employees: employees.map(publicShape) });
  }

  if (req.method === "POST") {
    const { fullName, email, phone, title, department, startDate, salaryAmount, salaryCurrency, staffRole } = req.body || {};
    if (!fullName || !email || !title) {
      return res.status(400).json({ error: "fullName, email, and title are required" });
    }
    const existing = await getByLookup("employees", "email", email);
    if (existing) return res.status(409).json({ error: "An employee with that email already exists" });

    const id = newId("emp");
    const tempPassword = genTempPassword();
    const employee = {
      id, role: "staff", staffRole: staffRole === "manager" ? "manager" : "staff",
      fullName, email, phone: phone || "",
      passwordHash: await hashPassword(tempPassword),
      title, department: department || "", startDate: startDate || new Date().toISOString().slice(0, 10),
      status: "active",
      bankName: "", bankAccountNumber: "", bankAccountName: "",
      salaryAmount: salaryAmount || 0, salaryCurrency: salaryCurrency || "NGN",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: session.sub,
    };
    await putRecord("employees", id, employee);
    await setLookup("employees", "email", email, id);

    try { await sendEmployeeWelcome(employee, tempPassword); } catch { /* best-effort */ }

    return res.json({ ok: true, employee: publicShape(employee) });
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const employee = await getRecord("employees", id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const allowed = ["fullName", "phone", "title", "department", "status", "staffRole", "salaryAmount", "salaryCurrency", "bankName", "bankAccountNumber", "bankAccountName"];
    for (const key of allowed) {
      if (updates[key] !== undefined) employee[key] = updates[key];
    }
    employee.updatedAt = new Date().toISOString();
    await putRecord("employees", id, employee);
    return res.json({ ok: true, employee: publicShape(employee) });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const employee = await getRecord("employees", id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    await deleteRecord("employees", id);
    await deleteLookup("employees", "email", employee.email);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
