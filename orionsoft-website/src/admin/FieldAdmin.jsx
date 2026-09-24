// Admin: Attendance & Field (timesheets with GPS/device, visits with photo
// evidence and trust, live map, location checks) and Performance scorecards.
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Download, Eye, Clock, UserX, Palmtree, AlertTriangle } from "lucide-react";
import { C, font } from "../staff/theme.js";
import { Btn, Badge, SectionCard, SectionTitle, Input, Select, Modal, Tabs, EmptyState, StatCard, Avatar, Progress, Grid, Toaster, toast } from "../staff/components.jsx";
import { Scorecard, GRADE_COLOR } from "../staff/modules/Performance.jsx";
import "../staff/staff.css";

const FieldMap = lazy(() => import("./FieldMap.jsx"));

async function call(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}
const lagosToday = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);
const monthStart = () => `${lagosToday().slice(0, 8)}01`;
const time = iso => (iso ? new Date(iso).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" }) : "—");
const dt = iso => (iso ? new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const mins = m => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
const maps = g => (g ? `https://www.google.com/maps?q=${g.lat},${g.lng}` : null);
const device = ua => {
  if (!ua) return "—";
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "Other";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return `${os}${br ? ` · ${br}` : ""}`;
};
function csv(name, headers, rows) {
  const s = [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, "'")}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([s], { type: "text/csv" }));
  a.download = `${name}-${lagosToday()}.csv`; a.click();
}
const LEVEL = { verified: ["Verified", C.mint], review: ["Review", C.amber], suspicious: ["Suspicious", C.rose] };
const CONF = { pending: ["Awaiting client", C.textMuted], confirmed: ["Client confirmed", C.mint], disputed: ["Disputed", C.rose] };
const th = { textAlign: "left", fontSize: 11.5, color: C.textMuted, padding: 8, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontFamily: font };
const td = { padding: 8, fontSize: 13, color: C.text, verticalAlign: "top" };

function RangePicker({ range, setRange }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <Input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} style={{ width: 150 }} aria-label="From" />
      <span style={{ color: C.textMuted }}>to</span>
      <Input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} style={{ width: 150 }} aria-label="To" />
    </div>
  );
}

