import {createHash} from 'node:crypto';
import {getRecord,listRecords,putRecord} from './records.js';
import {claim,del} from '../store.js';
import {sendEmail,brandedShell} from './mailer.js';
const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function queueRenewalReminder(row,actor){
  if(!/^\S+@\S+\.\S+$/.test(row.billing_email||'')||!row.renewal_url?.startsWith('https://'))throw Error('The saved billing contact is not ready for reminders.');
  const today=new Date(Date.now()+3600000).toISOString().slice(0,10);
  const id='renewal_'+createHash('sha256').update(row.id+':'+today).digest('hex');
  const lock='orionsoft:renewal-reminders:enqueue';
  if(!await claim(lock,10))throw Error('Another reminder is being queued. Please try again.');
  try{
    if(await getRecord('renewal_reminders',id))return {queued:true,alreadyQueued:true};
    await putRecord('renewal_reminders',id,{id,recipient:row.billing_email,customer:row.customer,product:row.product,paidThrough:row.paid_through,renewalUrl:row.renewal_url,status:'pending',attempts:0,requestedBy:actor,createdAt:new Date().toISOString()});
    return {queued:true,alreadyQueued:false};
  }finally{await del(lock);}
}
export async function processRenewalReminders(send=sendEmail){
  const rows=(await listRecords('renewal_reminders')).filter(r=>r.status==='pending'&&r.attempts<3&&(!r.attemptedAt||Date.parse(r.attemptedAt)+3600000<Date.now())).slice(0,5);
  for(const row of rows){
    if(!await claim('orionsoft:renewal-reminder:'+row.id,120))continue;
    const current=await getRecord('renewal_reminders',row.id);if(current?.status!=='pending')continue;
    current.attempts++;current.attemptedAt=new Date().toISOString();await putRecord('renewal_reminders',row.id,current);
    const date=current.paidThrough?new Date(current.paidThrough).toLocaleDateString('en-GB',{timeZone:'Africa/Lagos',day:'numeric',month:'long',year:'numeric'}):'shown on your renewal page';
    try{
      const ok=await send(current.recipient,`${current.product} subscription renewal`,brandedShell(`<h2>Your subscription renewal</h2><p>Hello ${esc(current.customer)},</p><p>Your ${esc(current.product)} subscription is paid through ${esc(date)}. Please check your renewal status using the secure link below. If payment is already processing, wait for confirmation before paying again.</p><p><a href="${esc(current.renewalUrl)}">View subscription and renew securely</a></p><p>Orion Soft Limited</p>`),{kind:'client_renewal_reminder'});
      if(ok){current.status='sent';current.sentAt=new Date().toISOString();}
    }catch{/* retained for bounded retry */}
    await putRecord('renewal_reminders',row.id,current);
  }
}
