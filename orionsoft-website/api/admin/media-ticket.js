import {randomUUID} from 'node:crypto';
import {requireAdminAuth,signSession} from '../_lib/auth.js';
import {incrTtl} from '../store.js';
import {MEDIA_TYPES,MAX_MEDIA_BYTES,mediaDirectory} from '../_lib/media.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');const session=await requireAdminAuth(req,res);if(!session)return;
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!mediaDirectory())return res.status(503).json({error:'Persistent media storage is not configured.'});
 const {type,size}=req.body||{};
 if(!MEDIA_TYPES.includes(type)||!Number.isSafeInteger(size)||size<12||size>MAX_MEDIA_BYTES)return res.status(400).json({error:'Choose a supported file smaller than 100 MB.'});
 if(await incrTtl(`orionsoft:media-ticket:${session.sub}`,60)>20)return res.status(429).json({error:'Please wait a minute before starting more uploads.'});
 const token=signSession({sub:session.sub,role:'media-upload',name:session.name,type,size,nonce:randomUUID()},300);
 const base=(process.env.NODE_ENV==='production'||process.env.RAILWAY_ENVIRONMENT_ID)?(process.env.MEDIA_API_URL||'https://orionsoftlimited-website-production.up.railway.app'):'';
 return res.json({ok:true,url:`${base}/api/public/media-upload`,token});
}
