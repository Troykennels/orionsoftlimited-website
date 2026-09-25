import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { C, font } from "./theme.js";
import { api } from "./api.js";
import { toast } from "./components.jsx";
import { getLocation } from "./geo.js";

// When the phone has no location at check-in or clock-in, the record is saved
// at once and we keep looking for up to 10 minutes while the Staff Office is
// open, then attach the fix to it (marked as arriving late). This only runs
// for a check-in the person just made, with a visible banner and a Stop
// button, so it is never silent background tracking.

const WINDOW_MS = 10 * 60 * 1000;
let state = null; // { targets: [{ kind: "visit" | "clock-in", id?, label }], accuracy }
let control = null;
const subs = new Set();
const emit = () => subs.forEach(fn => fn(state));

async function attach(t, geo) {
  if (t.kind === "visit") await api("/api/staff/visits", { method: "POST", body: { action: "attach-geo", id: t.id, geo } });
  else await api("/api/staff/attendance", { method: "POST", body: { action: "attach-geo", geo } });
}

export function startLateLocation(target) {
  if (state) { state = { ...state, targets: [...state.targets, target] }; emit(); return; }
  state = { targets: [target], accuracy: null };
  emit();
  control = {};
  getLocation({
    where: `late fix (${target.kind})`, maxWait: WINDOW_MS, goodEnough: 100, settleMs: 8000, control,
    onProgress: g => { if (state) { state = { ...state, accuracy: Math.round(g.accuracy) }; emit(); } },
  }).then(async r => {
    const targets = state?.targets || [];
    state = null; control = null; emit();
    if (r.kind === "stopped") return;
    if (!r.geo) {
      toast(["timeout", "off"].includes(r.kind)
        ? "Couldn't find your location in 10 minutes. Your check-in is saved without it."
        : "Location is blocked on this phone, so your check-in is saved without it. Open Field Visits → Set up your phone to fix it.", "err");
      return;
    }
    const done = [];
    for (const t of targets) {
      try { await attach(t, r.geo); done.push(t.label); } catch { /* too late or already set */ }
    }
    if (done.length) toast(`📍 Location added to your ${done.join(" and ")} (±${Math.round(r.geo.accuracy)}m)`);
  });
}

export function stopLateLocation() { control?.stop?.(); }

// Banner shown on every Staff Office page while a late fix is being found.
export function LateLocationBanner() {
  const [s, setS] = useState(state);
  useEffect(() => { subs.add(setS); setS(state); return () => subs.delete(setS); }, []);
  if (!s) return null;
  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: C.blueDim || "rgba(59,130,246,0.12)", border: `1px solid ${C.blue}66`, color: C.heading, borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontFamily: font, fontSize: 13.5 }}>
      <span className="so-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: C.blue, flexShrink: 0 }} />
      <MapPin size={16} color={C.blue} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 200 }}>
        Still finding your location for your {s.targets.map(t => t.label).join(" and ")}{s.accuracy ? ` (±${s.accuracy}m so far)` : ""}. Keep the Staff Office open. Opening Google Maps for a moment, then coming back, often helps.
      </span>
      {s.accuracy != null && <button type="button" onClick={() => control?.accept?.()} style={{ background: "none", border: `1px solid ${C.gold}88`, color: C.gold, borderRadius: 8, padding: "4px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Use this</button>}
      <button type="button" onClick={stopLateLocation} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: "4px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Stop</button>
    </div>
  );
}
