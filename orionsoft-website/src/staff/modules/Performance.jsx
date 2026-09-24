import { useCallback, useEffect, useState } from "react";
import { Gauge, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import { C, font } from "../theme.js";
import { api, naira } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, Input, Modal, EmptyState, PageHeader, Tabs, Grid, Progress, toast } from "../components.jsx";
import { useOffice } from "../office.js";

export const GRADE_COLOR = { A: C.mint, B: C.blue, C: C.amber, D: C.rose, E: C.rose };
const PART_LABEL = { attendance: "Attendance & punctuality", field: "Verified field work", output: "Tasks & goals", reporting: "Reporting honesty", sales: "Sales activity", engagement: "Engagement" };

export function ScoreRing({ value, grade, size = 96 }) {
  const r = size / 2 - 7, circ = 2 * Math.PI * r, color = GRADE_COLOR[grade] || C.gold;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${value}, grade ${grade}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.surface} strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(value / 100) * circ} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.28} fontWeight="800" fill={C.heading} fontFamily={font}>{value}</text>
      <text x="50%" y="68%" textAnchor="middle" fontSize={size * 0.14} fontWeight="800" fill={color} fontFamily={font}>Grade {grade}</text>
    </svg>
  );
}

export function Scorecard({ card, weights }) {
  const m = card.metrics;
  const row = (k, v) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ color: C.textMuted }}>{k}</span><span style={{ color: C.heading, fontWeight: 700, textAlign: "right" }}>{v}</span></div>;
  return (
    <div style={{ fontFamily: font }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <ScoreRing value={card.overall} grade={card.grade} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.heading }}>{card.fullName}</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>{card.role} · {card.department || "—"}</div>
          <div style={{ marginTop: 8 }}>
            {card.integrity === "clean" && <Badge color={C.mint}><CheckCircle2 size={12} /> No integrity concerns</Badge>}
            {card.integrity === "review" && <Badge color={C.amber}><AlertTriangle size={12} /> Some items to review</Badge>}
            {card.integrity === "concern" && <Badge color={C.rose}><AlertTriangle size={12} /> Integrity concerns: score capped</Badge>}
          </div>
        </div>
      </div>
      {card.flags.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${card.integrity === "concern" ? C.rose + "55" : C.amber + "44"}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
          {card.flags.map((f, i) => <div key={i} style={{ fontSize: 13, color: f.severity === "high" ? C.rose : C.amber, padding: "3px 0" }}>• {f.text}</div>)}
        </div>
      )}
      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        {Object.entries(card.scores).filter(([, v]) => v != null).map(([k, v]) => (
          <div key={k}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span style={{ color: C.text }}>{PART_LABEL[k]} <span style={{ color: C.textMuted, fontSize: 11.5 }}>· weight {weights?.[k]}</span></span><strong style={{ color: C.heading }}>{v}</strong></div>
            <Progress value={v} color={v >= 70 ? C.mint : v >= 50 ? C.amber : C.rose} height={7} />
          </div>
        ))}
      </div>
      <Grid min={240}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 6 }}>ATTENDANCE</div>
          {row("Days present", `${m.attendance.daysPresent} / ${m.attendance.expectedDays}`)}
          {row("Late days", `${m.attendance.lateDays}${m.attendance.lateDays ? ` (avg ${m.attendance.avgLateMin} min)` : ""}`)}
          {row("Average hours", `${m.attendance.avgHours}h`)}
          {row("Location shared at clock-in", m.attendance.locationShared == null ? "—" : `${m.attendance.locationShared}%`)}
          {row("Standups posted", m.attendance.standups)}
          {row("Forgot to clock out", m.attendance.forgotClockOut)}
        </div>
        {card.isField && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 6 }}>FIELD WORK</div>
            {row("Visits checked in", m.field.visits)}
            {row("Client-confirmed", `${m.field.confirmed}${m.field.confirmationRate != null ? ` (${m.field.confirmationRate}%)` : ""}`)}
            {row("Average trust score", m.field.avgTrust == null ? "—" : `${m.field.avgTrust}%`)}
            {row("Disputed / self-confirmed", `${m.field.disputed} / ${m.field.selfConfirmed}`)}
            {row("Location checks answered", `${m.field.spotOnTime} / ${m.field.spotChecks}`)}
            {row("Field days", m.field.fieldDays)}
          </div>
        )}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 6 }}>REPORTS & OUTPUT</div>
          {row("Weekly reports", `${m.reporting.submitted} / ${m.reporting.expected}`)}
          {card.isField && row("Visits claimed vs recorded", `${m.reporting.claimedVisits} vs ${m.reporting.recordedVisits}`)}
          {row("Tasks completed (on time)", `${m.output.tasksDone}${m.output.onTimeRate != null ? ` (${m.output.onTimeRate}%)` : ""}`)}
          {row("Overdue tasks", m.output.overdueOpen)}
          {row("Goal progress", m.output.goalsAvg == null ? "—" : `${m.output.goalsAvg}%`)}
        </div>
        {m.sales && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 6 }}>SALES</div>
            {row("New opportunities", m.sales.created)}
            {row("Stage moves", m.sales.stageMoves)}
            {row("Deals won", `${m.sales.won} (${naira(m.sales.wonValue)})`)}
            {row("Open pipeline", naira(m.sales.openPipeline))}
          </div>
        )}
      </Grid>
    </div>
  );
}

