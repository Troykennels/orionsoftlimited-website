import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
process.env.NODE_ENV='test';process.env.SESSION_SECRET='isolated-media-studio-test-secret';
for(const k of Object.keys(process.env))if(/REDIS|UPSTASH|KV_REST|DATA_DIR|SMTP|BREVO|RESEND|GMAIL|PAYSTACK/.test(k))delete process.env[k];
const root=await fs.mkdtemp(path.join(os.tmpdir(),'orion-media-test-'));process.env.DATA_DIR=root;
const {putRecord,listRecords}=await import('../api/_lib/records.js');
const {readBlog,publishScheduledBlog}=await import('../api/_lib/publishing.js');
const {writeContent,publicView}=await import('../api/_lib/content.js');
const {signSession,ADMIN_COOKIE}=await import('../api/_lib/auth.js');
const {campaignCaptions,CHANNELS}=await import('../shared/socialCampaign.js');
const app=express();app.use(express.json());
for(const route of ['admin/media','admin/media-ticket','admin/blog','admin/social-content','public/media','public/media-upload']){const {default:h}=await import(`../api/${route}.js`);app.all('/api/'+route,h);}
app.use((e,req,res,next)=>{res.status(500).json({error:e.message});});
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));}),base=`http://127.0.0.1:${server.address().port}`;
for(const role of ['superadmin','editor','client_content_manager'])await putRecord('admins',role,{id:role,username:role,status:'active',role});
const cookie=role=>`${ADMIN_COOKIE}=${encodeURIComponent(signSession({sub:role,role:'admin'}))}`;
const call=(route,role='superadmin',method='GET',body)=>fetch(base+'/api/'+route,{method,headers:{...(role?{cookie:cookie(role)}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
after(async()=>{await new Promise(r=>server.close(r));assert(root.startsWith(path.join(os.tmpdir(),'orion-media-test-')));await fs.rm(root,{recursive:true,force:true});});
let asset,post;
test('anonymous users cannot access media, drafts or upload permissions',async()=>{for(const route of ['admin/media','admin/media-ticket','admin/blog','admin/social-content'])assert.equal((await call(route,null)).status,401);assert.equal((await fetch(base+'/api/public/media-upload',{method:'POST'})).status,401);});
test('owner, editor and content manager share media/blog access without financial access',async()=>{for(const role of ['superadmin','editor','client_content_manager'])assert.equal((await call('admin/media',role)).status,200);const {managerRouteAllowed}=await import('../api/_lib/adminAccess.js');assert.equal(managerRouteAllowed({adminRole:'client_content_manager'},'/api/admin/payments'),false);assert.equal(managerRouteAllowed({adminRole:'client_content_manager'},'/api/admin/media-ticket'),true);});
test('uploads are validated, persisted, deduplicated and playable through byte ranges',async()=>{
 const data=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082','hex');
 async function upload(){const ticket=await (await call('admin/media-ticket','client_content_manager','POST',{type:'image/png',size:data.length})).json();const r=await fetch(base+ticket.url,{method:'POST',headers:{Authorization:`Bearer ${ticket.token}`,'Content-Type':'image/png','X-File-Name':encodeURIComponent('Test cover.png'),Origin:base},body:data});assert.equal(r.status,200);return {j:await r.json(),ticket};}
 const first=await upload();asset=first.j.asset;assert.equal(asset.name,'Test cover.png');assert.equal((await listRecords('media_assets')).length,1);const second=await upload();assert.equal(second.j.asset.id,asset.id);assert.equal((await listRecords('media_assets')).length,1);
 const full=await fetch(base+asset.url);assert.equal(full.status,200);assert.deepEqual(Buffer.from(await full.arrayBuffer()),data);
 const range=await fetch(base+asset.url,{headers:{Range:'bytes=4-12'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),`bytes 4-12/${data.length}`);assert.deepEqual(Buffer.from(await range.arrayBuffer()),data.subarray(4,13));
 const suffix=await fetch(base+asset.url,{headers:{Range:'bytes=-8'}});assert.equal(suffix.status,206);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),data.subarray(-8));
 assert.equal((await fetch(base+asset.url,{method:'HEAD'})).headers.get('content-length'),String(data.length));assert.equal((await fetch(base+asset.url,{headers:{Range:'bytes=999999-'}})).status,416);
 const replay=await fetch(base+first.ticket.url,{method:'POST',headers:{Authorization:`Bearer ${first.ticket.token}`,'Content-Type':'image/png'},body:data});assert.equal(replay.status,409);
});
test('spoofed file types, cross-origin uploads, oversized files and path traversal are rejected',async()=>{
 assert.equal((await call('admin/media-ticket','superadmin','POST',{type:'text/html',size:50})).status,400);
 assert.equal((await call('admin/media-ticket','superadmin','POST',{type:'video/mp4',size:101*1024**2})).status,400);
 const fake=Buffer.from('<script>this is not an image</script>'),ticket=await(await call('admin/media-ticket','superadmin','POST',{type:'image/png',size:fake.length})).json();
 const bad=await fetch(base+ticket.url,{method:'POST',headers:{Authorization:`Bearer ${ticket.token}`,'Content-Type':'image/png'},body:fake});assert.equal(bad.status,415);
 assert.equal((await fetch(base+'/api/public/media-upload',{method:'OPTIONS',headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await fetch(base+'/api/public/media?id=../../private')).status,404);
 const remaining=(await fs.readdir(path.join(root,'public-media'))).filter(n=>n.endsWith('.upload'));assert.deepEqual(remaining,[]);
});
test('articles support media, auto summaries, unique slugs and optimistic editing',async()=>{
 const r=await call('admin/blog','editor','POST',{title:'SchoolCore media article',content:'A useful article about school administration.',coverImage:asset.url,videoUrl:'/assets/schoolcore/demo/overview.mp4',gallery:[{url:asset.url,alt:'A school dashboard'}],status:'draft'});assert.equal(r.status,200);post=(await r.json()).post;
 assert.equal(post.slug,'schoolcore-media-article');assert.equal(post.excerpt,'A useful article about school administration.');assert.equal(post.published,false);assert.equal(post.gallery[0].alt,'A school dashboard');
 const edit=await call('admin/blog','editor','PATCH',{...post,title:'Updated title'});assert.equal(edit.status,200);
 assert.equal((await call('admin/blog','editor','PATCH',{...post,title:'Stale edit'})).status,409);
 assert.equal((await call('admin/blog','superadmin','POST',{...post,id:undefined})).status,409);
 assert.equal((await call('admin/blog','superadmin','POST',{title:'Unsafe article',content:'Text',videoUrl:'javascript:alert(1)'})).status,400);
});
test('scheduled articles stay private until due and publish exactly once',async()=>{
 const at=new Date(Date.now()+120000),r=await call('admin/blog','superadmin','POST',{title:'Scheduled fixture',content:'Only published when approved time arrives.',status:'scheduled',scheduledAt:at.toISOString()});assert.equal(r.status,200);const p=(await r.json()).post;
 assert(!publicView({orionsoft_blog_v1:await readBlog()}).orionsoft_blog_v1.some(x=>x.id===p.id));
 assert.equal((await publishScheduledBlog(new Date(+at-1))).published,0);assert.equal((await publishScheduledBlog(at)).published,1);assert.equal((await publishScheduledBlog(at)).published,0);assert((await readBlog()).find(x=>x.id===p.id).published);
});
test('six channel campaigns attach the same media and retries cannot duplicate drafts',async()=>{
 const b={action:'campaign',requestId:'11111111-1111-4111-8111-111111111111',campaign:'School launch',title:'Who still owes school fees?',benefit:'See fee balances in SchoolCore.',url:'https://example.invalid/schoolcore-demo',cta:'Request a demonstration',tags:'#SchoolCore',mediaIds:[asset.id]};
 const r=await call('admin/social-content','client_content_manager','POST',b);assert.equal(r.status,200);const j=await r.json();assert.equal(j.posts.length,6);for(const p of j.posts){assert.equal(p.status,'draft');assert.equal(p.media[0].id,asset.id);assert(p.body.length<=CHANNELS[p.platform].limit);}
 const before=(await listRecords('social_posts')).length;assert.equal((await call('admin/social-content','client_content_manager','POST',b)).status,200);assert.equal((await listRecords('social_posts')).length,before);
 const fake=await call('admin/social-content','client_content_manager','PATCH',{...j.posts[0],status:'published',publishedUrl:'https://www.youtube.com/watch?v=fixture'});assert.equal(fake.status,400);
 assert.equal((await call('admin/social-content','client_content_manager','PATCH',{...j.posts[0],status:'published'})).status,400);
 const changed=await call('admin/social-content','client_content_manager','PATCH',{...j.posts[0],body:'Edited draft'});assert.equal(changed.status,200);assert.equal((await call('admin/social-content','client_content_manager','PATCH',{...j.posts[0],body:'Stale text'})).status,409);
});
test('campaign templates respect every caption limit and saved profiles never expose private settings',async()=>{
 for(const p of campaignCaptions({title:'x'.repeat(180),benefit:'y'.repeat(1500),url:'https://example.invalid',cta:'z'.repeat(200),tags:'#tag',campaign:'Test'}))assert(p.body.length<=CHANNELS[p.platform].limit);
 await writeContent('orionsoft_settings_v1',{facebook:'https://facebook.com/example',bankDetails:'private money data'});const j=await(await call('admin/social-content','client_content_manager')).json();assert.equal(j.profiles.facebook,'https://facebook.com/example');assert(!JSON.stringify(j).includes('private money data'));assert.equal(j.publicationMode,'manual');
});
