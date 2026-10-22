import { useEffect, useRef, useState } from 'react';
import './office.css';
import OfficeWorkspace from './OfficeWorkspace.jsx';
import FloatingOfficeLauncher from './FloatingOfficeLauncher.jsx';

const guides = {
  staff: ['Start in the Lobby to clock in and review your day.', 'Use Tasks, Meetings and Messages for daily work. Your menu shows the modules your role can access.', 'Leave, expenses and weekly reports stay in your office account. Keep it open while queued offline work synchronises.'],
  admin: ['Use the section finder to reach the right desk without scrolling through the menu.', 'Review approvals, applicant replies, support tickets and payment confirmations in their own desks.', 'Automation health shows recorded job attempts. A configured connection still needs a real delivery check.'],
  client: ['Find your contracts, invoices and receipts in one place.', 'Use Support for requests and replies so your conversation stays attached to your account.', 'Only use payment details shown on your official agreement or payment page.'],
  applicant: ['Your next step, interview and assessment details appear in your application.', 'Message the recruiting team or update your details without submitting a duplicate application.', 'Keep your application reference and sign-in links private.'],
};

export default function OfficeTools({ scope, allowWorkspace = true }) {
  const dialog = useRef(null), trigger = useRef(null), searchInput = useRef(null);
  const [items, setItems] = useState([]), [query, setQuery] = useState('');
  const [health, setHealth] = useState(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(`orion-office-pins:${scope}`) || '[]'); return Array.isArray(saved) ? saved.filter(value => typeof value === 'string').slice(0,12) : []; } catch { return []; }
  });
  function togglePin(label) {
    const next = pinned.includes(label) ? pinned.filter(item => item !== label) : [...pinned, label].slice(-12);
    setPinned(next); try { localStorage.setItem(`orion-office-pins:${scope}`, JSON.stringify(next)); } catch { /* optional preference; navigation still works */ }
  }
  function open() {
    const selector = scope === 'admin' ? 'aside button' : scope === 'staff' ? 'nav[aria-label="Staff Office"] button.so-nav-item' : 'main h2, h2[id^="client-"], [data-office-section]';
    const found = [...document.querySelectorAll(selector)].map(element => ({ element, label: element.dataset.officeSection || element.textContent.trim().replace(/\s+/g, ' ') })).filter(item => item.label && !/^sign\s*out$|^log\s*out$/i.test(item.label));
    setItems(found.filter((item,index) => found.findIndex(other => other.label === item.label) === index));
    setQuery(''); dialog.current.showModal(); requestAnimationFrame(() => searchInput.current?.focus());
  }
  function close() { dialog.current.close(); trigger.current?.focus(); }
  useEffect(() => {
    const shortcut = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!dialog.current.open) trigger.current?.click(); } };
    window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut);
  }, []);
  async function checkHealth() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/office-health', { cache:'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Office health is unavailable. Try again.');
      setHealth(data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <>
    <FloatingOfficeLauncher key={scope} scope={scope}>{allowWorkspace && <OfficeWorkspace scope={scope} />}<button className="or-office-trigger" ref={trigger} onClick={open} aria-haspopup="dialog">Office guide <span>Ctrl K</span></button></FloatingOfficeLauncher>
    <dialog className="or-office-dialog" ref={dialog} onKeyDownCapture={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }} onClose={() => trigger.current?.focus()} aria-labelledby={`office-title-${scope}`}>
      <div className="or-office-dialog-head"><div><small>YOUR ORION WORKSPACE</small><h2 id={`office-title-${scope}`}>Find your next step</h2></div><button onClick={close} aria-label="Close office guide">&times;</button></div>
      <div className="or-office-dialog-body">
        <label htmlFor={`office-search-${scope}`}>Find a section</label>
        <input ref={searchInput} id={`office-search-${scope}`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this workspace..." />
        <p className="or-office-pin-hint">Pin the sections you use most. Only shortcuts available in this account appear.</p>
        <div className="or-office-results">{items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())).sort((a,b) => Number(pinned.includes(b.label)) - Number(pinned.includes(a.label))).map(item => <div className="or-office-result" key={item.label}><button onClick={() => { close(); if (item.element.tagName === 'BUTTON') item.element.click(); else { item.element.scrollIntoView({behavior:'smooth',block:'start'}); item.element.setAttribute('tabindex','-1'); item.element.focus({preventScroll:true}); } }}>{item.label}<span aria-hidden="true">&#8599;</span></button><button className="or-office-pin" aria-label={`Pin ${item.label}`} aria-pressed={pinned.includes(item.label)} onClick={() => togglePin(item.label)}>{pinned.includes(item.label) ? '\u2605' : '\u2606'}</button></div>)}</div>
        {query && !items.some(item => item.label.toLowerCase().includes(query.toLowerCase())) && <p role="status">No section matches. Try another word or use the office directory below.</p>}
        <h3>Make the most of your office</h3><ul>{guides[scope].map(text => <li key={text}>{text}</li>)}</ul>
        {scope === 'admin' && allowWorkspace && items.length > 0 && <section><h3>Automation health</h3><button className="or-office-action" onClick={checkHealth} disabled={busy}>{busy ? 'Checking...' : 'Check office health'}</button>
          {error && <p role="alert">{error}</p>}
          {health && <div role="status"><p>Database: <strong>{health.database.status}</strong> &middot; {health.failed} recorded failed jobs</p><p>Connections configured: email {health.services.email ? 'yes' : 'no'}, payments {health.services.payments ? 'yes' : 'no'}, push {health.services.push ? 'yes' : 'no'}. Configuration does not confirm delivery.</p>
          {!health.jobs.length && <p>No job runs have been recorded yet. This is not a completed health check.</p>}
          {health.jobs.map(job => <div key={job.id} className="or-office-job"><strong>{job.name}</strong><span>{job.status}</span>{job.error && <p>{job.error}</p>}</div>)}</div>}
        </section>}
        <div className="or-office-links"><a href="/office">All Orion portals</a><a href="/support">Support centre</a><a href="/">Company website</a></div>
      </div>
    </dialog>
  </>;
}
