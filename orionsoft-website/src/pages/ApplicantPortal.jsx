// Applicant portal (/applicant): candidates track their application, see
// interview/assessment/offer details set by the recruiting team in the admin
// dashboard, message the team, update their details, or withdraw.
import { useCallback, useEffect, useState } from "react";
import { Video, Phone, MapPin, Send, CheckCircle2, CalendarClock, FileText, Gift, LogOut, ArrowLeft } from "lucide-react";
import { C, font } from "../staff/theme.js";
import { Btn, Badge, Input, Textarea, Field, Grid, Modal, Toaster, toast } from "../staff/components.jsx";
import "../staff/staff.css";

const STAGE_LABEL = { applied: "Applied", reviewing: "Under review", assessment: "Assessment", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Not progressing", withdrawn: "Withdrawn" };

async function api(body, method = "POST") {
  const r = await fetch("/api/applicant/portal", { method, headers: { "Content-Type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || `Request failed (${r.status})`); e.status = r.status; throw e; }
  return j;
}
const when = iso => new Date(iso).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const day = d => new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

function Card({ children, style }) {
  return <div className="so-card" style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, ...style }}>{children}</div>;
}
function H({ icon: Icon, children, color = C.gold }) {
  return <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: C.heading, margin: "0 0 12px", fontFamily: font }}>{Icon && <Icon size={17} color={color} />}{children}</h2>;
}

function Login({ onDone }) {
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try { await api({ action: "login", email, reference }); onDone(); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <div className="so-login" style={{ fontFamily: font }}>
      <div className="so-login-art" style={{ backgroundImage: "url(/assets/business-team-laptop.jpg)" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(6,8,16,0.5), rgba(10,37,64,0.78) 55%, rgba(6,8,16,0.95))" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "34px 40px", gap: 24 }}>
          <a href="/" style={{ fontSize: 20, fontWeight: 800, color: "#fff", textDecoration: "none" }}>Orion<span style={{ color: C.gold }}>Soft</span></a>
          <div className="so-login-points" style={{ maxWidth: 440 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Your application, always up to date.</div>
            <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 1.6 }}>See exactly where you are in our process, get interview details the moment they're set, and talk to our recruiting team directly.</p>
          </div>
        </div>
      </div>
      <div className="so-login-form">
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>APPLICANT PORTAL</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.heading, margin: "8px 0 8px", letterSpacing: "-0.03em" }}>Track your application</h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: "0 0 22px", lineHeight: 1.6 }}>Sign in with the email you applied with and the reference we sent you (it looks like ORN-AB12CD).</p>
          <Field label="Email" style={{ marginBottom: 12 }}><Input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></Field>
          <Field label="Application reference" style={{ marginBottom: 16 }}><Input value={reference} onChange={e => setReference(e.target.value.toUpperCase())} placeholder="ORN-XXXXXX" required style={{ letterSpacing: "0.08em" }} /></Field>
          {err && <p role="alert" style={{ color: C.rose, fontSize: 13, margin: "0 0 12px" }}>{err}</p>}
          <Btn type="submit" disabled={busy || !email || !reference} style={{ width: "100%", padding: 13 }}>{busy ? "Checking…" : "View my application"}</Btn>
          <p style={{ fontSize: 12.5, color: C.textMuted, marginTop: 18, lineHeight: 1.6 }}>Lost your reference? Check your email for "Application received", or email <a href="mailto:orionsoftlimited@gmail.com" style={{ color: C.blue }}>orionsoftlimited@gmail.com</a>. Haven't applied yet? <a href="/careers" style={{ color: C.gold }}>See open roles</a>.</p>
        </form>
      </div>
    </div>
  );
}