function VisitDetail({ id, onClose }) {
  const [v, setV] = useState(null);
  useEffect(() => { call(`/api/admin/field?view=visits&id=${encodeURIComponent(id)}`).then(j => setV(j.visit)).catch(e => toast(e.message, "err")); }, [id]);
  if (!v) return <Modal title="Loading…" onClose={onClose}><EmptyState>Loading evidence…</EmptyState></Modal>;
  const [ll, lc] = LEVEL[v.level] || LEVEL.review;
  return (
    <Modal title={`${v.organisation}`} onClose={onClose} width={760}>
      <Grid min={300}>
        <div>
          {v.photoDataUrl ? <img src={v.photoDataUrl} alt="Visit photo evidence" style={{ width: "100%", borderRadius: 12 }} /> : <EmptyState>No photo taken</EmptyState>}
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Photo: {v.photoSource === "camera" ? "taken live with the camera" : v.photoSource === "upload" ? "uploaded from gallery" : "none"}</div>
        </div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}><Badge color={lc}>{v.trust}% · {ll}</Badge><Badge color={CONF[v.confirmation?.status]?.[1]}>{CONF[v.confirmation?.status]?.[0]}</Badge></div>
          <div><strong style={{ color: C.heading }}>Purpose:</strong> {v.purpose || "—"}</div>
          <div><strong style={{ color: C.heading }}>Contact:</strong> {[v.contactName, v.contactPhone, v.contactEmail].filter(Boolean).join(" · ") || "—"}</div>
          <div><strong style={{ color: C.heading }}>Check-in:</strong> {dt(v.checkIn.at)} {v.checkIn.geo ? <a href={maps(v.checkIn.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map (±{v.checkIn.geo.accuracy}m)</a> : <span style={{ color: C.rose }}>no GPS: {v.checkIn.geoError}</span>}</div>
          <div><strong style={{ color: C.heading }}>Check-out:</strong> {v.checkOut?.at ? `${dt(v.checkOut.at)} · ${v.durationMin} min` : "still checked in"} {v.checkOut?.geo && <a href={maps(v.checkOut.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map</a>}</div>
          {v.distanceFromSite != null && <div><strong style={{ color: C.heading }}>Distance from confirmed site:</strong> {v.distanceFromSite >= 1000 ? `${(v.distanceFromSite / 1000).toFixed(1)}km` : `${v.distanceFromSite}m`}</div>}
          <div><strong style={{ color: C.heading }}>Device / IP:</strong> {device(v.checkIn.ua)} · {v.checkIn.ip || "—"}</div>
          {v.outcome && <div><strong style={{ color: C.heading }}>Outcome:</strong> {v.outcome}</div>}
          {v.confirmation?.at && <div><strong style={{ color: C.heading }}>Client answer:</strong> {v.confirmation.status} by {v.confirmation.name || "unnamed"} {v.confirmation.rating ? `· ${"★".repeat(v.confirmation.rating)}` : ""} {v.confirmation.comment ? `· "${v.confirmation.comment}"` : ""} · {dt(v.confirmation.at)}</div>}
        </div>
      </Grid>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "14px 0 6px" }}>EVIDENCE CHECKS</div>
      {(v.flags || []).length === 0 && <div style={{ fontSize: 13, color: C.mint }}>No problems detected.</div>}
      {(v.flags || []).map(f => <div key={f.code} style={{ fontSize: 13, padding: "3px 0", color: f.penalty > 0 ? C.mint : f.severity === "high" ? C.rose : C.amber }}>{f.penalty > 0 ? "✓" : "•"} {f.label} <span style={{ color: C.textMuted }}>({f.penalty > 0 ? "+" : ""}{f.penalty})</span></div>)}
    </Modal>
  );
}

const KIND_LABEL = { overlay: "pop-up blocked by another app", denied: "location blocked", camera_denied: "camera blocked", off: "GPS switched off", timeout: "no GPS signal", no_camera: "no camera", camera_busy: "camera busy", notif_denied: "notifications blocked", unsupported: "browser not supported", insecure: "not on https", unknown: "not tested" };

function SpotDetail({ id, onClose }) {
  const [s, setS] = useState(null);
  useEffect(() => { call(`/api/admin/field?view=spotchecks&id=${encodeURIComponent(id)}`).then(j => setS(j.spotcheck)).catch(e => toast(e.message, "err")); }, [id]);
  if (!s) return <Modal title="Loading…" onClose={onClose}><EmptyState>Loading evidence…</EmptyState></Modal>;
  const r = s.response;
  return (
    <Modal title={`Location check · ${s.employeeName}`} onClose={onClose} width={640}>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, marginBottom: 10 }}>
        <div><strong style={{ color: C.heading }}>Sent:</strong> {dt(s.issuedAt)} · {s.reason} · due {time(s.dueAt)}</div>
        <div><strong style={{ color: C.heading }}>Status:</strong> {s.status}{r?.at ? ` · answered at ${time(r.at)}` : ""}</div>
        {r?.geo && <div><strong style={{ color: C.heading }}>Location:</strong> <a href={maps(r.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>open map (±{r.geo.accuracy}m)</a></div>}
        {s.distanceFromLastVisit != null && <div><strong style={{ color: C.heading }}>Distance from checked-in visit ({s.lastVisitOrganisation}):</strong> {s.distanceFromLastVisit >= 1000 ? `${(s.distanceFromLastVisit / 1000).toFixed(1)}km` : `${s.distanceFromLastVisit}m`}</div>}
        {r && <div><strong style={{ color: C.heading }}>Device:</strong> {device(r.ua)} · {r.ip}</div>}
      </div>
      {r?.photoDataUrl ? <img src={r.photoDataUrl} alt="Location check photo" style={{ width: "100%", borderRadius: 12 }} /> : <EmptyState>{r ? "Answered without a photo" : "No response yet"}</EmptyState>}
      {r && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Photo: {r.photoSource === "camera" ? "taken live with the camera" : "uploaded from gallery"}</div>}
      {(s.flags || []).map(f => <div key={f.code} style={{ fontSize: 13, color: C.rose, marginTop: 6 }}>• {f.label}</div>)}
    </Modal>
  );
}

export function AttendanceFieldSection() {
  const [tab, setTab] = useState("today");
  const [range, setRange] = useState({ from: monthStart(), to: lagosToday() });
  const [who, setWho] = useState("");
  const [att, setAtt] = useState(null);
  const [visits, setVisits] = useState(null);
  const [spots, setSpots] = useState(null);
  const [openVisit, setOpenVisit] = useState(null);
  const [openSpot, setOpenSpot] = useState(null);
  const [openDay, setOpenDay] = useState(null);

  const load = useCallback(async () => {
    try {
      const q = `from=${range.from}&to=${range.to}${who ? `&employeeId=${who}` : ""}`;
      const [a, v, s] = await Promise.all([call(`/api/admin/field?view=attendance&${q}`), call(`/api/admin/field?view=visits&${q}`), call(`/api/admin/field?view=spotchecks&${q}`)]);
      setAtt(a); setVisits(v); setSpots(s);
    } catch (e) { toast(e.message, "err"); }
  }, [range, who]);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const people = useMemo(() => {
    const m = new Map();
    (att?.rows || []).forEach(r => m.set(r.employeeId, r.employeeName));
    (visits?.visits || []).forEach(v => m.set(v.employeeId, v.employeeName));
    (att?.absentToday || []).forEach(p => m.set(p.id, p.fullName));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [att, visits]);

  async function requestSpot(employeeId, name) {
    if (!confirm(`Ask ${name} to confirm their location now (20-minute window)?`)) return;
    try { await call("/api/admin/field", { method: "POST", body: { action: "spot-request", employeeId } }); toast(`Location check sent to ${name}`); load(); } catch (e) { toast(e.message, "err"); }
  }

  if (!att) return <div><Toaster /><EmptyState>Loading attendance…</EmptyState></div>;
  const today = att.today;
  const todayRows = att.rows.filter(r => r.date === today);
  const inNow = todayRows.filter(r => r.clockIn && !r.clockOut);
  const late = todayRows.filter(r => r.lateMinutes > 0);
  const noGps = todayRows.filter(r => r.clockIn && !r.clockInGeo);
  const flaggedVisits = visits.visits.filter(v => v.level !== "verified");

  return (
    <div style={{ fontFamily: font }}>
      <Toaster />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="Clocked in now" value={inNow.length} color={C.mint} icon={Clock} />
        <StatCard label="Not in today" value={att.absentToday.length} color={C.rose} icon={UserX} />
        <StatCard label="Late today" value={late.length} color={C.amber} icon={AlertTriangle} />
        <StatCard label="On leave" value={att.onLeaveToday.length} color={C.purple} icon={Palmtree} />
        <StatCard label="Visits in period" value={visits.visits.length} sub={`${visits.visits.filter(v => v.confirmation?.status === "confirmed").length} client-confirmed`} color={C.blue} icon={MapPin} />
        <StatCard label="Visits to review" value={flaggedVisits.length} color={flaggedVisits.length ? C.rose : C.mint} />
      </div>
      <SectionCard style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <RangePicker range={range} setRange={setRange} />
          <Select value={who} onChange={e => setWho(e.target.value)} style={{ maxWidth: 240 }}><option value="">Everyone</option>{people.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select>
          <div style={{ flex: 1 }} />
          <Btn small variant="ghost" icon={Download} onClick={() => csv("timesheet", ["Date", "Name", "Clock in", "Clock-in location", "Accuracy (m)", "Late (min)", "Clock out", "Clock-out location", "Hours", "Mode", "Device", "IP", "Standup", "Forgot clock-out"], att.rows.map(r => [r.date, r.employeeName, time(r.clockIn), r.clockInGeo ? `${r.clockInGeo.lat},${r.clockInGeo.lng}` : "not shared", r.clockInGeo?.accuracy ?? "", r.lateMinutes || 0, time(r.clockOut), r.clockOutGeo ? `${r.clockOutGeo.lat},${r.clockOutGeo.lng}` : "", ((r.minutes || 0) / 60).toFixed(1), r.mode, device(r.clockInUa), r.clockInIp || "", r.standup ? "yes" : "no", r.forgotClockOut ? "yes" : ""]))}>Timesheet CSV</Btn>
          <Btn small variant="ghost" icon={Download} onClick={() => csv("field-visits", ["Date", "Name", "Organisation", "Purpose", "Check-in", "Check-out", "Minutes", "Latitude", "Longitude", "Accuracy", "Trust", "Level", "Client confirmation", "Flags"], visits.visits.map(v => [v.checkIn.at.slice(0, 10), v.employeeName, v.organisation, v.purpose, time(v.checkIn.at), time(v.checkOut?.at), v.durationMin ?? "", v.checkIn.geo?.lat ?? "", v.checkIn.geo?.lng ?? "", v.checkIn.geo?.accuracy ?? "", v.trust, v.level, v.confirmation?.status, (v.flags || []).filter(f => f.penalty < 0).map(f => f.code).join(" ")]))}>Visits CSV</Btn>
        </div>
      </SectionCard>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}><Btn small variant="ghost" onClick={() => { load(); toast("Refreshed"); }}>Refresh</Btn></div>
      <Tabs active={tab} onChange={id => { setTab(id); load(); }} tabs={[{ id: "today", label: "Today" }, { id: "timesheet", label: "Timesheet" }, { id: "visits", label: "Field visits", count: flaggedVisits.length }, { id: "map", label: "Map" }, { id: "spots", label: "Location checks" }]} />

      {tab === "today" && (
        <Grid min={320}>
          <SectionCard>
            <SectionTitle>Clocked in today ({todayRows.length})</SectionTitle>
            {todayRows.length === 0 && <EmptyState>Nobody has clocked in yet.</EmptyState>}
            {todayRows.map(r => (
              <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading }}>{r.employeeName}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>In {time(r.clockIn)}{r.clockOut ? ` · out ${time(r.clockOut)}` : " · still in"} · {r.mode?.replace("_", " ")}</div>
                </div>
                {r.lateMinutes > 0 && <Badge color={C.amber}>{mins(r.lateMinutes)} late</Badge>}
                {r.clockInGeo ? <a href={maps(r.clockInGeo)} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: C.blue }}>📍 map</a> : <Badge color={C.rose}>no GPS</Badge>}
                {!r.clockOut && ["field", "client_site", "hybrid"].includes(r.mode) && <Btn small variant="ghost" icon={MapPin} onClick={() => requestSpot(r.employeeId, r.employeeName)}>Check now</Btn>}
              </div>
            ))}
          </SectionCard>
          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <SectionCard>
              <SectionTitle>Not clocked in ({att.absentToday.length})</SectionTitle>
              {att.absentToday.length === 0 ? <EmptyState>Everyone is in.</EmptyState> : att.absentToday.map(p => <div key={p.id} style={{ fontSize: 13.5, color: C.text, padding: "5px 0" }}>• {p.fullName}</div>)}
            </SectionCard>
            <SectionCard>
              <SectionTitle sub="From each person's 'Set up your phone' test. Fix problems before sending a location check.">Phone readiness</SectionTitle>
              {(att.devices || []).length === 0 && <EmptyState>No staff yet.</EmptyState>}
              {(att.devices || []).map(d => {
                const c = d.check;
                const problem = c && !c.ready ? [c.location !== "ok" && `GPS: ${KIND_LABEL[c.location] || c.location}`, c.camera !== "ok" && `camera: ${KIND_LABEL[c.camera] || c.camera}`].filter(Boolean).join(" · ") : "";
                return (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, flexWrap: "wrap" }}>
                    <span style={{ color: C.text }}>{d.fullName}</span>
                    {!c ? <Badge color={C.textMuted}>not set up yet</Badge>
                      : c.ready ? <Badge color={C.mint}>ready{c.notifications === "ok" ? " · alerts on" : ""}{c.accuracy ? ` · ±${c.accuracy}m` : ""}</Badge>
                      : <Badge color={C.rose}>{problem}</Badge>}
                  </div>
                );
              })}
            </SectionCard>
            {noGps.length > 0 && <SectionCard style={{ borderColor: `${C.amber}55` }}><SectionTitle>Clocked in without location</SectionTitle>{noGps.map(r => <div key={r.id} style={{ fontSize: 13.5, color: C.text, padding: "4px 0" }}>• {r.employeeName} at {time(r.clockIn)}</div>)}</SectionCard>}
            {att.onLeaveToday.length > 0 && <SectionCard><SectionTitle>On leave</SectionTitle>{att.onLeaveToday.map(p => <div key={p.id} style={{ fontSize: 13.5, color: C.text, padding: "4px 0" }}>• {p.fullName}</div>)}</SectionCard>}
          </div>
        </Grid>
      )}

      {tab === "timesheet" && (
        <SectionCard>
          {att.rows.length === 0 && <EmptyState>No clock-ins in this period.</EmptyState>}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead><tr>{["Date", "Staff", "Clock in", "Location", "Clock out", "Hours", "Mode", "Device", "Notes", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {att.rows.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={td}>{r.date}</td>
                    <td style={{ ...td, color: C.heading, fontWeight: 700 }}>{r.employeeName}</td>
                    <td style={td}>{time(r.clockIn)} {r.lateMinutes > 0 && <Badge color={C.amber}>{mins(r.lateMinutes)} late</Badge>}</td>
                    <td style={td}>{r.clockInGeo ? <a href={maps(r.clockInGeo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map ±{r.clockInGeo.accuracy}m</a> : <span style={{ color: C.rose }}>not shared</span>}</td>
                    <td style={td}>{r.clockOut ? time(r.clockOut) : <span style={{ color: C.mint }}>in</span>} {r.forgotClockOut && <Badge color={C.rose}>forgot</Badge>}</td>
                    <td style={td}>{((r.minutes || 0) / 60).toFixed(1)}h</td>
                    <td style={td}>{r.mode?.replace("_", " ")}</td>
                    <td style={{ ...td, fontSize: 12 }}>{device(r.clockInUa)}<div style={{ color: C.textMuted }}>{r.clockInIp}</div></td>
                    <td style={{ ...td, fontSize: 12 }}>{r.standup ? "standup ✓" : ""}{r.eod ? ` · EOD: ${r.eod.slice(0, 50)}` : ""}</td>
                    <td style={td}><Btn small variant="ghost" icon={Eye} onClick={() => setOpenDay(r)}>Trail</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === "visits" && (
        <SectionCard>
          {visits.visits.length === 0 && <EmptyState>No field visits in this period.</EmptyState>}
          {visits.visits.map(v => {
            const [ll, lc] = LEVEL[v.level] || LEVEL.review;
            const bad = (v.flags || []).filter(f => f.penalty < 0);
            return (
              <div key={v.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 4px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{v.employeeName} → {v.organisation}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{dt(v.checkIn.at)}{v.durationMin != null ? ` · ${v.durationMin} min` : " · in progress"}{v.purpose ? ` · ${v.purpose}` : ""}</div>
                  {bad.length > 0 && <div style={{ fontSize: 12, color: lc, marginTop: 3 }}>{bad.map(f => f.label).join(" · ")}</div>}
                </div>
                <Badge color={CONF[v.confirmation?.status]?.[1]}>{CONF[v.confirmation?.status]?.[0]}</Badge>
                <Badge color={lc}>{v.trust}% · {ll}</Badge>
                <Btn small variant="ghost" icon={Eye} onClick={() => setOpenVisit(v.id)}>Evidence</Btn>
              </div>
            );
          })}
        </SectionCard>
      )}

      {tab === "map" && (
        <SectionCard>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: C.textMuted, marginBottom: 10 }}>
            <span><span style={{ color: C.mint }}>●</span> verified visit</span><span><span style={{ color: C.amber }}>●</span> needs review</span><span><span style={{ color: C.rose }}>●</span> suspicious</span><span><span style={{ color: C.gold }}>○</span> clock-in</span><span><span style={{ color: C.blue }}>◯</span> confirmed client location</span>
          </div>
          <Suspense fallback={<EmptyState>Loading map…</EmptyState>}>
            <FieldMap visits={visits.visits} sites={visits.sites} clockIns={att.rows.filter(r => r.clockInGeo).map(r => ({ geo: r.clockInGeo, name: r.employeeName, time: `${r.date} ${time(r.clockIn)}` }))} />
          </Suspense>
        </SectionCard>
      )}

      {tab === "spots" && (
        <Grid min={320}>
          <SectionCard>
            <SectionTitle sub="A random check goes to field staff once each weekday. You can also send one now.">Send a location check</SectionTitle>
            {people.length === 0 && <EmptyState>No staff activity yet.</EmptyState>}
            {people.map(([id, n]) => <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: 13.5, color: C.text }}>{n}</span><Btn small variant="ghost" icon={MapPin} onClick={() => requestSpot(id, n)}>Check now</Btn></div>)}
          </SectionCard>
          <SectionCard>
            <SectionTitle>Recent checks</SectionTitle>
            {spots.spotchecks.length === 0 && <EmptyState>No location checks yet.</EmptyState>}
            {spots.spotchecks.map(s => (
              <div key={s.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.heading }}>{s.employeeName}</span>
                  <Badge color={s.status === "answered" && !(s.flags || []).length ? C.mint : s.status === "pending" ? C.amber : C.rose}>{s.status}</Badge>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{dt(s.issuedAt)} · {s.reason}{s.response?.at ? ` · answered ${time(s.response.at)}` : ""}{s.response?.geo ? " · " : ""}{s.response?.geo && <a href={maps(s.response.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map</a>}</div>
                {(s.flags || []).map(f => <div key={f.code} style={{ fontSize: 12, color: C.rose }}>• {f.label}</div>)}
                {s.response && <Btn small variant="ghost" icon={Eye} onClick={() => setOpenSpot(s.id)} style={{ marginTop: 6 }}>Evidence</Btn>}
              </div>
            ))}
          </SectionCard>
        </Grid>
      )}

      {openVisit && <VisitDetail id={openVisit} onClose={() => setOpenVisit(null)} />}
      {openSpot && <SpotDetail id={openSpot} onClose={() => setOpenSpot(null)} />}
      {openDay && (
        <Modal title={`${openDay.employeeName} · ${openDay.date}`} onClose={() => setOpenDay(null)} width={640}>
          {(openDay.events || []).length === 0 && <EmptyState>No event trail for this day.</EmptyState>}
          {(openDay.events || []).map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, flexWrap: "wrap" }}>
              <strong style={{ color: C.heading, minWidth: 60 }}>{time(e.at)}</strong>
              <span style={{ color: C.text, minWidth: 90 }}>{e.type.replace("_", " ")}</span>
              {e.geo ? <a href={maps(e.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map ±{e.geo.accuracy}m</a> : <span style={{ color: C.textMuted }}>no location</span>}
              <span style={{ color: C.textMuted }}>{device(e.ua)} · {e.ip}</span>
            </div>
          ))}
          {openDay.standup && <div style={{ fontSize: 13, color: C.text, marginTop: 12, lineHeight: 1.6 }}><strong>Standup:</strong> {openDay.standup.today}{openDay.standup.blockers ? ` · Blockers: ${openDay.standup.blockers}` : ""}</div>}
        </Modal>
      )}
    </div>
  );
}

