import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const dist = new URL('../dist/', import.meta.url);
const read = file => readFileSync(new URL(file, dist), 'utf8');
for (const name of ['staff', 'admin', 'client', 'applicant']) {
  const html = read(`${name}.html`);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /src="\/src\//, `${name} uses source instead of compiled code`);
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)];
  assert.ok(scripts.length, `${name} has no app entry point`);
  for (const [, src] of scripts) assert.ok(existsSync(new URL(src.slice(1), dist)), `${name}: missing ${src}`);
}
const metadata = JSON.parse(read('seo-pages.json'));
for (const [path, data] of Object.entries(metadata)) {
  const html = read(path === '/' ? 'index.html' : `${path.slice(1)}/index.html`);
  assert.ok(data.title && data.description, `Missing SEO text: ${path}`);
  assert.ok(html.includes(`rel="canonical" href="https://www.orionsoftlimited.com${path}"`), `Bad canonical: ${path}`);
  assert.doesNotMatch(html, /name="robots" content="noindex/);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(json);
}
console.log(`Verified 4 compiled portal shells and ${Object.keys(metadata).length} public pages.`);
