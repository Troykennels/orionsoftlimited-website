import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { C, font } from "./theme.js";
import { toast } from "./components.jsx";
import { pushState, enablePush, sendTestPush, isInstalled, canInstall, promptInstall } from "./push.js";
import DeviceHelp from "./DeviceHelp.jsx";

const SNOOZE_KEY = "so_alerts_snooze";

// Shown on every page until this phone has alerts on, so meetings, tasks and
// messages ring the phone like WhatsApp even when the office is closed.
// "Later" hides it for a day only.
export default function AlertsBanner() {
  const [state, setState] = useState(null); // on | off | blocked | needs-install | unsupported
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snoozed, setSnoozed] = useState(() => {
    try { return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch { return false; }
  });

  useEffect(() => { pushState().then(setState).catch(() => setState("unsupported")); }, []);

  if (snoozed || !state || state === "on" || state === "unsupported") return null;

  async function turnOn() {
    setBusy(true); setErr(null);
    try {
      await enablePush();
      setState("on");
      await sendTestPush().catch(() => {});
      toast("Alerts are on. You'll hear meetings, tasks and messages even when the office is closed.");
    } catch (e) { setErr(e.kind ? { kind: e.kind } : { kind: "notif_other", message: e.message }); }
    finally { setBusy(false); }
  }
  function later() {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 24 * 3600 * 1000)); } catch { /* ignore */ }
    setSnoozed(true);
  }

  const text = state === "needs-install"
    ? "On iPhone, alerts only work from the Home Screen app: tap Share → Add to Home Screen, then open the Staff Office from there and turn alerts on."
    : state === "blocked"
      ? "Alerts are blocked for this site, so you'll miss meetings and location checks. Allow notifications in your browser settings."
      : "Get meeting invites, tasks, approvals and messages on your phone instantly, with sound, even when the Staff Office is closed.";

  return (
    <div role="region" aria-label="Phone alerts" style={{ background: C.goldDim, border: `1px solid ${C.gold}88`, borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontFamily: font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <BellRing size={20} color={C.gold} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.heading }}>Turn on phone alerts</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{text}</div>
        </div>
        {state === "off" && <button type="button" onClick={turnOn} disabled={busy} style={{ background: C.gold, color: "#060810", border: "none", borderRadius: 9, padding: "10px 16px", fontWeight: 800, fontSize: 14, fontFamily: font, cursor: busy ? "wait" : "pointer" }}>{busy ? "Turning on…" : "Turn on alerts"}</button>}
        {state === "off" && !isInstalled() && canInstall() && <button type="button" onClick={() => promptInstall()} style={{ background: "transparent", color: C.heading, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 14px", fontWeight: 700, fontSize: 13, fontFamily: font, cursor: "pointer" }}>Install app</button>}
        <button type="button" onClick={later} aria-label="Remind me tomorrow" title="Remind me tomorrow" style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><X size={18} /></button>
      </div>
      {(err || state === "blocked") && <div style={{ marginTop: 10 }}><DeviceHelp kind={err?.kind || "notif_denied"} onRetry={turnOn} /></div>}
      {err?.message && <div style={{ fontSize: 12.5, color: C.rose, marginTop: 6 }}>{err.message}</div>}
    </div>
  );
}
