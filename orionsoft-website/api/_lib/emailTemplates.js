// Branded transactional email templates — one function per state transition.
// Every admin/staff workflow that changes a record's status calls the matching
// function here, which renders the HTML and sends it via api/_lib/mailer.js.
import { sendEmail, brandedShell } from "./mailer.js";
import { renderWeeklyReportPdf, reportPdfName } from "./reportPdf.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://orionsoftlimited.com";

// Escape anything a member of the public typed before it goes into email HTML.
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function btn(href, label) {
  return `<p style="margin-top:20px;"><a href="${href}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">${label}</a></p>`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Weekly reports ──────────────────────────────────────────────────────────
// The whole report, section by section in the order of the form. Free text
// keeps its line breaks; empty sections are left out.
const naira = v => `₦${(Number(v) || 0).toLocaleString("en-NG")}`;
const para = v => esc(v).replace(/\r?\n/g, "<br>");

function rSection(title, inner) {
  return `<tr><td style="padding:22px 0 0;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#A88A2E;padding-bottom:6px;border-bottom:2px solid #F0E6C8;margin-bottom:12px;">${title}</div>
    ${inner}
  </td></tr>`;
}

function rText(label, value) {
  if (!value) return "";
  return `<div style="margin:0 0 14px;">
    ${label ? `<div style="font-size:12.5px;font-weight:700;color:#0A2540;margin-bottom:4px;">${label}</div>` : ""}
    <div style="font-size:14px;color:#3A4556;line-height:1.7;">${para(value)}</div>
  </div>`;
}

// Figures as a 2-column grid (reads well on phones, unlike a wide row).
function rFigures(items, values) {
  const cells = items.map(([k, label, money]) => `<td width="50%" style="padding:4px;">
    <div style="background:#F4F6FA;border-radius:8px;padding:10px 12px;">
      <div style="font-size:11.5px;color:#6B7A96;">${label}</div>
      <div style="font-size:17px;font-weight:800;color:#0A2540;margin-top:2px;">${money ? naira(values?.[k]) : (Number(values?.[k]) || 0)}</div>
    </div></td>`);
  let rows = "";
  for (let i = 0; i < cells.length; i += 2) rows += `<tr>${cells[i]}${cells[i + 1] || '<td width="50%"></td>'}</tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -4px;">${rows}</table>`;
}

// Each row of a repeating section as its own small card: a title line plus
// labelled details, which stays readable in any mail client width.
function rCards(rows, { title, badge, fields }) {
  return rows.map(row => {
    const details = fields
      .map(([k, label, kind]) => {
        const v = row?.[k];
        if (v === "" || v == null) return "";
        const shown = kind === "money" ? naira(v) : kind === "date" ? esc(fmtDate(v)) : esc(v);
        return `<div style="font-size:13px;color:#3A4556;line-height:1.6;"><span style="color:#6B7A96;">${label}:</span> ${shown}</div>`;
      }).join("");
    return `<div style="border:1px solid #E5E9F0;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
      <div style="font-size:14px;font-weight:700;color:#0A2540;margin-bottom:4px;">${esc(row?.[title] || "—")}${badge && row?.[badge] ? ` <span style="font-size:11px;font-weight:700;color:#1D4ED8;background:#E8EFFE;border-radius:10px;padding:2px 8px;margin-left:4px;">${esc(row[badge])}</span>` : ""}</div>
      ${details}
    </div>`;
  }).join("");
}

function reportEmailBody(report, employee, { intro, href, label }) {
  const r = report;
  const meta = [["Staff", employee?.fullName], ["Week", `${fmtDate(r.weekStart)} to ${fmtDate(r.weekEnd)}`], ["Territory", r.territory], ["Reporting manager", r.reportingManager], ["Product focus", r.productFocus]]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="font-size:13px;color:#6B7A96;padding:4px 12px 4px 0;white-space:nowrap;vertical-align:top;">${k}</td><td style="font-size:13px;color:#0A2540;font-weight:600;padding:4px 0;">${esc(v)}</td></tr>`).join("");
  const targets = (r.keyTargets || []).filter(Boolean);
  const intel = [["Challenges", r.challenges], ["Objections from prospects", r.objections], ["Support needed", r.supportNeeded], ["Competitors encountered", r.competitors], ["Competitor pricing/features", r.competitorPricing], ["Market trends", r.marketTrends], ["Other information", r.otherInfo]].filter(([, v]) => v);

  return `
    <h2 style="color:#0A2540;font-size:19px;margin:0 0 6px;">Weekly report: ${esc(employee?.fullName || "Staff member")}</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.6;margin:0 0 16px;">${intro}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="background:#F4F6FA;border-radius:10px;padding:12px 16px;width:100%;">${meta}</table>
    ${btn(href, label)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rSection("1. Weekly summary", rText("", r.summary) + rFigures([["prospectsContacted", "Prospects contacted"], ["physicalVisits", "Physical visits"], ["meetingsHeld", "Meetings held"], ["productDemos", "Product demos"], ["proposalsSent", "Proposals sent"], ["newLeadsGenerated", "New leads"], ["salesClosed", "Sales closed"], ["salesValue", "Sales value", true]], r.totals))}
      ${r.prospects?.length ? rSection(`2. Prospect &amp; customer activity (${r.prospects.length})`, rCards(r.prospects, { title: "organisation", badge: "status", fields: [["contactPerson", "Contact"], ["contactDate", "Date", "date"], ["productInterest", "Interest"], ["nextAction", "Next action"]] })) : ""}
      ${r.sales?.length ? rSection(`3. Sales &amp; revenue (${r.sales.length})`, rCards(r.sales, { title: "customer", fields: [["productPlan", "Product/plan"], ["saleValue", "Value", "money"], ["paymentStatus", "Payment"], ["onboardingStatus", "Onboarding"], ["expectedCommission", "Commission", "money"]] })) : ""}
      ${r.followUps?.length ? rSection(`4. Follow-ups for next week (${r.followUps.length})`, rCards(r.followUps, { title: "prospect", fields: [["reason", "Reason"], ["plannedDate", "Planned", "date"], ["expectedOutcome", "Expected outcome"]] })) : ""}
      ${intel.length ? rSection("5. Challenges &amp; market intelligence", intel.map(([l, v]) => rText(l, v)).join("")) : ""}
      ${rSection("6. Next week's plan", rFigures([["organisationsToVisit", "Organisations to visit"], ["prospectsToFollowUp", "Prospects to follow up"], ["meetingsPlanned", "Meetings planned"], ["demosPlanned", "Demos planned"], ["expectedProposals", "Expected proposals"], ["expectedSales", "Expected sales", true]], r.nextWeekPlan)
        + (targets.length ? `<div style="font-size:12.5px;font-weight:700;color:#0A2540;margin:14px 0 4px;">Key targets</div><ol style="margin:0;padding-left:20px;font-size:14px;color:#3A4556;line-height:1.7;">${targets.map(t => `<li>${esc(t)}</li>`).join("")}</ol>` : ""))}
    </table>
    <p style="color:#6B7A96;font-size:12px;line-height:1.6;margin-top:22px;">${esc(employee?.fullName || "The employee")} confirmed this report is accurate. Submitted ${esc(fmtDate(r.submittedAt || Date.now()))}.</p>
  `;
}

// Sent to the admin inbox and to each of the submitter's managers (line
// manager and/or the named reporting manager), each with their own review link.
export async function notifyReportSubmitted(report, employee, managers = []) {
  const name = employee?.fullName || "Employee";
  const subject = `Weekly report: ${name} (${fmtDate(report.weekStart)} to ${fmtDate(report.weekEnd)})`;
  // The same report as a PDF attachment, for filing or forwarding.
  let attachments;
  try { attachments = [{ filename: reportPdfName(report, employee), content: Buffer.from(await renderWeeklyReportPdf(report, employee)) }]; } catch { /* send without it */ }
  const sends = [sendEmail(ADMIN_EMAIL, subject, brandedShell(reportEmailBody(report, employee, {
    intro: `${esc(name)} has submitted their weekly report. The full report is below and attached as a PDF.`,
    href: `${APP_BASE_URL}/admin`, label: "Review in Admin →",
  }), { title: "Weekly Report Submitted" }), { kind: "report_submitted", attachments })];
  for (const m of managers) {
    if (!m?.email || m.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) continue;
    sends.push(sendEmail(m.email, subject, brandedShell(reportEmailBody(report, employee, {
      intro: `Hi ${esc(m.fullName)}, ${esc(name)} reports to you and has submitted their weekly report. Please review it in the Staff Office.`,
      href: `${APP_BASE_URL}/staff/approvals`, label: "Review in the Staff Office →",
    }), { title: "Weekly Report For Your Review" }), { kind: "report_submitted_manager", attachments }));
  }
  return Promise.allSettled(sends);
}

export async function notifyReportReviewed(report, employee) {
  const approved = report.status === "approved";
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Your weekly report was ${report.status}</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Hi ${employee?.fullName || ""}, your report for ${fmtDate(report.weekStart)} – ${fmtDate(report.weekEnd)} has been
      <strong style="color:${approved ? "#10B981" : "#F43F5E"};">${report.status}</strong>.
    </p>
    ${report.reviewNotes ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;"><strong>Reviewer notes:</strong><br>${para(report.reviewNotes)}</p>` : ""}
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
    <p style="margin-top:20px;"><a href="${APP_BASE_URL}/admin" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Review in Admin →</a></p>
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
      <strong>${esc(applicant.fullName)}</strong> applied for <strong>${esc(applicant.roleAppliedFor || "a role")}</strong>
      (ref ${esc(applicant.reference || applicant.id)}).
    </p>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">${esc(applicant.email)} · ${esc(applicant.phone || "No phone")} · ${esc(applicant.location || "No location")}</p>
    ${btn(`${APP_BASE_URL}/admin`, "Review in Admin →")}
  `, { title: "New Job Application" });
  return sendEmail(ADMIN_EMAIL, `New application: ${applicant.fullName} (${applicant.roleAppliedFor || "role"})`, html, { kind: "applicant_received" });
}

// Confirmation to the candidate, with their reference and portal link.
export async function sendApplicationReceived(applicant, portalLink) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">We've received your application</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Hi ${esc(applicant.fullName)}, thank you for applying for <strong>${esc(applicant.roleAppliedFor)}</strong> at Orion Soft.
      You can track your application, see interview details and message our recruiting team from your applicant portal.
    </p>
    <table role="presentation" style="background:#F4F6FA;border-radius:10px;padding:16px;margin:16px 0;width:100%;">
      <tr><td style="font-size:13px;color:#3A4556;padding:4px 0;"><strong>Application reference:</strong> ${esc(applicant.reference)}</td></tr>
      <tr><td style="font-size:13px;color:#3A4556;padding:4px 0;"><strong>Email:</strong> ${esc(applicant.email)}</td></tr>
    </table>
    ${btn(portalLink, "Open my applicant portal →")}
    <p style="color:#6B7A96;font-size:12px;line-height:1.7;">Keep your reference safe. You can also sign in at ${APP_BASE_URL}/applicant with your email and reference.</p>
  `, { title: "Application Received" });
  return sendEmail(applicant.email, `Application received: ${applicant.roleAppliedFor} (ref ${applicant.reference})`, html, { kind: "applicant_confirmation" });
}

