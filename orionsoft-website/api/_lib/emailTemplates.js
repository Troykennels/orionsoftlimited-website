// Branded transactional email templates — one function per state transition.
// Every admin/staff workflow that changes a record's status calls the matching
// function here, which renders the HTML and sends it via api/_lib/mailer.js.
import { sendEmail, brandedShell } from "./mailer.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://orionsoftlimited.com";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Weekly reports ──────────────────────────────────────────────────────────
export async function notifyReportSubmitted(report, employee) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">New weekly report submitted</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      <strong>${employee?.fullName || "An employee"}</strong> submitted their report for
      ${fmtDate(report.weekStart)} – ${fmtDate(report.weekEnd)}.
    </p>
    ${report.productFocus ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;"><strong>Focus:</strong> ${report.productFocus}</p>` : ""}
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">${report.summary}</p>
    <p style="margin-top:20px;"><a href="${APP_BASE_URL}/#admin" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Review in Admin →</a></p>
  `, { title: "Weekly Report Submitted" });
  return sendEmail(ADMIN_EMAIL, `Weekly report submitted: ${employee?.fullName || "Employee"}`, html, { kind: "report_submitted" });
}

export async function notifyReportReviewed(report, employee) {
  const approved = report.status === "approved";
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Your weekly report was ${report.status}</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Hi ${employee?.fullName || ""}, your report for ${fmtDate(report.weekStart)} – ${fmtDate(report.weekEnd)} has been
      <strong style="color:${approved ? "#10B981" : "#F43F5E"};">${report.status}</strong>.
    </p>
    ${report.reviewNotes ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;"><strong>Reviewer notes:</strong> ${report.reviewNotes}</p>` : ""}
  `, { title: "Weekly Report Reviewed" });
  return sendEmail(employee.email, `Your weekly report was ${report.status}`, html, { kind: "report_reviewed" });
}

// ─── Leave requests ──────────────────────────────────────────────────────────
export async function notifyLeaveSubmitted(leave, employee) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">New leave request</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      <strong>${employee?.fullName || "An employee"}</strong> requested ${leave.type} leave from
      ${fmtDate(leave.startDate)} to ${fmtDate(leave.endDate)}.
    </p>
    ${leave.reason ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;"><strong>Reason:</strong> ${leave.reason}</p>` : ""}
    <p style="margin-top:20px;"><a href="${APP_BASE_URL}/#admin" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Review in Admin →</a></p>
  `, { title: "Leave Request Submitted" });
  return sendEmail(ADMIN_EMAIL, `Leave request: ${employee?.fullName || "Employee"}`, html, { kind: "leave_submitted" });
}

export async function notifyLeaveDecision(leave, employee) {
  const approved = leave.status === "approved";
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Your leave request was ${leave.status}</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Hi ${employee?.fullName || ""}, your ${leave.type} leave request (${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)}) has been
      <strong style="color:${approved ? "#10B981" : "#F43F5E"};">${leave.status}</strong>.
    </p>
    ${leave.decisionNotes ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;"><strong>Notes:</strong> ${leave.decisionNotes}</p>` : ""}
  `, { title: "Leave Request Decision" });
  return sendEmail(employee.email, `Your leave request was ${leave.status}`, html, { kind: "leave_decision" });
}

// ─── Recruitment ─────────────────────────────────────────────────────────────
export async function notifyNewApplicant(applicant) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">New job application</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      <strong>${applicant.fullName}</strong> applied for <strong>${applicant.roleAppliedFor || "a role"}</strong>.
    </p>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">${applicant.email} · ${applicant.phone || "No phone"} · ${applicant.location || "No location"}</p>
    <p style="margin-top:20px;"><a href="${APP_BASE_URL}/#admin" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Review in Admin →</a></p>
  `, { title: "New Job Application" });
  return sendEmail(ADMIN_EMAIL, `New application: ${applicant.fullName} (${applicant.roleAppliedFor || "role"})`, html, { kind: "applicant_received" });
}

export async function notifyApplicantStatus(applicant) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Update on your application</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Hi ${applicant.fullName}, your application for <strong>${applicant.roleAppliedFor || "the role"}</strong> has moved to:
      <strong>${applicant.status.replace(/_/g, " ")}</strong>.
    </p>
  `, { title: "Application Update" });
  return sendEmail(applicant.email, `Your Orion Soft application: ${applicant.status.replace(/_/g, " ")}`, html, { kind: "applicant_status" });
}

// ─── Employees ───────────────────────────────────────────────────────────────
export async function sendEmployeeWelcome(employee, tempPassword) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Welcome to Orion Soft, ${employee.fullName}!</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Your staff portal account has been created. You can sign in at
      <a href="${APP_BASE_URL}/staff">${APP_BASE_URL}/staff</a> to submit weekly reports, request leave, and view your payslips.
    </p>
    <table role="presentation" style="background:#F4F6FA;border-radius:10px;padding:16px;margin:16px 0;width:100%;">
      <tr><td style="font-size:13px;color:#3A4556;padding:4px 0;"><strong>Email:</strong> ${employee.email}</td></tr>
      <tr><td style="font-size:13px;color:#3A4556;padding:4px 0;"><strong>Temporary password:</strong> ${tempPassword}</td></tr>
    </table>
    <p style="color:#3A4556;font-size:13px;line-height:1.7;">Please sign in and keep your password secure.</p>
  `, { title: "Welcome to the Team" });
  return sendEmail(employee.email, "Welcome to Orion Soft Limited: your staff portal access", html, { kind: "employee_welcome" });
}

