// Notify participating search engines using the site's existing ownership key.
// Receipt of URLs is not a promise of indexing or ranking.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const site = 'https://www.orionsoftlimited.com';
const key = 'a6da13b55322b6a6d6913201910ce936';
const keyLocation = `${site}/${key}.txt`;
const ownership = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) });
assert.ok(ownership.ok, 'Ownership file unavailable');
assert.equal((await ownership.text()).trim(), key, 'Ownership file mismatch');
const sitemap = await fetch(`${site}/sitemap.xml`, { signal: AbortSignal.timeout(15000) });
assert.ok(sitemap.ok, 'Sitemap unavailable');
const xml = await sitemap.text();
const urlList = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&')))];
assert.ok(urlList.length && urlList.length <= 10000);
assert.ok(urlList.every(u => new URL(u).origin === site && !/^\/(admin|staff|client|applicant|api|pay|sign)(\/|$)/.test(new URL(u).pathname)), 'Sitemap contains a private URL or another host');
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(site).host, key, keyLocation, urlList }),
  signal: AbortSignal.timeout(30000),
});
const result = { submittedAt: new Date().toISOString(), count: urlList.length, status: res.status, accepted: [200, 202].includes(res.status), body: (await res.text()).slice(0, 1000) };
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/indexnow-submission.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (!result.accepted) process.exitCode = 1;
