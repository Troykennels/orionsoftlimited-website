import { useCallback, useEffect, useRef, useState } from 'react';
import './workspace.css';

const labels = {approvals:'Approvals',projects:'Projects',updates:'Office updates',tasks:'Tasks',support:'Support',applications:'Applications'};
const pretty = value => String(value || '').replaceAll('_',' ');
const stamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : '';
function Field({label, children}) { return <label className="ow-field"><span>{label}</span>{children}</label>; }
function Empty({children}) { return <div className="ow-empty">{children}</div>; }
function Status({value}) { return <span className={`ow-status ow-status-${value}`}>{pretty(value)}</span>; }

export default function OfficeWorkspace({scope}) {
  const dialog=useRef(null), trigger=useRef(null), fetching=useRef(false), heading=useRef(null);
  const [opened,setOpened]=useState(false),[tab,setTab]=useState('inbox'),[data,setData]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[focusId,setFocusId]=useState(''),[synced,setSynced]=useState('');
  const load=useCallback(async()=>{
    if(fetching.current)return false;
    fetching.current=true;setLoading(true);
    try { const response=await fetch(`/api/workspace?scope=${scope}`,{cache:'no-store'});const result=await response.json();if(!response.ok){if([401,403].includes(response.status))setData(null);throw Error(result.error || 'Could not load the office hub.');}setData(result);setSynced(new Date().toISOString());return true; }
    catch(err){setError(err.message);return false;}finally{fetching.current=false;setLoading(false);}
  },[scope]);
  useEffect(()=>{
    if(!opened)return undefined;
    const refresh=()=>{if(!document.hidden)load();};const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[opened,load]);
  useEffect(()=>{
    if(!focusId || !data)return;
    const element=[...dialog.current.querySelectorAll('[data-workspace-id]')].find(el=>el.dataset.workspaceId===focusId);
    if(element){element.scrollIntoView({block:'start',behavior:'smooth'});element.focus({preventScroll:true});}
  },[focusId,tab,data]);
  function open(){setError('');setNotice('');setOpened(true);dialog.current.showModal();load();requestAnimationFrame(()=>heading.current?.focus());}
  function close(){dialog.current.close();setOpened(false);trigger.current?.focus();}
  async function save(body) {
    if(busy)return false;setBusy(true);setError('');setNotice('');
    try {const response=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,scope})});const result=await response.json();if(!response.ok){if([401,403].includes(response.status))setData(null);if(response.status===409)await load();throw Error(result.error || 'Could not save your update.');}setNotice(body.action==='read'?'Inbox updated.':'Saved successfully.');await load();return true;}
    catch(err){setError(err.message);return false;}finally{setBusy(false);}
  }
  function jump(target){
    if(target.tab){setTab(target.tab);setFocusId(target.id || '');return;}
    const selector=scope==='admin'?'aside button':scope==='staff'?'nav[aria-label="Staff Office"] button.so-nav-item':'h2, [data-office-section]';
    const element=[...document.querySelectorAll(selector)].find(el=>el.textContent.trim().replace(/\s+/g,' ').startsWith(target.section));
    if(element){close();if(element.tagName==='BUTTON')element.click();else {element.scrollIntoView({behavior:'smooth'});element.setAttribute('tabindex','-1');element.focus({preventScroll:true});}}
    else if(scope==='applicant'){close();window.scrollTo({top:0,behavior:'smooth'});}
    else setError(`Open ${target.section} from your portal menu to continue.`);
  }
  const tabs=['inbox',...(['admin','staff'].includes(scope)?['approvals']:[]),...(scope!=='applicant'?['projects']:[])];
  return <>
    <button ref={trigger} className="ow-launch" onClick={open} aria-haspopup="dialog">Office hub {data?.unread>0&&<span aria-label={`${data.unread} unread items`}>{data.unread}</span>}</button>
    <dialog className="ow-dialog" ref={dialog} aria-labelledby={`workspace-title-${scope}`} onCancel={event=>{event.preventDefault();close();}} onClose={()=>{setOpened(false);trigger.current?.focus();}}>
      <header className="ow-header"><div><small>ORION ONLINE OFFICE</small><h2 id={`workspace-title-${scope}`} ref={heading} tabIndex={-1}>Everything that moves work forward</h2><p>{scope==='client'?'Your delivery team, milestones and feedback in one place.':scope==='applicant'?'Your application updates, together.':'A clear view of updates, decisions and client delivery.'}</p></div><button className="ow-close" onClick={close} aria-label="Close office hub">&times;</button></header>
      <nav className="ow-tabs" aria-label="Office hub sections">{tabs.map(t=><button key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);setFocusId('');setNotice('');}}>{t==='inbox'?'Inbox':t==='approvals'?'Approval centre':'Project workspace'}{t==='inbox'&&data?.unread>0&&<span>{data.unread}</span>}</button>)}<button className="ow-refresh" disabled={loading||busy} onClick={()=>{setError('');load();}}>{loading?'Refreshing...':'Refresh'}</button></nav>
      <div className="ow-body" aria-busy={loading||busy}>
        {error&&<div className="ow-alert" role="alert">{error}{data&&' Your last loaded information is shown.'}</div>}
        {notice&&<p className="ow-notice" role="status">{notice}</p>}
        {!data ? <Empty>{loading?'Loading your office...':<>Your office is unavailable. <button onClick={()=>{setError('');load();}} disabled={loading}>Try again</button></>}</Empty> : <>
          <div className="ow-summary"><span>Welcome{data.identity.name?`, ${data.identity.name}`:''}</span><small>Updated {stamp(synced)} &middot; refreshes each minute while open</small></div>
          {tab==='inbox'&&<Inbox data={data} busy={busy} save={save} jump={jump}/>}
          {tab==='approvals'&&<Approvals data={data} busy={busy} save={save} jump={jump}/>}
          {tab==='projects'&&<Projects data={data} busy={busy} save={save} scope={scope}/>}
        </>}
      </div>
    </dialog>
  </>;
}

