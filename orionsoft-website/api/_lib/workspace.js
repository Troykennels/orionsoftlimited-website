import { createHash, randomUUID } from 'node:crypto';
import { getSessionFromRequest, requireAdminAuth, requireStaff, APPLICANT_COOKIE } from './auth.js';
import { listRecords, getByLookup, putRecord, getRecord, newId } from './records.js';
import { get, set, acquireLease, releaseLease } from '../store.js';
import { getRoleCatalog, canApproveFor, approversFor, can, canReviewReport } from './roles.js';
import { listNotifications } from './office.js';

export const text = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const email = value => text(value).toLowerCase();
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const fingerprint = value => createHash('sha256').update(value).digest('hex').slice(0, 24);
export const today = () => new Date().toISOString().slice(0, 10);
function date(value) {
  if (!value) return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) fail(400, 'Choose a valid date.');
  return value;
}
function httpsUrl(value) {
  if (!value) return '';
  try { const u = new URL(text(value, 1800)); if (u.protocol === 'https:' && !u.username && !u.password) return u.href; } catch { /* invalid */ }
  fail(400, 'Deliverable links must be full HTTPS addresses without passwords.');
}

// Scope is explicit: coexisting admin/staff/client cookies never change which
// identity a request operates as. Permissions always come from live records.
export async function workspaceActor(req, res, scope) {
  if (scope === 'admin') {
    const session = await requireAdminAuth(req, res); if (!session) return null;
    const linked = await getByLookup('employees', 'admin', session.sub);
    return { scope, key:`admin:${session.sub}`, id:session.sub, employeeId:linked?.id, name:session.name || 'Administrator', email:email(session.email) };
  }
  if (scope === 'staff') {
    const auth = await requireStaff(req, res); if (!auth) return null;
    const [employees, catalog] = await Promise.all([listRecords('employees'), getRoleCatalog()]);
    return { scope, key:`staff:${auth.employee.id}`, id:auth.employee.id, employeeId:auth.employee.id, name:auth.employee.fullName, email:email(auth.employee.email), me:auth.employee, employees, catalog };
  }
  if (scope === 'client' || scope === 'applicant') {
    const s = getSessionFromRequest(req, scope === 'client' ? 'orionsoft_client' : APPLICANT_COOKIE);
    if (!s || s.role !== scope || !email(s.email) || scope === 'applicant' && !s.emailVerified && !Array.isArray(s.appIds)) { res.status(401).json({error:'Please sign in again.'}); return null; }
    const allowed = scope === 'applicant' && !s.emailVerified ? s.appIds.filter(id => typeof id === 'string').sort() : null;
    // A reference-scoped applicant cannot share inbox read state with a full
    // email-verified session or another reference-scoped application.
    return { scope, key:`${scope}:${email(s.email)}${allowed ? ':'+fingerprint(JSON.stringify(allowed)) : ''}`, id:email(s.email), name:s.name || '', email:email(s.email), appIds:allowed };
  }
  fail(400, 'Choose a valid office workspace.');
}

export function canDecide(actor, request) {
  if (actor.employeeId === request.employeeId) return false;
  if (actor.scope === 'admin') return true;
  return actor.scope === 'staff' && canApproveFor(actor.me, actor.employees.find(e => e.id === request.employeeId), actor.employees, actor.catalog);
}
const seesRequest = (a, r) => a.scope === 'staff' && r.employeeId === a.id || canDecide(a, r);
const seesProject = (a, p) => a.scope === 'admin' || a.scope === 'staff' && p.memberIds.includes(a.id) || a.scope === 'client' && p.status !== 'draft' && email(p.clientEmail) === a.email;
const managesProject = (a, p) => a.scope === 'admin' || a.scope === 'staff' && p.memberIds.includes(a.id);
function projectView(a, p) {
  const out = { id:p.id, title:p.title, summary:p.summary, status:p.status, dueDate:p.dueDate, contractNumber:p.contractNumber, version:p.version, createdAt:p.createdAt, updatedAt:p.updatedAt,
    milestones:p.milestones.map(m => ({...m})), updates:p.updates.map(u => ({...u})), canManage:managesProject(a,p) };
  if (a.scope !== 'client') Object.assign(out, {clientEmail:p.clientEmail, memberIds:p.memberIds, contractId:p.contractId});
  return out;
}
function requestView(a, r) { return {...r, isMine:a.scope === 'staff' && r.employeeId === a.id, canDecide:r.status === 'pending' && canDecide(a,r), canCancel:r.status === 'pending' && a.scope === 'staff' && r.employeeId === a.id}; }

