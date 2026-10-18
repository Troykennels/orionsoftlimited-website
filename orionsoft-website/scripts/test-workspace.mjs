import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='development';process.env.SESSION_SECRET='workspace-disposable-fixture-key';
for(const key of Object.keys(process.env))if(/REDIS|UPSTASH|KV_REST|DATA_DIR|GMAIL|RESEND|SMTP|PAYSTACK|VAPID|TERMII/.test(key))delete process.env[key];
const store=await import('../api/store.js');assert.equal(store.storeBackend(),'mem');
const {putRecord,getRecord,setLookup}=await import('../api/_lib/records.js');
const {signSession,ADMIN_COOKIE,APPLICANT_COOKIE}=await import('../api/_lib/auth.js');
const {default:handler}=await import('../api/workspace.js');
const signed=(name,payload)=>`${name}=${signSession(payload)}`;
const admin=signed(ADMIN_COOKIE,{sub:'hub-admin',role:'admin',adminRole:'super_admin'});
const editor=signed(ADMIN_COOKIE,{sub:'hub-editor',role:'admin',adminRole:'super_admin'});
const staff=id=>signed('orionsoft_session',{role:'staff',sub:id});
const client=address=>signed('orionsoft_client',{role:'client',email:address,name:'Fixture Client'});
const c1=client('hub-client@example.invalid'),c2=client('other@example.invalid');
await putRecord('admins','hub-admin',{id:'hub-admin',username:'Fixture Admin',status:'active',role:'super_admin'});
await putRecord('admins','hub-editor',{id:'hub-editor',username:'Editor',status:'active',role:'editor'});
for(const person of [{id:'hub-manager',staffRole:'manager',department:'Engineering'},{id:'hub-staff',staffRole:'staff',managerId:'hub-manager',department:'Engineering'},{id:'hub-outsider',staffRole:'staff'},{id:'hub-new-manager',staffRole:'manager',department:'Other'}])await putRecord('employees',person.id,{...person,fullName:person.id,status:'active'});
await putRecord('contracts','hub-contract',{id:'hub-contract',number:'HUB-001',title:'Fixture agreement',status:'signed',client:{email:'hub-client@example.invalid'}});
await putRecord('contracts','hub-draft',{id:'hub-draft',status:'draft',client:{email:'hub-client@example.invalid'}});
async function call(scope,cookie,body){const response={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};await handler({method:body?'POST':'GET',headers:{cookie},query:{scope},body:body?{...body,scope}:undefined,url:'/api/workspace'},response);return response;}
const load=async(scope,cookie)=>{const r=await call(scope,cookie);assert.equal(r.statusCode,200,JSON.stringify(r.body));return r.body;};
const post=async(scope,cookie,body,status=200)=>{const r=await call(scope,cookie,body);assert.equal(r.statusCode,status,JSON.stringify(r.body));return r.body;};

