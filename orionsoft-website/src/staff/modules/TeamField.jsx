// Team Desk → Field: what the people you manage are doing during the working
// day: live status, today's timeline, timesheet, client visits with evidence,
// map and location checks. The same picture the admin sees, for your team.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { MapPin, Eye, Clock, UserX, AlertTriangle, Briefcase, RefreshCw, Route } from "lucide-react";
import { C, font } from "../theme.js";
import { api } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, SectionTitle, EmptyState, Grid, StatCard, Input, Tabs, Modal, toast } from "../components.jsx";
import VisitPlanCard from "../VisitPlanCard.jsx";
import { useOffice } from "../office.js";
import { VisitDetail, SpotDetail } from "../FieldEvidence.jsx";
import { time, dt, mins, maps, LEVEL, CONF } from "../fieldFormat.js";

const FieldMap = lazy(() => import("../../admin/FieldMap.jsx"));
const loadVisit = id => api(`/api/staff/visits?id=${encodeURIComponent(id)}`).then(j => j.visit);
const loadSpot = id => api(`/api/staff/visits?spot=${encodeURIComponent(id)}`).then(j => j.spotcheck);
const lagosToday = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);

const STATUS = {
  visit: ["At a client", C.blue],
  in: ["Working", C.mint],
  out: ["Finished for the day", C.textMuted],
  not_in: ["Not clocked in", C.rose],
  leave: ["On leave", C.purple],
  day_off: ["Day off", C.textMuted],
};
const th = { textAlign: "left", fontSize: 11.5, color: C.textMuted, padding: 8, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontFamily: font };
const td = { padding: 8, fontSize: 13, color: C.text, verticalAlign: "top" };