async function existingApprovals(a) {
  if (!['staff','admin'].includes(a.scope)) return [];
  const [leave, reports, expenses] = await Promise.all(['leave','reports','expenses'].map(listRecords));
  const allowed = (entity, r) => {
    if (a.scope === 'admin') return true;
    const target = a.employees.find(e => e.id === r.employeeId);
    return entity === 'expenses' ? r.employeeId !== a.id && can(a.me,'finance.approve',a.catalog) : entity === 'reports' ? canReviewReport(a.me,r,target,a.employees,a.catalog) : canApproveFor(a.me,target,a.employees,a.catalog);
  };
  return [['leave',leave],['reports',reports],['expenses',expenses]].flatMap(([entity, rows]) => rows.filter(r => r.status === (entity === 'reports' ? 'submitted' : 'pending') && allowed(entity,r)).map(r => ({
    id:`${entity}:${r.id}`, title:entity === 'leave' ? `${r.type || 'Leave'} leave request` : entity === 'reports' ? 'Weekly report review' : 'Expense claim',
    person: a.scope === 'staff' ? a.employees.find(e=>e.id===r.employeeId)?.fullName || 'Colleague' : r.employeeName || 'Staff member',
    section:a.scope === 'staff' ? 'Approvals' : entity === 'leave' ? 'Leave Requests' : entity === 'reports' ? 'Weekly Reports' : 'Expenses',
    at:r.submittedAt || r.createdAt || '',
  })));
}

