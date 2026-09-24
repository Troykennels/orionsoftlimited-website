import { useCallback, useEffect, useState } from "react";
import { MapPin, LogIn, LogOut, ShieldCheck, ShieldAlert, Send, Copy, Clock } from "lucide-react";
import { C, font } from "../theme.js";
import { api, fmtDateTime, timeAgo, waLink, copyText, firstName } from "../api.js";
import { Badge, Btn, SectionCard, SectionTitle, Input, Textarea, Select, Field, Grid, Modal, EmptyState, PageHeader, toast } from "../components.jsx";
import { getDeviceId, getLocation, mapsLink } from "../geo.js";
import LocationStep from "../LocationStep.jsx";
import PhoneCheck from "../PhoneCheck.jsx";
import CameraCapture from "../CameraCapture.jsx";
import { useOffice } from "../office.js";

const LEVEL = { verified: ["Verified", C.mint, ShieldCheck], review: ["Needs review", C.amber, ShieldAlert], suspicious: ["Suspicious", C.rose, ShieldAlert] };
const CONF = { pending: ["Awaiting client", C.textMuted], confirmed: ["Client confirmed", C.mint], disputed: ["Client disputed", C.rose] };

export function LocationConsent({ onAccept, onClose }) {
  return (
    <Modal title="How location is used" onClose={onClose} width={520}>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>
        <p style={{ marginTop: 0 }}>To verify field work fairly, the Staff Office records your location <strong>only at these moments</strong>:</p>
        <ul style={{ paddingLeft: 18, margin: "0 0 12px" }}>
          <li>when you clock in and clock out,</li>
          <li>when you check in and out of a client visit,</li>
          <li>when you answer a location check.</li>
        </ul>
        <p>It is <strong>never tracked in the background</strong>. You, your line manager, HR and management can see these records, and you can see everything recorded about you under Field Visits and Performance. This follows the Nigeria Data Protection Act 2023.</p>
      </div>
      <Btn onClick={onAccept}>I understand, continue</Btn>
    </Modal>
  );
}

// Ensures the one-time notice has been accepted; resolves true if OK to proceed.
export function useConsent() {
  const [ask, setAsk] = useState(null);
  const ensure = useCallback(async () => {
    try { if (localStorage.getItem("so_loc_consent")) return true; } catch { /* storage blocked: ask */ }
    return new Promise(resolve => setAsk(() => resolve));
  }, []);
  const modal = ask ? (
    <LocationConsent onClose={() => { ask(false); setAsk(null); }} onAccept={async () => {
      try { localStorage.setItem("so_loc_consent", "1"); } catch { /* ignore */ }
      api("/api/staff/attendance", { method: "POST", body: { action: "consent" } }).catch(() => {});
      ask(true); setAsk(null);
    }} />
  ) : null;
  return { ensure, modal };
}

