// Visit and location-check photos live under their own keys, not inside the
// visit/spot-check records, so listing records (which scoring, the office
// bootstrap and every check-in do) never downloads hundreds of KB of images.
// A photo is only fetched when someone opens that piece of evidence.
import { get, set } from "../store.js";
import { listRecords, putRecord } from "./records.js";

const key = id => `orionsoft:photo:${id}`;

export async function savePhoto(id, dataUrl) {
  if (dataUrl) await set(key(id), dataUrl);
}

export async function loadPhoto(id) {
  return (await get(key(id))) || "";
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
