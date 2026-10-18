import { randomUUID } from "node:crypto";
import { get, set, acquireLease, releaseLease } from "../store.js";
import { getRecord, putRecord } from "./records.js";

export async function runOnce(key, work) {
  if (await get(key)) return false;
  const owner = randomUUID(), lock = `${key}:running`;
  if (!(await acquireLease(lock, owner, 1800))) return false;
  const id = key.replace(/:\d{4}-\d{2}(?:-\d{2})?(?::.*)?$/, "");
  const startedAt = new Date().toISOString();
  let record = { id, key, startedAt, attempts: 1, lastSuccessAt: null };
  try {
    const prior = await getRecord("automationRuns", id);
    record = { ...record, attempts: (prior?.attempts || 0) + 1, lastSuccessAt: prior?.lastSuccessAt || null };
    // A worker may have completed between the first read and lease acquisition.
    if (await get(key)) return false;
    await putRecord("automationRuns", id, { ...record, status: "running" });
    await work();
    await set(key, new Date().toISOString());
    await putRecord("automationRuns", id, { ...record, status: "success", finishedAt: new Date().toISOString(), lastSuccessAt: new Date().toISOString() });
    return true;
  } catch (error) {
    await putRecord("automationRuns", id, { ...record, status: "failed", finishedAt: new Date().toISOString(), error: "The job did not finish. It will retry; check server logs for details." }).catch(() => {});
    throw error;
  } finally { await releaseLease(lock, owner); }
}
