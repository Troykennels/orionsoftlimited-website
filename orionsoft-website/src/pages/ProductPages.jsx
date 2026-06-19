import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════
// DESIGN TOKENS — mirror App.jsx exactly (lazy-load isolation)
// ═══════════════════════════════════════
const C = {
  bg:         "#060810",
  surface:    "#0B1120",
  card:       "#0F1828",
  cardHover:  "#141E30",
  border:     "rgba(255,255,255,0.07)",
  borderHover:"rgba(200,168,80,0.35)",
  white:      "#FFFFFF",
  heading:    "#F2F6FF",
  text:       "#C8D0E0",
  textMuted:  "#6B7A96",
  gold:       "#C8A850",
  goldLight:  "#E8C96A",
  goldDim:    "rgba(200,168,80,0.12)",
  goldGlow:   "rgba(200,168,80,0.22)",
  blue:       "#4F8EF7",
  blueDim:    "rgba(79,142,247,0.12)",
  blueGlow:   "rgba(79,142,247,0.22)",
  mint:       "#10B981",
  mintDim:    "rgba(16,185,129,0.12)",
  purple:     "#8B5CF6",
  purpleDim:  "rgba(139,92,246,0.12)",
  amber:      "#F59E0B",
  amberDim:   "rgba(245,158,11,0.12)",
  rose:       "#F43F5E",
  roseDim:    "rgba(244,63,94,0.12)",
  accent:     "#4F8EF7",
  accentDim:  "rgba(79,142,247,0.12)",
  accentGlow: "rgba(79,142,247,0.22)",
  light:      "#F8FAFC",
  lightCard:  "#FFFFFF",
  lightBorder:"#E2E8F0",
  lightText:  "#334155",
  lightMuted: "#94A3B8",
  lightHeading:"#0F172A",
  success:    "#10B981",
  danger:     "#F43F5E",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";
const COMPANY_EMAIL = "orionsoftlimited@gmail.com";

const CARECORE_ASSETS = {
  dashboard: "/assets/carecore/dashboard-overview.png",
  quickActions: "/assets/carecore/quick-actions.png",
  operations: "/assets/carecore/operations-view.png",
  profile: "/assets/carecore/profile-settings.png",
};
const CARECORE_MEDIA = [
  { src: CARECORE_ASSETS.dashboard, title: "Executive dashboard", desc: "Facility metrics, visits, staff, stock alerts, appointments, and daily operations at a glance." },
  { src: CARECORE_ASSETS.quickActions, title: "Fast clinical actions", desc: "Common workflows such as registration, diagnosis, appointment booking, ward admission, prescriptions, lab requests, and invoicing." },
  { src: CARECORE_ASSETS.operations, title: "Operations view", desc: "A responsive command center for patient activity, finance, staff performance, pharmacy alerts, and reporting." },
  { src: CARECORE_ASSETS.profile, title: "Staff profile and permissions", desc: "Clear staff profile management and role-aware interface patterns for secure hospital administration." },
];

// ═══════════════════════════════════════
// PRODUCT REGISTRY
// ═══════════════════════════════════════
const PRODUCTS = {
  carecore: {
    name: "CareCore", tag: "HEALTHCARE HMS", tagline: "The operating system for Nigerian hospitals.",
    desc: "A complete, production-ready hospital management system covering every clinical and administrative workflow — from patient registration to discharge, billing, pharmacy, and real-time analytics.",
    color: "#4F8EF7", colorDim: "rgba(79,142,247,0.12)", available: true, category: "Healthcare",
    forWho: ["Government & Private Hospitals", "Clinics & Health Centres", "Diagnostic Laboratories", "Pharmacies", "Maternity Homes"],
    modules: [
      { name: "Electronic Health Records", desc: "Complete digital patient history, diagnoses, allergies, and clinical notes." },
      { name: "Outpatient (OPD)", desc: "Triage, vitals, consultation queue, clinical notes, referrals." },
      { name: "Inpatient (IPD) & Ward", desc: "Admissions, bed management, ward rounds, discharge summaries." },
      { name: "Pharmacy", desc: "Drug inventory, dispensing, expiry alerts, supplier orders." },
      { name: "Laboratory (LIS)", desc: "Test requests, results, reference ranges, report printing." },
      { name: "Billing & Finance", desc: "Fee schedules, invoicing, insurance claims, payments, reports." },
      { name: "Appointments", desc: "Doctor scheduling, online booking, reminders, rescheduling." },
      { name: "Staff Management", desc: "Staff records, shifts, roles, permissions, payroll integration." },
      { name: "Radiology (PACS)", desc: "Imaging requests, results management, DICOM viewer integration." },
      { name: "Executive Analytics", desc: "Real-time KPIs, bed occupancy, revenue, clinical outcomes." },
    ],
    headline2: "25+ modules. Deployed in weeks.",
  },
  schoolcore: {
    name: "SchoolCore", tag: "SCHOOL MANAGEMENT", tagline: "Run your school. Not your spreadsheets.",
    desc: "An end-to-end school management platform that handles admissions, academics, fees, communication, and reporting — for primary schools, secondary schools, and tertiary institutions.",
    color: "#10B981", colorDim: "rgba(16,185,129,0.12)", available: true, category: "Education",
    forWho: ["Primary & Secondary Schools", "Universities & Polytechnics", "Vocational & Training Centres", "Montessori & Nursery Schools"],
    modules: [
      { name: "Admissions & Enrolment", desc: "Online application, document upload, class placement, student IDs." },
      { name: "Attendance Management", desc: "Daily roll call, term summaries, parent notifications, reports." },
      { name: "Academic Records & Results", desc: "Scores, grades, broadsheets, transcripts, WAEC/NECO format." },
      { name: "Fee Management", desc: "Fee schedules, invoices, payment tracking, receipts, arrears alerts." },
      { name: "Timetable Builder", desc: "Automated timetable generation, room allocation, clash detection." },
      { name: "CBT Examination", desc: "Computer-based tests with auto-marking, time limits, instant results." },
      { name: "Library Management", desc: "Book catalogue, borrowing records, overdue tracking." },
      { name: "Staff & Payroll", desc: "Staff profiles, leave management, salary processing, payslips." },
      { name: "Parent Portal", desc: "Secure parent access to results, fees, attendance, and messages." },
      { name: "Communication", desc: "SMS and email blasts to parents, staff, and students." },
    ],
    headline2: "One platform. Every department.",
  },
  compliancecore: {
    name: "ComplianceCore", tag: "COMPLIANCE & RISK", tagline: "Stay compliant. Stay ahead.",
    desc: "A governance, risk, and compliance platform that keeps your organisation ahead of regulatory requirements — audit-ready at all times, with full documentation and evidence trails.",
    color: "#F59E0B", colorDim: "rgba(245,158,11,0.12)", available: true, category: "Compliance",
    forWho: ["Financial Institutions", "Healthcare Organisations", "Manufacturing Companies", "Government Agencies", "NGOs & Foundations"],
    modules: [
      { name: "Policy Management", desc: "Draft, approve, version, and distribute policies with sign-off tracking." },
      { name: "Risk Register", desc: "Identify, score, assign, and monitor operational and regulatory risks." },
      { name: "Audit Management", desc: "Schedule audits, assign auditors, track findings, close actions." },
      { name: "Regulatory Calendar", desc: "Track deadlines for CAC, NDPR, CBN, NAFDAC, SON filings." },
      { name: "Document Control", desc: "Centralised, versioned, access-controlled document repository." },
      { name: "Incident Reporting", desc: "Log incidents, assign investigations, track resolutions." },
      { name: "Training Records", desc: "Track compliance training completion, certificates, renewals." },
      { name: "Compliance Dashboard", desc: "Live compliance health score across all frameworks and departments." },
    ],
    headline2: "Audit-ready. Always.",
  },
  inventorycore: {
    name: "InventoryCore", tag: "INVENTORY MANAGEMENT", tagline: "Stock visibility that actually works.",
    desc: "A multi-location inventory and supply chain platform that gives you real-time stock visibility, automated reorder points, and full supplier-to-shelf traceability.",
    color: "#8B5CF6", colorDim: "rgba(139,92,246,0.12)", available: true, category: "Operations",
    forWho: ["Retail Businesses", "Warehouses & Distribution", "Hospitals & Pharmacies", "Schools", "Manufacturing"],
    modules: [
      { name: "Multi-warehouse Management", desc: "Manage stock across unlimited locations with transfer tracking." },
      { name: "Purchase Orders", desc: "Raise POs, receive goods, 3-way matching, supplier invoices." },
      { name: "Real-time Stock Tracking", desc: "Live quantities, locations, movements, and adjustments." },
      { name: "Reorder Alerts", desc: "Automatic alerts and PO suggestions when stock hits reorder level." },
      { name: "Supplier Management", desc: "Supplier profiles, price lists, performance tracking, contacts." },
      { name: "Barcode / QR Scanning", desc: "Print and scan barcodes for fast receiving, picking, and dispatch." },
      { name: "Batch & Serial Tracking", desc: "Track lot numbers, serial numbers, and manufacturing dates." },
      { name: "Expiry Management", desc: "FEFO rotation, expiry alerts, waste reduction reports." },
      { name: "Inventory Reports", desc: "Valuation, movement, turnover, variance, and shrinkage reports." },
    ],
    headline2: "Every item. Every location. In real time.",
  },
  financecore: {
    name: "FinanceCore", tag: "FINANCE & ACCOUNTING", tagline: "From invoices to insights.",
    desc: "A complete finance and accounting platform for Nigerian businesses — built for the chart of accounts, tax rules, and reporting requirements that matter here.",
    color: "#C8A850", colorDim: "rgba(200,168,80,0.12)", available: true, category: "Finance",
    forWho: ["SMEs & Growing Businesses", "NGOs & Foundations", "Schools & Universities", "Healthcare Facilities", "Professional Services"],
    modules: [
      { name: "Chart of Accounts", desc: "Flexible account structure aligned to IFRS and local standards." },
      { name: "Invoicing & Receipts", desc: "Professional invoices, receipts, credit notes, with tax handling." },
      { name: "Accounts Payable", desc: "Supplier invoices, payment schedules, aging reports." },
      { name: "Accounts Receivable", desc: "Customer accounts, statements, collection tracking." },
      { name: "Bank Reconciliation", desc: "Import bank statements, match transactions, identify exceptions." },
      { name: "Payroll", desc: "Salary processing, PAYE, pension (PFA), NHF, payslips." },
      { name: "Tax Management", desc: "VAT, WHT, PAYE computation and filing preparation." },
      { name: "Financial Statements", desc: "Income statement, balance sheet, cash flow — on demand." },
      { name: "Budget & Forecast", desc: "Set budgets, track actuals, variance analysis." },
    ],
    headline2: "Built for Nigeria. Built to scale.",
  },
  hrcore: {
    name: "HRCore", tag: "HUMAN RESOURCES", tagline: "Your people deserve better software.",
    desc: "A modern HR management system that handles the full employee lifecycle — from recruitment and onboarding through performance management and offboarding.",
    color: "#F43F5E", colorDim: "rgba(244,63,94,0.12)", available: true, category: "HR",
    forWho: ["Any Organisation With Staff", "Corporate & Enterprise", "NGOs & Social Enterprises", "Healthcare & Schools"],
    modules: [
      { name: "Employee Records", desc: "Complete digital HR files with document storage and history." },
      { name: "Recruitment", desc: "Job postings, application tracking, interviews, offer letters." },
      { name: "Onboarding", desc: "Checklists, document collection, induction tracking." },
      { name: "Leave Management", desc: "Leave types, balances, approvals, calendar views." },
      { name: "Time & Attendance", desc: "Clock-in/out, shift schedules, overtime, absence tracking." },
      { name: "Payroll Integration", desc: "Connect with FinanceCore for seamless salary processing." },
      { name: "Performance Reviews", desc: "Goal setting, peer reviews, ratings, action plans." },
      { name: "Training & Development", desc: "Training plans, completion tracking, skill matrices." },
      { name: "Organisation Chart", desc: "Visual org structure with reporting lines and headcounts." },
    ],
    headline2: "The HR system your team will actually use.",
  },
  churchcore: {
    name: "ChurchCore", tag: "FAITH ORGANISATIONS", tagline: "Built for the body. Not the boardroom.",
    desc: "A church management platform designed specifically for Nigerian ministries and faith communities — member care, cell groups, giving, events, and communication in one place.",
    color: "#7C3AED", colorDim: "rgba(124,58,237,0.12)", available: true, category: "Faith",
    forWho: ["Churches & Ministries", "Cell Groups & Zones", "Prayer Houses", "Faith-based Schools & NGOs"],
    modules: [
      { name: "Member Database", desc: "Comprehensive member profiles, families, units, follow-up notes." },
      { name: "Attendance Tracking", desc: "Sunday service, midweek, special events — digital or manual entry." },
      { name: "Cell Groups & Units", desc: "Group structures, leaders, member assignments, meeting records." },
      { name: "Giving & Tithes", desc: "Record tithes, offerings, pledges, projects — with receipts." },
      { name: "Events Management", desc: "Plan, promote, and track attendance for all church events." },
      { name: "Communication", desc: "SMS, email, and in-app messages to members and groups." },
      { name: "Volunteer Management", desc: "Service rosters, departments, availability, scheduling." },
      { name: "Prayer Requests", desc: "Receive, assign, and follow up on prayer requests." },
      { name: "Leadership Reports", desc: "Growth trends, giving reports, attendance patterns for pastors." },
    ],
    headline2: "Empowering ministry. Simplifying management.",
  },
  fleetcore: {
    name: "FleetCore", tag: "FLEET MANAGEMENT", tagline: "Every vehicle. Every route. One system.",
    desc: "A fleet operations platform for managing vehicles, drivers, maintenance schedules, fuel consumption, and compliance documentation across your entire fleet.",
    color: "#06B6D4", colorDim: "rgba(6,182,212,0.12)", available: true, category: "Logistics",
    forWho: ["Logistics & Haulage Companies", "School Bus Fleets", "Hospital Transport", "Government & NGO Fleets", "Ride-hailing Operations"],
    modules: [
      { name: "Vehicle Registry", desc: "Full vehicle profiles — make, model, VIN, registration, insurance." },
      { name: "Driver Management", desc: "Driver records, license tracking, assignments, performance scores." },
      { name: "Trip Management", desc: "Plan and log trips, routes, distance, passenger manifests." },
      { name: "Maintenance Scheduling", desc: "Service intervals, work orders, maintenance history, costs." },
      { name: "Fuel Tracking", desc: "Fill-ups, consumption rates, cost per km, anomaly alerts." },
      { name: "Insurance & Documents", desc: "Document storage, expiry alerts for all vehicle documents." },
      { name: "GPS Integration", desc: "Connect your existing GPS devices for live location data." },
      { name: "Driver Behaviour", desc: "Speeding, harsh braking, idling — scored per driver." },
      { name: "Fleet Reports", desc: "Utilisation, costs, downtime, compliance status dashboards." },
    ],
    headline2: "Reduce costs. Improve safety. Stay compliant.",
  },
  telehealth: {
    name: "TeleHealth", tag: "TELEMEDICINE", tagline: "Healthcare without borders.",
    desc: "A telemedicine platform that connects patients to doctors through secure video, integrates with CareCore HMS, and enables digital prescriptions and remote monitoring.",
    color: "#4F8EF7", colorDim: "rgba(79,142,247,0.12)", available: false, comingSoon: "2026", category: "Healthcare",
    forWho: ["Hospitals Extending Reach", "Individual Practitioners", "Corporate Health Plans", "Rural & Remote Patients"],
    modules: [
      { name: "Video Consultations", desc: "Secure, HIPAA-aligned video calls between patient and doctor." },
      { name: "Digital Prescriptions", desc: "Issue and share prescriptions electronically after consultation." },
      { name: "Patient Scheduling", desc: "Online booking, reminders, queue management, follow-ups." },
      { name: "CareCore Integration", desc: "Patient records sync directly with your CareCore HMS instance." },
      { name: "Remote Monitoring", desc: "Collect vitals from connected devices between appointments." },
      { name: "Specialist Referrals", desc: "One-click referral to specialists within the TeleHealth network." },
    ],
    headline2: "Coming in 2026.",
  },
};

// ═══════════════════════════════════════
// LOCAL REVEAL (Reveal from App.jsx not available in this module)
// ═══════════════════════════════════════
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(20px)", transition: `opacity 0.6s ${delay}s ease, transform 0.6s ${delay}s ease` }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, color }) {
  return <span style={{ fontSize: 11.5, fontWeight: 700, color: color || C.gold, fontFamily: font, letterSpacing: "0.12em" }}>{children}</span>;
}

