import { useState, useEffect, useRef } from "react";

// ── Design tokens ──────────────────────────────────────────────────
const C = {
  bg:        "#060810",
  surface:   "#0B1120",
  card:      "#0F1828",
  cardHover: "#141E30",
  border:    "rgba(255,255,255,0.07)",
  borderGold:"rgba(200,168,80,0.25)",
  heading:   "#F2F6FF",
  text:      "#C8D0E0",
  textMuted: "#6B7A96",
  gold:      "#C8A850",
  goldLt:    "#E8C96A",
  goldDim:   "rgba(200,168,80,0.12)",
  goldGlow:  "rgba(200,168,80,0.22)",
  blue:      "#4F8EF7",
  blueDim:   "rgba(79,142,247,0.12)",
  mint:      "#10B981",
  mintDim:   "rgba(16,185,129,0.12)",
  purple:    "#8B5CF6",
  purpleDim: "rgba(139,92,246,0.12)",
  amber:     "#F59E0B",
  amberDim:  "rgba(245,158,11,0.12)",
  rose:      "#F43F5E",
  roseDim:   "rgba(244,63,94,0.12)",
  accent:    "#4F8EF7",
  accentDim: "rgba(79,142,247,0.12)",
  shadow:    "0 4px 24px rgba(0,0,0,0.18)",
  shadowLg:  "0 12px 48px rgba(0,0,0,0.28)",
  shadowGold:"0 8px 28px rgba(200,168,80,0.28)",
};
const font = "'Instrument Sans','DM Sans',system-ui,-apple-system,sans-serif";
const COMPANY_EMAIL = "orionsoftlimited@gmail.com";
const COMPANY_PHONE = "08169577059";
const COMPANY_RC = "9535128";

