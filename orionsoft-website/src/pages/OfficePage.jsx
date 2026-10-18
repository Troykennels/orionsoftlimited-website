import '../components/office.css';
const portals = [
  ['Client portal','Contracts, invoices, receipts and support conversations, together in your account.','/client','Open client portal'],
  ['Staff Office','Your working day, tasks, meetings, messages, leave and personal records.','/staff','Open Staff Office'],
  ['Applicant portal','Track your application, prepare for interviews and talk to the recruiting team.','/applicant','Track my application'],
  ['Administration','Company operations, approvals, recruitment, content and finance. Authorised administrators only.','/admin','Open administration'],
];
export default function OfficePage(){return <section className="or-office-directory"><div className="or-office-directory-inner"><span className="or-office-label">ORION SOFT &middot; ONLINE OFFICE</span><h1>One company.<br/>Your own workspace.</h1><p>Choose where you work with Orion. Each portal keeps its own secure sign-in, so your records and conversations stay in the right place.</p><div className="or-office-portal-grid">{portals.map(([name,description,href,label])=><article className="or-office-portal" key={href}><h2>{name}</h2><p>{description}</p><a href={href}>{label} <span aria-hidden="true">&#8599;</span></a></article>)}</div><div className="or-office-directory-footer"><a href="/contact">Start a project</a><a href="/careers">Explore careers</a><a href="/support">Get help signing in</a></div></div></section>;}
