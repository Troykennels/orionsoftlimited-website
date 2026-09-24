// Applicant portal: job candidates track their application(s) and talk to the
// recruiting team. All updates originate from the admin Applicants section;
// candidates only ever see candidate-safe fields (never internal notes,
// scores or reviewer names).
//
// Sign-in: email + application reference (shown after applying and in every
// email), or a signed magic link from those emails. Uses its own cookie so it
// never interferes with an admin/staff session in the same browser.
import { listRecords, getRecord, putRecord, getByLookup, newId } from "../_lib/records.js";
import { signSession, verifySession, setSessionCookie, clearSessionCookie, getSessionFromRequest, APPLICANT_COOKIE } from "../_lib/auth.js";
import { notifyAdminCandidateUpdate } from "../_lib/emailTemplates.js";
import { cleanUrl } from "../_lib/office.js";

const PORTAL_TTL = 60 * 60 * 24 * 30; // 30 days
const STAGES = ["applied", "reviewing", "assessment", "interview", "offer", "hired"];
const STAGE_COPY = {
  applied: "We've received your application and it's in the queue for review.",
  reviewing: "Our team is reviewing your application and experience.",
  assessment: "You've been shortlisted for an assessment. See the details below.",
  interview: "You've been invited to interview. See the details below.",
  offer: "Congratulations! We'd like to make you an offer.",
  hired: "Welcome to Orion Soft! Our HR team will be in touch about onboarding.",
  rejected: "Thank you for your interest. We won't be moving forward this time, but we'd love you to apply again in future.",
  withdrawn: "You withdrew this application.",
};

const rateMap = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = rateMap.get(ip) || { count: 0, start: now };
  if (now - e.start > 15 * 60 * 1000) { rateMap.set(ip, { count: 1, start: now }); return true; }
  if (e.count >= 10) return false;
  e.count++; rateMap.set(ip, e);
  return true;
}

export function candidateView(a) {
  return {
    id: a.id, reference: a.reference || a.id, roleAppliedFor: a.roleAppliedFor, status: a.status,
    statusMessage: STAGE_COPY[a.status] || "", stages: STAGES,
    history: (a.statusHistory || [{ status: "applied", at: a.createdAt }]).map(h => ({ status: h.status, at: h.at, note: h.publicNote || "" })),
    messages: (a.messages || []).map(m => ({ id: m.id, from: m.from, text: m.text, at: m.at, byName: m.from === "recruiter" ? "Orion Soft Recruiting" : "You" })),
    interview: a.interview || null, assessment: a.assessment || null, offer: a.offer || null,
    fullName: a.fullName, email: a.email, phone: a.phone, location: a.location, cvLink: a.cvLink, portfolio: a.portfolio, availability: a.availability,
    createdAt: a.createdAt, updatedAt: a.updatedAt, unreadForCandidate: !!a.unreadForCandidate,
  };
}

export function portalLinkFor(email) {
  const base = process.env.APP_BASE_URL || "https://orionsoftlimited.com";
  const token = signSession({ role: "applicant-link", email: String(email).toLowerCase() }, PORTAL_TTL);
  return `${base}/applicant?token=${encodeURIComponent(token)}`;
}

