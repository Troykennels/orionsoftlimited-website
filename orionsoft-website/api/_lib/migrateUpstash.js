// One-time move from Upstash to Railway's Redis (and files to the Railway
// volume). Runs when the server starts with REDIS_URL, the Upstash variables
// and MIGRATE_FROM_UPSTASH=1. Until the copy is complete the site answers
// "back in a few minutes" (nothing is written into a half-filled database);
// if Upstash can't be read yet it tries again every minute. Done once: a
// marker in the new database stops it from ever running again.
import { _internal, setMoving, storeBackend } from "../store.js";

const MARKER = "orionsoft:migration:from-upstash";

async function upstash(commands) {
  const { BASE, TOKEN } = _internal.upstash();
  const r = await fetch(`${BASE.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands.map(c => c.map(String))),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(j)) throw new Error(j?.error || `Upstash HTTP ${r.status}`);
  const bad = j.find(x => x?.error);
  if (bad) throw new Error(bad.error);
  return j.map(x => x.result);
}

export async function copyAll(log = console.log) {
  const redis = _internal.redis();
  let cursor = "0", keys = 0, files = 0;
  do {
    const [[next, batch]] = await upstash([["SCAN", cursor, "COUNT", 500]]);
    cursor = String(next);
    if (!batch.length) continue;
    const meta = await upstash(batch.flatMap(k => [["TYPE", k], ["PTTL", k]]));
    const types = batch.map((k, i) => ({ key: k, type: meta[i * 2], ttl: Number(meta[i * 2 + 1]) }))
      .filter(x => x.ttl !== -2 && !(x.ttl > 0 && x.ttl < 5000)); // gone, or about to expire
    const read = { string: k => ["GET", k], list: k => ["LRANGE", k, 0, -1], hash: k => ["HGETALL", k], set: k => ["SMEMBERS", k], zset: k => ["ZRANGE", k, 0, -1, "WITHSCORES"] };
    const wanted = types.filter(x => read[x.type]);
    for (let i = 0; i < wanted.length; i += 50) {
      const chunk = wanted.slice(i, i + 50);
      const values = await upstash(chunk.map(x => read[x.type](x.key)));
      const p = redis.pipeline();
      for (const [j, x] of chunk.entries()) {
        const v = values[j];
        if (v == null) continue;
        if (x.type === "string" && _internal.isBlob(x.key)) { await _internal.blobWrite(x.key, v); files++; continue; }
        p.del(x.key);
        if (x.type === "string") p.set(x.key, v);
        else if (x.type === "list" && v.length) p.rpush(x.key, ...v);
        else if (x.type === "hash") { const flat = Array.isArray(v) ? v : Object.entries(v).flat(); if (flat.length) p.hset(x.key, ...flat); }
        else if (x.type === "set" && v.length) p.sadd(x.key, ...v);
        else if (x.type === "zset" && v.length) { const args = []; for (let n = 0; n < v.length; n += 2) args.push(v[n + 1], v[n]); p.zadd(x.key, ...args); }
        if (x.ttl > 0) p.pexpire(x.key, x.ttl);
        keys++;
      }
      const res = await p.exec();
      const err = res?.find(([e]) => e);
      if (err) throw err[0];
    }
    log(`[migrate] copied ${keys} keys and ${files} files so far`);
  } while (cursor !== "0");
  return { keys, files };
}

export async function migrateOnStart() {
  if (storeBackend() !== "redis" || !_internal.upstash() || process.env.MIGRATE_FROM_UPSTASH !== "1") return;
  const redis = _internal.redis();
  if (await redis.get(MARKER).catch(() => null)) return; // already moved
  setMoving(true);
  const attempt = async () => {
    try {
      console.log("[migrate] copying everything from Upstash to Railway Redis…");
      const r = await copyAll();
      await redis.set(MARKER, JSON.stringify({ at: new Date().toISOString(), ...r }));
      console.log(`[migrate] done: ${r.keys} keys, ${r.files} files`);
      setMoving(false);
    } catch (e) {
      console.error("[migrate] not yet:", e.message, "(trying again in 1 minute)");
      setTimeout(attempt, 60000);
    }
  };
  attempt();
}
