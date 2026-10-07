// The database. Three backends, picked from the environment:
//   REDIS_URL                     → a normal Redis server (Railway's Redis
//                                   service). Preferred.
//   UPSTASH_REDIS_REST_URL/_TOKEN → Upstash over its REST API (also Vercel KV
//   (or KV_REST_API_URL/_TOKEN)     via KV_REST_API_URL/_TOKEN).
//   neither                       → an in-process Map, for local development
//                                   and tests only (lost on restart).
// Values are stored the same way in both real backends (JSON strings), so
// data can be copied between them (scripts/migrate-redis.mjs).
import Redis from "ioredis";
import fs from "node:fs/promises";
import path from "node:path";

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || "";
const BASE  = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const MODE = REDIS_URL ? "redis" : BASE && TOKEN ? "upstash" : "mem";

const mem = new Map(); // dev-only fallback store: key -> string | string[] (list) | object (hash) | { until }

let client = null;
function redis() {
  if (!client) {
    client = new Redis(REDIS_URL, { maxRetriesPerRequest: 2, commandTimeout: 10000, enableAutoPipelining: true, family: 0 });
    client.on("error", e => console.error("[redis]", e.message));
  }
  return client;
}

// The database's last error, so health checks and sign-in can say the
// database is down instead of treating every lookup as "not found".
let lastError = null; // { message, at }
let alertedAt = 0;
export function storeError() { return lastError && Date.now() - lastError.at < 120000 ? lastError : null; }
export const storeBackend = () => MODE;
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
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Error from the database (${MODE}): <code>${lastError.message.replace(/[<>&]/g, "")}</code></p>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Railway: open the Redis service and check it's running and has space. Upstash: open console.upstash.com and check the plan limits.</p>`, { title: "Database down" }), { kind: "system_alert" })).catch(() => {});
}

// A failed database call throws (StoreUnavailable) instead of looking like
// "no data": otherwise a read that failed could be saved back over real data,
// and sign-in says "wrong password". Counters and locks pass soft=true and
// just get null.
export class StoreUnavailable extends Error {
  constructor(message) { super(`Database unavailable: ${message}`); this.name = "StoreUnavailable"; }
}

// Run one Redis command (["GET", key], ["LPUSH", key, value]…) on the real
// backend and return its result.
// While data is being copied into a new database, everything waits (no
// writes into a half-filled database). See _lib/migrateUpstash.js.
let moving = false;
export function setMoving(on) { moving = !!on; }
export const _internal = { redis: () => redis(), blobWrite: (k, raw) => blobWrite(k, raw), isBlob: k => isBlob(k), upstash: () => (BASE && TOKEN ? { BASE, TOKEN } : null), dataDir: () => DATA_DIR };

async function cmd(args, soft = false) {
  const fail = m => { failed(m); if (soft) return null; throw new StoreUnavailable(m); };
  if (moving) { if (soft) return null; throw new StoreUnavailable("moving to the new database, back in a few minutes"); }
  try {
    if (MODE === "redis") return await redis().call(...args.map(String));
    const r = await fetch(BASE, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(args.map(String)),
      signal: AbortSignal.timeout(10000),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.error) return fail(j?.error || `HTTP ${r.status}`);
    return j.result;
  } catch (e) {
    if (e instanceof StoreUnavailable) throw e;
    return fail(e.message || "network error");
  }
}
const parse = v => { if (v == null) return null; try { return JSON.parse(v); } catch { return null; } };

// Files (PDFs, receipts, photos) are by far the biggest values. With a
// Railway volume mounted (DATA_DIR, e.g. /data) they're saved as files on
// disk instead of in the database, so they can never fill it up. Files saved
// before that are still read from the database.
const DATA_DIR = process.env.DATA_DIR || "";
const BLOB = /^orionsoft:(files|photo):/;
const isBlob = key => !!DATA_DIR && BLOB.test(key);
const blobPath = key => path.join(DATA_DIR, "blobs", `${key.replace(/[^\w.-]/g, "_")}.json`);
async function blobRead(key) {
  try { return await fs.readFile(blobPath(key), "utf8"); } catch { return null; }
}
async function blobWrite(key, raw) {
  const p = blobPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(`${p}.tmp`, raw);
  await fs.rename(`${p}.tmp`, p); // never leave half a file
}

// Push JSON item to front of a list (newest first).
export async function push(key, value) {
  if (MODE === "mem") {
    const list = mem.get(key) || [];
    list.unshift(JSON.stringify(value));
    mem.set(key, list);
    return { result: list.length };
  }
  return { result: await cmd(["LPUSH", key, JSON.stringify(value)]) };
}

