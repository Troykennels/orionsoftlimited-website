import { useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { C, font } from "./theme.js";
import { Btn } from "./components.jsx";
import { getLocation, techDetail, phoneInfo } from "./geo.js";
import DeviceHelp from "./DeviceHelp.jsx";

// Why a fix is rough, and the one setting that usually sharpens it.
function roughTip() {
  const p = phoneInfo();
  if (p.ios) return "For better accuracy turn on Precise Location: Settings → Privacy & Security → Location Services → Safari Websites → Precise Location. Then tap Refresh near a window";
  if (p.android) return "For better accuracy turn on Google Location Accuracy (Settings → Location → Location services) and Wi-Fi, then tap Refresh near a window";
  return "Step outside or turn on GPS, then tap Refresh";
}

// Tap-to-share location with live accuracy and phone-specific help when the
// phone refuses. Calls onChange({ geo }) or onChange({ error, kind }).
export default function LocationStep({ onChange, label = "Share my location", allowSkip = true, where = "" }) {
  const [state, setState] = useState({ phase: "idle" });

  async function locate() {
    setState({ phase: "locating", accuracy: null });
    onChange(null);
    const r = await getLocation({ where, onProgress: g => setState({ phase: "locating", accuracy: Math.round(g.accuracy) }) });
    if (r.geo) { setState({ phase: "done", geo: r.geo }); onChange(r); }
    else { setState({ phase: "error", kind: r.kind, error: r.error, detail: techDetail(r) }); }
  }

  if (state.phase === "idle") return <Btn icon={Crosshair} onClick={locate}>{label}</Btn>;
  if (state.phase === "locating") return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.text, fontFamily: font }}>
      <span className="so-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: C.blue }} />
      {state.accuracy == null ? "Finding you… (allow location if your phone asks)" : `Improving accuracy… ±${state.accuracy}m`}
    </div>
  );
  if (state.phase === "done") {
    const acc = Math.round(state.geo.accuracy);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: font }}>
        <span style={{ fontSize: 13.5, color: acc > 150 ? C.amber : C.mint, display: "flex", alignItems: "center", gap: 6 }}>
          <MapPin size={15} /> Location captured (±{acc}m){acc > 150 ? `. ${roughTip()}` : ""}
        </span>
        <Btn small variant="ghost" icon={Crosshair} onClick={locate}>Refresh</Btn>
      </div>
    );
  }
  if (state.phase === "skipped") return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: font }}>
      <span style={{ fontSize: 13.5, color: C.amber, display: "flex", alignItems: "center", gap: 6 }}>
        <MapPin size={15} /> Continuing without location (scores lower)
      </span>
      <Btn small variant="ghost" icon={Crosshair} onClick={locate}>Try location again</Btn>
    </div>
  );
  return (
    <DeviceHelp kind={state.kind} detail={state.detail} onRetry={locate}
      onSkip={allowSkip ? () => { setState({ phase: "skipped" }); onChange({ error: state.error, kind: state.kind }); } : null}
      skipLabel="Continue without location (scores lower)" />
  );
}