function Check({ color }) {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="2 6 5 9 10 3" /></svg>
  );
}

// ═══════════════════════════════════════
// SHARED TEMPLATE SECTIONS
// ═══════════════════════════════════════
function ProductHero({ product, setCurrentPage }) {
  const muted = !product.available;
  return (
    <section style={{
      minHeight: "82vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: C.bg, position: "relative", overflow: "hidden",
      padding: "150px clamp(20px, 5vw, 60px) 100px", textAlign: "center",
    }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(ellipse, ${product.colorDim} 0%, transparent 70%)`, filter: "blur(40px)" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: "72px 72px" }} />
      </div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto" }}>
        <Reveal>
          <button type="button" onClick={() => setCurrentPage("products")} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 600 }}>
            ← All products
          </button>
        </Reveal>
        <Reveal delay={0.04}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: product.color, boxShadow: `0 0 10px ${product.color}` }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: product.color, fontFamily: font, letterSpacing: "0.14em" }}>
              {product.tag}{!product.available && product.comingSoon ? ` · COMING ${product.comingSoon}` : ""}
            </span>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 style={{ fontSize: "clamp(40px, 6.5vw, 78px)", fontWeight: 800, lineHeight: 1.05, fontFamily: font, color: muted ? C.text : C.heading, letterSpacing: "-0.04em", margin: "0 0 24px" }}>
            {product.name}
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p style={{ fontSize: "clamp(19px, 2.4vw, 26px)", color: product.color, lineHeight: 1.4, fontFamily: font, fontWeight: 700, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
            {product.tagline}
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <p style={{ fontSize: "clamp(16px, 1.8vw, 19px)", color: C.text, lineHeight: 1.72, fontFamily: font, maxWidth: 660, margin: "0 auto 44px" }}>
            {product.desc}
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{
              background: product.color, color: "#060810", padding: "15px 32px", borderRadius: 10, border: "none",
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer", transition: "all 0.25s",
              boxShadow: `0 8px 32px ${product.color}3a`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
              {product.available ? "Request a demo" : "Join the waitlist"}
            </button>
            <button type="button" onClick={() => setCurrentPage("pricing")} style={{
              background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: "15px 32px", borderRadius: 10,
              fontSize: 15, fontWeight: 500, fontFamily: font, cursor: "pointer", transition: "all 0.25s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.white; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}>
              View pricing
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ProductFeatureBand({ product }) {
  return (
    <section style={{ padding: "80px clamp(20px, 4vw, 40px)", background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
            {product.headline2}
          </h2>
        </Reveal>
      </div>
    </section>
  );
}

function ProductModules({ product }) {
  const muted = !product.available;
  return (
    <section style={{ padding: "120px clamp(20px, 4vw, 40px)", background: C.bg }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 64, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
            <SectionLabel color={product.color}>WHAT'S INSIDE</SectionLabel>
            <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "14px 0 16px", lineHeight: 1.1 }}>
              Everything {product.name} does.
            </h2>
            <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>
              A connected set of modules — each built to a production standard, all working together as one platform.
            </p>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 18 }}>
          {product.modules.map((m, i) => (
            <Reveal key={m.name} delay={Math.min(i * 0.04, 0.3)}>
              <div style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "26px 24px", height: "100%",
                transition: "all 0.3s ease", opacity: muted ? 0.7 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${product.color}44`; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.background = C.cardHover; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = C.card; }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: product.colorDim, border: `1px solid ${product.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <Check color={product.color} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 8px", letterSpacing: "-0.01em" }}>{m.name}</h3>
                <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0 }}>{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductAudience({ product, setCurrentPage }) {
  return (
    <section style={{ padding: "120px clamp(20px, 4vw, 40px)", background: C.surface, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 48, alignItems: "center" }}>
        <Reveal>
          <div>
            <SectionLabel color={product.color}>WHO IT'S FOR</SectionLabel>
            <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "14px 0 18px", lineHeight: 1.1 }}>
              Built for organisations like yours.
            </h2>
            <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 28px" }}>
              {product.name} is deployed for organisations of every size — priced fairly based on what you actually use.
            </p>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{
              background: product.color, color: "#060810", padding: "13px 26px", borderRadius: 10, border: "none",
              fontSize: 14.5, fontWeight: 700, fontFamily: font, cursor: "pointer", transition: "all 0.25s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
              Talk to our team →
            </button>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {product.forWho.map(w => (
              <div key={w} style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: product.color, flexShrink: 0, boxShadow: `0 0 8px ${product.color}88` }} />
                <span style={{ fontSize: 15, color: C.heading, fontFamily: font, fontWeight: 600 }}>{w}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ProductCTA({ product, setCurrentPage }) {
  return (
    <section style={{ padding: "120px clamp(20px, 4vw, 40px)", background: C.bg }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Reveal>
          <div style={{
            background: `linear-gradient(160deg, ${product.colorDim} 0%, ${C.card} 60%)`,
            border: `1px solid ${product.color}33`, borderRadius: 24, padding: "clamp(40px, 6vw, 72px)", textAlign: "center",
          }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
              {product.available ? `Ready to deploy ${product.name}?` : `${product.name} is coming in ${product.comingSoon}.`}
            </h2>
            <p style={{ fontSize: 17, color: C.text, fontFamily: font, lineHeight: 1.7, maxWidth: 540, margin: "0 auto 36px" }}>
              {product.available
                ? "Book a demo, get a tailored quote, and see how quickly we can have you live."
                : "Be first in line. Join the waitlist and we'll reach out the moment it launches."}
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setCurrentPage("contact")} style={{
                background: product.color, color: "#060810", padding: "15px 34px", borderRadius: 10, border: "none",
                fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer", transition: "all 0.25s",
                boxShadow: `0 8px 32px ${product.color}3a`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
                {product.available ? "Request a demo" : "Join the waitlist"}
              </button>
              {product.available && (
                <button type="button" onClick={() => setCurrentPage("pricing")} style={{
                  background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: "15px 34px", borderRadius: 10,
                  fontSize: 15, fontWeight: 500, fontFamily: font, cursor: "pointer", transition: "all 0.25s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.white; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}>
                  See pricing
                </button>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// CareCore-only screenshots section
function CareCoreScreenshots() {
  return (
    <section style={{ padding: "120px clamp(20px, 4vw, 40px)", background: C.surface, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 64, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
            <SectionLabel color={C.blue}>SEE IT IN ACTION</SectionLabel>
            <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "14px 0 16px", lineHeight: 1.1 }}>
              The real product. Not a mockup.
            </h2>
            <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>
              CareCore is live and deployed. Here is the actual interface your team will use every day.
            </p>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: 24 }}>
          {CARECORE_MEDIA.map((m, i) => (
            <Reveal key={m.title} delay={Math.min(i * 0.06, 0.24)}>
              <figure style={{ margin: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                <img src={m.src} alt={m.title} loading="lazy" style={{ width: "100%", display: "block", borderBottom: `1px solid ${C.border}` }} />
                <figcaption style={{ padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 6px" }}>{m.title}</h3>
                  <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.6, margin: 0 }}>{m.desc}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// GENERIC PRODUCT PAGE
// ═══════════════════════════════════════
function ProductPage({ product, setCurrentPage, children }) {
  return (
    <div style={{ background: C.bg }}>
      <ProductHero product={product} setCurrentPage={setCurrentPage} />
      <ProductFeatureBand product={product} />
      {children}
      <ProductModules product={product} />
      <ProductAudience product={product} setCurrentPage={setCurrentPage} />
      <ProductCTA product={product} setCurrentPage={setCurrentPage} />
    </div>
  );
}

// ═══════════════════════════════════════
// INDIVIDUAL PAGE EXPORTS
// ═══════════════════════════════════════
export function CareCorePage({ setCurrentPage }) {
  return (
    <ProductPage product={PRODUCTS.carecore} setCurrentPage={setCurrentPage}>
      <CareCoreScreenshots />
    </ProductPage>
  );
}
export function SchoolCorePage({ setCurrentPage }) {
  return <ProductPage product={PRODUCTS.schoolcore} setCurrentPage={setCurrentPage} />;
}
export function ComplianceCorePage({ setCurrentPage }) {
  return <ProductPage product={PRODUCTS.compliancecore} setCurrentPage={setCurrentPage} />;
}
export function InventoryCorePage({ setCurrentPage }) {
  return <ProductPage product={PRODUCTS.inventorycore} setCurrentPage={setCurrentPage} />;
}
export function FinanceCorePage({ setCurrentPage }) {
  return <ProductPage product={PRODUCTS.financecore} setCurrentPage={setCurrentPage} />;
}
export function HRCorePage({ setCurrentPage }) {
  return <ProductPage product={PRODUCTS.hrcore} setCurrentPage={setCurrentPage} />;
}
export function ChurchCorePage({ setCurrentPage }) {
  return <ProductPage product={PRODUCTS.churchcore} setCurrentPage={setCurrentPage} />;
}
export function FleetCorePage({ setCurrentPage }) {
  return <ProductPage product={PRODUCTS.fleetcore} setCurrentPage={setCurrentPage} />;
}

// ═══════════════════════════════════════
// TELEHEALTH — COMING SOON PAGE
// ═══════════════════════════════════════
export function TeleHealthPage({ setCurrentPage }) {
  const product = PRODUCTS.telehealth;
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!email) return;
    setDone(true);
  };

  return (
    <div style={{ background: C.bg }}>
      <section style={{
        minHeight: "92vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: C.bg, position: "relative", overflow: "hidden",
        padding: "150px clamp(20px, 5vw, 60px) 100px", textAlign: "center",
      }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(ellipse, ${product.colorDim} 0%, transparent 70%)`, filter: "blur(40px)" }} />
          <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: "72px 72px" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto" }}>
          <Reveal>
            <button type="button" onClick={() => setCurrentPage("products")} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 600 }}>
              ← All products
            </button>
          </Reveal>
          <Reveal delay={0.04}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 26, background: product.colorDim, border: `1px solid ${product.color}33`, padding: "8px 16px", borderRadius: 999 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: product.color, boxShadow: `0 0 10px ${product.color}` }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: product.color, fontFamily: font, letterSpacing: "0.14em" }}>
                {product.tag} · COMING {product.comingSoon}
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 style={{ fontSize: "clamp(40px, 6.5vw, 78px)", fontWeight: 800, lineHeight: 1.05, fontFamily: font, color: C.heading, letterSpacing: "-0.04em", margin: "0 0 22px" }}>
              {product.name}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p style={{ fontSize: "clamp(19px, 2.4vw, 26px)", color: product.color, lineHeight: 1.4, fontFamily: font, fontWeight: 700, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
              {product.tagline}
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <p style={{ fontSize: "clamp(16px, 1.8vw, 19px)", color: C.text, lineHeight: 1.72, fontFamily: font, maxWidth: 600, margin: "0 auto 40px" }}>
              {product.desc}
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            {done ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: C.mintDim, border: `1px solid ${C.mint}44`, borderRadius: 12, padding: "16px 24px" }}>
                <Check color={C.mint} />
                <span style={{ fontSize: 15, color: C.heading, fontFamily: font, fontWeight: 600 }}>You're on the list. We'll be in touch in {product.comingSoon}.</span>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", maxWidth: 480, margin: "0 auto" }}>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@organisation.com" aria-label="Email address"
                  style={{
                    flex: "1 1 260px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: "14px 18px", color: C.heading, fontSize: 15, fontFamily: font, outline: "none",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = product.color; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
                />
                <button type="submit" style={{
                  background: product.color, color: "#060810", padding: "14px 28px", borderRadius: 10, border: "none",
                  fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer", transition: "all 0.25s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
                  Notify me
                </button>
              </form>
            )}
            <p style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 14 }}>
              Launching {product.comingSoon}. No spam — one email when it's ready.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Greyed feature preview */}
      <section style={{ padding: "120px clamp(20px, 4vw, 40px)", background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
              <SectionLabel color={product.color}>WHAT'S COMING</SectionLabel>
              <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "14px 0 16px", lineHeight: 1.1 }}>
                A preview of {product.name}.
              </h2>
              <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>
                Here's what we're building. Final feature set may evolve before launch.
              </p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 18 }}>
            {product.modules.map((m, i) => (
              <Reveal key={m.name} delay={Math.min(i * 0.05, 0.3)}>
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "26px 24px", height: "100%",
                  opacity: 0.55, filter: "grayscale(0.4)",
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <Check color={C.textMuted} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 8px", letterSpacing: "-0.01em" }}>{m.name}</h3>
                  <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0 }}>{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ProductAudience product={product} setCurrentPage={setCurrentPage} />
      <ProductCTA product={product} setCurrentPage={setCurrentPage} />
    </div>
  );
}
