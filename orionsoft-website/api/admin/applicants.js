import { newId, listRecords, getRecord, putRecord, deleteRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { notifyApplicantStatus } from "../_lib/emailTemplates.js";

const VALID_STATUSES = ["applied", "reviewing", "assessment", "interview", "offer", "hired", "rejected"];

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
      const applicant = await getRecord("applicants", req.query.id);
      if (!applicant) return res.status(404).json({ error: "Applicant not found" });
      return res.json({ ok: true, applicant });
    }
    const applicants = await listRecords("applicants");
    applicants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ ok: true, applicants });
  }

  if (req.method === "POST") {
    const { fullName, email, phone, location, roleAppliedFor, experience, qualification, cvLink, portfolio, coverNote } = req.body || {};
    if (!fullName || !email || !roleAppliedFor) {
      return res.status(400).json({ error: "fullName, email, and roleAppliedFor are required" });
    }
    const id = newId("app");
    const applicant = {
      id, fullName, email, phone: phone || "", location: location || "",
      roleAppliedFor, experience: experience || "", qualification: qualification || "",
      availability: "", cvLink: cvLink || "", portfolio: portfolio || "",
      referral: "", coverNote: coverNote || "",
      source: "manual", status: "applied", score: null, reviewer: "", notes: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: session.sub,
    };
    await putRecord("applicants", id, applicant);
    return res.json({ ok: true, applicant });
  }

  if (req.method === "PATCH") {
    const { id, status, score, reviewer, note, ...rest } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const applicant = await getRecord("applicants", id);
    if (!applicant) return res.status(404).json({ error: "Applicant not found" });

    const allowed = ["fullName", "phone", "location", "roleAppliedFor", "experience", "qualification", "cvLink", "portfolio", "coverNote"];
    for (const key of allowed) {
      if (rest[key] !== undefined) applicant[key] = rest[key];
    }

    let statusChanged = false;
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
      if (status !== applicant.status) statusChanged = true;
      applicant.status = status;
    }
    if (score !== undefined) applicant.score = score === null ? null : Number(score);
    if (reviewer !== undefined) applicant.reviewer = reviewer;
    if (note) applicant.notes = [...(applicant.notes || []), { text: note, by: session.name || session.sub, at: new Date().toISOString() }];

    applicant.updatedAt = new Date().toISOString();
    await putRecord("applicants", id, applicant);

    if (statusChanged) {
      try { await notifyApplicantStatus(applicant); } catch { /* best-effort */ }
    }

    return res.json({ ok: true, applicant });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteRecord("applicants", id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