function CheckInFlow({ onClose, onDone }) {
  const { me, can } = useOffice();
  const [loc, setLoc] = useState(null); // { geo } | { error, kind } once resolved
  const [photo, setPhoto] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [f, setF] = useState({ organisation: "", ref: "", purpose: "", contactName: "", contactPhone: "", contactEmail: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      const list = [];
      if (can("pipeline") || can("pipeline.all")) {
        try { (await api("/api/staff/pipeline")).deals.filter(d => !["won", "lost"].includes(d.stage) || d.ownerId === me.id).forEach(d => list.push({ ref: `deal:${d.id}`, name: d.organisation, contactName: d.contactPerson, contactPhone: d.contactPhone, contactEmail: d.contactEmail })); } catch { /* optional */ }
      }
      if (can("liaison") || can("liaison.all")) {
        try { (await api("/api/staff/liaison")).stakeholders.forEach(s => list.push({ ref: `stk:${s.id}`, name: s.organisation, contactName: s.contactPerson, contactPhone: s.phone, contactEmail: s.email })); } catch { /* optional */ }
      }
      setOrgs(list);
    })();
  }, [can, me.id]);

  function pickOrg(ref) {
    const o = orgs.find(x => x.ref === ref);
    setF(x => ({ ...x, ref, organisation: o ? o.name : x.organisation, contactName: o?.contactName || x.contactName, contactPhone: o?.contactPhone || x.contactPhone, contactEmail: o?.contactEmail || x.contactEmail }));
  }

  async function submit() {
    setBusy(true);
    try {
      const [kind, id] = f.ref.split(":");
      const j = await api("/api/staff/visits", { method: "POST", body: {
        action: "check-in", organisation: f.organisation, purpose: f.purpose, notes: f.notes,
        contactName: f.contactName, contactPhone: f.contactPhone, contactEmail: f.contactEmail,
        dealId: kind === "deal" ? id : null, stakeholderId: kind === "stk" ? id : null,
        geo: loc?.geo || null, geoError: loc?.error || null,
        photoDataUrl: photo?.dataUrl || "", photoHash: photo?.hash || "", photoSource: photo?.source || null,
        deviceId: getDeviceId(),
      } });
      setDone(j);
      onDone();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  if (done) {
    const msg = `Hello${f.contactName ? ` ${firstName(f.contactName)}` : ""}, this is ${me.fullName} from Orion Soft. Thank you for having me today. Please confirm our visit with one tap: ${done.confirmUrl}`;
    return (
      <Modal title="Checked in ✓" onClose={onClose} width={520}>
        <p style={{ fontSize: 14, color: C.text, marginTop: 0 }}>Trust score now: <strong style={{ color: LEVEL[done.visit.level][1] }}>{done.visit.trust}% · {LEVEL[done.visit.level][0]}</strong></p>
        {done.visit.flags.filter(x => x.penalty < 0).map(x => <div key={x.code} style={{ fontSize: 12.5, color: C.amber, marginBottom: 4 }}>• {x.label}</div>)}
        <SectionCard style={{ marginTop: 12, padding: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading, marginBottom: 6 }}>Ask the client to confirm your visit</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 10 }}>Client-confirmed visits count the most. {f.contactEmail ? `We've emailed ${f.contactEmail}.` : ""} Send the link from WhatsApp too. The client must confirm on <strong>their own phone</strong>.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {f.contactPhone && <a href={waLink(f.contactPhone.replace(/\D/g, "").replace(/^0/, "234"), msg)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small style={{ background: "#25D366", color: "#062" }}>Send on WhatsApp</Btn></a>}
            <Btn small variant="ghost" icon={Copy} onClick={() => copyText(msg).then(() => toast("Message copied"))}>Copy message</Btn>
          </div>
        </SectionCard>
        <Btn style={{ marginTop: 14 }} onClick={onClose}>Done</Btn>
      </Modal>
    );
  }

  return (
    <Modal title="Check in at a client" onClose={onClose} width={560}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 6 }}>1 · LOCATION</div>
          <LocationStep onChange={setLoc} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 6 }}>2 · PHOTO AT THE SITE (signboard, reception or meeting)</div>
          <CameraCapture name={me.fullName} geo={loc?.geo} onCapture={setPhoto} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 6 }}>3 · WHO ARE YOU VISITING?</div>
          {orgs.length > 0 && <Select value={f.ref} onChange={e => pickOrg(e.target.value)} style={{ marginBottom: 8 }}><option value="">Pick from my pipeline / stakeholders…</option>{orgs.map(o => <option key={o.ref} value={o.ref}>{o.name}</option>)}</Select>}
          <Input value={f.organisation} onChange={e => setF(x => ({ ...x, organisation: e.target.value, ref: "" }))} placeholder="Organisation name" />
          <Grid min={160} style={{ marginTop: 8 }}>
            <Input value={f.contactName} onChange={e => setF(x => ({ ...x, contactName: e.target.value }))} placeholder="Contact person" />
            <Input value={f.contactPhone} onChange={e => setF(x => ({ ...x, contactPhone: e.target.value }))} placeholder="Their phone (WhatsApp)" />
            <Input value={f.contactEmail} onChange={e => setF(x => ({ ...x, contactEmail: e.target.value }))} placeholder="Their email (optional)" />
          </Grid>
          <Input value={f.purpose} onChange={e => setF(x => ({ ...x, purpose: e.target.value }))} placeholder="Purpose (demo, follow-up, training…)" style={{ marginTop: 8 }} />
        </div>
        {!loc && <div style={{ fontSize: 12.5, color: C.textMuted }}>Share your location first (step 1).</div>}
        <Btn icon={LogIn} disabled={busy || !loc || !f.organisation.trim()} onClick={submit}>{busy ? "Checking in…" : "Check in"}</Btn>
      </div>
    </Modal>
  );
}