// ─── Contracts ───────────────────────────────────────────────────────────────
export async function sendContractEmail(contract, signLink, pdfBuffer) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">${contract.title}</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Dear ${contract.recipientName}, please find your ${contract.type.replace(/_/g, " ")} attached.
      ${signLink ? "Click below to review and sign electronically." : ""}
    </p>
    ${signLink ? `<p style="margin-top:20px;"><a href="${signLink}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Review & Sign →</a></p>` : ""}
  `, { title: "Document From Orion Soft Limited" });
  return sendEmail(contract.recipientEmail, contract.title, html, {
    kind: "contract_sent",
    attachments: pdfBuffer ? [{ filename: `${contract.title.replace(/[^a-z0-9]+/gi, "-")}.pdf`, content: pdfBuffer }] : undefined,
  });
}

export async function notifyContractSigned(contract) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Contract signed</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      <strong>${contract.signedByName}</strong> signed "${contract.title}" on ${fmtDate(contract.signedAt)}.
    </p>
  `, { title: "Contract Signed" });
  return sendEmail(ADMIN_EMAIL, `Signed: ${contract.title}`, html, { kind: "contract_signed" });
}

export async function notifyMilestoneCompleted(contract, milestone) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Milestone completed</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      "<strong>${milestone.title}</strong>" on contract "${contract.title}" was marked complete.
    </p>
  `, { title: "Milestone Completed" });
  return sendEmail(ADMIN_EMAIL, `Milestone completed: ${contract.title}`, html, { kind: "milestone_completed" });
}

// ─── Payments ────────────────────────────────────────────────────────────────
export async function sendPaymentReceipt(payment, contract) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Payment received, thank you!</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      We've received your payment of <strong>${payment.currency} ${Number(payment.amount).toLocaleString()}</strong>
      for "${contract.title}".
    </p>
    <table role="presentation" style="background:#F4F6FA;border-radius:10px;padding:16px;margin:16px 0;width:100%;">
      <tr><td style="font-size:13px;color:#3A4556;padding:4px 0;"><strong>Reference:</strong> ${payment.reference}</td></tr>
      <tr><td style="font-size:13px;color:#3A4556;padding:4px 0;"><strong>Date:</strong> ${fmtDate(payment.verifiedAt || payment.createdAt)}</td></tr>
    </table>
  `, { title: "Payment Receipt" });
  return sendEmail(contract.recipientEmail, `Payment receipt: ${contract.title}`, html, { kind: "payment_receipt" });
}

// ─── Payroll ─────────────────────────────────────────────────────────────────
export async function sendPayslipIssued(payroll, employee, pdfBuffer) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Your payslip for ${payroll.period} is ready</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Hi ${employee.fullName}, your payslip for ${payroll.period} has been issued.
      Net pay: <strong>${payroll.currency} ${Number(payroll.netAmount).toLocaleString()}</strong>.
      It's also available under My Payslips in the staff portal.
    </p>
  `, { title: "Payslip Issued" });
  return sendEmail(employee.email, `Payslip: ${payroll.period}`, html, {
    kind: "payslip_issued",
    attachments: pdfBuffer ? [{ filename: `payslip-${payroll.period}.pdf`, content: pdfBuffer }] : undefined,
  });
}

export async function notifyCommissionAdded(payroll, employee, commission) {
  const commissionsSoFar = (payroll.commissions || []).length;
  const commissionsTotal = (payroll.commissions || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">A commission was added to your ${payroll.period} pay</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Hi ${employee.fullName}, <strong>${payroll.currency} ${Number(commission.amount).toLocaleString()}</strong> (${commission.label}) was just added to your earnings for ${payroll.period}.
    </p>
    <table role="presentation" style="background:#F4F6FA;border-radius:10px;padding:16px;margin:16px 0;width:100%;">
      <tr><td style="font-size:13px;color:#3A4556;padding:4px 0;"><strong>Base salary:</strong> ${payroll.currency} ${Number(payroll.baseSalary || 0).toLocaleString()}</td></tr>
      <tr><td style="font-size:13px;color:#3A4556;padding:4px 0;"><strong>Commissions this month (${commissionsSoFar}):</strong> ${payroll.currency} ${commissionsTotal.toLocaleString()}</td></tr>
      <tr><td style="font-size:13px;color:#0A2540;font-weight:700;padding:8px 0 0;border-top:1px solid #E5E9F0;margin-top:8px;">Running total: ${payroll.currency} ${Number(payroll.grossAmount).toLocaleString()}</td></tr>
    </table>
    <p style="color:#6B7A96;font-size:12.5px;line-height:1.6;">This updates live under My Payslips in the staff portal. Your final payslip is issued at month-end.</p>
  `, { title: "Commission Added" });
  return sendEmail(employee.email, `Commission added: ${payroll.currency} ${Number(commission.amount).toLocaleString()} (${payroll.period})`, html, { kind: "commission_added" });
}
