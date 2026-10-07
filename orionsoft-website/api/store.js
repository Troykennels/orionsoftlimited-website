// Redis REST API helper — works with Vercel KV or direct Upstash
// Vercel KV (easier): add from Vercel dashboard → Storage → Create KV
// Direct Upstash: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//
// When neither is configured (e.g. local `vercel dev` without cloud creds),
// everything falls back to an in-process Map so the whole app — auth, CMS
// leads, contracts, employees, etc. — is still fully testable locally.
// This fallback does NOT persist across serverless cold starts in production;
// it exists purely for local development. `available()` still reports whether
// a REAL Upstash instance is configured, for admin UI warnings.

const BASE  = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const mem = new Map(); // dev-only fallback store: key -> string | string[] (list) | Map (hash)

// The database's last error (e.g. Upstash "max requests limit exceeded"),
// so health checks and sign-in can say the database is down instead of
// treating every lookup as "not found".
let lastError = null; // { message, at }
let alertedAt = 0;
export function storeError() { return lastError && Date.now() - lastError.at < 120000 ? lastError : null; }
function failed(message) {
  lastError = { message: String(message).slice(0, 200), at: Date.now() };
  console.error("[store]", lastError.message);
  // Tell the owner by email, at most every 3 hours (the email itself must not
  // depend on the database).
  if (Date.now() - alertedAt < 3 * 3600000) return;
  alertedAt = Date.now();
  import("./_lib/mailer.js").then(({ sendEmail, brandedShell }) => sendEmail(process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com", "URGENT: the website database is not responding",
    brandedShell(`<h2 style="color:#B91C1C;font-size:18px;margin:0 0 12px;">The database stopped answering</h2>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Nobody can sign in to the admin, Staff Office or client portal until it's back. Your data is not deleted.</p>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Error from Upstash: <code>${lastError.message.replace(/[<>&]/g, "")}</code></p>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">If it says the request limit was reached: open console.upstash.com → your Redis database → upgrade the plan (Pay as you go). It starts working again at once.</p>`, { title: "Database down" }), { kind: "system_alert" })).catch(() => {});
}

// A failed database call throws (StoreUnavailable) instead of looking like
// "no data": otherwise a read that failed could be saved back over real data,
// and sign-in says "wrong password". Counters and locks pass soft=true and
// just get null.
export class StoreUnavailable extends Error {
  constructor(message) { super(`Database unavailable: ${message}`); this.name = "StoreUnavailable"; }
}
async function u(method, path, body, soft = false) {
  if (!BASE || !TOKEN) return null;
  const fail = m => { failed(m); if (soft) return null; throw new StoreUnavailable(m); };
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.error) return fail(j?.error || `HTTP ${r.status}`);
    return j;
  } catch (e) {
    if (e instanceof StoreUnavailable) throw e;
    return fail(e.message || "network error");
  }
}

// Push JSON item to front of a Redis list (lpush = newest first).
// Same fix as set(): Upstash's REST API stores the raw POST body verbatim as
// the single value — it does not unwrap a JSON array into positional args the
// way a native Redis client would. Wrapping in an array (the previous code)
// silently corrupted every pushed item, verified directly against the live
// REST API (this affected leads/conversations tracking before this session
// too, not just the new records added this session).
export async function push(key, value) {
  if (!BASE || !TOKEN) {
    const list = mem.get(key) || [];
    list.unshift(JSON.stringify(value));
    mem.set(key, list);
    return { result: list.length };
  }
  return u("POST", `/lpush/${key}`, value);
}

// Get up to `limit` items from a Redis list (0-indexed)
export async function list(key, limit = 500) {
  if (!BASE || !TOKEN) {
    const list = mem.get(key) || [];
    return list.slice(0, limit).map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
  }
  const res = await u("GET", `/lrange/${key}/0/${limit - 1}`);
  if (!res?.result) return [];
  return res.result
    .map(v => { try { return JSON.parse(v); } catch { return null; } })
    .filter(Boolean);
}

// Increment a counter (for page views etc.)
export async function incr(key) {
  if (!BASE || !TOKEN) {
    const next = (parseInt(mem.get(key), 10) || 0) + 1;
    mem.set(key, String(next));
    return next;
  }
  const res = await u("GET", `/incr/${key}`, undefined, true);
  return res?.result ?? 0;
}

// Get a counter value
export async function getCount(key) {
  if (!BASE || !TOKEN) return parseInt(mem.get(key), 10) || 0;
  const res = await u("GET", `/get/${key}`, undefined, true);
  return parseInt(res?.result ?? "0", 10) || 0;
}

// Set a hash field (for per-page tracking)
export async function hincr(key, field) {
  if (!BASE || !TOKEN) {
    const hash = mem.get(key) || {};
    hash[field] = (parseInt(hash[field], 10) || 0) + 1;
    mem.set(key, hash);
    return hash[field];
  }
  const res = await u("GET", `/hincrby/${key}/${field}/1`, undefined, true);
  return res?.result ?? 0;
}