function SpotCheckResponder({ spot, onDone }) {
  const { me } = useOffice();
  const [loc, setLoc] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(() => Math.max(0, Date.parse(spot.dueAt) - Date.now()));
  useEffect(() => { const t = setInterval(() => setLeft(Math.max(0, Date.parse(spot.dueAt) - Date.now())), 1000); return () => clearInterval(t); }, [spot.dueAt]);
  async function send() {
    setBusy(true);
    try {
      await api("/api/staff/visits", { method: "POST", body: { action: "spot-respond", id: spot.id, geo: loc?.geo || null, photoDataUrl: photo?.dataUrl || "", photoHash: photo?.hash || "", photoSource: photo?.source || null, deviceId: getDeviceId() } });
      toast("Location confirmed. Thank you!");
      onDone();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  return (
    <SectionCard style={{ borderColor: `${C.amber}88`, background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(15,24,40,0.95))", marginBottom: 16 }}>
      <SectionTitle sub={`${spot.reason}. Two quick steps: share your location, then take a live photo.`}>📍 Location check · {Math.floor(left / 60000)}:{String(Math.floor(left / 1000) % 60).padStart(2, "0")} left</SectionTitle>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "4px 0 6px" }}>1 · LOCATION</div>
      <LocationStep onChange={setLoc} />
      {loc && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "14px 0 6px" }}>2 · PHOTO OF WHERE YOU ARE</div>
          <div style={{ maxWidth: 420 }}><CameraCapture name={me.fullName} geo={loc.geo} onCapture={setPhoto} selfie /></div>
          <Btn style={{ marginTop: 12 }} disabled={busy || !photo} onClick={send}>{busy ? "Sending…" : "Confirm my location"}</Btn>
          {!photo && <Btn small variant="ghost" style={{ marginTop: 12, marginLeft: 8 }} disabled={busy} onClick={send}>Send without photo</Btn>}
        </>
      )}
    </SectionCard>
  );
}

