import {randomUUID} from 'node:crypto';
import {requireAdminAuth} from '../_lib/auth.js';
import {acquireLease,releaseLease} from '../store.js';
import {BLOG_KEY,BLOG_LOCK,readBlog,normaliseBlog} from '../_lib/publishing.js';
import {writeContent,MAX_CONTENT_BYTES} from '../_lib/content.js';
import {logAudit} from '../_lib/audit.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');const session=await requireAdminAuth(req,res);if(!session)return;
 if(req.method==='GET')return res.json({ok:true,posts:await readBlog()});
 if(!['POST','PATCH'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 const token=randomUUID();if(!await acquireLease(BLOG_LOCK,token,30))return res.status(409).json({error:'Another article is being saved. Please try again.'});
 try{
  const posts=await readBlog(),b=req.body||{},old=posts.find(p=>p.id===b.id);
  if(req.method==='PATCH'&&!old)return res.status(404).json({error:'Article not found.'});
  if(old&&(b.version||0)!==(old.version||0))return res.status(409).json({error:'Someone else updated this article. Your text is still in the editor; reload the article before saving.'});
  const post=normaliseBlog(b,old,posts);post.updatedBy=session.name;
  const next=old?posts.map(p=>p.id===old.id?post:p):[post,...posts];
  if(Buffer.byteLength(JSON.stringify(next))>MAX_CONTENT_BYTES)return res.status(413).json({error:'The article collection is too large. Keep files in the media library rather than pasting encoded images into article text.'});
  await writeContent(BLOG_KEY,next);await logAudit(session,'blog_saved',post.id,`${post.title}: ${post.status}`);
  return res.json({ok:true,post});
 }catch(e){if(e.status)return res.status(e.status).json({error:e.message});throw e;}
 finally{await releaseLease(BLOG_LOCK,token);}
}
