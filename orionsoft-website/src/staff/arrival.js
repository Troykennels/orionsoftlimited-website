// Arrival detection: when the Staff Office is opened, see whether the person
// is at one of the company's offices (or a client site we've confirmed
// before), without ever triggering a location prompt: it only runs if
// location access was already allowed.
export function metersBetween(a, b) {
  const R = 6371000, r = d => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function quietPosition() {
  try {
    if (!navigator.geolocation || !navigator.permissions?.query) return null;
    const p = await navigator.permissions.query({ name: "geolocation" });
    if (p.state !== "granted") return null;
    return await new Promise(resolve => navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    ));
  } catch { return null; }
}

// The closest place within its radius (+ GPS uncertainty, capped), or null.
export function placeHere(places, pos, defaultRadius = 150) {
  if (!pos) return null;
  let best = null;
  for (const p of places || []) {
    const d = metersBetween(p, pos);
    const limit = (p.radius || defaultRadius) + Math.min(pos.accuracy || 0, 150);
    if (d <= limit && (!best || d < best.distance)) best = { ...p, distance: Math.round(d) };
  }
  return best;
}