export default function FieldVisits() {
  const [data, setData] = useState(null);
  const [checkIn, setCheckIn] = useState(false);
  const [out, setOut] = useState({ outcome: "", nextStep: "" });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const { ensure, modal } = useConsent();
  const [, tick] = useState(0);

  const load = useCallback(() => api("/api/staff/visits").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); const t = setInterval(() => { tick(n => n + 1); }, 30000); return () => clearInterval(t); }, [load]);

  async function startCheckIn() { if (await ensure()) setCheckIn(true); }
  async function checkOut() {
    setBusy(true);
    const loc = await getLocation();
    try { await api("/api/staff/visits", { method: "POST", body: { action: "check-out", id: data.active.id, geo: loc.geo || null, outcome: out.outcome, nextStep: out.nextStep, deviceId: getDeviceId() } }); toast("Checked out"); setOut({ outcome: "", nextStep: "" }); load(); }
    catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  async function openVisit(id) {
    try { setOpen((await api(`/api/staff/visits?id=${id}`)).visit); } catch (e) { toast(e.message, "err"); }
  }

  if (!data) return <EmptyState>Loading…</EmptyState>;
  const a = data.active;
  const today = new Date().toISOString().slice(0, 10);
  const todays = data.visits.filter(v => v.checkIn.at.slice(0, 10) === today);
  const avgTrust = data.visits.length ? Math.round(data.visits.slice(0, 30).reduce((n, v) => n + v.trust, 0) / Math.min(30, data.visits.length)) : null;
  const confirmed = data.visits.filter(v => v.confirmation?.status === "confirmed").length;

  return (
    <div>
      {modal}
      <PageHeader title="Field Visits" sub="Check in at every client visit with GPS and a live photo. Client-confirmed visits count the most toward your performance."
        action={!a && <Btn icon={LogIn} onClick={startCheckIn}>Check in at a client</Btn>} />
      {data.pendingSpotChecks.map(s => <SpotCheckResponder key={s.id} spot={s} onDone={load} />)}
      <PhoneCheck />

      <Grid min={160} style={{ marginBottom: 16 }}>
        <SectionCard style={{ padding: 14 }}><div style={{ fontSize: 12, color: C.textMuted }}>Visits today</div><div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>{todays.length}</div></SectionCard>
        <SectionCard style={{ padding: 14 }}><div style={{ fontSize: 12, color: C.textMuted }}>Client-confirmed (all time)</div><div style={{ fontSize: 24, fontWeight: 800, color: C.mint }}>{confirmed}</div></SectionCard>
        <SectionCard style={{ padding: 14 }}><div style={{ fontSize: 12, color: C.textMuted }}>My average trust score</div><div style={{ fontSize: 24, fontWeight: 800, color: avgTrust == null ? C.textMuted : avgTrust >= 80 ? C.mint : avgTrust >= 55 ? C.amber : C.rose }}>{avgTrust == null ? "—" : `${avgTrust}%`}</div></SectionCard>
      </Grid>

      {a && (
        <SectionCard style={{ marginBottom: 16, borderColor: `${C.mint}66` }}>
          <SectionTitle sub={`Checked in ${timeAgo(a.checkIn.at)} · ${a.purpose || "visit"}`}>🟢 You're at {a.organisation}</SectionTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Badge color={LEVEL[a.level][1]}>{a.trust}% · {LEVEL[a.level][0]}</Badge>
            <Badge color={CONF[a.confirmation.status]?.[1]}>{CONF[a.confirmation.status]?.[0]}</Badge>
            {a.confirmUrl && <Btn small variant="ghost" icon={Send} onClick={() => copyText(a.confirmUrl).then(() => toast("Confirmation link copied. Send it to the client."))}>Copy client confirmation link</Btn>}
          </div>
          <Grid min={220} style={{ marginBottom: 10 }}>
            <Field label="Outcome"><Textarea value={out.outcome} onChange={e => setOut(o => ({ ...o, outcome: e.target.value }))} style={{ minHeight: 50 }} placeholder="What happened?" /></Field>
            <Field label="Next step"><Input value={out.nextStep} onChange={e => setOut(o => ({ ...o, nextStep: e.target.value }))} placeholder="e.g. Send proposal Friday" /></Field>
          </Grid>
          <Btn icon={LogOut} disabled={busy} onClick={checkOut}>{busy ? "Checking out…" : "Check out"}</Btn>
        </SectionCard>
      )}

      <SectionCard>
        <SectionTitle>My visits</SectionTitle>
        {data.visits.length === 0 && <EmptyState icon={MapPin}>No visits yet. Check in when you arrive at a client.</EmptyState>}
        {data.visits.map(v => {
          const [ll, lc] = LEVEL[v.level] || LEVEL.review;
          return (
            <button key={v.id} type="button" onClick={() => openVisit(v.id)} className="so-row" style={{ display: "flex", gap: 12, width: "100%", alignItems: "center", padding: "11px 6px", border: "none", borderBottom: `1px solid ${C.border}`, background: "none", cursor: "pointer", textAlign: "left", fontFamily: font, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{v.organisation}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{fmtDateTime(v.checkIn.at)}{v.durationMin != null ? ` · ${v.durationMin} min` : " · in progress"}{v.purpose ? ` · ${v.purpose}` : ""}</div>
              </div>
              <Badge color={CONF[v.confirmation?.status]?.[1] || C.textMuted}>{CONF[v.confirmation?.status]?.[0] || "—"}</Badge>
              <Badge color={lc}>{v.trust}% · {ll}</Badge>
            </button>
          );
        })}
      </SectionCard>

      {data.spotChecks.length > 0 && (
        <SectionCard style={{ marginTop: 16 }}>
          <SectionTitle>My location checks</SectionTitle>
          {data.spotChecks.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, flexWrap: "wrap" }}>
              <span style={{ color: C.text }}><Clock size={13} style={{ verticalAlign: -2 }} /> {fmtDateTime(s.issuedAt)} · {s.reason}</span>
              <Badge color={s.status === "answered" && !(s.flags || []).length ? C.mint : s.status === "pending" ? C.amber : C.rose}>{s.status}{(s.flags || []).length ? ` · ${s.flags.length} flag(s)` : ""}</Badge>
            </div>
          ))}
        </SectionCard>
      )}

      {checkIn && <CheckInFlow onClose={() => setCheckIn(false)} onDone={load} />}
      {open && (
        <Modal title={open.organisation} onClose={() => setOpen(null)} width={620}>
          {open.photoDataUrl && <img src={open.photoDataUrl} alt="Visit evidence" style={{ width: "100%", borderRadius: 12, marginBottom: 10 }} />}
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8 }}>
            <div>Checked in {fmtDateTime(open.checkIn.at)} {open.checkIn.geo && <a href={mapsLink(open.checkIn.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>· view on map (±{open.checkIn.geo.accuracy}m)</a>}</div>
            {open.checkOut?.at && <div>Checked out {fmtDateTime(open.checkOut.at)} · {open.durationMin} min</div>}
            {open.outcome && <div>Outcome: {open.outcome}</div>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, letterSpacing: "0.06em", margin: "12px 0 6px" }}>WHY THIS TRUST SCORE ({open.trust}%)</div>
          {(open.flags || []).length === 0 && <div style={{ fontSize: 13, color: C.mint }}>No issues found. Get the client to confirm to reach 100%.</div>}
          {(open.flags || []).map(x => <div key={x.code} style={{ fontSize: 13, color: x.penalty > 0 ? C.mint : x.severity === "high" ? C.rose : C.amber, marginBottom: 4 }}>{x.penalty > 0 ? "✓" : "•"} {x.label}</div>)}
          {open.confirmUrl && open.confirmation.status === "pending" && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Btn small variant="ghost" icon={Copy} onClick={() => copyText(open.confirmUrl).then(() => toast("Link copied"))}>Copy client confirmation link</Btn>
              {open.contactEmail && <Btn small variant="ghost" icon={Send} onClick={() => api("/api/staff/visits", { method: "POST", body: { action: "resend-confirmation", id: open.id } }).then(() => toast("Email re-sent")).catch(e => toast(e.message, "err"))}>Re-send email</Btn>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
