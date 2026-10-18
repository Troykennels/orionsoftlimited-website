import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'orion-office-disposable-fixture-secret';
for (const key of Object.keys(process.env)) if (/REDIS|UPSTASH|KV_REST|DATA_DIR|GMAIL|RESEND|SMTP|PAYSTACK|VAPID|TERMII/.test(key)) delete process.env[key];
const store = await import('../api/store.js');
assert.equal(store.storeBackend(), 'mem');
const { putRecord, getRecord } = await import('../api/_lib/records.js');
const { signSession, ADMIN_COOKIE, APPLICANT_COOKIE } = await import('../api/_lib/auth.js');
const { runOnce } = await import('../api/_lib/scheduledJobs.js');
function response() { return { statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},end(){return this;} }; }
function request(method,body={},cookie='',url=''){return {method,body,headers:{cookie},query:{},url,socket:{remoteAddress:'127.0.0.1'}};}
const cookie=(name,payload)=>`${name}=${encodeURIComponent(signSession(payload))}`;
const adminCookie=cookie(ADMIN_COOKIE,{sub:'office-owner',role:'admin',adminRole:'super_admin'});
await putRecord('admins','office-owner',{id:'office-owner',username:'Audit Owner',role:'super_admin',status:'active'});
async function call(handler,method,body,signed,url){const res=response();await handler(request(method,body,signed,url),res);return res;}

test('failed automation remains retryable and only success sets completion', async()=>{
 let count=0;const key='audit:job:retry';
 await assert.rejects(runOnce(key,async()=>{count++;throw Error('fixture failure');}));
 assert.equal(await store.get(key),null);
 assert.equal((await getRecord('automationRuns',key)).status,'failed');
 assert.equal(await runOnce(key,async()=>{count++;}),true);
 assert.equal(await runOnce(key,async()=>{count++;}),false);assert.equal(count,2);
 assert.equal((await getRecord('automationRuns',key)).status,'success');
});
test('concurrent scheduler workers run one copy of a job',async()=>{
 let count=0;const results=await Promise.all(Array.from({length:8},()=>runOnce('audit:job:concurrent',async()=>{count++;await new Promise(r=>setTimeout(r,20));})));
 assert.equal(count,1);assert.equal(results.filter(Boolean).length,1);
});
test('a stale lease owner cannot release a newer worker lock',async()=>{
 assert.equal(await store.acquireLease('audit:lease','one',.005),true);
 await new Promise(r=>setTimeout(r,15));assert.equal(await store.acquireLease('audit:lease','two',60),true);
 await store.releaseLease('audit:lease','one');assert.equal(await store.acquireLease('audit:lease','three',60),false);
 await store.releaseLease('audit:lease','two');assert.equal(await store.acquireLease('audit:lease','three',60),true);
});
test('automation health is admin-only, respects live roles and hides secrets',async()=>{
 const {default:handler}=await import('../api/admin/office-health.js');
 assert.equal((await call(handler,'GET',{},'', '/api/admin/office-health')).statusCode,401);
 await putRecord('admins','office-editor',{id:'office-editor',username:'Editor',role:'editor',status:'active'});
 const editor=cookie(ADMIN_COOKIE,{sub:'office-editor',role:'admin',adminRole:'super_admin'});
 assert.equal((await call(handler,'GET',{},editor,'/api/admin/office-health')).statusCode,403);
 const res=await call(handler,'GET',{},adminCookie,'/api/admin/office-health');assert.equal(res.statusCode,200);assert.equal(res.body.database.status,'temporary');
 assert.ok(res.body.jobs.length>=2);assert.equal(typeof res.body.services.email,'boolean');
 assert.ok(!JSON.stringify(res.body).includes(process.env.SESSION_SECRET));assert.equal(res.headers['Cache-Control'],'private, no-store');
});
test('client support lifecycle connects admin replies, private notes and reopening',async()=>{
 const {default:client}=await import('../api/client/portal.js');const {default:admin}=await import('../api/admin/tickets.js');
 const signed=cookie('orionsoft_client',{role:'client',email:'office-client@example.invalid',name:'Audit Client'});
 let r=await call(client,'POST',{action:'ticket',subject:'Audit support',message:'Fixture only'},signed);assert.equal(r.statusCode,200);assert.equal(r.body.emailSent,false);const id=r.body.id;
 assert.equal((await call(admin,'PATCH',{id,action:'add_comment',text:'Private note',internal:true},adminCookie,'/api/admin/tickets')).statusCode,200);
 assert.equal((await call(admin,'PATCH',{id,action:'add_comment',text:'Public answer'},adminCookie,'/api/admin/tickets')).statusCode,200);
 r=await call(client,'GET',{},signed);let ticket=r.body.tickets.find(t=>t.id===id);assert.deepEqual(ticket.comments.map(c=>c.text),['Public answer']);
 const stored=await getRecord('tickets',id);stored.status='resolved';await putRecord('tickets',id,stored);
 r=await call(client,'POST',{action:'reply',id,message:'Please reopen'},signed);assert.equal(r.statusCode,200);assert.equal((await getRecord('tickets',id)).status,'open');
 const other=cookie('orionsoft_client',{role:'client',email:'other@example.invalid'});
 assert.equal((await call(client,'POST',{action:'reply',id,message:'Not mine'},other)).statusCode,404);
});
test('candidate can update details, answer interview and withdraw without exposing private notes',async()=>{
 const {default:handler}=await import('../api/applicant/portal.js');const id='office-applicant';
 await putRecord('applicants',id,{id,email:'office-applicant@example.invalid',reference:'ORN-OFFICE',fullName:'Audit Candidate',roleAppliedFor:'Engineer',status:'interview',createdAt:'2026-01-01',interview:{at:'2030-01-02T09:00:00Z'},messages:[{id:'private',internal:true,text:'Private'}]});
 const signed=cookie(APPLICANT_COOKIE,{role:'applicant',email:'office-applicant@example.invalid',emailVerified:true});
 let r=await call(handler,'PATCH',{applicationId:id,phone:'fixture',cvLink:'javascript:alert(1)'},signed);assert.equal(r.statusCode,200);assert.equal(r.body.application.cvLink,'');
 r=await call(handler,'POST',{applicationId:id,action:'interview-response',response:'accept'},signed);assert.equal(r.statusCode,200);assert.equal(r.body.application.interview.candidateResponse,'accepted');
 assert.equal((await call(handler,'POST',{applicationId:id,action:'interview-response',response:'accept'},signed)).statusCode,409);
 r=await call(handler,'POST',{applicationId:id,action:'withdraw',reason:'Fixture'},signed);assert.equal(r.statusCode,200);assert.equal(r.body.application.status,'withdrawn');assert.ok(r.body.application.messages.every(m=>m.id!=='private'));
 assert.equal((await call(handler,'POST',{applicationId:id,action:'message',text:'Closed'},signed)).statusCode,400);
 assert.equal((await call(handler,'POST',{applicationId:id,action:'interview-response',response:'reschedule'},signed)).statusCode,400);
});
test('staff can create, comment on and complete a personal task',async()=>{
 const {default:handler}=await import('../api/staff/tasks.js');
 await putRecord('employees','office-staff',{id:'office-staff',fullName:'Audit Staff',status:'active',staffRole:'staff'});
 const signed=cookie('orionsoft_session',{role:'staff',sub:'office-staff'});
 let r=await call(handler,'POST',{title:'Audit task'},signed);assert.equal(r.statusCode,200);const id=r.body.task.id;
 r=await call(handler,'POST',{action:'comment',id,text:'Audit progress'},signed);assert.equal(r.statusCode,200);
 r=await call(handler,'PATCH',{id,status:'done'},signed);assert.equal(r.statusCode,200);assert.equal((await getRecord('tasks',id)).status,'done');
});

