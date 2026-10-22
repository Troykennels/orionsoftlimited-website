import assert from 'node:assert/strict';
import { test } from 'node:test';

test('draft fallback restores photos after a reload and isolates employees and visit IDs', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const first = await import('../src/staff/visitDrafts.js?fallback-first');
  const photo = { dataUrl: 'data:image/jpeg;base64,fixture', hash: '1234567890abcdef', source: 'camera' };
  await first.writeVisitDraft('staff-a', 'arrival', { f: { organisation: 'Fixture client' }, photo, photoId: 'photo-a' });
  await first.writeVisitDraft('staff-a', 'finish:own-visit', { outcome: 'Saved notes without a photo' });
  const reload = await import('../src/staff/visitDrafts.js?fallback-reload');
  assert.equal((await reload.readVisitDraft('staff-a', 'arrival')).photo.dataUrl, photo.dataUrl);
  assert.equal(await reload.readVisitDraft('staff-b', 'arrival'), null);
  assert.equal(await reload.readVisitDraft('staff-a', 'finish:another-visit'), null);
  assert.equal((await reload.readVisitDraft('staff-a', 'finish:own-visit')).outcome, 'Saved notes without a photo');
  await reload.clearVisitDraft('staff-a', 'arrival');
  const afterClear = await import('../src/staff/visitDrafts.js?fallback-after-clear');
  assert.equal(await afterClear.readVisitDraft('staff-a', 'arrival'), null);
});

test('full storage reports failure instead of claiming the photo or queued check-in was saved', async () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); }, removeItem() {} };
  globalThis.window = new EventTarget();
  const storage = await import('../src/staff/visitDrafts.js?full-storage');
  await assert.rejects(storage.writeVisitDraft('staff-a', 'arrival', { photo: { dataUrl: 'photo' } }), /storage is unavailable/);
  const { enqueue } = await import('../src/staff/offlineQueue.js');
  await assert.rejects(enqueue('/api/staff/visits', { action: 'check-in' }), /Could not save the offline action/);
});