// ── Helpers ────────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(18px)",
        transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function PageShell({ children }) {
  return (
    <section style={{ minHeight: "100vh", background: C.bg, padding: "110px clamp(16px,4vw,32px) 96px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

function BackBtn({ setCurrentPage, to = "home" }) {
  return (
    <button
      type="button"
      onClick={() => setCurrentPage(to)}
      style={{
        background: "none", border: "none", color: C.accent, fontSize: 14,
        fontFamily: font, cursor: "pointer", marginBottom: 32, fontWeight: 700,
        display: "flex", alignItems: "center", gap: 6, padding: 0,
      }}
    >
      ← Back
    </button>
  );
}

function PageHero({ tag, tagColor = C.accent, title, subtitle }) {
  return (
    <Reveal>
      <span style={{ fontSize: 12, fontWeight: 800, color: tagColor, fontFamily: font, letterSpacing: "0.1em" }}>{tag}</span>
      <h1 style={{
        fontSize: "clamp(30px,5vw,52px)", fontWeight: 800, color: C.heading,
        fontFamily: font, letterSpacing: "-0.025em", margin: "10px 0 14px", lineHeight: 1.1,
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 17, color: C.text, fontFamily: font, lineHeight: 1.75, maxWidth: 660, margin: "0 0 40px" }}>
          {subtitle}
        </p>
      )}
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
    quote: "Before CareCore, I would spend the first hour of every morning chasing down patient folders. Now everything is there when I log in. The pharmacy team especially: they finally know what stock is available without checking the shelf.",
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
    problem: "Lab results were printed and filed manually. Doctors in the outpatient clinic had no direct view of test results; patients had to physically carry paper results. Billing was done separately, causing double-charge errors that required manual corrections every week.",
    solution: "CareCore's lab module was integrated with the OPD and billing systems. Lab results now post directly to patient records and are visible to the attending clinician in real time. Billing is generated automatically from orders placed, eliminating the double-entry step.",
    outcomes: [
      { metric: "Real-time", label: "Lab results to clinician" },
      { metric: "Zero", label: "Manual billing reconciliation" },
      { metric: "Faster throughput", label: "Patient flow per session" },
    ],
    quote: "Our lab used to be an island: results went on paper, patients carried them around, doctors sometimes never saw them. Now everything connects. The clinical team can make decisions faster because the information is already there.",
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
    problem: "The hospital was running operations across several disconnected spreadsheets: one for OPD attendance, one for billing, one for stock. Management had no single view of operations, and monthly reporting required days of manual consolidation from different departments.",
    solution: "Orion Soft conducted a two-day on-site discovery before deploying the full CareCore suite. All departments were connected: OPD, clinical, pharmacy, billing, and the management reporting dashboard. Staff training ran concurrently with deployment, with the Orion Soft team on-site for the first week post-launch.",
    outcomes: [
      { metric: "All departments", label: "On one platform" },
      { metric: "Live dashboard", label: "Management reporting" },
      { metric: "On-site support", label: "First two weeks" },
    ],
    quote: "We had tried another system before and it didn't stick. Too complicated, and the vendor disappeared after installation. With Orion Soft the support was different. They stayed until the team was confident, and they're still reachable when we need them.",
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
        subtitle="Every case study below represents a genuine implementation. Outcomes are described as they were reported, without inflation."
      />

      <div style={{ display: "grid", gap: 28 }}>
        {CASE_STUDIES.map((cs, i) => (
          <Reveal key={cs.id} delay={i * 0.07}>
            <article
              style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 18, overflow: "hidden", transition: "border-color 0.25s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = cs.color + "44")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
            >
              {/* Header */}
              <div style={{ padding: "28px 32px 24px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, background: cs.color + "1A", color: cs.color, border: `1px solid ${cs.color}30`, borderRadius: 6, padding: "3px 10px", fontFamily: font }}>
                        {cs.industry}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textMuted, fontFamily: font, padding: "3px 8px" }}>
                        {cs.location} · {cs.size}
                      </span>
                    </div>
                    <h2 style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: 0 }}>
                      {cs.client}
                    </h2>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {cs.modules.slice(0, 3).map(m => (
                      <span key={m} style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 9px", fontFamily: font, whiteSpace: "nowrap" }}>
                        {m}
                      </span>
                    ))}
                    {cs.modules.length > 3 && (
                      <span style={{ fontSize: 11, color: C.textMuted, fontFamily: font }}>+{cs.modules.length - 3} more</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics row */}
              <div style={{ display: "flex", background: cs.color + "08", borderBottom: `1px solid ${C.border}` }}>
                {cs.outcomes.map((o, oi) => (
                  <div key={o.label} style={{ flex: 1, textAlign: "center", padding: "18px 12px", borderRight: oi < cs.outcomes.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ fontSize: "clamp(15px,2vw,20px)", fontWeight: 800, color: cs.color, fontFamily: font, letterSpacing: "-0.02em" }}>{o.metric}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font, marginTop: 3 }}>{o.label}</div>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div style={{ padding: "28px 32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 28 }}>
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, fontFamily: font, letterSpacing: "0.08em", marginBottom: 10 }}>THE CHALLENGE</h3>
                    <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.78, margin: 0 }}>{cs.problem}</p>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, fontFamily: font, letterSpacing: "0.08em", marginBottom: 10 }}>THE SOLUTION</h3>
                    <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.78, margin: 0 }}>{cs.solution}</p>
                  </div>
                </div>
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

      <Reveal delay={0.2}>
        <div style={{ marginTop: 56, background: `linear-gradient(135deg,${C.accent}10,${C.mint}06)`, border: `1px solid ${C.accent}28`, borderRadius: 16, padding: "36px clamp(20px,4vw,48px)", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            Ready to start your own deployment?
          </h2>
          <p style={{ fontSize: 15, color: C.text, fontFamily: font, lineHeight: 1.7, margin: "0 0 24px" }}>
            We'll scope the right configuration for your facility, explain the process, and give you an honest timeline before anything is signed.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: `linear-gradient(135deg,${C.accent},${C.mint})`, color: C.bg, border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
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
    body: "Every significant action in CareCore, including record creation, edits, deletions, and access events, is written to a tamper-evident audit log. Hospital administrators can review who did what and when.",
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

const REGULATORY_ITEMS = [
  {
    code: "NDPR",
    title: "Nigeria Data Protection Regulation",
    color: C.blue,
    body: "All data processed lawfully under the NDPR framework. We maintain records of processing activities, conduct DPIAs for high-risk processing, and respond to data subject requests within statutory timeframes.",
  },
  {
    code: "CBN",
    title: "CBN IT Standards",
    color: C.gold,
    body: "Central Bank of Nigeria IT Governance: FinanceCore and ComplianceCore modules are designed to meet CBN IT governance requirements for licensed financial institutions, including audit trail requirements and data integrity controls.",
  },
  {
    code: "ISO",
    title: "ISO 27001 Alignment",
    color: C.mint,
    body: "ISO 27001-aligned Practices: Our information security management practices are aligned with ISO 27001:2022 standards. Formal certification is on our 2026 roadmap. We currently operate access controls, encryption, vulnerability scanning, and incident response.",
  },
  {
    code: "NITDA",
    title: "NITDA Registration",
    color: C.purple,
    body: "NITDA Vendor Registration: Registered as a Nigerian IT solutions provider with NITDA, the prerequisite for supplying software to federal ministries, departments, and agencies.",
  },
];

const INCIDENT_METRICS = [
  { metric: "4 hours", label: "Client notification SLA for any incident affecting client data", color: C.rose },
  { metric: "Documented", label: "Dedicated incident response procedure, maintained and tested", color: C.amber },
  { metric: "72 hours", label: "Post-incident root cause analysis and written client report delivered", color: C.mint },
  { metric: "Direct line", label: "Security contact: email with subject \"SECURITY\" for priority routing", color: C.blue },
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
        subtitle="CareCore handles patient records, clinical data, and financial information. We take that responsibility seriously. This page explains exactly what we do and what we don't do."
      />

      <Reveal delay={0.05}>
        <div style={{ background: C.amberDim, border: `1px solid ${C.amber}22`, borderRadius: 12, padding: "18px 24px", marginBottom: 40 }}>
          <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: C.amber }}>Honest note:</strong> We are a growing Nigerian software company. We do not yet hold ISO 27001 or SOC 2 certifications. What we have is a security-conscious engineering culture, documented practices, and a commitment to NDPR compliance. We will update this page as our certifications evolve.
          </p>
        </div>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 14, marginBottom: 48 }}>
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

      <Reveal delay={0.15}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 12px" }}>Responsible Disclosure</h2>
          <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 14px" }}>
            If you discover a security vulnerability in CareCore or this website, please report it privately before publishing. We will acknowledge reports within 48 hours and work to resolve verified issues promptly.
          </p>
          <a href={`mailto:${COMPANY_EMAIL}?subject=Security%20Disclosure`} style={{ color: C.accent, fontFamily: font, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            {COMPANY_EMAIL}
          </a>
        </div>
      </Reveal>

      <Reveal delay={0.17}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px", marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 12px" }}>Your Data Rights</h2>
          <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 16px" }}>
            Under the NDPR and as a matter of policy, you have the right to access, correct, or request deletion of personal data held about you. Facilities using CareCore can request a full data export at any time. To exercise any of these rights:
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={`mailto:${COMPANY_EMAIL}`} style={{ background: `linear-gradient(135deg,${C.accent},${C.mint})`, color: C.bg, borderRadius: 9, padding: "10px 20px", fontSize: 13.5, fontWeight: 700, fontFamily: font, textDecoration: "none", display: "inline-block" }}>
              Email Us
            </a>
            <button type="button" onClick={() => setCurrentPage("privacy")} style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>
              Read Privacy Policy
            </button>
          </div>
        </div>
      </Reveal>

      {/* Regulatory Compliance */}
      <Reveal delay={0.19}>
        <h2 style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Regulatory Compliance
        </h2>
        <p style={{ fontSize: 15, color: C.text, fontFamily: font, lineHeight: 1.7, margin: "0 0 20px" }}>
          Our products are designed to operate within the Nigerian regulatory environment and the compliance obligations of our clients.
        </p>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14, marginBottom: 40 }}>
        {REGULATORY_ITEMS.map((item, i) => (
          <Reveal key={item.code} delay={0.2 + i * 0.05}>
            <div style={{
              background: C.card,
              borderTop: `1px solid ${C.border}`,
              borderRight: `1px solid ${C.border}`,
              borderBottom: `1px solid ${C.border}`,
              borderLeft: `4px solid ${item.color}`,
              borderRadius: 14,
              padding: "22px 22px 22px 20px",
              height: "100%",
              boxSizing: "border-box",
            }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: item.color + "18", border: `1px solid ${item.color}30`, borderRadius: 7, padding: "3px 10px", fontSize: 11, fontWeight: 900, color: item.color, fontFamily: font, letterSpacing: "0.05em", marginBottom: 12 }}>
                {item.code}
              </div>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 9px" }}>{item.title}</h3>
              <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Security Incident Response */}
      <Reveal delay={0.24}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px clamp(20px,4vw,36px)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
            Security Incident Response
          </h2>
          <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 24px" }}>
            In the event of any security incident affecting client data, we follow a documented incident response procedure. Clients are never the last to know.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 24 }}>
            {INCIDENT_METRICS.map((item, i) => (
              <div key={i} style={{ background: C.surface, borderRadius: 12, padding: "18px 20px", borderTop: `3px solid ${item.color}` }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: item.color, fontFamily: font, marginBottom: 6 }}>{item.metric}</div>
                <div style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.6 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.surface, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, color: C.textMuted, fontFamily: font }}>Direct security contact:</span>
            <a href={`mailto:${COMPANY_EMAIL}?subject=SECURITY`} style={{ color: C.accent, fontFamily: font, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              {COMPANY_EMAIL}
            </a>
            <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font }}>(subject line: "SECURITY")</span>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUPPORT PAGE
