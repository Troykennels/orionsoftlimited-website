// Formatting helpers for attendance and field-visit evidence (Lagos time).
import { C } from "./theme.js";

export const time = iso => (iso ? new Date(iso).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" }) : "—");
export const dt = iso => (iso ? new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const mins = m => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
export const maps = g => (g ? `https://www.google.com/maps?q=${g.lat},${g.lng}` : null);
export const device = ua => {
  if (!ua) return "—";
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "Other";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return `${os}${br ? ` · ${br}` : ""}`;
};
export const LEVEL = { verified: ["Verified", C.mint], review: ["Review", C.amber], suspicious: ["Suspicious", C.rose] };
export const CONF = { pending: ["Awaiting client", C.textMuted], confirmed: ["Client confirmed", C.mint], disputed: ["Disputed", C.rose] };
