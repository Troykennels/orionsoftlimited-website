import { randomUUID } from 'node:crypto';
import { acquireLease, releaseLease } from '../store.js';
import {requireAdminAuth} from '../_lib/auth.js';
import {listRecords,getRecord,putRecord,newId} from '../_lib/records.js';
import {logAudit} from '../_lib/audit.js';
const platforms=['facebook','instagram','linkedin','x','tiktok','youtube'];
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  const session=await requireAdminAuth(req,res);if(!session)return;
  if(req.method==='GET')return res.json({ok:true,posts:(await listRecords('social_posts')).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))});
  if(req.method==='POST'||req.method==='PATCH'){
    const lock='orionsoft:social-content:edit',token=randomUUID();
    if(!await acquireLease(lock,token,15))return res.status(409).json({error:'Another content update is being saved. Please try again.'});
    try {
    const b=req.body||{};
    const old=b.id?await getRecord('social_posts',b.id):null;
    if(req.method==='PATCH'&&!old)return res.status(404).json({error:'Post not found'});
    const body=String(b.body||'').trim().slice(0,10000),platform=String(b.platform||'');
    if(!body||!platforms.includes(platform))return res.status(400).json({error:'Choose a platform and write a caption.'});
    const scheduledAt=b.scheduledAt?new Date(b.scheduledAt):null;
    if(scheduledAt&&!Number.isFinite(+scheduledAt))return res.status(400).json({error:'Choose a valid date.'});
    if(old&&((b.version!==undefined&&b.version!==(old.version||0))||(b.updatedAt&&b.updatedAt!==old.updatedAt)))return res.status(409).json({error:'Another team member updated this post. Reload before editing.'});
    const state=['draft','ready','published','archived'].includes(b.status)?b.status:'draft';
    let publishedUrl='';
    if(b.publishedUrl){try{const u=new URL(b.publishedUrl);if(u.protocol!=='https:'||u.username||u.password||! /(^|\.)(facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com|youtu\.be)$/.test(u.hostname))throw Error();publishedUrl=u.href;}catch{return res.status(400).json({error:'Use the published post link from the social platform.'});}}
    if(state==='published'&&!publishedUrl)return res.status(400).json({error:'Add the actual published post link before marking it published.'});
    const id=old?.id||newId('social');const post={id,body,platform,status:state,version:(old?.version||0)+1,campaign:String(b.campaign||'').trim().slice(0,100),createdAt:old?.createdAt||old?.updatedAt||new Date().toISOString(),scheduledAt:scheduledAt?.toISOString()||null,publishedUrl,updatedAt:new Date().toISOString(),updatedBy:session.name};
    await putRecord('social_posts',id,post);await logAudit(session,'social_content_saved',id,`${platform}: ${state}`);
    return res.json({ok:true,post});
    } finally { await releaseLease(lock,token); }
  }
  return res.status(405).json({error:'Method not allowed'});
}
