// Field-verification helpers used on staff phones.

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

// One high-accuracy GPS fix. Resolves { geo } or { error } (never throws), so
// a denied permission is recorded honestly instead of blocking the action.
export function getLocation({ timeout = 15000 } = {}) {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve({ error: "This browser can't share location" }); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ geo: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: new Date(p.timestamp || Date.now()).toISOString() } }),
      err => resolve({ error: err.code === 1 ? "Location permission was denied" : err.code === 3 ? "Location timed out" : "Location unavailable" }),
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
  });
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
