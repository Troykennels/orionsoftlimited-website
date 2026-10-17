// Read-only browser audit. Install Playwright or set PLAYWRIGHT_MODULE to its
// module URL. AUDIT_BASE_URL can point at a local production preview.
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.AUDIT_BASE_URL || 'https://www.orionsoftlimited.com';
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const paths = process.env.AUDIT_PATHS?.split(',') || [...new Set([
  ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname),
  '/staff', '/admin', '/client', '/applicant', '/audit-missing-page',
])];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
for (const width of (process.env.AUDIT_MOBILE === '1' ? [390] : [1440])) {
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    // Never submit forms, emails, analytics or operational records to production.
    await context.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    const page = await context.newPage();
    while (cursor < paths.length) {
      const path = paths[cursor++];
      const errors = [], failed = [];
      const onError = e => errors.push(e.message);
      const onResponse = r => { if (r.status() >= 400 && new URL(r.url()).origin === base) failed.push({ path: new URL(r.url()).pathname, status: r.status() }); };
      page.on('pageerror', onError); page.on('response', onResponse);
      try {
        const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction(portal => document.querySelector(portal ? '#root h1, #root form' : '#root main h1') && !document.querySelector('#seo-fallback'), /^\/(admin|staff|client|applicant)(\/|$)/.test(path), { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const dom = await page.evaluate(() => ({
          title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.href,
          robots: document.querySelector('meta[name="robots"]')?.content,
          description: document.querySelector('meta[name="description"]')?.content,
          h1: [...document.querySelectorAll('h1')].map(e => e.innerText),
          textLength: document.querySelector('#root')?.innerText.trim().length || 0,
          overflow: document.documentElement.scrollWidth > innerWidth + 2,
          badImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.getAttribute('src')),
          links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h.startsWith('/')),
        }));
        results.push({ path, width, status: response.status(), ...dom, errors, failed });
        console.log(JSON.stringify({ path, status: response.status(), textLength: dom.textLength, overflow: dom.overflow, errors, failed }));
      } catch (e) { results.push({ path, width, error: e.message, errors, failed }); }
      page.off('pageerror', onError); page.off('response', onResponse);
    }
    await context.close();
  }));
}
await browser.close();
mkdirSync('artifacts', { recursive: true });
writeFileSync(process.env.AUDIT_OUTPUT || 'artifacts/browser-audit.json', JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2));
console.log(`Audited ${results.length} pages.`);
