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

async function u(method, path, body) {
  if (!BASE || !TOKEN) return null;
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return await r.json();
  } catch { return null; }
}

// Push JSON item to front of a Redis list (lpush = newest first)
export async function push(key, value) {
  if (!BASE || !TOKEN) {
    const list = mem.get(key) || [];
    list.unshift(JSON.stringify(value));
    mem.set(key, list);
    return { result: list.length };
  }
  return u("POST", `/lpush/${key}`, [JSON.stringify(value)]);
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
  const res = await u("GET", `/incr/${key}`);
  return res?.result ?? 0;
}

// Get a counter value
export async function getCount(key) {
  if (!BASE || !TOKEN) return parseInt(mem.get(key), 10) || 0;
  const res = await u("GET", `/get/${key}`);
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
  const res = await u("GET", `/hincrby/${key}/${field}/1`);
  return res?.result ?? 0;
}

// Get all hash fields+values
export async function hgetall(key) {
  if (!BASE || !TOKEN) return { ...(mem.get(key) || {}) };
  const res = await u("GET", `/hgetall/${key}`);
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
  return u("POST", `/set/${key}`, value);
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