function inboxItem(id, category, title, body, at, target, dueDate = '') {
  return { id, category, title:text(title), body:text(body,500), at:at || '', target, dueDate, overdue:!!dueDate && dueDate < today(), token:fingerprint(JSON.stringify([id,title,body,at,dueDate])) };
}
export async function workspaceData(a) {
  const [allRequests, allProjects, state, native] = await Promise.all([listRecords('officeRequests'), listRecords('clientProjects'), get(`orionsoft:workspace:inbox:${a.key}`), existingApprovals(a)]);
  const requests = allRequests.filter(r=>seesRequest(a,r)).map(r=>requestView(a,r)).sort((x,y)=>y.createdAt.localeCompare(x.createdAt));
  const projects = allProjects.filter(p=>seesProject(a,p)).map(p=>projectView(a,p)).sort((x,y)=>y.updatedAt.localeCompare(x.updatedAt));
  const inbox = [];
  for (const r of requests) inbox.push(inboxItem(`request:${r.id}`, 'approvals', `${r.title} - ${r.status}`, `${r.employeeName}: ${r.decisionNotes || r.reason}`, r.decidedAt || r.createdAt, {tab:'approvals',id:r.id}, r.status === 'pending' ? r.dueDate : ''));
  for (const n of native) inbox.push(inboxItem(n.id,'approvals',n.title,n.person,n.at,{section:n.section}));
  for (const p of projects) {
    inbox.push(inboxItem(`project:${p.id}`,'projects',p.title,p.updates.at(-1)?.text || p.summary,p.updatedAt,{tab:'projects',id:p.id},!['completed','archived'].includes(p.status) ? p.dueDate : ''));
    for (const m of p.milestones.filter(m=>m.status === 'review')) inbox.push(inboxItem(`milestone:${p.id}:${m.id}`,'projects',`Ready for sign-off: ${m.title}`,p.title,m.updatedAt,{tab:'projects',id:p.id},m.dueDate));
  }
  if (a.scope === 'staff') {
    const [notifications,tasks] = await Promise.all([listNotifications(a.id,100),listRecords('tasks')]);
    for (const n of notifications.items || notifications.notifications || []) inbox.push(inboxItem(`notice:${n.id}`,'updates',n.title,n.body,n.at,{section:staffSection(n.link)}));
    for (const t of tasks.filter(t=>t.assigneeId === a.id && t.status !== 'done')) inbox.push(inboxItem(`task:${t.id}`,'tasks',t.title,t.description,t.updatedAt || t.createdAt,{section:'Tasks'},t.dueDate || ''));
  }
  if (a.scope === 'client' || a.scope === 'admin') {
    const tickets = (await listRecords('tickets')).filter(t=>a.scope === 'admin' ? !['closed','resolved'].includes(t.status) : email(t.clientEmail) === a.email);
    for (const t of tickets) { const comments=(t.comments||[]).filter(c=>!c.internal);const last=comments.at(-1);inbox.push(inboxItem(`ticket:${t.id}`,'support',t.subject,last?.text || t.description,t.updatedAt || t.createdAt,{section:a.scope === 'admin' ? 'Helpdesk' : 'Support'})); }
  }
  if (a.scope === 'applicant' || a.scope === 'admin') {
    const apps = (await listRecords('applicants')).filter(r=>a.scope === 'admin' ? r.unreadForAdmin || ['applied','interview'].includes(r.status) : email(r.email) === a.email && (!a.appIds || a.appIds.includes(r.id)));
    for (const r of apps) { const last=(r.messages||[]).filter(m=>!m.internal).at(-1); inbox.push(inboxItem(`application:${r.id}`,'applications',`${r.roleAppliedFor || 'Application'} - ${r.status}`,a.scope === 'admin' ? r.fullName : last?.text || 'Check your application for next steps.',r.updatedAt || r.createdAt,{section:a.scope === 'admin' ? 'Applicants' : 'Applications'})); }
  }
  const read = state?.read || {};
  const items = inbox.map(i=>({...i, read:read[i.id] === i.token})).sort((x,y)=>Number(x.read)-Number(y.read) || Number(y.overdue)-Number(x.overdue) || y.at.localeCompare(x.at));
  return {ok:true, identity:{name:a.name,scope:a.scope}, inbox:items, unread:items.filter(i=>!i.read).length, muted:state?.muted || [], requests, nativeApprovals:native, projects,
    people:a.scope === 'admin' ? (await listRecords('employees')).filter(e=>e.status === 'active').map(e=>({id:e.id,name:e.fullName})) : [],
    canCreateProject:a.scope === 'admin', canCreateRequest:a.scope === 'staff',
    approvers:a.scope === 'staff' ? a.employees.filter(e=>approversFor(a.me,a.employees,a.catalog).includes(e.id)).map(e=>e.fullName) : []};
}
function staffSection(link) {
  return ({tasks:'Tasks',meetings:'Meetings',approvals:'Approvals',leave:'Leave',expenses:'Expense Claims',messages:'Messages',reports:'Weekly Reports',queries:'Queries',profile:'My Profile',feed:'Office Feed'})[String(link||'').split(':')[0]] || 'Lobby';
}

