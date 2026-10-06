// Clock-in/out, standups and client check-ins (with their photo) made with no
// network are kept on the phone with the moment they happened, then sent
// automatically when the connection is back. The server accepts the original
// time (up to 24 hours old) and marks the record as synced from offline.
// Stored in IndexedDB (room for photos); falls back to localStorage.
import { api } from "./api.js";

const LS_KEY = "so_offline_queue";
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise(resolve => {
    try {
      const req = indexedDB.open("so-offline", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("queue", { keyPath: "at" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
const tx = async (mode, fn) => {
  const d = await db();
  if (!d) return null;
  return new Promise(resolve => {
    const t = d.transaction("queue", mode);
    const out = fn(t.objectStore("queue"));
    t.oncomplete = () => resolve(out?.result ?? true);
    t.onerror = () => resolve(null);
  });
};
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
const lsWrite = q => { try { localStorage.setItem(LS_KEY, JSON.stringify(q)); } catch { /* storage full */ } };

async function readAll() {
  const fromDb = await tx("readonly", s => s.getAll());
  return [...(Array.isArray(fromDb) ? fromDb : []), ...lsRead()].sort((a, b) => a.at - b.at);
}
async function remove(item) {
  if (item.ls) lsWrite(lsRead().filter(x => x.at !== item.at));
  else await tx("readwrite", s => s.delete(item.at));
}

export async function pendingCount() { return (await readAll()).length; }

// A fetch that never reached the server (offline, DNS, timeout), as opposed to
// the server answering with an error.
export const isNetworkError = e => !e?.status && (e instanceof TypeError || !navigator.onLine || /fetch|network|Failed to/i.test(e?.message || ""));

export async function enqueue(path, body) {
  const item = { path, body: { ...body, capturedAt: new Date().toISOString() }, at: Date.now() + Math.random() };
  const ok = await tx("readwrite", s => s.put(item));
  if (!ok) lsWrite([...lsRead(), { ...item, ls: true }]);
  window.dispatchEvent(new Event("so-offline-queue"));
}

let flushing = false;
export async function flushQueue() {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of await readAll()) {
      try {
        await api(item.path, { method: "POST", body: item.body });
        sent++;
      } catch (e) {
        if (isNetworkError(e)) break; // still offline: try again later
        // The server refused it (e.g. already clocked in): drop it.
      }
      await remove(item);
    }
  } finally { flushing = false; }
  if (sent) window.dispatchEvent(new Event("so-offline-queue"));
  return sent;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushQueue(); });
}
