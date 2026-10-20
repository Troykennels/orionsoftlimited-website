import {requireAdminAuth} from '../_lib/auth.js';
import {listRecords} from '../_lib/records.js';
import {receiveMedia,mediaDirectory,MAX_MEDIA_BYTES} from '../_lib/media.js';
import {logAudit} from '../_lib/audit.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 const session=await requireAdminAuth(req,res);if(!session)return;
 if(req.method==='GET')return res.json({ok:true,configured:!!mediaDirectory(),maxBytes:MAX_MEDIA_BYTES,assets:(await listRecords('media_assets')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{const asset=await receiveMedia(req,session);await logAudit(session,'media_uploaded',asset.id,asset.name);return res.json({ok:true,asset});}
 catch(e){return res.status(e.status||500).json({error:e.status?e.message:'The upload could not be saved. Please try again.'});}
}
