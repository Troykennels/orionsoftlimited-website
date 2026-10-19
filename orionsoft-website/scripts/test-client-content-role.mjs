import {test} from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.SESSION_SECRET='client-content-isolated-session-secret-only';
process.env.RENEWAL_DASHBOARD_API_KEY='fixture-read-only-connector';
process.env.SCHOOLCORE_RENEWAL_OVERVIEW_URL='https://fixture.invalid/renewals';
for(const key of ['REDIS_URL','REDIS_PRIVATE_URL','KV_REST_API_URL','KV_REST_API_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','DATA_DIR'])delete process.env[key];
const {putRecord,getRecord,setLookup,listRecords}=await import('../api/_lib/records.js');
const {writeContent}=await import('../api/_lib/content.js');
const {signSession,ADMIN_COOKIE,requireAdminAuth,requireStaff}=await import('../api/_lib/auth.js');
const {publicRenewal}=await import('../api/_lib/adminAccess.js');
const {default:renewals}=await import('../api/admin/renewals.js');
const {default:content}=await import('../api/admin/content.js');
const {default:social}=await import('../api/admin/social-content.js');
function response(){return{statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;},end(){return this;}};}
function request(path,role='client_content_manager',method='GET',body={}){return{url:path,originalUrl:path,method,query:{},body,headers:{cookie:`${ADMIN_COOKIE}=${encodeURIComponent(signSession({sub:role==='superadmin'?'owner':'manager',role:'admin',adminRole:'superadmin'}))}`}};}
const assigned='olm:11111111-1111-4111-8111-111111111111';
await putRecord('admins','owner',{id:'owner',username:'Owner',status:'active',role:'superadmin'});
await putRecord('admins','manager',{id:'manager',username:'Manager',status:'active',role:'client_content_manager',renewalAssignments:[assigned]});
test('Client & Content Manager cannot enter financial, HR, owner or user-management routes',async()=>{
 for(const path of ['admins','sales','employees','office','payroll','expenses','banks','settings','payments','invoices','contracts','purchase-orders','backup','audit','reports','signatories','templates']){
  const res=response();assert.equal(await requireAdminAuth(request('/api/admin/'+path),res),null,path);assert.equal(res.statusCode,403,path);
 }
 for(const path of ['renewals','social-content','newsletter','content','analytics','change-password']){
  const res=response();assert(await requireAdminAuth(request('/api/admin/'+path),res),path);
 }
 // Even a linked employee record cannot turn this admin login into Staff Office access.
 await putRecord('employees','linked',{id:'linked',status:'active',staffRole:'owner'});await setLookup('employees','admin','manager','linked');
 const res=response();assert.equal(await requireStaff(request('/api/staff/tasks'),res),null);assert.equal(res.statusCode,403);
});
test('assigned renewal rows exclude all financial and authorization fields',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url)=>({ok:true,json:async()=>({customers:String(url).includes('/billing/service/')?[
  {id:assigned,customer:'Assigned Hospital',product:'CareCore AI',amount:20000,billing_email:'private@example.com',renewal_url:'https://olm-console-production.up.railway.app/pay/fixture-payment-token-123456',recurring:{enabled:true,last4:'9988'},license_key:'never expose'},
  {id:'olm:22222222-2222-4222-8222-222222222222',customer:'Other Hospital',amount:50000}]:[]})});
 try{
  const res=response();await renewals(request('/api/admin/renewals'),res);assert.equal(res.statusCode,200);assert.equal(res.body.customers.length,1);
  const row=res.body.customers[0];assert.equal(row.customer,'Assigned Hospital');assert.equal(row.automatic_renewal,true);
  for(const forbidden of ['amount','billing_email','license_key','recurring','last4','renewal_url'])assert(!(forbidden in row),forbidden);
  const text=JSON.stringify(res.body);for(const secret of ['Other Hospital','20000','private@example.com','9988','never expose','fixture-payment-token-123456'])assert(!text.includes(secret));
  const queued=response();await renewals(request('/api/admin/renewals','client_content_manager','POST',{id:assigned,email:'attacker@example.com'}),queued);assert.equal(queued.statusCode,200);assert.equal(queued.body.queued,true);
  const outbox=await listRecords('renewal_reminders');assert.equal(outbox.length,1);assert.equal(outbox[0].recipient,'private@example.com');assert.equal(outbox[0].status,'pending');
  const duplicate=response();await renewals(request('/api/admin/renewals','client_content_manager','POST',{id:assigned}),duplicate);assert.equal(duplicate.body.alreadyQueued,true);assert.equal((await listRecords('renewal_reminders')).length,1);
  const {processRenewalReminders}=await import('../api/_lib/renewalReminders.js');let sends=0;
  const sender=async(to,subject,html)=>{assert.equal(to,'private@example.com');assert(html.includes('fixture-payment-token-123456'));sends++;await new Promise(r=>setTimeout(r,10));return true;};
  await Promise.all([processRenewalReminders(sender),processRenewalReminders(sender)]);assert.equal(sends,1);assert.equal((await listRecords('renewal_reminders'))[0].status,'sent');
  const other=response();await renewals(request('/api/admin/renewals','client_content_manager','POST',{id:'olm:22222222-2222-4222-8222-222222222222'}),other);assert.equal(other.statusCode,404);
  const blocked=response();await renewals(request('/api/admin/renewals','client_content_manager','PATCH',{adminId:'manager',licenseIds:[]}),blocked);assert.equal(blocked.statusCode,403);
  const changed=response();await renewals(request('/api/admin/renewals','superadmin','PATCH',{adminId:'manager',licenseIds:[]}),changed);assert.equal(changed.statusCode,200);
  const after=response();await renewals(request('/api/admin/renewals'),after);assert.equal(after.body.customers.length,0);
 }finally{globalThis.fetch=original;}
 assert.deepEqual(publicRenewal({id:assigned,amount:20,authorization_code:'secret'}),{id:assigned,automatic_renewal:false,can_remind:false});
});
test('content access permits marketing and rejects money/settings sections',async()=>{
 await writeContent('orionsoft_blog_v1',[{title:'Public article'}]);await writeContent('orionsoft_settings_v1',{privateConfiguration:'not for this role'});
 const view=response();await content(request('/api/admin/content'),view);assert(view.body.content.orionsoft_blog_v1);assert(!view.body.content.orionsoft_settings_v1);
 const denied=response();await content(request('/api/admin/content','client_content_manager','PUT',{key:'orionsoft_settings_v1',value:{}}),denied);assert.equal(denied.statusCode,403);
 const allowed=response();await content(request('/api/admin/content','client_content_manager','PUT',{key:'orionsoft_blog_v1',value:[{title:'Updated blog'}]}),allowed);assert.equal(allowed.statusCode,200);
});
test('social drafts do not claim publication without a real social post link',async()=>{
 const draft=response();await social(request('/api/admin/social-content','client_content_manager','POST',{platform:'linkedin',body:'New product announcement',status:'draft'}),draft);assert.equal(draft.statusCode,200);
 const fake=response();await social(request('/api/admin/social-content','client_content_manager','PATCH',{...draft.body.post,status:'published'}),fake);assert.equal(fake.statusCode,400);
 const unsafe=response();await social(request('/api/admin/social-content','client_content_manager','PATCH',{...draft.body.post,status:'published',publishedUrl:'https://evil.invalid/post'}),unsafe);assert.equal(unsafe.statusCode,400);
});
test('disabling an account revokes old signed sessions immediately',async()=>{
 const admin=await getRecord('admins','manager');await putRecord('admins','manager',{...admin,status:'disabled'});
 const res=response();assert.equal(await requireAdminAuth(request('/api/admin/newsletter'),res),null);assert.equal(res.statusCode,401);
});
