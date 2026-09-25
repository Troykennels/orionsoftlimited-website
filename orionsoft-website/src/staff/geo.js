// Field-verification helpers used on staff phones.
import { api } from "./api.js";

// A random id stored on this browser. It identifies Staff Office devices so a
// "client confirmation" made on a staff phone can be recognised.
export function getDeviceId() {
  try {
    let id = localStorage.getItem("so_device_id");
    if (!id) {
      id = `dev_${crypto.getRandomValues(new Uint32Array(3)).join("")}`;
      localStorage.setItem("so_device_id", id);
    }
    return id;
  } catch { return ""; }
}

export async function permissionState(name) {
  try { return (await navigator.permissions.query({ name })).state; } catch { return "unknown"; }
}

// Why location failed, so the phone owner gets the right fix:
//  overlay    Android refused to show the prompt (another app is drawing on
//             top: chat bubbles, Truecaller, screen filters, floating windows)
//  denied     location is blocked for this site (or for the browser)
//  off        the phone's GPS/location service is switched off
//  timeout    no fix in time (indoors, weak signal)
//  unsupported / insecure  browser can't do it
async function classify(err) {
  if (!window.isSecureContext) return "insecure";
  if (phoneInfo().inApp) return "inapp";
  if (!err) return "unsupported";
  if (err.code === 1) {
    const state = await permissionState("geolocation");
    // Denied while the permission is still "prompt" = the prompt never showed.
    if (state === "prompt") return "overlay";
    // Denied although the site IS allowed = Android is blocking the browser
    // app itself (Settings → Apps → Edge/Chrome → Permissions → Location).
    if (state === "granted") return "app_denied";
    return "denied";
  }
  if (err.code === 2) return "off";
  if (err.code === 3) return "timeout";
  return "unsupported";
}
const MESSAGES = {
  overlay: "Your phone blocked the location prompt because another app is showing on top of the screen",
  denied: "Location is blocked for this site",
  app_denied: "Your phone is blocking the browser app from using location",
  inapp: "Location doesn't work inside this app's built-in browser",
  off: "Your phone's location (GPS) is switched off",
  timeout: "Couldn't get a GPS signal in time",
  insecure: "Location only works on the secure https site",
  unsupported: "This browser can't share location",
};

// Best GPS fix within a short window: phones often report a rough network
// position first (±1-2 km) and sharpen over a few seconds, so we watch and
// keep the most accurate reading, stopping early once it's good enough.
// A Wi-Fi/cell-tower position is requested alongside, so indoors (where
// satellites can't be seen) staff still get a location instead of a timeout;
// its accuracy is recorded, so a rough fix scores lower rather than failing.
// Resolves { geo } or { error, kind } and never throws.
export async function getLocation(opts = {}) {
  const t0 = Date.now();
  const r = await locate(opts);
  // Report every attempt (with the browser's raw error) so managers can see
  // exactly why a phone fails, instead of guessing from "try again".
  const perm = await permissionState("geolocation");
  if (r.kind === "stopped") return r;
  api("/api/staff/attendance", { method: "POST", body: {
    action: "geo-diag", ok: !!r.geo, kind: r.kind, code: r.code, message: r.rawMessage, perm,
    accuracy: r.geo?.accuracy, ms: Date.now() - t0, where: opts.where || "",
  } }).catch(() => {});
  return { ...r, perm };
}

// control.accept() (set here) lets the person take the best fix so far
// instead of waiting for a sharper one.
function locate({ maxWait = 15000, goodEnough = 30, settleMs = 6000, onProgress, control } = {}) {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve({ error: MESSAGES.unsupported, kind: "unsupported" }); return; }
    let best = null, done = false, watchId = null, lastErr = null, settle = null, stopped = false;
    const finish = async (err) => {
      if (done) return;
      done = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer); clearTimeout(settle);
      if (stopped) { resolve({ kind: "stopped", error: "Stopped" }); return; }
      if (best) { resolve({ geo: best }); return; }
      const e = err || lastErr;
      const kind = await classify(e);
      resolve({ error: MESSAGES[kind], kind, code: e?.code || 0, rawMessage: e?.message || "" });
    };
    const take = p => {
      if (done) return;
      const g = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: new Date(p.timestamp || Date.now()).toISOString() };
      if (!best || g.accuracy < best.accuracy) {
        best = g; onProgress?.(g);
        // A Wi-Fi-grade fix gets a few seconds to sharpen instead of sitting
        // out the whole wait indoors, where satellites may never come. A
        // cell-tower fix (±km) keeps waiting for GPS, but is still used if
        // nothing better arrives.
        clearTimeout(settle);
        if (g.accuracy <= 200) settle = setTimeout(() => finish(), settleMs);
      }
      if (g.accuracy <= goodEnough) finish();
    };
    // Permission refusals end it at once; "no signal" errors wait for the
    // other source (or the timer) instead.
    const fail = err => { if (err?.code === 1) finish(err); else lastErr = err; };
    const timer = setTimeout(() => finish(lastErr || { code: 3 }), maxWait);
    if (control) {
      control.accept = () => { if (best) finish(); };
      control.stop = () => { stopped = true; finish(); };
    }
    watchId = navigator.geolocation.watchPosition(take, fail, { enableHighAccuracy: true, timeout: maxWait, maximumAge: 0 });
    // Also accept the phone's last known position from the past 10 minutes
    // (e.g. from Google Maps or a ride app): when GPS is asleep this is often
    // the only fix available. Its own timestamp is kept, so an old fix is
    // flagged rather than passed off as live.
    navigator.geolocation.getCurrentPosition(take, fail, { enableHighAccuracy: false, timeout: maxWait, maximumAge: 600000 });
  });
}