// ─────────────────────────────────────────────────────────────────
const SLA_TABLE_ROWS = [
  { label: "Response time",  starter: "48h",                           standard: "24h",                       priority: "4h",                       enterprise: "1h" },
  { label: "Availability",   starter: "Business hours Mon–Fri 8am–6pm", standard: "Extended Mon–Sat 8am–8pm", priority: "7am–10pm daily",            enterprise: "24/7" },
  { label: "Channels",       starter: "Email",                          standard: "Email + WhatsApp",          priority: "Email + WhatsApp + Phone",  enterprise: "All + Dedicated account manager" },
  { label: "Onsite visits",  starter: "No",                             standard: "No",                        priority: "Quarterly",                 enterprise: "Monthly" },
  { label: "SLA guarantee",  starter: "No",                             standard: "No",                        priority: "Yes",                       enterprise: "Yes" },
];

const SUPPORT_CHANNELS_LIST = [
  { icon: "💬", title: "Dedicated WhatsApp group per client", color: C.mint, desc: "Every client gets their own WhatsApp group with the Orion Soft support team from day one of deployment. Issues can be raised directly and escalated to a formal ticket when needed." },
  { icon: "🎫", title: "In-app ticket system", color: C.accent, desc: "Raise and track support tickets directly from within CareCore or SchoolCore. Every ticket is logged, assigned, and resolved with a full timestamp trail." },
  { icon: "📧", title: "Email support", color: C.blue, desc: `${COMPANY_EMAIL}: for non-urgent queries, documentation requests, configuration questions, and billing matters.` },
  { icon: "📞", title: "Phone (business hours)", color: C.amber, desc: `${COMPANY_PHONE}: direct phone support during business hours. Available on Standard plans and above.` },
  { icon: "🏥", title: "Onsite visits (Priority and Enterprise)", color: C.purple, desc: "In-person visits to your facility for training, troubleshooting, and system reviews. Quarterly for Priority clients, monthly for Enterprise." },
];

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
    a: "You get post-launch support for the first two weeks. Our team is available daily to address issues as your staff settles in. After that, you move to standard support with response time targets based on your plan. We don't disappear after installation.",
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
        subtitle="Find answers, browse documentation, or reach the team directly. Support is included. We don't gate it behind expensive plans."
      />

      {/* SLA Tiers Table */}
      <Reveal delay={0.04}>
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            Support Tiers
          </h2>
          <p style={{ fontSize: 15, color: C.text, fontFamily: font, lineHeight: 1.7, margin: "0 0 20px" }}>
            Choose the level of support that matches your operational requirements.
          </p>
          <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${C.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 11.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}`, minWidth: 130 }}>FEATURE</th>
                  {["Starter", "Standard", "Priority", "Enterprise"].map((tier, i) => (
                    <th key={tier} style={{ textAlign: "center", padding: "14px 16px", fontSize: 13, fontWeight: 800, color: i === 3 ? C.gold : C.heading, borderBottom: `1px solid ${C.border}`, minWidth: 130 }}>
                      {tier}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLA_TABLE_ROWS.map((row, ri) => (
                  <tr key={row.label} style={{ background: ri % 2 === 0 ? C.card : C.surface }}>
                    <td style={{ padding: "14px 20px", fontSize: 13.5, fontWeight: 700, color: C.heading, borderBottom: `1px solid ${C.border}` }}>
                      {row.label}
                    </td>
                    {[row.starter, row.standard, row.priority, row.enterprise].map((val, ci) => (
                      <td key={ci} style={{
                        padding: "13px 16px", fontSize: 13, textAlign: "center",
                        borderBottom: `1px solid ${C.border}`,
                        color: val === "Yes" ? C.mint : val === "No" ? C.textMuted : C.text,
                        fontWeight: val === "Yes" || val === "No" ? 700 : 400,
                      }}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {/* Support Channels */}
      <Reveal delay={0.06}>
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
            Support Channels
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
            {SUPPORT_CHANNELS_LIST.map((ch, i) => (
              <Reveal key={ch.title} delay={i * 0.05}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 20px", height: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{ch.icon}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 8px" }}>{ch.title}</h3>
                  <p style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.72, margin: 0 }}>{ch.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Tab bar */}
      <Reveal delay={0.08}>
        <div style={{ display: "flex", gap: 4, marginBottom: 40, background: C.card, borderRadius: 12, padding: 5, border: `1px solid ${C.border}`, width: "fit-content", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} style={{
              background: activeTab === t.id ? `linear-gradient(135deg,${C.mint}20,${C.accent}14)` : "none",
              border: activeTab === t.id ? `1px solid ${C.mint}30` : "1px solid transparent",
              borderRadius: 9, padding: "9px 20px", fontSize: 13.5,
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? C.heading : C.textMuted,
              fontFamily: font, cursor: "pointer", transition: "all 0.2s",
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
              <div style={{ background: C.card, border: `1px solid ${openFaq === i ? C.mint + "44" : C.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", cursor: "pointer", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.heading, fontFamily: font, textAlign: "left", lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ color: C.mint, fontSize: 18, fontWeight: 300, flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
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
                Detailed documentation is shared with clients during onboarding and available on request. For full access,{" "}
                <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: "none", border: "none", color: C.accent, fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                  contact us
                </button>{" "}
                or request a demo.
              </p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
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
                Standard support hours are Monday–Friday, 8 AM–6 PM WAT. Urgent issues outside these hours can be raised via WhatsApp. We're a growing team. We'll always be honest about what we can address and when.
              </p>
            </div>
          </Reveal>
        </div>
      )}
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────
// PARTNERS PAGE — editorial 2-col tech partner grid
// ─────────────────────────────────────────────────────────────────
const TECH_PARTNERS = [
  {
    name: "AWS",
    initial: "AWS",
    badgeBg: "#FF6B00",
    color: "#FF6B00",
    role: "Cloud Infrastructure & Storage",
    description: "All Orion Soft products run on AWS infrastructure across EU West and Middle East South regions. We use EC2 for compute-intensive operations, S3 for document and media storage, RDS for relational databases, and CloudWatch for infrastructure monitoring. AWS's global availability zones give our clients enterprise-grade uptime without the cost of local data center arrangements. Our infrastructure is reviewed by AWS Well-Architected Framework standards annually.",
  },
  {
    name: "Vercel",
    initial: "▲",
    badgeBg: "#4F8EF7",
    color: "#4F8EF7",
    role: "Edge Deployment & CDN",
    description: "Client portals and public-facing applications deploy to Vercel's global edge network, with automatic rollbacks, preview deployments for QA staging, and sub-100ms time-to-first-byte for visitors across Nigeria. Vercel's serverless functions handle our API layer with zero cold-start penalty on the endpoints our clients hit most frequently. All deployments are logged, versioned, and can be rolled back in under 60 seconds.",
  },
  {
    name: "Upstash",
    initial: "U",
    badgeBg: "#10B981",
    color: "#10B981",
    role: "Serverless Redis & Real-time Analytics",
    description: "Upstash provides our real-time data layer: session management, visitor analytics, lead tracking, rate limiting, and real-time dashboard data. We chose Upstash for its per-request pricing model and global replication, which keeps latency low for clients across Nigeria without provisioning dedicated Redis servers. All data in Upstash is encrypted at rest and in transit.",
  },
  {
    name: "Groq",
    initial: "G",
    badgeBg: "#F43F5E",
    color: "#F43F5E",
    role: "Low-latency AI Inference",
    description: "The Ori AI assistant across CareCore, SchoolCore, and ComplianceCore runs on Groq's LPU (Language Processing Unit) inference hardware. Groq's latency profile (under 100ms for most requests) was the deciding factor in selecting it over alternatives. Fast enough for Nigerian internet conditions without a degraded user experience. Ori processes thousands of queries daily across deployed client systems.",
  },
  {
    name: "GitHub",
    initial: "GH",
    badgeBg: "#8B5CF6",
    color: "#8B5CF6",
    role: "Version Control & CI/CD Pipelines",
    description: "All product codebases are managed on GitHub with branch protection rules, mandatory code reviews, and automated CI checks before every merge to production. Security scanning runs on every commit. Enterprise plan clients receive read-only access to a deployment changelog and release notes for their system. No code reaches production without passing all checks.",
  },
  {
    name: "Flutterwave",
    initial: "FW",
    badgeBg: "#F59E0B",
    color: "#F59E0B",
    role: "Payment Gateway Integration",
    description: "FinanceCore and CareCore billing integrate with Flutterwave's payment API for card payments, bank transfers, USSD payment collection, and payment links. Flutterwave handles PCI DSS scope for card data, keeping our products off the compliance burden for payment card handling. The integration supports NGN, USD, GBP, and EUR for international clients.",
  },
];

