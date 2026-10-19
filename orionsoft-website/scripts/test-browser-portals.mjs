// Exercises the production build against synthetic accounts on loopback only.
// No production credentials, database, mail transport or payments are used.
import assert from 'node:assert/strict';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
process.env.NODE_ENV = 'development';
process.env.SESSION_SECRET = 'orion-browser-isolated-session-secret';
for (const key of Object.keys(process.env)) if (/REDIS|UPSTASH|KV_REST|GMAIL|RESEND|SMTP|PAYSTACK|DATA_DIR|VAPID|TERMII/.test(key)) delete process.env[key];
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
await putRecord('applicants', 'browser-applicant', { id: 'browser-applicant', reference: 'AUDIT-001', fullName: 'Audit Applicant', email: 'applicant@example.invalid', roleAppliedFor: 'Software Engineer', status: 'interview', interview: {at:'2030-01-02T09:00:00Z',mode:'video',link:'https://example.invalid/interview'}, createdAt: now, updatedAt: now, messages: [], statusHistory: [{ status: 'applied', at: now }] });
await putRecord('contracts','browser-contract',{id:'browser-contract',number:'AUDIT-CTR-1',title:'Audit software project',client:{name:'Audit Client',email:'client@example.invalid'},status:'signed',amount:500,currency:'NGN',createdAt:now,schedule:[]});
await putRecord('invoices','browser-invoice',{id:'browser-invoice',invoiceNumber:'AUDIT-INV-1',clientEmail:'client@example.invalid',clientName:'Audit Client',status:'sent',currency:'NGN',issueDate:'2030-01-01',items:[]});
await putRecord('tickets','browser-ticket',{id:'browser-ticket',clientEmail:'client@example.invalid',subject:'Audit support conversation',description:'Audit fixture only',status:'open',createdAt:now,updatedAt:now,comments:[{author:'Support',text:'Public fixture reply',at:now},{author:'Internal',text:'Private fixture note',internal:true,at:now}]});
await putRecord('tasks','browser-task',{id:'browser-task',title:'Audit work item',assigneeId:'browser-staff',createdByEmployee:'browser-staff',status:'todo',priority:'medium',createdAt:now,dueDate:'2030-01-01'});
await putRecord('employees','browser-requester',{id:'browser-requester',fullName:'Audit Requester',status:'active',staffRole:'staff',managerId:'browser-staff'});
await putRecord('officeRequests','browser-request',{id:'browser-request',title:'Audit equipment request',reason:'Fixture equipment for delivery',category:'equipment',employeeId:'browser-requester',employeeName:'Audit Requester',status:'pending',dueDate:'2030-01-01',createdAt:now,history:[{status:'pending',at:now,by:'Audit Requester'}]});
await putRecord('clientProjects','browser-project',{id:'browser-project',title:'Audit delivery workspace',summary:'Client-facing fixture project',status:'active',clientEmail:'client@example.invalid',contractId:'browser-contract',contractNumber:'AUDIT-CTR-1',memberIds:['browser-staff'],dueDate:'2030-01-02',version:1,createdAt:now,updatedAt:now,updates:[],milestones:[{id:'browser-milestone',title:'Audit deliverable',description:'Please review the fixture deliverable.',status:'review',deliverableUrl:'https://example.invalid/delivery',dueDate:'2030-01-01',updatedAt:now,history:[]}]});
const app = express();
app.use(express.json({ limit: '5mb' }));
for (const group of ['auth', 'admin', 'staff', 'client', 'applicant', 'public', 'careers', 'contracts', 'payments', 'files']) {
  for (const file of await readdir(new URL(`../api/${group}/`, import.meta.url))) {
    if (!file.endsWith('.js')) continue;
    const { default: handler } = await import(`../api/${group}/${file}`);
    if (typeof handler === 'function') app.all(`/api/${group}/${file.slice(0, -3)}`, handler);
  }
}
for (const name of ['content', 'track', 'workspace']) { const { default: handler } = await import(`../api/${name}.js`); app.all(`/api/${name}`, handler); }
app.all('/api/{*path}', (req, res) => res.status(404).json({error:'Unknown fixture API route'}));
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
      const errors = [], failed = []; let expectedFault = false;
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400 && r.status() !== 401 && !(expectedFault && new URL(r.url()).pathname === `/api/${portal}/portal`)) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
      await page.goto(`${base}/${portal}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForFunction(() => document.querySelector('#root form, #root input'), null, { timeout: 20000 });
      assert.ok(await page.locator('#root').innerText(), `${portal} blank login`);
      const identities = {
        admin: [ADMIN_COOKIE, { sub: 'browser-admin', role: 'admin', adminRole: 'super_admin', name: 'Audit Admin' }],
        staff: ['orionsoft_session', { sub: 'browser-staff', role: 'staff', name: 'Audit Staff', staffRole: 'owner' }],
        client: ['orionsoft_client', { role: 'client', email: 'client@example.invalid', name: 'Audit Client' }],
        applicant: [APPLICANT_COOKIE, { role: 'applicant', email: 'applicant@example.invalid', emailVerified: true }],
      };
      const [name, payload] = identities[portal];
      await context.addCookies([{ name, value: signSession(payload), url: base }]);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(portal === 'admin' ? 2500 : 1200);
      if (portal === "staff") await page.getByLabel("Colour mode").selectOption(width === 1440 ? "light" : "dark");
      const content = await page.locator('#root').innerText();
      assert.ok(content.length > 100, `${portal} blank authenticated view`);
      assert.match(content, { admin: /Audit Admin/, staff: /Audit Staff/, client: /Payment plans & contracts/, applicant: /Software Engineer/ }[portal]);
      assert.ok(!content.includes('This section hit a problem'), `${portal} error boundary`);
      assert.equal(errors.length, 0, `${portal}: ${errors.join('; ')}`);
      assert.equal(failed.length, 0, `${portal}: ${failed.join('; ')}`);
      if (width === 1440 && ['client','applicant'].includes(portal)) {
        expectedFault = true; let injected = false;
        await page.route(`${base}/api/${portal}/portal`, route => {
          if (!injected) { injected = true; return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Temporary fixture outage"}'}); }
          return route.continue();
        });
        await page.reload({waitUntil:'domcontentloaded'});
        await page.getByText('Temporary fixture outage',{exact:true}).waitFor();
        await page.getByRole('button',{name:'Try again',exact:true}).click();
        await page.getByRole('button',{name:/Office guide/}).waitFor(); expectedFault = false;
      }
      await page.getByRole('button', { name: /Office guide/ }).click();
      const guide = page.getByRole('dialog'); await guide.waitFor();
      await guide.getByRole('heading', {name:'Find your next step'}).waitFor();
      if (portal === 'admin') {
        await guide.getByRole('button', {name:'Check office health'}).click();
        await guide.getByText(/Database:/).waitFor();
      }
      if (['admin','staff'].includes(portal)) {
        await guide.getByRole('searchbox').fill('Tasks');
        assert.ok(await guide.locator('.or-office-results button').count() > 0);
        const pin = guide.getByRole('button',{name:/^Pin .*Tasks/}).first();
        await pin.click(); assert.equal(await pin.getAttribute('aria-pressed'),'true');
      }
      await page.screenshot({path:`artifacts/${portal}-guide-${width}.png`});
      await page.keyboard.press('Escape'); await guide.waitFor({state:'hidden'});
      // Hub uses real fixture handlers and persisted records, including saves.
      await page.getByRole('button',{name:/^Office hub/}).click();
      const hub=page.getByRole('dialog');await hub.getByRole('heading',{name:'Your attention, in one place'}).waitFor();
      await hub.getByRole('searchbox',{name:'Search inbox'}).fill('no fixture item matches');
      await hub.getByText('No updates match these filters.').waitFor();
      await hub.getByRole('searchbox',{name:'Search inbox'}).fill('');
      if(width===1440) {
        const mark=hub.getByRole('button',{name:'Mark read',exact:true}).first();
        if(await mark.count()){await mark.click();await hub.getByText('Inbox updated.',{exact:true}).waitFor();}
        await hub.getByRole('button',{name:'Inbox preferences',exact:true}).click();
        const category=hub.getByRole('checkbox',{name:'Office updates',exact:true});
        await category.uncheck();await hub.getByText('Saved successfully.',{exact:true}).waitFor();
        await category.check();await hub.getByRole('button',{name:'Inbox preferences',exact:true}).click();
      }
      if(portal!=='applicant') {
        await hub.getByRole('button',{name:'Project workspace',exact:true}).click();
        await hub.getByRole('heading',{name:'Audit delivery workspace',exact:true}).waitFor();
        if(width===1440&&portal==='client') {
          await hub.getByLabel('Sign-off or change request note').fill('Accepted via browser fixture.');
          await hub.getByRole('button',{name:'Accept deliverable',exact:true}).click();
          await hub.getByText('Saved successfully.',{exact:true}).waitFor();
          await hub.locator('.ow-status-accepted').waitFor();
          await hub.getByLabel('Your feedback',{exact:true}).fill('Browser fixture feedback.');
          await hub.getByRole('button',{name:'Post feedback',exact:true}).click();
          await hub.locator('.ow-timeline').getByText('Browser fixture feedback.',{exact:true}).waitFor();
        }
        if(width===1440&&portal==='admin') {
          await hub.getByRole('button',{name:'New project',exact:true}).click();
          await hub.getByLabel('Project title',{exact:true}).fill('Browser-created draft');
          await hub.getByLabel('Issued client contract').selectOption('browser-contract');
          await hub.getByRole('button',{name:'Create draft project',exact:true}).click();
          await hub.getByRole('heading',{name:'Browser-created draft',exact:true}).waitFor();
        }
      }
      if(['staff','admin'].includes(portal)) {
        await hub.getByRole('button',{name:'Approval centre',exact:true}).click();
        if(width===1440&&portal==='admin') {
          const request=hub.locator('[data-workspace-id="browser-request"]');
          await request.getByLabel('Decision note',{exact:true}).fill('Approved via browser fixture.');
          await request.getByRole('button',{name:'Approve request',exact:true}).click();
          await request.waitFor({state:'hidden'});
          await hub.getByRole('button',{name:'Decision history',exact:true}).click();
          await hub.locator('[data-workspace-id="browser-request"] .ow-status-approved').waitFor();
        }
        if(width===1440&&portal==='staff') {
          await hub.getByRole('button',{name:'New request',exact:true}).click();
          await hub.getByLabel('Title',{exact:true}).fill('Browser staff request');
          await hub.getByLabel('Reason and expected outcome',{exact:true}).fill('Browser fixture operational request.');
          await hub.getByRole('button',{name:'Submit request',exact:true}).click();
          await hub.getByRole('heading',{name:'Browser staff request',exact:true}).waitFor();
          await hub.getByRole('button',{name:'My requests',exact:true}).click();
          await hub.getByRole('heading',{name:'Browser staff request',exact:true}).waitFor();
          assert.equal(await hub.getByRole('heading',{name:'Audit equipment request',exact:true}).count(),0);
        }
      }
      assert.equal(await hub.locator('[role="alert"]').count(),0,`${portal} hub error`);
      assert.equal(await hub.evaluate(el=>el.scrollWidth>el.clientWidth+2),false,`${portal} hub overflow`);
      await page.screenshot({path:`artifacts/${portal}-hub-${width}.png`});
      await page.keyboard.press('Escape');await hub.waitFor({state:'hidden'});
      assert.equal(await page.getByRole('button',{name:/^Office hub/}).evaluate(el=>el===document.activeElement),true);
      if (portal === 'client') {
        await page.getByRole('searchbox',{name:'Search client records'}).fill('audit-no-matching-record');
        await page.getByText(/No records match/).waitFor();
        await page.getByRole('button',{name:'Clear search'}).click();
        for (const id of ['contracts','invoices','receipts','support']) assert.equal(await page.locator(`#client-${id}`).count(),1);
      }
      if (portal === 'applicant') {
        await page.getByRole('heading',{name:'Your next step'}).waitFor();
        if (width === 1440) { await page.getByRole('button',{name:"I'll be there"}).click(); await page.getByText('You confirmed',{exact:true}).waitFor(); }
      }
      if (portal === 'client') { assert.ok((await page.locator('#root').innerText()).includes('Audit software project')); assert.ok(!(await page.locator('#root').innerText()).includes('Private fixture note')); }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
      results.push({ portal, width, textLength: content.length, overflow, errors, failed });
      await page.screenshot({ path: `artifacts/${portal}-${width}.png`, fullPage: true });
      console.log(JSON.stringify(results.at(-1)));
      if (!process.env.OFFICE_HUB_ONLY && width === 1440 && ['admin', 'staff'].includes(portal)) {
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
  await page.goto(`${base}/office`, {waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/One company/i}).waitFor();
  for (const portal of ['client','staff','applicant','admin']) assert.equal(await page.locator(`.or-office-portal a[href="/${portal}"]`).count(),1);
  await page.screenshot({path:'artifacts/office-directory-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/office-directory-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  console.log('Office directory, navigation metadata and missing-page noindex passed.');
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
