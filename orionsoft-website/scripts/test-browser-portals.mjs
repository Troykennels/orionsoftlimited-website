// Exercises the production build against synthetic accounts on loopback only.
// No production credentials, database, mail transport or payments are used.
import assert from 'node:assert/strict';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
process.env.NODE_ENV = 'development';
process.env.SESSION_SECRET = 'orion-browser-isolated-session-secret';
for (const key of Object.keys(process.env)) if (/REDIS|KV_REST|GMAIL|RESEND|PAYSTACK|DATA_DIR|VAPID/.test(key)) delete process.env[key];
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { storeBackend } = await import('../api/store.js');
assert.equal(storeBackend(), 'mem');
const { putRecord, setLookup } = await import('../api/_lib/records.js');
const { signSession, hashPassword, ADMIN_COOKIE, APPLICANT_COOKIE } = await import('../api/_lib/auth.js');
const now = new Date().toISOString();
const password = 'local-audit-only-4829';
await putRecord('admins', 'browser-admin', { id: 'browser-admin', username: 'Audit Admin', email: 'admin@example.invalid', status: 'active', role: 'super_admin', passwordHash: await hashPassword(password) });
await setLookup('admins', 'email', 'admin@example.invalid', 'browser-admin');
await putRecord('employees', 'browser-staff', { id: 'browser-staff', fullName: 'Audit Staff', email: 'staff@example.invalid', status: 'active', staffRole: 'owner', department: 'Engineering', title: 'Engineer', slug: 'audit-staff', startDate: '2026-01-01', createdAt: now, passwordHash: await hashPassword(password) });
await setLookup('employees', 'email', 'staff@example.invalid', 'browser-staff');
await setLookup('employees', 'admin', 'browser-admin', 'browser-staff');
await putRecord('applicants', 'browser-applicant', { id: 'browser-applicant', reference: 'AUDIT-001', fullName: 'Audit Applicant', email: 'applicant@example.invalid', roleAppliedFor: 'Software Engineer', status: 'reviewing', createdAt: now, updatedAt: now, messages: [], statusHistory: [{ status: 'applied', at: now }] });
const app = express();
app.use(express.json({ limit: '5mb' }));
for (const group of ['auth', 'admin', 'staff', 'client', 'applicant']) {
  for (const file of await readdir(new URL(`../api/${group}/`, import.meta.url))) {
    if (!file.endsWith('.js')) continue;
    const { default: handler } = await import(`../api/${group}/${file}`);
    if (typeof handler === 'function') app.all(`/api/${group}/${file.slice(0, -3)}`, handler);
  }
}
for (const name of ['content', 'track']) { const { default: handler } = await import(`../api/${name}.js`); app.all(`/api/${name}`, handler); }
app.all('/api/{*path}', (req, res) => res.json({ ok: true }));
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
for (const name of ['admin', 'staff', 'client', 'applicant']) app.get([`/${name}`, `/${name}/{*path}`], (req, res) => res.sendFile(`${dist}/${name}.html`));
app.use(express.static(dist));
app.get('/{*path}', (req, res) => res.sendFile(`${dist}/index.html`));
app.use((err, req, res, next) => { console.error(req.path, err.message); if (!res.headersSent) res.status(500).json({ error: err.message }); });
const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
await mkdir('artifacts', { recursive: true });
try {
  for (const width of [1440, 390]) {
    for (const portal of ['admin', 'staff', 'client', 'applicant']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [], failed = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 500) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
      await page.goto(`${base}/${portal}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForFunction(() => document.querySelector('#root form, #root input'), null, { timeout: 20000 });
      assert.ok(await page.locator('#root').innerText(), `${portal} blank login`);
      const identities = {
        admin: [ADMIN_COOKIE, { sub: 'browser-admin', role: 'admin', adminRole: 'super_admin', name: 'Audit Admin' }],
        staff: ['orionsoft_session', { sub: 'browser-staff', role: 'staff', name: 'Audit Staff', staffRole: 'owner' }],
        client: ['orionsoft_client', { role: 'client', email: 'client@example.invalid', name: 'Audit Client' }],
        applicant: [APPLICANT_COOKIE, { role: 'applicant', email: 'applicant@example.invalid' }],
      };
      const [name, payload] = identities[portal];
      await context.addCookies([{ name, value: signSession(payload), url: base }]);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(portal === 'admin' ? 2500 : 1200);
      const content = await page.locator('#root').innerText();
      assert.ok(content.length > 100, `${portal} blank authenticated view`);
      assert.match(content, { admin: /Audit Admin/, staff: /Audit Staff/, client: /Payment plans & contracts/, applicant: /Software Engineer/ }[portal]);
      assert.ok(!content.includes('This section hit a problem'), `${portal} error boundary`);
      assert.equal(errors.length, 0, `${portal}: ${errors.join('; ')}`);
      assert.equal(failed.length, 0, `${portal}: ${failed.join('; ')}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
      results.push({ portal, width, textLength: content.length, overflow, errors, failed });
      await page.screenshot({ path: `artifacts/${portal}-${width}.png`, fullPage: true });
      console.log(JSON.stringify(results.at(-1)));
      if (width === 1440 && ['admin', 'staff'].includes(portal)) {
        const selector = portal === 'admin' ? 'aside button' : 'nav[aria-label="Staff Office"] button.so-nav-item';
        const labels = (await page.locator(selector).allTextContents()).map(s => s.trim()).filter(s => s && !/^sign\s*out$/i.test(s));
        for (const label of labels) {
          const startErrors = errors.length, startFailed = failed.length;
          await page.locator(selector).filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
          await page.waitForTimeout(800);
          const text = await page.locator('#root').innerText();
          const problem = text.includes('This section hit a problem');
          const result = { portal, section: label, width, errorBoundary: problem, errors: errors.slice(startErrors), failed: failed.slice(startFailed) };
          results.push(result); console.log(JSON.stringify(result));
        }
      }
      await context.close();
    }
  }
  // Verify client-side navigation updates the canonical and description.
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Products', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('link[rel="canonical"]')?.href.endsWith('/products'));
  assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), JSON.parse(await (await page.request.get(`${base}/seo-pages.json`)).text())['/products'].description);
  await page.goto(`${base}/audit-missing-page`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.includes('noindex'));
  console.log('Navigation metadata and missing-page noindex passed.');
  assert.ok(results.every(r => !r.errorBoundary && !r.errors.length && !r.failed.length), 'A portal section failed; inspect artifacts/local-portals.json');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/local-portals.json', JSON.stringify(results, null, 2));
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