async function applicationsFor(email) {
  const all = await listRecords("applicants");
  return all.filter(a => String(a.email || "").toLowerCase() === email).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function startSession(res, email) {
  setSessionCookie(res, signSession({ role: "applicant", email }, PORTAL_TTL), APPLICANT_COOKIE, PORTAL_TTL);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const b = req.body || {};

  if (req.method === "POST" && (b.action === "login" || b.action === "magic")) {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
    if (!checkRate(ip)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
    if (b.action === "magic") {
      const payload = verifySession(String(b.token || ""));
      if (payload?.role !== "applicant-link" || !payload.email) return res.status(401).json({ error: "This link has expired. Sign in with your email and reference instead." });
      startSession(res, payload.email);
      return res.json({ ok: true });
    }
    const email = String(b.email || "").trim().toLowerCase();
    const ref = String(b.reference || "").trim().toUpperCase();
    if (!email || !ref) return res.status(400).json({ error: "Enter your email and application reference" });
    const app = (await getByLookup("applicants", "reference", ref)) || (await getRecord("applicants", String(b.reference).trim()));
    if (!app || String(app.email || "").toLowerCase() !== email) return res.status(401).json({ error: "We couldn't find an application with that email and reference" });
    startSession(res, email);
    return res.json({ ok: true });
  }

  if (req.method === "POST" && b.action === "logout") {
    clearSessionCookie(res, APPLICANT_COOKIE);
    return res.json({ ok: true });
  }

  const session = getSessionFromRequest(req, APPLICANT_COOKIE);
  if (!session || session.role !== "applicant" || !session.email) return res.status(401).json({ error: "Please sign in" });
  const email = session.email;

  if (req.method === "GET") {
    const apps = await applicationsFor(email);
    return res.json({ ok: true, email, applications: apps.map(candidateView) });
  }

  const app = await getRecord("applicants", b.applicationId);
  if (!app || String(app.email || "").toLowerCase() !== email) return res.status(404).json({ error: "Application not found" });
  const now = new Date().toISOString();

  if (req.method === "POST" && b.action === "read") {
    app.unreadForCandidate = false;
    await putRecord("applicants", app.id, app);
    return res.json({ ok: true });
  }

  if (req.method === "POST" && b.action === "message") {
    const text = String(b.text || "").trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: "Message can't be empty" });
    app.messages = [...(app.messages || []), { id: newId("am"), from: "candidate", text, at: now }];
    app.unreadForAdmin = true;
    app.updatedAt = now;
    await putRecord("applicants", app.id, app);
    try { await notifyAdminCandidateUpdate(app, `New message: ${text}`); } catch { /* best-effort */ }
    return res.json({ ok: true, application: candidateView(app) });
  }

  if (req.method === "POST" && b.action === "interview-response") {
    if (!app.interview) return res.status(400).json({ error: "No interview has been scheduled yet" });
    const response = b.response === "accept" ? "accepted" : "reschedule_requested";
    app.interview = { ...app.interview, candidateResponse: response, candidateNote: String(b.note || "").slice(0, 600), respondedAt: now };
    app.messages = [...(app.messages || []), { id: newId("am"), from: "candidate", text: response === "accepted" ? `✅ I confirm the interview.${b.note ? ` ${b.note}` : ""}` : `🔁 Could we reschedule the interview? ${b.note || ""}`, at: now }];
    app.unreadForAdmin = true;
    app.updatedAt = now;
    await putRecord("applicants", app.id, app);
    try { await notifyAdminCandidateUpdate(app, response === "accepted" ? "Candidate confirmed the interview" : `Candidate asked to reschedule: ${b.note || ""}`); } catch { /* best-effort */ }
    return res.json({ ok: true, application: candidateView(app) });
  }

  if (req.method === "POST" && b.action === "withdraw") {
    if (["hired", "rejected", "withdrawn"].includes(app.status)) return res.status(400).json({ error: "This application is already closed" });
    app.status = "withdrawn";
    app.statusHistory = [...(app.statusHistory || [{ status: "applied", at: app.createdAt }]), { status: "withdrawn", at: now, by: "candidate", publicNote: String(b.reason || "").slice(0, 300) }];
    app.unreadForAdmin = true;
    app.updatedAt = now;
    await putRecord("applicants", app.id, app);
    try { await notifyAdminCandidateUpdate(app, `Candidate withdrew${b.reason ? `: ${b.reason}` : ""}`); } catch { /* best-effort */ }
    return res.json({ ok: true, application: candidateView(app) });
  }

  if (req.method === "PATCH") {
    for (const k of ["phone", "location", "availability"]) if (b[k] !== undefined) app[k] = String(b[k]).slice(0, 200);
    for (const k of ["cvLink", "portfolio"]) if (b[k] !== undefined) app[k] = cleanUrl(b[k]);
    app.updatedAt = now;
    app.unreadForAdmin = true;
    app.messages = [...(app.messages || []), { id: newId("am"), from: "candidate", text: "ℹ️ I updated my application details.", at: now, system: true }];
    await putRecord("applicants", app.id, app);
    return res.json({ ok: true, application: candidateView(app) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