export function PerformanceSection() {
  const [range, setRange] = useState({ from: monthStart(), to: lagosToday() });
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState("all");
  useEffect(() => { call(`/api/admin/field?view=performance&from=${range.from}&to=${range.to}`).then(setData).catch(e => toast(e.message, "err")); }, [range]);
  if (!data) return <div><Toaster /><EmptyState>Calculating scorecards…</EmptyState></div>;
  const list = data.scorecards.filter(c => filter === "all" || (filter === "concern" ? c.integrity === "concern" : filter === "field" ? c.isField : c.integrity !== "clean"));
  const avg = data.scorecards.length ? Math.round(data.scorecards.reduce((n, c) => n + c.overall, 0) / data.scorecards.length) : 0;
  return (
    <div style={{ fontFamily: font }}>
      <Toaster />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="Team average" value={avg} color={C.gold} />
        <StatCard label="Grade A/B" value={data.scorecards.filter(c => ["A", "B"].includes(c.grade)).length} color={C.mint} />
        <StatCard label="Integrity concerns" value={data.scorecards.filter(c => c.integrity === "concern").length} color={C.rose} />
        <StatCard label="Field staff" value={data.scorecards.filter(c => c.isField).length} color={C.blue} />
      </div>
      <SectionCard style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <RangePicker range={range} setRange={setRange} />
          <Select value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 220 }}><option value="all">Everyone</option><option value="concern">Integrity concerns</option><option value="flags">Anything flagged</option><option value="field">Field staff</option></Select>
          <div style={{ flex: 1 }} />
          <Btn small variant="ghost" icon={Download} onClick={() => csv("performance", ["Name", "Role", "Overall", "Grade", "Attendance", "Field", "Output", "Reporting", "Sales", "Engagement", "Days present", "Late days", "Visits", "Confirmed", "Avg trust", "Flags"], data.scorecards.map(c => [c.fullName, c.role, c.overall, c.grade, c.scores.attendance, c.scores.field, c.scores.output, c.scores.reporting, c.scores.sales, c.scores.engagement, c.metrics.attendance.daysPresent, c.metrics.attendance.lateDays, c.metrics.field.visits, c.metrics.field.confirmed, c.metrics.field.avgTrust, c.flags.map(f => f.text).join(" | ")]))}>Export CSV</Btn>
        </div>
        <p style={{ fontSize: 12.5, color: C.textMuted, margin: "10px 0 0" }}>Weights: attendance {data.weights.attendance} · verified field work {data.weights.field} · tasks & goals {data.weights.output} · reporting honesty {data.weights.reporting} · sales {data.weights.sales} · engagement {data.weights.engagement}. Areas that don't apply to a role are left out. Two or more serious integrity flags cap the score at 49.</p>
      </SectionCard>
      <SectionCard>
        {list.length === 0 && <EmptyState>No scorecards match.</EmptyState>}
        {list.map((c, i) => (
          <div key={c.employeeId} className="so-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
            <span style={{ width: 22, fontWeight: 800, color: C.textMuted }}>{i + 1}</span>
            <Avatar src={c.avatarDataUrl} name={c.fullName} size={36} />
            <div style={{ flex: 1, minWidth: 170 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{c.fullName}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{c.role} · present {c.metrics.attendance.daysPresent}/{c.metrics.attendance.expectedDays} days{c.isField ? ` · ${c.metrics.field.visits} visits (${c.metrics.field.confirmed} confirmed)` : ""}</div>
            </div>
            <div style={{ width: 150 }}><Progress value={c.overall} color={GRADE_COLOR[c.grade]} height={7} /></div>
            <Badge color={GRADE_COLOR[c.grade]}>{c.overall} · {c.grade}</Badge>
            {c.integrity !== "clean" && <Badge color={c.integrity === "concern" ? C.rose : C.amber}>{c.flags.length} flag{c.flags.length === 1 ? "" : "s"}</Badge>}
            <Btn small variant="ghost" icon={Eye} onClick={() => setOpen(c)}>Scorecard</Btn>
          </div>
        ))}
      </SectionCard>
      {open && <Modal title="Scorecard" onClose={() => setOpen(null)} width={780}><Scorecard card={open} weights={data.weights} /></Modal>}
    </div>
  );
}
