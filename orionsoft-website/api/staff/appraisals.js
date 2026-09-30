// A staff member's own performance reviews (appraisals). Drafts stay with
// the reviewer; once finalised, the review is shared here, and the staff
// member acknowledges it (optionally adding their own comments), which is
// what the admin sees as "acknowledged".
import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { officeContext } from "../_lib/office.js";
import { logAudit } from "../_lib/audit.js";

export default async function handler(req, res) {
  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me } = ctx;

  if (req.method === "GET") {
    const mine = (await listRecords("appraisals"))
      .filter(a => a.employeeId === me.id && a.status !== "draft")
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(({ createdBy, ...a }) => a);
    return res.json({ ok: true, appraisals: mine });
  }

  if (req.method === "POST" && req.body?.action === "acknowledge") {
    const a = await getRecord("appraisals", req.body.id);
    if (!a || a.employeeId !== me.id || a.status === "draft") return res.status(404).json({ error: "Review not found" });
    if (a.status === "acknowledged") return res.status(400).json({ error: "You've already acknowledged this review" });
    a.status = "acknowledged";
    a.acknowledgedAt = new Date().toISOString();
    a.employeeComment = String(req.body.comment || "").trim().slice(0, 2000);
    a.updatedAt = a.acknowledgedAt;
    await putRecord("appraisals", a.id, a);
    await logAudit({ name: me.fullName, sub: me.id }, "acknowledge_appraisal", `appraisal ${a.id}`, a.cycle);
    return res.json({ ok: true, appraisal: a });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
