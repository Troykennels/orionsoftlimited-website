// Map of clock-ins, field visits and known client sites (Leaflet +
// OpenStreetMap tiles: no API key). Loaded lazily, only when the tab opens.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TRUST_COLOR = t => (t >= 80 ? "#10B981" : t >= 55 ? "#F59E0B" : "#F43F5E");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default function FieldMap({ visits = [], clockIns = [], sites = [], height = 520 }) {
  const el = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!el.current) return undefined;
    const m = L.map(el.current, { scrollWheelZoom: false }).setView([6.5244, 3.3792], 11); // Lagos
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return undefined;
    const layer = L.layerGroup().addTo(m);
    const pts = [];
    for (const s of sites) {
      L.circle([s.lat, s.lng], { radius: 700, color: "#4F8EF7", weight: 1, fillOpacity: 0.06 }).bindPopup(`<b>${esc(s.name)}</b><br/>Client location learned from a confirmed visit`).addTo(layer);
    }
    for (const c of clockIns) {
      if (!c.geo) continue;
      pts.push([c.geo.lat, c.geo.lng]);
      L.circleMarker([c.geo.lat, c.geo.lng], { radius: 6, color: "#C8A850", weight: 2, fillColor: "#C8A850", fillOpacity: 0.5 })
        .bindPopup(`<b>${esc(c.name)}</b><br/>Clocked in ${esc(c.time)}<br/>±${c.geo.accuracy ?? "?"}m`).addTo(layer);
    }
    for (const v of visits) {
      const g = v.checkIn?.geo;
      if (!g) continue;
      pts.push([g.lat, g.lng]);
      L.circleMarker([g.lat, g.lng], { radius: 9, color: "#fff", weight: 2, fillColor: TRUST_COLOR(v.trust), fillOpacity: 0.95 })
        .bindPopup(`<b>${esc(v.employeeName)}</b> at <b>${esc(v.organisation)}</b><br/>${esc(new Date(v.checkIn.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }))}<br/>Trust ${v.trust}% · ${esc(v.confirmation?.status || "")}<br/>±${g.accuracy ?? "?"}m`).addTo(layer);
    }
    if (pts.length) m.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    return () => { layer.remove(); };
  }, [visits, clockIns, sites]);

  return <div ref={el} style={{ height, width: "100%", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }} role="region" aria-label="Map of check-ins" />;
}
