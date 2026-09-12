import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { set } from "../store.js";
import { renderPayslipPdf } from "../_lib/pdf.js";
import { sendPayslipIssued } from "../_lib/emailTemplates.js";

function computeNet(gross, deductions) {
  const totalDeductions = (deductions || []).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  return Number(gross) - totalDeductions;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    let payroll = await listRecords("payroll");
    if (req.query.employeeId) payroll = payroll.filter(p => p.employeeId === req.query.employeeId);
    return res.json({ ok: true, payroll: payroll.sort((a, b) => b.period.localeCompare(a.period)) });
  }

  if (req.method === "POST") {
    const { employeeId, period, grossAmount, deductions, currency } = req.body || {};
    if (!employeeId || !period || grossAmount == null) {
      return res.status(400).json({ error: "employeeId, period, and grossAmount are required" });
    }
    const employee = await getRecord("employees", employeeId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const id = newId("pay");
    const payroll = {
      id, employeeId, period,
      grossAmount: Number(grossAmount), deductions: deductions || [],
      netAmount: computeNet(grossAmount, deductions),
      currency: currency || employee.salaryCurrency || "NGN",
      status: "draft", payslipPdfKey: null, issuedAt: null,
    };
    await putRecord("payroll", id, payroll);
    return res.json({ ok: true, payroll });
  }

  if (req.method === "PATCH") {
    const { id, action } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const payroll = await getRecord("payroll", id);
    if (!payroll) return res.status(404).json({ error: "Payroll entry not found" });

    if (action === "issue") {
      if (payroll.status !== "draft") return res.status(400).json({ error: "Only draft entries can be issued" });
      const employee = await getRecord("employees", payroll.employeeId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });

      const pdfBytes = await renderPayslipPdf(payroll, employee);
      const key = `orionsoft:files:payslip_${id}`;
      await set(key, Buffer.from(pdfBytes).toString("base64"));

      payroll.status = "issued";
      payroll.payslipPdfKey = key;
      payroll.issuedAt = new Date().toISOString();
      await putRecord("payroll", id, payroll);

      try { await sendPayslipIssued(payroll, employee, Buffer.from(pdfBytes)); } catch { /* best-effort */ }

      return res.json({ ok: true, payroll });
    }

    if (action === "mark_paid") {
      if (payroll.status !== "issued") return res.status(400).json({ error: "Only issued entries can be marked paid" });
      payroll.status = "paid";
      await putRecord("payroll", id, payroll);
      return res.json({ ok: true, payroll });
    }

    if (payroll.status !== "draft") {
      return res.status(400).json({ error: "Only draft entries can be edited directly" });
    }
    const { grossAmount, deductions, currency } = req.body;
    if (grossAmount != null) payroll.grossAmount = Number(grossAmount);
    if (deductions !== undefined) payroll.deductions = deductions;
    if (currency !== undefined) payroll.currency = currency;
    payroll.netAmount = computeNet(payroll.grossAmount, payroll.deductions);
    await putRecord("payroll", id, payroll);
    return res.json({ ok: true, payroll });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