function Inbox({data,busy,save,jump}) {
  const [filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[unreadOnly,setUnreadOnly]=useState(false),[settings,setSettings]=useState(false);
  const categories=[...new Set(data.inbox.map(i=>i.category))];
  const visible=data.inbox.filter(i=>!data.muted.includes(i.category)&&(filter==='all'||i.category===filter)&&(!unreadOnly||!i.read)&&`${i.title} ${i.body}`.toLowerCase().includes(query.toLowerCase()));
  return <section aria-label="Unified inbox">
    <div className="ow-section-heading"><div><h3>Your attention, in one place</h3><p>Reading an item does not complete its task or approve its request.</p></div><button onClick={()=>setSettings(!settings)} aria-expanded={settings}>Inbox preferences</button></div>
    {settings&&<div className="ow-card ow-preferences"><h4>Categories shown in this inbox</h4><p>These settings only filter this hub. Existing email, phone and staff-bell settings stay in their own notification controls.</p>{Object.entries(labels).map(([key,label])=><label key={key}><input type="checkbox" checked={!data.muted.includes(key)} disabled={busy} onChange={()=>save({action:'preferences',muted:data.muted.includes(key)?data.muted.filter(c=>c!==key):[...data.muted,key]})}/>{label}</label>)}</div>}
    <div className="ow-toolbar"><input aria-label="Search inbox" type="search" placeholder="Search your updates..." value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Inbox category" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c} value={c}>{labels[c]}</option>)}</select><label className="ow-check"><input type="checkbox" checked={unreadOnly} onChange={e=>setUnreadOnly(e.target.checked)}/>Unread only</label><button disabled={busy||!visible.some(i=>!i.read)} onClick={()=>save({action:'read',items:visible.filter(i=>!i.read).map(({id,token})=>({id,token}))})}>Mark shown as read</button></div>
    {!visible.length?<Empty>{data.inbox.length?'No updates match these filters.':'You are up to date. New work and replies will appear here.'}</Empty>:<div className="ow-list">{visible.map(item=><article key={item.id} className={`ow-card ow-inbox-item ${item.read?'':'ow-unread'}`}><div><div className="ow-meta"><span>{labels[item.category]}</span>{!item.read&&<strong>Unread</strong>}{item.overdue&&<strong className="ow-overdue">Overdue</strong>}<time>{stamp(item.at)}</time></div><h4>{item.title}</h4><p>{item.body}</p>{item.dueDate&&<small>Due {item.dueDate}</small>}</div><div className="ow-actions"><button onClick={()=>jump(item.target)}>Open</button>{!item.read&&<button disabled={busy} onClick={()=>save({action:'read',items:[{id:item.id,token:item.token}]})}>Mark read</button>}</div></article>)}</div>}
  </section>;
}

function Approvals({data,busy,save,jump}) {
  const [view,setView]=useState('pending'),[create,setCreate]=useState(false);
  const rows=data.requests.filter(r=>view==='history'?r.status!=='pending':view==='mine'?data.identity.scope==='staff'&&!r.canDecide:r.status==='pending');
  return <section aria-label="Approval centre"><div className="ow-section-heading"><div><h3>Decisions with a clear history</h3><p>Operational requests follow the current reporting line, with administrators available as a fallback.</p></div>{data.canCreateRequest&&<button className="ow-primary" onClick={()=>setCreate(!create)} aria-expanded={create}>New request</button>}</div>
    {create&&<RequestForm busy={busy} save={save} onDone={()=>setCreate(false)} approvers={data.approvers}/>}
    {data.nativeApprovals.length>0&&<div className="ow-card"><h4>Existing approvals waiting ({data.nativeApprovals.length})</h4><p>Leave, reports and expenses keep their established review process. Open the original desk to see the full record and decide.</p><div className="ow-native">{data.nativeApprovals.map(n=><button key={n.id} onClick={()=>jump({section:n.section})}><strong>{n.title}</strong><span>{n.person}</span><small>Open {n.section} &rarr;</small></button>)}</div></div>}
    <div className="ow-toolbar">{[['pending','Pending'],['mine','My requests'],['history','Decision history']].filter(([id])=>id!=='mine'||data.identity.scope==='staff').map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div>
    {!rows.length?<Empty>No operational requests in this view.</Empty>:<div className="ow-list">{rows.map(r=><RequestCard key={r.id} request={r} busy={busy} save={save}/>)}</div>}
  </section>;
}
function RequestForm({busy,save,onDone,approvers}) {
  async function submit(event){event.preventDefault();const form=new FormData(event.currentTarget);if(await save({action:'request-create',...Object.fromEntries(form)}))onDone();}
  return <form className="ow-card ow-form" onSubmit={submit}><h4>New operational request</h4><p>Reviewer: {approvers.length?approvers.join(', '):'Company administrator'}. Approval here records a decision; it does not make a payment or change system access automatically.</p><div className="ow-grid"><Field label="Title"><input name="title" required maxLength={160}/></Field><Field label="Category"><select name="category"><option value="access">System access</option><option value="equipment">Equipment</option><option value="purchase">Purchase authorisation</option><option value="other">Other</option></select></Field><Field label="Decision needed by (optional)"><input name="dueDate" type="date"/></Field></div><Field label="Reason and expected outcome"><textarea name="reason" required rows={3} maxLength={3000}/></Field><button className="ow-primary" disabled={busy}>Submit request</button></form>;
}
function RequestCard({request:r,busy,save}) {
  const [note,setNote]=useState('');
  return <article className="ow-card" data-workspace-id={r.id} tabIndex={-1}><div className="ow-section-heading"><h4>{r.title}</h4><Status value={r.status}/></div><div className="ow-meta"><span>{r.employeeName}</span><span>{pretty(r.category)}</span><time>{stamp(r.createdAt)}</time>{r.dueDate&&<span className={r.status==='pending'&&r.dueDate<new Date().toISOString().slice(0,10)?'ow-overdue':''}>Decision due {r.dueDate}</span>}</div><p className="ow-preserve">{r.reason}</p>
    {r.canDecide&&<form className="ow-form" onSubmit={async e=>{e.preventDefault();const status=e.nativeEvent.submitter?.value;if(status&&await save({action:'request-decide',id:r.id,status,note}))setNote('');}}><Field label="Decision note"><textarea required maxLength={1000} rows={2} value={note} onChange={e=>setNote(e.target.value)}/></Field><div className="ow-actions"><button className="ow-primary" name="decision" value="approved" disabled={busy}>Approve request</button><button name="decision" value="rejected" disabled={busy}>Decline request</button></div></form>}
    {r.canCancel&&<button disabled={busy} onClick={()=>save({action:'request-cancel',id:r.id,note:'Cancelled by requester.'})}>Cancel my request</button>}
    <details><summary>Request history</summary><ol className="ow-history">{r.history.map((h,i)=><li key={i}><strong>{pretty(h.status)}</strong> by {h.by} &middot; {stamp(h.at)}{h.note&&<p>{h.note}</p>}</li>)}</ol></details>
  </article>;
}

function Projects({data,busy,save,scope}) {
  const [create,setCreate]=useState(false),[filter,setFilter]=useState('current');
  const projects=data.projects.filter(p=>filter==='all'||p.status!=='archived');
  return <section aria-label="Client project workspace"><div className="ow-section-heading"><div><h3>A shared view of delivery</h3><p>{scope==='client'?'Review milestones, open deliverables and give your delivery team feedback.':'Projects are connected to issued client contracts. Drafts stay private until published.'}</p></div>{data.canCreateProject&&<button className="ow-primary" onClick={()=>setCreate(!create)} aria-expanded={create}>New project</button>}</div>
    {create&&<ProjectCreate data={data} busy={busy} save={save} onDone={()=>setCreate(false)}/>}
    <div className="ow-toolbar"><label className="ow-check"><input type="checkbox" checked={filter==='all'} onChange={e=>setFilter(e.target.checked?'all':'current')}/>Include archived projects</label></div>
    {!projects.length?<Empty>{scope==='client'?'Your delivery team has not published a project workspace for this account yet. Your existing contracts and support remain in your client portal.':'No projects in this view. Administrators can create one from an issued client contract and assign its delivery team.'}</Empty>:<div className="ow-list">{projects.map(p=><ProjectCard key={p.id} project={p} data={data} busy={busy} save={save} scope={scope}/>)}</div>}
  </section>;
}
function Members({people,selected=[]}) { return <Field label="Delivery team (hold Ctrl or Cmd to select several)"><select multiple name="memberIds" defaultValue={selected} size={Math.min(5,Math.max(2,people.length))}>{people.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>; }
function ProjectCreate({data,busy,save,onDone}) {
  async function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);if(await save({action:'project-create',title:f.get('title'),summary:f.get('summary'),contractId:f.get('contractId'),dueDate:f.get('dueDate'),memberIds:f.getAll('memberIds')}))onDone();}
  return <form className="ow-card ow-form" onSubmit={submit}><h4>Create a client project</h4>{!data.contracts.length&&<p>Create or issue a client contract in Contracts before adding a project.</p>}<div className="ow-grid"><Field label="Project title"><input name="title" required maxLength={160}/></Field><Field label="Issued client contract"><select name="contractId" required defaultValue=""><option value="" disabled>Choose a contract</option>{data.contracts.map(c=><option key={c.id} value={c.id}>{c.number} - {c.clientEmail}</option>)}</select></Field><Field label="Target date (optional)"><input type="date" name="dueDate"/></Field></div><Field label="Client-facing summary"><textarea name="summary" rows={3} maxLength={3000}/></Field><Members people={data.people}/><p>The project starts as a draft. Add milestones and set it to active when ready for the client.</p><button className="ow-primary" disabled={busy||!data.contracts.length}>Create draft project</button></form>;
}
function ProjectCard({project:p,data,busy,save,scope}) {
  const [edit,setEdit]=useState(false),[add,setAdd]=useState(false),[feedback,setFeedback]=useState(''),[allUpdates,setAllUpdates]=useState(false);
  const accepted=p.milestones.filter(m=>m.status==='accepted').length;
  const mutate=body=>save({id:p.id,version:p.version,...body});
  return <article className="ow-card ow-project" data-workspace-id={p.id} tabIndex={-1}>
    <div className="ow-section-heading"><div><div className="ow-meta"><span>{p.contractNumber || 'Client project'}</span>{p.clientEmail&&<span>{p.clientEmail}</span>}</div><h4>{p.title}</h4></div><Status value={p.status}/></div><p className="ow-preserve">{p.summary}</p><div className="ow-progress"><progress value={accepted} max={p.milestones.length||1} aria-label="Milestones accepted by client"/><span>{accepted} / {p.milestones.length} milestones accepted{p.dueDate?` - target ${p.dueDate}`:''}</span></div>
    {p.canManage&&<div className="ow-actions"><button onClick={()=>setEdit(!edit)} aria-expanded={edit}>Project settings</button>{!['completed','archived'].includes(p.status)&&<button onClick={()=>setAdd(!add)} aria-expanded={add}>Add milestone</button>}</div>}
    {edit&&<ProjectEdit key={`${p.id}:${p.version}`} p={p} data={data} busy={busy} mutate={mutate} scope={scope} onDone={()=>setEdit(false)}/>}
    {add&&<form className="ow-form ow-inset" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(await mutate({action:'milestone-add',...Object.fromEntries(f)}))setAdd(false);}}><h5>New milestone</h5><div className="ow-grid"><Field label="Milestone title"><input name="title" required maxLength={160}/></Field><Field label="Due date (optional)"><input type="date" name="dueDate"/></Field></div><Field label="What will be delivered"><textarea name="description" maxLength={2000} rows={2}/></Field><button className="ow-primary" disabled={busy}>Add milestone</button></form>}
    <h5>Delivery milestones</h5>{!p.milestones.length?<p>No milestones added yet.</p>:<div className="ow-milestones">{p.milestones.map(m=><Milestone key={`${m.id}:${m.updatedAt}`} m={m} manager={p.canManage} scope={scope} archived={['completed','archived'].includes(p.status)} busy={busy} mutate={mutate}/>)}</div>}
    <h5>Shared updates and feedback</h5><p className="ow-hint">Everything posted here is visible to the client and assigned delivery team. Keep internal notes in the staff task board.</p>
    {!p.updates.length?<p>No updates yet.</p>:<ol className="ow-timeline">{(allUpdates?p.updates:p.updates.slice(-12)).map(u=><li key={u.id}><div className="ow-meta"><strong>{u.by}{u.fromClient?' (client)':''}</strong><time>{stamp(u.at)}</time></div><p className="ow-preserve">{u.text}</p></li>)}</ol>}{p.updates.length>12&&<button onClick={()=>setAllUpdates(!allUpdates)}>{allUpdates?'Show recent updates':`Show all ${p.updates.length} updates`}</button>}
    {p.status!=='archived'&&<form className="ow-form" onSubmit={async e=>{e.preventDefault();if(await mutate({action:'project-comment',text:feedback}))setFeedback('');}}><Field label={scope==='client'?'Your feedback':'Client-facing update'}><textarea required maxLength={3000} rows={2} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Write an update or ask a question..."/></Field><button className="ow-primary" disabled={busy}>Post {scope==='client'?'feedback':'update'}</button></form>}
  </article>;
}
function ProjectEdit({p,data,busy,mutate,scope,onDone}) {
  async function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);if(await mutate({action:'project-edit',title:f.get('title'),summary:f.get('summary'),dueDate:f.get('dueDate'),status:f.get('status'),...(scope==='admin'?{memberIds:f.getAll('memberIds')}:{})}))onDone();}
  return <form className="ow-form ow-inset" onSubmit={submit}><h5>Project settings</h5><div className="ow-grid"><Field label="Title"><input required name="title" defaultValue={p.title} maxLength={160}/></Field><Field label="Project status"><select name="status" defaultValue={p.status}>{['draft','active','on_hold','completed','archived'].filter(s=>scope==='admin'||!['draft','archived'].includes(s)||s===p.status).map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></Field><Field label="Target date"><input type="date" name="dueDate" defaultValue={p.dueDate}/></Field></div><Field label="Client-facing summary"><textarea name="summary" rows={3} maxLength={3000} defaultValue={p.summary}/></Field>{scope==='admin'&&<Members people={data.people} selected={p.memberIds}/>}<p>Completing a project requires client acceptance of every milestone.</p><button className="ow-primary" disabled={busy}>Save project settings</button></form>;
}
function Milestone({m,manager,scope,archived,busy,mutate}) {
  const [status,setStatus]=useState(m.status==='changes_requested'?'in_progress':m.status),[url,setUrl]=useState(m.deliverableUrl||''),[note,setNote]=useState(''),[expanded,setExpanded]=useState(false);
  return <section className="ow-milestone"><div className="ow-section-heading"><h5>{m.title}</h5><Status value={m.status}/></div><p className="ow-preserve">{m.description}</p>{m.dueDate&&<small>Due {m.dueDate}</small>}{m.deliverableUrl&&<p><a href={m.deliverableUrl} target="_blank" rel="noopener noreferrer">Open deliverable &nearr;</a></p>}
    {manager&&!archived&&m.status!=='accepted'&&<><button onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>Update milestone</button>{expanded&&<form className="ow-form" onSubmit={async e=>{e.preventDefault();if(await mutate({action:'milestone-update',milestoneId:m.id,status,deliverableUrl:url,note}))setExpanded(false);}}><Field label="Delivery status"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="review">Ready for client sign-off</option></select></Field><Field label="Deliverable link (HTTPS, optional)"><input type="url" value={url} onChange={e=>setUrl(e.target.value)} maxLength={1800} placeholder="https://..."/></Field><Field label="Review instructions or delivery note"><textarea rows={2} maxLength={1500} value={note} onChange={e=>setNote(e.target.value)}/></Field><button className="ow-primary" disabled={busy}>Save milestone</button></form>}</>}
    {scope==='client'&&m.status==='review'&&!archived&&<form className="ow-form" onSubmit={async e=>{e.preventDefault();const decision=e.nativeEvent.submitter?.value;if(decision)await mutate({action:'milestone-review',milestoneId:m.id,status:decision,note});}}><Field label="Sign-off or change request note"><textarea required rows={2} maxLength={1500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Confirm acceptance or describe the changes you need."/></Field><div className="ow-actions"><button className="ow-primary" value="accepted" disabled={busy}>Accept deliverable</button><button value="changes_requested" disabled={busy}>Request changes</button></div></form>}
    {m.history.length>0&&<details><summary>Milestone history ({m.history.length})</summary><ol className="ow-history">{m.history.map((h,i)=><li key={i}><strong>{pretty(h.status)}</strong> by {h.by} &middot; {stamp(h.at)}{h.note&&<p>{h.note}</p>}</li>)}</ol></details>}
  </section>;
}
