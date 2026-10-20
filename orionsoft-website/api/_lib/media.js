import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {getRecord, listRecords, putRecord} from './records.js';
import {acquireLease,releaseLease} from '../store.js';
export const MAX_MEDIA_BYTES=100*1024*1024;
export const MEDIA_TYPES=['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'];
export const mediaDirectory=()=>process.env.DATA_DIR?path.join(process.env.DATA_DIR,'public-media'):null;
export const mediaId=id=>/^[a-f0-9]{64}$/.test(String(id||''));
export const mediaUrl=id=>`/api/public/media?id=${id}&v=2`;
export function safeMediaUrl(value){
 if(!value)return '';
 const s=String(value).trim();
 if(s.startsWith('/')&&!s.startsWith('//')&&!/[\\\r\n]/.test(s))return s.slice(0,2000);
 try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href.slice(0,2000);}catch{/* Optional state or invalid URL: continue with the explicit fallback. */}
 throw Object.assign(Error('Use an uploaded file or an https:// media link.'),{status:400});
}
export function detectMedia(buf){
 if(buf.length<12)return null;
 if(buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(buf[0]===255&&buf[1]===216&&buf[2]===255)return 'image/jpeg';
 if(['GIF87a','GIF89a'].includes(buf.subarray(0,6).toString()))return 'image/gif';
 if(buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP')return 'image/webp';
 if(buf.subarray(4,8).toString()==='ftyp'&&/^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)/.test(buf.subarray(8,12).toString()))return 'video/mp4';
 if(buf.subarray(0,4).equals(Buffer.from([26,69,223,163]))&&buf.subarray(0,4096).includes(Buffer.from('webm')))return 'video/webm';
 return null;
}
export async function receiveMedia(req,session){
 const root=mediaDirectory();if(!root)throw Object.assign(Error('Persistent media storage is not configured. Please contact the owner.'),{status:503});
 const declared=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
 if(!MEDIA_TYPES.includes(declared))throw Object.assign(Error('Choose a JPG, PNG, WebP, GIF, MP4 or WebM file.'),{status:415});
 const size=Number(req.headers['content-length']);
 if(!Number.isFinite(size)||size<12||size>MAX_MEDIA_BYTES)throw Object.assign(Error('Choose a file between 12 bytes and 100 MB.'),{status:413});
 await fs.mkdir(root,{recursive:true});
 const space=await fs.statfs(root);if(space.bavail*space.bsize<size+128*1024*1024)throw Object.assign(Error('Media storage is nearly full. Please contact the owner.'),{status:507});
 let originalName;try{originalName=decodeURIComponent(String(req.headers['x-file-name']||'Media'));}catch{throw Object.assign(Error('The file name could not be read. Please rename the file and retry.'),{status:400});}
 const tmp=path.join(root,`${randomUUID()}.upload`);let file,bytes=0,head=Buffer.alloc(0);const hash=createHash('sha256');
 try{
  file=await fs.open(tmp,'wx');
  for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_MEDIA_BYTES||bytes>size)throw Object.assign(Error('This upload is too large.'),{status:413});hash.update(chunk);if(head.length<4096)head=Buffer.concat([head,chunk.subarray(0,4096-head.length)]);await file.writeFile(chunk);}
  await file.close();file=null;
  if(bytes!==size)throw Object.assign(Error('The upload was interrupted. Please try again.'),{status:400});
  const type=detectMedia(head);if(type!==declared)throw Object.assign(Error('The file contents do not match its type. Export it as a supported image or video.'),{status:415});
  const id=hash.digest('hex'),lock='orionsoft:media:index:edit',token=randomUUID();
  if(!await acquireLease(lock,token,30))throw Object.assign(Error('Another upload is being saved. Please try again.'),{status:409});
  try{
   const existing=await getRecord('media_assets',id);if(existing)return existing;
   const all=await listRecords('media_assets');
   if(all.reduce((n,a)=>n+a.bytes,0)+bytes>2*1024**3)throw Object.assign(Error('Your media library has reached its 2 GB limit. Contact the owner to increase storage.'),{status:507});
   await fs.rename(tmp,path.join(root,id));
   const name=Array.from(originalName).filter(c=>c.codePointAt(0)>=32&&c.codePointAt(0)!==127).join('').slice(0,160);
   const asset={id,name,type,bytes,url:mediaUrl(id),createdAt:new Date().toISOString(),createdBy:session.name};
   await putRecord('media_assets',id,asset);return asset;
  }finally{await releaseLease(lock,token);}
 }finally{if(file)await file.close();await fs.unlink(tmp).catch(()=>{});}
}
