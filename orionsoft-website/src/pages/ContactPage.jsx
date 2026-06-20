import { useState, useEffect, useRef } from "react";

// ─── Design tokens (self-contained for lazy-load isolation) ──────────────────
const C = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(200,168,80,0.35)",
  heading: "#F2F6FF", text: "#C8D0E0", textMuted: "#6B7A96",
  gold: "#C8A850", goldDim: "rgba(200,168,80,0.12)", goldGlow: "rgba(200,168,80,0.22)",
  blue: "#4F8EF7", blueDim: "rgba(79,142,247,0.12)", blueGlow: "rgba(79,142,247,0.22)",
  mint: "#10B981", mintDim: "rgba(16,185,129,0.12)",
  purple: "#8B5CF6", purpleDim: "rgba(139,92,246,0.12)",
  amber: "#F59E0B", amberDim: "rgba(245,158,11,0.12)",
  rose: "#F43F5E", roseDim: "rgba(244,63,94,0.12)",
  cyan: "#06B6D4", cyanDim: "rgba(6,182,212,0.12)",
  accent: "#4F8EF7", accentDim: "rgba(79,142,247,0.12)",
  success: "#10B981", danger: "#F43F5E",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";

// ─── Constants ───────────────────────────────────────────────────────────────
const ADMIN_PHONE = "08169577059";
const ADMIN_EMAIL = "orionsoftlimited@gmail.com";
const WHATSAPP_NUMBER = "2348169577059";
const LEADS_KEY = "orionsoft_leads_v1";

const PRODUCTS = [
  { id: "carecore", label: "CareCore — Hospital Management" },
  { id: "schoolcore", label: "SchoolCore — School Management" },
  { id: "compliancecore", label: "ComplianceCore — Compliance & Risk" },
  { id: "inventorycore", label: "InventoryCore — Inventory & Supply Chain" },
  { id: "financecore", label: "FinanceCore — Finance & Accounting" },
  { id: "hrcore", label: "HRCore — Human Resources" },
  { id: "churchcore", label: "ChurchCore — Church Management" },
  { id: "fleetcore", label: "FleetCore — Fleet Management" },
  { id: "telehealth", label: "TeleHealth — Telemedicine (2026)" },
];

const DEMO_TIMES = ["9:00 AM WAT","10:00 AM WAT","11:00 AM WAT","12:00 PM WAT","2:00 PM WAT","3:00 PM WAT","4:00 PM WAT"];
const ORG_SIZES = ["1–10","11–50","51–200","201–500","500+"];
const ISSUE_TYPES = ["Bug / Error","Performance Issue","Feature Question","Data Issue","Account / Access","Other"];
const PRIORITIES = ["Low","Medium","High","Urgent"];
const PARTNER_TYPES = ["Technology Integration","Reseller / Distributor","Referral Partner","Implementation Partner","Investor Inquiry"];
const OPEN_ROLES = [
  "Health Liaison Officer","Business Development Officer","Digital Marketing Executive",
  "Software Developer (Frontend)","Software Developer (Backend)","UI/UX Designer",
  "Customer Success Manager","Product Manager","General Application",
];
const NEWSLETTER_TOPICS = ["Product Updates","Healthcare Tech","EdTech","Business Software","Company News","Industry Insights"];

const TABS = [
  { id: "demo",        label: "Book Demo",   icon: "🎯", color: C.gold,   colorDim: C.goldDim },
  { id: "contact",     label: "Contact",     icon: "✉️",  color: C.blue,   colorDim: C.blueDim },
  { id: "quote",       label: "Get Quote",   icon: "💰", color: C.mint,   colorDim: C.mintDim },
  { id: "support",     label: "Support",     icon: "🛠️", color: C.purple, colorDim: C.purpleDim },
  { id: "partnership", label: "Partner",     icon: "🤝", color: C.amber,  colorDim: C.amberDim },
  { id: "career",      label: "Careers",     icon: "🚀", color: C.rose,   colorDim: C.roseDim },
  { id: "newsletter",  label: "Newsletter",  icon: "📬", color: C.cyan,   colorDim: C.cyanDim },
];

