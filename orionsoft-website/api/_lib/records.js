// Generic index-backed CRUD over api/store.js's Redis get/set/del primitives.
// Record: orionsoft:{entity}:{id}          -> JSON blob
// Index:  orionsoft:{entity}:index          -> JSON array of ids
// Lookup: orionsoft:{entity}:by-{field}:{value} -> id (string) or array of ids
import { get, set, del } from "../store.js";

function indexKey(entity) { return `orionsoft:${entity}:index`; }
function recordKey(entity, id) { return `orionsoft:${entity}:${id}`; }
function lookupKey(entity, field, value) { return `orionsoft:${entity}:by-${field}:${String(value).toLowerCase()}`; }

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function readIndex(entity) {
  return (await get(indexKey(entity))) || [];
}

async function writeIndex(entity, ids) {
  return set(indexKey(entity), ids);
}

export async function addToIndex(entity, id) {
  const ids = await readIndex(entity);
  if (!ids.includes(id)) {
    ids.unshift(id);
    await writeIndex(entity, ids);
  }
}

export async function removeFromIndex(entity, id) {
  const ids = await readIndex(entity);
  const next = ids.filter((x) => x !== id);
  if (next.length !== ids.length) await writeIndex(entity, next);
}

export async function getRecord(entity, id) {
  if (!id) return null;
  return get(recordKey(entity, id));
}

export async function putRecord(entity, id, value) {
  await set(recordKey(entity, id), value);
  await addToIndex(entity, id);
  return value;
}

export async function deleteRecord(entity, id) {
  await del(recordKey(entity, id));
  await removeFromIndex(entity, id);
}

export async function listRecords(entity) {
  const ids = await readIndex(entity);
  const items = await Promise.all(ids.map((id) => getRecord(entity, id)));
  return items.filter(Boolean);
}

export async function setLookup(entity, field, value, id) {
  return set(lookupKey(entity, field, value), id);
}

export async function getByLookup(entity, field, value) {
  const id = await get(lookupKey(entity, field, value));
  if (!id) return null;
  return getRecord(entity, id);
}

export async function deleteLookup(entity, field, value) {
  return del(lookupKey(entity, field, value));
}

// Array-valued secondary index (e.g. reports by employee) — appends/removes an id
// under orionsoft:{entity}:by-{field}:{value}
export async function addToArrayIndex(entity, field, value, id) {
  const key = lookupKey(entity, field, value);
  const ids = (await get(key)) || [];
  if (!ids.includes(id)) {
    ids.unshift(id);
    await set(key, ids);
  }
}

export async function removeFromArrayIndex(entity, field, value, id) {
  const key = lookupKey(entity, field, value);
  const ids = (await get(key)) || [];
  const next = ids.filter((x) => x !== id);
  await set(key, next);
}

export async function listByArrayIndex(entity, field, value) {
  const key = lookupKey(entity, field, value);
  const ids = (await get(key)) || [];
  const items = await Promise.all(ids.map((id) => getRecord(entity, id)));
  return items.filter(Boolean);
}
