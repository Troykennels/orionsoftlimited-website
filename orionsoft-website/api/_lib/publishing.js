import {randomUUID} from 'node:crypto';
import {get,set,acquireLease,releaseLease} from '../store.js';
import {writeContent} from './content.js';
import {safeMediaUrl} from './media.js';
export const BLOG_KEY='orionsoft_blog_v1';
export const BLOG_LOCK='orionsoft:blog:edit';
export const readBlog=async()=>(await get(`orionsoft:content:${BLOG_KEY}`))||[];
export function normaliseBlog(b,old,posts){
 const title=String(b.title||'').trim().slice(0,180),content=String(b.content||'').trim().slice(0,60000);
 if(!title||!content)throw Object.assign(Error('Add a title and article text before saving.'),{status:400});
 const slug=String(b.slug||title).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
 if(!slug||posts.some(p=>p.id!==old?.id&&p.slug===slug))throw Object.assign(Error('Choose a unique article address.'),{status:409});
 const scheduledAt=b.scheduledAt?new Date(b.scheduledAt):null;
 if(scheduledAt&&!Number.isFinite(+scheduledAt))throw Object.assign(Error('Choose a valid publication date.'),{status:400});
 if(b.status==='scheduled'&&(!scheduledAt||+scheduledAt<Date.now()+60000))throw Object.assign(Error('Schedule publication at least one minute in the future.'),{status:400});
 const status=['draft','published','scheduled'].includes(b.status)?b.status:'draft';
 const gallery=(Array.isArray(b.gallery)?b.gallery:[]).slice(0,8).map(a=>({url:safeMediaUrl(a.url),alt:String(a.alt||'').slice(0,180)})).filter(a=>a.url);
 return {id:old?.id||randomUUID(),title,slug,content,excerpt:String(b.excerpt||content.replace(/[#*_]/g,'').replace(/\s+/g,' ')).trim().slice(0,300),author:String(b.author||'Orion Soft Limited').trim().slice(0,100),category:String(b.category||'Company news').trim().slice(0,80),coverImage:safeMediaUrl(b.coverImage),coverAlt:String(b.coverAlt||title).slice(0,180),videoUrl:safeMediaUrl(b.videoUrl),gallery,status,published:status==='published',scheduledAt:status==='scheduled'?scheduledAt.toISOString():null,date:status==='published'&&!old?.published?new Date().toISOString().slice(0,10):(old?.date||new Date().toISOString().slice(0,10)),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),version:(old?.version||0)+1};
}
export async function publishScheduledBlog(now=new Date()){
 const token=randomUUID();if(!await acquireLease(BLOG_LOCK,token,30))return {published:0};
 try{
  const posts=await readBlog();let count=0;
  const next=posts.map(p=>{if(p.status!=='scheduled'||!p.scheduledAt||Date.parse(p.scheduledAt)>+now)return p;count++;return {...p,published:true,status:'published',scheduledAt:null,date:now.toISOString().slice(0,10),updatedAt:now.toISOString(),version:(p.version||0)+1};});
  if(count){await writeContent(BLOG_KEY,next);await set('orionsoft:publishing:last',{at:now.toISOString(),published:count});}
  return {published:count};
 }finally{await releaseLease(BLOG_LOCK,token);}
}
