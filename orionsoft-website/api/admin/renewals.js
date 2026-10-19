import {requireAdminAuth} from '../_lib/auth.js';
import {CLIENT_CONTENT_ROLE,publicRenewal} from '../_lib/adminAccess.js';
import {loadRenewalDashboard} from '../_lib/renewalDashboard.js';
import {getRecord,listRecords,putRecord} from '../_lib/records.js';
import {logAudit} from '../_lib/audit.js';
import {queueRenewalReminder} from '../_lib/renewalReminders.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  const session=await requireAdminAuth(req,res);if(!session)return;
  if(!['superadmin',CLIENT_CONTENT_ROLE].includes(session.adminRole))return res.status(403).json({error:'Renewal access is not included in this role.'});
  if(req.method==='GET'){
    let data;try{data=await loadRenewalDashboard();}catch{return res.status(503).json({error:'The renewal dashboard connection is unavailable. Please try again shortly.'});}
    if(session.adminRole===CLIENT_CONTENT_ROLE){
      const admin=await getRecord('admins',session.sub);
      const assigned=new Set(admin.renewalAssignments||[]);
      return res.json({ok:true,customers:data.customers.filter(x=>assigned.has(x.id)).map(publicRenewal),sources:data.sources,restricted:true});
    }
    const managers=(await listRecords('admins')).filter(a=>a.role===CLIENT_CONTENT_ROLE).map(a=>({id:a.id,name:a.username,status:a.status,assignments:a.renewalAssignments||[]}));
    return res.json({ok:true,...data,managers,restricted:false});
  }
  if(req.method==='POST'){
    const id=String(req.body?.id||'');
    if(session.adminRole===CLIENT_CONTENT_ROLE){const admin=await getRecord('admins',session.sub);if(!(admin.renewalAssignments||[]).includes(id))return res.status(404).json({error:'Assigned subscription not found.'});}
    let data;try{data=await loadRenewalDashboard();}catch{return res.status(503).json({error:'Renewal status is unavailable.'});}
    const row=data.customers.find(c=>c.id===id);
    if(!row)return res.status(404).json({error:'Subscription not found.'});
    try{const result=await queueRenewalReminder(row,session.sub);await logAudit(session,'client_renewal_reminder_queued',id,'Saved billing contact only');return res.json({ok:true,...result});}
    catch{return res.status(409).json({error:'A reminder could not be queued. The owner can check the saved billing contact.'});}
  }
  if(req.method==='PATCH'){
    if(session.adminRole!=='superadmin')return res.status(403).json({error:'Only the owner can assign clients.'});
    const {adminId,licenseIds}=req.body||{};
    if(!Array.isArray(licenseIds)||licenseIds.length>1000||licenseIds.some(id=>! /^(olm|schoolcore|compliancecore|crm):[a-f0-9-]{36}$/.test(String(id))))return res.status(400).json({error:'Choose valid client subscriptions.'});
    const admin=await getRecord('admins',adminId);
    if(!admin||admin.role!==CLIENT_CONTENT_ROLE)return res.status(400).json({error:'Choose a Client & Content Manager account.'});
    admin.renewalAssignments=[...new Set(licenseIds)];
    await putRecord('admins',admin.id,admin);
    await logAudit(session,'renewal_clients_assigned',`admin ${admin.id}`,`${admin.renewalAssignments.length} client subscription(s)`);
    return res.json({ok:true});
  }
  return res.status(405).json({error:'Method not allowed'});
}
