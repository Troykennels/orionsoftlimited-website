// Field verification intelligence: turns raw check-in evidence (GPS fix,
// photo fingerprint, timing, device) into explainable flags and a 0-100 trust
// score. Every flag carries a plain-English reason so managers can judge it,
// not just a number.
import { get, set } from "../store.js";

export function haversineMeters(a, b) {
  if (!a || !b) return null;
  const R = 6371000, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function cleanGeo(g) {
  if (!g || typeof g !== "object") return null;
  const lat = Number(g.lat), lng = Number(g.lng), accuracy = Number(g.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    lat: +lat.toFixed(6), lng: +lng.toFixed(6),
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    at: g.at && Date.parse(g.at) ? new Date(g.at).toISOString() : new Date().toISOString(),
  };
}

export function requestMeta(req) {
  return {
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "",
    ua: String(req.headers["user-agent"] || "").slice(0, 200),
  };
}

// 64-bit average-hash (16 hex chars) computed client-side from an 8x8
// grayscale thumbnail. Near-identical photos differ in only a few bits.
export function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

export function normOrg(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const SITES_KEY = "orionsoft:field:sites";
// Known client locations, learned only from CLIENT-CONFIRMED visits (so a
// dishonest check-in can never teach the system a fake location).
export async function getSites() { return (await get(SITES_KEY)) || {}; }
export async function learnSite(organisation, geo, visitId) {
  if (!geo || (geo.accuracy != null && geo.accuracy > 150)) return;
  const sites = await getSites();
  const key = normOrg(organisation);
  if (!key || sites[key]) return;
  sites[key] = { name: organisation, lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy, visitId, learnedAt: new Date().toISOString() };
  await set(SITES_KEY, sites);
}

const lagosHour = iso => (new Date(Date.parse(iso) + 3600000).getUTCHours());

/**
 * Score a field visit check-in.
 * @param visit   the visit being scored (checkIn.geo, photoHash, photoSource, organisation, checkOut…)
 * @param ctx     { priorEvents: [{at, geo, kind}], otherPhotoHashes: [{hash, visitId, employeeId}], site, clockInGeo }
 */
export function scoreVisit(visit, ctx = {}) {
  const flags = [];
  const add = (code, penalty, label, severity = "warn") => flags.push({ code, penalty, label, severity });
  const g = visit.checkIn?.geo;
  const c = visit.confirmation || {};
  // The client's own phone located the meeting when they confirmed, soon
  // enough (3h) that they were most likely still where it happened.
  const genuineConfirm = c.status === "confirmed" && !c.selfConfirmed && !c.sameNetwork;
  const clientGeo = genuineConfirm && c.geo && c.at && Date.parse(c.at) - Date.parse(visit.checkIn.at) <= 3 * 3600000 ? c.geo : null;

  if (!g) {
    if (clientGeo) add("NO_GPS", -10, "No location from the staff phone, but the client's phone located the meeting when confirming.");
    else add("NO_GPS", -35, "No GPS location was shared at check-in.", "high");
  } else {
    const lateSec = Number(visit.checkIn.geoLateSec) || 0;
    if (lateSec > 60) add("LATE_FIX", -8, `Location arrived ${Math.round(lateSec / 60)} min after check-in (no signal at check-in).`);
    const fixAgeMin = (Date.parse(visit.checkIn.at) - Date.parse(g.at)) / 60000;
    if (fixAgeMin > 3) add("OLD_FIX", -5, `Used the phone's last known location from ${Math.round(fixAgeMin)} min before check-in.`);
    if (clientGeo) {
      const d = haversineMeters(g, clientGeo);
      if (d != null && d <= 700 + (g.accuracy || 0)) flags.push({ code: "CLIENT_LOCATION_MATCH", penalty: 5, label: `The client's phone was ${d >= 1000 ? (d / 1000).toFixed(1) + "km" : d + "m"} from the check-in location.`, severity: "good" });
    }
    if (g.accuracy != null && g.accuracy <= 1) add("FAKE_GPS_PATTERN", -25, `Reported accuracy of ${g.accuracy}m is typical of GPS-spoofing apps, not real phones.`, "high");
    else if (g.accuracy != null && g.accuracy > 1000) add("VERY_LOW_ACCURACY", -25, `Location was only accurate to ${Math.round(g.accuracy / 1000)}km (network-based, not GPS).`);
    else if (g.accuracy != null && g.accuracy > 150) add("LOW_ACCURACY", -12, `Location accuracy was ${g.accuracy}m.`);

    if (ctx.site) {
      const d = haversineMeters(g, ctx.site);
      if (d != null && d > 700) add("FAR_FROM_SITE", d > 5000 ? -45 : -30, `Checked in ${d >= 1000 ? (d / 1000).toFixed(1) + "km" : d + "m"} away from ${ctx.site.name}'s confirmed location.`, "high");
    }
    // Impossible travel between this and the previous located event today.
    const prev = (ctx.priorEvents || []).filter(e => e.geo && Date.parse(e.at) < Date.parse(visit.checkIn.at)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
    if (prev) {
      const dist = haversineMeters(prev.geo, g);
      const hours = (Date.parse(visit.checkIn.at) - Date.parse(prev.at)) / 3600000;
      const kmh = hours > 0 ? dist / 1000 / hours : Infinity;
      if (dist > 5000 && kmh > 150) add("IMPOSSIBLE_TRAVEL", -35, `Moved ${(dist / 1000).toFixed(1)}km from the previous check-in (${prev.kind}) in ${Math.max(1, Math.round(hours * 60))} min, about ${Math.round(kmh)} km/h.`, "high");
    }
    // "Visited a client" from their home base: a spot they usually start the
    // day from (clocked in within 150m of it on 2+ OTHER days). Going
    // straight to a client and clocking in there is never penalised.
    const homeDays = (ctx.homeClockIns || []).filter(c => haversineMeters(c.geo, g) <= 150).map(c => c.date);
    const distinctDays = new Set(homeDays).size;
    if (distinctDays >= 2) add("HOME_BASE", -30, `Checked in within 150m of where this person usually starts their day (clocked in there on ${distinctDays} other days), likely home, not a client.`, "high");
  }

  if (!visit.photoHash) add("NO_PHOTO", -10, "No photo was taken at the site.");
  else {
    if (visit.photoSource !== "camera") add("GALLERY_PHOTO", -12, "Photo was uploaded from the gallery instead of taken live.");
    const dup = (ctx.otherPhotoHashes || []).find(p => p.visitId !== visit.id && hamming(p.hash, visit.photoHash) <= 6);
    if (dup) add("REUSED_PHOTO", -35, dup.employeeId === visit.employeeId ? "Photo is (nearly) identical to one from an earlier visit." : "Photo is (nearly) identical to another staff member's visit photo.", "high");
  }

  const h = lagosHour(visit.checkIn.at);
  if (h < 7 || h >= 20) add("OUT_OF_HOURS", -5, "Visit logged outside normal working hours.");

  if (visit.checkOut?.at) {
    const mins = (Date.parse(visit.checkOut.at) - Date.parse(visit.checkIn.at)) / 60000;
    if (mins < 5) add("VERY_SHORT", -10, `Visit lasted only ${Math.max(0, Math.round(mins))} min.`);
  }

  if (c.status === "confirmed" && c.sameNetwork) add("SAME_NETWORK", -15, "The client confirmation came from the same internet connection this staff member usually clocks in from.");
  if (c.status === "confirmed" && !c.selfConfirmed && !c.sameNetwork) flags.push({ code: "CLIENT_CONFIRMED", penalty: 30, label: `Confirmed by ${c.name || "the client"}.`, severity: "good" });
  if (c.status === "disputed") add("CLIENT_DISPUTED", -60, `The client said this visit did NOT happen${c.comment ? `: "${c.comment}"` : "."}`, "high");
  if (c.selfConfirmed) add("SELF_CONFIRMED", -55, "The 'client confirmation' was made on a phone/browser that is used for the Staff Office.", "high");

  // Unconfirmed, flawless visits sit at 85; client confirmation lifts them to 100.
  const trust = Math.max(0, Math.min(100, 85 + flags.reduce((n, f) => n + f.penalty, 0)));
  return { trust, flags, level: trust >= 80 ? "verified" : trust >= 55 ? "review" : "suspicious" };
}
