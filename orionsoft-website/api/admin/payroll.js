import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { requireAuth, verifyPassword } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { set } from "../store.js";
import { renderPayslipPdf } from "../_lib/pdf.js";
import { sendPayslipIssued } from "../_lib/emailTemplates.js";
import { resolveAccount, createRecipient, initiateTransfer, verifyTransfer } from "../_lib/paystackTransfer.js";
import { notifyCommissionAdded } from "../_lib/emailTemplates.js";

function computeNet(gross, deductions) {
  const totalDeductions = (deductions || []).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  return Number(gross) - totalDeductions;
}

function commissionsTotal(commissions) {
  return (commissions || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
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
    const { employeeId, period, baseSalary, deductions, currency } = req.body || {};
    if (!employeeId || !period || baseSalary == null) {
      return res.status(400).json({ error: "employeeId, period, and baseSalary are required" });
    }
    const employee = await getRecord("employees", employeeId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const id = newId("pay");
    const gross = Number(baseSalary);
    const payroll = {
      id, employeeId, period,
      baseSalary: gross, commissions: [], // commissions accrue via the add_commission action through the month
      grossAmount: gross, deductions: deductions || [],
      netAmount: computeNet(gross, deductions),
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
      if (session.adminRole !== "superadmin") return res.status(403).json({ error: "Only a super admin can mark payroll as paid" });
      if (payroll.status !== "issued") return res.status(400).json({ error: "Only issued entries can be marked paid" });
      payroll.status = "paid";
      await putRecord("payroll", id, payroll);
      await logAudit(session, "mark_paid", `payroll ${payroll.id}`, `${payroll.currency} ${payroll.netAmount} for ${payroll.period} (manual)`);
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
      if (session.adminRole !== "superadmin") return res.status(403).json({ error: "Only a super admin can send a bank transfer" });
      if (payroll.status !== "issued") return res.status(400).json({ error: "Only issued entries awaiting payment can be paid" });
      if (payroll.currency !== "NGN") return res.status(400).json({ error: "Automatic bank transfer only supports NGN. Use \"Mark Paid\" to record this payment manually." });

      const { amount, bankCode, pin } = req.body;
      const payAmount = Number(amount);
      if (!payAmount || payAmount <= 0) return res.status(400).json({ error: "A valid amount is required" });
      if (!bankCode) return res.status(400).json({ error: "bankCode is required" });

      const actingAdmin = await getRecord("admins", session.sub);
      if (!actingAdmin?.securityPinHash) {
        return res.status(403).json({ error: "Set an approval PIN under My Account before sending a bank transfer." });
      }
      if (!pin || !(await verifyPassword(pin, actingAdmin.securityPinHash))) {
        return res.status(401).json({ error: "Incorrect approval PIN." });
      }

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
          reason: `Salary: ${payroll.period}`,
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
        await logAudit(session, "pay_salary", `payroll ${payroll.id}`, `${payroll.currency} ${payAmount} to ${resolved.accountName} (${payroll.period})`);

        return res.json({ ok: true, payroll });
      } catch (err) {
        return res.status(502).json({ error: err.message || "Payout failed" });
      }
    }

    // Lets an admin manually re-check a transfer stuck in "processing" —
    // e.g. the confirming webhook never arrived — instead of it being a
    // permanent dead end with no way to know if the employee got paid.
    if (action === "check_status") {
      if (payroll.status !== "processing") return res.status(400).json({ error: "Only a payment in progress can be checked" });
      if (!payroll.transferReference) return res.status(400).json({ error: "This entry has no transfer to check" });
      try {
        const result = await verifyTransfer(payroll.transferReference);
        if (result.status === "success") {
          payroll.status = "paid";
          payroll.paidAt = new Date().toISOString();
          payroll.payoutError = null;
          await putRecord("payroll", id, payroll);
          await logAudit(session, "check_status", `payroll ${payroll.id}`, "Transfer confirmed successful");
        } else if (result.status === "failed" || result.status === "reversed") {
          payroll.status = "issued"; // back to retryable
          payroll.payoutError = `Transfer ${result.status}`;
          await putRecord("payroll", id, payroll);
          await logAudit(session, "check_status", `payroll ${payroll.id}`, `Transfer ${result.status}, reset to issued`);
        }
        // still pending — leave as "processing", nothing to update
        return res.json({ ok: true, payroll, transferStatus: result.status });
      } catch (err) {
        return res.status(502).json({ error: err.message || "Could not check transfer status" });
      }
    }

    // Logs one commission against a draft entry, recomputes totals, and
    // emails the employee right away so nothing gets discovered as a
    // surprise at month-end — matches how the running total accrues.
    if (action === "add_commission") {
      if (payroll.status !== "draft") return res.status(400).json({ error: "Commissions can only be added to a draft (not-yet-issued) payroll entry" });
      const { amount, label } = req.body;
      const commissionAmount = Number(amount);
      if (!commissionAmount || commissionAmount <= 0) return res.status(400).json({ error: "A valid commission amount is required" });

      const commission = { id: newId("com"), amount: commissionAmount, label: label || "Commission", addedAt: new Date().toISOString(), addedBy: session.sub };
      payroll.commissions = [...(payroll.commissions || []), commission];
      payroll.grossAmount = Number(payroll.baseSalary || 0) + commissionsTotal(payroll.commissions);
      payroll.netAmount = computeNet(payroll.grossAmount, payroll.deductions);
      await putRecord("payroll", id, payroll);

      const employee = await getRecord("employees", payroll.employeeId);
      if (employee) {
        try { await notifyCommissionAdded(payroll, employee, commission); } catch { /* best-effort */ }
      }

      return res.json({ ok: true, payroll });
    }

    if (action === "remove_commission") {
      if (payroll.status !== "draft") return res.status(400).json({ error: "Commissions can only be edited on a draft entry" });
      const { commissionId } = req.body;
      payroll.commissions = (payroll.commissions || []).filter(c => c.id !== commissionId);
      payroll.grossAmount = Number(payroll.baseSalary || 0) + commissionsTotal(payroll.commissions);
      payroll.netAmount = computeNet(payroll.grossAmount, payroll.deductions);
      await putRecord("payroll", id, payroll);
      return res.json({ ok: true, payroll });
    }

    if (payroll.status !== "draft") {
      return res.status(400).json({ error: "Only draft entries can be edited directly" });
    }
    const { baseSalary, deductions, currency } = req.body;
    if (baseSalary != null) payroll.baseSalary = Number(baseSalary);
    if (deductions !== undefined) payroll.deductions = deductions;
    if (currency !== undefined) payroll.currency = currency;
    payroll.grossAmount = Number(payroll.baseSalary || 0) + commissionsTotal(payroll.commissions);
    payroll.netAmount = computeNet(payroll.grossAmount, payroll.deductions);
    await putRecord("payroll", id, payroll);
    return res.json({ ok: true, payroll });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
