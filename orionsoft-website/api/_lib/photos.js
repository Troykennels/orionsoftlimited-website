// Visit and location-check photos live under their own keys, not inside the
// visit/spot-check records, so listing records (which scoring, the office
// bootstrap and every check-in do) never downloads hundreds of KB of images.
// A photo is only fetched when someone opens that piece of evidence.
import { get, set, del } from "../store.js";
import { listRecords, putRecord } from "./records.js";

const key = id => `orionsoft:photo:${id}`;

export async function savePhoto(id, dataUrl) {
  if (dataUrl) await set(key(id), dataUrl);
}

export async function loadPhoto(id) {
  return (await get(key(id))) || "";
}

export async function deletePhoto(id) {
  await del(key(id));
}

// Data retention (NDPA): strip GPS points and delete photos older than
// `months`. The records themselves (times, outcomes) are kept.
export async function purgeOldLocationData(months) {
  const cutoff = new Date(Date.now() - months * 30.44 * 86400000).toISOString();
  let n = 0;
  for (const a of await listRecords("attendance")) {
    if (a.date >= cutoff.slice(0, 10) || a.locationPurged) continue;
    a.clockInGeo = null; a.clockOutGeo = null; a.clockInIp = null; a.clockOutIp = null;
    a.events = (a.events || []).map(e => ({ ...e, geo: null, ip: null }));
    a.locationPurged = true;
    await putRecord("attendance", a.id, a); n++;
  }
  for (const v of await listRecords("visits")) {
    if (v.checkIn?.at >= cutoff || v.locationPurged) continue;
    v.checkIn = { ...v.checkIn, geo: null, ip: null };
    if (v.checkOut) v.checkOut = { ...v.checkOut, geo: null, ip: null };
    if (v.confirmation) v.confirmation = { ...v.confirmation, geo: null };
    v.photoDataUrl = undefined; v.hasPhoto = false; v.locationPurged = true;
    await deletePhoto(v.id);
    await putRecord("visits", v.id, v); n++;
  }
  for (const s of await listRecords("spotchecks")) {
    if (s.issuedAt >= cutoff || s.locationPurged) continue;
    if (s.response) s.response = { ...s.response, geo: null, ip: null, photoDataUrl: undefined, hasPhoto: false };
    s.locationPurged = true;
    await deletePhoto(s.id);
    await putRecord("spotchecks", s.id, s); n++;
  }
  return n;
}

// One-off move of photos stored inline by older versions. Safe to re-run:
// records without an inline photo are skipped.
export async function migrateInlinePhotos() {
  let moved = 0;
  for (const v of await listRecords("visits")) {
    if (!v.photoDataUrl) continue;
    await savePhoto(v.id, v.photoDataUrl);
    const { photoDataUrl, ...rest } = v;
    await putRecord("visits", v.id, { ...rest, hasPhoto: true });
    moved++;
  }
  for (const s of await listRecords("spotchecks")) {
    if (!s.response?.photoDataUrl) continue;
    await savePhoto(s.id, s.response.photoDataUrl);
    const { photoDataUrl, ...response } = s.response;
    await putRecord("spotchecks", s.id, { ...s, response: { ...response, hasPhoto: true } });
    moved++;
  }
  return moved;
}