test('new application and reference login cannot unlock older applications for an unverified email',async()=>{
 const {default:apply}=await import('../api/careers/apply.js');const {default:portal}=await import('../api/applicant/portal.js');
 const email='apply-scope@example.invalid';
 await putRecord('applicants','previous-private-app',{id:'previous-private-app',email,reference:'ORN-PRIVATE',createdAt:'2020-01-01',status:'reviewing',messages:[]});
 const r=await call(apply,'POST',{fullName:'New application fixture',email,role:'Engineer',cvLink:'javascript:alert(1)',portfolio:'https://example.invalid/portfolio'});
 assert.equal(r.statusCode,200);assert.match(r.body.reference,/^ORN-/);assert.equal((await getRecord('applicants',r.body.applicantId)).cvLink,'');
 const limited=r.headers['Set-Cookie'].split(';')[0];
 let view=await call(portal,'GET',{},limited);assert.equal(view.body.applications.length,1);assert.equal(view.body.applications[0].id,r.body.applicantId);
 const login=await call(portal,'POST',{action:'login',email,reference:r.body.reference});assert.equal(login.statusCode,200);
 view=await call(portal,'GET',{},login.headers['Set-Cookie'].split(';')[0]);assert.deepEqual(view.body.applications.map(a=>a.id),[r.body.applicantId]);
 const legacy=cookie(APPLICANT_COOKIE,{role:'applicant',email});assert.equal((await call(portal,'GET',{},legacy)).statusCode,401);
 const verified=await call(portal,'POST',{action:'magic',token:signSession({role:'applicant-link',email})});assert.equal(verified.statusCode,200);
 view=await call(portal,'GET',{},verified.headers['Set-Cookie'].split(';')[0]);assert.equal(view.body.applications.length,2);
});
test('career submission rejects blank required fields',async()=>{
 const {default:apply}=await import('../api/careers/apply.js');
 const r=await call(apply,'POST',{fullName:'  ',email:'valid@example.invalid',role:'Engineer'});assert.equal(r.statusCode,400);
});

test('applicant email-link recovery returns the same response for known and unknown addresses',async()=>{
 const {default:handler}=await import('../api/applicant/portal.js');
 const known=await call(handler,'POST',{action:'request-link',email:'apply-scope@example.invalid'});
 const unknown=await call(handler,'POST',{action:'request-link',email:'unknown-fixture@example.invalid'});
 assert.equal(known.statusCode,200);assert.deepEqual(known.body,unknown.body);
 assert.equal(known.headers['Set-Cookie'],undefined);assert.equal(known.body.token,undefined);
});
