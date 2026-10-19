import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.NODE_ENV='test';process.env.SESSION_SECRET='isolated-orion-calls-fixture';
for(const k of Object.keys(process.env)) if(/REDIS|UPSTASH|KV_REST|DATA_DIR|GMAIL|BREVO|RESEND|SMTP|VAPID|TERMII|CALL_TURN/.test(k)) delete process.env[k];
const store=await import('../api/store.js');assert.equal(store.storeBackend(),'mem');
const {putRecord,getRecord,listRecords}=await import('../api/_lib/records.js');
const {signSession,ADMIN_COOKIE}=await import('../api/_lib/auth.js');
const {default:calls,callIceConfig,resolvedIceConfig}=await import('../api/staff/calls.js');
const {default:meetings}=await import('../api/staff/meetings.js');
const {default:social}=await import('../api/admin/social-content.js');
for(const id of ['host','guest','outsider',...Array.from({length:6},(_,i)=>`extra${i}`)]) await putRecord('employees',id,{id,fullName:`Fixture ${id}`,status:'active',staffRole:'staff'});
const cookie=id=>`orionsoft_session=${encodeURIComponent(signSession({role:'staff',sub:id}))}`;
async function request(fn,method,body={},id='host',query={}) {
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},end(){return this;}};
  await fn({method,body,query,url:fn===social?'/api/admin/social-content':'',headers:{cookie:id?cookie(id):''},socket:{remoteAddress:'127.0.0.1'}},res);return res;
}
let meeting;
test('internal meeting is the default and private to invitees',async()=>{
  const r=await request(meetings,'POST',{title:'Private call',startsAt:new Date().toISOString(),attendeeIds:['guest']});
  assert.equal(r.statusCode,200);meeting=r.body.meeting;assert.equal(meeting.roomMode,'internal');assert.equal(meeting.link,'');
  assert.equal((await request(calls,'GET',{},null,{meetingId:meeting.id,action:'config'})).statusCode,401);
  assert.equal((await request(calls,'GET',{},'outsider',{meetingId:meeting.id,action:'config'})).statusCode,404);
  assert.equal((await request(calls,'GET',{},'guest',{meetingId:meeting.id,action:'config'})).body.relayConfigured,false);
});
test('session ownership, signal privacy and recording consent are enforced',async()=>{
  const h=(await request(calls,'POST',{meetingId:meeting.id,action:'join',consent:true})).body.sessionId;
  const g=(await request(calls,'POST',{meetingId:meeting.id,action:'join',consent:false},'guest')).body.sessionId;
  assert.equal((await request(calls,'POST',{meetingId:meeting.id,action:'join'})).statusCode,409);
  assert.equal((await request(calls,'POST',{meetingId:meeting.id,sessionId:h,action:'signal',to:g,type:'candidate',data:{candidate:'fixture'}},'guest')).statusCode,410);
  assert.equal((await request(calls,'POST',{meetingId:meeting.id,sessionId:h,action:'record',recording:true})).statusCode,409);
  assert.equal((await request(calls,'POST',{meetingId:meeting.id,sessionId:g,action:'record',recording:true},'guest')).statusCode,403);
  assert.equal((await request(calls,'POST',{meetingId:meeting.id,sessionId:h,action:'signal',to:g,type:'offer',data:{type:'offer',sdp:'fixture'}})).statusCode,200);
  const host=await request(calls,'GET',{},'host',{meetingId:meeting.id,sessionId:h});assert.equal(host.body.signals.length,0);
  const guest=await request(calls,'GET',{},'guest',{meetingId:meeting.id,sessionId:g});assert.equal(guest.body.signals.length,1);
  assert.equal((await request(calls,'POST',{meetingId:meeting.id,sessionId:g,action:'end'},'guest')).statusCode,403);
  await request(calls,'POST',{meetingId:meeting.id,sessionId:g,action:'leave'},'guest');
  assert.equal((await request(calls,'POST',{meetingId:meeting.id,sessionId:h,action:'record',recording:true})).statusCode,200);
  assert.equal((await request(calls,'POST',{meetingId:meeting.id,action:'join',consent:true},'guest')).statusCode,409);
  await request(calls,'POST',{meetingId:meeting.id,sessionId:h,action:'end'});
  assert.equal((await request(calls,'GET',{},'guest',{meetingId:meeting.id,sessionId:g})).statusCode,410);
});
test('room capacity, stale heartbeats and disabled staff fail safely',async()=>{
  const r=await request(meetings,'POST',{title:'All hands',startsAt:new Date().toISOString(),everyone:true});const meetingId=r.body.meeting.id;
  const joined=[];for(const id of ['host','guest','extra0','extra1','extra2','extra3']) joined.push((await request(calls,'POST',{action:'join',meetingId},id)).body.sessionId);
  assert.equal((await request(calls,'POST',{action:'join',meetingId},'extra4')).statusCode,409);
  const room=await store.get(`orionsoft:call:${meetingId}`);room.participants[1].seenAt=Date.now()-46000;await store.setExpiring(`orionsoft:call:${meetingId}`,room,60);
  assert.equal((await request(calls,'POST',{action:'join',meetingId},'extra4')).statusCode,200);
  await putRecord('employees','extra4',{id:'extra4',status:'suspended'});
  assert.equal((await request(calls,'GET',{},'extra4',{meetingId,action:'config'})).statusCode,401);
});
test('TURN shared secret never leaves server; credentials have bounded lifetime',()=>{
  process.env.CALL_TURN_URLS='turn:relay.example.invalid:3478,turns:relay.example.invalid:5349';process.env.CALL_TURN_SECRET='fixture-private-secret';
  const config=callIceConfig('host');assert.equal(config.relayConfigured,true);assert.ok(!JSON.stringify(config).includes('fixture-private-secret'));
  assert.ok(Number(config.iceServers[1].username.split(':')[0])-Date.now()/1000<=3600);
  delete process.env.CALL_TURN_URLS;delete process.env.CALL_TURN_SECRET;
});
test('retried minutes create each action task once; closed meetings reject RSVP',async()=>{
  const r=await request(meetings,'POST',{title:'Minutes fixture',startsAt:new Date().toISOString(),attendeeIds:['guest']});const id=r.body.meeting.id;
  const body={id,operationId:'fixture-operation-123456',notes:'Decisions',actionItems:[{text:'Do the work',assigneeId:'guest'}]};
  assert.equal((await request(meetings,'PATCH',body)).statusCode,200);assert.equal((await request(meetings,'PATCH',body)).statusCode,200);
  assert.equal((await getRecord('meetings',id)).actionItems.length,1);assert.equal((await listRecords('tasks')).filter(t=>t.title==='Do the work').length,1);
  await request(meetings,'PATCH',{id,done:true});assert.equal((await request(meetings,'PATCH',{id,rsvp:'yes'},'guest')).statusCode,409);
});
test('social editor preserves campaign/history and rejects a stale edit',async()=>{
  await putRecord('admins','social-editor',{id:'social-editor',username:'Fixture editor',status:'active',role:'client_content_manager'});
  const signed=`${ADMIN_COOKIE}=${encodeURIComponent(signSession({role:'admin',sub:'social-editor'}))}`;
  async function admin(method,body){const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};await social({method,body,url:'/api/admin/social-content',headers:{cookie:signed}},res);return res;}
  const first=await admin('POST',{platform:'linkedin',body:'Fixture caption',campaign:'SchoolCore launch',status:'ready'});assert.equal(first.statusCode,200);
  const post=first.body.post;assert.ok(post.createdAt);assert.equal(post.campaign,'SchoolCore launch');
  assert.equal((await admin('PATCH',{...post,updatedAt:'2000-01-01T00:00:00Z',body:'Stale'})).statusCode,409);
  assert.equal((await admin('PATCH',{...post,status:'archived'})).statusCode,200);
  assert.equal((await admin('PATCH',{...post,version:undefined,updatedAt:undefined,status:'published',publishedUrl:'https://evil.invalid/foo'})).statusCode,400);
});