const STATUS_LABEL = { applied: "Applied", reviewing: "Under review", assessment: "Assessment", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Not progressing", withdrawn: "Withdrawn" };

export async function notifyApplicantStatus(applicant, portalLink, publicNote = "") {
  const label = STATUS_LABEL[applicant.status] || applicant.status;
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Update on your application</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Hi ${esc(applicant.fullName)}, your application for <strong>${esc(applicant.roleAppliedFor || "the role")}</strong> has moved to:
      <strong>${esc(label)}</strong>.
    </p>
    ${publicNote ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;background:#F4F6FA;border-radius:10px;padding:14px;">${esc(publicNote)}</p>` : ""}
    ${portalLink ? btn(portalLink, "View in my applicant portal →") : ""}
  `, { title: "Application Update" });
  return sendEmail(applicant.email, `Your Orion Soft application: ${label}`, html, { kind: "applicant_status" });
}

export async function notifyApplicantMessage(applicant, text, portalLink) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">New message from Orion Soft Recruiting</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">Hi ${esc(applicant.fullName)}, about your application for <strong>${esc(applicant.roleAppliedFor)}</strong>:</p>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;background:#F4F6FA;border-radius:10px;padding:14px;white-space:pre-wrap;">${esc(text)}</p>
    ${btn(portalLink, "Reply in my applicant portal →")}
  `, { title: "Message from Recruiting" });
  return sendEmail(applicant.email, `Message about your ${applicant.roleAppliedFor} application`, html, { kind: "applicant_message" });
}

export async function notifyAdminCandidateUpdate(applicant, what) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Candidate update</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;"><strong>${esc(applicant.fullName)}</strong> (${esc(applicant.roleAppliedFor)}, ref ${esc(applicant.reference || applicant.id)})</p>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;background:#F4F6FA;border-radius:10px;padding:14px;white-space:pre-wrap;">${esc(what)}</p>
    ${btn(`${APP_BASE_URL}/admin`, "Open in Admin →")}
  `, { title: "Candidate Update" });
  return sendEmail(ADMIN_EMAIL, `Candidate update: ${applicant.fullName}`, html, { kind: "applicant_update" });
}

// ─── Field verification ─────────────────────────────────────────────────────
export async function sendVisitConfirmation(visit, employee, link) {
  const when = new Date(visit.checkIn.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Please confirm our visit</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      ${esc(employee.fullName)} (${esc(employee.title || "Orion Soft")}) recorded a visit to <strong>${esc(visit.organisation)}</strong> on ${esc(when)}${visit.purpose ? ` about <em>${esc(visit.purpose)}</em>` : ""}.
    </p>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">It takes 10 seconds: tell us whether this visit happened and how it went. This helps us serve you better.</p>
    ${btn(link, "Confirm the visit →")}
    <p style="color:#6B7A96;font-size:12px;">If nobody from Orion Soft visited you, please use the link and choose "No". Thank you.</p>
  `, { title: "Visit Confirmation" });
  return sendEmail(visit.contactEmail, `Did ${employee.fullName} from Orion Soft visit you?`, html, { kind: "visit_confirmation" });
}