// ─── Utilities ───────────────────────────────────────────────────────────────
function genId() { return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function genRef() { return `ORN-${Date.now().toString(36).toUpperCase().slice(-7)}`; }

function saveLead(type, form, ref) {
  try {
    const lead = {
      id: genId(), ref, type, status: "new", source: "Website Form",
      submittedAt: new Date().toISOString(),
      contactName: form.name || "", email: form.email || "", phone: form.phone || "",
      company: form.company || form.org || "", location: form.location || "",
      interestedService: form.product || form.role || type,
      notes: form.message || form.description || "",
      priority: form.priority || "Medium",
      ...form,
    };
    const existing = JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");
    existing.unshift(lead);
    localStorage.setItem(LEADS_KEY, JSON.stringify(existing.slice(0, 500)));
    window.dispatchEvent(new CustomEvent("localstoreupdate"));
  } catch {}
}

function buildCalendarUrl({ name, email, product, preferredDate, preferredTime, message }) {
  const title = encodeURIComponent(`Orion Soft Demo — ${product || "Product Suite"}`);
  const details = encodeURIComponent(
    `Demo for ${name} (${email})\nProduct: ${product || "TBD"}\n${message ? `Notes: ${message}\n` : ""}` +
    `\nOrion Soft will confirm shortly.\nContact: ${ADMIN_EMAIL} | ${ADMIN_PHONE}`
  );
  let start = new Date();
  if (preferredDate) {
    start = new Date(`${preferredDate}T10:00:00`);
  } else {
    start.setDate(start.getDate() + 2);
    start.setHours(10, 0, 0, 0);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = d => d.toISOString().replace(/[-:.]/g, "").slice(0, 15);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${fmt(start)}/${fmt(end)}`;
}

function buildWhatsAppUrl(type, form) {
  const msgs = {
    demo: `Hi Orion Soft! I'd like to book a demo for ${form.product || "your software"}. My name is ${form.name}. When are you available?`,
    contact: `Hi Orion Soft! I submitted an enquiry and would like to follow up. My name is ${form.name} from ${form.company || "my organisation"}.`,
    quote: `Hi Orion Soft! I need a quote for ${form.product || "your software"}. Org size: ${form.orgSize || "TBD"}. My name is ${form.name}.`,
    support: `Hi Orion Soft Support! I have a ${form.priority || "Medium"} priority issue with ${form.product || "your software"}. My name is ${form.name}.`,
    partnership: `Hi Orion Soft! I'm interested in a ${form.partnerType || "partnership"} opportunity. My name is ${form.name} from ${form.company || "my company"}.`,
    career: `Hi Orion Soft! I applied for the ${form.role || "open"} role. My name is ${form.name}.`,
    newsletter: `Hi Orion Soft! I just subscribed to your newsletter. I'm ${form.name || "a new subscriber"}.`,
  };
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msgs[type] || `Hi Orion Soft! My name is ${form.name}.`)}`;
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; io.disconnect(); }
    }, { threshold: 0.08 });
    el.style.opacity = "0"; el.style.transform = "translateY(22px)";
    el.style.transition = `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`;
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref}>{children}</div>;
}

// ─── Shared form components ───────────────────────────────────────────────────
const IS = { // inputStyle
  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.045)",
  border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px",
  color: C.heading, fontFamily: font, fontSize: 14, outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function Field({ label, required, error, children, half }) {
  return (
    <div style={{ gridColumn: half ? "span 1" : undefined, marginBottom: 2 }}>
      {label && (
        <label style={{ display: "block", color: C.text, fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 7 }}>
          {label} {required && <span style={{ color: C.rose }}>*</span>}
        </label>
      )}
      {children}
      {error && <p style={{ color: C.rose, fontFamily: font, fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

function FInput({ value, onChange, placeholder, type = "text", required, min, ...p }) {
  return <input type={type} value={value || ""} onChange={onChange} placeholder={placeholder} required={required} min={min} style={IS} {...p} />;
}

function FTextarea({ value, onChange, placeholder, rows = 4, required }) {
  return <textarea value={value || ""} onChange={onChange} placeholder={placeholder} required={required} rows={rows} style={{ ...IS, resize: "vertical", lineHeight: 1.6 }} />;
}

function FSelect({ value, onChange, required, children }) {
  return <select value={value || ""} onChange={onChange} required={required} style={{ ...IS, cursor: "pointer" }}>{children}</select>;
}

function ChipSelect({ options, selected = [], onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onChange(on ? selected.filter(s => s !== opt) : [...selected, opt])}
            style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${on ? C.gold : C.border}`, background: on ? C.goldDim : "transparent", color: on ? C.gold : C.textMuted, fontFamily: font, fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", transition: "all 0.18s" }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function GridRow({ children, cols = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
      {children}
    </div>
  );
}

