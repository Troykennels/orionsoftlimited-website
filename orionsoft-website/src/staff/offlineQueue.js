// Clock-in/out and standups made with no network are kept on the phone with
// the moment they happened, then sent automatically when the connection is
// back. The server accepts the original time (up to 24 hours old) and marks
// the record as synced from offline.
import { api } from "./api.js";

const KEY = "so_offline_queue";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = q => { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* storage full */ } };

export const pendingCount = () => read().length;

// A fetch that never reached the server (offline, DNS, timeout), as opposed to
// the server answering with an error.
export const isNetworkError = e => !e?.status && (e instanceof TypeError || !navigator.onLine || /fetch|network|Failed to/i.test(e?.message || ""));

export function enqueue(path, body) {
  write([...read(), { path, body: { ...body, capturedAt: new Date().toISOString() }, at: Date.now() }]);
  window.dispatchEvent(new Event("so-offline-queue"));
}

let flushing = false;
export async function flushQueue() {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of read()) {
      try {
        await api(item.path, { method: "POST", body: item.body });
        sent++;
      } catch (e) {
        if (isNetworkError(e)) break; // still offline: try again later
        // The server refused it (e.g. already clocked in): drop it.
      }
      write(read().filter(x => x.at !== item.at));
    }
  } finally { flushing = false; }
  if (sent) window.dispatchEvent(new Event("so-offline-queue"));
  return sent;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushQueue(); });
}
