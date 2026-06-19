import { useState, useEffect, useRef } from "react";

// ── Design tokens (mirrors App.jsx) ──────────────────────────────
const C = {
  bg: "#0A2540", surface: "#102A43", card: "#132F4C", cardHover: "#173B60",
  border: "rgba(255,255,255,0.09)", borderHover: "rgba(45,212,191,0.25)",
  white: "#FFFFFF", text: "#D7E3EF", textMuted: "#8DA2B8", heading: "#F8FBFF",
  accent: "#38BDF8", accentDim: "rgba(56,189,248,0.14)", accentGlow: "rgba(56,189,248,0.24)",
  mint: "#2DD4BF", mintDim: "rgba(45,212,191,0.13)",
  purple: "#C4B5FD", purpleDim: "rgba(196,181,253,0.12)",
  amber: "#FCD34D", amberDim: "rgba(252,211,77,0.12)",
  gold: "#D6B56D", rose: "#FDA4AF", roseDim: "rgba(253,164,175,0.12)",
  success: "#2DD4BF",
  light: "#F8FAFC", lightCard: "#FFFFFF", lightBorder: "#E2E8F0",
  lightText: "#334155", lightMuted: "#94A3B8", lightHeading: "#0F172A",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";
const COMPANY_EMAIL = "orionsoftlimited@gmail.com";
const COMPANY_PHONE = "08169577059";
const COMPANY_RC = "9535128";

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(18px)", transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s` }}>
      {children}
    </div>
  );
}

function PageShell({ children, light = false }) {
  return (
    <section style={{ minHeight: "100vh", background: light ? C.light : C.bg, padding: "110px clamp(16px, 4vw, 32px) 96px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {children}
      </div>
    </section>
  );
}

function BackBtn({ setCurrentPage, to = "home" }) {
  return (
    <button type="button" onClick={() => setCurrentPage(to)} style={{
      background: "none", border: "none", color: C.accent, fontSize: 14,
      fontFamily: font, cursor: "pointer", marginBottom: 32, fontWeight: 700,
      display: "flex", alignItems: "center", gap: 6, padding: 0,
    }}>
      ← Back
    </button>
  );
}

function PageHero({ tag, tagColor = C.accent, title, subtitle }) {
  return (
    <Reveal>
      <span style={{ fontSize: 12, fontWeight: 800, color: tagColor, fontFamily: font, letterSpacing: "0.1em" }}>{tag}</span>
      <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "10px 0 14px", lineHeight: 1.1 }}>
        {title}
      </h1>
      {subtitle && <p style={{ fontSize: 17, color: C.text, fontFamily: font, lineHeight: 1.75, maxWidth: 660, margin: "0 0 40px" }}>{subtitle}</p>}
    </Reveal>
  );
}