// Short technical line shown under the help, so a screenshot tells support
// exactly what the phone reported.
export const techDetail = r => (r && !r.geo ? `Details: ${r.kind} · error ${r.code || "-"} · site permission ${r.perm || "?"}${r.rawMessage ? ` · ${r.rawMessage}` : ""}` : "");

// Camera failures classified the same way.
export async function classifyCameraError(e) {
  if (!window.isSecureContext) return "insecure";
  if (phoneInfo().inApp) return "inapp";
  if (e?.name === "NotAllowedError") return (await permissionState("camera")) === "prompt" ? "overlay" : "camera_denied";
  if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") return "no_camera";
  if (e?.name === "NotReadableError") return "camera_busy";
  return "camera_unknown";
}

export function phoneInfo() {
  const ua = navigator.userAgent || "";
  return {
    ios: /iPhone|iPad|iPod/.test(ua),
    android: /Android/.test(ua),
    transsion: /TECNO|Infinix|itel/i.test(ua),
    samsung: /SM-|Samsung/i.test(ua),
    chrome: /Chrome\//.test(ua) && !/Edg(A|iOS)?\//.test(ua),
    edge: /Edg(A|iOS)?\//.test(ua),
    // Built-in browsers of chat/social apps (links tapped inside WhatsApp,
    // Facebook, Instagram…). Many of them don't pass location or camera
    // permission through, so every attempt fails there.
    inApp: /; wv\)|FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Twitter|MicroMessenger|Snapchat|musical_ly|TikTok/i.test(ua)
      || (/iPhone|iPad/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua) && !/CriOS|EdgiOS|FxiOS/.test(ua) && !window.navigator.standalone),
  };
}

// Link that reopens the current page in Chrome from an Android in-app browser.
export function openInChromeUrl() {
  const { host, pathname, search } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
}

export const mapsLink = g => (g ? `https://www.google.com/maps?q=${g.lat},${g.lng}` : "");

// 64-bit average hash of an image (16 hex chars): near-identical photos give
// near-identical hashes, which is how reused photos are detected.
export function averageHash(canvas) {
  const s = document.createElement("canvas");
  s.width = 8; s.height = 8;
  const ctx = s.getContext("2d");
  ctx.drawImage(canvas, 0, 0, 8, 8);
  const d = ctx.getImageData(0, 0, 8, 8).data;
  const g = [];
  for (let i = 0; i < 64; i++) g.push(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
  const avg = g.reduce((a, b) => a + b, 0) / 64;
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += (((g[i] > avg) << 3) | ((g[i + 1] > avg) << 2) | ((g[i + 2] > avg) << 1) | (g[i + 3] > avg ? 1 : 0)).toString(16);
  return hex;
}

// Scale a frame down, burn in a date/time/location/name stamp, and return
// { dataUrl, hash }. The hash is taken before the stamp so the stamp itself
// can't make two identical photos look different.
export function finishPhoto(source, { name = "", geo = null } = {}) {
  const w0 = source.videoWidth || source.naturalWidth || source.width;
  const h0 = source.videoHeight || source.naturalHeight || source.height;
  const scale = Math.min(1, 1024 / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * scale); c.height = Math.round(h0 * scale);
  const ctx = c.getContext("2d");
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const hash = averageHash(c);
  const when = new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const lines = [`${when} WAT${name ? ` · ${name}` : ""}`, geo ? `GPS ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)} (±${Math.round(geo.accuracy || 0)}m)` : "GPS not available", "Orion Soft · field visit"];
  const fs = Math.max(13, Math.round(c.width / 45));
  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  const pad = Math.round(fs * 0.6), lh = Math.round(fs * 1.35);
  const boxH = pad * 2 + lh * lines.length;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, c.height - boxH, c.width, boxH);
  ctx.fillStyle = "#fff";
  lines.forEach((l, i) => ctx.fillText(l, pad, c.height - boxH + pad + fs + i * lh));
  return { dataUrl: c.toDataURL("image/jpeg", 0.72), hash };
}