function Tracker({ app }) {
  const closed = app.status === "rejected" || app.status === "withdrawn";
  const idx = app.stages.indexOf(app.status);
  return (
    <div style={{ display: "flex", overflowX: "auto", padding: "4px 0 6px" }}>
      {app.stages.map((s, i) => {
        const done = !closed && idx >= i;
        const current = !closed && idx === i;
        return (
          <div key={s} style={{ flex: 1, minWidth: 82, textAlign: "center", position: "relative" }}>
            {i > 0 && <div style={{ position: "absolute", top: 15, left: "-50%", width: "100%", height: 3, background: !closed && idx >= i ? C.mint : C.border }} />}
            <div style={{ position: "relative", width: 32, height: 32, margin: "0 auto 8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, background: done ? C.mint : C.surface, color: done ? "#06100E" : C.textMuted, border: `2px solid ${current ? C.gold : done ? C.mint : C.border}`, boxShadow: current ? `0 0 0 5px ${C.gold}33` : "none" }}>{done ? "✓" : i + 1}</div>
            <div style={{ fontSize: 12, fontWeight: current ? 800 : 600, color: done ? C.heading : C.textMuted }}>{STAGE_LABEL[s]}</div>
          </div>
        );
      })}
    </div>
  );
}

function Application({ app, onChanged }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [details, setDetails] = useState({ phone: app.phone || "", location: app.location || "", availability: app.availability || "", cvLink: app.cvLink || "", portfolio: app.portfolio || "" });
  const closed = ["hired", "rejected", "withdrawn"].includes(app.status);

  useEffect(() => { if (app.unreadForCandidate) api({ action: "read", applicationId: app.id }).catch(() => {}); }, [app.id, app.unreadForCandidate]);

  async function run(body, ok) {
    setBusy(true);
    try { await api({ applicationId: app.id, ...body }, body.method || "POST"); toast(ok); onChanged(); return true; }
    catch (e) { toast(e.message, "err"); return false; } finally { setBusy(false); }
  }
  async function saveDetails() {
    setBusy(true);
    try { await fetch("/api/applicant/portal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: app.id, ...details }) }).then(r => { if (!r.ok) throw new Error("Couldn't save your details"); }); toast("Details updated. The team has been told."); setEdit(false); onChanged(); }
    catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  const iv = app.interview;
  const statusColor = app.status === "hired" || app.status === "offer" ? C.mint : app.status === "rejected" ? C.rose : app.status === "withdrawn" ? C.textMuted : C.gold;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, letterSpacing: "0.08em" }}>REF {app.reference}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.heading, marginTop: 2 }}>{app.roleAppliedFor}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>Applied {day(app.createdAt)} · Last update {day(app.updatedAt)}</div>
          </div>
          <Badge color={statusColor} style={{ fontSize: 13, padding: "6px 14px", alignSelf: "flex-start" }}>{STAGE_LABEL[app.status] || app.status}</Badge>
        </div>
        <Tracker app={app} />
        <p style={{ fontSize: 14.5, color: C.heading, lineHeight: 1.6, margin: "14px 0 0", padding: 14, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>{app.statusMessage}</p>
      </Card>

      {iv && (
        <Card style={{ borderColor: `${C.cyan}55` }}>
          <H icon={CalendarClock} color={C.cyan}>Your interview</H>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.heading }}>{iv.at ? when(iv.at) : "Time to be confirmed"}</div>
          <div style={{ fontSize: 13.5, color: C.text, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            {iv.mode === "video" ? <><Video size={15} /> Video call</> : iv.mode === "phone" ? <><Phone size={15} /> Phone call</> : <><MapPin size={15} /> In person</>}
            {iv.interviewers ? ` · with ${iv.interviewers}` : ""}
          </div>
          {iv.location && <div style={{ fontSize: 13.5, color: C.text, marginTop: 4 }}>{iv.location}</div>}
          {iv.notes && <div style={{ fontSize: 13.5, color: C.textMuted, marginTop: 8, lineHeight: 1.6 }}>{iv.notes}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {iv.link && <a href={iv.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn icon={Video}>Join interview</Btn></a>}
            {iv.candidateResponse === "accepted" ? <Badge color={C.mint} style={{ padding: "8px 12px" }}><CheckCircle2 size={13} /> You confirmed</Badge> : (
              <>
                <Btn variant="blue" icon={CheckCircle2} disabled={busy} onClick={() => run({ action: "interview-response", response: "accept", note }, "Thanks, the team knows you'll be there")}>I'll be there</Btn>
                <Btn variant="ghost" disabled={busy} onClick={() => { const n = prompt("What times work better for you?"); if (n) run({ action: "interview-response", response: "reschedule", note: n }, "Reschedule request sent"); }}>Request another time</Btn>
              </>
            )}
            {iv.candidateResponse === "reschedule_requested" && <Badge color={C.amber}>Reschedule requested</Badge>}
          </div>
          {iv.candidateResponse !== "accepted" && <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note to the team" style={{ marginTop: 10, maxWidth: 420 }} />}
        </Card>
      )}

      {app.assessment && (
        <Card style={{ borderColor: `${C.purple}55` }}>
          <H icon={FileText} color={C.purple}>Your assessment</H>
          <p style={{ fontSize: 14, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0 }}>{app.assessment.instructions}</p>
          {app.assessment.dueDate && <div style={{ fontSize: 13, color: C.amber, fontWeight: 700, marginTop: 8 }}>Due {day(app.assessment.dueDate)}</div>}
          {app.assessment.link && <a href={app.assessment.link} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 12, textDecoration: "none" }}><Btn>Open assessment</Btn></a>}
        </Card>
      )}

      {app.offer && (
        <Card style={{ borderColor: `${C.mint}66`, background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(15,24,40,0.95))" }}>
          <H icon={Gift} color={C.mint}>Your offer 🎉</H>
          <p style={{ fontSize: 14.5, color: C.heading, whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0 }}>{app.offer.summary}</p>
          {app.offer.respondBy && <div style={{ fontSize: 13, color: C.amber, fontWeight: 700, marginTop: 8 }}>Please respond by {day(app.offer.respondBy)}</div>}
          {app.offer.link && <a href={app.offer.link} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 12, textDecoration: "none" }}><Btn>View & sign offer</Btn></a>}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16, alignItems: "start", minWidth: 0 }}>
        <Card>
          <H icon={Send}>Messages with our recruiting team</H>
          <div style={{ maxHeight: 360, overflowY: "auto", marginBottom: 10 }}>
            {app.messages.length === 0 && <p style={{ fontSize: 13.5, color: C.textMuted }}>No messages yet. Have a question? Ask below and we'll reply here and by email.</p>}
            {app.messages.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.from === "candidate" ? "flex-end" : "flex-start", margin: "8px 0" }}>
                <div style={{ maxWidth: "85%", background: m.from === "candidate" ? C.blueDim : C.surface, border: `1px solid ${m.from === "candidate" ? C.blue + "44" : C.border}`, borderRadius: 12, padding: "9px 12px" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{m.byName} · {when(m.at)}</div>
                  <div style={{ fontSize: 14, color: C.heading, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          {!closed || app.status === "hired" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <Textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Write a message…" style={{ minHeight: 46 }} aria-label="Message" />
              <Btn icon={Send} disabled={busy || !msg.trim()} onClick={async () => { if (await run({ action: "message", text: msg }, "Message sent")) setMsg(""); }}>Send</Btn>
            </div>
          ) : <p style={{ fontSize: 13, color: C.textMuted }}>This application is closed.</p>}
        </Card>
        <Card>
          <H>History</H>
          {app.history.slice().reverse().map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? C.gold : C.textMuted, marginTop: 6, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading }}>{STAGE_LABEL[h.status] || h.status}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{when(h.at)}</div>
                {h.note && <div style={{ fontSize: 13, color: C.text, marginTop: 3 }}>{h.note}</div>}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {!closed && <Btn small variant="ghost" onClick={() => setEdit(true)}>Update my details</Btn>}
            {!closed && <Btn small danger onClick={() => setWithdraw(true)}>Withdraw application</Btn>}
          </div>
        </Card>
      </div>

      {edit && (
        <Modal title="Update your details" onClose={() => setEdit(false)}>
          <Grid min={200} style={{ marginBottom: 12 }}>
            <Field label="Phone"><Input value={details.phone} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} /></Field>
            <Field label="Location"><Input value={details.location} onChange={e => setDetails(d => ({ ...d, location: e.target.value }))} /></Field>
            <Field label="Availability / notice period"><Input value={details.availability} onChange={e => setDetails(d => ({ ...d, availability: e.target.value }))} /></Field>
          </Grid>
          <Field label="CV link" style={{ marginBottom: 12 }}><Input value={details.cvLink} onChange={e => setDetails(d => ({ ...d, cvLink: e.target.value }))} placeholder="Google Drive / Dropbox link" /></Field>
          <Field label="Portfolio / LinkedIn" style={{ marginBottom: 14 }}><Input value={details.portfolio} onChange={e => setDetails(d => ({ ...d, portfolio: e.target.value }))} /></Field>
          <Btn onClick={saveDetails} disabled={busy}>Save details</Btn>
        </Modal>
      )}
      {withdraw && (
        <Modal title="Withdraw your application?" onClose={() => setWithdraw(false)} width={460}>
          <p style={{ fontSize: 14, color: C.text, marginTop: 0 }}>This closes your application for {app.roleAppliedFor}. You're welcome to apply again in future.</p>
          <Field label="Reason (optional)" style={{ marginBottom: 14 }}><Input value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <Btn danger disabled={busy} onClick={async () => { if (await run({ action: "withdraw", reason }, "Application withdrawn")) setWithdraw(false); }}>Withdraw</Btn>
        </Modal>
      )}
    </div>
  );
}

export default function ApplicantPortal() {
  const [state, setState] = useState({ loading: true, data: null });
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    try { const j = await api(null, "GET"); setState({ loading: false, data: j }); setActive(a => a || j.applications[0]?.id || null); }
    catch { setState({ loading: false, data: null }); }
  }, []);

  useEffect(() => {
    document.title = "Applicant Portal | Orion Soft Limited";
    const token = new URLSearchParams(window.location.search).get("token");
    (async () => {
      if (token) {
        try { await api({ action: "magic", token }); } catch (e) { toast(e.message, "err"); }
        window.history.replaceState({}, "", "/applicant");
      }
      await load();
    })();
  }, [load]);

  // Updates from the recruiting team appear without refreshing.
  useEffect(() => {
    if (!state.data) return undefined;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [state.data, load]);

  if (state.loading) return <div className="so-root" />;
  if (!state.data) return <div className="so-root"><Login onDone={load} /><Toaster /></div>;

  const apps = state.data.applications;
  const app = apps.find(a => a.id === active) || apps[0];
  const first = (app?.fullName || "").split(" ")[0];

  return (
    <div className="so-root" style={{ fontFamily: font }}>
      <header style={{ position: "relative", background: "#0A2540 url(/assets/business-team-laptop.jpg) center 30% / cover", borderBottom: `1px solid ${C.border}` }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(6,8,16,0.95), rgba(10,37,64,0.85) 60%, rgba(6,8,16,0.6))" }} />
        <div style={{ position: "relative", maxWidth: 1000, margin: "0 auto", padding: "22px 20px 30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <a href="/" style={{ fontSize: 18, fontWeight: 800, color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}><ArrowLeft size={16} /> Orion<span style={{ color: C.gold }}>Soft</span></a>
            <Btn small variant="ghost" icon={LogOut} onClick={async () => { await api({ action: "logout" }).catch(() => {}); setState({ loading: false, data: null }); setActive(null); }} style={{ color: "#fff" }}>Sign out</Btn>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: C.gold, marginTop: 26 }}>APPLICANT PORTAL</div>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800, color: "#fff", margin: "6px 0 4px", letterSpacing: "-0.02em" }}>{first ? `Welcome, ${first}` : "Welcome"}</h1>
          <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 14.5, margin: 0 }}>Everything about your application with Orion Soft, in one place. {state.data.email}</p>
        </div>
      </header>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "22px 16px 80px" }}>
        {apps.length === 0 && <Card><p style={{ color: C.text, margin: 0 }}>We couldn't find applications for this email. <a href="/careers" style={{ color: C.gold }}>See open roles</a>.</p></Card>}
        {apps.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {apps.map(a => <Btn key={a.id} small variant={a.id === app.id ? "primary" : "ghost"} onClick={() => setActive(a.id)}>{a.roleAppliedFor} · {STAGE_LABEL[a.status]}</Btn>)}
          </div>
        )}
        {app && <Application key={app.id} app={app} onChanged={load} />}
      </main>
      <Toaster />
    </div>
  );
}