// ─────────────────────────────────────────────────────────────────
// CASE STUDIES PAGE
// ─────────────────────────────────────────────────────────────────
const CASE_STUDIES = [
  {
    id: "faith-general",
    client: "Faith General Hospital",
    location: "Lagos State",
    size: "50-bed private hospital",
    industry: "Healthcare",
    color: C.accent,
    modules: ["OPD Management", "Pharmacy", "Billing & Invoicing", "Ward Management"],
    problem: "Patient records were entirely paper-based. Clinical staff spent a significant portion of each shift searching for paper files, handwriting prescriptions, and manually reconciling billing at the end of each day. Stock-outs in the pharmacy were frequent because there was no centralised view of inventory.",
    solution: "Orion Soft deployed CareCore HMS across OPD, pharmacy, billing, and ward management over a three-week period. All ward staff were trained in two days. Patient records, prescriptions, and billing were centralised on a single dashboard accessible from phones and desktop workstations.",
    outcomes: [
      { metric: "< 3 weeks", label: "Time to full go-live" },
      { metric: "8 departments", label: "Connected on day one" },
      { metric: "Same-day billing", label: "Invoice processing" },
    ],
    quote: "Before CareCore, I would spend the first hour of every morning chasing down patient folders. Now everything is there when I log in. The pharmacy team especially — they finally know what stock is available without checking the shelf.",
    quoteName: "Head of Administration",
    quoteOrg: "Faith General Hospital",
  },
  {
    id: "harmony-diagnostics",
    client: "Harmony Diagnostics Centre",
    location: "Abuja, FCT",
    size: "Diagnostics & outpatient clinic",
    industry: "Healthcare",
    color: C.mint,
    modules: ["Laboratory Management", "OPD", "Automated Billing", "Patient Portal"],
    problem: "Lab results were printed and filed manually. Doctors in the outpatient clinic had no direct view of test results — patients had to physically carry paper results. Billing was done separately, causing double-charge errors that required manual corrections every week.",
    solution: "CareCore's lab module was integrated with the OPD and billing systems. Lab results now post directly to patient records and are visible to the attending clinician in real time. Billing is generated automatically from orders placed, eliminating the double-entry step.",
    outcomes: [
      { metric: "Real-time", label: "Lab results to clinician" },
      { metric: "Zero", label: "Manual billing reconciliation" },
      { metric: "Faster throughput", label: "Patient flow per session" },
    ],
    quote: "Our lab used to be an island — results went on paper, patients carried them around, doctors sometimes never saw them. Now everything connects. The clinical team can make decisions faster because the information is already there.",
    quoteName: "Head of Laboratory",
    quoteOrg: "Harmony Diagnostics Centre",
  },
  {
    id: "providence-community",
    client: "Providence Community Hospital",
    location: "Ibadan, Oyo State",
    size: "30-bed community hospital",
    industry: "Healthcare",
    color: C.purple,
    modules: ["Full CareCore Suite", "Staff Management", "Reporting Dashboard", "Triage"],
    problem: "The hospital was running operations across several disconnected spreadsheets — one for OPD attendance, one for billing, one for stock. Management had no single view of operations, and monthly reporting required days of manual consolidation from different departments.",
    solution: "Orion Soft conducted a two-day on-site discovery before deploying the full CareCore suite. All departments were connected — OPD, clinical, pharmacy, billing, and the management reporting dashboard. Staff training ran concurrently with deployment, with the Orion Soft team on-site for the first week post-launch.",
    outcomes: [
      { metric: "All departments", label: "On one platform" },
      { metric: "Live dashboard", label: "Management reporting" },
      { metric: "On-site support", label: "First two weeks" },
    ],
    quote: "We had tried another system before and it didn't stick — too complicated and the vendor disappeared after installation. With Orion Soft the support was different. They stayed until the team was confident, and they're still reachable when we need them.",
    quoteName: "Medical Director",
    quoteOrg: "Providence Community Hospital",
  },
];

