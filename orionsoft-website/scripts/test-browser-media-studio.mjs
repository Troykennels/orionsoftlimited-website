import assert from 'node:assert/strict';
import {readdir,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import express from 'express';
process.env.NODE_ENV='test';process.env.SESSION_SECRET='isolated-browser-media-studio-fixture';
for(const k of Object.keys(process.env))if(/REDIS|UPSTASH|KV_REST|DATA_DIR|GMAIL|RESEND|BREVO|SMTP|PAYSTACK|TERMII|VAPID/.test(k))delete process.env[k];
const root=await mkdtemp(path.join(os.tmpdir(),'orion-media-browser-'));process.env.DATA_DIR=root;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const {putRecord}=await import('../api/_lib/records.js');
const {signSession,ADMIN_COOKIE}=await import('../api/_lib/auth.js');
for(const role of ['superadmin','client_content_manager'])await putRecord('admins',role,{id:role,role,status:'active',username:role,email:'fixture@example.invalid'});
const app=express();app.use(express.json());
for(const group of ['auth','admin'])for(const file of await readdir(new URL(`../api/${group}/`,import.meta.url)))if(file.endsWith('.js')){const {default:h}=await import(`../api/${group}/${file}`);if(typeof h==='function')app.all(`/api/${group}/${file.slice(0,-3)}`,h);}
for(const route of ['public/media','public/media-upload','content']){const {default:h}=await import(`../api/${route}.js`);app.all('/api/'+route,h);}
app.use('/api',(req,res)=>res.json({ok:true,content:{}}));
const dist=fileURLToPath(new URL('../dist/',import.meta.url));app.get('/admin',(req,res)=>res.sendFile(dist+'/admin.html'));app.use(express.static(dist));app.get('/{*path}',(req,res)=>res.sendFile(dist+'/index.html'));
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));}),base=`http://127.0.0.1:${server.address().port}`;
const uploadServer=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));}),uploadBase=`http://127.0.0.1:${uploadServer.address().port}`;
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
await mkdir('artifacts/media-studio',{recursive:true});
try{
 for(const width of [1440,820,390]){
  const role=width===820?'client_content_manager':'superadmin',context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  await context.addCookies([{name:ADMIN_COOKIE,value:signSession({sub:role,role:'admin'}),url:base}]);
  await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copiedStudio=value;}}}));
  await context.route('**/*',route=>[base,uploadBase].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  await context.route('**/api/admin/media-ticket',async route=>{const r=await route.fetch(),j=await r.json();if(j.token)j.url=uploadBase+'/api/public/media-upload';await route.fulfill({response:r,json:j});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'/admin',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(700);
  async function navigate(name){if(width<=1000)await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.locator('.admin-sidebar').getByRole('button',{name,exact:true}).click();}
  await navigate('Media Library');await page.getByRole('heading',{name:'Media library',exact:true}).waitFor();
  if(width===1440){await page.getByLabel('Upload marketing media').setInputFiles('C:/Users/user/Desktop/demo videos/SchoolCore in 2 minutes - START HERE.mp4');await page.getByText('Video and an automatically generated cover image are saved.',{exact:true}).waitFor({timeout:60000});assert(await page.locator('.media-card').count()>=2);}
  await navigate('Blog');await page.getByRole('heading',{name:'Stories worth sharing.',exact:true}).waitFor();await page.getByRole('button',{name:'Use SchoolCore template',exact:true}).click();await page.getByLabel('Article title',{exact:true}).fill(`SchoolCore browser fixture ${width}`);await page.getByRole('button',{name:'Preview article',exact:true}).click();await page.locator('.article-preview video').waitFor();assert.equal(await page.locator('.article-preview h1').textContent(),`SchoolCore browser fixture ${width}`);await page.getByRole('button',{name:'Back to editing',exact:true}).click();
  // A failed save keeps the complete article in place for retry.
  let interrupted=false;await context.route('**/api/admin/blog',async route=>{if(!interrupted&&route.request().method()==='POST'){interrupted=true;return route.fulfill({status:503,json:{error:'Fixture connection interruption'}});}return route.fallback();});
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('alert').filter({hasText:'Fixture connection interruption'}).waitFor();assert.equal(await page.getByLabel('Article title',{exact:true}).inputValue(),`SchoolCore browser fixture ${width}`);await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Draft safely saved to the shared Blog library.',{exact:true}).waitFor();
  await page.screenshot({path:`artifacts/media-studio/blog-${width}.png`,fullPage:true});
  await navigate('Social Media Content');await page.getByRole('heading',{name:'One story. Every channel.',exact:true}).waitFor();await page.getByRole('button',{name:'SchoolCore starter',exact:true}).click();await page.getByLabel('Campaign name',{exact:true}).fill(`SchoolCore launch ${width}`);await page.getByRole('button',{name:'Choose or upload media',exact:true}).click();await page.getByLabel('Search media').fill('START HERE');await page.getByLabel('Media type').selectOption('video');await page.getByRole('button',{name:'Use file',exact:true}).first().click();await page.getByRole('button',{name:'Prepare six channel drafts',exact:true}).click();await page.getByText('6 platform drafts saved with matching media and tracking links. Open each to review and publish.',{exact:true}).waitFor();assert.equal(await page.locator('.studio-queue-card').count(),6);await page.screenshot({path:`artifacts/media-studio/queue-${width}.png`,fullPage:true});await page.getByRole('button',{name:'Review & publish',exact:true}).first().click();await page.locator('.studio-post-preview video').waitFor();await page.getByRole('button',{name:'Copy caption',exact:true}).click();assert((await page.evaluate(()=>window.__copiedStudio)).includes('SchoolCore'));await page.getByLabel('Team status').selectOption('ready');await page.getByRole('button',{name:'Save post',exact:true}).click();await page.getByText('Post saved. Planned times remind your team; publish through the social platform.',{exact:true}).waitFor();
  const feedback=page.locator('.studio-save-feedback');await feedback.getByText('Saved — YouTube: Ready to publish.',{exact:true}).waitFor();
  await page.getByLabel('Team status').selectOption('published');await page.getByLabel('Actual published post link').fill('https://www.youtube.com/watch?v=fixture-saved-post');
  let failSave=true;await context.route('**/api/admin/social-content',route=>{if(failSave&&route.request().method()==='PATCH'){failSave=false;return route.fulfill({status:503,json:{error:'Fixture save interruption'}});}return route.fallback();});
  await page.getByRole('button',{name:'Save post',exact:true}).click();await feedback.getByText('Fixture save interruption',{exact:true}).waitFor();assert.equal(await page.getByLabel('Actual published post link').inputValue(),'https://www.youtube.com/watch?v=fixture-saved-post');
  await page.getByRole('button',{name:'Save post',exact:true}).click();await feedback.getByText('Saved — YouTube: Published. Live post link recorded.',{exact:true}).waitFor();assert.equal(await feedback.getByRole('link',{name:'Open recorded live post'}).getAttribute('href'),'https://www.youtube.com/watch?v=fixture-saved-post');
  await page.waitForTimeout(450);const box=await feedback.boundingBox();assert(box&&box.y>=0&&box.y+box.height<=1002,'Save feedback must remain in the visible viewport.');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,`Overflow at ${width}`);assert.deepEqual(errors,[]);await page.screenshot({path:`artifacts/media-studio/editor-${width}.png`,fullPage:true});results.push({width,role,passed:true,noRuntimeErrors:true,noOverflow:true});await context.close();
 }
 console.log(JSON.stringify(results));
}finally{await writeFile('artifacts/media-studio/results.json',JSON.stringify(results,null,2));await browser.close();for(const s of [server,uploadServer]){s.closeAllConnections();await new Promise(r=>s.close(r));}assert(root.startsWith(path.join(os.tmpdir(),'orion-media-browser-')));await rm(root,{recursive:true,force:true});}
