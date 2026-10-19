import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown, Clock3, Copy, RefreshCw, Search, ShieldCheck, Users, UserRoundPlus, X } from 'lucide-react';
import './admin-workspace.css';

const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
function status(client) {
  const raw = String(client.exception || client.payment_status || client.status || '').toLowerCase();
  if (/verif|pending|processing/.test(raw)) return { label: 'Checking payment', tone: 'blue', attention: true };
  if (/revoked|suspended|cancel/.test(raw)) return { label: raw.includes('cancel') ? 'Cancelled' : 'Access restricted', tone: 'rose', attention: true };
  const expired = client.paid_through && Date.parse(client.paid_through) < Date.now();
  if (raw.includes('trial')) return { label: expired ? 'Trial ended' : 'Trial', tone: expired ? 'amber' : 'blue', attention: !!expired };
  if (/grace/.test(raw)) return { label: 'Grace period', tone: 'amber', attention: true };
  if (expired || /past_due|expired|overdue/.test(raw)) return { label: 'Renewal due', tone: 'amber', attention: true };
  return { label: 'Active', tone: 'green', attention: false };
}
const automatic = client => !!(client.automatic_renewal ?? client.recurring?.enabled);

export default function RenewalCenter() {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [product, setProduct] = useState('all');
  const [assignmentOpen, setAssignmentOpen] = useState(false), [manager, setManager] = useState(''), [assigned, setAssigned] = useState([]);
  const [saving, setSaving] = useState(false), [refreshing, setRefreshing] = useState(false), [updated, setUpdated] = useState(null);
  const [notice, setNotice] = useState(''), [actions, setActions] = useState({});
  const inFlight = useRef(new Set());
  const loaded = useRef(false);
  const load = useCallback(async (silent = false) => {
    if (!silent) { setRefreshing(true); setNotice(''); }
    try {
      const response = await fetch('/api/admin/renewals', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Renewal status is unavailable. Please try again.');
      setData(result); setError(''); setUpdated(new Date());
      if (!silent && loaded.current) setNotice('Renewal status refreshed.');
      loaded.current = true;
    } catch (err) { setError(err.message); }
    finally { if (!silent) setRefreshing(false); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(() => load(true), 60000); return () => clearInterval(timer); }, [load]);
  const all = data?.customers || [];
  const clients = all.filter(client => `${client.customer} ${client.product}`.toLowerCase().includes(search.toLowerCase()) && (product === 'all' || client.product === product) && (filter === 'all' || (filter === 'attention' ? status(client).attention : automatic(client))));
  const products = [...new Set(all.map(client => client.product))].sort();
  function rowState(id, value) { setActions(current => ({ ...current, [id]: value })); }
  async function save() {
    if (saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/renewals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: manager, licenseIds: assigned }) });
      const result = await response.json(); if (!response.ok) throw Error(result.error || 'Assignments could not be saved.');
      setNotice('Assigned clients updated. The access change takes effect immediately.'); await load(true);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function remind(id) {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id); rowState(id, { pending: true });
    try {
      const response = await fetch('/api/admin/renewals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const result = await response.json(); if (!response.ok) throw Error(result.error || 'Reminder could not be queued. Please try again.');
      rowState(id, { queued: true, message: result.alreadyQueued ? 'A reminder is already queued for this client today.' : 'Reminder queued for the saved client billing email.' });
    } catch (err) { rowState(id, { error: true, message: err.message }); }
    finally { inFlight.current.delete(id); }
  }
  async function copy(client) {
    try { await navigator.clipboard.writeText(client.renewal_url); setActions(current => ({ ...current, [client.id]: { ...current[client.id], copied: true, message: 'Client renewal link copied.', error: false } })); }
    catch { setActions(current => ({ ...current, [client.id]: { ...current[client.id], error: true, message: 'Copy is unavailable. Open the renewal page to copy its address.' } })); }
  }
  const missing = data?.sources?.filter(source => !source.available) || [];
  return <section className="renewal-workspace" aria-label="Client renewal management">
    <header className="renewal-heading">
      <div><span className="admin-eyebrow">CLIENT OPERATIONS</span><h2>Client renewals</h2><p>Stay ahead of renewals. Keep every client connected.</p></div>
      <div className="renewal-heading-actions">
        {data && !data.restricted && <button className={`admin-action ${assignmentOpen ? 'is-selected' : ''}`} aria-expanded={assignmentOpen} aria-controls="renewal-assignments" onClick={() => setAssignmentOpen(open => !open)}><UserRoundPlus size={16} />Assign clients</button>}
        <button className="admin-action admin-action-primary" disabled={refreshing} aria-busy={refreshing} onClick={() => load()}><RefreshCw size={16} className={refreshing ? 'admin-spin' : ''} />{refreshing ? 'Refreshing…' : 'Refresh status'}</button>
      </div>
    </header>
    <div className="renewal-stats">
      {[{ label: data?.restricted ? 'Assigned clients' : 'Client subscriptions', value: all.length, icon: Users, tone: 'blue' }, { label: 'Need attention', value: all.filter(client => status(client).attention).length, icon: Clock3, tone: 'amber' }, { label: 'Automatic renewal approved', value: all.filter(automatic).length, icon: ShieldCheck, tone: 'green' }].map(({ label, value, icon: Icon, tone }) => <div className="renewal-stat" key={label}><span className={`renewal-stat-icon tone-${tone}`}><Icon size={19} /></span><div><strong>{data ? value : '—'}</strong><span>{label}</span></div></div>)}
    </div>
    {error && <div className="admin-notice is-error" role="alert">{error}<button className="admin-action" onClick={() => load()}>Try again</button></div>}
    {notice && <div className="admin-notice" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button className="admin-icon-button" aria-label="Dismiss confirmation" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {missing.length > 0 && <div className="admin-notice is-warning" role="status">Some services are unavailable: {missing.map(source => source.name).join(', ')}. Their subscriptions are not shown as settled.</div>}
    {data && !data.restricted && assignmentOpen && <div id="renewal-assignments" className="renewal-assignment">
      <div><h3>Delegate client follow-ups</h3><p>Choose a manager, then select their clients below. Financial details stay with the owner.</p></div>
      <div className="renewal-assignment-controls"><label>Client &amp; Content Manager<select aria-label="Manager account" value={manager} onChange={event => { setManager(event.target.value); setAssigned(data.managers.find(item => item.id === event.target.value)?.assignments || []); setNotice(''); }}><option value="">Choose a manager</option>{data.managers.map(item => <option key={item.id} value={item.id}>{item.name} ({item.status})</option>)}</select></label>
      {manager ? <button className="admin-action admin-action-primary" disabled={saving} aria-busy={saving} onClick={save}>{saving ? <RefreshCw size={16} className="admin-spin" /> : <Check size={16} />}{saving ? 'Saving…' : 'Save assigned clients'}<span className="renewal-count">{assigned.length}</span></button> : <span className="renewal-help">Create a manager account in Users &amp; Roles.</span>}</div>
    </div>}
    <div className="renewal-panel">
      <div className="renewal-toolbar"><div className="renewal-tabs" role="group" aria-label="Filter subscriptions">{[['all', 'All clients'], ['attention', 'Needs attention'], ['automatic', 'Automatic renewal']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'is-selected' : ''} onClick={() => setFilter(value)}>{label}{value === 'all' && <span>{all.length}</span>}</button>)}</div><span className="renewal-updated">{updated ? `Updated ${updated.toLocaleTimeString('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' })} WAT` : 'Connecting to your services'}</span></div>
      <div className="renewal-search-row"><label className="renewal-search"><Search size={17} /><input type="search" aria-label="Search renewals" placeholder="Search client or product" value={search} onChange={event => setSearch(event.target.value)} /></label><label className="renewal-product"><span className="admin-sr-only">Product</span><select aria-label="Filter by product" value={product} onChange={event => setProduct(event.target.value)}><option value="all">All products</option>{products.map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label></div>
      <div className="renewal-list-heading" aria-hidden="true"><span>CLIENT / PRODUCT</span><span>SUBSCRIPTION</span><span>AUTOMATIC RENEWAL</span><span>ACTIONS</span></div>
      {!data && !error && <div className="renewal-empty" role="status"><RefreshCw size={24} className="admin-spin" /><h3>Loading your subscriptions</h3><p>Checking the latest status across your services.</p></div>}
      <div role="list" className="renewal-list">{clients.map(client => {
        const state = status(client), action = actions[client.id] || {};
        return <article key={client.id} role="listitem" className="renewal-row">
          <div className="renewal-client">{assignmentOpen && manager && !data.restricted && <label className="renewal-select-client"><input type="checkbox" aria-label="Assigned to selected manager" checked={assigned.includes(client.id)} onChange={event => setAssigned(current => event.target.checked ? [...current, client.id] : current.filter(id => id !== client.id))} /><span className="admin-sr-only">Assign {client.customer}</span></label>}<div className="renewal-client-details"><h3>{client.customer}</h3><p>{client.product}</p>{!data.restricted && client.amount != null && <span className="renewal-amount">{Number(client.amount).toLocaleString('en-NG')} {client.currency || 'NGN'}<span> / agreed billing</span></span>}</div></div>
          <div className="renewal-subscription"><span className={`renewal-badge tone-${state.tone}`}><i />{state.label}</span><span className="renewal-date">Paid through <strong>{date(client.paid_through)}</strong></span></div>
          <div className="renewal-auto">{automatic(client) ? <><span className="renewal-auto-approved"><CheckCircle2 size={15} />Approved</span><small>Verified payments renew access</small></> : <><span className="renewal-auto-waiting"><Clock3 size={15} />Awaiting approval</span><small>Client consent required</small></>}</div>
          <div className="renewal-actions">{(client.can_remind || (!data.restricted && client.billing_email && client.renewal_url)) && <button className={`admin-action renewal-remind ${action.queued ? 'is-complete' : ''}`} disabled={action.pending || action.queued} aria-label="Queue client reminder" aria-busy={!!action.pending} onClick={() => remind(client.id)}>{action.pending ? <RefreshCw size={14} className="admin-spin" /> : action.queued ? <Check size={14} /> : <Bell size={14} />}{action.pending ? 'Queuing…' : action.queued ? 'Queued today' : 'Queue client reminder'}</button>}
            {!data.restricted && client.renewal_url && <div className="renewal-secondary-actions"><a href={client.renewal_url} target="_blank" rel="noopener noreferrer" className="renewal-link" aria-label="Open client renewal">Renewal page<ArrowUpRight size={13} /></a><button className="renewal-copy" onClick={() => copy(client)} aria-label="Copy payment link">{action.copied ? <Check size={14} /> : <Copy size={14} />}{action.copied ? 'Copied' : 'Copy link'}</button></div>}
            {action.message && <p className={`renewal-row-message ${action.error ? 'is-error' : ''}`} role={action.error ? 'alert' : 'status'}>{action.message}</p>}
          </div>
        </article>;
      })}</div>
      {data && clients.length === 0 && <div className="renewal-empty"><Search size={26} /><h3>{all.length ? 'No matching subscriptions' : data.restricted ? 'No clients assigned yet' : 'No subscriptions yet'}</h3><p>{all.length ? 'Try another search or change your filters.' : data.restricted ? 'The owner can assign clients from this section.' : 'Configure client billing in the relevant product to see it here.'}</p>{all.length > 0 && <button className="admin-action" onClick={() => { setSearch(''); setFilter('all'); setProduct('all'); }}>Clear filters</button>}</div>}
      {data && <footer className="renewal-footer"><span>{clients.length} of {all.length} subscriptions</span><span><ShieldCheck size={13} />Access updates after verified payment</span></footer>}
    </div>
  </section>;
}