export function CaseStudiesPage({ setCurrentPage }) {
  const [active, setActive] = useState(null);
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  return (
    <PageShell>
      <BackBtn setCurrentPage={setCurrentPage} />
      <PageHero
        tag="CASE STUDIES"
        tagColor={C.accent}
        title="Real deployments. Real problems solved."
        subtitle="Every case study below represents a genuine implementation. Outcomes are described as they were reported — without inflation."
      />

      <div style={{ display: "grid", gap: 28 }}>
        {CASE_STUDIES.map((cs, i) => (
          <Reveal key={cs.id} delay={i * 0.07}>
            <article style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 18, overflow: "hidden",
              transition: "border-color 0.25s",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = cs.color + "44"}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              {/* Header */}
              <div style={{ padding: "28px 32px 24px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, background: cs.color + "1A", color: cs.color, border: `1px solid ${cs.color}30`, borderRadius: 6, padding: "3px 10px", fontFamily: font }}>{cs.industry}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textMuted, fontFamily: font, padding: "3px 8px" }}>{cs.location} · {cs.size}</span>
                    </div>
                    <h2 style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: 0 }}>
                      {cs.client}
                    </h2>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {cs.modules.slice(0, 3).map(m => (
                      <span key={m} style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 9px", fontFamily: font, whiteSpace: "nowrap" }}>{m}</span>
                    ))}
                    {cs.modules.length > 3 && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: font }}>+{cs.modules.length - 3} more</span>}
                  </div>
                </div>
              </div>

              {/* Metrics row */}
              <div style={{ display: "flex", gap: 0, background: cs.color + "08", borderBottom: `1px solid ${C.border}` }}>
                {cs.outcomes.map((o, oi) => (
                  <div key={o.label} style={{ flex: 1, textAlign: "center", padding: "18px 12px", borderRight: oi < cs.outcomes.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ fontSize: "clamp(15px, 2vw, 20px)", fontWeight: 800, color: cs.color, fontFamily: font, letterSpacing: "-0.02em" }}>{o.metric}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font, marginTop: 3 }}>{o.label}</div>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div style={{ padding: "28px 32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, fontFamily: font, letterSpacing: "0.08em", marginBottom: 10 }}>THE CHALLENGE</h3>
                    <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.78, margin: 0 }}>{cs.problem}</p>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, fontFamily: font, letterSpacing: "0.08em", marginBottom: 10 }}>THE SOLUTION</h3>
                    <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.78, margin: 0 }}>{cs.solution}</p>
                  </div>
                </div>

                {/* Quote */}
                <div style={{ marginTop: 24, background: cs.color + "0D", border: `1px solid ${cs.color}22`, borderRadius: 12, padding: "20px 24px" }}>
                  <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 12px", fontStyle: "italic" }}>
                    "{cs.quote}"
                  </p>
                  <div style={{ fontSize: 13, fontWeight: 700, color: cs.color, fontFamily: font }}>{cs.quoteName}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 2 }}>{cs.quoteOrg}</div>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      {/* CTA */}
      <Reveal delay={0.2}>
        <div style={{ marginTop: 56, background: `linear-gradient(135deg, ${C.accent}10, ${C.mint}06)`, border: `1px solid ${C.accent}28`, borderRadius: 16, padding: "36px clamp(20px, 4vw, 48px)", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            Ready to start your own deployment?
          </h2>
          <p style={{ fontSize: 15, color: C.text, fontFamily: font, lineHeight: 1.7, margin: "0 0 24px" }}>
            We'll scope the right configuration for your facility, explain the process, and give you an honest timeline before anything is signed.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, color: C.bg, border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              Request a Demo
            </button>
            <button type="button" onClick={() => setCurrentPage("products")} style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "13px 24px", fontSize: 14, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>
              View CareCore Features
            </button>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECURITY PAGE
// ─────────────────────────────────────────────────────────────────
const SECURITY_ITEMS = [
  {
    icon: "🔒",
    title: "Encryption in transit",
    color: C.accent,
    body: "All communication between your browser and CareCore is encrypted using TLS 1.2 and TLS 1.3. We enforce HTTPS across every endpoint. There is no unencrypted path to patient data or system settings.",
  },
  {
    icon: "🗄️",
    title: "Data at rest",
    color: C.mint,
    body: "Patient records, billing data, and staff information are stored in encrypted database fields. Sensitive fields use additional encryption layers beyond the database default.",
  },
  {
    icon: "👥",
    title: "Role-based access control",
    color: C.purple,
    body: "CareCore enforces granular permissions at every module level. A receptionist cannot view clinical notes. A pharmacist cannot access billing reports. Each role sees only what it needs. Permissions are configurable per facility.",
  },
  {
    icon: "📋",
    title: "Audit logging",
    color: C.amber,
    body: "Every significant action in CareCore — record creation, edits, deletions, access events — is written to a tamper-evident audit log. Hospital administrators can review who did what and when.",
  },
  {
    icon: "🛡️",
    title: "Two-factor authentication",
    color: C.accent,
    body: "CareCore supports two-factor authentication (2FA) for all user accounts. For facilities handling sensitive clinical data, we recommend enabling 2FA as a policy requirement for all clinical and administrative staff.",
  },
  {
    icon: "🔐",
    title: "Session management",
    color: C.mint,
    body: "User sessions expire automatically after inactivity. Concurrent session limits can be configured per role. Staff who forget to log out from a shared workstation are protected by automatic session timeout.",
  },
  {
    icon: "☁️",
    title: "Infrastructure and backups",
    color: C.purple,
    body: "CareCore is hosted on enterprise cloud infrastructure with automated daily backups. Backup retention, restoration testing, and infrastructure monitoring are part of the standard deployment. Clients can request copies of their data at any time.",
  },
  {
    icon: "📜",
    title: "NDPR compliance",
    color: C.gold,
    body: "Orion Soft Limited operates under the Nigeria Data Protection Regulation (NDPR). We collect only what is necessary, process data for disclosed purposes, and provide mechanisms for data access, correction, and deletion on request. Our Privacy Policy details the specific terms.",
  },
];

export function SecurityPage({ setCurrentPage }) {
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  return (
    <PageShell>
      <BackBtn setCurrentPage={setCurrentPage} />
      <PageHero
        tag="SECURITY & COMPLIANCE"
        tagColor={C.accent}
        title="How we protect your data"
        subtitle="CareCore handles patient records, clinical data, and financial information. We take that responsibility seriously. This page explains exactly what we do — and what we don't do."
      />

      {/* Honest disclaimer */}
      <Reveal delay={0.05}>
        <div style={{ background: C.amberDim, border: `1px solid ${C.amber}22`, borderRadius: 12, padding: "18px 24px", marginBottom: 40 }}>
          <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: C.amber }}>Honest note:</strong> We are a growing Nigerian software company. We do not yet hold ISO 27001 or SOC 2 certifications. What we have is a security-conscious engineering culture, documented practices, and a commitment to NDPR compliance. We will update this page as our certifications evolve.
          </p>
        </div>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 14 }}>
        {SECURITY_ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={0.06 + i * 0.04}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 26px", height: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{item.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 10px" }}>{item.title}</h3>
              <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Responsible disclosure */}
      <Reveal delay={0.15}>
        <div style={{ marginTop: 40, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 12px" }}>Responsible Disclosure</h2>
          <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 14px" }}>
            If you discover a security vulnerability in CareCore or this website, please report it privately before publishing. We will acknowledge reports within 48 hours and work to resolve verified issues promptly.
          </p>
          <a href={`mailto:${COMPANY_EMAIL}?subject=Security%20Disclosure`} style={{ color: C.accent, fontFamily: font, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            {COMPANY_EMAIL}
          </a>
        </div>
      </Reveal>

      {/* Data rights */}
      <Reveal delay={0.18}>
        <div style={{ marginTop: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 12px" }}>Your Data Rights</h2>
          <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 16px" }}>
            Under the NDPR and as a matter of policy, you have the right to access, correct, or request deletion of personal data held about you. Facilities using CareCore can request a full data export at any time. To exercise any of these rights:
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={`mailto:${COMPANY_EMAIL}`} style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, color: C.bg, borderRadius: 9, padding: "10px 20px", fontSize: 13.5, fontWeight: 700, fontFamily: font, textDecoration: "none", display: "inline-block" }}>
              Email Us
            </a>
            <button type="button" onClick={() => setCurrentPage("privacy")} style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>
              Read Privacy Policy
            </button>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUPPORT PAGE (Support Center + Docs + FAQs combined)
// ─────────────────────────────────────────────────────────────────
const SUPPORT_FAQS = [
  {
    q: "How long does a CareCore HMS deployment take?",
    a: "For a standard hospital deployment (OPD, pharmacy, billing, ward), the timeline is typically 2–4 weeks from kickoff to go-live. Larger facilities with more modules or complex existing workflows may take 6–8 weeks. We do an initial scoping session to give you an accurate timeline before work begins.",
  },
  {
    q: "Do you provide staff training?",
    a: "Yes. Training is included in every deployment. We train each department on their specific module(s). For clinical staff we run structured sessions with hands-on practice scenarios. We also prepare a quick-reference guide tailored to your facility's workflows.",
  },
  {
    q: "What happens after go-live?",
    a: "You get post-launch support for the first two weeks — our team is available daily to address issues as your staff settles in. After that, you move to standard support with response time targets based on your plan. We don't disappear after installation.",
  },
  {
    q: "Can CareCore work with limited or intermittent internet?",
    a: "CareCore is a web-based system and requires internet connectivity to operate fully. For facilities with unreliable connectivity, we recommend a stable local network with a backup mobile data option. We can advise on minimum bandwidth requirements during scoping.",
  },
  {
    q: "Is our patient data stored in Nigeria?",
    a: "CareCore data is hosted on cloud infrastructure. We can discuss data residency requirements during scoping, and for facilities with specific regulatory requirements around data localisation, we will work with you to find a compliant configuration.",
  },
  {
    q: "What if we already use another HMS?",
    a: "We have helped facilities migrate from paper systems, spreadsheets, and other HMS platforms. We assess your existing data, plan the migration, and aim to preserve historical records wherever possible. A clean cutover date is agreed in advance so staff are not managing two systems simultaneously.",
  },
  {
    q: "Can we try CareCore before committing?",
    a: "Yes. We offer a guided demo session where you can see the system configured for a scenario similar to your facility. Request a demo from the contact page and we'll set it up within a few days.",
  },
  {
    q: "How is billing handled for multi-branch facilities?",
    a: "CareCore supports multi-location configurations. Each branch can operate independently while head office has a consolidated dashboard. Billing, stock, and staff management are separated per branch. Pricing for multi-branch setups is discussed during scoping.",
  },
];

const DOC_MODULES = [
  { title: "Getting Started", icon: "🚀", desc: "Installation checklist, first-login walkthrough, user role setup, and environment configuration for a new CareCore deployment." },
  { title: "OPD Management", icon: "🏥", desc: "Patient registration, appointment scheduling, triage workflows, consultation records, referrals, and discharge documentation." },
  { title: "Pharmacy Module", icon: "💊", desc: "Drug catalogue, stock management, prescription processing, dispensing workflows, expiry tracking, and restocking alerts." },
  { title: "Laboratory Management", icon: "🔬", desc: "Test order creation, specimen tracking, result entry, auto-notification to requesting clinician, and report generation." },
  { title: "Billing & Finance", icon: "🧾", desc: "Invoice generation, payment recording, NHIS integration, HMO billing, receipt management, and financial reporting." },
  { title: "Ward Management", icon: "🛏️", desc: "Bed allocation, admission and discharge workflows, ward round documentation, nursing notes, and observation charts." },
  { title: "Staff & Roles", icon: "👤", desc: "Staff profiles, role assignment, permission management, shift scheduling, and activity audit by user." },
  { title: "Reports & Analytics", icon: "📊", desc: "Pre-built operational reports, custom date range queries, department-level summaries, and data export." },
];

export function SupportPage({ setCurrentPage }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [activeTab, setActiveTab] = useState("faq");
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  const tabs = [
    { id: "faq", label: "FAQs" },
    { id: "docs", label: "Documentation" },
    { id: "contact", label: "Contact Support" },
  ];

  return (
    <PageShell>
      <BackBtn setCurrentPage={setCurrentPage} />
      <PageHero
        tag="SUPPORT CENTER"
        tagColor={C.mint}
        title="We're here when you need us."
        subtitle="Find answers, browse documentation, or reach the team directly. Support is included — we don't gate it behind expensive plans."
      />

      {/* Tab bar */}
      <Reveal delay={0.05}>
        <div style={{ display: "flex", gap: 4, marginBottom: 40, background: C.card, borderRadius: 12, padding: 5, border: `1px solid ${C.border}`, width: "fit-content" }}>
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} style={{
              background: activeTab === t.id ? `linear-gradient(135deg, ${C.accent}22, ${C.mint}14)` : "none",
              border: activeTab === t.id ? `1px solid ${C.accent}30` : "1px solid transparent",
              borderRadius: 9, padding: "9px 20px", fontSize: 13.5, fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? C.heading : C.textMuted, fontFamily: font, cursor: "pointer",
              transition: "all 0.2s",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      {/* FAQ Tab */}
      {activeTab === "faq" && (
        <div style={{ display: "grid", gap: 8 }}>
          {SUPPORT_FAQS.map((faq, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div style={{ background: C.card, border: `1px solid ${openFaq === i ? C.accent + "44" : C.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: "100%", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "20px 24px", cursor: "pointer", gap: 12,
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.heading, fontFamily: font, textAlign: "left", lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ color: C.accent, fontSize: 18, fontWeight: 300, flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 22px", borderTop: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.78, margin: "16px 0 0" }}>{faq.a}</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {/* Docs Tab */}
      {activeTab === "docs" && (
        <div>
          <Reveal>
            <div style={{ background: C.amberDim, border: `1px solid ${C.amber}22`, borderRadius: 12, padding: "16px 22px", marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0 }}>
                Detailed documentation is shared with clients during onboarding and available on request. The module overviews below summarise what each section covers. For full access, <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: "none", border: "none", color: C.accent, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer", padding: 0 }}>contact us</button> or request a demo.
              </p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {DOC_MODULES.map((mod, i) => (
              <Reveal key={mod.title} delay={i * 0.04}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 20px", height: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{mod.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 8px" }}>{mod.title}</h3>
                  <p style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0 }}>{mod.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support Tab */}
      {activeTab === "contact" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              {[
                { icon: "📞", title: "Phone / WhatsApp", value: COMPANY_PHONE, href: `https://wa.me/234${COMPANY_PHONE.replace(/^0/, "")}`, label: "Message on WhatsApp", color: C.mint },
                { icon: "📧", title: "Email", value: COMPANY_EMAIL, href: `mailto:${COMPANY_EMAIL}`, label: "Send Email", color: C.accent },
              ].map(ch => (
                <div key={ch.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "26px 24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{ch.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 6px" }}>{ch.title}</h3>
                  <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, margin: "0 0 16px" }}>{ch.value}</p>
                  <a href={ch.href} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: `${ch.color}1A`, border: `1px solid ${ch.color}30`, color: ch.color, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: font, textDecoration: "none" }}>
                    {ch.label}
                  </a>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "26px 28px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 14px" }}>Response Times</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  { tier: "Critical issues", time: "Same business day", note: "System down, data inaccessible" },
                  { tier: "Standard queries", time: "Within 48 hours", note: "Module questions, configuration help" },
                  { tier: "Feature requests", time: "Within 1 week", note: "Acknowledged and logged to roadmap" },
                ].map(t => (
                  <div key={t.tier} style={{ background: C.surface, borderRadius: 10, padding: "16px 18px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 4 }}>{t.tier}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.accent, fontFamily: font, marginBottom: 4 }}>{t.time}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font }}>{t.note}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, margin: "16px 0 0", lineHeight: 1.6 }}>
                Support hours are Monday–Friday, 8 AM–6 PM WAT. Urgent issues outside these hours can be raised via WhatsApp. We're a growing team — we'll always be honest about what we can address and when.
              </p>
            </div>
          </Reveal>
        </div>
      )}
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────
// PARTNER PROGRAM PAGE
// ─────────────────────────────────────────────────────────────────
const PARTNER_TIERS = [
  {
    name: "Implementation Partner",
    icon: "🏗️",
    color: C.accent,
    tagline: "Deploy CareCore for hospitals in your region.",
    description: "For IT companies, healthcare IT consultancies, and technology integrators who want to offer CareCore HMS as part of their service portfolio. You handle the client relationship and local deployment; we provide the platform, training, and technical support.",
    benefits: [
      "Reseller margin on CareCore subscriptions",
      "Co-selling support from the Orion Soft team",
      "Access to partner training and certification",
      "Priority technical support line",
      "Joint case study opportunities",
    ],
    eligibility: "IT company or consultancy with demonstrable experience in healthcare or enterprise deployments. Nigeria or West Africa focus preferred.",
  },
  {
    name: "Referral Partner",
    icon: "🤝",
    color: C.mint,
    tagline: "Refer hospitals. Earn a commission.",
    description: "For healthcare consultants, medical equipment suppliers, hospital administrators, and others who interact with healthcare facilities regularly. If you introduce us to a facility that becomes a CareCore client, you earn a referral fee — simple as that.",
    benefits: [
      "Fixed referral fee per successful sign-up",
      "No technical skills required",
      "No quota or volume commitment",
      "Transparent tracking of your referrals",
    ],
    eligibility: "Anyone with regular contact with hospital or clinic decision-makers in Nigeria. Healthcare background preferred but not required.",
  },
  {
    name: "Technology Partner",
    icon: "⚙️",
    color: C.purple,
    tagline: "Build integrations with CareCore.",
    description: "For software companies, medical device manufacturers, and platforms that want to integrate with CareCore — whether to push data from diagnostic devices, pull clinical data for analytics, or add complementary services to the CareCore ecosystem.",
    benefits: [
      "Access to the CareCore API documentation",
      "Sandbox environment for integration testing",
      "Co-marketing opportunities for joint customers",
      "Technical guidance from the CareCore engineering team",
    ],
    eligibility: "Active software product or device with a relevant integration use case. Technical proposal required.",
  },
];

export function PartnersPage({ setCurrentPage }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  return (
    <PageShell>
      <BackBtn setCurrentPage={setCurrentPage} />
      <PageHero
        tag="PARTNER PROGRAM"
        tagColor={C.purple}
        title="Grow with Orion Soft."
        subtitle="We're building the ecosystem for healthcare technology in Nigeria. Whether you implement, refer, or integrate — there's a path for you."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 18, marginBottom: 48 }}>
        {PARTNER_TIERS.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.07}>
            <div
              onClick={() => setSelected(selected === i ? null : i)}
              style={{
                background: selected === i ? tier.color + "0F" : C.card,
                border: `1px solid ${selected === i ? tier.color + "44" : C.border}`,
                borderRadius: 16, padding: "28px 24px", cursor: "pointer",
                transition: "all 0.25s", height: "100%", boxSizing: "border-box",
              }}
              onMouseEnter={e => { if (selected !== i) { e.currentTarget.style.borderColor = tier.color + "30"; e.currentTarget.style.background = tier.color + "06"; }}}
              onMouseLeave={e => { if (selected !== i) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}}
            >
              <div style={{ fontSize: 28, marginBottom: 14 }}>{tier.icon}</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: tier.color, fontFamily: font, letterSpacing: "0.08em", marginBottom: 6 }}>{tier.name.toUpperCase()}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 10px", letterSpacing: "-0.01em" }}>{tier.tagline}</h3>
              <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.72, margin: "0 0 18px" }}>{tier.description}</p>
              <div style={{ marginBottom: 16 }}>
                {tier.benefits.map(b => (
                  <div key={b} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
                    <span style={{ color: tier.color, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: tier.color + "0E", border: `1px solid ${tier.color}20`, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: tier.color, fontFamily: font, marginBottom: 4 }}>ELIGIBILITY</div>
                <div style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.6 }}>{tier.eligibility}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* How to apply */}
      <Reveal delay={0.18}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px clamp(20px, 4vw, 40px)" }}>
          <h2 style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            How to apply
          </h2>
          <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 24px", maxWidth: 600 }}>
            The partner program is currently in its early phase. We're accepting applications and working with early partners directly. Send us a message with the partner type you're interested in and a brief description of your background.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={`mailto:${COMPANY_EMAIL}?subject=Partner%20Program%20Application`}
              style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, color: C.bg, borderRadius: 10, padding: "13px 24px", fontSize: 14, fontWeight: 700, fontFamily: font, textDecoration: "none", display: "inline-block" }}>
              Apply via Email
            </a>
            <a href={`https://wa.me/234${COMPANY_PHONE.replace(/^0/, "")}?text=Hello,%20I%27m%20interested%20in%20the%20Orion%20Soft%20Partner%20Program`}
              target="_blank" rel="noreferrer"
              style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 600, fontFamily: font, textDecoration: "none", display: "inline-block" }}>
              Message on WhatsApp
            </a>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────
// TECH STACK PAGE
// ─────────────────────────────────────────────────────────────────
const TECH_CATEGORIES = [
  {
    category: "Frontend",
    color: C.accent,
    items: [
      { name: "React 18", note: "Component architecture, concurrent rendering, Suspense-based code splitting" },
      { name: "Vite", note: "Build tooling, fast development server, optimised production bundles" },
      { name: "JavaScript (ES2022+)", note: "No TypeScript yet — pragmatic choice for a small team moving fast" },
    ],
  },
  {
    category: "Backend & API",
    color: C.mint,
    items: [
      { name: "Node.js", note: "Server runtime for the CareCore API layer and background jobs" },
      { name: "REST API", note: "118 documented endpoints across all clinical and administrative modules" },
      { name: "WebSockets", note: "Real-time ward updates, live bed status, and notification delivery" },
    ],
  },
  {
    category: "Data",
    color: C.purple,
    items: [
      { name: "PostgreSQL", note: "Primary relational database for patient records, transactions, and audit logs" },
      { name: "Redis", note: "Session caching, rate limiting, and short-lived background queue state" },
      { name: "Encrypted fields", note: "Sensitive PII and clinical data encrypted at the field level" },
    ],
  },
  {
    category: "Infrastructure",
    color: C.gold,
    items: [
      { name: "Cloud hosting", note: "Enterprise cloud infrastructure with SLA-backed uptime guarantees" },
      { name: "TLS 1.3", note: "All traffic encrypted in transit, enforced across every endpoint" },
      { name: "Automated backups", note: "Daily snapshots with tested restoration procedures" },
    ],
  },
  {
    category: "Practices",
    color: C.rose,
    items: [
      { name: "Code review", note: "Every change reviewed before it reaches production" },
      { name: "Audit logging", note: "Tamper-evident logs for all clinical and administrative actions" },
      { name: "Role-based access", note: "Permissions enforced at API level, not just UI level" },
    ],
  },
];

export function TechStackPage({ setCurrentPage }) {
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  return (
    <PageShell>
      <BackBtn setCurrentPage={setCurrentPage} />
      <PageHero
        tag="TECHNOLOGY STACK"
        tagColor={C.purple}
        title="Built with proven, production-grade tools."
        subtitle="We chose boring technology where reliability matters and modern where it gives us speed. No framework chasing — each choice has a practical reason."
      />

      <div style={{ display: "grid", gap: 20 }}>
        {TECH_CATEGORIES.map((cat, i) => (
          <Reveal key={cat.category} delay={i * 0.06}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "18px 26px", borderBottom: `1px solid ${C.border}`, background: cat.color + "09" }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: cat.color, fontFamily: font, margin: 0 }}>{cat.category}</h2>
              </div>
              <div style={{ padding: "6px 0" }}>
                {cat.items.map((item, ii) => (
                  <div key={item.name} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 26px", borderBottom: ii < cat.items.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0, marginTop: 6 }} />
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65 }}>{item.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <div style={{ marginTop: 32, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "26px 28px" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 10px" }}>A note on openness</h2>
          <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>
            We publish our technology choices because technical decision-makers at hospitals deserve to understand what they're running. If you have specific questions about the stack — integrations, data portability, API access — ask us directly.
          </p>
        </div>
      </Reveal>
    </PageShell>
  );
}