// ─── Form sections ────────────────────────────────────────────────────────────
function DemoForm({ f, set, err }) {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <GridRow><Field label="Full Name" required error={err.name}><FInput value={f.name} onChange={e => set(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required /></Field>
      <Field label="Email" required error={err.email}><FInput type="email" value={f.email} onChange={e => set(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" required /></Field></GridRow>
      <GridRow><Field label="Phone" required error={err.phone}><FInput type="tel" value={f.phone} onChange={e => set(p => ({ ...p, phone: e.target.value }))} placeholder="+234 800 000 0000" required /></Field>
      <Field label="Organisation"><FInput value={f.company} onChange={e => set(p => ({ ...p, company: e.target.value }))} placeholder="Company name" /></Field></GridRow>
      <Field label="Product of interest" required error={err.product}>
        <FSelect value={f.product} onChange={e => set(p => ({ ...p, product: e.target.value }))} required>
          <option value="">Select a product…</option>
          {PRODUCTS.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
          <option value="Not sure yet — show me everything">Not sure yet — show me everything</option>
        </FSelect>
      </Field>
      <GridRow>
        <Field label="Preferred date"><FInput type="date" value={f.preferredDate} onChange={e => set(p => ({ ...p, preferredDate: e.target.value }))} min={today} /></Field>
        <Field label="Preferred time"><FSelect value={f.preferredTime} onChange={e => set(p => ({ ...p, preferredTime: e.target.value }))}><option value="">Any time</option>{DEMO_TIMES.map(t => <option key={t} value={t}>{t}</option>)}</FSelect></Field>
      </GridRow>
      <Field label="What would you like to see?"><FTextarea value={f.message} onChange={e => set(p => ({ ...p, message: e.target.value }))} placeholder="Tell us about your organisation and specific workflows you'd like demonstrated…" rows={3} /></Field>
    </div>
  );
}

function ContactForm({ f, set, err }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <GridRow><Field label="Full Name" required error={err.name}><FInput value={f.name} onChange={e => set(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required /></Field>
      <Field label="Email" required error={err.email}><FInput type="email" value={f.email} onChange={e => set(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" required /></Field></GridRow>
      <GridRow><Field label="Phone"><FInput type="tel" value={f.phone} onChange={e => set(p => ({ ...p, phone: e.target.value }))} placeholder="+234 800 000 0000" /></Field>
      <Field label="Organisation"><FInput value={f.company} onChange={e => set(p => ({ ...p, company: e.target.value }))} placeholder="Company or facility name" /></Field></GridRow>
      <Field label="Subject" required error={err.subject}><FInput value={f.subject} onChange={e => set(p => ({ ...p, subject: e.target.value }))} placeholder="What is this about?" required /></Field>
      <Field label="Message" required error={err.message}><FTextarea value={f.message} onChange={e => set(p => ({ ...p, message: e.target.value }))} placeholder="How can we help you?" rows={5} required /></Field>
    </div>
  );
}

function QuoteForm({ f, set, err }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <GridRow><Field label="Full Name" required error={err.name}><FInput value={f.name} onChange={e => set(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required /></Field>
      <Field label="Email" required error={err.email}><FInput type="email" value={f.email} onChange={e => set(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" required /></Field></GridRow>
      <GridRow><Field label="Phone" required error={err.phone}><FInput type="tel" value={f.phone} onChange={e => set(p => ({ ...p, phone: e.target.value }))} placeholder="+234 800 000 0000" required /></Field>
      <Field label="Organisation" required error={err.company}><FInput value={f.company} onChange={e => set(p => ({ ...p, company: e.target.value }))} placeholder="Company name" required /></Field></GridRow>
      <Field label="Product of interest" required error={err.product}>
        <FSelect value={f.product} onChange={e => set(p => ({ ...p, product: e.target.value }))} required>
          <option value="">Select a product…</option>
          {PRODUCTS.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
          <option value="Multiple products / Enterprise">Multiple products / Enterprise</option>
        </FSelect>
      </Field>
      <GridRow><Field label="Organisation size">
        <FSelect value={f.orgSize} onChange={e => set(p => ({ ...p, orgSize: e.target.value }))}>
          <option value="">Select size…</option>{ORG_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
        </FSelect>
      </Field>
      <Field label="Budget range (NGN)">
        <FSelect value={f.budget} onChange={e => set(p => ({ ...p, budget: e.target.value }))}>
          <option value="">Prefer not to say</option>
          <option value="Under 500,000">Under ₦500,000</option>
          <option value="500K – 2M">₦500K – ₦2M</option>
          <option value="2M – 10M">₦2M – ₦10M</option>
          <option value="10M+">₦10M+</option>
        </FSelect>
      </Field></GridRow>
      <Field label="Requirements / modules needed"><FTextarea value={f.message} onChange={e => set(p => ({ ...p, message: e.target.value }))} placeholder="Describe your specific requirements, existing systems, integration needs, and timeline…" rows={4} /></Field>
    </div>
  );
}

function SupportForm({ f, set, err }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <GridRow><Field label="Full Name" required error={err.name}><FInput value={f.name} onChange={e => set(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required /></Field>
      <Field label="Email" required error={err.email}><FInput type="email" value={f.email} onChange={e => set(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" required /></Field></GridRow>
      <GridRow><Field label="Product" required error={err.product}>
        <FSelect value={f.product} onChange={e => set(p => ({ ...p, product: e.target.value }))} required>
          <option value="">Select product…</option>{PRODUCTS.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
        </FSelect>
      </Field>
      <Field label="Issue type" required error={err.issueType}>
        <FSelect value={f.issueType} onChange={e => set(p => ({ ...p, issueType: e.target.value }))} required>
          <option value="">Select type…</option>{ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </FSelect>
      </Field></GridRow>
      <Field label="Priority">
        <div style={{ display: "flex", gap: 10 }}>
          {PRIORITIES.map(p => (
            <button key={p} type="button" onClick={() => set(prev => ({ ...prev, priority: p }))}
              style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: `1px solid ${f.priority === p ? (p === "Urgent" ? C.rose : p === "High" ? C.amber : C.gold) : C.border}`, background: f.priority === p ? (p === "Urgent" ? C.roseDim : p === "High" ? C.amberDim : C.goldDim) : "transparent", color: f.priority === p ? (p === "Urgent" ? C.rose : p === "High" ? C.amber : C.gold) : C.textMuted, fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.18s" }}>
              {p}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Describe the issue" required error={err.description}><FTextarea value={f.description} onChange={e => set(p => ({ ...p, description: e.target.value }))} placeholder="What happened? What were you trying to do? Include any error messages or screenshots…" rows={5} required /></Field>
    </div>
  );
}

function PartnershipForm({ f, set, err }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <GridRow><Field label="Full Name" required error={err.name}><FInput value={f.name} onChange={e => set(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required /></Field>
      <Field label="Email" required error={err.email}><FInput type="email" value={f.email} onChange={e => set(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" required /></Field></GridRow>
      <GridRow><Field label="Phone"><FInput type="tel" value={f.phone} onChange={e => set(p => ({ ...p, phone: e.target.value }))} placeholder="+234 800 000 0000" /></Field>
      <Field label="Company / Organisation" required error={err.company}><FInput value={f.company} onChange={e => set(p => ({ ...p, company: e.target.value }))} placeholder="Your company name" required /></Field></GridRow>
      <Field label="Partnership type" required error={err.partnerType}>
        <FSelect value={f.partnerType} onChange={e => set(p => ({ ...p, partnerType: e.target.value }))} required>
          <option value="">Select partnership type…</option>{PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </FSelect>
      </Field>
      <Field label="Website / LinkedIn"><FInput value={f.website} onChange={e => set(p => ({ ...p, website: e.target.value }))} placeholder="https://…" type="url" /></Field>
      <Field label="Tell us about the opportunity" required error={err.message}><FTextarea value={f.message} onChange={e => set(p => ({ ...p, message: e.target.value }))} placeholder="Describe your company, what you bring to the partnership, and what you're looking to achieve together…" rows={5} required /></Field>
    </div>
  );
}

function CareerForm({ f, set, err }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <GridRow><Field label="Full Name" required error={err.name}><FInput value={f.name} onChange={e => set(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required /></Field>
      <Field label="Email" required error={err.email}><FInput type="email" value={f.email} onChange={e => set(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" required /></Field></GridRow>
      <GridRow><Field label="Phone" required error={err.phone}><FInput type="tel" value={f.phone} onChange={e => set(p => ({ ...p, phone: e.target.value }))} placeholder="+234 800 000 0000" required /></Field>
      <Field label="Location"><FInput value={f.location} onChange={e => set(p => ({ ...p, location: e.target.value }))} placeholder="City, State" /></Field></GridRow>
      <Field label="Role you're applying for" required error={err.role}>
        <FSelect value={f.role} onChange={e => set(p => ({ ...p, role: e.target.value }))} required>
          <option value="">Select a role…</option>{OPEN_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </FSelect>
      </Field>
      <GridRow><Field label="Years of experience">
        <FSelect value={f.experience} onChange={e => set(p => ({ ...p, experience: e.target.value }))}>
          <option value="">Select…</option>
          <option value="Entry level (0–1 yr)">Entry level (0–1 yr)</option>
          <option value="Mid level (2–4 yrs)">Mid level (2–4 yrs)</option>
          <option value="Senior (5+ yrs)">Senior (5+ yrs)</option>
        </FSelect>
      </Field>
      <Field label="CV / Portfolio link"><FInput value={f.cvLink} onChange={e => set(p => ({ ...p, cvLink: e.target.value }))} placeholder="Google Drive, Dropbox, LinkedIn…" type="url" /></Field></GridRow>
      <Field label="Cover note" required error={err.message}><FTextarea value={f.message} onChange={e => set(p => ({ ...p, message: e.target.value }))} placeholder="Tell us why you'd be a great fit for Orion Soft and this role…" rows={4} required /></Field>
    </div>
  );
}

function NewsletterForm({ f, set, err }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <GridRow><Field label="Name (optional)"><FInput value={f.name} onChange={e => set(p => ({ ...p, name: e.target.value }))} placeholder="Your name" /></Field>
      <Field label="Email" required error={err.email}><FInput type="email" value={f.email} onChange={e => set(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" required /></Field></GridRow>
      <Field label="Topics you're interested in">
        <ChipSelect options={NEWSLETTER_TOPICS} selected={f.topics || []} onChange={v => set(p => ({ ...p, topics: v }))} />
      </Field>
      <div style={{ background: C.accentDim, border: `1px solid ${C.blue}33`, borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ color: C.text, fontFamily: font, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          We send 2–4 emails per month covering product updates, industry insights, and company news. No spam, unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}

// ─── Success view ─────────────────────────────────────────────────────────────
function SuccessView({ type, ref: submissionRef, form, onReset, setCurrentPage }) {
  const isDemo = type === "demo";
  const calUrl = isDemo ? buildCalendarUrl(form) : null;
  const waUrl = buildWhatsAppUrl(type, form);

  return (
    <div style={{ textAlign: "center", padding: "32px 24px" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: C.mintDim, border: `1px solid ${C.mint}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>✓</div>
      <h2 style={{ color: C.heading, fontFamily: font, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        {type === "newsletter" ? "You're subscribed!" : "Submission received!"}
      </h2>
      <p style={{ color: C.text, fontFamily: font, fontSize: 15, lineHeight: 1.7, margin: "0 0 6px" }}>
        {type === "newsletter"
          ? "Welcome to the Orion Soft mailing list. You'll hear from us soon."
          : `We've received your ${type === "demo" ? "demo request" : type === "quote" ? "quote request" : type === "support" ? "support ticket" : type === "career" ? "application" : type === "partnership" ? "partnership enquiry" : "message"} and will get back to you shortly.`}
      </p>
      {submissionRef && <p style={{ color: C.textMuted, fontFamily: font, fontSize: 13, margin: "0 0 28px" }}>Reference: <strong style={{ color: C.text }}>{submissionRef}</strong></p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 400, margin: "0 auto 28px" }}>
        {isDemo && calUrl && (
          <a href={calUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px 20px", borderRadius: 10, background: C.blueDim, border: `1px solid ${C.blue}33`, color: C.blue, textDecoration: "none", fontFamily: font, fontSize: 14, fontWeight: 700, transition: "all 0.2s" }}>
            📅 Add to Google Calendar
          </a>
        )}
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px 20px", borderRadius: 10, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)", color: "#25D366", textDecoration: "none", fontFamily: font, fontSize: 14, fontWeight: 700, transition: "all 0.2s" }}>
          💬 Follow up on WhatsApp
        </a>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={onReset}
          style={{ padding: "11px 22px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Submit another
        </button>
        <button type="button" onClick={() => setCurrentPage("home")}
          style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: C.gold, color: "#05070A", fontFamily: font, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeTab }) {
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Orion Soft! I'd like to learn more about your software products.")}`;
  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <a href={waUrl} target="_blank" rel="noopener noreferrer"
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", borderRadius: 14, background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.22)", textDecoration: "none", transition: "all 0.2s" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(37,211,102,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>💬</div>
        <div>
          <div style={{ color: "#25D366", fontFamily: font, fontSize: 14, fontWeight: 800 }}>Chat on WhatsApp</div>
          <div style={{ color: C.textMuted, fontFamily: font, fontSize: 12, marginTop: 2 }}>Fastest response — usually within 1 hour</div>
        </div>
      </a>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <p style={{ color: C.textMuted, fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 14px" }}>CONTACT DETAILS</p>
        {[
          { icon: "📧", label: "Email", value: ADMIN_EMAIL, href: `mailto:${ADMIN_EMAIL}` },
          { icon: "📱", label: "Phone", value: ADMIN_PHONE, href: `tel:${ADMIN_PHONE}` },
          { icon: "📍", label: "Location", value: "Nigeria", href: null },
          { icon: "🔒", label: "Registered", value: "CAC RC: 9535128", href: null },
        ].map(({ icon, label, value, href }) => (
          <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <div>
              <div style={{ color: C.textMuted, fontFamily: font, fontSize: 11, fontWeight: 700 }}>{label.toUpperCase()}</div>
              {href
                ? <a href={href} style={{ color: C.blue, fontFamily: font, fontSize: 13, textDecoration: "none" }}>{value}</a>
                : <div style={{ color: C.text, fontFamily: font, fontSize: 13 }}>{value}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <p style={{ color: C.textMuted, fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 14px" }}>RESPONSE TIMES</p>
        {[
          { type: "Demo requests", time: "Within 1 business day", color: C.gold },
          { type: "Sales & quotes", time: "Within 1 business day", color: C.mint },
          { type: "Support tickets", time: "Within 4 business hours", color: C.blue },
          { type: "Partnerships", time: "Within 3 business days", color: C.purple },
          { type: "Careers", time: "Within 5 business days", color: C.rose },
        ].map(({ type, time, color }) => (
          <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: C.textMuted, fontFamily: font, fontSize: 12 }}>{type}</span>
            <span style={{ color, fontFamily: font, fontSize: 11, fontWeight: 700, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 999, padding: "3px 9px" }}>{time}</span>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <p style={{ color: C.textMuted, fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 10px" }}>BUSINESS HOURS</p>
        <p style={{ color: C.text, fontFamily: font, fontSize: 13, lineHeight: 1.7, margin: 0 }}>Monday – Friday<br /><strong style={{ color: C.heading }}>8:00 AM – 6:00 PM WAT</strong></p>
        <p style={{ color: C.textMuted, fontFamily: font, fontSize: 12, marginTop: 8, marginBottom: 0 }}>WhatsApp is monitored on weekends for urgent issues.</p>
      </div>

      <div style={{ background: C.goldDim, border: `1px solid ${C.gold}30`, borderRadius: 14, padding: 20 }}>
        <p style={{ color: C.gold, fontFamily: font, fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>NDPR Compliant</p>
        <p style={{ color: C.text, fontFamily: font, fontSize: 12, lineHeight: 1.6, margin: 0 }}>Your data is protected under Nigerian Data Protection Regulations. We never sell or share your personal information with third parties.</p>
      </div>
    </aside>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(type, form) {
  const errs = {};
  const req = (k, label) => { if (!form[k]?.trim()) errs[k] = `${label} is required`; };
  const email = (k = "email") => { if (!form[k]?.includes("@")) errs[k] = "Valid email required"; };

  if (type === "demo") { req("name", "Name"); email(); req("phone", "Phone"); req("product", "Product"); }
  if (type === "contact") { req("name", "Name"); email(); req("subject", "Subject"); req("message", "Message"); }
  if (type === "quote") { req("name", "Name"); email(); req("phone", "Phone"); req("company", "Organisation"); req("product", "Product"); }
  if (type === "support") { req("name", "Name"); email(); req("product", "Product"); req("issueType", "Issue type"); req("description", "Description"); }
  if (type === "partnership") { req("name", "Name"); email(); req("company", "Company"); req("partnerType", "Partnership type"); req("message", "Message"); }
  if (type === "career") { req("name", "Name"); email(); req("phone", "Phone"); req("role", "Role"); req("message", "Cover note"); }
  if (type === "newsletter") { email(); }
  return errs;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContactPage({ setCurrentPage }) {
  const [tab, setTab] = useState("demo");
  const [form, setForm] = useState({ priority: "Medium", topics: [] });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [resultRef, setResultRef] = useState(null);
  const [apiError, setApiError] = useState("");
  const openTime = useRef(Date.now());

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  useEffect(() => { setForm({ priority: "Medium", topics: [] }); setErrors({}); setStatus("idle"); setApiError(""); openTime.current = Date.now(); }, [tab]);

  const activeTab = TABS.find(t => t.id === tab);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(tab, form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setStatus("submitting");
    setApiError("");
    const ref = genRef();

    const payload = {
      type: tab,
      ref,
      honeypot: "",
      timing: Date.now() - openTime.current,
      ...form,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok && res.status !== 200) throw new Error("API error");
      const data = await res.json();
      saveLead(tab, form, data.ref || ref);
      setResultRef(data.ref || ref);
      setStatus("success");
    } catch {
      // Still save locally and show success — email delivery is best-effort
      saveLead(tab, form, ref);
      setResultRef(ref);
      setStatus("success");
    }
  }

  function renderForm() {
    const props = { f: form, set: setForm, err: errors };
    if (tab === "demo") return <DemoForm {...props} />;
    if (tab === "contact") return <ContactForm {...props} />;
    if (tab === "quote") return <QuoteForm {...props} />;
    if (tab === "support") return <SupportForm {...props} />;
    if (tab === "partnership") return <PartnershipForm {...props} />;
    if (tab === "career") return <CareerForm {...props} />;
    if (tab === "newsletter") return <NewsletterForm {...props} />;
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <section style={{
        padding: "140px clamp(20px, 5vw, 60px) 72px",
        background: `radial-gradient(circle at 70% 30%, ${C.blueGlow}, transparent 40%), radial-gradient(circle at 20% 20%, ${C.goldGlow}, transparent 35%), linear-gradient(180deg, #04060C 0%, ${C.bg} 100%)`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)", pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Reveal>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, border: `1px solid ${C.gold}33`, background: "rgba(255,255,255,0.04)", marginBottom: 22 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, boxShadow: `0 0 10px ${C.gold}` }} />
              <span style={{ color: C.gold, fontFamily: font, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>GET IN TOUCH</span>
            </div>
            <h1 style={{ color: C.heading, fontFamily: font, fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, margin: "0 0 20px" }}>
              Work with us.
            </h1>
            <p style={{ color: C.text, fontFamily: font, fontSize: "clamp(16px, 2vw, 19px)", lineHeight: 1.7, maxWidth: 580, margin: 0 }}>
              Whether you're booking a demo, requesting a quote, or applying to join the team — we're ready to help.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Main content */}
      <section style={{ padding: "0 clamp(20px, 5vw, 60px) 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Tab bar */}
          <Reveal>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 32, scrollbarWidth: "none" }}>
              {TABS.map(t => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 10,
                  border: `1px solid ${tab === t.id ? t.color + "44" : C.border}`,
                  background: tab === t.id ? t.colorDim : C.card,
                  color: tab === t.id ? t.color : C.textMuted,
                  fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.18s",
                  whiteSpace: "nowrap",
                }}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </Reveal>

          {/* Two-column layout */}
          <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, alignItems: "start" }}>

            {/* Form card */}
            <Reveal delay={0.05}>
              <div style={{ background: C.card, border: `1px solid ${activeTab.color}28`, borderRadius: 20, overflow: "hidden", boxShadow: `0 0 60px ${activeTab.color}0A` }}>
                {/* Card header */}
                <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${activeTab.colorDim}, transparent)` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: activeTab.colorDim, border: `1px solid ${activeTab.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{activeTab.icon}</div>
                    <div>
                      <h2 style={{ color: C.heading, fontFamily: font, fontSize: 18, fontWeight: 800, margin: 0 }}>{activeTab.label}</h2>
                      <p style={{ color: C.textMuted, fontFamily: font, fontSize: 13, margin: 0 }}>
                        {tab === "demo" && "Schedule a free 30–45 min walkthrough tailored to your business"}
                        {tab === "contact" && "General enquiries, questions, and feedback"}
                        {tab === "quote" && "Get a tailored price based on your organisation's needs"}
                        {tab === "support" && "Technical help for existing Orion Soft customers"}
                        {tab === "partnership" && "Explore reseller, integration, and referral opportunities"}
                        {tab === "career" && "Join the team building Nigeria's enterprise software future"}
                        {tab === "newsletter" && "Product updates, insights, and company news — twice a month"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form body */}
                <div style={{ padding: "28px" }}>
                  {status === "success" ? (
                    <SuccessView type={tab} ref={resultRef} form={form} onReset={() => { setStatus("idle"); setForm({ priority: "Medium", topics: [] }); setErrors({}); }} setCurrentPage={setCurrentPage} />
                  ) : (
                    <form onSubmit={handleSubmit} noValidate>
                      {/* Honeypot — hidden from real users */}
                      <input type="text" name="honeypot" tabIndex={-1} autoComplete="off"
                        style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0 }}
                        aria-hidden="true" value={form.honeypot || ""} onChange={e => setForm(p => ({ ...p, honeypot: e.target.value }))} />

                      {renderForm()}

                      {apiError && (
                        <div style={{ background: C.roseDim, border: `1px solid ${C.rose}33`, borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
                          <p style={{ color: C.rose, fontFamily: font, fontSize: 13, margin: 0 }}>{apiError}</p>
                        </div>
                      )}

                      <button type="submit" disabled={status === "submitting"}
                        style={{ width: "100%", marginTop: 24, padding: "15px 24px", borderRadius: 12, border: "none", background: status === "submitting" ? C.textMuted : activeTab.color, color: tab === "newsletter" ? C.bg : "#05070A", fontFamily: font, fontSize: 15, fontWeight: 900, cursor: status === "submitting" ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: status === "submitting" ? 0.7 : 1, boxShadow: `0 12px 36px ${activeTab.color}25` }}>
                        {status === "submitting" ? "Sending…" :
                          tab === "demo" ? "Request Free Demo →" :
                          tab === "contact" ? "Send Message →" :
                          tab === "quote" ? "Request Quote →" :
                          tab === "support" ? "Submit Support Ticket →" :
                          tab === "partnership" ? "Send Partnership Enquiry →" :
                          tab === "career" ? "Submit Application →" :
                          "Subscribe →"}
                      </button>

                      <p style={{ color: C.textMuted, fontFamily: font, fontSize: 11, textAlign: "center", margin: "12px 0 0", lineHeight: 1.5 }}>
                        By submitting, you agree to our <span style={{ color: C.blue, cursor: "pointer" }} onClick={() => setCurrentPage("privacy")}>Privacy Policy</span>. We are NDPR compliant and never sell your data.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </Reveal>

            {/* Sidebar */}
            <Reveal delay={0.1}>
              <Sidebar activeTab={tab} />
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
