import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {getRecord} from '../_lib/records.js';
import {mediaDirectory,mediaId} from '../_lib/media.js';
export default async function handler(req,res){
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 const id=String(req.query.id||'');if(!mediaId(id)||!mediaDirectory())return res.status(404).end();
 const asset=await getRecord('media_assets',id);if(!asset)return res.status(404).end();
 const file=path.join(mediaDirectory(),id);let info;try{info=await fsp.stat(file);}catch{return res.status(404).end();}
 // External rewrite caches must never reuse a cached 206 fragment as the next
 // full/seek response. Keep byte ranges at the origin and out of shared caches.
 res.setHeader('Content-Type',asset.type);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Range');res.setHeader('Accept-Ranges','bytes');res.setHeader('ETag',`"${id}"`);
 if(req.headers['if-none-match']===`"${id}"`&&!req.headers.range)return res.status(304).end();
 let start=0,end=info.size-1;
 if(req.headers.range){
  const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(!m||(!m[1]&&!m[2])){res.setHeader('Content-Range',`bytes */${info.size}`);return res.status(416).end();}
  if(!m[1])start=Math.max(0,info.size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.setHeader('Content-Range',`bytes */${info.size}`);return res.status(416).end();}
  res.status(206);res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
 }
 res.setHeader('Content-Length',end-start+1);if(req.method==='HEAD')return res.end();
 const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
}
