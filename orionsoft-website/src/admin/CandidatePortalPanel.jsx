// Admin side of the applicant portal: the conversation with the candidate and
// the candidate-visible interview / assessment / offer details. Everything
// saved here appears in the candidate's portal and triggers an email to them.
import { useEffect, useState } from "react";
import { Send, Link2, Video } from "lucide-react";
import { C, font } from "../staff/theme.js";
import { Btn, Badge, Input, Textarea, Select, Field, Grid, SectionCard, SectionTitle } from "../staff/components.jsx";

async function patch(body) {
  const r = await fetch("/api/admin/applicants", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Failed to save");
  return j.applicant;
}

function when(iso) {
  return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CandidatePortalPanel({ applicant: a, onSaved }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [iv, setIv] = useState({ at: a.interview?.at || "", mode: a.interview?.mode || "video", link: a.interview?.link || "", location: a.interview?.location || "", interviewers: a.interview?.interviewers || "", notes: a.interview?.notes || "" });
  const [as, setAs] = useState({ instructions: a.assessment?.instructions || "", link: a.assessment?.link || "", dueDate: a.assessment?.dueDate || "" });
  const [of, setOf] = useState({ summary: a.offer?.summary || "", link: a.offer?.link || "", respondBy: a.offer?.respondBy || "" });

  // Opening the applicant clears their "replied" flag.
  useEffect(() => {
    if (a.unreadForAdmin) patch({ id: a.id, action: "mark-read" }).then(onSaved).catch(() => {});
  }, [a.id, a.unreadForAdmin, onSaved]);

  async function run(body, ok) {
    setBusy(true); setStatus("");
    try { await patch({ id: a.id, ...body }); setStatus(ok); onSaved(); } catch (e) { setStatus(`⚠ ${e.message}`); } finally { setBusy(false); }
  }

  const portal = `${window.location.origin}/applicant`;
  const messages = a.messages || [];

  return (
    <SectionCard style={{ marginTop: 20, fontFamily: font }}>
      <SectionTitle sub="Everything here appears in the candidate's applicant portal, and they're emailed each time you update it.">Candidate portal</SectionTitle>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <Badge color={C.gold}>Ref {a.reference || "not issued yet"}</Badge>
        <span style={{ fontSize: 12.5, color: C.textMuted }}>Candidate signs in at {portal} with their email + reference.</span>
        <Btn small variant="ghost" icon={Link2} disabled={busy} onClick={() => run({ action: "send-portal-link" }, "Portal link emailed to the candidate")}>Email portal link</Btn>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, letterSpacing: "0.06em", marginBottom: 8 }}>CONVERSATION</div>
      <div style={{ maxHeight: 320, overflowY: "auto", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        {messages.length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>No messages yet. Say hello, the candidate will see it in their portal.</div>}
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.from === "recruiter" ? "flex-end" : "flex-start", margin: "6px 0" }}>
            <div style={{ maxWidth: "80%", background: m.from === "recruiter" ? C.goldDim : C.card, border: `1px solid ${m.from === "recruiter" ? C.gold + "44" : C.border}`, borderRadius: 12, padding: "8px 12px" }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{m.from === "recruiter" ? `You${m.by ? ` (${m.by})` : ""}` : a.fullName} · {when(m.at)}</div>
              <div style={{ fontSize: 13.5, color: C.heading, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder={`Message ${a.fullName.split(" ")[0]}…`} style={{ minHeight: 48 }} />
        <Btn icon={Send} disabled={busy || !msg.trim()} onClick={() => run({ message: msg }, "Message sent").then(() => setMsg(""))}>Send</Btn>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, letterSpacing: "0.06em", marginBottom: 8 }}>INTERVIEW</div>
      {a.interview?.candidateResponse && <div style={{ marginBottom: 8 }}><Badge color={a.interview.candidateResponse === "accepted" ? C.mint : C.amber}>{a.interview.candidateResponse === "accepted" ? "Candidate confirmed" : "Candidate asked to reschedule"}</Badge>{a.interview.candidateNote && <span style={{ fontSize: 12.5, color: C.text, marginLeft: 8 }}>{a.interview.candidateNote}</span>}</div>}
      <Grid min={170} style={{ marginBottom: 8 }}>
        <Field label="Date & time"><Input type="datetime-local" value={iv.at} onChange={e => setIv(x => ({ ...x, at: e.target.value }))} /></Field>
        <Field label="Format"><Select value={iv.mode} onChange={e => setIv(x => ({ ...x, mode: e.target.value }))}><option value="video">Video call</option><option value="phone">Phone call</option><option value="in_person">In person</option></Select></Field>
        <Field label="Interviewers"><Input value={iv.interviewers} onChange={e => setIv(x => ({ ...x, interviewers: e.target.value }))} /></Field>
      </Grid>
      <Grid min={220} style={{ marginBottom: 8 }}>
        {iv.mode === "video" ? <Field label="Meeting link"><Input value={iv.link} onChange={e => setIv(x => ({ ...x, link: e.target.value }))} placeholder="Leave blank to generate a Jitsi room" /></Field>
          : <Field label={iv.mode === "phone" ? "Number we'll call / you should call" : "Address"}><Input value={iv.location} onChange={e => setIv(x => ({ ...x, location: e.target.value }))} /></Field>}
        <Field label="Notes for the candidate"><Input value={iv.notes} onChange={e => setIv(x => ({ ...x, notes: e.target.value }))} placeholder="What to prepare, who to ask for…" /></Field>
      </Grid>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Btn small icon={Video} disabled={busy || !iv.at} onClick={() => {
          const link = iv.mode === "video" && !iv.link ? `https://meet.jit.si/OrionSoft-Interview-${Math.random().toString(36).slice(2, 9)}` : iv.link;
          setIv(x => ({ ...x, link }));
          run({ interview: { ...iv, link }, ...(a.status !== "interview" && ["applied", "reviewing", "assessment"].includes(a.status) ? { status: "interview", publicNote: "We'd love to meet you. Interview details are below." } : {}) }, "Interview saved and sent to the candidate");
        }}>Save & send interview</Btn>
        {a.interview && <Btn small variant="ghost" disabled={busy} onClick={() => run({ interview: null }, "Interview removed")}>Remove</Btn>}
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, letterSpacing: "0.06em", marginBottom: 8 }}>ASSESSMENT</div>
      <Field label="Instructions" style={{ marginBottom: 8 }}><Textarea value={as.instructions} onChange={e => setAs(x => ({ ...x, instructions: e.target.value }))} style={{ minHeight: 60 }} /></Field>
      <Grid min={200} style={{ marginBottom: 8 }}>
        <Field label="Assessment link"><Input value={as.link} onChange={e => setAs(x => ({ ...x, link: e.target.value }))} placeholder="Google Form, test platform…" /></Field>
        <Field label="Due date"><Input type="date" value={as.dueDate} onChange={e => setAs(x => ({ ...x, dueDate: e.target.value }))} /></Field>
      </Grid>
      <Btn small disabled={busy || !as.instructions.trim()} onClick={() => run({ assessment: as, ...(["applied", "reviewing"].includes(a.status) ? { status: "assessment", publicNote: "You've been shortlisted for an assessment." } : {}) }, "Assessment sent to the candidate")} style={{ marginBottom: 20 }}>Save & send assessment</Btn>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, letterSpacing: "0.06em", margin: "4px 0 8px" }}>OFFER</div>
      <Field label="Offer summary" style={{ marginBottom: 8 }}><Textarea value={of.summary} onChange={e => setOf(x => ({ ...x, summary: e.target.value }))} placeholder="Role, start date, compensation summary…" style={{ minHeight: 60 }} /></Field>
      <Grid min={200} style={{ marginBottom: 8 }}>
        <Field label="Offer letter link"><Input value={of.link} onChange={e => setOf(x => ({ ...x, link: e.target.value }))} placeholder="Contract signing link or PDF" /></Field>
        <Field label="Respond by"><Input type="date" value={of.respondBy} onChange={e => setOf(x => ({ ...x, respondBy: e.target.value }))} /></Field>
      </Grid>
      <Btn small disabled={busy || !of.summary.trim()} onClick={() => run({ offer: of, ...(a.status !== "offer" && a.status !== "hired" ? { status: "offer", publicNote: "Congratulations! Your offer details are below." } : {}) }, "Offer sent to the candidate")}>Save & send offer</Btn>

      {status && <p role="status" style={{ fontSize: 13, color: status.startsWith("⚠") ? C.rose : C.mint, marginTop: 12 }}>{status}</p>}
    </SectionCard>
  );
}
