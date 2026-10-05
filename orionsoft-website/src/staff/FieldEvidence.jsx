// Evidence viewers for a field visit and a location check, shared by the admin
// Attendance & Field page and the managers' Team Desk → Field tab. `load`
// fetches the record, so each side uses its own permission-checked API.
import { useEffect, useState } from "react";
import { C } from "./theme.js";
import { Badge, Modal, Grid, EmptyState, toast } from "./components.jsx";
import { time, dt, maps, device, LEVEL, CONF } from "./fieldFormat.js";

export function VisitDetail({ id, load, onClose }) {
  const [v, setV] = useState(null);
  useEffect(() => { load(id).then(setV).catch(e => toast(e.message, "err")); }, [id, load]);
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
          <div><strong style={{ color: C.heading }}>Check-in:</strong> {dt(v.checkIn.at)} {v.checkIn.geo ? <a href={maps(v.checkIn.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map (±{v.checkIn.geo.accuracy}m)</a> : <span style={{ color: C.rose }}>no GPS: {v.checkIn.geoError}</span>}{v.checkIn.geoLateSec > 60 && <span style={{ color: C.amber }}> · found {Math.round(v.checkIn.geoLateSec / 60)} min later</span>}</div>
          <div><strong style={{ color: C.heading }}>Check-out:</strong> {v.checkOut?.at ? `${dt(v.checkOut.at)} · ${v.durationMin} min` : "still checked in"} {v.checkOut?.geo && <a href={maps(v.checkOut.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map</a>}</div>
          {v.distanceFromSite != null && <div><strong style={{ color: C.heading }}>Distance from confirmed site:</strong> {v.distanceFromSite >= 1000 ? `${(v.distanceFromSite / 1000).toFixed(1)}km` : `${v.distanceFromSite}m`}</div>}
          <div><strong style={{ color: C.heading }}>Device / IP:</strong> {device(v.checkIn.ua)} · {v.checkIn.ip || "—"}</div>
          {v.outcome && <div><strong style={{ color: C.heading }}>Outcome:</strong> {v.outcome}</div>}
          {v.nextStep && <div><strong style={{ color: C.heading }}>Next step:</strong> {v.nextStep}</div>}
          {v.confirmation?.at && <div><strong style={{ color: C.heading }}>Client answer:</strong> {v.confirmation.status} by {v.confirmation.name || "unnamed"} {v.confirmation.rating ? `· ${"★".repeat(v.confirmation.rating)}` : ""} {v.confirmation.comment ? `· "${v.confirmation.comment}"` : ""} · {dt(v.confirmation.at)}</div>}
          {v.confirmation?.geo && <div><strong style={{ color: C.heading }}>Client's location:</strong> <a href={maps(v.confirmation.geo)} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map (±{v.confirmation.geo.accuracy}m)</a></div>}
        </div>
      </Grid>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "14px 0 6px" }}>EVIDENCE CHECKS</div>
      {(v.flags || []).length === 0 && <div style={{ fontSize: 13, color: C.mint }}>No problems detected.</div>}
      {(v.flags || []).map(f => <div key={f.code} style={{ fontSize: 13, padding: "3px 0", color: f.penalty > 0 ? C.mint : f.severity === "high" ? C.rose : C.amber }}>{f.penalty > 0 ? "✓" : "•"} {f.label} <span style={{ color: C.textMuted }}>({f.penalty > 0 ? "+" : ""}{f.penalty})</span></div>)}
    </Modal>
  );
}

export function SpotDetail({ id, load, onClose }) {
  const [s, setS] = useState(null);
  useEffect(() => { load(id).then(setS).catch(e => toast(e.message, "err")); }, [id, load]);
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
