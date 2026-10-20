import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const app = express(), dist = fileURLToPath(new URL('../dist/', import.meta.url));
app.use(express.static(dist)); app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
const base = `http://127.0.0.1:${server.address().port}`, errors = [], results = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir('artifacts/custom-projects', { recursive: true });
try {
  for (const width of [1440, 1024, 820, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    let attempts = 0, payload;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base) return route.abort();
      if (url.pathname === '/api/contact') {
        payload = route.request().postDataJSON(); attempts++;
        return route.fulfill({ status: attempts === 1 ? 503 : 200, json: attempts === 1 ? { error: 'Synthetic connection interruption' } : { ok: true, ref: 'ORN-BRIEF42', confirmationEmailSent: width !== 390 } });
      }
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, content: {} } });
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/custom-software`);
    await page.getByRole('heading', { level: 1 }).filter({ hasText: 'Your business has its own way' }).waitFor();
    assert(await page.locator('a[href="/custom-software"]').count());
    if(width<=1240){
      await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
      await page.getByRole('dialog',{name:'Navigation menu'}).getByRole('button',{name:'Custom software',exact:true}).click();
    }else{
      const nav=page.getByRole('navigation',{name:'Main navigation'});
      await nav.getByRole('link',{name:'Custom software',exact:true}).waitFor();
      assert(await nav.getByRole('button',{name:'Get in touch',exact:true}).evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await page.getByRole('link', { name: 'Start your project', exact: true }).click();
    await page.locator('#project-brief').getByLabel('Full name').fill('Fixture Client'); await page.locator('#project-brief').getByLabel('Email address').fill('fixture@example.invalid');
    await page.locator('#project-brief').getByLabel('Phone / WhatsApp').fill('08000000000'); await page.locator('#project-brief').getByLabel('Organisation', { exact: false }).fill('Fixture Hospital');
    await page.locator('#project-brief').getByLabel('What would you like us to do?').selectOption('customise-product');
    await page.locator('#project-brief').getByLabel('Which product?').selectOption('CareCore AI');
    await page.locator('#project-brief').getByLabel('Project name or short description').fill('Ward reports');
    await page.locator('#project-brief').getByLabel('What should the software do?').fill('We need a customised set of ward reports and approval steps.');
    await page.getByRole('button', { name: 'Register project request', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Synthetic connection interruption' }).waitFor();
    assert.equal(await page.locator('#project-brief').getByLabel('Project name or short description').inputValue(), 'Ward reports');
    assert.equal(await page.getByText('Your project request is registered.', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Register project request', exact: true }).click();
    await page.getByRole('heading', { name: 'Your project request is registered.' }).waitFor();
    await page.getByText('ORN-BRIEF42', { exact: true }).waitFor();
    assert.equal(payload.product, 'CareCore AI'); assert.equal(payload.requestCategory, 'software_customisation'); assert.equal(payload.type, 'quote');
    await page.getByText(width === 390 ? 'Your request is saved. We could not send the confirmation email just now;' : 'Your confirmation email has been sent to', { exact: false }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await page.screenshot({ path: `artifacts/custom-projects/confirmation-${width}.png`, fullPage: true });
    results.push({ width, routeAndNavigation: true, productCustomisation: true, failedSubmissionRetainsBrief: true, confirmedReference: true, honestEmailState: true, noOverflow: true });
    await context.close();
  }
  assert.deepEqual(errors, []); console.log(JSON.stringify({ results, noRuntimeErrors: true }));
} finally { await writeFile('artifacts/custom-projects/browser-results.json', JSON.stringify(results, null, 2)); await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