function monthStart() { const d = new Date(Date.now() + 3600000).toISOString(); return `${d.slice(0, 8)}01`; }

export default function Performance() {
  const { can, openPerson } = useOffice();
  const [range, setRange] = useState({ from: monthStart(), to: new Date(Date.now() + 3600000).toISOString().slice(0, 10) });
  const [tab, setTab] = useState("me");
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const manager = can("team.view") || can("org.approve") || can("hr.records");

  const load = useCallback(() => api(`/api/staff/performance?scope=team&from=${range.from}&to=${range.to}`).then(setData).catch(e => toast(e.message, "err")), [range]);
  useEffect(() => { load(); }, [load]);

  async function spot(card) {
    if (!confirm(`Ask ${card.fullName} to confirm their location now? They'll have 20 minutes.`)) return;
    try { await api("/api/staff/visits", { method: "POST", body: { action: "spot-request", employeeId: card.employeeId } }); toast("Location check sent"); } catch (e) { toast(e.message, "err"); }
  }

  return (
    <div>
      <PageHeader title="Performance" sub="Scores come from verified activity (clock-ins, GPS-verified and client-confirmed visits, location checks, tasks, goals and reports), never from claims alone."
        action={<div style={{ display: "flex", gap: 6, alignItems: "center" }}><Input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} style={{ width: 150 }} aria-label="From" /><span style={{ color: C.textMuted }}>to</span><Input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} style={{ width: 150 }} aria-label="To" /></div>} />
      {manager && <Tabs active={tab} onChange={setTab} tabs={[{ id: "me", label: "My scorecard" }, { id: "team", label: data?.companyWide ? "Company" : "My team", count: data?.team?.filter(c => c.integrity === "concern").length || 0 }]} />}
      {!data && <EmptyState>Loading…</EmptyState>}
      {data && tab === "me" && (data.me ? <SectionCard><Scorecard card={data.me} weights={data.weights} /></SectionCard> : <EmptyState icon={Gauge}>No scorecard for your role yet.</EmptyState>)}
      {data && tab === "team" && (
        <SectionCard>
          {data.team.length === 0 && <EmptyState>No one in your reporting line yet.</EmptyState>}
          {data.team.map(c => (
            <div key={c.employeeId} className="so-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
              <button type="button" onClick={() => openPerson(c.employeeId)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><Avatar src={c.avatarDataUrl} name={c.fullName} size={36} /></button>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{c.fullName}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{c.role}{c.isField ? ` · ${c.metrics.field.visits} visits, ${c.metrics.field.confirmed} confirmed` : ""}</div>
              </div>
              <div style={{ width: 140 }}><Progress value={c.overall} color={GRADE_COLOR[c.grade]} height={7} /></div>
              <Badge color={GRADE_COLOR[c.grade]}>{c.overall} · {c.grade}</Badge>
              {c.integrity !== "clean" && <Badge color={c.integrity === "concern" ? C.rose : C.amber}>{c.flags.length} flag{c.flags.length === 1 ? "" : "s"}</Badge>}
              <Btn small variant="ghost" onClick={() => setOpen(c)}>Details</Btn>
              {c.isField && <Btn small variant="ghost" icon={MapPin} onClick={() => spot(c)}>Location check</Btn>}
            </div>
          ))}
        </SectionCard>
      )}
      {open && <Modal title="Scorecard" onClose={() => setOpen(null)} width={760}><Scorecard card={open} weights={data.weights} /></Modal>}
    </div>
  );
}
