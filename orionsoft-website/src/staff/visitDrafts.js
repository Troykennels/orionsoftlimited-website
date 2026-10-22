// Device-local visit drafts, isolated by employee and visit. Photos live in
// IndexedDB; the small text checkpoint survives navigation during an IDB write.
const PREFIX = "so_visit_draft_v1:";
const MAX_AGE = 7 * 86400000;
const memory = new Map();
let opening;
function keyFor(employeeId, scope) {
  if (!employeeId || !scope) throw new Error("A signed-in employee and draft scope are required");
  return `${PREFIX}${employeeId}:${scope}`;
}
function database() {
  if (!opening) opening = new Promise(resolve => {
    try {
      const request = indexedDB.open("so-visit-drafts", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return opening;
}
async function transaction(mode, operation) {
  const db = await database();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const tx = db.transaction("drafts", mode);
      const result = operation(tx.objectStore("drafts"));
      tx.oncomplete = () => resolve({ value: result?.result });
      tx.onerror = tx.onabort = () => resolve(null);
    } catch { resolve(null); }
  });
}
function localRead(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function localWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export async function readVisitDraft(employeeId, scope) {
  const key = keyFor(employeeId, scope);
  if (memory.has(key)) {
    const cached = memory.get(key);
    if (cached && Date.now() - cached.at > MAX_AGE) { await clearVisitDraft(employeeId, scope); return null; }
    return cached?.data || null;
  }
  const meta = localRead(key);
  const saved = (await transaction("readonly", store => store.get(key)))?.value;
  // A write/clear started while this read was in flight: never resurrect old work.
  if (memory.has(key)) return memory.get(key)?.data || null;
  const latest = meta && (!saved || meta.at >= saved.at) ? meta : saved;
  if (latest?.deleted) return null;
  if (!latest || Date.now() - latest.at > MAX_AGE) {
    if (latest) await clearVisitDraft(employeeId, scope);
    return null;
  }
  const photo = latest.data.photo ||
    (saved && saved.data.photoId === latest.data.photoId ? saved.data.photo : null);
  const data = { ...latest.data, photo, photoMissing: !!latest.hasPhoto && !photo };
  memory.set(key, { ...latest, data });
  return data;
}
export async function writeVisitDraft(employeeId, scope, data) {
  const key = keyFor(employeeId, scope);
  const record = { at: Math.max(Date.now(), (memory.get(key)?.at || 0) + 1), revision: crypto.randomUUID(), data, hasPhoto: !!data.photo };
  memory.set(key, record);
  const small = { ...data };
  delete small.photo;
  localWrite(key, { ...record, data: small });
  const saved = await transaction("readwrite", store => store.put(record, key));
  if (!saved && !localWrite(key, record)) throw new Error("Draft storage is unavailable. Keep this page open until your visit is saved.");
  return record.at;
}
export async function clearVisitDraft(employeeId, scope) {
  const key = keyFor(employeeId, scope);
  memory.set(key, null);
  localWrite(key, { at: Date.now() + 1, deleted: true });
  const deleted = await transaction("readwrite", store => store.delete(key));
  if (deleted) try { localStorage.removeItem(key); } catch { /* tombstone is safe */ }
}
