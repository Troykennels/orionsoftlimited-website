// A day's planned client visits, with what actually happened. Field staff use
// it for their own day; managers open it for someone in their team.
import { useCallback, useEffect, useState } from "react";
import { Route, Plus, Trash2 } from "lucide-react";
import { C, font } from "./theme.js";
import { api } from "./api.js";
import { Btn, Badge, Input, SectionCard, SectionTitle, EmptyState, toast } from "./components.jsx";

const lagosDay = (offset = 0) => new Date(Date.now() + 3600000 + offset * 86400000).toISOString().slice(0, 10);
const STATUS = { visited: ["Visited", C.mint], pending: ["To visit", C.blue], missed: ["Missed", C.rose] };
const hhmm = iso => new Date(iso).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });

export default function VisitPlanCard({ employeeId, name, bare = false }) {
  const [date, setDate] = useState(lagosDay());
  const [data, setData] = useState(null);
  const [stops, setStops] = useState([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const qs = `date=${date}${employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : ""}`;
  const load = useCallback(() => api(`/api/staff/visitplans?${qs}`).then(j => { setData(j); setStops(j.plan?.stops || []); }).catch(e => toast(e.message, "err")), [qs]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy(true);
    try {
      await api("/api/staff/visitplans", { method: "PUT", body: { date, employeeId, stops: stops.filter(s => s.organisation.trim()) } });
      toast("Plan saved"); setEditing(false); load();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  const setStop = (i, k, v) => setStops(s => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const past = date < lagosDay();
  const c = data?.compare;

  const body = (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {[[lagosDay(), "Today"], [lagosDay(1), "Tomorrow"]].map(([d, l]) => <Btn key={d} small variant={date === d ? "primary" : "ghost"} onClick={() => { setDate(d); setEditing(false); }}>{l}</Btn>)}
        <Input type="date" value={date} onChange={e => { setDate(e.target.value); setEditing(false); }} style={{ width: 150 }} aria-label="Plan date" />
      </div>
      {!data ? <EmptyState>Loading…</EmptyState> : editing ? (
        <div>
          {stops.map((s, i) => (
            <div key={s.id || i} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 90px minmax(0,2fr) auto", gap: 6, marginBottom: 6 }}>
              <Input value={s.organisation} onChange={e => setStop(i, "organisation", e.target.value)} placeholder="Client / organisation" aria-label="Client" />
              <Input type="time" value={s.time || ""} onChange={e => setStop(i, "time", e.target.value)} aria-label="Time" />
              <Input value={s.purpose || ""} onChange={e => setStop(i, "purpose", e.target.value)} placeholder="Purpose (demo, follow-up…)" aria-label="Purpose" />
              <Btn small danger icon={Trash2} onClick={() => setStops(x => x.filter((_, j) => j !== i))} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Btn small variant="ghost" icon={Plus} onClick={() => setStops(x => [...x, { organisation: "", time: "", purpose: "" }])}>Add a stop</Btn>
            <Btn small onClick={save} disabled={busy}>{busy ? "Saving…" : "Save plan"}</Btn>
            <Btn small variant="ghost" onClick={() => { setStops(data.plan?.stops || []); setEditing(false); }}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <div>
          {c.planned === 0 && <EmptyState>No visits planned for this day.</EmptyState>}
          {c.stops.map(s => {
            const [label, color] = STATUS[s.status];
            return (
              <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13.5, fontFamily: font, flexWrap: "wrap" }}>
                <strong style={{ color: C.heading, minWidth: 44 }}>{s.time || "—"}</strong>
                <span style={{ flex: 1, minWidth: 140, color: C.text }}>{s.organisation}{s.purpose ? <span style={{ color: C.textMuted }}> · {s.purpose}</span> : null}</span>
                {s.at && <span style={{ fontSize: 12, color: C.textMuted }}>{hhmm(s.at)}{s.durationMin != null ? ` · ${s.durationMin} min` : ""}</span>}
                <Badge color={color}>{label}</Badge>
              </div>
            );
          })}
          {c.unplanned.length > 0 && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 8 }}>Also visited (not planned): {c.unplanned.map(u => `${u.organisation} at ${hhmm(u.at)}`).join(", ")}</div>}
          {c.planned > 0 && <div style={{ fontSize: 13, color: C.heading, fontWeight: 700, marginTop: 8 }}>{c.visited} of {c.planned} visited ({c.pct}%)</div>}
          {!past && <Btn small variant="ghost" style={{ marginTop: 10 }} onClick={() => { setStops(data.plan?.stops?.length ? data.plan.stops : [{ organisation: "", time: "", purpose: "" }]); setEditing(true); }}>{c.planned ? "Edit plan" : "Plan visits"}</Btn>}
        </div>
      )}
    </>
  );
  if (bare) return body;
  return (
    <SectionCard style={{ marginBottom: 16 }}>
      <SectionTitle sub={name ? null : "List the clients you'll visit; your manager sees the plan and what you actually did."}><Route size={16} style={{ verticalAlign: -3, marginRight: 6 }} aria-hidden="true" />{name ? `${name}'s visit plan` : "My visit plan"}</SectionTitle>
      {body}
    </SectionCard>
  );
}
