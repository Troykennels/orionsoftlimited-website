import { useEffect, useState } from "react";
import { Crosshair, Camera, Bell, Download, CheckCircle2, Smartphone } from "lucide-react";
import { C, font } from "./theme.js";
import { api } from "./api.js";
import { Btn, SectionCard, SectionTitle, toast } from "./components.jsx";
import { getLocation, classifyCameraError, phoneInfo, techDetail } from "./geo.js";
import { pushState, enablePush, sendTestPush, canInstall, promptInstall, isInstalled } from "./push.js";
import DeviceHelp from "./DeviceHelp.jsx";

// Guided phone set-up: location, camera, notifications (+ install). Results
// are reported so managers can see whose phone is ready before a check.
export default function PhoneCheck({ compact = false, onReady }) {
  const [loc, setLoc] = useState({ s: "idle" });
  const [cam, setCam] = useState({ s: "idle" });
  const [notif, setNotif] = useState({ s: "idle" });
  const [installable, setInstallable] = useState(canInstall());

  useEffect(() => {
    pushState().then(st => setNotif(st === "on" ? { s: "ok" } : st === "blocked" ? { s: "error", kind: "notif_denied" } : st === "needs-install" ? { s: "needs-install" } : st === "unsupported" ? { s: "unsupported" } : { s: "idle" }));
    const on = () => setInstallable(true);
    window.addEventListener("so-installable", on);
    return () => window.removeEventListener("so-installable", on);
  }, []);

  async function report(next) {
    const all = { location: loc, camera: cam, notifications: notif, ...next };
    const val = x => (x.s === "ok" ? "ok" : x.kind || x.s);
    try {
      await api("/api/staff/attendance", { method: "POST", body: { action: "device-check", location: val(all.location), accuracy: all.location.accuracy, camera: val(all.camera), notifications: val(all.notifications) } });
    } catch { /* best-effort */ }
    // Close the set-up automatically only once notifications are sorted too
    // (on, or not possible on this phone), since they're what make location
    // checks reach staff in time.
    const notifSettled = ["ok", "unsupported", "needs-install"].includes(all.notifications.s);
    if (all.location.s === "ok" && all.camera.s === "ok" && notifSettled) onReady?.();
  }

  async function testLocation() {
    setLoc({ s: "busy", accuracy: null });
    const r = await getLocation({ where: "phone setup", onProgress: g => setLoc({ s: "busy", accuracy: Math.round(g.accuracy) }) });
    const next = r.geo ? { s: "ok", accuracy: Math.round(r.geo.accuracy) } : { s: "error", kind: r.kind, detail: techDetail(r) };
    setLoc(next); report({ location: next });
  }
  async function testCamera() {
    setCam({ s: "busy" });
    let next;
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      st.getTracks().forEach(t => t.stop());
      next = { s: "ok" };
    } catch (e) { next = { s: "error", kind: await classifyCameraError(e) }; }
    setCam(next); report({ camera: next });
  }
  async function turnOnNotifications() {
    setNotif({ s: "busy" });
    let next;
    try { await enablePush(); next = { s: "ok" }; toast("Phone notifications are on"); }
    catch (e) { next = e.kind ? { s: "error", kind: e.kind } : { s: "error", kind: "notif_other", message: e.message }; }
    setNotif(next); report({ notifications: next });
  }

  const row = (icon, title, state, action, detail) => (
    <div style={{ padding: "12px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: state.s === "ok" ? C.mint : C.gold, display: "flex" }}>{state.s === "ok" ? <CheckCircle2 size={18} /> : icon}</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{title}</div>
          <div style={{ fontSize: 12.5, color: state.s === "ok" ? C.mint : C.textMuted }}>{detail}</div>
        </div>
        {action}
      </div>
    </div>
  );
  const p = phoneInfo();
  const allOk = loc.s === "ok" && cam.s === "ok" && notif.s === "ok";

  return (
    <SectionCard style={{ marginBottom: 16, borderColor: allOk ? `${C.mint}55` : `${C.gold}55`, fontFamily: font }}>
      <SectionTitle sub={compact ? null : "Takes a minute. Do it once on the phone you use for work, so clock-ins, visits and location checks never get stuck."}><Smartphone size={16} style={{ verticalAlign: -3, marginRight: 6 }} />{allOk ? "Your phone is ready ✓" : "Set up your phone"}</SectionTitle>

      {row(<Crosshair size={18} />, "Location (GPS)", loc,
        loc.s !== "busy" && <Btn small variant={loc.s === "ok" ? "ghost" : "primary"} onClick={testLocation}>{loc.s === "ok" ? "Test again" : "Test location"}</Btn>,
        loc.s === "ok" ? `Working, accurate to ±${loc.accuracy}m` : loc.s === "busy" ? (loc.accuracy ? `Improving… ±${loc.accuracy}m` : "Finding you… allow location if asked") : "Needed for clock-in and client visits")}
      {loc.s === "error" && <DeviceHelp kind={loc.kind} detail={loc.detail} onRetry={testLocation} />}

      {row(<Camera size={18} />, "Camera", cam,
        cam.s !== "busy" && <Btn small variant={cam.s === "ok" ? "ghost" : "primary"} onClick={testCamera}>{cam.s === "ok" ? "Test again" : "Test camera"}</Btn>,
        cam.s === "ok" ? "Working" : cam.s === "busy" ? "Opening… allow camera if asked" : "Needed for visit and location-check photos")}
      {cam.s === "error" && <DeviceHelp kind={cam.kind} onRetry={testCamera} />}

      {row(<Bell size={18} />, "Phone notifications", notif,
        notif.s === "ok" ? <Btn small variant="ghost" onClick={() => sendTestPush().then(r => toast(r.sent ? "Test sent. Check your phone" : "No device registered yet")).catch(e => toast(e.message, "err"))}>Send test</Btn>
          : ["idle", "error"].includes(notif.s) && notif.kind !== "notif_denied" ? <Btn small onClick={turnOnNotifications}>Turn on</Btn> : null,
        notif.s === "ok" ? "On. You'll be alerted instantly for location checks, messages and approvals"
          : notif.s === "needs-install" ? "On iPhone: tap Share → Add to Home Screen, then open Staff Office from your Home Screen and turn this on"
          : notif.s === "unsupported" ? "This browser can't show notifications. Use Google Chrome"
          : notif.s === "error" && notif.message ? notif.message
          : "So you never miss a location check (you have 20 minutes to answer)")}
      {notif.s === "error" && ["notif_denied", "notif_app_blocked", "overlay"].includes(notif.kind) && (
        <DeviceHelp kind={notif.kind} onRetry={turnOnNotifications} />
      )}

      {onReady && loc.s === "ok" && cam.s === "ok" && (
        <div style={{ paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <Btn small variant="ghost" onClick={() => onReady()}>{notif.s === "ok" ? "Done" : "Done for now (turn notifications on later in Field Visits)"}</Btn>
        </div>
      )}
      {!isInstalled() && (installable || p.ios) && row(<Download size={18} />, "Install the Staff Office app", { s: "idle" },
        installable ? <Btn small variant="ghost" onClick={() => promptInstall().then(ok => ok && toast("Installed. Open Staff Office from your home screen"))}>Install</Btn> : null,
        p.ios ? "Safari: tap Share → Add to Home Screen" : "Opens like an app, one tap from your home screen")}
    </SectionCard>
  );
}