export async function notifySpotCheck(employee, spot) {
  const due = new Date(spot.dueAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">📍 Location check</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">Hi ${esc(employee.fullName)}, please confirm your location with a quick photo before <strong>${esc(due)}</strong>.</p>
    ${btn(`${APP_BASE_URL}/staff/visits`, "Confirm my location →")}
  `, { title: "Location Check" });
  return sendEmail(employee.email, `Location check: please respond by ${due}`, html, { kind: "spot_check" });
}

// ─── Staff Office alerts by email ───────────────────────────────────────────
// Sent when someone has no phone set up for alerts, so a meeting invite or an
// approval still reaches them without anyone chasing them on WhatsApp.
export async function sendNotificationEmail(employee, { title, body, url }) {
  const href = `${APP_BASE_URL}${url || "/staff"}`;
  const html = brandedShell(`
    <p style="color:#6B7A96;font-size:13px;margin:0 0 8px;">Hi ${esc(String(employee.fullName || "").split(" ")[0])},</p>
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">${esc(title)}</h2>
    ${body ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;white-space:pre-wrap;background:#F4F6FA;border-radius:10px;padding:14px;">${esc(body)}</p>` : ""}
    ${btn(href, "Open in the Staff Office →")}
    <p style="color:#6B7A96;font-size:12px;line-height:1.6;margin-top:22px;">You got this by email because phone alerts aren't turned on for you yet. Open the Staff Office on your phone and tap <strong>Turn on alerts</strong> to get these instantly, with sound.</p>
  `, { title: "Staff Office" });
  return sendEmail(employee.email, title, html, { kind: "staff_notification" });
}

export async function sendAlertsSetupEmail(employee) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Turn on Staff Office alerts on your phone</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">Hi ${esc(String(employee.fullName || "").split(" ")[0])}, meetings, tasks, approvals and messages now ring your phone like any other app, even when the Staff Office is closed. It takes one minute:</p>
    <p style="color:#3A4556;font-size:14px;line-height:1.8;"><strong>Android:</strong> open the link below in Google Chrome, sign in, tap <strong>Install app</strong> if offered, then tap <strong>Turn on alerts</strong> and choose <strong>Allow</strong>.<br>
    <strong>iPhone:</strong> open the link in Safari, tap <strong>Share → Add to Home Screen</strong>, open the Staff Office from your Home Screen, then tap <strong>Turn on alerts</strong> and <strong>Allow</strong>.</p>
    ${btn(`${APP_BASE_URL}/staff`, "Open the Staff Office →")}
  `, { title: "Phone alerts" });
  return sendEmail(employee.email, "Action needed: turn on Staff Office alerts", html, { kind: "alerts_setup" });
}

// ─── Staff Office announcements ─────────────────────────────────────────────
export async function sendAnnouncementEmail(employee, text, from) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">📣 Announcement from ${esc(from)}</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;white-space:pre-wrap;background:#F4F6FA;border-radius:10px;padding:14px;">${esc(text)}</p>
    ${btn(`${APP_BASE_URL}/staff`, "Open the Staff Office →")}
  `, { title: "Staff Announcement" });
  return sendEmail(employee.email, `Announcement: ${String(text).slice(0, 60)}`, html, { kind: "staff_announcement" });
}

// ─── Employees ───────────────────────────────────────────────────────────────
export async function sendEmployeeWelcome(employee, tempPassword) {
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Welcome to Orion Soft, ${employee.fullName}!</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">
      Your Staff Office account has been created. You can sign in at
      <a href="${APP_BASE_URL}/staff">${APP_BASE_URL}/staff</a> to enter the Orion Soft Staff Office: your virtual office for the team feed, messages, meetings, goals, weekly reports, leave and payslips.
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