// Get up to `limit` items from a list (newest first).
export async function list(key, limit = 500) {
  const raw = MODE === "mem" ? (mem.get(key) || []).slice(0, limit) : (await cmd(["LRANGE", key, 0, limit - 1])) || [];
  return raw.map(parse).filter(Boolean);
}

// Increment a counter (page views etc.).
export async function incr(key) {
  if (MODE === "mem") {
    const next = (parseInt(mem.get(key), 10) || 0) + 1;
    mem.set(key, String(next));
    return next;
  }
  return Number(await cmd(["INCR", key], true)) || 0;
}

// Get a counter value.
export async function getCount(key) {
  if (MODE === "mem") return parseInt(mem.get(key), 10) || 0;
  return parseInt((await cmd(["GET", key], true)) ?? "0", 10) || 0;
}

// Increment a hash field (per-page tracking).
export async function hincr(key, field) {
  return hincrby(key, field, 1);
}

// Increment a hash field by an integer (leaderboard points etc.).
export async function hincrby(key, field, n) {
  if (MODE === "mem") {
    const hash = mem.get(key) || {};
    hash[field] = (parseInt(hash[field], 10) || 0) + n;
    mem.set(key, hash);
    return hash[field];
  }
  return Number(await cmd(["HINCRBY", key, field, Math.trunc(n)], true)) || 0;
}

// Get all hash fields+values.
export async function hgetall(key) {
  if (MODE === "mem") return { ...(mem.get(key) || {}) };
  const res = await cmd(["HGETALL", key], true);
  if (!res) return {};
  if (!Array.isArray(res)) return { ...res };
  const obj = {};
  for (let i = 0; i < res.length; i += 2) obj[res[i]] = res[i + 1];
  return obj;
}

// Get a single JSON value.
export async function get(key) {
  if (isBlob(key)) { const raw = await blobRead(key); if (raw != null) return parse(raw); }
  if (MODE === "mem") return parse(typeof mem.get(key) === "string" ? mem.get(key) : null);
  return parse(await cmd(["GET", key]));
}

// Get many JSON values in one round trip, in key order (null when missing).
export async function mget(keys) {
  if (!keys.length) return [];
  if (keys.some(isBlob)) return Promise.all(keys.map(get));
  if (MODE === "mem") return keys.map(k => parse(typeof mem.get(k) === "string" ? mem.get(k) : null));
  const out = [];
  for (let i = 0; i < keys.length; i += 100) {
    const res = await cmd(["MGET", ...keys.slice(i, i + 100)]);
    out.push(...(Array.isArray(res) ? res : []).map(parse));
  }
  return out;
}

// Trim a list to its newest `max` items.
export async function ltrim(key, max) {
  if (MODE === "mem") {
    const list = mem.get(key);
    if (Array.isArray(list)) mem.set(key, list.slice(0, max));
    return { result: "OK" };
  }
  return { result: await cmd(["LTRIM", key, 0, max - 1]) };
}

// Set a single JSON value.
export async function set(key, value) {
  if (isBlob(key)) {
    await blobWrite(key, JSON.stringify(value));
    if (MODE !== "mem") await cmd(["DEL", key], true); // free the old copy in the database
    return { result: "OK" };
  }
  if (MODE === "mem") {
    mem.set(key, JSON.stringify(value));
    return { result: "OK" };
  }
  return { result: await cmd(["SET", key, JSON.stringify(value)]) };
}

// Atomically claims `key` for `ttlSeconds` (SET NX EX). Returns true only for
// the first caller, so two requests racing on the same work can't both do it.
export async function claim(key, ttlSeconds = 60) {
  if (MODE === "mem") {
    const hit = mem.get(key);
    if (hit && hit.until > Date.now()) return false;
    mem.set(key, { until: Date.now() + ttlSeconds * 1000 });
    return true;
  }
  return (await cmd(["SET", key, "1", "NX", "EX", Math.max(1, Math.trunc(ttlSeconds))], true)) === "OK";
}

// Increments a counter that expires after `ttlSeconds` (daily caps etc.).
export async function incrTtl(key, ttlSeconds) {
  if (MODE === "mem") {
    const hit = mem.get(key);
    const cur = hit && typeof hit === "object" && hit.until > Date.now() ? hit : { n: 0, until: Date.now() + ttlSeconds * 1000 };
    cur.n++; mem.set(key, cur);
    return cur.n;
  }
  const n = Number(await cmd(["INCR", key], true)) || 0;
  if (n === 1) await cmd(["EXPIRE", key, Math.trunc(ttlSeconds)], true);
  return n;
}

// Delete a key.
export async function del(key) {
  if (isBlob(key)) await fs.unlink(blobPath(key)).catch(() => {});
  if (MODE === "mem") { mem.delete(key); return { result: 1 }; }
  return { result: await cmd(["DEL", key]) };
}

export const available = () => MODE !== "mem";
