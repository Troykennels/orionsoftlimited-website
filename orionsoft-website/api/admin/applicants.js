import { newId, listRecords, getRecord, putRecord, deleteRecord, setLookup, getByLookup, deleteLookup } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { notifyApplicantStatus, notifyApplicantMessage, sendApplicationReceived } from "../_lib/emailTemplates.js";
import { logAudit } from "../_lib/audit.js";
import { portalLinkFor } from "../applicant/portal.js";
import { cleanUrl } from "../_lib/office.js";

const VALID_STATUSES = ["applied", "reviewing", "assessment", "interview", "offer", "hired", "rejected", "withdrawn"];

async function ensureReference(applicant) {
  if (applicant.reference) return applicant.reference;
  let ref;
  do { ref = `ORN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; } while (await getByLookup("applicants", "reference", ref));
  applicant.reference = ref;
  await setLookup("applicants", "reference", ref, applicant.id);
  return ref;
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
      statusHistory: [{ status: "applied", at: new Date().toISOString() }], messages: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: session.sub,
    };
    applicant.email = String(email).trim().toLowerCase();
    await ensureReference(applicant);
    await putRecord("applicants", id, applicant);
    return res.json({ ok: true, applicant });
  }

  if (req.method === "PATCH") {
    const { id, status, score, reviewer, note, publicNote, message, interview, assessment, offer, action, ...rest } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const applicant = await getRecord("applicants", id);
    if (!applicant) return res.status(404).json({ error: "Applicant not found" });
    const now = new Date().toISOString();

    // Admin opened the thread: clear the "candidate replied" flag.
    if (action === "mark-read") {
      applicant.unreadForAdmin = false;
      await putRecord("applicants", id, applicant);
      return res.json({ ok: true, applicant });
    }
    // (Re)send the candidate their reference + portal sign-in link.
    if (action === "send-portal-link") {
      await ensureReference(applicant);
      await putRecord("applicants", id, applicant);
      try { await sendApplicationReceived(applicant, portalLinkFor(applicant.email)); } catch { /* best-effort */ }
      await logAudit(session, "applicant_portal_link", `applicant ${id}`, applicant.email);
      return res.json({ ok: true, applicant });
    }

    const allowed = ["fullName", "phone", "location", "roleAppliedFor", "experience", "qualification", "cvLink", "portfolio", "coverNote"];
    for (const key of allowed) {
      if (rest[key] !== undefined) applicant[key] = rest[key];
    }

    let statusChanged = false;
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
      if (status !== applicant.status) {
        statusChanged = true;
        applicant.statusHistory = [...(applicant.statusHistory || [{ status: "applied", at: applicant.createdAt }]),
          { status, at: now, by: session.name || session.sub, publicNote: String(publicNote || "").slice(0, 1000) }];
      }
      applicant.status = status;
    }
    // Candidate-visible logistics for each stage (shown in the applicant portal).
    if (interview !== undefined) {
      applicant.interview = interview ? {
        at: interview.at || "", mode: ["video", "phone", "in_person"].includes(interview.mode) ? interview.mode : "video",
        link: cleanUrl(interview.link), location: String(interview.location || "").slice(0, 200),
        interviewers: String(interview.interviewers || "").slice(0, 200), notes: String(interview.notes || "").slice(0, 1000),
        candidateResponse: interview.at !== applicant.interview?.at ? null : (applicant.interview?.candidateResponse || null),
      } : null;
    }
    if (assessment !== undefined) {
      applicant.assessment = assessment ? { instructions: String(assessment.instructions || "").slice(0, 2000), link: cleanUrl(assessment.link), dueDate: assessment.dueDate || "" } : null;
    }
    if (offer !== undefined) {
      applicant.offer = offer ? { summary: String(offer.summary || "").slice(0, 2000), link: cleanUrl(offer.link), respondBy: offer.respondBy || "" } : null;
    }
    let newMessage = "";
    if (message && String(message).trim()) {
      newMessage = String(message).trim().slice(0, 2000);
      applicant.messages = [...(applicant.messages || []), { id: newId("am"), from: "recruiter", text: newMessage, at: now, by: session.name || session.sub }];
      applicant.unreadForAdmin = false;
    }
    if (statusChanged || newMessage || interview || assessment || offer) applicant.unreadForCandidate = true;
    if (score !== undefined) applicant.score = score === null ? null : Number(score);
    if (reviewer !== undefined) applicant.reviewer = reviewer;
    if (note) applicant.notes = [...(applicant.notes || []), { text: note, by: session.name || session.sub, at: new Date().toISOString() }];

    applicant.updatedAt = now;
    await ensureReference(applicant);
    await putRecord("applicants", id, applicant);

    const portal = portalLinkFor(applicant.email);
    if (statusChanged) {
      try { await notifyApplicantStatus(applicant, portal, publicNote); } catch { /* best-effort */ }
      await logAudit(session, "applicant_status", `applicant ${id}`, `${applicant.fullName} → ${applicant.status}`);
    } else if (newMessage || interview || assessment || offer) {
      const what = newMessage || (interview ? "Your interview details have been updated." : assessment ? "Your assessment details have been updated." : "Offer details have been added to your application.");
      try { await notifyApplicantMessage(applicant, what, portal); } catch { /* best-effort */ }
    }

    return res.json({ ok: true, applicant });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const existing = await getRecord("applicants", id);
    if (existing?.reference) await deleteLookup("applicants", "reference", existing.reference);
    await deleteRecord("applicants", id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