test('Cloudflare connector caches only temporary credentials and fails visibly',async()=>{
  const previous=globalThis.fetch;let requests=0;
  process.env.CALL_CLOUDFLARE_TURN_KEY_ID='fixture-key';process.env.CALL_CLOUDFLARE_TURN_API_TOKEN='fixture-master-token';
  try {
    globalThis.fetch=async(_url,options)=>{requests++;assert.equal(JSON.parse(options.body).ttl,3600);return{ok:true,json:async()=>({iceServers:[{urls:['turns:turn.cloudflare.com:443?transport=tcp'],username:'short-lived-user',credential:'short-lived-password'}]})};};
    const result=await resolvedIceConfig('cloudflare-fixture');assert.equal(result.relayConfigured,true);assert.ok(!JSON.stringify(result).includes('fixture-master-token'));
    await resolvedIceConfig('cloudflare-fixture');assert.equal(requests,1);
    globalThis.fetch=async()=>({ok:false});const down=await resolvedIceConfig('provider-outage-fixture');assert.equal(down.relayUnavailable,true);assert.equal(down.relayConfigured,false);
  }finally{globalThis.fetch=previous;delete process.env.CALL_CLOUDFLARE_TURN_KEY_ID;delete process.env.CALL_CLOUDFLARE_TURN_API_TOKEN;}
});