function Timeline({ items, onVisit, onSpot }) {
  if (!items.length) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "6px 0" }}>Nothing recorded yet today.</div>;
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((t, i) => (
        <li key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: i ? `1px dashed ${C.border}` : "none", fontSize: 13 }}>
          <strong style={{ color: C.heading, minWidth: 48, fontVariantNumeric: "tabular-nums" }}>{time(t.at)}</strong>
          <span style={{ flex: 1, color: t.flagged || t.level === "suspicious" ? C.rose : C.text }}>
            {t.text}
            {t.geo && <> · <a href={maps(t.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map ±{Math.round(t.geo.accuracy || 0)}m</a></>}
            {t.visitId && <> · <button type="button" onClick={() => onVisit(t.visitId)} style={{ background: "none", border: "none", padding: 0, color: C.gold, cursor: "pointer", fontSize: 13, fontFamily: font }}>evidence</button></>}
            {t.spotId && t.kind === "spot_answer" && <> · <button type="button" onClick={() => onSpot(t.spotId)} style={{ background: "none", border: "none", padding: 0, color: C.gold, cursor: "pointer", fontSize: 13, fontFamily: font }}>photo</button></>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function TeamField() {
  const { openPerson } = useOffice();
  const [tab, setTab] = useState("now");
  const [range, setRange] = useState({ from: lagosToday(), to: lagosToday() });
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});
  const [openVisit, setOpenVisit] = useState(null);
  const [openSpot, setOpenSpot] = useState(null);
  const [planFor, setPlanFor] = useState(null);

  const load = useCallback(() => api(`/api/staff/team?view=field&from=${range.from}&to=${range.to}`).then(setData).catch(e => toast(e.message, "err")), [range]);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  async function checkNow(p) {
    if (!confirm(`Ask ${p.fullName} to confirm their location now with a live photo?`)) return;
    try { await api("/api/staff/visits", { method: "POST", body: { action: "spot-request", employeeId: p.id } }); toast(`Location check sent to ${p.fullName}`); load(); }
    catch (e) { toast(e.message, "err"); }
  }

  if (!data) return <EmptyState>Loading the field view…</EmptyState>;
  const count = s => data.now.filter(p => p.status === s).length;
  const late = data.now.filter(p => p.attendance?.lateMinutes > 0).length;
  const flagged = data.visits.filter(v => v.level !== "verified");

  return (
    <div>
      <Grid min={150} style={{ marginBottom: 14 }}>
        <StatCard label="Working now" value={count("in") + count("visit")} color={C.mint} icon={Clock} />
        <StatCard label="At a client" value={count("visit")} color={C.blue} icon={Briefcase} />
        <StatCard label="Not clocked in" value={count("not_in")} color={C.rose} icon={UserX} />
        <StatCard label="Late today" value={late} color={C.amber} icon={AlertTriangle} />
        <StatCard label="Visits in period" value={data.visits.length} sub={`${data.visits.filter(v => v.confirmation?.status === "confirmed").length} client-confirmed`} color={C.gold} icon={MapPin} />
      </Grid>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <Input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} style={{ width: 150 }} aria-label="From" />
        <span style={{ color: C.textMuted }}>to</span>
        <Input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} style={{ width: 150 }} aria-label="To" />
        <div style={{ flex: 1 }} />
        <Btn small variant="ghost" icon={RefreshCw} onClick={() => { load(); toast("Refreshed"); }}>Refresh</Btn>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: "now", label: "Right now" }, { id: "timesheet", label: "Timesheet" }, { id: "visits", label: "Client visits", count: flagged.length }, { id: "map", label: "Map" }, { id: "spots", label: "Location checks" }]} />

      {tab === "now" && (
        <Grid min={320}>
          {data.now.length === 0 && <EmptyState>No one reports to you yet.</EmptyState>}
          {data.now.map(p => {
            const [label, color] = STATUS[p.status] || STATUS.out;
            const a = p.attendance;
            return (
              <SectionCard key={p.id} style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button type="button" onClick={() => openPerson(p.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><Avatar src={p.avatarDataUrl} name={p.fullName} size={40} presence={p.presence?.status} /></button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: C.heading }}>{p.fullName}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{p.schedule.label}{p.schedule.personal ? " (own hours)" : ""}</div>
                  </div>
                  <Badge color={color}>{label}</Badge>
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, marginTop: 10 }}>
                  {p.openVisit && <div><strong style={{ color: C.heading }}>At {p.openVisit.organisation}</strong> since {time(p.openVisit.since)} · <span style={{ color: (LEVEL[p.openVisit.level] || LEVEL.review)[1] }}>trust {p.openVisit.trust}%</span></div>}
                  {a?.clockIn && <div>In {time(a.clockIn)}{a.clockOut ? ` · out ${time(a.clockOut)} · ${mins(a.minutes || 0)}` : ""} · {String(a.mode || "").replace("_", " ")} {a.lateMinutes > 0 && <Badge color={C.amber}>{mins(a.lateMinutes)} late</Badge>} {a.earlyMinutes >= 15 && <Badge color={C.amber}>left {mins(a.earlyMinutes)} early</Badge>}</div>}
                  {a?.standup && <div><strong style={{ color: C.heading }}>Today:</strong> {a.standup}</div>}
                  {p.plan?.planned > 0 && <div><strong style={{ color: C.heading }}>Plan:</strong> {p.plan.visited} of {p.plan.planned} visited{p.plan.stops.some(st => st.status === "pending") ? ` · next: ${p.plan.stops.find(st => st.status === "pending").organisation}` : ""}</div>}
                  {p.lastSeen && <div style={{ color: C.textMuted }}>Last location {time(p.lastSeen.at)}: <a href={maps(p.lastSeen.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>open map</a></div>}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <Btn small variant="ghost" onClick={() => setOpen(o => ({ ...o, [p.id]: !o[p.id] }))}>{open[p.id] ? "Hide" : "Show"} today's timeline ({p.timeline.length})</Btn>
                  {(p.status === "in" || p.status === "visit") && <Btn small variant="ghost" icon={MapPin} onClick={() => checkNow(p)}>Check location now</Btn>}
                  <Btn small variant="ghost" icon={Route} onClick={() => setPlanFor(p)}>Visit plan</Btn>
                </div>
                {open[p.id] && <div style={{ marginTop: 8 }}><Timeline items={p.timeline} onVisit={setOpenVisit} onSpot={setOpenSpot} /></div>}
              </SectionCard>
            );
          })}
        </Grid>
      )}

      {tab === "timesheet" && (
        <SectionCard>
          {data.rows.length === 0 && <EmptyState>No clock-ins in this period.</EmptyState>}
          {data.rows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead><tr>{["Date", "Staff", "Clock in", "Location", "Clock out", "Hours", "Mode", "End of day"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.rows.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={td}>{r.date}</td>
                      <td style={{ ...td, color: C.heading, fontWeight: 700 }}>{r.employeeName}</td>
                      <td style={td}>{time(r.clockIn)} {r.lateMinutes > 0 && <Badge color={C.amber}>{mins(r.lateMinutes)} late</Badge>}{r.offlineSync && <Badge color={C.blue}>sent later (offline)</Badge>}</td>
                      <td style={td}>{r.clockInGeo ? <a href={maps(r.clockInGeo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map ±{r.clockInGeo.accuracy}m</a> : <span style={{ color: C.rose }}>not shared</span>}</td>
                      <td style={td}>{r.clockOut ? time(r.clockOut) : <span style={{ color: C.mint }}>in</span>} {r.forgotClockOut && <Badge color={C.rose}>forgot</Badge>}{r.earlyMinutes >= 15 && <Badge color={C.amber}>{mins(r.earlyMinutes)} early</Badge>}</td>
                      <td style={td}>{((r.minutes || 0) / 60).toFixed(1)}h{r.overtimeMinutes >= 15 && <div style={{ fontSize: 12, color: C.blue }}>+{mins(r.overtimeMinutes)} overtime</div>}</td>
                      <td style={td}>{String(r.mode || "").replace("_", " ")}</td>
                      <td style={{ ...td, fontSize: 12 }}>{r.eod || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {tab === "visits" && (
        <SectionCard>
          {data.visits.length === 0 && <EmptyState>No client visits in this period.</EmptyState>}
          {data.visits.map(v => {
            const [ll, lc] = LEVEL[v.level] || LEVEL.review;
            const bad = (v.flags || []).filter(f => f.penalty < 0);
            return (
              <div key={v.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 4px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{v.employeeName} → {v.organisation}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{dt(v.checkIn.at)}{v.durationMin != null ? ` · ${v.durationMin} min` : " · still there"}{v.purpose ? ` · ${v.purpose}` : ""}</div>
                  {v.outcome && <div style={{ fontSize: 12.5, color: C.text, marginTop: 2 }}>Outcome: {v.outcome}</div>}
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
            <FieldMap visits={data.visits} sites={data.sites} height={460} clockIns={data.rows.filter(r => r.clockInGeo).map(r => ({ geo: r.clockInGeo, name: r.employeeName, time: `${r.date} ${time(r.clockIn)}` }))} />
          </Suspense>
        </SectionCard>
      )}

      {tab === "spots" && (
        <SectionCard>
          <SectionTitle sub="Use 'Check location now' on the Right now tab to send one.">Location checks</SectionTitle>
          {data.spotchecks.length === 0 && <EmptyState>No location checks in this period.</EmptyState>}
          {data.spotchecks.map(s => (
            <div key={s.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.heading }}>{s.employeeName}</span>
                <Badge color={s.status === "answered" && !(s.flags || []).length ? C.mint : s.status === "pending" ? C.amber : C.rose}>{s.status}</Badge>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{dt(s.issuedAt)} · {s.reason}{s.response?.at ? ` · answered ${time(s.response.at)}` : ""}</div>
              {(s.flags || []).map(f => <div key={f.code} style={{ fontSize: 12, color: C.rose }}>• {f.label}</div>)}
              {s.response && <Btn small variant="ghost" icon={Eye} onClick={() => setOpenSpot(s.id)} style={{ marginTop: 6 }}>Evidence</Btn>}
            </div>
          ))}
        </SectionCard>
      )}

      {planFor && <Modal title={`${planFor.fullName}'s visit plan`} onClose={() => { setPlanFor(null); load(); }} width={720}><VisitPlanCard employeeId={planFor.id} name={planFor.fullName} bare /></Modal>}
      {openVisit && <VisitDetail id={openVisit} load={loadVisit} onClose={() => setOpenVisit(null)} />}
      {openSpot && <SpotDetail id={openSpot} load={loadSpot} onClose={() => setOpenSpot(null)} />}
    </div>
  );
}
