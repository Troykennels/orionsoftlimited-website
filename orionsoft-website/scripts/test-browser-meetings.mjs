// Exercises the production build against synthetic accounts on loopback only.
// No production credentials, database, mail transport or payments are used.
import assert from 'node:assert/strict';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
process.env.NODE_ENV = 'development';
process.env.SESSION_SECRET = 'orion-browser-isolated-session-secret';
for (const key of Object.keys(process.env)) if (/REDIS|UPSTASH|KV_REST|BREVO|GMAIL|RESEND|SMTP|PAYSTACK|DATA_DIR|VAPID|TERMII|CALL_/.test(key)) delete process.env[key];
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { storeBackend } = await import('../api/store.js');
assert.equal(storeBackend(), 'mem');
const { putRecord, setLookup } = await import('../api/_lib/records.js');
const { signSession, hashPassword, ADMIN_COOKIE, APPLICANT_COOKIE } = await import('../api/_lib/auth.js');
const now = new Date().toISOString();
const password = 'local-audit-only-4829';
await putRecord('admins', 'browser-admin', { id: 'browser-admin', username: 'Audit Admin', email: 'admin@example.invalid', status: 'active', role: 'superadmin', passwordHash: await hashPassword(password) });
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

await putRecord('employees','call-guest',{id:'call-guest',fullName:'Video Guest',status:'active',staffRole:'staff',email:'guest@example.invalid',slug:'video-guest'});
await putRecord('employees','voice-guest',{id:'voice-guest',fullName:'Voice Guest',status:'active',staffRole:'staff',email:'voice@example.invalid',slug:'voice-guest'});
await putRecord('meetings','browser-meeting',{id:'browser-meeting',title:'Browser video acceptance',roomMode:'internal',link:'',hostId:'browser-staff',attendeeIds:['call-guest','voice-guest'],status:'scheduled',startsAt:now,durationMin:60,notes:'',actionItems:[]});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--auto-select-desktop-capture-source=Entire screen']});
const results=[];const contexts=[];const pages=[];const errors=[];
await mkdir('artifacts/staff-meetings',{recursive:true});
try {

  for(const id of ['browser-staff','call-guest','voice-guest']){
    const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['camera','microphone'],serviceWorkers:'block',acceptDownloads:true});contexts.push(context);
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await context.addCookies([{name:'orionsoft_session',value:signSession({role:'staff',sub:id}),url:base}]);
    await context.addInitScript(()=>{const Native=window.RTCPeerConnection;window.__peers=[];window.RTCPeerConnection=class extends Native{constructor(...args){super(...args);window.__peers.push(this);}};});
    const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));pages.push(page);
    await page.goto(base+'/staff/meetings/join-browser-meeting');
    await page.getByRole('heading',{name:'Orion Meet',exact:true}).waitFor();
    await page.getByLabel('Colour mode').selectOption('light');
    await page.getByText('I agree that the host may record this call.',{exact:false}).click();
    if(id==='voice-guest')await page.getByText('Use camera (untick for voice only)',{exact:false}).click();
    await page.getByRole('button',{name:id==='voice-guest'?'Join voice call':'Join video call',exact:true}).click();
    await page.getByRole('button',{name:'Mute',exact:true}).waitFor({timeout:20000});
  }
  const [host,guest,voice]=pages;
  console.log('All three joined; checking media');
  await host.getByText('3 participant(s).',{exact:false}).waitFor({timeout:30000});
  // Actual decoded remote video frames prove WebRTC media crossed contexts.
  await host.waitForFunction(()=>[...document.querySelectorAll('.so-call-tile video')].some(v=>v.dataset.callName==='Video Guest'&&v.videoWidth>0),null,{timeout:45000});
  await guest.waitForFunction(()=>[...document.querySelectorAll('.so-call-tile video')].some(v=>v.dataset.callName==='Audit Staff'&&v.videoWidth>0),null,{timeout:45000});
  assert.equal(await voice.locator('.so-call-tile').count(),3);
  await host.waitForFunction(()=>[...document.querySelectorAll('.so-call-tile video')].some(v=>v.dataset.callName==='Voice Guest'&&v.readyState>=2&&v.currentTime>0),null,{timeout:20000});
  await host.getByRole('button',{name:'Mute',exact:true}).click();await host.getByRole('button',{name:'Unmute',exact:true}).click();
  await guest.getByRole('button',{name:'Camera off',exact:true}).click();await guest.getByRole('button',{name:'Camera on',exact:true}).click();
  await host.getByRole('button',{name:'Share screen',exact:true}).click();
  await host.getByRole('button',{name:'Stop sharing',exact:true}).waitFor({timeout:15000});
  await host.getByRole('button',{name:'Stop sharing',exact:true}).click();
  await host.getByRole('button',{name:'Record',exact:true}).click();
  await guest.getByText('Recording is active.',{exact:false}).waitFor({timeout:10000});
  await host.waitForTimeout(2500);await host.getByRole('button',{name:'Stop recording',exact:true}).click();
  const link=host.getByRole('link',{name:'Download meeting recording'});await link.waitFor();
  const downloadEvent=host.waitForEvent('download');await link.click();const download=await downloadEvent;await download.saveAs('artifacts/staff-meetings/recording.webm');
  const {stat}=await import('node:fs/promises');assert((await stat('artifacts/staff-meetings/recording.webm')).size>1000);
  await host.screenshot({path:'artifacts/staff-meetings/light-video-room.png',fullPage:true});
  await host.getByLabel('Colour mode').selectOption('dark');await host.screenshot({path:'artifacts/staff-meetings/dark-video-room.png',fullPage:true});
  // Browser can stop camera capture and still run a voice-only call.
  await voice.getByRole('main').getByRole('button',{name:'Leave',exact:true}).click();await host.getByText('2 participant(s).',{exact:false}).waitFor({timeout:10000});
  host.once('dialog',d=>d.accept());await host.getByRole('button',{name:'End for everyone',exact:true}).click();
  await guest.getByRole('button',{name:'Join video call',exact:true}).waitFor({timeout:10000});
  await host.getByLabel('Colour mode').selectOption('light');await host.reload();await host.getByLabel('Colour mode').waitFor();assert.equal(await host.getByLabel('Colour mode').inputValue(),'light');
  await host.setViewportSize({width:390,height:900});await host.screenshot({path:'artifacts/staff-meetings/light-mobile.png',fullPage:true});assert(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  assert.deepEqual(errors,[]);
  results.push({actualVideoFramesBothDirections:true,threeParticipants:true,voiceOnlyJoin:true,voiceAudioPlayback:true,screenShareControl:true,muteAndCameraControls:true,recordingNoticeRemote:true,recordingFileVerified:true,hostEndRemote:true,lightPersists:true,mobileNoOverflow:true,noRuntimeErrors:true});
  console.log(JSON.stringify(results));
 }catch(e){for(let i=0;i<pages.length;i++){try{console.log(JSON.stringify({page:i,alerts:await pages[i].getByRole('alert').allTextContents(),peers:await pages[i].evaluate(()=>window.__peers.map(p=>({connection:p.connectionState,ice:p.iceConnectionState,signaling:p.signalingState,local:p.localDescription?.type,remote:p.remoteDescription?.type}))),videos:await pages[i].locator('video').evaluateAll(vs=>vs.map(v=>({name:v.dataset.callName,width:v.videoWidth,ready:v.readyState,tracks:v.srcObject?.getTracks().map(t=>({kind:t.kind,ready:t.readyState,muted:t.muted}))})))}));await pages[i].screenshot({path:`artifacts/staff-meetings/failure-${i}.png`});}catch{}}throw e;
}finally{await writeFile('artifacts/staff-meetings/results.json',JSON.stringify(results,null,2));await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
