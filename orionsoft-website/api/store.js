// Redis REST API helper — works with Vercel KV or direct Upstash
// Vercel KV (easier): add from Vercel dashboard → Storage → Create KV
// Direct Upstash: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

const BASE  = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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
  return u("POST", `/lpush/${key}`, [JSON.stringify(value)]);
}

// Get up to `limit` items from a Redis list (0-indexed)
export async function list(key, limit = 500) {
  const res = await u("GET", `/lrange/${key}/0/${limit - 1}`);
  if (!res?.result) return [];
  return res.result
    .map(v => { try { return JSON.parse(v); } catch { return null; } })
    .filter(Boolean);
}

// Increment a counter (for page views etc.)
export async function incr(key) {
  const res = await u("GET", `/incr/${key}`);
  return res?.result ?? 0;
}

// Get a counter value
export async function getCount(key) {
  const res = await u("GET", `/get/${key}`);
  return parseInt(res?.result ?? "0", 10) || 0;
}

// Set a hash field (for per-page tracking)
export async function hincr(key, field) {
  const res = await u("GET", `/hincrby/${key}/${field}/1`);
  return res?.result ?? 0;
}

// Get all hash fields+values
export async function hgetall(key) {
  const res = await u("GET", `/hgetall/${key}`);
  if (!res?.result) return {};
  const obj = {};
  const arr = res.result;
  for (let i = 0; i < arr.length; i += 2) obj[arr[i]] = arr[i + 1];
  return obj;
}

export const available = () => !!(BASE && TOKEN);
