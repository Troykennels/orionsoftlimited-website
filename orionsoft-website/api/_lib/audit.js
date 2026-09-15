// Real, server-side audit trail — separate from the client-only auditLog()
// in src/admin/Dashboard.jsx, which only ever wrote to the acting admin's
// own localStorage (invisible to every other admin, and self-erasable via
// that same page's "Clear All" button). This is the shared, tamper-evident
// record: any admin can read it, none can silently wipe it via the UI.
import { push, list } from "../store.js";

const KEY = "orionsoft:admin:audit";
const MAX_ENTRIES = 2000;

export async function logAudit(session, action, subject, detail = "") {
  try {
    await push(KEY, {
      id: `aud_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      action, subject, detail,
      by: session?.name || session?.email || session?.sub || "unknown",
      byId: session?.sub || "",
      at: new Date().toISOString(),
    });
  } catch { /* best-effort — never let audit logging break the actual action */ }
}

export async function listAudit(limit = MAX_ENTRIES) {
  return list(KEY, limit);
}
