import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Code2, Layers, MonitorSmartphone, Settings2 } from 'lucide-react';
import './custom-software.css';

const kinds = [
  ['new-software', 'Build new software'], ['customise-product', 'Customise an Orion product'],
  ['website', 'Build a website or web app'], ['mobile-app', 'Build a mobile app'], ['integration', 'Connect or improve existing systems'],
];
const products = ['SchoolCore', 'SchoolCore Results & Fees', 'CareCore AI', 'ComplianceCore', 'Orion CRM', 'Directors Portal', 'Orion License Manager', 'StaffCore', 'Other / help me choose'];
const empty = { name: '', email: '', phone: '', company: '', projectKind: 'new-software', product: '', projectTitle: '', message: '', budget: '', timeline: '', website: '' };

export default function CustomSoftwarePage() {
  const [form, setForm] = useState(empty), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState('');
  const opened = useRef(0), confirmation=useRef(null), prefix = useId();
  useEffect(()=>{opened.current=Date.now();},[]);
  useEffect(()=>{if(result){confirmation.current?.focus({preventScroll:true});confirmation.current?.scrollIntoView({behavior:'smooth',block:'center'});}},[result]);
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const focusBrief = () => document.getElementById('project-brief')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ ...form, type: 'quote', requestCategory: 'software_customisation', product: form.projectKind === 'customise-product' ? form.product : kinds.find(([id]) => id === form.projectKind)[1], honeypot: form.website, timing: Date.now() - opened.current }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ref || data.ref === 'OK') throw Error(data.error || 'Your request could not be confirmed. Please try again.');
      setResult(data);
    } catch (failure) { setError(failure.name === 'TimeoutError' ? 'The connection timed out. Please contact us before resubmitting if you received a confirmation email.' : failure.message); }
    finally { setBusy(false); }
  }
  const field = (name, label, options = {}) => { const {wide,...inputOptions}=options;return <label className={wide ? 'cs-wide' : ''} htmlFor={`${prefix}-${name}`}><span>{label}{options.required && ' *'}</span><input id={`${prefix}-${name}`} name={name} value={form[name]} onChange={update} maxLength={options.maxLength || 180} {...inputOptions} /></label>; };
  return <div className="custom-software">
    <section className="cs-hero"><div className="cs-wrap cs-hero-grid"><div>
      <p className="cs-eyebrow">ORION SOFT LIMITED · CUSTOM DEVELOPMENT</p>
      <h1>Your business has its own way of working.<br /><em>Let’s build for it.</em></h1>
      <p className="cs-intro">Customise an Orion product or create something new. Tell us the workflows, people and goals your software needs to support.</p>
      <div className="cs-actions"><a className="cs-button" href="#project-brief" onClick={event => { event.preventDefault(); focusBrief(); }}>Start your project <ArrowRight size={18}/></a><a className="cs-button cs-secondary" href="https://wa.me/2348169577059?text=Hello%20Orion%20Soft%2C%20I%20would%20like%20to%20discuss%20a%20custom%20software%20project." target="_blank" rel="noreferrer">Discuss on WhatsApp</a></div>
      <p className="cs-small">Based in Lagos. Working with organisations in Nigeria and internationally.</p>
    </div><div className="cs-blueprint" aria-label="A project shaped around your organisation"><span className="cs-eyebrow">YOUR ORGANISATION</span><h2>One brief.<br/>A clear way forward.</h2><div>{[[Settings2,'Your workflows'],[Layers,'Your modules'],[MonitorSmartphone,'Your users'],[Code2,'Your integrations']].map(([Icon,label])=><span key={label}><Icon size={20}/>{label}</span>)}</div><p>Discovery → Scope & quotation → Design & build → Handover & support</p></div></div></section>
    <section className="cs-wrap cs-offers" aria-label="Ways we can help">{[
      [Settings2,'Customise a product','Adapt branding, reports, permissions, workflows or integrations in an Orion product.'],
      [Code2,'Build new software','Create a business system, customer portal or dashboard around your requirements.'],
      [MonitorSmartphone,'Websites & apps','Plan a website, web application or mobile app for the people you serve.'],
    ].map(([Icon,title,description])=><article key={title}><Icon size={26}/><h2>{title}</h2><p>{description}</p></article>)}</section>
    <section id="project-brief" className="cs-wrap cs-brief-grid"><aside><p className="cs-eyebrow">TELL US WHAT YOU NEED</p><h2>Start with your idea.<br/>We’ll help shape the brief.</h2><p>You don’t need a technical specification. Describe what happens today and what you would like to improve.</p><ol><li><strong>Send your brief</strong><span>Receive a reference number and a confirmation email.</span></li><li><strong>Talk through the details</strong><span>Our team contacts you to discuss scope, priorities and next steps.</span></li><li><strong>Agree a proposal</strong><span>Review the deliverables, timeline and quotation before work begins.</span></li></ol><p>Prefer email? <a href="mailto:orionsoftlimited@gmail.com">orionsoftlimited@gmail.com</a><br/>Call <a href="tel:+2348169577059">+234 816 957 7059</a></p></aside>
      <div className="cs-form-card">{result ? <div ref={confirmation} tabIndex={-1} role="status" className="cs-success"><CheckCircle2 size={42}/><h2>Your project request is registered.</h2><p>Thank you, {form.name}. Our team will contact you to discuss <strong>{form.projectTitle}</strong>.</p><p>Reference: <strong>{result.ref}</strong></p><p>{result.confirmationEmailSent ? `Your confirmation email has been sent to ${form.email}. Please check your inbox and spam folder.` : 'Your request is saved. We could not send the confirmation email just now; keep your reference number and contact us if you need assistance.'}</p><p>Sending a brief does not start a paid project. We’ll agree the scope and quotation with you first.</p><button className="cs-button cs-secondary" onClick={()=>{setResult(null);setForm(empty);opened.current=Date.now();}}>Start another request</button></div> : <form onSubmit={submit}>
        <h2>Your project brief</h2><p className="cs-required">Fields marked * are required.</p>
        <div className="cs-fields">{field('name','Full name',{required:true,autoComplete:'name'})}{field('email','Email address',{required:true,type:'email',autoComplete:'email'})}{field('phone','Phone / WhatsApp',{required:true,type:'tel',autoComplete:'tel',maxLength:40})}{field('company','Organisation',{required:true,autoComplete:'organization'})}
          <label className="cs-wide" htmlFor={`${prefix}-kind`}><span>What would you like us to do? *</span><select id={`${prefix}-kind`} name="projectKind" value={form.projectKind} onChange={update}>{kinds.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          {form.projectKind==='customise-product'&&<label className="cs-wide" htmlFor={`${prefix}-product`}><span>Which product? *</span><select id={`${prefix}-product`} name="product" value={form.product} onChange={update} required><option value="">Choose a product</option>{products.map(product=><option key={product}>{product}</option>)}</select></label>}
          {field('projectTitle','Project name or short description',{required:true,wide:true,maxLength:160})}
          <label className="cs-wide" htmlFor={`${prefix}-message`}><span>What should the software do? *</span><textarea id={`${prefix}-message`} name="message" value={form.message} onChange={update} required minLength={20} maxLength={4000} rows={6} placeholder="Describe your current process, the changes you need, who will use the software and any systems it should connect to."/></label>
          <label htmlFor={`${prefix}-budget`}><span>Budget range (optional)</span><select id={`${prefix}-budget`} name="budget" value={form.budget} onChange={update}>{['','Please advise','Under ₦500,000','₦500,000–₦2 million','₦2–₦10 million','Above ₦10 million'].map(value=><option key={value} value={value}>{value||'Choose a range'}</option>)}</select></label>
          <label htmlFor={`${prefix}-timeline`}><span>Preferred timeline (optional)</span><select id={`${prefix}-timeline`} name="timeline" value={form.timeline} onChange={update}>{['','As soon as practical','Within 1–3 months','Within 3–6 months','Planning ahead / flexible'].map(value=><option key={value} value={value}>{value||'Choose a timeline'}</option>)}</select></label>
        </div><div aria-hidden="true" style={{position:'absolute',left:-10000}}><label>Leave this empty<input name="website" value={form.website} onChange={update} tabIndex={-1} autoComplete="off"/></label></div>
        <p className="cs-small">By submitting, you agree that Orion Soft may contact you about this project. Read our <a href="/privacy">Privacy Policy</a>.</p>{error&&<p role="alert" className="cs-error">{error}</p>}<button className="cs-button" disabled={busy} type="submit">{busy?'Registering your request…':'Register project request'}{!busy&&<ArrowRight size={18}/>}</button>
      </form>}</div>
    </section>
  </div>;
}
