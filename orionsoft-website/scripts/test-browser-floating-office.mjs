import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'isolated-floating-office-browser';
for (const key of Object.keys(process.env)) if (/REDIS|UPSTASH|KV_REST|DATA_DIR|GMAIL|RESEND|SMTP|PAYSTACK|VAPID|TERMII|BREVO/.test(key)) delete process.env[key];
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { storeBackend } = await import('../api/store.js');
assert.equal(storeBackend(), 'mem');
const { putRecord } = await import('../api/_lib/records.js');
const { signSession } = await import('../api/_lib/auth.js');
const app = express();
app.use(express.json());
for (const group of ['auth','staff']) for (const file of await readdir(new URL(`../api/${group}/`, import.meta.url))) {
  if (!file.endsWith('.js')) continue;
  const { default: handler } = await import(`../api/${group}/${file}`);
  if (typeof handler === 'function') app.all(`/api/${group}/${file.slice(0,-3)}`, handler);
}
app.all('/api/workspace', (req,res) => res.status(503).json({error:'Isolated fixture: hub opened successfully'}));
app.all('/api/{*path}', (req,res) => res.json({}));
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
app.get(['/staff','/staff/{*path}'],(req,res)=>res.sendFile(`${dist}/staff.html`));
app.use(express.static(dist));
const server = await new Promise(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  await putRecord('employees','floating-test',{id:'floating-test',fullName:'Floating fixture',email:'fixture@example.invalid',status:'active',staffRole:'owner'});
  for (const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:900},hasTouch:true,serviceWorkers:'block'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await context.addCookies([{name:'orionsoft_session',value:signSession({role:'staff',sub:'floating-test'}),url:base}]);
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/staff/visits`);
    const dock=page.locator('.or-office-floating'), handle=page.getByRole('button',{name:'Move office tools'});
    await handle.waitFor();
    const before=await dock.boundingBox(), grip=await handle.boundingBox();
    await page.mouse.move(grip.x+14,grip.y+16);await page.mouse.down();await page.mouse.move(40,200,{steps:8});await page.mouse.up();
    const moved=await dock.boundingBox();assert.ok(Math.abs(moved.y-before.y)>100);
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.reload();await handle.waitFor();
    const restored=await dock.boundingBox();assert.ok(Math.abs(restored.y-moved.y)<2);
    await page.getByRole('button',{name:'Office guide'}).click();
    const guide=page.locator('.or-office-dialog');assert.ok(await guide.isVisible());
    const bounds=await guide.boundingBox();assert.ok(Math.abs(bounds.x+bounds.width/2-width/2)<3);
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Office hub',exact:true}).click();
    await page.locator('.ow-dialog[open]').waitFor();await page.keyboard.press('Escape');
    await handle.focus();await page.keyboard.press('ArrowDown');
    assert.ok((await dock.boundingBox()).y>restored.y);
    const session=await context.newCDPSession(page), touch=await handle.boundingBox(), touchDock=await dock.boundingBox();
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x+14,y:touch.y+16}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:20,y:300}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(100);
    assert.ok(Math.abs((await dock.boundingBox()).y-(300-touch.y-16+touchDock.y))<3);
    await page.setViewportSize({width:320,height:480});
    await page.waitForTimeout(100);
    const small=await dock.boundingBox();assert.ok(small.x>=0&&small.y>=0&&small.x+small.width<=320&&small.y+small.height<=480);
    await handle.focus();await page.keyboard.press('Home');
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px: mouse, touch, refresh, keyboard, bounds and both dialogs`);
    await context.close();
  }
} finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
