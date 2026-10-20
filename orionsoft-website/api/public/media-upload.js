import {verifySession} from '../_lib/auth.js';
import {getRecord} from '../_lib/records.js';
import {claim} from '../store.js';
import {receiveMedia} from '../_lib/media.js';
import {logAudit} from '../_lib/audit.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Origin');
 const origin=String(req.headers.origin||'');
 const allowed=['https://www.orionsoftlimited.com','https://orionsoftlimited.com',process.env.APP_BASE_URL].filter(Boolean).map(s=>s.replace(/\/$/,''));
 const local=process.env.NODE_ENV!=='production'&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
 if(origin&&!allowed.includes(origin)&&!local)return res.status(403).json({error:'Upload origin is not allowed.'});
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-File-Name');res.setHeader('Access-Control-Max-Age','600');}
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const token=verifySession(String(req.headers.authorization||'').replace(/^Bearer /,''));
 if(token?.role!=='media-upload'||!token.nonce)return res.status(401).json({error:'This upload permission has expired. Start the upload again.'});
 const admin=await getRecord('admins',token.sub);if(admin?.status!=='active')return res.status(401).json({error:'This admin account is no longer active.'});
 if(token.type!==String(req.headers['content-type']||'').split(';')[0]||token.size!==Number(req.headers['content-length']))return res.status(400).json({error:'The file changed. Start the upload again.'});
 if(!await claim(`orionsoft:media-upload:${token.nonce}`,600))return res.status(409).json({error:'This upload was already started. Choose the file again to retry.'});
 try{const session={sub:admin.id,name:admin.username};const asset=await receiveMedia(req,session);await logAudit(session,'media_uploaded',asset.id,asset.name);return res.json({ok:true,asset});}
 catch(e){return res.status(e.status||500).json({error:e.status?e.message:'The upload could not be saved. Please try again.'});}
}
