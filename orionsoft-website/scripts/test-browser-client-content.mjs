import assert from 'node:assert/strict';
import {readdir,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import express from 'express';
process.env.NODE_ENV='development';process.env.SESSION_SECRET='isolated-client-content-browser-fixture';
for(const key of Object.keys(process.env))if(/REDIS|UPSTASH|KV_REST|GMAIL|RESEND|SMTP|PAYSTACK|DATA_DIR|VAPID|TERMII/.test(key))delete process.env[key];
process.env.RENEWAL_DASHBOARD_API_KEY='fixture-connector-only';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const {putRecord}=await import('../api/_lib/records.js');
const {signSession,ADMIN_COOKIE}=await import('../api/_lib/auth.js');
const id='olm:11111111-1111-4111-8111-111111111111';
await putRecord('admins','browser-owner',{id:'browser-owner',role:'superadmin',status:'active',username:'Owner',email:'owner@example.invalid'});
await putRecord('admins','browser-manager',{id:'browser-manager',role:'client_content_manager',status:'active',username:'Content Manager',email:'manager@example.invalid',renewalAssignments:[id]});
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>String(url).includes('/billing/service/overview')?{ok:true,json:async()=>({customers:[{id,customer:'Assigned Hospital',product:'CareCore AI',amount:20000,billing_email:'saved@example.invalid',paid_through:'2026-11-18T22:59:59Z',renewal_url:'https://olm-console-production.up.railway.app/pay/fixture-renewal-link-123456789',recurring:{enabled:true,last4:'9988'}}]})}:String(url).includes('/renewal-overview')?{ok:true,json:async()=>({customers:[]})}:originalFetch(url,options);
const app=express();app.use(express.json());
for(const group of ['auth','admin'])for(const file of await readdir(new URL(`../api/${group}/`,import.meta.url))){if(file.endsWith('.js')){const {default:handler}=await import(`../api/${group}/${file}`);if(typeof handler==='function')app.all(`/api/${group}/${file.slice(0,-3)}`,handler);}}
const {default:content}=await import('../api/content.js');app.all('/api/content',content);
const dist=fileURLToPath(new URL('../dist/',import.meta.url));app.get('/admin',(req,res)=>res.sendFile(dist+'/admin.html'));app.use(express.static(dist));
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
await mkdir('artifacts/client-content-role',{recursive:true});
try{
 for(const width of [1440,820,390])for(const role of ['superadmin','client_content_manager']){
  const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'});
  await context.addCookies([{name:ADMIN_COOKIE,value:signSession({sub:role==='superadmin'?'browser-owner':'browser-manager',role:'admin',adminRole:role}),url:base}]);
  await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copiedRenewal=value;}}}));
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await context.route('**/api/admin/renewals',async route=>{if(route.request().method()==='POST')await new Promise(resolve=>setTimeout(resolve,700));await route.fallback();});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/admin',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(1200);
  async function navigate(name){if(width<=1000)await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.locator('.admin-sidebar').getByRole('button',{name,exact:true}).click();}
  if(role==='superadmin'){
   await navigate('Users & Roles');await page.getByRole('heading',{name:'Add Admin',exact:true}).waitFor();
   assert.equal(await page.getByRole('option',{name:'Client & Content Manager',exact:true}).count(),1);
   await navigate('Proposals & Renewals');await page.getByRole('button',{name:'Assign clients',exact:true}).click();await page.getByLabel('Manager account').selectOption('browser-manager');
   await page.getByLabel('Assigned to selected manager').waitFor();
   await page.getByRole('button',{name:/Save assigned clients/}).click();await page.getByText('Assigned clients updated. The access change takes effect immediately.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Assign clients',exact:true}).click();
   await page.locator('.renewal-tabs').getByRole('button',{name:'Needs attention',exact:true}).click();await page.getByRole('heading',{name:'No matching subscriptions',exact:true}).waitFor();
   await page.getByRole('button',{name:'All clients',exact:false}).click();
   await page.getByRole('heading',{name:'Assigned Hospital',exact:true}).waitFor();
   await page.screenshot({path:`artifacts/client-content-role/renewals-preview-${width}.png`,fullPage:true});
   await page.getByLabel('Search renewals').fill('missing client');await page.getByRole('heading',{name:'No matching subscriptions',exact:true}).waitFor();
   await page.getByRole('button',{name:'Clear filters',exact:true}).click();
   const copy=page.getByRole('button',{name:'Copy payment link',exact:true});await copy.click();await copy.getByText('Copied',{exact:true}).waitFor();
   const reminder=page.getByRole('button',{name:'Queue client reminder',exact:true});await reminder.click();await reminder.getByText(/^Queuing/).waitFor();assert(await reminder.isDisabled());
   await page.getByText(/Reminder queued for the saved client billing email\.|A reminder is already queued for this client today\./).first().waitFor();await reminder.getByText('Queued today',{exact:true}).waitFor();assert(await reminder.isDisabled());
   const refreshed=page.getByRole('button',{name:'Refresh status',exact:true});await refreshed.click();await page.getByText('Renewal status refreshed.',{exact:true}).waitFor();
   if(width===1440){const target=page.locator('.admin-sidebar [aria-current="page"]');assert.equal(await target.innerText(),'Proposals & Renewals');await page.getByLabel('Find admin section').fill('renewal');assert.equal(await page.locator('.admin-nav-item').count(),1);await page.getByLabel('Find admin section').fill('');}
   const launcher=page.locator('.admin-tools .or-office-launcher');assert.equal(await launcher.evaluate(node=>getComputedStyle(node).position),'static');

  }else{
   await page.getByRole('heading',{name:'Client renewals',exact:true}).waitFor();
   await page.getByRole('heading',{name:'Assigned Hospital',exact:true}).waitFor();
   const body=await page.locator('#root').innerText();
   for(const secret of ['20,000','20000','9988','Sales & Cash','Staff Office','Users & Roles','Payroll'])assert(!body.includes(secret),secret);
   assert.equal(await page.getByLabel('Manager account').count(),0);
   assert.equal(await page.getByRole('link',{name:'Open client renewal'}).count(),0);
   await page.getByRole('button',{name:'Queue client reminder',exact:true}).click();await page.getByText(/Reminder queued for the saved client billing email\.|A reminder is already queued for this client today\./).first().waitFor();
   const denied=await context.request.get(base+'/api/admin/payroll');assert.equal(denied.status(),403);
   await navigate('Blog');await page.waitForTimeout(250);
   await navigate('Newsletter');await page.getByText('Write a newsletter',{exact:true}).waitFor();
   await navigate('Social Media Content');await page.getByRole('heading',{name:'Social studio',exact:true}).waitFor();
   await page.getByLabel('Caption',{exact:true}).fill('Local fixture social draft.');await page.getByRole('button',{name:'Save content',exact:true}).click();await page.getByText('Content saved to the shared publication planner.',{exact:true}).waitFor();
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);
  await page.screenshot({path:`artifacts/client-content-role/${role}-${width}.png`,fullPage:true});results.push({role,width,passed:true,noRuntimeErrors:true,noOverflow:true});await context.close();
 }
 console.log(JSON.stringify(results));
}finally{await writeFile('artifacts/client-content-role/results.json',JSON.stringify(results,null,2));await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));globalThis.fetch=originalFetch;}