export function PartnersPage({ setCurrentPage }) {
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  return (
    <PageShell>
      <BackBtn setCurrentPage={setCurrentPage} />
      <PageHero
        tag="TECHNOLOGY PARTNERS"
        tagColor={C.gold}
        title="Infrastructure and integrations."
        subtitle="The platforms Orion Soft products run on, and why we chose each one."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,460px),1fr))", gap: 18, marginBottom: 48 }}>
        {TECH_PARTNERS.map((partner, i) => (
          <Reveal key={partner.name} delay={i * 0.06}>
            <div
              style={{
                background: C.card,
                borderTop: `1px solid ${C.border}`,
                borderRight: `1px solid ${C.border}`,
                borderBottom: `1px solid ${C.border}`,
                borderLeft: `4px solid ${partner.color}`,
                borderRadius: 16,
                padding: "28px 28px 28px 24px",
                height: "100%",
                boxSizing: "border-box",
                transition: "background 0.22s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
              onMouseLeave={e => e.currentTarget.style.background = C.card}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{
                  background: partner.badgeBg,
                  color: "#fff",
                  borderRadius: 10,
                  width: 44, height: 44,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, fontFamily: font,
                  flexShrink: 0, letterSpacing: "0.02em",
                }}>
                  {partner.initial}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.01em" }}>
                    {partner.name}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: partner.color, fontFamily: font, letterSpacing: "0.04em", marginTop: 2 }}>
                    {partner.role}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.78, margin: 0 }}>
                {partner.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.22}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px clamp(20px,4vw,40px)" }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: C.gold, fontFamily: font, letterSpacing: "0.09em" }}>PARTNER PROGRAM</span>
          <h2 style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 800, color: C.heading, fontFamily: font, margin: "8px 0 10px", letterSpacing: "-0.02em" }}>
            Become a partner
          </h2>
          <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 24px", maxWidth: 600 }}>
            We work with implementation partners, referral partners, and technology integrators. If you want to deploy Orion Soft products for your clients, refer hospitals, or build integrations, reach out.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href={`mailto:${COMPANY_EMAIL}?subject=Partner%20Program%20Application`}
              style={{ background: `linear-gradient(135deg,${C.gold},${C.goldLt})`, color: C.bg, borderRadius: 10, padding: "13px 24px", fontSize: 14, fontWeight: 700, fontFamily: font, textDecoration: "none", display: "inline-block" }}
            >
              Apply via Email
            </a>
            <a
              href={`https://wa.me/234${COMPANY_PHONE.replace(/^0/, "")}?text=Hello,%20I%27m%20interested%20in%20partnering%20with%20Orion%20Soft`}
              target="_blank" rel="noreferrer"
              style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 600, fontFamily: font, textDecoration: "none", display: "inline-block" }}
            >
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
      { name: "JavaScript (ES2022+)", note: "No TypeScript yet: a pragmatic choice for a small team moving fast" },
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
        subtitle="We chose boring technology where reliability matters and modern where it gives us speed. No framework chasing. Each choice has a practical reason."
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
            We publish our technology choices because technical decision-makers at hospitals deserve to understand what they're running. If you have specific questions about the stack (integrations, data portability, API access), ask us directly.
          </p>
        </div>
      </Reveal>
    </PageShell>
  );
}