// Increment a hash field by an arbitrary integer (leaderboard points etc.)
export async function hincrby(key, field, n) {
  if (!BASE || !TOKEN) {
    const hash = mem.get(key) || {};
    hash[field] = (parseInt(hash[field], 10) || 0) + n;
    mem.set(key, hash);
    return hash[field];
  }
  const res = await u("GET", `/hincrby/${key}/${encodeURIComponent(field)}/${Math.trunc(n)}`, undefined, true);
  return res?.result ?? 0;
}

// Get all hash fields+values
export async function hgetall(key) {
  if (!BASE || !TOKEN) return { ...(mem.get(key) || {}) };
  const res = await u("GET", `/hgetall/${key}`, undefined, true);
  if (!res?.result) return {};
  const obj = {};
  const arr = res.result;
  for (let i = 0; i < arr.length; i += 2) obj[arr[i]] = arr[i + 1];
  return obj;
}

// Get a single JSON-serialized value by key (arbitrary record storage)
export async function get(key) {
  if (!BASE || !TOKEN) {
    const raw = mem.get(key);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  const res = await u("GET", `/get/${key}`);
  if (res?.result == null) return null;
  try { return JSON.parse(res.result); } catch { return null; }
}

// Get many JSON values in one round trip (Upstash accepts a raw Redis command
// as a JSON array POSTed to the base URL). Returns values in key order, null
// for missing/unparseable keys. Falls back to parallel single GETs if the
// batched call fails, so a REST quirk can never make a list come back empty.
export async function mget(keys) {
  if (!keys.length) return [];
  if (!BASE || !TOKEN) {
    return keys.map(k => {
      const raw = mem.get(k);
      if (raw == null || typeof raw !== "string") return null;
      try { return JSON.parse(raw); } catch { return null; }
    });
  }
  const out = [];
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const res = await u("POST", "", ["MGET", ...chunk]);
    if (Array.isArray(res?.result)) {
      for (const v of res.result) {
        if (v == null) { out.push(null); continue; }
        try { out.push(JSON.parse(v)); } catch { out.push(null); }
      }
    } else {
      out.push(...await Promise.all(chunk.map(k => get(k))));
    }
  }
  return out;
}

// Trim a list to its newest `max` items (keeps notification/feed lists bounded).
export async function ltrim(key, max) {
  if (!BASE || !TOKEN) {
    const list = mem.get(key);
    if (Array.isArray(list)) mem.set(key, list.slice(0, max));
    return { result: "OK" };
  }
  return u("GET", `/ltrim/${key}/0/${max - 1}`);
}

// Set a single JSON-serialized value by key.
// Unlike LPUSH (variadic — remaining args go in a JSON array), Upstash's REST
// SET takes the value directly as the raw POST body. u() already does one
// JSON.stringify, so passing `value` here (not `[JSON.stringify(value)]`)
// round-trips correctly with get()'s JSON.parse(res.result) — verified against
// the live REST API directly (double-wrapping silently corrupted every write).
export async function set(key, value) {
  if (!BASE || !TOKEN) {
    mem.set(key, JSON.stringify(value));
    return { result: "OK" };
  }
  const res = await u("POST", `/set/${key}`, value);
  // Upstash answers errors (e.g. a value over the request size limit) with
  // { error }, not an HTTP failure. Log them so a lost write is visible.
  if (res?.error) console.error(`[store] SET ${key} failed: ${res.error}`);
  return res;
}

// Atomically claims `key` for `ttlSeconds` (Redis SET NX EX). Returns true only
// for the first caller, so two requests racing on the same work (a Paystack
// webhook and the payer's callback page, a double-clicked button) can't both
// do it.
export async function claim(key, ttlSeconds = 60) {
  if (!BASE || !TOKEN) {
    const hit = mem.get(key);
    if (hit && hit.until > Date.now()) return false;
    mem.set(key, { until: Date.now() + ttlSeconds * 1000 });
    return true;
  }
  const res = await u("POST", "", ["SET", key, "1", "NX", "EX", String(Math.max(1, Math.trunc(ttlSeconds)))], true);
  return res?.result === "OK";
}

// Increments a counter that expires after `ttlSeconds` (daily caps etc.).
export async function incrTtl(key, ttlSeconds) {
  if (!BASE || !TOKEN) {
    const hit = mem.get(key);
    const cur = hit && typeof hit === "object" && hit.until > Date.now() ? hit : { n: 0, until: Date.now() + ttlSeconds * 1000 };
    cur.n++; mem.set(key, cur);
    return cur.n;
  }
  const res = await u("POST", "", ["INCR", key], true);
  if (res?.result === 1) await u("POST", "", ["EXPIRE", key, String(Math.trunc(ttlSeconds))], true);
  return res?.result ?? 0;
}

// Delete a key
export async function del(key) {
  if (!BASE || !TOKEN) {
    mem.delete(key);
    return { result: 1 };
  }
  return u("GET", `/del/${key}`);
}

export const available = () => !!(BASE && TOKEN);
