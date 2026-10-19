import {useCallback,useEffect,useState} from 'react';
const card={background:'var(--ow-card,#111827)',border:'1px solid #334155',borderRadius:14,padding:18,marginBottom:16,color:'#e2e8f0'};
const button={padding:'8px 12px',borderRadius:8,border:'1px solid #64748b',background:'#1e293b',color:'#fff',cursor:'pointer'};
const date=value=>value?new Date(value).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'Not set';
export default function RenewalCenter(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[search,setSearch]=useState(''),[manager,setManager]=useState(''),[assigned,setAssigned]=useState([]),[busy,setBusy]=useState(false),[note,setNote]=useState('');
 const load=useCallback(async()=>{try{const r=await fetch('/api/admin/renewals',{cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error||'Renewal status unavailable');setData(j);setError('');}catch(e){setError(e.message);}},[]);
 useEffect(()=>{load();const t=setInterval(load,60000);return()=>clearInterval(t);},[load]);
 const clients=(data?.customers||[]).filter(c=>`${c.customer} ${c.product}`.toLowerCase().includes(search.toLowerCase()));
 async function save(){setBusy(true);setNote('');try{const r=await fetch('/api/admin/renewals',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminId:manager,licenseIds:assigned})});const j=await r.json();if(!r.ok)throw Error(j.error);setNote('Assigned clients updated. The access change takes effect immediately.');await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remind(id){setNote('');try{const r=await fetch('/api/admin/renewals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});const j=await r.json();if(!r.ok)throw Error(j.error);setNote(j.alreadyQueued?'A reminder is already queued for this client today.':'Reminder queued for the saved client billing email.');}catch(e){setError(e.message);}}
 return <section style={card} aria-label="Client renewal management">
  <div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}><div><h2 style={{margin:0}}>Client renewals</h2><p style={{fontSize:13,color:'#cbd5e1'}}>Live subscription status and saved-contact reminders. Verified payments update access automatically.</p></div><button style={button} onClick={load}>Refresh status</button></div>
  {error&&<p role="alert" style={{color:'#fda4af'}}>{error}</p>}
  {data?.sources?.some(s=>!s.available)&&<p role="status" style={{color:'#fde68a'}}>Some services are temporarily unavailable: {data.sources.filter(s=>!s.available).map(s=>s.name).join(', ')}. Their subscriptions are not shown as settled.</p>}
  {!data&&!error&&<p>Loading renewal status…</p>}
  {!data?.restricted&&data&&<div style={{border:'1px solid #475569',borderRadius:10,padding:14,margin:'12px 0'}}>
   <label>Assign clients to a Client &amp; Content Manager <select aria-label="Manager account" value={manager} onChange={e=>{setManager(e.target.value);setAssigned(data.managers.find(m=>m.id===e.target.value)?.assignments||[]);}} style={{display:'block',padding:9,maxWidth:'100%',marginTop:6}}><option value="">Choose a manager</option>{data.managers.map(m=><option key={m.id} value={m.id}>{m.name} ({m.status})</option>)}</select></label>
   <p style={{fontSize:13}}>Add this role in Users &amp; Roles, then select the client subscriptions below. An unassigned manager sees no clients. Managers cannot see prices, financial reports or payment settings.</p>
   {manager&&<button style={button} disabled={busy} onClick={save}>{busy?'Saving…':'Save assigned clients'}</button>}{note&&<p role="status">{note}</p>}
  </div>}
  <input aria-label="Search renewals" placeholder="Search client or product" value={search} onChange={e=>setSearch(e.target.value)} style={{boxSizing:'border-box',width:'100%',padding:11,borderRadius:8,margin:'10px 0 16px'}}/>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:12}}>
   {clients.map(c=><article key={c.id} style={{border:'1px solid #475569',borderRadius:12,padding:14,overflowWrap:'anywhere'}}>
    {manager&&!data.restricted&&<label style={{display:'block',marginBottom:10}}><input type="checkbox" checked={assigned.includes(c.id)} onChange={e=>setAssigned(a=>e.target.checked?[...a,c.id]:a.filter(id=>id!==c.id))}/> Assigned to selected manager</label>}
    <h3 style={{margin:'0 0 5px'}}>{c.customer}</h3><p style={{margin:'0 0 12px',color:'#cbd5e1'}}>{c.product}</p>
    <p>Paid through: <strong>{date(c.paid_through)}</strong></p>
    <p>{c.paid_through&&new Date(c.paid_through)<new Date()?'Renewal due':'Subscription status'}: {c.exception||c.status||c.payment_status||'Check subscription'}</p>
    <p style={{fontSize:13}}>Automatic renewal: {(c.automatic_renewal??c.recurring?.enabled)?'Customer approved':'Customer approval needed'}</p>
    {!data.restricted&&c.amount!=null&&<p>Agreed amount: {Number(c.amount).toLocaleString('en-NG')} {c.currency||'NGN'}</p>}
    {(c.can_remind||(!data.restricted&&c.billing_email&&c.renewal_url))&&<button style={button} onClick={()=>remind(c.id)}>Queue client reminder</button>}
    {!data.restricted&&c.renewal_url&&<div style={{display:'flex',flexWrap:'wrap',gap:8}}><a href={c.renewal_url} target="_blank" rel="noopener noreferrer" style={{...button,textDecoration:'none'}}>Open client renewal</a><button style={button} onClick={async()=>{try{await navigator.clipboard.writeText(c.renewal_url);setNote('Client renewal link copied.');}catch{setError('Copy is unavailable in this browser. Open the renewal link to copy its address.');}}}>Copy payment link</button></div>}
   </article>)}
  </div>
  {data&&clients.length===0&&<p>{data.restricted?'No assigned client subscriptions match. The owner can assign clients from this section.':'No subscriptions match. Configure each client’s agreed billing in the relevant product.'}</p>}
  {note&&<p role="status">{note}</p>}
 </section>;
}
