// Data subject access (NDPA 2023 s.34): everything the company holds about
// the signed-in staff member, as JSON. Photos are left out (they're large);
// HR can provide copies on request.
import { listRecords } from "../_lib/records.js";
import { SECRET_FIELDS } from "../_lib/auth.js";
import { officeContext, listNotifications, listActivity, logActivity } from "../_lib/office.js";

const SECRET = [...SECRET_FIELDS, "paystackRecipientCode"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me } = ctx;
  const mine = async (entity, key = "employeeId") => (await listRecords(entity)).filter(r => r[key] === me.id);
  const profile = { ...me };
  for (const k of SECRET) delete profile[k];

  const [attendance, visits, spotchecks, leave, expenses, reports, tasks, goals, payroll, checklists, notifications, activity] = await Promise.all([
    mine("attendance"), mine("visits"), mine("spotchecks"), mine("leave"), mine("expenses"), mine("reports"),
    mine("tasks", "assigneeId"), mine("goals", "ownerId"), mine("payroll"), mine("checklists"),
    listNotifications(me.id, 200), listActivity(me.id, 500),
  ]);
  const noPhoto = r => { const rest = { ...r }; delete rest.photoDataUrl; return { ...rest, hasPhoto: !!r.photoDataUrl || !!r.hasPhoto, confirmation: r.confirmation ? { ...r.confirmation, token: undefined } : undefined }; };
  await logActivity(me.id, "privacy", "Downloaded a copy of their data").catch(() => {});

  return res.json({
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      controller: "Orion Soft Limited, RC 9535128 · orionsoftlimited@gmail.com",
      profile, attendance,
      fieldVisits: visits.map(noPhoto),
      locationChecks: spotchecks.map(s => ({ ...s, response: s.response ? { ...s.response, photoDataUrl: undefined } : null })),
      leave, expenses: expenses.map(e => ({ ...e, receiptDataUrl: undefined })), weeklyReports: reports, tasks, goals,
      payslips: payroll.map(p => ({ ...p, payslipPdfKey: undefined, transferRecipientCode: undefined })),
      checklists, notifications: notifications.items, activity,
    },
  });
}