test('workspace permissions and complete operational/project lifecycle',async t=>{
 let requestId,projectId,milestoneId;
 await t.test('anonymous, wrong-scope and editor accounts cannot read business workspace',async()=>{
  assert.equal((await call('admin','')).statusCode,401);assert.equal((await call('staff',c1)).statusCode,401);assert.equal((await call('admin',editor)).statusCode,403);assert.equal((await call('invalid',admin)).statusCode,400);
  assert.equal((await call('client',c1)).headers['Cache-Control'],'private, no-store');
 });
 await t.test('explicit scope keeps simultaneous cookies separate',async()=>{
  const both=admin+'; '+c1;const d=await load('client',both);assert.equal(d.identity.scope,'client');assert.deepEqual(d.contracts,[]);assert.deepEqual(d.people,[]);
 });
 await t.test('staff request validates dates and routes by current reporting line',async()=>{
  await post('staff',staff('hub-staff'),{action:'request-create',title:'Laptop',category:'equipment',reason:'Fixture',dueDate:'2026-02-30'},400);
  const r=await post('staff',staff('hub-staff'),{action:'request-create',title:'Laptop',category:'equipment',reason:'Fixture request',dueDate:'2030-01-01'});requestId=r.id;
  assert.deepEqual((await load('staff',staff('hub-staff'))).approvers,['hub-manager']);
  assert.equal((await load('staff',staff('hub-manager'))).requests.find(r=>r.id===requestId).canDecide,true);
  assert.equal((await load('staff',staff('hub-outsider'))).requests.length,0);
 });
 await t.test('request self-approval, unrelated access and empty decision are rejected',async()=>{
  await post('staff',staff('hub-staff'),{action:'request-decide',id:requestId,status:'approved',note:'Self'},403);
  await post('staff',staff('hub-outsider'),{action:'request-decide',id:requestId,status:'approved',note:'Other'},404);
  await post('staff',staff('hub-manager'),{action:'request-decide',id:requestId,status:'approved'},400);
 });
 await t.test('manager transfer immediately changes who can review',async()=>{
  const e=await getRecord('employees','hub-staff');e.managerId='hub-new-manager';await putRecord('employees',e.id,e);
  assert.equal((await load('staff',staff('hub-manager'))).requests.length,0);
  assert.equal((await load('staff',staff('hub-new-manager'))).requests[0].canDecide,true);
  e.managerId='hub-manager';await putRecord('employees',e.id,e);
 });
 await t.test('one decision creates an attributable history and blocks duplicate/cancel',async()=>{
  await post('staff',staff('hub-manager'),{action:'request-decide',id:requestId,status:'approved',note:'Approved fixture equipment'});
  const r=await getRecord('officeRequests',requestId);assert.equal(r.status,'approved');assert.equal(r.history.length,2);assert.equal(r.history[1].by,'hub-manager');
  assert.equal((await load('staff',staff('hub-manager'))).requests.find(r=>r.id===requestId).isMine,false);
  assert.equal((await load('staff',staff('hub-staff'))).requests.find(r=>r.id===requestId).isMine,true);
  await post('admin',admin,{action:'request-decide',id:requestId,status:'rejected',note:'Late'},409);
  await post('staff',staff('hub-staff'),{action:'request-cancel',id:requestId},409);
 });
 await t.test('requester can cancel a pending request',async()=>{
  const r=await post('staff',staff('hub-staff'),{action:'request-create',title:'Access',category:'access',reason:'Fixture only'});
  await post('staff',staff('hub-staff'),{action:'request-cancel',id:r.id,note:'No longer needed'});assert.equal((await getRecord('officeRequests',r.id)).status,'cancelled');
 });
 await t.test('linked admin cannot approve their own staff request',async()=>{
  await setLookup('employees','admin','hub-admin','hub-staff');const r=await post('staff',staff('hub-staff'),{action:'request-create',title:'Access two',category:'access',reason:'Fixture only'});
  await post('admin',admin,{action:'request-decide',id:r.id,status:'approved',note:'Self'},404);
 });
 await t.test('project creation requires admin, issued contract and active members',async()=>{
  const b={action:'project-create',title:'Hub project',contractId:'hub-contract',memberIds:['hub-staff']};
  await post('client',c1,b,403);await post('staff',staff('hub-manager'),b,403);
  await post('admin',admin,{...b,contractId:'hub-draft'},400);await post('admin',admin,{...b,memberIds:['absent']},400);
  projectId=(await post('admin',admin,b)).id;
 });
 const project=async(scope,cookie)=>{const d=await load(scope,cookie);return d.projects.find(p=>p.id===projectId);};
 const edit=async(scope,cookie,body,status=200)=>{const p=await getRecord('clientProjects',projectId);return post(scope,cookie,{id:projectId,version:p.version,...body},status);};
 await t.test('draft is private; assigned staff see it but cannot publish or change team',async()=>{
  assert.equal(await project('client',c1),undefined);assert.ok(await project('staff',staff('hub-staff')));assert.equal(await project('staff',staff('hub-outsider')),undefined);
  await edit('staff',staff('hub-staff'),{action:'project-edit',status:'active'},403);
  await edit('staff',staff('hub-staff'),{action:'project-edit',memberIds:['hub-outsider']},403);
 });
 await t.test('milestones and published project become visible only to owning client',async()=>{
  await edit('staff',staff('hub-staff'),{action:'milestone-add',title:'First delivery',description:'Client-safe scope',dueDate:'2030-02-01'});
  milestoneId=(await getRecord('clientProjects',projectId)).milestones[0].id;
  await edit('admin',admin,{action:'project-edit',status:'active'});
  assert.ok(await project('client',c1));assert.equal(await project('client',c2),undefined);
  const p=await project('client',c1);assert.ok(!('memberIds'in p));assert.ok(!('clientEmail'in p));assert.ok(!('contractId'in p));assert.equal(p.canManage,false);
  await edit('client',c2,{action:'project-comment',text:'Attack'},404);await edit('staff',staff('hub-outsider'),{action:'project-comment',text:'Attack'},404);
 });
 await t.test('unsafe links and staff-forged client acceptance are refused',async()=>{
  await edit('staff',staff('hub-staff'),{action:'milestone-update',milestoneId,status:'review',deliverableUrl:'javascript:alert(1)',note:'See link'},400);
  await edit('staff',staff('hub-staff'),{action:'milestone-update',milestoneId,status:'review',deliverableUrl:'https://user:password@example.invalid'},400);
  await edit('staff',staff('hub-staff'),{action:'milestone-update',milestoneId,status:'accepted'},400);
  await edit('admin',admin,{action:'milestone-review',milestoneId,status:'accepted',note:'Forged client'},403);
 });
 await t.test('client can request changes; delivery team resubmits and client accepts',async()=>{
  await edit('staff',staff('hub-staff'),{action:'milestone-update',milestoneId,status:'review',deliverableUrl:'https://example.invalid/delivery',note:'Please review'});
  await edit('client',c1,{action:'milestone-review',milestoneId,status:'changes_requested'},400);
  await edit('client',c1,{action:'milestone-review',milestoneId,status:'changes_requested',note:'Please improve the heading'});
  await edit('staff',staff('hub-staff'),{action:'milestone-update',milestoneId,status:'review',note:'Heading updated'});
  await edit('client',c1,{action:'milestone-review',milestoneId,status:'accepted',note:'Accepted. Thank you.'});
  const p=await getRecord('clientProjects',projectId);assert.equal(p.milestones[0].history.length,4);
  await edit('client',c1,{action:'milestone-review',milestoneId,status:'accepted',note:'Again'},409);
  await edit('staff',staff('hub-staff'),{action:'milestone-update',milestoneId,status:'in_progress'},409);
 });
 await t.test('client feedback is shared and cannot forge author, owner or status',async()=>{
  await edit('client',c1,{action:'project-comment',text:'Fixture feedback',by:'Administrator',clientEmail:'other@example.invalid',status:'completed'});
  const p=await getRecord('clientProjects',projectId);assert.equal(p.updates.at(-1).by,'Fixture Client');assert.equal(p.updates.at(-1).fromClient,true);assert.equal(p.status,'active');assert.equal(p.clientEmail,'hub-client@example.invalid');
 });
 await t.test('stale project versions cannot overwrite newer delivery work',async()=>{
  await post('staff',staff('hub-staff'),{action:'project-comment',id:projectId,version:1,text:'Outdated'},409);
 });
 await t.test('completion requires all client sign-offs and archived projects reject comments',async()=>{
  await edit('admin',admin,{action:'milestone-add',title:'Second delivery'});await edit('admin',admin,{action:'project-edit',status:'completed'},400);
  const m=(await getRecord('clientProjects',projectId)).milestones[1];await edit('admin',admin,{action:'milestone-update',milestoneId:m.id,status:'review',note:'Review fixture delivery'});await edit('client',c1,{action:'milestone-review',milestoneId:m.id,status:'accepted',note:'Accepted second delivery'});
  await edit('admin',admin,{action:'project-edit',status:'completed'});await edit('admin',admin,{action:'milestone-add',title:'Unexpected'},409);
  await edit('admin',admin,{action:'project-edit',status:'archived'});await edit('client',c1,{action:'project-comment',text:'Late comment'},409);
 });
 await t.test('removed staff membership takes effect immediately',async()=>{
  await edit('admin',admin,{action:'project-edit',memberIds:[]});assert.equal(await project('staff',staff('hub-staff')),undefined);
 });
 await t.test('inbox read state is personal, persists, and new updates become unread',async()=>{
  let d=await load('client',c1);const item=d.inbox.find(i=>i.id===`project:${projectId}`);assert.equal(item.read,false);
  await post('client',c1,{action:'read',items:[{id:item.id,token:item.token}]});d=await load('client',c1);assert.equal(d.inbox.find(i=>i.id===item.id).read,true);
  assert.equal((await load('admin',admin)).inbox.find(i=>i.id===item.id).read,false);
  await edit('admin',admin,{action:'project-edit',status:'active'});
  await post('client',c1,{action:'read',items:[{id:item.id,token:item.token}]});assert.equal((await load('client',c1)).inbox.find(i=>i.id===item.id).read,false);
  await post('client',c1,{action:'preferences',muted:['projects']});assert.deepEqual((await load('client',c1)).muted,['projects']);assert.deepEqual((await load('admin',admin)).muted,[]);
 });
 await t.test('private support comments never enter client inbox',async()=>{
  await putRecord('tickets','hub-ticket',{id:'hub-ticket',clientEmail:'hub-client@example.invalid',subject:'Fixture support',description:'Public issue',comments:[{text:'Public answer',at:'2030-01-01'},{text:'SECRET INTERNAL',internal:true,at:'2030-01-02'}],updatedAt:'2030-01-02'});
  const d=await load('client',c1);assert.equal(d.inbox.find(i=>i.id==='ticket:hub-ticket').body,'Public answer');assert.ok(!JSON.stringify(d).includes('SECRET INTERNAL'));assert.ok(!(await load('client',c2)).inbox.some(i=>i.id==='ticket:hub-ticket'));
 });
 await t.test('reference-scoped applicant inbox cannot reveal other applications or internal notes',async()=>{
  for(const id of ['hub-app-one','hub-app-two'])await putRecord('applicants',id,{id,email:'candidate@example.invalid',roleAppliedFor:id,status:'interview',messages:[{text:'INTERNAL CANDIDATE',internal:true}],createdAt:'2030-01-01'});
  const limited=signed(APPLICANT_COOKIE,{role:'applicant',email:'candidate@example.invalid',appIds:['hub-app-one']});let d=await load('applicant',limited);assert.equal(d.inbox.length,1);assert.equal(d.inbox[0].id,'application:hub-app-one');assert.ok(!JSON.stringify(d).includes('INTERNAL CANDIDATE'));
  await post('applicant',limited,{action:'read',items:d.inbox.map(({id,token})=>({id,token}))});
  const full=signed(APPLICANT_COOKIE,{role:'applicant',email:'candidate@example.invalid',emailVerified:true});d=await load('applicant',full);assert.equal(d.inbox.length,2);assert.ok(d.inbox.every(i=>!i.read));
  const legacy=signed(APPLICANT_COOKIE,{role:'applicant',email:'candidate@example.invalid'});assert.equal((await call('applicant',legacy)).statusCode,401);
 });
 await t.test('native pending requests respect finance and reporting permissions',async()=>{
  await putRecord('leave','hub-leave',{id:'hub-leave',employeeId:'hub-staff',status:'pending',type:'annual',submittedAt:'2030-01-01'});
  await putRecord('expenses','hub-expense',{id:'hub-expense',employeeId:'hub-staff',status:'pending',createdAt:'2030-01-01'});
  let d=await load('staff',staff('hub-manager'));assert.ok(d.nativeApprovals.some(i=>i.id==='leave:hub-leave'));assert.ok(!d.nativeApprovals.some(i=>i.id==='expenses:hub-expense'));
  d=await load('staff',staff('hub-outsider'));assert.equal(d.nativeApprovals.length,0);
 });
 await t.test('workspace lock rejects parallel writes without losing record index entries',async()=>{
  const r=await Promise.all(Array.from({length:6},(_,i)=>call('staff',staff('hub-staff'),{action:'request-create',title:`Concurrent ${i}`,reason:'Fixture only',category:'other'})));
  assert.ok(r.some(x=>x.statusCode===200));assert.ok(r.every(x=>[200,409].includes(x.statusCode)));
  const data=await load('staff',staff('hub-staff'));for(const saved of r.filter(x=>x.statusCode===200))assert.ok(data.requests.some(q=>q.id===saved.body.id));
 });
 await t.test('revoked staff/admin sessions cannot access existing data',async()=>{
  const e=await getRecord('employees','hub-staff');await putRecord('employees',e.id,{...e,status:'inactive'});assert.equal((await call('staff',staff(e.id))).statusCode,401);
  const ad=await getRecord('admins','hub-admin');await putRecord('admins',ad.id,{...ad,status:'inactive'});assert.equal((await call('admin',admin)).statusCode,401);
 });
});
