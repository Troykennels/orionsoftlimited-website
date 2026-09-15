import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { set } from "../store.js";
import { renderPayslipPdf } from "../_lib/pdf.js";
import { sendPayslipIssued } from "../_lib/emailTemplates.js";
import { resolveAccount, createRecipient, initiateTransfer } from "../_lib/paystackTransfer.js";

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
      paidAmount: null, transferReference: null, transferRecipientCode: null, paidAt: null, payoutError: null,
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

    // Read-only: lets the admin see the real, Paystack-verified account
    // holder name before committing to a payout, without changing anything.
    if (action === "resolve_bank") {
      const { bankCode, accountNumber } = req.body;
      if (!bankCode || !accountNumber) return res.status(400).json({ error: "bankCode and accountNumber are required" });
      try {
        const resolved = await resolveAccount(accountNumber, bankCode);
        return res.json({ ok: true, ...resolved });
      } catch (err) {
        return res.status(502).json({ error: err.message });
      }
    }

    if (action === "pay") {
      if (payroll.status !== "issued") return res.status(400).json({ error: "Only issued entries awaiting payment can be paid" });
      if (payroll.currency !== "NGN") return res.status(400).json({ error: "Automatic bank transfer only supports NGN. Use \"Mark Paid\" to record this payment manually." });

      const { amount, bankCode } = req.body;
      const payAmount = Number(amount);
      if (!payAmount || payAmount <= 0) return res.status(400).json({ error: "A valid amount is required" });
      if (!bankCode) return res.status(400).json({ error: "bankCode is required" });

      const employee = await getRecord("employees", payroll.employeeId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      if (!employee.bankAccountNumber) return res.status(400).json({ error: "This employee has no bank account number on file" });

      try {
        const resolved = await resolveAccount(employee.bankAccountNumber, bankCode);

        let recipientCode = employee.paystackRecipientCode;
        if (!recipientCode || employee.bankCode !== bankCode) {
          recipientCode = await createRecipient({ name: resolved.accountName, accountNumber: employee.bankAccountNumber, bankCode });
          employee.bankCode = bankCode;
          employee.paystackRecipientCode = recipientCode;
          await putRecord("employees", employee.id, employee);
        }

        const reference = `payroll_${payroll.id}`;
        const transfer = await initiateTransfer({
          amount: payAmount, recipientCode, reference,
          reason: `Salary — ${payroll.period}`,
        });

        if (transfer.status === "otp") {
          return res.status(409).json({ error: "Your Paystack account still requires OTP for transfers. Go to your Paystack Dashboard → Settings → Preferences and disable OTP for transfers, then try again." });
        }

        payroll.status = "processing";
        payroll.paidAmount = payAmount;
        payroll.transferReference = reference;
        payroll.transferRecipientCode = recipientCode;
        payroll.payoutError = null;
        await putRecord("payroll", id, payroll);

        return res.json({ ok: true, payroll });
      } catch (err) {
        return res.status(502).json({ error: err.message || "Payout failed" });
      }
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
