import { randomUUID } from 'node:crypto';
import { acquireLease, releaseLease } from '../store.js';
import {requireAdminAuth} from '../_lib/auth.js';
import {listRecords,getRecord,putRecord,newId} from '../_lib/records.js';
import {logAudit} from '../_lib/audit.js';
import {get} from '../store.js';
import {CHANNELS,campaignCaptions} from '../../shared/socialCampaign.js';
const platforms=['facebook','instagram','linkedin','x','tiktok','youtube'];
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  const session=await requireAdminAuth(req,res);if(!session)return;
  if(req.method==='GET'){
    const settings=(await get('orionsoft:content:orionsoft_settings_v1'))||{};
    const profiles=Object.fromEntries(Object.keys(CHANNELS).map(p=>{const v=settings[p==='x'?'twitter':p];let url='';try{const u=new URL(v);if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href;}catch{/* Invalid saved profile: use the channel homepage. */}return [p,url];}));
    return res.json({ok:true,profiles,publicationMode:'manual',posts:(await listRecords('social_posts')).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))});
  }
  if(req.method==='POST'||req.method==='PATCH'){
    const lock='orionsoft:social-content:edit',token=randomUUID();
    if(!await acquireLease(lock,token,15))return res.status(409).json({error:'Another content update is being saved. Please try again.'});
    try {
    const b=req.body||{};
    const mediaIds=Array.isArray(b.mediaIds)?[...new Set(b.mediaIds.map(String))].slice(0,8):[];
    const media=[];for(const id of mediaIds){const asset=await getRecord('media_assets',id);if(!asset)return res.status(400).json({error:'A selected file is no longer available. Choose it again.'});media.push({id:asset.id,url:asset.url,name:asset.name,type:asset.type,bytes:asset.bytes});}
    if(req.method==='POST'&&b.action==='campaign'){
      if(!String(b.title||'').trim()||!String(b.benefit||'').trim()||!String(b.campaign||'').trim())return res.status(400).json({error:'Add a campaign name, headline and benefit.'});
      let destination;try{destination=new URL(b.url);if(destination.protocol!=='https:'||destination.username||destination.password)throw Error();}catch{return res.status(400).json({error:'Add a valid https:// destination link.'});}
      const campaign=String(b.campaign).trim().slice(0,100),at=new Date().toISOString(),posts=[];
      const requestId=/^[a-f0-9-]{36}$/.test(String(b.requestId||''))?b.requestId:randomUUID();
      const drafts=campaignCaptions({title:String(b.title).slice(0,180),benefit:String(b.benefit).slice(0,1500),url:destination.href,cta:String(b.cta||'Request a demonstration').slice(0,200),tags:String(b.tags||'#OrionSoftLimited').slice(0,180),campaign});
      for(const draft of drafts){const id=`social_${requestId}_${draft.platform}`,existing=await getRecord('social_posts',id);if(existing){posts.push(existing);continue;}const post={...draft,id,campaign,mediaIds,media,status:'draft',version:1,createdAt:at,updatedAt:at,updatedBy:session.name,scheduledAt:null,publishedUrl:''};await putRecord('social_posts',id,post);posts.push(post);}
      await logAudit(session,'social_campaign_prepared',campaign,'Six channel drafts prepared for review');return res.json({ok:true,posts});
    }
    const old=b.id?await getRecord('social_posts',b.id):null;
    if(req.method==='PATCH'&&!old)return res.status(404).json({error:'Post not found'});
    const body=String(b.body||'').trim().slice(0,10000),platform=String(b.platform||'');
    if(!body||!platforms.includes(platform))return res.status(400).json({error:'Choose a platform and write a caption.'});
    if(body.length>CHANNELS[platform].limit)return res.status(400).json({error:`Shorten the caption to ${CHANNELS[platform].limit.toLocaleString()} characters for ${CHANNELS[platform].label}.`});
    const scheduledAt=b.scheduledAt?new Date(b.scheduledAt):null;
    if(scheduledAt&&!Number.isFinite(+scheduledAt))return res.status(400).json({error:'Choose a valid date.'});
    if(old&&((b.version!==undefined&&b.version!==(old.version||0))||(b.updatedAt&&b.updatedAt!==old.updatedAt)))return res.status(409).json({error:'Another team member updated this post. Reload before editing.'});
    const state=['draft','ready','published','archived'].includes(b.status)?b.status:'draft';
    let publishedUrl='';
    if(b.publishedUrl){try{const u=new URL(b.publishedUrl);if(u.protocol!=='https:'||u.username||u.password||! /(^|\.)(facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com|youtu\.be)$/.test(u.hostname))throw Error();publishedUrl=u.href;}catch{return res.status(400).json({error:'Use the published post link from the social platform.'});}}
    if(publishedUrl){const hosts={facebook:['facebook.com'],instagram:['instagram.com'],linkedin:['linkedin.com'],x:['x.com','twitter.com'],tiktok:['tiktok.com'],youtube:['youtube.com','youtu.be']};const host=new URL(publishedUrl).hostname;if(!hosts[platform].some(h=>host===h||host.endsWith('.'+h)))return res.status(400).json({error:'Use the actual post link from the selected platform.'});}
    if(state==='published'&&!publishedUrl)return res.status(400).json({error:'Add the actual published post link before marking it published.'});
    const id=old?.id||newId('social');const post={id,body,platform,mediaIds,media,status:state,version:(old?.version||0)+1,campaign:String(b.campaign||'').trim().slice(0,100),createdAt:old?.createdAt||old?.updatedAt||new Date().toISOString(),scheduledAt:scheduledAt?.toISOString()||null,publishedUrl,updatedAt:new Date().toISOString(),updatedBy:session.name};
    await putRecord('social_posts',id,post);await logAudit(session,'social_content_saved',id,`${platform}: ${state}`);
    return res.json({ok:true,post});
    } finally { await releaseLease(lock,token); }
  }
  return res.status(405).json({error:'Method not allowed'});
}