// These mutations contain database work only. Serialising them also protects
// the shared JSON record indexes from concurrent add-to-index lost updates.
export async function workspaceMutation(a, b) {
  const owner = randomUUID(), lock='orionsoft:workspace:mutation-lock';
  if (!(await acquireLease(lock,owner,30))) fail(409,'Another office update is being saved. Please try again.');
  try { return await mutate(a,b); } finally { await releaseLease(lock,owner); }
}
async function mutate(a,b) {
  const now = new Date().toISOString();
  if (['read','preferences'].includes(b.action)) {
    const key=`orionsoft:workspace:inbox:${a.key}`, state=await get(key) || {read:{},muted:[]};
    if (b.action === 'read') {
      const current=(await workspaceData(a)).inbox;
      // Read only the versions actually displayed; a newer concurrent update
      // is never silently marked read by a stale browser.
      if (!Array.isArray(b.items) || b.items.length > 1000 || b.items.some(item=>!item || typeof item.id !== 'string' || typeof item.token !== 'string')) fail(400,'Choose inbox items to mark read.');
      for (const item of b.items) if (current.some(i=>i.id===item.id && i.token===item.token)) state.read[item.id]=item.token;
      const visible=new Set(current.map(i=>i.id));state.read=Object.fromEntries(Object.entries(state.read).filter(([id])=>visible.has(id)));
    } else {
      if (!Array.isArray(b.muted) || b.muted.some(c=>!['approvals','projects','updates','tasks','support','applications'].includes(c))) fail(400,'Choose valid inbox categories.');
      state.muted=[...new Set(b.muted)];
    }
    await set(key,state);return {ok:true};
  }
  if (b.action === 'request-create') {
    if (a.scope !== 'staff') fail(403,'Only staff can submit operational requests.');
    const title=text(b.title,160), reason=text(b.reason,3000);
    if (!title || !reason || !['access','equipment','purchase','other'].includes(b.category)) fail(400,'Add a title, category and reason.');
    const all=await listRecords('officeRequests');if(all.filter(r=>r.employeeId===a.id&&r.status==='pending').length>=50) fail(400,'You already have 50 pending requests. Resolve or cancel an existing request first.');
    const id=newId('req'), request={id,title,reason,category:b.category,employeeId:a.id,employeeName:a.name,dueDate:date(b.dueDate),status:'pending',createdAt:now,history:[{status:'pending',at:now,by:a.name}],decisionNotes:'',decidedAt:null};
    await putRecord('officeRequests',id,request);return {ok:true,id};
  }
  if (b.action === 'request-decide' || b.action === 'request-cancel') {
    const r=await getRecord('officeRequests',text(b.id));if(!r || !seesRequest(a,r)) fail(404,'Request not found.');
    if (r.status !== 'pending') fail(409,'This request has already been decided. Refresh to see its history.');
    if (b.action === 'request-cancel') { if(a.scope !== 'staff' || r.employeeId !== a.id) fail(403,'Only the requester can cancel.');r.status='cancelled'; }
    else { if(!canDecide(a,r)) fail(403,'You cannot approve your own request or requests outside your reporting line.');if(!['approved','rejected'].includes(b.status))fail(400,'Choose approve or decline.');if(!text(b.note,1000))fail(400,'Add a decision note for the requester.');r.status=b.status; }
    r.decisionNotes=text(b.note,1000);r.decidedAt=now;r.decidedBy=a.name;r.history.push({status:r.status,at:now,by:a.name,note:r.decisionNotes});await putRecord('officeRequests',r.id,r);return {ok:true};
  }
  if (b.action === 'project-create') {
    if (a.scope !== 'admin') fail(403,'Only administrators create client projects.');
    const contract=await getRecord('contracts',text(b.contractId));
    if(!contract || ['draft','cancelled'].includes(contract.status) || !email(contract.client?.email || contract.recipientEmail)) fail(400,'Choose an issued client contract.');
    const title=text(b.title,160);if(!title) fail(400,'Add a project title.');
    const members=await validMembers(b.memberIds);
    const id=newId('prj'), p={id,title,summary:text(b.summary,3000),clientEmail:email(contract.client?.email || contract.recipientEmail),contractId:contract.id,contractNumber:contract.number || '',memberIds:members,status:'draft',dueDate:date(b.dueDate),milestones:[],updates:[],version:1,createdAt:now,updatedAt:now};
    await putRecord('clientProjects',id,p);return {ok:true,id};
  }
  if (b.action === 'project-contracts') fail(405,'Use GET to load contracts.');
  if (['project-edit','milestone-add','milestone-update','milestone-review','project-comment'].includes(b.action)) {
    const p=await getRecord('clientProjects',text(b.id));if(!p || !seesProject(a,p)) fail(404,'Project not found.');
    if(b.version !== p.version) fail(409,'This project changed while you were viewing it. Refresh before saving.');
    const manager=managesProject(a,p);
    if (b.action !== 'project-comment' && b.action !== 'milestone-review' && !manager) fail(403,'Only the assigned delivery team can edit this project.');
    if (p.status === 'archived' && b.action !== 'project-edit') fail(409,'This project is archived.');
    let activity='';
    if(b.action === 'project-edit') {
      if(b.title !== undefined) { if(!text(b.title,160))fail(400,'Add a project title.');p.title=text(b.title,160); }
      if(b.summary !== undefined)p.summary=text(b.summary,3000);
      if(b.dueDate !== undefined)p.dueDate=date(b.dueDate);
      if(b.memberIds !== undefined) { if(a.scope !== 'admin')fail(403,'Only administrators change the delivery team.');p.memberIds=await validMembers(b.memberIds); }
      if(b.status !== undefined) {
        if(!['draft','active','on_hold','completed','archived'].includes(b.status))fail(400,'Choose a valid project status.');
        if(a.scope !== 'admin' && b.status !== p.status && (['draft','archived'].includes(b.status) || ['draft','archived'].includes(p.status)))fail(403,'Only administrators publish, hide or archive projects.');
        if(b.status==='completed' && (!p.milestones.length || p.milestones.some(m=>m.status!=='accepted')))fail(400,'Client sign-off is required for every milestone before completion.');
        p.status=b.status;
      }
      activity=`Project details updated (${p.status.replaceAll('_',' ')}).`;
    }
    if(b.action === 'milestone-add') {
      if(p.status==='completed')fail(409,'Reopen the project before adding delivery work.');
      if(p.milestones.length>=80)fail(400,'This project has reached its milestone limit.');
      const title=text(b.title,160);if(!title)fail(400,'Add a milestone title.');
      p.milestones.push({id:newId('ms'),title,description:text(b.description,2000),dueDate:date(b.dueDate),status:'planned',deliverableUrl:'',updatedAt:now,history:[]});activity=`Milestone added: ${title}`;
    }
    if(b.action === 'milestone-update' || b.action === 'milestone-review') {
      const m=p.milestones.find(m=>m.id===b.milestoneId);if(!m)fail(404,'Milestone not found.');
      if(b.action === 'milestone-review') {
        if(a.scope !== 'client' || email(p.clientEmail)!==a.email)fail(403,'Only the client can sign off a deliverable.');
        if(m.status !== 'review')fail(409,'This milestone is not awaiting client review.');
        if(!['accepted','changes_requested'].includes(b.status))fail(400,'Choose accept or request changes.');
        if(!text(b.note,1500))fail(400,'Add your sign-off or change request note.');
        m.status=b.status;
      } else {
        if(m.status==='accepted')fail(409,'Accepted milestones are locked. Add a new milestone for additional work.');
        if(!['planned','in_progress','review'].includes(b.status))fail(400,'Choose a delivery status. Client sign-off is recorded separately.');
        m.status=b.status;if(b.deliverableUrl!==undefined)m.deliverableUrl=httpsUrl(b.deliverableUrl);
        if(m.status==='review' && !m.deliverableUrl && !text(b.note,1500))fail(400,'Add a deliverable link or describe what the client should review.');
      }
      m.updatedAt=now;m.history.push({status:m.status,at:now,by:a.name || 'Client',note:text(b.note,1500)});activity=`${m.title}: ${m.status.replaceAll('_',' ')}${text(b.note,1500)?' - '+text(b.note,1500):''}`;
    }
    if(b.action==='project-comment') { activity=text(b.text,3000);if(!activity)fail(400,'Write an update or feedback.'); }
    if(p.updates.length>=1000)fail(400,'This project has reached its update limit. Contact the administrator to archive it.');
    p.updates.push({id:newId('up'),text:activity,by:a.name || (a.scope==='client'?'Client':'Team member'),fromClient:a.scope==='client',at:now});p.updatedAt=now;p.version++;await putRecord('clientProjects',p.id,p);return {ok:true};
  }
  fail(400,'Unknown workspace action.');
}
async function validMembers(value) {
  if(!Array.isArray(value) || value.length>30 || value.some(id=>typeof id !== 'string'))fail(400,'Choose up to 30 active team members.');
  const ids=[...new Set(value)], employees=await listRecords('employees');
  if(ids.some(id=>!employees.some(e=>e.id===id && e.status==='active')))fail(400,'Every assigned team member must have an active staff account.');
  return ids;
}

export async function projectContracts(a) {
  if(a.scope !== 'admin') return [];
  return (await listRecords('contracts')).filter(c=>!['draft','cancelled'].includes(c.status) && email(c.client?.email || c.recipientEmail)).map(c=>({id:c.id,number:c.number || c.id,title:c.title || '',clientEmail:email(c.client?.email || c.recipientEmail)}));
}
