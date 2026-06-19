import { useState, useEffect, useRef, lazy, Suspense, createContext, useContext } from "react";
import "./App.css";

// Admin dashboard loaded on demand — not part of the initial JS bundle
const AdminDashboard = lazy(() => import("./admin/Dashboard"));

// Credibility pages — all from one module so it loads once, split from main bundle
const CaseStudiesPage = lazy(() => import("./pages/CredibilityPages").then(m => ({ default: m.CaseStudiesPage })));
const SecurityPage    = lazy(() => import("./pages/CredibilityPages").then(m => ({ default: m.SecurityPage })));
const SupportPage     = lazy(() => import("./pages/CredibilityPages").then(m => ({ default: m.SupportPage })));
const PartnersPage    = lazy(() => import("./pages/CredibilityPages").then(m => ({ default: m.PartnersPage })));
const TechStackPage   = lazy(() => import("./pages/CredibilityPages").then(m => ({ default: m.TechStackPage })));

// ═══════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════
const C = {
  bg: "#0A2540",
  surface: "#102A43",
  card: "#132F4C",
  cardHover: "#173B60",
  border: "rgba(255,255,255,0.09)",
  borderHover: "rgba(45,212,191,0.25)",
  white: "#FFFFFF",
  text: "#D7E3EF",
  textMuted: "#8DA2B8",
  heading: "#F8FBFF",
  accent: "#38BDF8",
  accentDim: "rgba(56,189,248,0.14)",
  accentGlow: "rgba(56,189,248,0.24)",
  mint: "#2DD4BF",
  mintDim: "rgba(45,212,191,0.13)",
  purple: "#C4B5FD",
  purpleDim: "rgba(196,181,253,0.12)",
  amber: "#FCD34D",
  amberDim: "rgba(252,211,77,0.12)",
  gold: "#D6B56D",
  rose: "#FDA4AF",
  roseDim: "rgba(253,164,175,0.12)",
  success: "#2DD4BF",
  light: "#F8FAFC",
  lightCard: "#FFFFFF",
  lightBorder: "#E2E8F0",
  lightText: "#334155",
  lightMuted: "#94A3B8",
  lightHeading: "#0F172A",
};

const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";
const COMPANY_EMAIL = "orionsoftlimited@gmail.com";
const COMPANY_PHONE = "08169577059";
const COMPANY_RC = "9535128";
const FORM_ENDPOINT = import.meta.env.VITE_ORIONSOFT_FORM_ENDPOINT || "";
const BUILT_IN_FORM_ENDPOINT = "/api/forms";
const TAWK_PROPERTY_ID = import.meta.env.VITE_TAWK_PROPERTY_ID || "";
const TAWK_WIDGET_ID = import.meta.env.VITE_TAWK_WIDGET_ID || "";
const HAS_TAWK_LIVE_CHAT = Boolean(TAWK_PROPERTY_ID && TAWK_WIDGET_ID);
const HERO_WORDS = ["Hospitals", "Clinics", "Operations", "Teams"];
const CARECORE_ASSETS = {
  demo: "/assets/carecore/demo.mp4",
  dashboard: "/assets/carecore/dashboard-overview.png",
  quickActions: "/assets/carecore/quick-actions.png",
  operations: "/assets/carecore/operations-view.png",
  profile: "/assets/carecore/profile-settings.png",
};

const CARECORE_MEDIA = [
  {
    src: CARECORE_ASSETS.dashboard,
    title: "Executive dashboard",
    desc: "Facility metrics, visits, staff, stock alerts, appointments, and daily operations at a glance.",
  },
  {
    src: CARECORE_ASSETS.quickActions,
    title: "Fast clinical actions",
    desc: "Common workflows such as registration, diagnosis, appointment booking, ward admission, prescriptions, lab requests, and invoicing.",
  },
  {
    src: CARECORE_ASSETS.operations,
    title: "Operations view",
    desc: "A responsive command center for patient activity, finance, staff performance, pharmacy alerts, and reporting.",
  },
  {
    src: CARECORE_ASSETS.profile,
    title: "Staff profile and permissions",
    desc: "Clear staff profile management and role-aware interface patterns for secure hospital administration.",
  },
];

// ═══════════════════════════════════════
// CMS DATA LAYER
// ═══════════════════════════════════════
const CMS_SK = {
  settings:      "orionsoft_settings_v1",
  homepage:      "orionsoft_homepage_v1",
  testimonials:  "orionsoft_testimonials_v1",
  faqs:          "orionsoft_faqs_v1",
  blog:          "orionsoft_blog_v1",
  careers:       "orionsoft_careers_v1",
  clients:       "orionsoft_clients_v1",
  menus:         "orionsoft_menus_v1",
  team:          "orionsoft_team_v1",
  seo:           "orionsoft_seo_v1",
  announcements: "orionsoft_announce_v1",
};
function readCMS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function buildCMSState() {
  return {
    settings:      readCMS(CMS_SK.settings,      null),
    homepage:      readCMS(CMS_SK.homepage,       null),
    testimonials:  readCMS(CMS_SK.testimonials,   null),
    faqs:          readCMS(CMS_SK.faqs,           null),
    blog:          readCMS(CMS_SK.blog,           []),
    careers:       readCMS(CMS_SK.careers,        null),
    clients:       readCMS(CMS_SK.clients,        []),
    menus:         readCMS(CMS_SK.menus,          null),
    team:          readCMS(CMS_SK.team,           []),
    seo:           readCMS(CMS_SK.seo,            {}),
    announcements: readCMS(CMS_SK.announcements,  null),
  };
}
function useCMSData() {
  const [cms, setCMS] = useState(buildCMSState);
  useEffect(() => {
    const h = () => setCMS(buildCMSState());
    window.addEventListener("localstoreupdate", h);
    return () => window.removeEventListener("localstoreupdate", h);
  }, []);
  return cms;
}
const CMSContext = createContext(null);

// Default menu (matches current hardcoded Nav links)
const DEFAULT_MAIN_MENU = [
  { id: "m1", label: "Products", page: "products", active: true, order: 0 },
  { id: "m2", label: "Services", page: "services", active: true, order: 1 },
  { id: "m3", label: "Work",     page: "work",     active: true, order: 2 },
  { id: "m4", label: "Careers",  page: "careers",  active: true, order: 3 },
];
// Default testimonials (matches current SocialProof hardcoded values)
const DEFAULT_CMS_TESTIMONIALS = [
  { id: "t1", name: "Dr. A. Emmanuel",  role: "Medical Director",  company: "",                 quote: "CareCore changed how we manage patients. Before, we spent hours searching through paper files — now the ward team runs everything from their phones.", rating: 5, featured: true },
  { id: "t2", name: "Mrs. C. Adeyemi", role: "Finance Manager",    company: "Regional Hospital", quote: "The Orion Soft team trained every department and stayed available for weeks after go-live. Our billing errors dropped significantly within the first month.", rating: 5, featured: true },
  { id: "t3", name: "Nurse H. Oladele", role: "Head of Nursing",   company: "",                 quote: "We went from paper-based OPD records to a full digital system in under four weeks. The clinical staff adapted faster than we expected.", rating: 5, featured: true },
];
// Default FAQs (matches current FAQSection hardcoded values)
const DEFAULT_CMS_FAQS = [
  { id: "f1", question: "Can Orion Soft deploy for small clinics as well as larger hospitals?", answer: "Yes. CareCore pricing and onboarding are based on facility size, while the system keeps the same core modules so smaller teams do not feel locked out of important features.", published: true, order: 0 },
  { id: "f2", question: "Will the website and systems work on mobile phones and tablets?", answer: "Yes. The public website and the systems we build are designed responsively for phones, tablets, laptops, and desktop screens.", published: true, order: 1 },
  { id: "f3", question: "How do project inquiries reach Orion Soft?", answer: `The site uses Orion Soft's built-in submission endpoint when deployed. If that service is unavailable, it opens a prepared email to ${COMPANY_EMAIL} so requests can still be sent.`, published: true, order: 2 },
  { id: "f4", question: "Can you build something outside healthcare?", answer: "Yes. Healthcare is our flagship focus, but Orion Soft also builds dashboards, portals, inventory systems, school systems, integrations, and workflow tools for other businesses.", published: true, order: 3 },
  { id: "f5", question: "What happens after a project is delivered?", answer: "Every deployment includes a handover, staff training, and a support period. Clients can extend with an ongoing monthly support plan that includes patches, updates, and priority response.", published: true, order: 4 },
  { id: "f6", question: "How long does it take to deploy CareCore?", answer: "A typical CareCore deployment runs 2–6 weeks depending on facility size, data migration needs, and staff readiness. We provide a clear timeline after the discovery call.", published: true, order: 5 },
];
// Default Why Us reasons (title/desc editable from CMS, icons fixed by position)
const DEFAULT_CMS_WHYUS = [
  { id: "w1", title: "Healthcare-first, not adapted",      desc: "CareCore reflects how clinical teams actually operate. Every module — from triage to discharge to billing — was built around real hospital workflows, not retrofitted from a generic template." },
  { id: "w2", title: "Production-grade from day one",      desc: "Role permissions, audit logs, 2FA access control, and secure deployments are part of every build — not add-ons. Security isn't a feature tier; it's a baseline." },
  { id: "w3", title: "We stay after launch",               desc: "Staff training, go-live support, and SLA-backed maintenance are built into every deployment — not an extra cost added after you've already committed." },
  { id: "w4", title: "International delivery standard",    desc: "Complete documentation, API-first architecture, clear communication, and global-ready deployments — the standard international buyers expect, at a price that makes sense." },
];
const DEFAULT_CMS_STATS = [
  { id: "s1", value: "25+",   label: "Clinical modules" },
  { id: "s2", value: "118",   label: "API endpoints" },
  { id: "s3", value: "99.5%", label: "Uptime SLA" },
  { id: "s4", value: "5",     label: "Module categories" },
  { id: "s5", value: "2FA",   label: "Role-based access" },
];

// ═══════════════════════════════════════
// ADMIN — CONSTANTS & PRODUCTS STORE
// ═══════════════════════════════════════
const PRODUCTS_STORAGE_KEY = "orionsoft_products_v1";
const PORTFOLIO_STORAGE_KEY = "orionsoft_portfolio_v1";
const LEADS_STORAGE_KEY = "orionsoft_leads_v1";
const PORTFOLIO_INDUSTRIES = ["Healthcare", "Education", "Retail", "Logistics", "Finance", "Government", "Technology", "Other"];
const PORTFOLIO_INDUSTRY_COLORS = { Healthcare: "#38BDF8", Education: "#2DD4BF", Retail: "#FCD34D", Logistics: "#C4B5FD", Finance: "#FDA4AF", Government: "#D6B56D", Technology: "#A78BFA", Other: "#8DA2B8" };
const PORTFOLIO_STATUS_COLORS = { Completed: "#2DD4BF", Ongoing: "#38BDF8", Discovery: "#C4B5FD", Paused: "#8DA2B8" };

const PRODUCT_COLORS = [
  { name: "Sky", value: "#38BDF8" },
  { name: "Mint", value: "#2DD4BF" },
  { name: "Purple", value: "#C4B5FD" },
  { name: "Amber", value: "#FCD34D" },
  { name: "Gold", value: "#D6B56D" },
  { name: "Rose", value: "#FDA4AF" },
];

const DEFAULT_PRODUCTS = [
  {
    id: "carecore-hms",
    name: "CareCore HMS",
    tag: "FLAGSHIP PRODUCT",
    status: "live",
    published: true,
    primary: true,
    headline: "The complete operating system for your hospital.",
    desc: "Patient records, clinical workflows, billing, pharmacy, lab, and ward management — all connected, all real-time.",
    features: [
      "Triage → diagnosis → discharge without data loss",
      "Real-time ward occupancy and bed management",
      "Automated invoicing with itemised financial reports",
      "Drug interaction checks and NEWS2 early warning",
    ],
    pricing: [
      { id: "p1", name: "Clinic", beds: "1–10 beds", onboard: "₦350K – 500K", monthly: "₦30,000", popular: false },
      { id: "p2", name: "Small Hospital", beds: "11–50 beds", onboard: "₦500K – 800K", monthly: "₦60,000", popular: true },
      { id: "p3", name: "Medium Hospital", beds: "51–150 beds", onboard: "₦800K – 1.2M", monthly: "₦100,000", popular: false },
      { id: "p4", name: "Large Hospital", beds: "150+ beds", onboard: "₦1.2M – 2M", monthly: "₦150–250K", popular: false },
    ],
    screenshots: [
      { id: "s1", url: "/assets/carecore/dashboard-overview.png", title: "Executive Dashboard", desc: "Facility metrics at a glance." },
      { id: "s2", url: "/assets/carecore/quick-actions.png", title: "Quick Actions", desc: "Fast clinical workflows." },
    ],
    ctaLabel: "Explore CareCore",
    ctaAction: "products",
    color: "#38BDF8",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "custom-software",
    name: "Custom Software",
    tag: "BESPOKE BUILDS",
    status: "live",
    published: true,
    primary: false,
    headline: "Software shaped around how your business actually works.",
    desc: "We turn complex manual processes into dashboards, portals, APIs, and workflow systems built for your exact operation.",
    features: [
      "School systems, inventory, logistics, and CRMs",
      "API integrations and automated data flows",
      "Real-time management dashboards and reporting",
      "Deployed with training, docs, and ongoing support",
    ],
    pricing: [],
    screenshots: [],
    ctaLabel: "Start a Build",
    ctaAction: "contact",
    color: "#C4B5FD",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function useProducts() {
  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  });

  const save = (list) => {
    try { localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(list)); }
    catch {}
    return list;
  };

  const persist = (list) => setProducts(save(list));

  const addProduct = (data) => {
    const p = { ...data, id: `p-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setProducts(prev => save([...prev, p]));
    return p;
  };

  const updateProduct = (id, data) =>
    setProducts(prev => save(prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)));

  const deleteProduct = (id) =>
    setProducts(prev => save(prev.filter(p => p.id !== id)));

  const resetToDefaults = () => setProducts(save(DEFAULT_PRODUCTS));

  return { products, persist, addProduct, updateProduct, deleteProduct, resetToDefaults };
}

function usePortfolio() {
  const [portfolio, setPortfolio] = useState(() => {
    try { const r = localStorage.getItem(PORTFOLIO_STORAGE_KEY); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.key === PORTFOLIO_STORAGE_KEY) {
        try { const r = localStorage.getItem(PORTFOLIO_STORAGE_KEY); setPortfolio(r ? JSON.parse(r) : []); }
        catch {}
      }
    };
    window.addEventListener("localstoreupdate", handleUpdate);
    return () => window.removeEventListener("localstoreupdate", handleUpdate);
  }, []);
  return portfolio;
}

function captureLeadFromForm(formType, form) {
  try {
    const serviceMap = { carecore: "CareCore HMS", custom: "Custom Software", consult: "Consultation", feedback: "Website Feedback" };
    const id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const lead = {
      id,
      contactName: form.name || "",
      hospitalName: form.org || "",
      company: "",
      phone: form.phone || "",
      email: form.email || "",
      location: form.location || "",
      interestedService: serviceMap[formType] || "Other",
      facilitySize: form.facilitySize || "",
      projectDesc: form.projectDesc || "",
      status: "New",
      priority: "Medium",
      source: "Website Form",
      assignedTo: "",
      demoDate: "",
      demoTime: "",
      notes: form.message || "",
      history: [{ id: `h-${Date.now()}`, type: "created", message: `Lead captured from website — ${serviceMap[formType] || formType} enquiry`, by: "Website", ts: now }],
      createdAt: now,
      updatedAt: now,
    };
    const existing = JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) || "[]");
    existing.unshift(lead);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent("localstoreupdate", { detail: { key: LEADS_STORAGE_KEY } }));
  } catch {}
}

const CAREER_ROLES = [
  {
    title: "Health Liaison Officer",
    type: "Healthcare Growth",
    location: "Field / Remote",
    color: C.accent,
    desc: "Build trusted relationships with hospitals and clinics, demo CareCore HMS, support onboarding, and translate healthcare workflow needs for the Orion Soft team.",
    requirements: [
      "Healthcare background such as nursing, midwifery, public health, or clinical administration",
      "Valid professional license or healthcare work experience is an advantage",
      "Strong communication and presentation skills",
      "Comfortable using smartphones and computers",
      "Willingness to travel for client visits when required",
    ],
    compensation: "NGN 25K-30K base + NGN 10K transport + NGN 5K data + NGN 30K-50K commission per onboarding",
  },
  {
    title: "Business Development Officer (Marketing)",
    type: "Sales",
    location: "Field / Remote",
    color: C.mint,
    desc: "Drive CareCore adoption through hospital visits, relationship building, cold outreach, and closing deals. Marketing/sales background preferred.",
    requirements: [
      "HND/BSc in Marketing, Business Admin, or related field",
      "1+ year experience in B2B sales or field marketing",
      "Confident presenting to senior hospital management",
      "Strong negotiation and follow-up skills",
      "Own smartphone, comfortable with digital tools",
    ],
    compensation: "NGN 25K-30K base + NGN 10K transport + NGN 5K data + NGN 30K-50K commission per onboarding",
  },
  {
    title: "Digital Marketing Executive",
    type: "Marketing",
    location: "Remote / Hybrid",
    color: C.purple,
    desc: "Manage Orion Soft's social media, create content showcasing CareCore, run campaigns, and generate inbound leads for the sales team.",
    requirements: [
      "Experience managing business social media accounts",
      "Ability to create short video content (reels, demos)",
      "Knowledge of social media, short-form content, and campaign planning",
      "Basic graphic design and content production skills",
      "Understanding of healthcare or B2B marketing is a plus",
    ],
    compensation: "Competitive — based on experience",
  },
  {
    title: "Software Developer (Frontend/Backend)",
    type: "Engineering",
    location: "Remote",
    color: C.amber,
    desc: "Help build and improve CareCore and other Orion Soft products. Work with React, Flask, PostgreSQL, and modern web technologies.",
    requirements: [
      "Proficiency in React (frontend) or Flask/Python (backend)",
      "Experience with REST APIs and database management",
      "Portfolio or code samples with previous work",
      "Ability to work independently and meet deadlines",
      "Bonus: experience with healthcare systems, reporting, or workflow automation",
    ],
    compensation: "Competitive — based on experience and skill level",
  },
  {
    title: "General Application",
    type: "Open",
    location: "Remote / Hybrid",
    color: C.rose,
    desc: "Don't see a role that fits you? We're always looking for talented, driven people. If you believe you can add value to Orion Soft, tell us what you bring to the table.",
    requirements: [
      "Passion for technology, healthcare, or business",
      "Self-motivated and results-oriented",
      "Strong communication skills",
      "Willingness to learn and grow with a startup",
    ],
    compensation: "Depends on role and experience",
  },
];

const formRows = (data) => Object.entries(data)
  .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n");

const asPhoneLink = (phone) => `tel:+234${phone.replace(/^0/, "").replace(/\D/g, "")}`;
const asDirectMessageLink = (phone) => `https://wa.me/234${phone.replace(/^0/, "").replace(/\D/g, "")}`;

function getPreferredFormEndpoint() {
  if (FORM_ENDPOINT) return FORM_ENDPOINT;
  if (typeof window === "undefined") return "";
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return "";
  return BUILT_IN_FORM_ENDPOINT;
}

async function sendWebsiteForm(type, data) {
  const payload = {
    type,
    ...data,
    page: window.location.href,
    submittedAt: new Date().toISOString(),
  };

  const endpoint = getPreferredFormEndpoint();

  if (!endpoint) {
    throw new Error("No form endpoint configured");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || result?.ok === false) {
    const message = result?.hint || result?.detail || result?.error || "Submission failed";
    throw new Error(message);
  }

  try {
    const msgKey = "orionsoft_messages_v1";
    const msgs = JSON.parse(localStorage.getItem(msgKey) || "[]");
    msgs.unshift({ id: `msg-${Date.now()}`, ...payload, read: false, createdAt: new Date().toISOString() });
    localStorage.setItem(msgKey, JSON.stringify(msgs));
  } catch {}

  return result?.id ? `sent:${result.id}` : "sent";
}

function buildFallbackMailto(type, data) {
  const subject = encodeURIComponent(`Orion Soft website ${type}`);
  const body = encodeURIComponent(formRows({
    type,
    ...data,
    page: typeof window !== "undefined" ? window.location.href : "",
    submittedAt: new Date().toISOString(),
  }));
  return `mailto:${COMPANY_EMAIL}?subject=${subject}&body=${body}`;
}

// ═══════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

function TrustStrip() {
  const signals = [
    { dot: C.mint, label: "Registered Company", sub: "RC 9535128" },
    { dot: C.accent, label: "CareCore HMS", sub: "Live & Deployed" },
    { dot: C.purple, label: "25+ Modules", sub: "All integrated" },
    { dot: C.amber, label: "International", sub: "Global delivery" },
    { dot: C.gold, label: "99.5% Uptime", sub: "SLA-backed" },
  ];
  return (
    <section aria-label="Company credentials" style={{
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      padding: "20px clamp(16px, 4vw, 32px)",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        display: "flex", gap: "clamp(20px, 4vw, 40px)",
        alignItems: "center", justifyContent: "center",
        flexWrap: "wrap",
      }}>
        {signals.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0, display: "block",
              background: s.dot, boxShadow: `0 0 7px ${s.dot}88`,
            }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: font, display: "block", lineHeight: 1.2 }}>{s.label}</span>
              <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font, display: "block" }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function useDataSaver() {
  const getPreference = () => {
    if (typeof navigator === "undefined") return false;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType));
  };
  const [dataSaver, setDataSaver] = useState(getPreference);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection?.addEventListener) return;
    const update = () => setDataSaver(getPreference());
    connection.addEventListener("change", update);
    return () => connection.removeEventListener("change", update);
  }, []);

  return dataSaver;
}

function OrionLogo({ size = 32, gradientId = "orion-logo" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${gradientId}-gold`} x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8E6B2" />
          <stop offset="0.46" stopColor="#D6B56D" />
          <stop offset="1" stopColor="#A77C33" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="#070809" />
      <circle cx="32" cy="32" r="24" stroke={`url(#${gradientId}-gold)`} strokeWidth="4" />
      <circle cx="32" cy="32" r="14" stroke={`url(#${gradientId}-gold)`} strokeWidth="2.8" opacity="0.9" />
      <path d="M43 30C43 37.2 38.4 42 31.6 42" stroke={`url(#${gradientId}-gold)`} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4.4" fill={`url(#${gradientId}-gold)`} />
    </svg>
  );
}

// ═══════════════════════════════════════
// NAV
// ═══════════════════════════════════════
function Nav({ currentPage, setCurrentPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (menuOpen && e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const cms = useContext(CMSContext);
  const links = ((cms?.menus?.main) || DEFAULT_MAIN_MENU)
    .filter(l => l.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(l => ({ label: l.label, page: l.page }));

  const navigate = (link, event) => {
    if (link.page !== currentPage || !link.anchor) event.preventDefault();
    setMenuOpen(false);
    if (link.page !== currentPage) setCurrentPage(link.page);
    if (link.anchor) {
      window.setTimeout(() => {
        document.querySelector(link.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, link.page !== currentPage ? 80 : 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav aria-label="Main navigation" style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? "rgba(10,37,64,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(24px) saturate(1.2)" : "none",
      borderBottom: scrolled ? `1px solid ${C.border}` : "none",
      transition: "all 0.35s ease", padding: "0 clamp(16px, 4vw, 32px)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 68 }}>
        <button type="button" onClick={() => { setCurrentPage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "none", border: "none", padding: 0 }}>
          <OrionLogo size={32} gradientId="nav-orion-logo" />
          <span style={{ fontSize: 19, fontWeight: 700, color: C.white, fontFamily: font, letterSpacing: "-0.03em" }}>
            Orion<span style={{ color: C.gold }}>Soft</span>
          </span>
        </button>

        <div className="nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {links.map(l => {
            const isActive = currentPage === l.page;
            return (
              <a key={l.label} href={l.anchor || "#"} onClick={(e) => navigate(l, e)} aria-current={isActive ? "page" : undefined} style={{
                color: isActive ? C.white : C.textMuted,
                textDecoration: "none", fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                fontFamily: font, transition: "color 0.2s",
                letterSpacing: "0.01em",
                position: "relative",
              }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.accent; }}
                 onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.textMuted; }}>
                {l.label}
                {isActive && <span style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${C.accent}, ${C.mint})` }} />}
              </a>
            );
          })}
          <button type="button" onClick={() => setCurrentPage("contact")} style={{
            background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
            color: C.bg, padding: "9px 22px", borderRadius: 8, border: "none",
            fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer",
            transition: "all 0.25s", boxShadow: `0 4px 16px ${C.accentGlow}`,
            letterSpacing: "0.01em",
          }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${C.accentGlow}`; }}
             onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 16px ${C.accentGlow}`; }}>
            Get Started
          </button>
        </div>

        <button
          className="nav-burger"
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
          display: "none", background: "none", border: "none", cursor: "pointer", padding: 8, zIndex: 10,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 22, height: 2, background: C.white, marginBottom: i < 2 ? 5 : 0,
              transition: "all 0.3s",
              transform: menuOpen ? (i === 0 ? "rotate(45deg) translate(4px, 4px)" : i === 1 ? "scaleX(0)" : "rotate(-45deg) translate(5px, -5px)") : "none",
              opacity: menuOpen && i === 1 ? 0 : 1,
            }} />
          ))}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu" style={{
          position: "absolute", top: 68, left: 0, right: 0,
          background: "rgba(10,37,64,0.98)", backdropFilter: "blur(24px)",
          padding: "16px 24px 24px", borderBottom: `1px solid ${C.border}`,
        }}>
          {links.map(l => (
            <a key={l.label} href={l.anchor || "#"} onClick={(e) => navigate(l, e)} style={{
              display: "block", color: C.text, textDecoration: "none", fontSize: 15,
              fontFamily: font, padding: "12px 0", borderBottom: `1px solid ${C.border}`,
            }}>{l.label}</a>
          ))}
          <button type="button" onClick={() => { setCurrentPage("contact"); setMenuOpen(false); }} style={{
            width: "100%", marginTop: 16, background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
            color: C.bg, padding: "14px", borderRadius: 10, border: "none",
            fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
          }}>Get Started</button>
        </div>
      )}
    </nav>
  );
}

// ═══════════════════════════════════════
// HERO
// ═══════════════════════════════════════
function Hero({ setCurrentPage }) {
  const [wordIdx, setWordIdx] = useState(0);
  const dataSaver = useDataSaver();
  const cms = useContext(CMSContext);
  const heroData   = cms?.homepage?.hero || {};
  const heroWords  = (heroData.words && heroData.words.length > 0) ? heroData.words : HERO_WORDS;
  const heroBadge  = heroData.badge || "LIVE HMS · CUSTOM SOFTWARE · GLOBAL DELIVERY";
  const heroSub    = heroData.subheadline || "CareCore HMS is live in Nigerian hospitals — 25+ modules, real-time data, zero paper. We apply the same engineering standard to every custom system we ship.";
  const heroCTAP   = heroData.ctaPrimary   || "Book a Free Demo →";
  const heroCTAS   = heroData.ctaSecondary || "See CareCore";
  const heroTrust  = (heroData.trustItems && heroData.trustItems.length > 0) ? heroData.trustItems : ["Free consultation", "No commitment", "24h response"];
  useEffect(() => {
    if (dataSaver) return;
    const t = setInterval(() => setWordIdx(i => (i + 1) % heroWords.length), 2800);
    return () => clearInterval(t);
  }, [dataSaver, heroWords.length]);

  return (
    <section style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      background: `linear-gradient(135deg, ${C.bg} 0%, ${C.surface} 48%, #17365A 78%, #102A2E 100%)`,
      position: "relative", overflow: "hidden",
      padding: "100px clamp(16px, 4vw, 32px) 80px",
    }}>
      {/* Mesh gradients */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.72,
        background: `radial-gradient(ellipse 680px 520px at 22% 24%, rgba(56,189,248,0.14), transparent),
                     radial-gradient(ellipse 520px 420px at 78% 68%, rgba(45,212,191,0.10), transparent),
                     radial-gradient(ellipse 760px 560px at 52% 52%, rgba(214,181,109,0.08), transparent)` }} />
      {/* Grid */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.025,
        backgroundImage: `linear-gradient(${C.accent} 1px, transparent 1px), linear-gradient(90deg, ${C.accent} 1px, transparent 1px)`,
        backgroundSize: "64px 64px" }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.95fr) minmax(340px, 0.75fr)", gap: "clamp(28px, 5vw, 70px)", alignItems: "center" }}>
        <div style={{ maxWidth: 760 }}>
          <Reveal>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.accentDim, border: `1px solid rgba(0,200,255,0.15)`,
              borderRadius: 100, padding: "7px 18px", marginBottom: 28,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.mint, boxShadow: `0 0 8px ${C.mint}` }} />
              <span style={{ fontSize: 12.5, color: C.accent, fontFamily: font, fontWeight: 600, letterSpacing: "0.06em" }}>
                {heroBadge}
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 style={{
              fontSize: "clamp(38px, 6.5vw, 74px)", fontWeight: 800, lineHeight: 1.04,
              fontFamily: font, color: C.heading, letterSpacing: "-0.035em", margin: "0 0 20px",
            }}>
              We Build Software<br />
              That Powers{" "}
              <span key={wordIdx} aria-live="polite" aria-atomic="true" style={{
                background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                display: "inline-block", transition: "opacity 0.3s",
              }}>{heroWords[wordIdx] ?? heroWords[0]}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p style={{
              fontSize: "clamp(16px, 1.8vw, 19px)", color: C.text, lineHeight: 1.75,
              fontFamily: font, maxWidth: 540, margin: "0 0 40px", fontWeight: 400,
            }}>
              {heroSub}
            </p>
          </Reveal>

          {dataSaver && (
            <Reveal delay={0.2}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                border: `1px solid ${C.mint}33`, background: `${C.mint}10`,
                color: C.text, borderRadius: 10, padding: "10px 14px", marginBottom: 22,
                fontFamily: font, fontSize: 13.5,
              }}>
                <strong style={{ color: C.mint }}>Low-data mode:</strong>
                Animations are reduced and contact links remain available.
              </div>
            </Reveal>
          )}

          <Reveal delay={0.24}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setCurrentPage("contact")} style={{
                background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                color: C.bg, padding: "15px 32px", borderRadius: 11, border: "none",
                fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
                boxShadow: `0 8px 30px ${C.accentGlow}`, transition: "all 0.3s",
                letterSpacing: "0.01em",
              }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 14px 40px ${C.accentGlow}`; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 8px 30px ${C.accentGlow}`; }}>
                {heroCTAP}
              </button>
              <button type="button" onClick={() => setCurrentPage("products")} style={{
                border: `1px solid rgba(0,200,255,0.25)`, color: C.accent,
                padding: "15px 32px", borderRadius: 11,
                fontSize: 15, fontWeight: 600, fontFamily: font, cursor: "pointer",
                background: "rgba(0,200,255,0.04)", transition: "all 0.3s",
              }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,200,255,0.1)"; }}
                 onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,200,255,0.04)"; }}>
                {heroCTAS}
              </button>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 16 }}>
              {heroTrust.map((item) => (
                <span key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textMuted, fontFamily: font }}>
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke={C.mint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="2 6 5 9 10 3"/></svg>
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.18}>
          <div style={{
            position: "relative",
            minHeight: 520,
            borderRadius: 22,
            overflow: "hidden",
            border: `1px solid ${C.border}`,
            background: C.card,
            boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
          }}>
            <img
              src="/assets/carecore-doctor-workstation.jpeg"
              alt="Doctor using digital healthcare software on a laptop"
              loading="eager"
              decoding="async"
              fetchpriority="high"
              style={{ width: "100%", height: "100%", minHeight: 520, objectFit: "cover", display: "block" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,37,64,0.04), rgba(10,37,64,0.92))" }} />
            <div style={{ position: "absolute", inset: 0, opacity: 0.18, backgroundImage: `linear-gradient(${C.mint} 1px, transparent 1px), linear-gradient(90deg, ${C.accent} 1px, transparent 1px)`, backgroundSize: "34px 34px" }} />
            <div style={{
              position: "absolute", left: 18, right: 18, bottom: 18,
              display: "grid", gap: 12,
            }}>
              <div style={{
                background: "rgba(7,8,9,0.72)", backdropFilter: "blur(18px)",
                border: `1px solid rgba(214,181,109,0.38)`,
                borderRadius: 16, padding: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <span style={{ color: "#D6B56D", fontFamily: font, fontSize: 12, fontWeight: 900 }}>CARECORE LIVE VIEW</span>
                  <span style={{ color: C.mint, fontFamily: font, fontSize: 12, fontWeight: 800 }}>Online</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {[
                    ["118", "API routes"],
                    ["25+", "Modules"],
                    ["2FA", "Access"],
                  ].map(([value, label]) => (
                    <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, background: "rgba(255,255,255,0.055)" }}>
                      <div style={{ color: C.heading, fontFamily: font, fontSize: 18, fontWeight: 900 }}>{value}</div>
                      <div style={{ color: C.textMuted, fontFamily: font, fontSize: 11.5 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        </div>

        {/* Trust indicators */}
        <Reveal delay={0.35}>
          <div style={{
            display: "flex", gap: "clamp(32px, 5vw, 64px)", marginTop: 72, flexWrap: "wrap",
            borderTop: `1px solid ${C.border}`, paddingTop: 32,
          }}>
            {[
              { val: "25+", label: "Integrated Modules" },
              { val: "118", label: "API Endpoints" },
              { val: "5", label: "Clinical Categories" },
              { val: "2FA", label: "Access Control" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, fontFamily: font, color: C.heading, letterSpacing: "-0.02em" }}>{s.val}</div>
                <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, fontWeight: 500, letterSpacing: "0.04em", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ExperiencePreview({ setCurrentPage }) {
  const [active, setActive] = useState("clinical");
  const views = {
    clinical: {
      label: "Clinical Flow",
      title: "From triage to discharge without losing the patient story.",
      body: "CareCore keeps registration, vitals, consultation, lab requests, pharmacy, billing, and discharge in one connected workflow.",
      stats: [["NEWS2", "Early warning"], ["Rules", "Clinical checks"], ["Audit", "Every action"]],
      color: C.accent,
    },
    operations: {
      label: "Hospital Ops",
      title: "A control room for beds, stock, staff, appointments, and finance.",
      body: "Owners and administrators get clean visibility into daily activity, bottlenecks, revenue, inventory, and staff movement.",
      stats: [["Beds", "Ward view"], ["Stock", "Expiry alerts"], ["Revenue", "Live reports"]],
      color: C.mint,
    },
    business: {
      label: "Custom Builds",
      title: "The same engineering standard for schools, stores, logistics, and teams.",
      body: "For non-healthcare clients, Orion Soft turns messy manual processes into dashboards, portals, APIs, and workflow systems.",
      stats: [["APIs", "Integration"], ["Dashboards", "Decision data"], ["Support", "Launch care"]],
      color: C.gold,
    },
  };
  const view = views[active];

  return (
    <section style={{ padding: "100px clamp(16px, 4vw, 32px)", background: C.light }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div className="experience-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(320px, 1.1fr)", gap: 24, alignItems: "stretch" }}>
            <article style={{
              background: `linear-gradient(180deg, ${view.color}12, rgba(19,47,76,0.98) 180px)`,
              border: `1px solid ${view.color}34`,
              borderRadius: 18,
              padding: "clamp(24px, 4vw, 38px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 420,
            }}>
              <div>
                <span style={{ color: view.color, fontFamily: font, fontSize: 12, fontWeight: 900 }}>INTERACTIVE PREVIEW</span>
                <h2 style={{ color: C.heading, fontFamily: font, fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, lineHeight: 1.08, margin: "14px 0 16px" }}>
                  CareCore adapts to every workflow in your facility.
                </h2>
                <p style={{ color: C.text, fontFamily: font, fontSize: 15.5, lineHeight: 1.75, margin: 0 }}>
                  From clinical care to hospital operations to custom builds — explore the depth of what the platform handles.
                </p>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 30 }}>
                {Object.entries(views).map(([key, item]) => (
                  <button key={key} type="button" onClick={() => setActive(key)} style={{
                    textAlign: "left",
                    border: `1px solid ${active === key ? item.color + "66" : C.border}`,
                    background: active === key ? `${item.color}16` : "rgba(255,255,255,0.04)",
                    color: active === key ? item.color : C.text,
                    borderRadius: 10,
                    padding: "13px 14px",
                    fontFamily: font,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}>{item.label}</button>
                ))}
              </div>
            </article>

            <article style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 18,
              border: `1px solid ${C.border}`,
              minHeight: 420,
              background: C.card,
            }}>
              <img
                src="/assets/carecore-network.jpeg"
                alt="Connected healthcare technology network"
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", minHeight: 420, objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,37,64,0.96), rgba(10,37,64,0.38) 58%, rgba(10,37,64,0.82))" }} />
              <div style={{ position: "absolute", inset: 0, opacity: 0.18, backgroundImage: `radial-gradient(circle at 18% 24%, ${view.color} 0 2px, transparent 3px), radial-gradient(circle at 74% 58%, ${C.mint} 0 2px, transparent 3px)`, backgroundSize: "46px 46px" }} />
              <div style={{ position: "absolute", inset: "clamp(18px, 4vw, 34px)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18 }}>
                <div style={{ maxWidth: 520 }}>
                  <div style={{ color: view.color, fontFamily: font, fontSize: 12, fontWeight: 900, marginBottom: 12 }}>{view.label.toUpperCase()}</div>
                  <h3 style={{ color: C.heading, fontFamily: font, fontSize: "clamp(23px, 3vw, 34px)", lineHeight: 1.12, fontWeight: 900, marginBottom: 12 }}>{view.title}</h3>
                  <p style={{ color: C.text, fontFamily: font, fontSize: 14.5, lineHeight: 1.7, maxWidth: 520 }}>{view.body}</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  {view.stats.map(([value, label]) => (
                    <div key={label} style={{
                      background: "rgba(255,255,255,0.08)",
                      border: `1px solid ${view.color}32`,
                      borderRadius: 12,
                      padding: "14px 12px",
                      backdropFilter: "blur(14px)",
                    }}>
                      <div style={{ color: view.color, fontFamily: font, fontSize: 19, fontWeight: 900 }}>{value}</div>
                      <div style={{ color: C.text, fontFamily: font, fontSize: 12.5, marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setCurrentPage("contact")} style={{
                  alignSelf: "flex-start",
                  border: "none",
                  background: `linear-gradient(135deg, ${C.gold}, ${C.mint})`,
                  color: "#070809",
                  padding: "13px 18px",
                  borderRadius: 10,
                  fontFamily: font,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                }}>Build This Kind of System</button>
              </div>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════
function Products({ setCurrentPage }) {
  const products = [
    {
      name: "CareCore HMS",
      tag: "FLAGSHIP",
      tagColor: C.accent,
      desc: "A complete hospital management system — patient records, clinical decision support, triage, billing, lab, pharmacy, maternal health, ward management, analytics, and more. All in one platform.",
      features: ["Clinical Decision Support", "NEWS2 Early Warning", "Drug Interaction Checker", "Real-Time Analytics", "Multi-Facility Support", "Full Audit Trail"],
      color: C.accent,
      action: "products",
      iconPath: "M22 12h-4l-3 9L9 3l-3 9H2",
    },
    {
      name: "Custom Software",
      tag: "SERVICES",
      tagColor: C.purple,
      desc: "We design, build, and deploy custom web applications, APIs, dashboards, and internal tools shaped precisely around your operations — not a template.",
      features: ["Web Applications", "API Development", "Dashboards & Analytics", "Business Automation", "Mobile-Responsive", "Ongoing Support"],
      color: C.purple,
      action: "services",
      iconPath: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    },
    {
      name: "What's Next",
      tag: "2026",
      tagColor: C.mint,
      desc: "Inventory management, school administration, logistics, and more — all built to the same engineering standard as CareCore. Join the waitlist for early access.",
      features: ["Inventory & Supply Chain", "School Management System", "Logistics & Fleet", "Point of Sale", "HR & Payroll", "More Coming"],
      color: C.mint,
      action: "contact",
      iconPath: "M12 5v14M5 12l7 7 7-7",
    },
  ];

  return (
    <section id="products" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.light }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="PRODUCTS"
            tagColor={C.accent}
            title="What We Build"
            subtitle="CareCore for healthcare. Custom systems for every other operation. Both shipped to the same production standard."
          />
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 20, marginTop: 56 }}>
          {products.map((p, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div style={{
                background: C.lightCard, borderRadius: 16, padding: "clamp(24px, 3vw, 36px)",
                border: `1px solid ${C.lightBorder}`, height: "100%",
                transition: "all 0.35s ease", cursor: "default",
                display: "flex", flexDirection: "column",
              }} onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${p.color}44`;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 20px 48px rgba(0,0,0,0.25)`;
              }} onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.lightBorder;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${p.color}14`, border: `1px solid ${p.color}26`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={p.iconPath} />
                    </svg>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: p.tagColor,
                    fontFamily: font, letterSpacing: "0.08em",
                    background: `${p.tagColor}15`, padding: "5px 12px", borderRadius: 6,
                  }}>{p.tag}</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.lightHeading, fontFamily: font, letterSpacing: "-0.02em", marginBottom: 12 }}>{p.name}</h3>
                <p style={{ fontSize: 14.5, color: C.lightText, fontFamily: font, lineHeight: 1.7, marginBottom: 24, flex: 1 }}>{p.desc}</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                  {p.features.map((f, fi) => (
                    <span key={fi} style={{
                      fontSize: 12.5, color: C.lightText, fontFamily: font, fontWeight: 500,
                      background: `${p.color}0D`, border: `1px solid ${C.lightBorder}`,
                      borderRadius: 6, padding: "6px 12px",
                    }}>{f}</span>
                  ))}
                </div>

                <button type="button" onClick={() => setCurrentPage(p.action)} style={{
                  width: "100%", padding: "13px", borderRadius: 10, border: `1px solid ${p.color}33`,
                  background: `${p.color}10`, color: p.color, fontSize: 14, fontWeight: 700,
                  fontFamily: font, cursor: "pointer", transition: "all 0.25s",
                }} onMouseEnter={e => { e.currentTarget.style.background = `${p.color}22`; }}
                   onMouseLeave={e => { e.currentTarget.style.background = `${p.color}10`; }}>
                  {p.tag === "2026" ? "Join Waitlist" : "Learn More →"}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════
function CareCoreDemoSection({ setCurrentPage }) {
  return (
    <section id="carecore-demo" style={{
      padding: "120px clamp(16px, 4vw, 32px)",
      background: `linear-gradient(180deg, ${C.light} 0%, #EEF6F8 52%, ${C.light} 100%)`,
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div className="carecore-proof-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.78fr) minmax(360px, 1.22fr)", gap: "clamp(28px, 5vw, 64px)", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12.5, fontWeight: 900, color: C.mint, fontFamily: font, letterSpacing: "0.08em" }}>REAL CARECORE PRODUCT</span>
              <h2 style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 900,
                fontFamily: font,
                color: C.lightHeading,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                margin: "12px 0 16px",
              }}>
                See the actual dashboard your team will use.
              </h2>
              <p style={{ fontSize: 16, color: C.lightText, fontFamily: font, lineHeight: 1.75, marginBottom: 24 }}>
                These are real CareCore screens, placed here so hospital administrators, clinical teams, and international buyers can evaluate the product before booking a demo.
              </p>
              <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
                {[
                  "Dashboard metrics for daily decisions",
                  "Quick actions for busy clinical teams",
                  "Administration, billing, stock, and reporting visibility",
                  "Modern interface that works across desktop and mobile workflows",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: C.mint, fontWeight: 900, fontSize: 15, marginTop: 1 }}>✓</span>
                    <span style={{ color: C.lightText, fontFamily: font, fontSize: 14.5, lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setCurrentPage("contact")} style={{
                  background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                  color: C.bg,
                  border: "none",
                  borderRadius: 10,
                  padding: "13px 18px",
                  fontSize: 14,
                  fontWeight: 900,
                  fontFamily: font,
                  cursor: "pointer",
                }}>Book a Live Demo</button>
                <a href={asDirectMessageLink(COMPANY_PHONE)} target="_blank" rel="noreferrer" style={{
                  border: `1px solid ${C.lightBorder}`,
                  color: C.lightHeading,
                  background: C.lightCard,
                  borderRadius: 10,
                  padding: "13px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                  fontFamily: font,
                  textDecoration: "none",
                }}>Ask on WhatsApp</a>
              </div>
            </div>

            <div className="carecore-device" style={{
              borderRadius: 24,
              background: "#0B1221",
              border: "1px solid rgba(15,23,42,0.16)",
              boxShadow: "0 34px 90px rgba(15,23,42,0.22)",
              overflow: "hidden",
            }}>
              <div style={{
                height: 38,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 16px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              }}>
                {[C.rose, C.amber, C.mint].map(color => (
                  <span key={color} style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "block" }} />
                ))}
                <span style={{ color: C.textMuted, fontFamily: font, fontSize: 12, marginLeft: 8 }}>carecore-demo.orionsoft</span>
              </div>
              <video
                src={CARECORE_ASSETS.demo}
                controls
                muted
                playsInline
                preload="none"
                style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block", background: "#07111D" }}
                aria-label="CareCore hospital management system demo video"
              />
            </div>
          </div>
        </Reveal>

        <div className="carecore-gallery" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 34 }}>
          {CARECORE_MEDIA.map((item, i) => (
            <Reveal key={item.src} delay={i * 0.05}>
              <article style={{
                height: "100%",
                background: C.lightCard,
                border: `1px solid ${C.lightBorder}`,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 16px 42px rgba(15,23,42,0.08)",
              }}>
                <div style={{ background: "#0B1221", padding: 8 }}>
                  <img
                    src={item.src}
                    alt={`CareCore ${item.title.toLowerCase()} screenshot`}
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", objectPosition: "top left", borderRadius: 10, display: "block" }}
                  />
                </div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ color: C.lightHeading, fontFamily: font, fontSize: 15.5, fontWeight: 900, marginBottom: 6 }}>{item.title}</h3>
                  <p style={{ color: C.lightText, fontFamily: font, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services({ setCurrentPage }) {
  const services = [
    { title: "Software Development", desc: "Full-stack web applications built with modern frameworks. From concept to deployment.", color: C.accent, icon: "M16 18l6-6-6-6M8 6l-6 6 6 6" },
    { title: "CareCore Deployment", desc: "Complete hospital management system setup, configuration, training, and ongoing support.", color: C.mint, icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
    { title: "System Integration", desc: "Connect your existing systems with custom APIs and automated data flows.", color: C.purple, icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" },
    { title: "Data & Analytics", desc: "Custom dashboards and reporting tools for real-time business intelligence.", color: C.amber, icon: "M18 20V10M12 20V4M6 20v-6" },
    { title: "IT Consulting", desc: "Technical strategy, architecture review, security audit, and digital transformation guidance.", color: C.rose, icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { title: "Training & Support", desc: "Staff training, documentation, SLA-backed support, and ongoing system maintenance.", color: C.mint, icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  ];

  return (
    <section id="services" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.bg }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader tag="SERVICES" tagColor={C.mint} title="What We Can Do For You" subtitle="Whether you need a full product built or a specific technical challenge solved, we have the expertise." dark />
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16, marginTop: 56 }}>
          {services.map((s, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <button type="button" style={{
                background: C.card, borderRadius: 14, padding: 28,
                border: `1px solid ${C.border}`, transition: "all 0.3s", cursor: "pointer",
                display: "flex", gap: 18, alignItems: "flex-start",
                width: "100%", textAlign: "left",
              }} onClick={() => setCurrentPage("contact")}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = `${s.color}33`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: `${s.color}14`, border: `1px solid ${s.color}26`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={s.icon} />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 6px" }}>{s.title}</h3>
                  <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// SYSTEMS SHOWCASE
// ═══════════════════════════════════════
function SystemsShowcase({ setCurrentPage }) {
  const systems = [
    {
      name: "CareCore HMS",
      status: "Available",
      audience: "Hospitals and clinics",
      desc: "Patient records, triage, clinical notes, billing, pharmacy, lab, ward management, and analytics in one platform.",
      features: ["25+ modules", "Multi-facility", "Audit trail"],
      color: C.accent,
    },
    {
      name: "Inventory Manager",
      status: "In development",
      audience: "Retailers and distributors",
      desc: "Stock tracking, purchase orders, low-stock alerts, supplier records, sales movement, and branch reporting.",
      features: ["Stock alerts", "Supplier records", "Reports"],
      color: C.mint,
    },
    {
      name: "School Suite",
      status: "Planned",
      audience: "Schools and training centers",
      desc: "Student records, fees, attendance, class management, results, parent communication, and admin dashboards.",
      features: ["Fees", "Attendance", "Results"],
      color: C.purple,
    },
    {
      name: "Custom Client Apps",
      status: "On request",
      audience: "Growing businesses",
      desc: "Private portals, dashboards, workflow tools, APIs, integrations, and reporting systems built around your operations.",
      features: ["Dashboards", "APIs", "Automation"],
      color: C.amber,
    },
  ];

  return (
    <section id="systems" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.surface }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="SYSTEMS & APPS"
            tagColor={C.mint}
            title="A Growing Product Suite"
            subtitle="CareCore is live and ready. More systems are in development — built to the same standard for healthcare, retail, education, and logistics."
            dark
          />
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 16, marginTop: 56 }}>
          {systems.map((system, i) => (
            <Reveal key={system.name} delay={i * 0.08}>
              <div style={{
                height: "100%", background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: 26, display: "flex", flexDirection: "column",
                transition: "all 0.3s",
              }} onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${system.color}44`;
                e.currentTarget.style.transform = "translateY(-3px)";
              }} onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.transform = "translateY(0)";
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 6 }}>{system.name}</h3>
                    <p style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, margin: 0 }}>{system.audience}</p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: system.color, fontFamily: font,
                    border: `1px solid ${system.color}33`, background: `${system.color}12`,
                    borderRadius: 6, padding: "5px 9px", whiteSpace: "nowrap",
                  }}>{system.status}</span>
                </div>
                <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, marginBottom: 20, flex: 1 }}>{system.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {system.features.map(feature => (
                    <span key={feature} style={{
                      fontSize: 12, color: C.text, fontFamily: font,
                      border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px",
                      background: "rgba(255,255,255,0.035)",
                    }}>{feature}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.28}>
          <div style={{ textAlign: "center", marginTop: 42 }}>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
              color: C.bg, padding: "14px 28px", borderRadius: 10, border: "none",
              fontSize: 14, fontWeight: 800, fontFamily: font, cursor: "pointer",
            }}>Request a New System</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// CARECORE DEEP DIVE
// ═══════════════════════════════════════
function EngineeringStandards() {
  const standards = [
    {
      title: "Production Architecture",
      desc: "Modern React frontends, API-first backends, role-based access control, audit logs, backups, and deployment pipelines built for maintainability.",
      points: ["API-first delivery", "Cloud-ready hosting", "Versioned releases"],
      color: C.accent,
    },
    {
      title: "Security & Privacy",
      desc: "We design around least-privilege access, secure form handling, HTTPS deployments, staff permissions, data retention, and privacy-aware workflows.",
      points: ["Role permissions", "Audit trails", "Privacy-first forms"],
      color: C.mint,
    },
    {
      title: "Reliable Delivery",
      desc: "Projects are scoped with clear milestones, acceptance checks, training, support handover, and launch readiness checks before go-live.",
      points: ["Milestones", "QA checklist", "Launch support"],
      color: C.purple,
    },
    {
      title: "Responsive UX",
      desc: "Every interface is designed to work on phones, tablets, laptops, and desktop screens so teams can use the system wherever work happens.",
      points: ["Mobile-first screens", "Accessible forms", "Fast loading"],
      color: C.amber,
    },
  ];

  return (
    <section id="standards" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.bg }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="ENGINEERING STANDARD"
            tagColor={C.accent}
            title="Built for People Who Notice the Details"
            subtitle="Production architecture, role-based security, and go-live support — built into every system we deliver."
            dark
          />
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: 16, marginTop: 56 }}>
          {standards.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <div style={{
                height: "100%", background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: 28, display: "flex", flexDirection: "column",
                boxShadow: "0 16px 46px rgba(0,0,0,0.14)",
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${item.color}14`, border: `1px solid ${item.color}26`, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 5, background: item.color, boxShadow: `0 0 18px ${item.color}55` }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 20, flex: 1 }}>{item.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {item.points.map(point => (
                    <span key={point} style={{
                      fontSize: 12, color: item.color, fontFamily: font, fontWeight: 700,
                      background: `${item.color}10`, border: `1px solid ${item.color}22`,
                      borderRadius: 6, padding: "6px 10px",
                    }}>{point}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSecurity() {
  const trustItems = [
    {
      title: "Healthcare-ready controls",
      desc: "CareCore workflows are designed around staff roles, permission boundaries, audit trails, 2FA-ready access, and privacy-aware records handling.",
      points: ["Role-based access", "Audit trail", "2FA-ready"],
      color: C.mint,
    },
    {
      title: "Launch without surprises",
      desc: "Every deployment is planned around discovery, data preparation, staff training, pilot checks, go-live support, and post-launch fixes.",
      points: ["Discovery", "Training", "Go-live support"],
      color: C.accent,
    },
    {
      title: "Works where teams work",
      desc: "Interfaces are built for phones, tablets, laptops, and shared desks, with clear forms and direct contact fallbacks when networks are unstable.",
      points: ["Responsive UI", "Low-data fallbacks", "Fast forms"],
      color: C.amber,
    },
    {
      title: "Transparent ownership",
      desc: "Clients get clear communication on scope, timelines, support channels, release updates, and what is included before implementation begins.",
      points: ["Clear scope", "Support channels", "Release updates"],
      color: C.purple,
    },
  ];

  return (
    <section id="trust" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.surface }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="TRUST & DELIVERY"
            tagColor={C.mint}
            title="Everything Buyers Need to Verify"
            subtitle="Security, implementation quality, and post-launch support — confirmed before you commit."
            dark
          />
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 16, marginTop: 56 }}>
          {trustItems.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.07}>
              <article style={{
                height: "100%",
                background: `linear-gradient(180deg, ${item.color}10, rgba(19,47,76,0.96) 150px)`,
                border: `1px solid ${item.color}26`,
                borderRadius: 14,
                padding: 26,
                display: "flex",
                flexDirection: "column",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: `${item.color}14`,
                  border: `1px solid ${item.color}30`, marginBottom: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: item.color, display: "block" }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 18, flex: 1 }}>{item.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {item.points.map(point => (
                    <span key={point} style={{
                      fontSize: 12, color: item.color, fontFamily: font, fontWeight: 800,
                      border: `1px solid ${item.color}24`, background: `${item.color}10`,
                      borderRadius: 6, padding: "6px 10px",
                    }}>{point}</span>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.28}>
          <div style={{
            marginTop: 24,
            border: `1px solid ${C.border}`,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: "18px clamp(18px, 3vw, 26px)",
            display: "flex",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}>
            <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0, flex: "1 1 320px" }}>
              Need to verify fit before booking a demo? Send your workflow, facility size, and current pain points.
            </p>
            <a href={asDirectMessageLink(COMPANY_PHONE)} target="_blank" rel="noreferrer" style={{
              color: C.bg, background: C.mint, textDecoration: "none",
              padding: "12px 16px", borderRadius: 9, fontSize: 13.5,
              fontWeight: 800, fontFamily: font,
            }}>Ask Directly</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TechImmersion({ setCurrentPage }) {
  const frames = [
    {
      image: "/assets/medical-practitioner-tech.jpg",
      title: "Healthcare desks that feel current",
      text: "Clean patient workflows, fast lookup, secure records, and practical screens for busy clinical teams.",
      color: C.accent,
    },
    {
      image: "/assets/developer-code-workstation.jpg",
      title: "Engineering visible in the brand",
      text: "Interfaces, APIs, dashboards, release checks, and support tooling are treated as one delivery system.",
      color: C.gold,
    },
    {
      image: "/assets/cloud-infrastructure-team.jpg",
      title: "Infrastructure-ready thinking",
      text: "Every build is planned around access, backups, uptime, monitoring, scaling, and maintainable deployment.",
      color: C.mint,
    },
    {
      image: "/assets/business-team-laptop.jpg",
      title: "Designed for decision rooms",
      text: "Owners, admins, and operators get clear views of work, progress, revenue, requests, and next actions.",
      color: C.purple,
    },
  ];

  return (
    <section style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.light }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="BUILT FOR REAL WORK"
            tagColor={C.gold}
            title="Software That Earns Its Place in Daily Operations"
            subtitle="Healthcare desks, engineering teams, infrastructure, and decision rooms — Orion Soft builds for every context where software needs to perform."
          />
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16, marginTop: 56 }} className="tech-mosaic">
          {frames.map((frame, i) => (
            <Reveal key={frame.title} delay={i * 0.08} style={{ gridColumn: i < 2 ? "span 6" : "span 3" }}>
              <article className={i < 2 ? "tech-mosaic-wide" : ""} style={{
                minHeight: i < 2 ? 390 : 320,
                position: "relative",
                overflow: "hidden",
                borderRadius: 18,
                border: `1px solid ${C.lightBorder}`,
                boxShadow: "0 18px 54px rgba(15,23,42,0.09)",
                background: C.lightCard,
              }}>
                <img
                  src={frame.image}
                  alt={frame.title}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", minHeight: i < 2 ? 390 : 320, objectFit: "cover", display: "block" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,8,9,0.04), rgba(7,8,9,0.82))" }} />
                <div style={{ position: "absolute", inset: 0, opacity: 0.16, backgroundImage: `linear-gradient(${frame.color} 1px, transparent 1px), linear-gradient(90deg, ${frame.color} 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
                <div style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
                  <div style={{ width: 46, height: 4, background: frame.color, borderRadius: 10, marginBottom: 14 }} />
                  <h3 style={{ color: C.heading, fontFamily: font, fontSize: i < 2 ? 24 : 18, lineHeight: 1.15, fontWeight: 900, marginBottom: 8 }}>{frame.title}</h3>
                  <p style={{ color: C.text, fontFamily: font, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{frame.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <div style={{ textAlign: "center", marginTop: 34 }}>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{
              border: "none",
              background: `linear-gradient(135deg, ${C.gold}, ${C.mint})`,
              color: "#070809",
              padding: "14px 24px",
              borderRadius: 10,
              fontFamily: font,
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
            }}>Start a Serious Build</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CareCoreSection() {
  const modules = [
    { cat: "Clinical", color: C.accent, items: ["Patient Registration & Records", "Triage with Color Coding", "Vitals & NEWS2 Score", "Clinical Decision Support", "Prescriptions & Drug Interactions", "Discharge Summaries", "Referral System", "Clinical Workflow Assistant", "Body Scan Mapper"] },
    { cat: "Diagnostics", color: C.mint, items: ["Lab Order Management", "Result Entry & Delivery", "Drug Inventory & Dispensing", "Stock Alerts & Expiry", "Reference Ranges & Flags"] },
    { cat: "Financial", color: C.amber, items: ["Automated Billing", "Invoicing & Payments", "Price List Management", "Revenue Analytics", "Financial Reports & Export"] },
    { cat: "Operations", color: C.purple, items: ["Staff Management & 2FA", "Appointments", "Ward & Bed Tracking", "Analytics Dashboard", "Audit Logging", "Team Chat", "Notifications", "Multi-Facility"] },
    { cat: "Maternal Health", color: C.rose, items: ["Antenatal Tracking", "Immunisation Schedules", "Growth Monitoring", "Pregnancy Timeline"] },
  ];

  return (
    <section style={{
      padding: "120px clamp(16px, 4vw, 32px)",
      background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.accent}18`, border: `1px solid ${C.accent}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.accent, fontFamily: font, letterSpacing: "0.08em" }}>CARECORE HMS — DEEP DIVE</span>
          </div>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, fontFamily: font, color: C.heading, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            25+ Modules. One Platform.
          </h2>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, maxWidth: 580, marginBottom: 48 }}>
            Every module works together — patient data flows seamlessly from registration to triage to diagnosis to billing to discharge.
          </p>
        </Reveal>

        {modules.map((m, mi) => (
          <Reveal key={mi} delay={mi * 0.08}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 3, height: 20, borderRadius: 2, background: m.color }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: font, letterSpacing: "0.04em" }}>{m.cat}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {m.items.map((item, ii) => (
                  <span key={ii} style={{
                    fontSize: 13, color: C.text, fontFamily: font, fontWeight: 500,
                    background: `${m.color}08`, border: `1px solid ${m.color}18`,
                    borderRadius: 8, padding: "8px 16px", transition: "all 0.2s",
                  }} onMouseEnter={e => { e.currentTarget.style.background = `${m.color}18`; e.currentTarget.style.borderColor = `${m.color}33`; e.currentTarget.style.color = m.color; }}
                     onMouseLeave={e => { e.currentTarget.style.background = `${m.color}08`; e.currentTarget.style.borderColor = `${m.color}18`; e.currentTarget.style.color = C.text; }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// PRICING
// ═══════════════════════════════════════
function Pricing({ setCurrentPage, tiers: managedTiers }) {
  const tierColors = [C.mint, C.accent, C.purple, C.amber, C.gold, C.rose];
  const defaultTiers = [
    { name: "Clinic", beds: "1–10 beds", onboard: "₦350K – 500K", monthly: "₦30,000", color: C.mint, popular: false },
    { name: "Small Hospital", beds: "11–50 beds", onboard: "₦500K – 800K", monthly: "₦60,000", color: C.accent, popular: true },
    { name: "Medium Hospital", beds: "51–150 beds", onboard: "₦800K – 1.2M", monthly: "₦100,000", color: C.purple, popular: false },
    { name: "Large Hospital", beds: "150+ beds", onboard: "₦1.2M – 2M", monthly: "₦150–250K", color: C.amber, popular: false },
  ];
  const tiers = managedTiers && managedTiers.length
    ? managedTiers.map((t, i) => ({ ...t, color: tierColors[i % tierColors.length] }))
    : defaultTiers;

  return (
    <section id="pricing" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.light }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader tag="CARECORE PRICING" tagColor={C.accent} title="Plans for Every Facility" subtitle="All modules included. No feature gating. No hidden fees. Choose your tier based on facility size." />
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 16, marginTop: 56 }}>
          {tiers.map((t, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div style={{
                background: C.lightCard, borderRadius: 18, padding: "clamp(24px, 3vw, 36px)",
                border: t.popular ? `2px solid ${t.color}` : `1px solid ${C.lightBorder}`,
                position: "relative", transition: "all 0.3s",
                boxShadow: t.popular ? `0 16px 48px ${t.color}18` : "0 2px 8px rgba(0,0,0,0.04)",
                height: "100%", display: "flex", flexDirection: "column",
              }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 56px rgba(0,0,0,0.1)"; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = t.popular ? `0 16px 48px ${t.color}18` : "0 2px 8px rgba(0,0,0,0.04)"; }}>
                {t.popular && (
                  <div style={{
                    position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                    background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                    color: C.bg, padding: "5px 16px", borderRadius: 100,
                    fontSize: 11.5, fontWeight: 700, fontFamily: font, letterSpacing: "0.05em",
                  }}>MOST POPULAR</div>
                )}
                <div style={{ width: 44, height: 3, borderRadius: 2, background: t.color, marginBottom: 20 }} />
                <h3 style={{ fontSize: 21, fontWeight: 700, color: C.lightHeading, fontFamily: font, marginBottom: 4 }}>{t.name}</h3>
                <p style={{ fontSize: 13.5, color: C.lightMuted, fontFamily: font, marginBottom: 24 }}>{t.beds}</p>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, color: C.lightMuted, fontFamily: font, fontWeight: 500 }}>Onboarding</span>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.lightHeading, fontFamily: font }}>{t.onboard}</div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 12.5, color: C.lightMuted, fontFamily: font, fontWeight: 500 }}>Support</span>
                  <div style={{ fontSize: 26, fontWeight: 800, color: t.color, fontFamily: font }}>{t.monthly}</div>
                </div>
                <div style={{ flex: 1 }}>
                  {["All 25+ modules included", "Role-based staff training", "Launch support", "Monthly updates & patches"].map((f, fi) => (
                    <div key={fi} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ color: t.color, fontSize: 14, fontWeight: 700 }}>✓</span>
                      <span style={{ fontSize: 13.5, color: C.lightText, fontFamily: font }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setCurrentPage("contact")} style={{
                  width: "100%", padding: "13px", borderRadius: 10, border: "none",
                  background: t.popular ? `linear-gradient(135deg, ${C.accent}, ${C.mint})` : `${t.color}12`,
                  color: t.popular ? C.bg : t.color, fontSize: 14, fontWeight: 700,
                  fontFamily: font, cursor: "pointer", transition: "all 0.25s", marginTop: 16,
                }}>Get Started</button>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <p style={{ textAlign: "center", marginTop: 40, fontSize: 14, color: C.lightMuted, fontFamily: font }}>
            Need custom software instead? <span style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }} onClick={() => setCurrentPage("contact")}>Contact us for a custom quote →</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// ABOUT
// ═══════════════════════════════════════
function About() {
  return (
    <section id="about" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.light }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 48, alignItems: "center" }}>
          <Reveal>
            <div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.08em" }}>ABOUT US</span>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, fontFamily: font, color: C.lightHeading, letterSpacing: "-0.02em", margin: "12px 0 20px" }}>
                Built with global standards.<br />Designed for real operations.
              </h2>
              <p style={{ fontSize: 15.5, color: C.lightText, fontFamily: font, lineHeight: 1.75, marginBottom: 20 }}>
                Orion Soft Limited builds practical, dependable software for healthcare providers
                and ambitious businesses. We focus on secure systems, clear workflows, fast
                interfaces, and implementation support that helps teams adopt technology with
                confidence.
              </p>
              <p style={{ fontSize: 15.5, color: C.lightText, fontFamily: font, lineHeight: 1.75, marginBottom: 28 }}>
                Our team combines product thinking, engineering discipline, and close discovery
                with each client. We study your workflow, map the operational gaps, and build
                software that fits the way your organisation needs to work.
              </p>

              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { val: "Global", label: "Delivery" },
                  { val: "Secure", label: "Privacy-first" },
                  { val: "SLA", label: "Support" },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: C.lightCard, borderRadius: 12, padding: "16px 24px",
                    border: `1px solid ${C.lightBorder}`,
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.accent, fontFamily: font }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: C.lightMuted, fontFamily: font, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div style={{
              background: C.lightCard, borderRadius: 20, padding: 36,
              border: `1px solid ${C.lightBorder}`,
              boxShadow: "0 18px 54px rgba(15,23,42,0.08)",
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.lightHeading, fontFamily: font, marginBottom: 24, letterSpacing: "-0.01em" }}>Our Values</h3>
              {[
                { title: "Integrity", desc: "We are honest about what our software can and cannot do. No overselling." },
                { title: "Impact Over Activity", desc: "Success is measured by outcomes, not hours logged or meetings held." },
                { title: "Speed", desc: "We respond fast, fix fast, deploy fast. Startups cannot afford to be slow." },
                { title: "Respect for Users", desc: "We build for people who save lives and run businesses. Their time matters." },
                { title: "Long-term Partnership", desc: "We stay close after launch with support, improvements, and clear communication." },
              ].map((v, i) => (
                <div key={i} style={{ marginBottom: i < 4 ? 20 : 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.lightHeading, fontFamily: font, marginBottom: 4 }}>{v.title}</div>
                  <p style={{ fontSize: 13.5, color: C.lightText, fontFamily: font, lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// CONTACT PAGE
// ═══════════════════════════════════════
function ContactPage({ setCurrentPage }) {
  const [formType, setFormType] = useState("carecore");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState("");
  const [form, setForm] = useState({
    name: "", org: "", email: "", phone: "", location: "",
    facilitySize: "", departments: "", currentSystem: "",
    projectDesc: "", budget: "", timeline: "", service: "",
    systemType: "", users: "", workflow: "", platform: "", integrations: "", priority: "",
    hearAbout: "", message: "", website: "",
    category: "Website feedback", rating: "5", pageVisited: "",
  });

  const update = (k, v) => {
    setError("");
    setForm(f => ({ ...f, [k]: v }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formType === "feedback") {
      if (!form.message.trim()) {
        setError("Please write your feedback before submitting.");
        return;
      }
    } else {
      const missingCommon = ["name", "org", "email", "phone", "location"].find(key => !form[key].trim());
      const missingSpecific =
        formType === "carecore" && !form.facilitySize ? "facilitySize" :
        formType === "custom" && (!form.systemType || !form.projectDesc.trim()) ? "custom" :
        formType === "consult" && !form.service ? "service" :
        "";
      if (missingCommon || missingSpecific) {
        setError("Please complete all required fields before submitting.");
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await sendWebsiteForm(`request: ${formType}`, form);
      setDelivery(result);
      captureLeadFromForm(formType, form);
      setSubmitted(true);
    } catch (err) {
      window.location.href = buildFallbackMailto(`request: ${formType}`, form);
      setDelivery("email-draft");
      captureLeadFromForm(formType, form);
      setSubmitted(true);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  if (submitted) {
    return (
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "120px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 500 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: "0 auto 24px",
            background: `linear-gradient(135deg, ${C.accent}20, ${C.mint}20)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
          }}>✅</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 12 }}>Submission Received!</h2>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 32 }}>
            {delivery === "email-draft"
              ? `The website could not send automatically, so an email draft has been opened for ${COMPANY_EMAIL}. Please send it so Orion Soft receives your request.`
              : "Thank you for reaching out to Orion Soft. Our team will review your submission and contact you within 24 hours to discuss next steps."}
          </p>
          <button type="button" onClick={() => { setCurrentPage("home"); setSubmitted(false); }} style={{
            background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
            color: C.bg, padding: "14px 32px", borderRadius: 10, border: "none",
            fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
          }}>← Back to Home</button>
        </div>
      </section>
    );
  }

  const inputSt = {
    width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.card, color: C.heading,
    fontSize: 14, fontFamily: font, outline: "none", transition: "border-color 0.2s",
  };

  const labelSt = { fontSize: 13, fontWeight: 600, color: C.text, fontFamily: font, marginBottom: 6, display: "block" };
  const inquiryPurpose = {
    carecore: {
      tag: "HOSPITAL DEMO",
      title: "Book a CareCore HMS walkthrough",
      copy: "Use this when your facility wants patient records, billing, pharmacy, lab, wards, and reporting in one hospital system.",
      accent: C.accent,
      button: "Request CareCore Demo",
      note: "Best for clinics, hospitals, and diagnostic centers comparing HMS options.",
    },
    custom: {
      tag: "OTHER SYSTEM REQUEST",
      title: "Request another system or custom software",
      copy: "Choose the kind of system you need, describe the workflow, and Orion Soft will shape it into a practical build plan.",
      accent: C.mint,
      button: "Send System Request",
      note: "Best for school systems, inventory tools, portals, dashboards, CRMs, booking apps, integrations, and internal workflow systems.",
    },
    consult: {
      tag: "ADVISORY CALL",
      title: "Ask for technical guidance",
      copy: "Use this when you need a conversation before deciding what to build, integrate, audit, or improve.",
      accent: C.purple,
      button: "Request Consultation",
      note: "Best for strategy, system reviews, data, training, and support questions.",
    },
    feedback: {
      tag: "WEBSITE FEEDBACK",
      title: "Share feedback or report an issue",
      copy: "Report bugs, broken pages, confusing content, product suggestions, or any visitor experience issues.",
      accent: C.amber,
      button: "Send Feedback",
      note: "Use this for website bugs, UX feedback, product suggestions, or general reports.",
    },
  }[formType];
  const systemPresets = [
    "School / LMS system",
    "Inventory or POS system",
    "Business dashboard / analytics",
    "Customer portal",
    "Booking / appointment system",
    "CRM / sales management",
  ];

  return (
    <section style={{ minHeight: "100vh", background: C.bg, padding: "100px clamp(16px, 4vw, 32px) 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Reveal>
          <button type="button" onClick={() => setCurrentPage("home")} style={{
            background: "none", border: "none", color: C.accent, fontSize: 14,
            fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>← Back to Home</button>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", marginBottom: 8 }}>
            {inquiryPurpose.title}
          </h1>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 32 }}>
            {inquiryPurpose.copy}
          </p>
        </Reveal>

        {/* Form type tabs */}
        <Reveal delay={0.1}>
          <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
            {[
              { id: "carecore", label: "CareCore HMS", desc: "Hospital onboarding" },
              { id: "custom", label: "Custom Software", desc: "Bespoke project" },
              { id: "consult", label: "Consultation", desc: "General inquiry" },
              { id: "feedback", label: "Feedback", desc: "Website report" },
            ].map(tab => (
              <button type="button" key={tab.id} onClick={() => setFormType(tab.id)} style={{
                flex: 1, minWidth: 180, padding: "14px 16px", borderRadius: 12,
                border: `1px solid ${formType === tab.id ? C.accent + "44" : C.border}`,
                background: formType === tab.id ? C.accentDim : C.card,
                cursor: "pointer", textAlign: "left", transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: formType === tab.id ? C.accent : C.heading, fontFamily: font }}>{tab.label}</div>
                <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 2 }}>{tab.desc}</div>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <form onSubmit={handleSubmit} style={{
            background: `linear-gradient(180deg, ${inquiryPurpose.accent}10, rgba(19,47,76,0.98) 180px)`,
            borderRadius: 20,
            padding: "clamp(24px, 4vw, 40px)",
            border: `1px solid ${inquiryPurpose.accent}44`,
            boxShadow: `0 24px 70px ${inquiryPurpose.accent}10`,
          }}>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={e => update("website", e.target.value)}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0 }}
              aria-hidden="true"
            />
            <div style={{ border: `1px solid ${inquiryPurpose.accent}33`, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 18, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: inquiryPurpose.accent, fontFamily: font, marginBottom: 6 }}>{inquiryPurpose.tag}</div>
              <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0 }}>{inquiryPurpose.note}</p>
            </div>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
              {["1. Review", "2. Clarify", "3. Quote"].map((step, index) => (
                <div key={step} style={{
                  border: `1px solid ${C.border}`,
                  background: "rgba(255,255,255,0.035)",
                  borderRadius: 10,
                  padding: "11px 12px",
                  color: index === 0 ? inquiryPurpose.accent : C.textMuted,
                  fontSize: 12,
                  fontWeight: 900,
                  fontFamily: font,
                  textAlign: "center",
                }}>{step}</div>
              ))}
            </div>

            {/* Contact fields */}
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div><label style={labelSt}>Full Name *</label><input style={inputSt} value={form.name} onChange={e => update("name", e.target.value)} placeholder="Your full name" /></div>
              <div><label style={labelSt}>Organisation *</label><input style={inputSt} value={form.org} onChange={e => update("org", e.target.value)} placeholder="Facility or company name" /></div>
            </div>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div><label style={labelSt}>Email *</label><input type="email" style={inputSt} value={form.email} onChange={e => update("email", e.target.value)} placeholder="name@organisation.com" /></div>
              <div><label style={labelSt}>Phone Number *</label><input style={inputSt} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+1 555 000 0000" /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Country / Region *</label>
              <input style={inputSt} value={form.location} onChange={e => update("location", e.target.value)} placeholder="City, Country" />
            </div>

            {/* CareCore specific */}
            {formType === "carecore" && (
              <>
                <div style={{ borderTop: `1px solid ${C.border}`, margin: "24px 0", paddingTop: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 16 }}>Facility Details</h3>
                </div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelSt}>Facility Size *</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.facilitySize} onChange={e => update("facilitySize", e.target.value)}>
                      <option value="">Select size</option>
                      <option>Clinic (1–10 beds)</option>
                      <option>Small Hospital (11–50 beds)</option>
                      <option>Medium Hospital (51–150 beds)</option>
                      <option>Large Hospital (150+ beds)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Number of Departments</label>
                    <input style={inputSt} value={form.departments} onChange={e => update("departments", e.target.value)} placeholder="e.g. 5" />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Current System</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.currentSystem} onChange={e => update("currentSystem", e.target.value)}>
                    <option value="">How do you currently manage records?</option>
                    <option>Paper-based</option>
                    <option>Spreadsheets</option>
                    <option>Another software system</option>
                    <option>Mix of paper and digital</option>
                  </select>
                </div>
              </>
            )}

            {/* Custom software specific */}
            {formType === "custom" && (
              <>
                <div style={{ borderTop: `1px solid ${C.border}`, margin: "24px 0", paddingTop: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 6 }}>System Details</h3>
                  <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 1.6, margin: "0 0 16px" }}>
                    This section is different from the CareCore form so businesses can request any other system clearly.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {systemPresets.map(system => (
                      <button key={system} type="button" onClick={() => update("systemType", system)} style={{
                        background: form.systemType === system ? C.mint : "rgba(255,255,255,0.055)",
                        color: form.systemType === system ? C.bg : C.text,
                        border: `1px solid ${form.systemType === system ? C.mint : C.border}`,
                        borderRadius: 999,
                        padding: "8px 11px",
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}>{system}</button>
                    ))}
                  </div>
                </div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelSt}>Type of system *</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.systemType} onChange={e => update("systemType", e.target.value)}>
                      <option value="">Select system type</option>
                      <option>School / LMS system</option>
                      <option>Inventory or POS system</option>
                      <option>Business dashboard / analytics</option>
                      <option>Customer portal</option>
                      <option>Booking / appointment system</option>
                      <option>CRM / sales management</option>
                      <option>HR / payroll workflow</option>
                      <option>API / system integration</option>
                      <option>Mobile app</option>
                      <option>Other custom system</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Expected users</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.users} onChange={e => update("users", e.target.value)}>
                      <option value="">Select size</option>
                      <option>1-5 users</option>
                      <option>6-20 users</option>
                      <option>21-100 users</option>
                      <option>100+ users</option>
                      <option>Public customer-facing system</option>
                    </select>
                  </div>
                </div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelSt}>Preferred platform</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.platform} onChange={e => update("platform", e.target.value)}>
                      <option value="">Select platform</option>
                      <option>Web app</option>
                      <option>Mobile app</option>
                      <option>Web + mobile</option>
                      <option>Admin dashboard only</option>
                      <option>Not sure yet</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Top priority</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.priority} onChange={e => update("priority", e.target.value)}>
                      <option value="">Select priority</option>
                      <option>Launch quickly</option>
                      <option>Automate manual work</option>
                      <option>Improve reporting</option>
                      <option>Reduce errors</option>
                      <option>Connect existing tools</option>
                      <option>Scale an existing system</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Workflow or problem to solve *</label>
                  <textarea style={{ ...inputSt, resize: "vertical" }} rows={4} value={form.projectDesc} onChange={e => update("projectDesc", e.target.value)} placeholder="Example: We manage stock manually and need approvals, sales tracking, invoices, and weekly reports..." />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Important features or integrations</label>
                  <textarea style={{ ...inputSt, resize: "vertical" }} rows={3} value={form.integrations} onChange={e => update("integrations", e.target.value)} placeholder="Payments, SMS, accounting software, spreadsheet import, existing database, barcode scanner..." />
                </div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelSt}>Budget Range</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.budget} onChange={e => update("budget", e.target.value)}>
                      <option value="">Select range</option>
                      <option>Under $2,500</option>
                      <option>$2,500 - $5,000</option>
                      <option>$5,000 - $15,000</option>
                      <option>$15,000 - $30,000</option>
                      <option>$30,000+</option>
                      <option>Not sure yet</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Timeline</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.timeline} onChange={e => update("timeline", e.target.value)}>
                      <option value="">When do you need it?</option>
                      <option>ASAP</option>
                      <option>1–2 months</option>
                      <option>3–6 months</option>
                      <option>No rush / exploring</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Consult specific */}
            {formType === "consult" && (
              <>
                <div style={{ borderTop: `1px solid ${C.border}`, margin: "24px 0", paddingTop: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 16 }}>How Can We Help?</h3>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Service of Interest *</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.service} onChange={e => update("service", e.target.value)}>
                    <option value="">Select a service</option>
                    <option>IT Consulting & Strategy</option>
                    <option>System Integration</option>
                    <option>Data & Analytics</option>
                    <option>Training & Support</option>
                    <option>Security Audit</option>
                    <option>Other</option>
                  </select>
                </div>
              </>
            )}

            {/* Feedback specific */}
            {formType === "feedback" && (
              <>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><label style={labelSt}>Name</label><input style={inputSt} value={form.name} onChange={e => update("name", e.target.value)} placeholder="Optional" /></div>
                  <div><label style={labelSt}>Email</label><input type="email" style={inputSt} value={form.email} onChange={e => update("email", e.target.value)} placeholder="Optional, for follow-up" /></div>
                </div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelSt}>Category</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.category} onChange={e => update("category", e.target.value)}>
                      <option>Website feedback</option>
                      <option>Bug report</option>
                      <option>Product request</option>
                      <option>CareCore inquiry</option>
                      <option>Partnership</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Experience Rating</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.rating} onChange={e => update("rating", e.target.value)}>
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Good</option>
                      <option value="3">3 - Okay</option>
                      <option value="2">2 - Needs work</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Page or section involved</label>
                  <input style={inputSt} value={form.pageVisited} onChange={e => update("pageVisited", e.target.value)} placeholder="e.g. Pricing, CareCore, Contact form" />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={labelSt}>Feedback / Report *</label>
                  <textarea style={{ ...inputSt, resize: "vertical" }} rows={6} value={form.message} onChange={e => update("message", e.target.value)} placeholder="Tell us what happened, what you need, or what should be improved..." />
                </div>
              </>
            )}

            {/* Common bottom — not shown for feedback */}
            {formType !== "feedback" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>How did you hear about us?</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.hearAbout} onChange={e => update("hearAbout", e.target.value)}>
                    <option value="">Select</option>
                    <option>Referral from another client</option>
                    <option>Social media</option>
                    <option>Search engine</option>
                    <option>Our sales team visited</option>
                    <option>Word of mouth</option>
                    <option>Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={labelSt}>Additional Message</label>
                  <textarea style={{ ...inputSt, resize: "vertical" }} rows={3} value={form.message} onChange={e => update("message", e.target.value)} placeholder="Anything else you'd like us to know..." />
                </div>
              </>
            )}

            {error && (
              <p style={{ fontSize: 13, color: C.rose, fontFamily: font, marginBottom: 14 }}>{error}</p>
            )}

            <button type="submit" disabled={submitting} style={{
              width: "100%", padding: "15px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
              color: C.bg, fontSize: 15, fontWeight: 700, fontFamily: font,
              cursor: submitting ? "wait" : "pointer", transition: "all 0.3s",
              opacity: submitting ? 0.75 : 1,
              boxShadow: `0 8px 28px ${C.accentGlow}`,
            }} onMouseEnter={e => e.currentTarget.style.boxShadow = `0 12px 36px ${C.accentGlow}`}
               onMouseLeave={e => e.currentTarget.style.boxShadow = `0 8px 28px ${C.accentGlow}`}>
              {submitting ? "Sending..." : inquiryPurpose.button}
            </button>

            <p style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, textAlign: "center", marginTop: 14 }}>
              We respond within 24 hours. Your data is kept confidential. This form uses Orion Soft's built-in endpoint when deployed and falls back to email if needed.
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// PROCESS SECTION
// ═══════════════════════════════════════
function ProcessSection() {
  const steps = [
    {
      num: "01",
      title: "Discovery",
      desc: "We study your operations, map your workflows, and identify exactly what to build — before writing a line of code.",
      detail: ["Workflow mapping", "Gap analysis", "Scope definition"],
      color: C.accent,
    },
    {
      num: "02",
      title: "Design & Plan",
      desc: "Clear UI patterns, role-appropriate screens, and a milestone plan so you know exactly what ships and when.",
      detail: ["Role-based UI flows", "Delivery milestones", "Acceptance criteria"],
      color: C.mint,
    },
    {
      num: "03",
      title: "Build",
      desc: "Production code with audit trails, role permissions, API-first backends, and testing at every stage.",
      detail: ["React frontends", "Secure APIs", "QA checklist"],
      color: C.purple,
    },
    {
      num: "04",
      title: "Deploy & Support",
      desc: "Staff training, go-live monitoring, monthly maintenance, and a clear channel for fixes and improvements.",
      detail: ["Team training", "Go-live care", "SLA support"],
      color: C.gold,
    },
  ];

  return (
    <section style={{ padding: "100px clamp(16px, 4vw, 32px)", background: C.bg }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="HOW WE WORK"
            tagColor={C.mint}
            title="From discovery to launch — and beyond."
            subtitle="Every engagement follows the same proven process, so your team gets software that works on day one."
            dark
          />
        </Reveal>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
          gap: 2, marginTop: 56,
          background: C.border, borderRadius: 18, overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}>
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.07}>
              <div style={{
                background: C.card, padding: "32px 28px",
                display: "flex", flexDirection: "column", height: "100%",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -8, right: 8,
                  fontSize: 72, fontWeight: 900, color: step.color,
                  opacity: 0.05, fontFamily: font, lineHeight: 1,
                  pointerEvents: "none", userSelect: "none",
                }}>{step.num}</div>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, marginBottom: 18,
                  background: `${step.color}14`, border: `1px solid ${step.color}28`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: step.color, fontFamily: font, letterSpacing: "0.06em" }}>{step.num}</span>
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 10px", letterSpacing: "-0.01em" }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.72, margin: "0 0 20px", flex: 1 }}>{step.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {step.detail.map(d => (
                    <span key={d} style={{
                      fontSize: 11.5, color: step.color, fontFamily: font, fontWeight: 600,
                      background: `${step.color}10`, border: `1px solid ${step.color}20`,
                      borderRadius: 6, padding: "4px 9px",
                    }}>{d}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// CTA BANNER
// ═══════════════════════════════════════
function CareersPage({ setCurrentPage }) {
  const cms = useContext(CMSContext);
  const roles = (() => {
    const cr = cms?.careers;
    if (Array.isArray(cr) && cr.length > 0) {
      return cr.filter(r => r.published !== false).map(r => ({
        title: r.title || "Open Role",
        type: r.type || "Full-time",
        location: r.location || "Remote / Lagos",
        department: r.department || "General",
        summary: r.summary || "",
        requirements: Array.isArray(r.requirements) ? r.requirements : [],
        salary: r.salary || "",
        tag: r.tag || "",
        tagColor: r.tagColor || C.accent,
      }));
    }
    return CAREER_ROLES;
  })();
  const [selectedRole, setSelectedRole] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState("");
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", location: "",
    role: roles[0]?.title || "", experience: "", qualification: "",
    availability: "", cvLink: "", portfolio: "", referral: "",
    whyOrion: "", website: "",
  });

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const update = (key, value) => {
    setError("");
    setForm(current => ({ ...current, [key]: value }));
  };

  const selectRole = (index) => {
    setSelectedRole(index);
    update("role", roles[index]?.title || "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const requiredFields = ["fullName", "email", "phone", "location", "role", "experience", "qualification", "availability", "cvLink", "whyOrion"];
    const missing = requiredFields.find(key => !`${form[key]}`.trim());

    if (missing) {
      setError("Please complete all required fields before submitting.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await sendWebsiteForm("career application", form);
      setDelivery(result);
      setSubmitted(true);
    } catch (err) {
      window.location.href = buildFallbackMailto("career application", form);
      setDelivery("email-draft");
      setSubmitted(true);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setSelectedRole(0);
    setForm({
      fullName: "", email: "", phone: "", location: "",
      role: roles[0]?.title || "", experience: "", qualification: "",
      availability: "", cvLink: "", portfolio: "", referral: "",
      whyOrion: "", website: "",
    });
  };

  const activeRole = roles[selectedRole] || roles[0] || CAREER_ROLES[0];
  const inputSt = {
    width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.card, color: C.heading,
    fontSize: 14, fontFamily: font, outline: "none", transition: "border-color 0.2s",
  };
  const labelSt = { fontSize: 13, fontWeight: 600, color: C.text, fontFamily: font, marginBottom: 6, display: "block" };
  const careerNotes = [
    { title: "Low-data friendly", text: "The form is lightweight. If your network drops, use direct message or email with your CV link." },
    { title: "Human review", text: "Applications are reviewed for fit, reliability, communication, and practical skill." },
    { title: "Field-ready roles", text: "Client-facing roles focus on hospitals, clinics, demos, onboarding, and follow-up." },
  ];

  if (submitted) {
    return (
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "120px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 560 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: "0 auto 24px",
            background: `linear-gradient(135deg, ${C.accent}20, ${C.mint}20)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.mint, fontSize: 30, fontWeight: 900, fontFamily: font,
          }}>OK</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 12 }}>Application Received</h2>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 32 }}>
            {delivery === "email-draft"
              ? `The website could not send automatically, so an email draft has been opened for ${COMPANY_EMAIL}. Please send it so Orion Soft receives your application.`
              : `Thank you for applying for ${form.role}. Our team will review your application and contact you if there is a match.`}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={resetForm} style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
              color: C.bg, padding: "14px 28px", borderRadius: 10, border: "none",
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
            }}>Apply for Another Role</button>
            <button type="button" onClick={() => setCurrentPage("home")} style={{
              background: `${C.accent}10`, color: C.accent, padding: "14px 28px",
              borderRadius: 10, border: `1px solid ${C.accent}33`,
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
            }}>Back to Home</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ minHeight: "100vh", background: C.bg, padding: "100px clamp(16px, 4vw, 32px) 80px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <Reveal>
          <button type="button" onClick={() => setCurrentPage("home")} style={{
            background: "none", border: "none", color: C.accent, fontSize: 14,
            fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 700,
          }}>Back to Home</button>
        </Reveal>

        <Reveal delay={0.05}>
          <div style={{ maxWidth: 720, marginBottom: 42 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: C.mint, fontFamily: font, letterSpacing: "0.08em" }}>CAREERS</span>
            <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: "10px 0 12px" }}>
              Join the team building practical software for real operations.
            </h1>
            <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>
              We are looking for thoughtful, reliable people across product, engineering, marketing, and client growth.
              Choose a role, review the requirements, and submit your application below.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 24,
          }} className="career-notes">
            {careerNotes.map(note => (
              <article key={note.title} style={{
                background: "rgba(255,255,255,0.045)",
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: 16,
              }}>
                <h2 style={{ fontSize: 13.5, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 6 }}>{note.title}</h2>
                <p style={{ fontSize: 12.8, color: C.textMuted, fontFamily: font, lineHeight: 1.55, margin: 0 }}>{note.text}</p>
              </article>
            ))}
          </div>
        </Reveal>

        <div className="career-layout" style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) minmax(320px, 1.1fr)", gap: 24, alignItems: "start" }}>
          <Reveal delay={0.1}>
            <div style={{ display: "grid", gap: 12 }}>
              {roles.map((role, index) => (
                <button key={role.title} type="button" onClick={() => selectRole(index)} style={{
                  textAlign: "left", background: selectedRole === index ? `${role.color}14` : C.card,
                  border: `1px solid ${selectedRole === index ? role.color + "55" : C.border}`,
                  borderRadius: 14, padding: 20, cursor: "pointer", transition: "all 0.25s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 4 }}>{role.title}</h2>
                      <p style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, margin: 0 }}>{role.type} / {role.location}</p>
                    </div>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${role.color}`, background: selectedRole === index ? role.color : "transparent", flexShrink: 0, marginTop: 4 }} />
                  </div>
                  <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, margin: "0 0 10px" }}>{role.desc}</p>
                  <p style={{ fontSize: 12.5, color: role.color, fontFamily: font, fontWeight: 800, margin: 0 }}>{role.compensation}</p>
                </button>
              ))}

              <article style={{ background: C.card, border: `1px solid ${activeRole.color}33`, borderRadius: 14, padding: 22, marginTop: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 14 }}>Requirements for {activeRole.title}</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {activeRole.requirements.map(req => (
                    <div key={req} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: activeRole.color, fontWeight: 900, fontSize: 13, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.55 }}>{req}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <form onSubmit={handleSubmit} style={{
              background: `linear-gradient(180deg, ${activeRole.color}12, rgba(19,47,76,0.98) 210px)`,
              border: `1px solid ${activeRole.color}44`,
              borderRadius: 20,
              padding: "clamp(24px, 4vw, 38px)",
              boxShadow: `0 24px 70px ${activeRole.color}10`,
            }}>
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={e => update("website", e.target.value)}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0 }}
                aria-hidden="true"
              />
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 6 }}>{activeRole.title} Application</h2>
              <p style={{ fontSize: 13.5, color: C.textMuted, fontFamily: font, lineHeight: 1.65, marginBottom: 24 }}>
                This form is for hiring only. Show us your fit for the selected role, your availability, and where we can review your CV or work.
              </p>
              <div style={{
                border: `1px solid ${activeRole.color}33`,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 14,
                padding: 16,
                marginBottom: 22,
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: activeRole.color, fontFamily: font, marginBottom: 6 }}>ROLE SNAPSHOT</div>
                <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0 }}>{activeRole.desc}</p>
              </div>
              <div style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                border: `1px solid ${C.border}`,
                background: "rgba(10,37,64,0.42)",
                borderRadius: 14,
                padding: 14,
                marginBottom: 22,
              }}>
                <p style={{ fontSize: 12.8, color: C.textMuted, fontFamily: font, lineHeight: 1.55, margin: 0, flex: "1 1 220px" }}>
                  Slow network? Send your name, role, and CV link directly.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={asDirectMessageLink(COMPANY_PHONE)} target="_blank" rel="noreferrer" style={{
                    color: C.bg, background: C.mint, textDecoration: "none", padding: "10px 13px",
                    borderRadius: 9, fontSize: 12.5, fontWeight: 800, fontFamily: font,
                  }}>Direct Message</a>
                  <a href={`mailto:${COMPANY_EMAIL}`} style={{
                    color: C.accent, background: C.accentDim, textDecoration: "none", padding: "10px 13px",
                    borderRadius: 9, fontSize: 12.5, fontWeight: 800, fontFamily: font,
                    border: `1px solid ${C.accent}33`,
                  }}>Email</a>
                </div>
              </div>

              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={labelSt}>Full Name *</label><input style={inputSt} value={form.fullName} onChange={e => update("fullName", e.target.value)} placeholder="Your full name" /></div>
                <div><label style={labelSt}>Email *</label><input type="email" style={inputSt} value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@example.com" /></div>
              </div>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={labelSt}>Phone *</label><input style={inputSt} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+1 555 000 0000" /></div>
                <div><label style={labelSt}>City / Country *</label><input style={inputSt} value={form.location} onChange={e => update("location", e.target.value)} placeholder="City, Country" /></div>
              </div>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelSt}>Role *</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.role} onChange={e => {
                    const nextIndex = roles.findIndex(role => role.title === e.target.value);
                    if (nextIndex >= 0) setSelectedRole(nextIndex);
                    update("role", e.target.value);
                  }}>
                    {roles.map(role => <option key={role.title}>{role.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Availability *</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.availability} onChange={e => update("availability", e.target.value)}>
                    <option value="">Select</option>
                    <option>Immediately</option>
                    <option>Within 1 week</option>
                    <option>Within 2 weeks</option>
                    <option>Within 1 month</option>
                    <option>More than 1 month</option>
                  </select>
                </div>
              </div>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={labelSt}>Qualification *</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.qualification} onChange={e => update("qualification", e.target.value)}>
                    <option value="">Select</option>
                    <option>SSCE/WAEC</option>
                    <option>OND/NCE</option>
                    <option>HND</option>
                    <option>BSc/B.Tech/BNSc</option>
                    <option>MSc/MBA/MPH</option>
                    <option>ASN/BSN</option>
                    <option>Professional Certification</option>
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Experience *</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.experience} onChange={e => update("experience", e.target.value)}>
                    <option value="">Select</option>
                    <option>No experience</option>
                    <option>Less than 1 year</option>
                    <option>1–2 years</option>
                    <option>3–5 years</option>
                    <option>5–10 years</option>
                    <option>10+ years</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>CV / Resume Link *</label>
                <input style={inputSt} value={form.cvLink} onChange={e => update("cvLink", e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={labelSt}>Portfolio / Profile</label><input style={inputSt} value={form.portfolio} onChange={e => update("portfolio", e.target.value)} placeholder="https://your-portfolio.example" /></div>
                <div><label style={labelSt}>How did you hear about us?</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.referral} onChange={e => update("referral", e.target.value)}>
                    <option value="">Select</option>
                    <option>Social media</option>
                    <option>Friend/referral</option>
                    <option>Job board</option>
                    <option>Search engine</option>
                    <option>Our website</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={labelSt}>Why do you want to work at Orion Soft? *</label>
                <textarea style={{ ...inputSt, resize: "vertical" }} rows={5} value={form.whyOrion} onChange={e => update("whyOrion", e.target.value)} placeholder="Tell us what you can contribute and why this role fits you." />
              </div>

              {error && <p style={{ fontSize: 13, color: C.rose, fontFamily: font, marginBottom: 14 }}>{error}</p>}
              <button type="submit" disabled={submitting} style={{
                width: "100%", padding: "15px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                color: C.bg, fontSize: 15, fontWeight: 800, fontFamily: font,
                cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.75 : 1,
                boxShadow: `0 8px 28px ${C.accentGlow}`,
              }}>{submitting ? "Submitting..." : `Apply for ${activeRole.type} Role`}</button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FAQSection({ setCurrentPage }) {
  const [openIdx, setOpenIdx] = useState(null);
  const cms = useContext(CMSContext);
  const raw = (cms?.faqs && cms.faqs.filter(f => f.published !== false).length > 0)
    ? cms.faqs.filter(f => f.published !== false).sort((a, b) => (a.order || 0) - (b.order || 0))
    : DEFAULT_CMS_FAQS;
  const faqs = raw.map(f => ({ q: f.question, a: f.answer }));

  return (
    <section style={{ padding: "100px clamp(16px, 4vw, 32px)", background: C.surface }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="FAQ"
            tagColor={C.mint}
            title="Common Questions"
            subtitle="Straight answers so you can evaluate Orion Soft before the first call."
            dark
          />
        </Reveal>

        <div style={{ display: "grid", gap: 8, marginTop: 48 }}>
          {faqs.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.04}>
              <div style={{
                background: C.card,
                border: `1px solid ${openIdx === i ? C.accent + "40" : C.border}`,
                borderRadius: 12,
                overflow: "hidden",
                transition: "border-color 0.22s ease",
              }}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  aria-expanded={openIdx === i}
                  aria-controls={`faq-answer-${i}`}
                  style={{
                    width: "100%", padding: "20px clamp(18px, 3vw, 28px)",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                    background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <h3 style={{ fontSize: 15.5, fontWeight: 700, color: openIdx === i ? C.heading : C.text, fontFamily: font, margin: 0, lineHeight: 1.4 }}>{item.q}</h3>
                  <span style={{
                    color: openIdx === i ? C.accent : C.textMuted,
                    fontSize: 22, fontWeight: 300, lineHeight: 1, flexShrink: 0,
                    transform: openIdx === i ? "rotate(45deg)" : "none",
                    transition: "transform 0.25s ease, color 0.2s",
                    display: "block",
                  }}>+</span>
                </button>
                <div id={`faq-answer-${i}`} style={{
                  maxHeight: openIdx === i ? 400 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                }}>
                  <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.8, margin: 0, padding: "0 clamp(18px, 3vw, 28px) 22px" }}>{item.a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.22}>
          <div style={{ textAlign: "center", marginTop: 34 }}>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{
              background: `${C.accent}10`, border: `1px solid ${C.accent}33`,
              color: C.accent, padding: "13px 24px", borderRadius: 10,
              fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer",
              transition: "all 0.2s",
            }} onMouseEnter={e => { e.currentTarget.style.background = `${C.accent}20`; e.currentTarget.style.borderColor = `${C.accent}55`; }}
               onMouseLeave={e => { e.currentTarget.style.background = `${C.accent}10`; e.currentTarget.style.borderColor = `${C.accent}33`; }}>
              Still have questions? Ask us directly →
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CTABanner({ setCurrentPage }) {
  const cms = useContext(CMSContext);
  const s = cms?.settings || {};
  const cta = cms?.homepage?.cta || {};
  const ctaTag  = cta.tag        || "READY WHEN YOU ARE";
  const ctaHead = s.ctaHeadline  || cta.headline || "Ship software your team will actually use.";
  const ctaSub  = s.ctaSubtext   || cta.subtext  || "CareCore HMS for healthcare facilities. Bespoke systems for every other operation. Both delivered with the same production-grade engineering, real training, and long-term support.";
  const ctaP    = cta.primaryText   || "Start Your Project →";
  const ctaS    = cta.secondaryText || "See CareCore HMS";
  return (
    <section style={{
      padding: "96px clamp(16px, 4vw, 32px)",
      background: `linear-gradient(135deg, ${C.bg} 0%, rgba(16,42,67,0.96) 50%, ${C.bg} 100%)`,
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.06,
        background: `radial-gradient(ellipse 600px 400px at 50% 50%, ${C.accent}, transparent)` }} />
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <Reveal>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: C.accentDim, border: `1px solid rgba(0,200,255,0.15)`,
            borderRadius: 100, padding: "7px 18px", marginBottom: 24,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.mint, boxShadow: `0 0 8px ${C.mint}` }} />
            <span style={{ fontSize: 12, color: C.accent, fontFamily: font, fontWeight: 600, letterSpacing: "0.06em" }}>{ctaTag}</span>
          </div>
          <h2 style={{ fontSize: "clamp(26px, 3.8vw, 42px)", fontWeight: 800, fontFamily: font, color: C.heading, letterSpacing: "-0.025em", marginBottom: 14, lineHeight: 1.15 }}>
            {ctaHead}
          </h2>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.75, marginBottom: 32, maxWidth: 520, margin: "0 auto 32px" }}>
            {ctaSub}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
              color: C.bg, padding: "15px 34px", borderRadius: 10, border: "none",
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
              boxShadow: `0 8px 28px ${C.accentGlow}`, transition: "all 0.3s",
              letterSpacing: "0.01em",
            }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 14px 40px ${C.accentGlow}`; }}
               onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 8px 28px ${C.accentGlow}`; }}>
              {ctaP}
            </button>
            <button type="button" onClick={() => setCurrentPage("products")} style={{
              border: `1px solid ${C.accent}44`, color: C.accent,
              padding: "15px 34px", borderRadius: 10,
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
              background: `${C.accent}08`, transition: "all 0.3s",
            }} onMouseEnter={e => { e.currentTarget.style.background = `${C.accent}18`; }}
               onMouseLeave={e => { e.currentTarget.style.background = `${C.accent}08`; }}>
              {ctaS}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════
// TAWK LIVE CHAT
// ═══════════════════════════════════════
function TawkLiveChat() {
  useEffect(() => {
    if (!HAS_TAWK_LIVE_CHAT || typeof window === "undefined") return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const scriptId = "orionsoft-tawk-widget";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);
  }, []);

  return null;
}

function LiveChatFloat({ setCurrentPage }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [chat, setChat] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "CareCore demo",
    supportArea: "",
    message: "",
    website: "",
  });

  const updateChat = (key, value) => {
    setError("");
    setChat(current => ({ ...current, [key]: value }));
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    if (!chat.name.trim() || !chat.message.trim() || (!chat.email.trim() && !chat.phone.trim())) {
      setError("Please add your name, message, and either phone or email.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await sendWebsiteForm("live chat message", {
        ...chat,
        preferredReply: chat.phone ? "Phone / direct message" : "Email",
      });
      setSent(true);
      setChat({
        name: "",
        email: "",
        phone: "",
        topic: "CareCore demo",
        supportArea: "",
        message: "",
        website: "",
      });
    } catch {
      setError("Chat delivery is not available right now. Please use the project form or call us.");
    } finally {
      setSubmitting(false);
    }
  };

  const chatInput = {
    width: "100%",
    border: `1px solid rgba(215,227,239,0.12)`,
    background: "rgba(255,255,255,0.075)",
    color: C.heading,
    borderRadius: 10,
    padding: "11px 12px",
    fontSize: 13,
    outline: "none",
  };
  const quickTopics = [
    { label: "Book demo", topic: "CareCore demo", message: "Hello Orion Soft, I would like to book a CareCore demo for my facility." },
    { label: "Get pricing", topic: "Pricing question", message: "Hello Orion Soft, please share pricing details for CareCore or your software services." },
    { label: "Build software", topic: "Custom software", message: "Hello Orion Soft, I need a custom software solution and would like to discuss the scope." },
    { label: "Support", topic: "Support request", message: "Hello Orion Soft, I need support with a product or request." },
  ];
  const supportAreas = ["CareCore HMS", "Website issue", "Billing", "Training", "Login/access", "Feature request"];

  return (
    <div className="live-chat" style={{ position: "fixed", right: 22, bottom: 22, zIndex: 5000, fontFamily: font }}>
      {open && (
        <div style={{
          width: "min(410px, calc(100vw - 32px))",
          background: "rgba(8,28,48,0.98)",
          border: `1px solid rgba(56,189,248,0.22)`,
          borderRadius: 18,
          boxShadow: "0 28px 80px rgba(0,0,0,0.42)",
          overflow: "hidden",
          marginBottom: 12,
        }}>
          <div style={{
            padding: 18,
            borderBottom: `1px solid rgba(255,255,255,0.08)`,
            background: `linear-gradient(135deg, rgba(56,189,248,0.18), rgba(45,212,191,0.10))`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                color: C.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 900,
              }}>OS</div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 900, color: C.heading }}>Orion Soft Reception</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.mint, marginTop: 3 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.mint, boxShadow: `0 0 10px ${C.mint}` }} />
                  Online desk / replies by phone or email
                </div>
              </div>
            </div>
            <button type="button" aria-label="Close live chat" onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.text, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>x</button>
          </div>
          <div style={{ padding: 18, background: "linear-gradient(180deg, rgba(10,37,64,0.98), rgba(7,20,35,0.98))" }}>
            {sent ? (
              <div>
                <div style={{ border: `1px solid ${C.mint}33`, background: C.mintDim, borderRadius: 14, padding: 18, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: C.mint, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, marginBottom: 12 }}>OK</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: C.heading, marginBottom: 6 }}>Message sent to Orion Soft</div>
                  <p style={{ margin: 0, color: C.text, fontSize: 13.5, lineHeight: 1.65 }}>
                    The receptionist desk will receive it through Resend and reply using the contact detail you provided.
                  </p>
                </div>
                <button type="button" onClick={() => setSent(false)} style={{
                  width: "100%",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                  border: "none",
                  color: C.bg,
                  borderRadius: 10,
                  padding: "11px 14px",
                  fontSize: 13.5,
                  fontWeight: 900,
                  cursor: "pointer",
                }}>Send Another Message</button>
              </div>
            ) : (
              <form onSubmit={handleChatSubmit}>
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={chat.website}
                  onChange={e => updateChat("website", e.target.value)}
                  style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0 }}
                  aria-hidden="true"
                />
                <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                  <div style={{ maxWidth: "88%", background: "rgba(255,255,255,0.075)", border: `1px solid ${C.border}`, borderRadius: "14px 14px 14px 4px", padding: "11px 13px" }}>
                    <p style={{ margin: 0, color: C.text, fontSize: 13.5, lineHeight: 1.6 }}>
                      Hi, welcome to Orion Soft. What can we help you with today?
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {quickTopics.map(item => (
                      <button key={item.label} type="button" onClick={() => setChat(current => ({ ...current, topic: item.topic, message: item.message }))} style={{
                        background: chat.topic === item.topic ? C.accentDim : "rgba(255,255,255,0.055)",
                        color: chat.topic === item.topic ? C.accent : C.text,
                        border: `1px solid ${chat.topic === item.topic ? C.accent + "55" : C.border}`,
                        borderRadius: 999,
                        padding: "8px 11px",
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}>{item.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <input style={chatInput} value={chat.name} onChange={e => updateChat("name", e.target.value)} placeholder="Your name *" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input type="email" style={chatInput} value={chat.email} onChange={e => updateChat("email", e.target.value)} placeholder="Email" />
                    <input style={chatInput} value={chat.phone} onChange={e => updateChat("phone", e.target.value)} placeholder="Phone / direct message" />
                  </div>
                  <select style={{ ...chatInput, cursor: "pointer" }} value={chat.topic} onChange={e => updateChat("topic", e.target.value)}>
                    <option>CareCore demo</option>
                    <option>Pricing question</option>
                    <option>Custom software</option>
                    <option>Support request</option>
                    <option>Career question</option>
                    <option>Other</option>
                  </select>
                  {chat.topic === "Support request" && (
                    <div style={{
                      border: `1px solid ${C.mint}33`,
                      background: "rgba(45,212,191,0.07)",
                      borderRadius: 12,
                      padding: 12,
                    }}>
                      <div style={{ fontSize: 12, color: C.mint, fontWeight: 900, marginBottom: 9 }}>What do you need support with?</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {supportAreas.map(area => (
                          <button key={area} type="button" onClick={() => updateChat("supportArea", area)} style={{
                            background: chat.supportArea === area ? C.mint : "rgba(255,255,255,0.08)",
                            color: chat.supportArea === area ? C.bg : C.text,
                            border: `1px solid ${chat.supportArea === area ? C.mint : C.border}`,
                            borderRadius: 999,
                            padding: "7px 10px",
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}>{area}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <textarea style={{ ...chatInput, resize: "vertical" }} rows={4} value={chat.message} onChange={e => updateChat("message", e.target.value)} placeholder="Type your message here *" />
                </div>
                {error && <p style={{ fontSize: 12.5, color: C.rose, margin: "10px 0 0", lineHeight: 1.5 }}>{error}</p>}
                <p style={{ margin: "10px 0 0", color: C.textMuted, fontSize: 11.5, lineHeight: 1.5 }}>
                  This secure desk sends directly to Orion Soft. Add phone for the fastest response.
                </p>
                <button type="submit" disabled={submitting} style={{
                  width: "100%",
                  marginTop: 12,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                  border: "none",
                  color: C.bg,
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.72 : 1,
                  boxShadow: `0 12px 28px ${C.accentGlow}`,
                }}>{submitting ? "Sending..." : "Send to Reception Desk"}</button>
              </form>
            )}
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => { setCurrentPage("contact"); setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
                background: `${C.accent}10`,
                border: `1px solid ${C.accent}33`,
                color: C.accent,
                borderRadius: 10,
                padding: "11px 14px",
                fontSize: 13.5,
                fontWeight: 800,
                cursor: "pointer",
              }}>Open Project Form</button>
            </div>
          </div>
        </div>
      )}
      <button type="button" aria-label="Open Orion Soft live chat" aria-expanded={open} onClick={() => setOpen(current => !current)} style={{
        minWidth: 176,
        height: 62,
        borderRadius: 18,
        border: `1px solid rgba(255,255,255,0.78)`,
        background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
        color: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 11,
        padding: "0 18px",
        boxShadow: `0 18px 44px ${C.accentGlow}, 0 0 0 8px rgba(56,189,248,0.10)`,
        cursor: "pointer",
        fontSize: 13.5,
        fontWeight: 900,
      }}>
        <span style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background: "rgba(10,37,64,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </span>
        <span style={{ display: "grid", textAlign: "left", lineHeight: 1.15 }}>
          <span>Chat with us</span>
          <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.75 }}>Orion Soft desk</span>
        </span>
      </button>
    </div>
  );
}

function LegalPage({ type, setCurrentPage }) {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const intro = isPrivacy
    ? "This policy explains how Orion Soft Limited handles information submitted through this website."
    : "These terms explain how visitors may use the Orion Soft Limited website and request services.";
  const sections = isPrivacy ? [
    {
      h: "Information We Collect",
      p: "When you submit a project request, job application, or feedback, we collect the details you choose to provide, including your name, organisation, email, phone number, country or region, request category, CV or portfolio link, and message.",
    },
    {
      h: "How We Use Information",
      p: "We use submitted information to respond to inquiries, prepare proposals, improve the website, support sales conversations, and maintain a record of legitimate business communication.",
    },
    {
      h: "Storage and Sharing",
      p: "Form submissions are sent to Orion Soft through the configured form endpoint or through your email application. We do not sell visitor information. Access is limited to people who need it to respond or deliver services.",
    },
    {
      h: "Your Rights",
      p: `You can request correction or deletion of your submitted information by contacting ${COMPANY_EMAIL}.`,
    },
  ] : [
    {
      h: "Website Use",
      p: "You may browse this website, submit genuine inquiries, and contact Orion Soft about products or services. Do not misuse the forms, attempt to disrupt the website, or submit unlawful content.",
    },
    {
      h: "Service Discussions",
      p: "Prices, timelines, and product details shown on the website are general guidance. Final scope, cost, delivery dates, and responsibilities are confirmed in a written proposal or agreement.",
    },
    {
      h: "Intellectual Property",
      p: "The Orion Soft name, CareCore name, content, layout, and design assets on this website belong to Orion Soft Limited unless otherwise stated.",
    },
    {
      h: "Contact",
      p: `For questions about these terms, contact ${COMPANY_EMAIL} or ${COMPANY_PHONE}.`,
    },
  ];

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [type]);

  return (
    <section style={{ minHeight: "100vh", background: C.bg, padding: "110px clamp(16px, 4vw, 32px) 80px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Reveal>
          <button type="button" onClick={() => setCurrentPage("home")} style={{
            background: "none", border: "none", color: C.accent, fontSize: 14,
            fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 700,
          }}>Back to Home</button>
        </Reveal>
        <Reveal delay={0.05}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: C.mint, fontFamily: font, letterSpacing: "0.08em" }}>ORION SOFT LIMITED</span>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: "10px 0 12px" }}>
            {title}
          </h1>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.75, marginBottom: 34 }}>
            {intro} Last updated: May 12, 2026.
          </p>
        </Reveal>
        <div style={{ display: "grid", gap: 14 }}>
          {sections.map((section, i) => (
            <Reveal key={section.h} delay={0.08 + i * 0.05}>
              <article style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px clamp(18px, 3vw, 30px)" }}>
                <h2 style={{ fontSize: 18, color: C.heading, fontFamily: font, fontWeight: 800, marginBottom: 8 }}>{section.h}</h2>
                <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>{section.p}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ setCurrentPage }) {
  const cms = useContext(CMSContext);
  const s = cms?.settings || {};
  const fEmail = s.email || COMPANY_EMAIL;
  const fPhone = s.phone || COMPANY_PHONE;
  const fRC = s.rc || COMPANY_RC;
  const fTagline = s.tagline || "Building production software for healthcare providers and ambitious businesses.";
  const fLinkedin = s.linkedin || "https://linkedin.com/company/orionsoftlimited";

  const goHomeAnchor = (anchor) => (event) => {
    event.preventDefault();
    setCurrentPage("home");
    window.setTimeout(() => {
      document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <footer style={{ padding: "56px clamp(16px, 4vw, 32px) 28px", background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 36, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <OrionLogo size={28} gradientId="footer-orion-logo" />
              <span style={{ fontSize: 17, fontWeight: 700, color: C.white, fontFamily: font }}>Orion<span style={{ color: C.gold }}>Soft</span></span>
            </div>
            <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 1.7, maxWidth: 250, marginBottom: 16 }}>
              {fTagline} Registered · RC {fRC}.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <a href={fLinkedin} target="_blank" rel="noreferrer"
                 aria-label="Orion Soft on LinkedIn"
                 style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, transition: "all 0.2s", textDecoration: "none" }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "44"; e.currentTarget.style.color = C.accent; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
              <a href={asDirectMessageLink(fPhone)} target="_blank" rel="noreferrer"
                 aria-label="Message Orion Soft on WhatsApp"
                 style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, transition: "all 0.2s", textDecoration: "none" }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = C.mint + "44"; e.currentTarget.style.color = C.mint; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </a>
              <a href={`mailto:${fEmail}`}
                 aria-label="Email Orion Soft"
                 style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, transition: "all 0.2s", textDecoration: "none" }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "44"; e.currentTarget.style.color = C.accent; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </a>
            </div>
          </div>

          {[
            { title: "Products", links: [
              { l: "CareCore HMS", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("products"); } },
              { l: "Pricing", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("products"); window.setTimeout(() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" }), 80); } },
              { l: "Case Studies", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("case-studies"); } },
              { l: "Tech Stack", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("tech"); } },
            ]},
            { title: "Company", links: [
              { l: "Services", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("services"); } },
              { l: "Portfolio", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("work"); } },
              { l: "Blog", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("blog"); } },
              { l: "Team", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("team"); } },
              { l: "Careers", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("careers"); } },
              { l: "Partner Program", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("partners"); } },
            ]},
            { title: "Support", links: [
              { l: "Support Center", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("support"); } },
              { l: "Documentation", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("support"); } },
              { l: "FAQs", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("support"); } },
              { l: "Contact Us", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("contact"); } },
            ]},
            { title: "Legal", links: [
              { l: "Privacy Policy", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("privacy"); } },
              { l: "Terms of Service", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("terms"); } },
              { l: "Security", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("security"); } },
            ]},
            { title: "Contact", isContact: true },
          ].map((col, ci) => (
            <div key={ci}>
              <h4 style={{ fontSize: 12.5, fontWeight: 700, color: C.text, fontFamily: font, marginBottom: 14, letterSpacing: "0.06em" }}>{col.title}</h4>
              {col.isContact ? (
                <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 2 }}>
                  <a href={asPhoneLink(fPhone)} style={{ color: C.textMuted, textDecoration: "none" }}>{fPhone}</a><br />
                  <a href={`mailto:${fEmail}`} style={{ color: C.textMuted, textDecoration: "none" }}>{fEmail}</a><br />
                  <a href={asDirectMessageLink(fPhone)} target="_blank" rel="noreferrer" style={{ color: C.textMuted, textDecoration: "none" }}>Message Orion Soft</a><br />
                  Available for international projects
                </div>
              ) : col.links.map((link, li) => (
                <a key={li} href={link.a} onClick={link.onClick} style={{
                  display: "block", color: C.textMuted, textDecoration: "none",
                  fontSize: 13, fontFamily: font, marginBottom: 8, transition: "color 0.2s",
                }} onMouseEnter={e => e.currentTarget.style.color = C.accent}
                   onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>{link.l}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
        }}>
          <p style={{ fontSize: 12, color: C.textMuted, fontFamily: font, margin: 0 }}>
            © 2026 Orion Soft Limited. RC: {fRC} · Built in Nigeria. Available globally.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { l: "Privacy", p: "privacy" }, { l: "Terms", p: "terms" },
              { l: "Security", p: "security" }, { l: "Support", p: "support" },
            ].map(({ l, p }) => (
              <button key={p} type="button" onClick={() => setCurrentPage(p)} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, fontFamily: font, cursor: "pointer", transition: "color 0.2s", padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = C.accent}
                onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>{l}</button>
            ))}
            <button type="button" onClick={() => setCurrentPage("admin")} style={{ background: "none", border: "none", color: "transparent", fontSize: 11, fontFamily: font, cursor: "default", transition: "color 0.3s", userSelect: "none", padding: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.cursor = "pointer"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "transparent"; e.currentTarget.style.cursor = "default"; }}>Admin</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════
function SectionHeader({ tag, tagColor, title, subtitle, dark = false }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: tagColor, fontFamily: font, letterSpacing: "0.1em" }}>{tag}</span>
      <h2 style={{
        fontSize: "clamp(26px, 3.8vw, 42px)", fontWeight: 800, fontFamily: font,
        color: dark ? C.heading : C.lightHeading,
        letterSpacing: "-0.025em", margin: "10px 0 14px", lineHeight: 1.15,
      }}>{title}</h2>
      {subtitle && <p style={{
        fontSize: 16, color: dark ? C.text : C.lightMuted, fontFamily: font,
        lineHeight: 1.7, margin: 0,
      }}>{subtitle}</p>}
    </div>
  );
}

// ═══════════════════════════════════════
// HOME PAGE — STATS BAR
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// HOME PAGE — TRUST BADGES + CUSTOMER LOGOS
// ═══════════════════════════════════════
function TrustSection({ portfolio = [] }) {
  const cms = useContext(CMSContext);
  const rc = cms?.settings?.rc || COMPANY_RC;
  const badges = [
    { icon: "🏛️", label: "CAC Registered", sub: `RC ${rc}`, color: C.gold },
    { icon: "🔒", label: "NDPR Compliant", sub: "Nigeria Data Protection", color: C.accent },
    { icon: "🔐", label: "SSL Secured", sub: "All data encrypted in transit", color: C.mint },
    { icon: "🇳🇬", label: "Nigerian-owned", sub: "Built & supported locally", color: C.purple },
  ];

  const cmsClients = (cms?.clients || [])
    .filter(c => c.published !== false && c.name)
    .map(c => c.name);

  const portfolioClients = portfolio
    .filter(p => p.published && p.clientName)
    .map(p => p.clientName);

  const clientNames = (cmsClients.length > 0 ? cmsClients : portfolioClients)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 8);

  return (
    <div style={{ background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "36px clamp(16px, 4vw, 32px)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", alignItems: "stretch" }}>
          {badges.map(b => (
            <div key={b.label} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: b.color + "0D", border: `1px solid ${b.color}22`,
              borderRadius: 10, padding: "10px 16px", flex: "1 1 auto", minWidth: 180,
            }}>
              <span style={{ fontSize: 20 }}>{b.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.heading, fontFamily: font }}>{b.label}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font }}>{b.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {clientNames.length > 0 && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.08em", marginBottom: 16 }}>TRUSTED BY</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {clientNames.map(name => (
                <span key={name} style={{
                  fontSize: 13, fontWeight: 600, color: C.text, fontFamily: font,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "8px 16px",
                }}>{name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ANNOUNCEMENT BAR
// ═══════════════════════════════════════
function AnnouncementBar() {
  const cms = useContext(CMSContext);
  const ann = cms?.announcements;
  const [dismissed, setDismissed] = useState(false);

  if (!ann?.active || !ann?.text || dismissed) return null;

  const typeColors = {
    info:    { bg: C.accent + "18", border: C.accent + "44", text: C.accent },
    warning: { bg: C.gold   + "18", border: C.gold   + "44", text: C.gold },
    success: { bg: C.mint   + "18", border: C.mint   + "44", text: C.mint },
  };
  const tc = typeColors[ann.type] || typeColors.info;

  return (
    <div role="banner" style={{
      background: tc.bg, borderBottom: `1px solid ${tc.border}`,
      padding: "10px clamp(16px, 4vw, 32px)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      position: "relative",
    }}>
      <span style={{ fontSize: 13.5, fontFamily: font, color: tc.text, fontWeight: 500 }}>
        {ann.text}
        {ann.link && ann.linkText && (
          <a href={ann.link} style={{ color: tc.text, fontWeight: 700, marginLeft: 8, textDecoration: "underline" }}
             target={ann.link.startsWith("http") ? "_blank" : undefined}
             rel={ann.link.startsWith("http") ? "noreferrer" : undefined}>
            {ann.linkText}
          </a>
        )}
      </span>
      {ann.dismissible !== false && (
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss announcement"
          style={{ background: "none", border: "none", color: tc.text, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px", position: "absolute", right: 16 }}>×</button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// BLOG PAGE
// ═══════════════════════════════════════
function BlogPage({ setCurrentPage, postId, setPostId }) {
  const cms = useContext(CMSContext);
  const posts = (cms?.blog || []).filter(p => p.published !== false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [postId]);

  if (postId) {
    const post = posts.find(p => p.id === postId || p.slug === postId);
    if (!post) {
      return (
        <section style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "120px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 12 }}>Post not found</h2>
            <button type="button" onClick={() => setPostId(null)} style={{ background: "none", border: `1px solid ${C.accent}`, color: C.accent, padding: "10px 24px", borderRadius: 8, fontFamily: font, fontSize: 14, cursor: "pointer" }}>← Back to Blog</button>
          </div>
        </section>
      );
    }
    return (
      <article style={{ background: C.bg, padding: "100px clamp(16px, 4vw, 32px) 80px", maxWidth: 780, margin: "0 auto" }}>
        <button type="button" onClick={() => setPostId(null)} style={{ background: "none", border: "none", color: C.accent, fontFamily: font, fontSize: 14, cursor: "pointer", marginBottom: 32, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
          ← Back to Blog
        </button>
        {post.category && (
          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, fontFamily: font, letterSpacing: "0.08em" }}>{post.category.toUpperCase()}</span>
        )}
        <h1 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 800, color: C.heading, fontFamily: font, marginTop: 8, marginBottom: 16, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{post.title}</h1>
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          {post.author && <span style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{post.author}</span>}
          {post.date && <span style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>·  {post.date}</span>}
          {post.readTime && <span style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>·  {post.readTime}</span>}
        </div>
        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} style={{ width: "100%", borderRadius: 12, marginBottom: 32, objectFit: "cover", maxHeight: 400 }} loading="lazy" />
        )}
        <div style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{post.body || post.excerpt || ""}</div>
      </article>
    );
  }

  return (
    <section style={{ background: C.bg, padding: "100px clamp(16px, 4vw, 32px) 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.accent, fontFamily: font, letterSpacing: "0.1em" }}>INSIGHTS</span>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, color: C.heading, fontFamily: font, marginTop: 10, marginBottom: 14, letterSpacing: "-0.025em", lineHeight: 1.15 }}>Blog</h1>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7 }}>Thoughts on healthcare software, engineering, and building in Nigeria.</p>
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 16, color: C.textMuted, fontFamily: font }}>No posts published yet. Check back soon.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 28 }}>
            {posts.map(post => (
              <button type="button" key={post.id || post.slug || post.title} onClick={() => setPostId(post.id || post.slug || post.title)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px", textAlign: "left", cursor: "pointer", transition: "all 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "44"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                {post.coverImage && (
                  <img src={post.coverImage} alt={post.title} style={{ width: "100%", borderRadius: 8, marginBottom: 16, objectFit: "cover", height: 160 }} loading="lazy" />
                )}
                {post.category && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: font, letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>{post.category.toUpperCase()}</span>
                )}
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 8, lineHeight: 1.35 }}>{post.title}</h3>
                {post.excerpt && <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.6, marginBottom: 12 }}>{post.excerpt}</p>}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {post.date && <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font }}>{post.date}</span>}
                  {post.readTime && <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font }}>·  {post.readTime}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// TEAM PAGE
// ═══════════════════════════════════════
const MKINI = (name) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const TEAM_COLORS = [C.accent, C.mint, C.purple, C.gold, "#E84393", "#14B8A6"];

function TeamPage({ setCurrentPage }) {
  const cms = useContext(CMSContext);
  const members = (cms?.team || []).filter(m => m.published !== false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  return (
    <section style={{ background: C.bg, padding: "100px clamp(16px, 4vw, 32px) 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 56, textAlign: "center" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.accent, fontFamily: font, letterSpacing: "0.1em" }}>THE PEOPLE</span>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, color: C.heading, fontFamily: font, marginTop: 10, marginBottom: 14, letterSpacing: "-0.025em", lineHeight: 1.15 }}>Our Team</h1>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7 }}>The people building and supporting Orion Soft's products.</p>
        </div>

        {members.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 16, color: C.textMuted, fontFamily: font }}>Team profiles coming soon.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 28 }}>
            {members.map((m, i) => {
              const color = TEAM_COLORS[i % TEAM_COLORS.length];
              return (
                <div key={m.id || m.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, textAlign: "center", transition: "all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color + "44"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginBottom: 16, border: `2px solid ${color}44` }} loading="lazy" />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${color}20, ${color}40)`, border: `2px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26, fontWeight: 800, color, fontFamily: font }}>
                      {MKINI(m.name)}
                    </div>
                  )}
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 4 }}>{m.name}</h3>
                  <p style={{ fontSize: 13, color, fontFamily: font, fontWeight: 600, marginBottom: 10 }}>{m.role}</p>
                  {m.bio && <p style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.6, marginBottom: 12 }}>{m.bio}</p>}
                  {m.linkedin && (
                    <a href={m.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: C.accent, fontFamily: font, textDecoration: "none" }}>LinkedIn →</a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function StatsBar() {
  const cms = useContext(CMSContext);
  const stats = (cms?.homepage?.stats && cms.homepage.stats.length > 0)
    ? cms.homepage.stats
    : DEFAULT_CMS_STATS;
  return (
    <div role="region" aria-label="Product metrics" style={{
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      padding: "28px clamp(16px, 4vw, 32px)",
    }}>
      <div className="stats-bar" style={{
        maxWidth: 1280, margin: "0 auto",
        display: "flex", gap: 0,
        justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap",
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && <div style={{ width: 1, height: 36, background: C.border, margin: "0 clamp(14px, 3vw, 40px)", flexShrink: 0 }} />}
            <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
              <div style={{
                fontSize: "clamp(22px, 2.8vw, 34px)", fontWeight: 800, color: C.heading,
                fontFamily: font, letterSpacing: "-0.03em", lineHeight: 1,
              }}>{stat.value}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 5, fontWeight: 500 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// HOME PAGE — PRODUCT HIGHLIGHTS
// ═══════════════════════════════════════
function ProductHighlights({ setCurrentPage, products: managedProducts }) {
  const products = (managedProducts || []).filter(p => p.published);

  return (
    <section style={{ padding: "80px clamp(16px, 4vw, 32px)", background: C.light }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, fontFamily: font, letterSpacing: "0.1em" }}>PRODUCTS</span>
            <h2 style={{
              fontSize: "clamp(26px, 3.8vw, 42px)", fontWeight: 800, fontFamily: font,
              color: C.lightHeading, letterSpacing: "-0.025em",
              margin: "10px 0 0", lineHeight: 1.12,
            }}>One engineering standard. Two ways to deploy it.</h2>
          </div>
        </Reveal>
        <div className="product-highlights-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: 20 }}>
          {products.map((p, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <article style={{
                background: C.lightCard, borderRadius: 20,
                border: `1px solid ${C.lightBorder}`,
                overflow: "hidden", display: "flex", flexDirection: "column",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }} onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 20px 50px rgba(0,0,0,0.1), 0 0 0 1px ${p.color}22`;
              }} onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
              }}>
                <div style={{
                  padding: "30px 32px 24px",
                  background: `linear-gradient(135deg, ${p.color}10, transparent)`,
                  borderBottom: `1px solid ${p.color}16`,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: p.color, fontFamily: font,
                    letterSpacing: "0.08em", background: `${p.color}12`,
                    border: `1px solid ${p.color}20`, borderRadius: 6,
                    padding: "5px 10px", display: "inline-block", marginBottom: 16,
                  }}>{p.tag}</span>
                  <h3 style={{
                    fontSize: "clamp(18px, 2.2vw, 24px)", fontWeight: 800,
                    color: C.lightHeading, fontFamily: font,
                    letterSpacing: "-0.02em", margin: "0 0 10px", lineHeight: 1.18,
                  }}>{p.headline}</h3>
                  <p style={{ fontSize: 14.5, color: C.lightMuted, fontFamily: font, lineHeight: 1.65, margin: 0 }}>{p.desc}</p>
                </div>
                <div style={{ padding: "24px 32px", flex: 1 }}>
                  {p.features.map((f, fi) => (
                    <div key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: fi < p.features.length - 1 ? 14 : 0 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                        background: `${p.color}12`, border: `1px solid ${p.color}22`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="2 6 5 9 10 3"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 14, color: C.lightText, fontFamily: font, lineHeight: 1.55 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "0 32px 30px" }}>
                  <button type="button" onClick={() => setCurrentPage(p.ctaAction)} style={{
                    width: "100%", padding: "13px 20px", borderRadius: 10,
                    background: p.primary ? `linear-gradient(135deg, ${C.accent}, ${C.mint})` : `${p.color}10`,
                    border: p.primary ? "none" : `1px solid ${p.color}28`,
                    color: p.primary ? C.bg : p.color,
                    fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer",
                    transition: "all 0.25s", letterSpacing: "0.01em",
                  }} onMouseEnter={e => {
                    if (p.primary) { e.currentTarget.style.boxShadow = `0 8px 24px ${C.accentGlow}`; e.currentTarget.style.transform = "translateY(-1px)"; }
                    else { e.currentTarget.style.background = `${p.color}20`; }
                  }} onMouseLeave={e => {
                    if (p.primary) { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }
                    else { e.currentTarget.style.background = `${p.color}10`; }
                  }}>
                    {p.ctaLabel} →
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// HOME PAGE — WHY ORION SOFT
// ═══════════════════════════════════════
const WHYUS_ICON_COLORS = [C.accent, C.mint, C.gold, C.purple];
const WHYUS_ICON_PATHS = [
  "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  "M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z",
  "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  "M3.055 11H5a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2 2 2 0 0 1 2 2v2.945M8 3.935V5.5A2.5 2.5 0 0 0 10.5 8h.5a2 2 0 0 1 2 2 2 2 0 0 0 4 0 2 2 0 0 1 2-2h1.064M15 20.488V18a2 2 0 0 1 2-2h3.064",
];

function WhyUs() {
  const cms = useContext(CMSContext);
  const cmsItems = cms?.homepage?.whyUs;
  const reasons = ((cmsItems && cmsItems.length > 0) ? cmsItems : DEFAULT_CMS_WHYUS).map((r, i) => ({
    title: r.title, desc: r.desc,
    color: WHYUS_ICON_COLORS[i % 4],
    icon:  WHYUS_ICON_PATHS[i % 4],
  }));

  return (
    <section style={{ padding: "80px clamp(16px, 4vw, 32px)", background: C.bg }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.mint, fontFamily: font, letterSpacing: "0.1em" }}>WHY ORION SOFT</span>
            <h2 style={{
              fontSize: "clamp(26px, 3.8vw, 42px)", fontWeight: 800, fontFamily: font,
              color: C.heading, letterSpacing: "-0.025em",
              margin: "10px 0 0", lineHeight: 1.12,
            }}>Built different. Deployed properly.</h2>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
          {reasons.map((r, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <article style={{
                background: C.card, borderRadius: 16,
                border: `1px solid ${C.border}`,
                padding: "32px 28px",
                transition: "all 0.3s", height: "100%",
              }} onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${r.color}44`;
                e.currentTarget.style.transform = "translateY(-3px)";
              }} onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.transform = "translateY(0)";
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, marginBottom: 22,
                  background: `${r.color}14`, border: `1px solid ${r.color}28`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={r.icon}/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.01em", margin: "0 0 10px" }}>{r.title}</h3>
                <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.72, margin: 0 }}>{r.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// HOME PAGE — SOCIAL PROOF
// ═══════════════════════════════════════
const TESTI_COLORS = [C.accent, C.mint, C.purple, C.amber, C.rose];
function mkInitials(name) { return (name || "").split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase() || "?"; }

function SocialProof({ setCurrentPage }) {
  const cms = useContext(CMSContext);
  const raw = (cms?.testimonials && cms.testimonials.filter(t=>t.featured).length > 0)
    ? cms.testimonials.filter(t => t.featured)
    : DEFAULT_CMS_TESTIMONIALS;
  const testimonials = raw.slice(0, 3).map((t, i) => ({
    quote:    t.quote,
    name:     t.name,
    title:    [t.role, t.company].filter(Boolean).join(", "),
    initials: mkInitials(t.name),
    color:    TESTI_COLORS[i % TESTI_COLORS.length],
  }));


  return (
    <section style={{ padding: "80px clamp(16px, 4vw, 32px)", background: C.surface }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, fontFamily: font, letterSpacing: "0.1em" }}>TRUSTED BY TEAMS</span>
            <h2 style={{
              fontSize: "clamp(26px, 3.8vw, 42px)", fontWeight: 800, fontFamily: font,
              color: C.heading, letterSpacing: "-0.025em",
              margin: "10px 0 0", lineHeight: 1.12,
            }}>Trusted by the teams who use it every day.</h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginBottom: 24 }}>
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <article style={{
                background: C.card, borderRadius: 16,
                border: `1px solid ${C.border}`,
                padding: "28px",
                display: "flex", flexDirection: "column", height: "100%",
              }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 18 }}>
                  {[...Array(5)].map((_, si) => (
                    <svg key={si} width="14" height="14" viewBox="0 0 24 24" fill={C.amber} stroke="none" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <p style={{
                  fontSize: 14.5, color: C.text, fontFamily: font,
                  lineHeight: 1.78, margin: "0 0 20px", flex: 1,
                }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: `linear-gradient(135deg, ${t.color}33, ${t.color}18)`,
                    border: `1px solid ${t.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: t.color, fontSize: 13, fontWeight: 900, fontFamily: font,
                  }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.heading, fontFamily: font }}>{t.name}</div>
                    <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 2 }}>{t.title}</div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div style={{
            background: `linear-gradient(135deg, ${C.accent}12, ${C.mint}06)`,
            border: `1px solid ${C.accent}28`,
            borderRadius: 14,
            padding: "26px clamp(18px, 3vw, 32px)",
            display: "flex", gap: 24, flexWrap: "wrap",
            alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ flex: "1 1 320px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, fontFamily: font, letterSpacing: "0.1em", marginBottom: 10 }}>DEPLOYMENT SPOTLIGHT</div>
              <h3 style={{ fontSize: "clamp(16px, 2vw, 20px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.01em", margin: "0 0 8px" }}>
                25+ modules. 8 departments. Under 4 weeks.
              </h3>
              <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, margin: "0 0 16px" }}>
                A mid-size hospital replaced paper records and spreadsheets with CareCore — full go-live with all clinical, billing, and ward modules active.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[["< 4 weeks", "Full deployment"], ["8", "Departments live"], ["40+", "Staff trained"]].map(([val, lbl]) => (
                  <div key={lbl} style={{
                    background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: "8px 14px", whiteSpace: "nowrap",
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em" }}>{val}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setCurrentPage("products")} style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
              color: C.bg, border: "none", borderRadius: 10,
              padding: "13px 22px", fontSize: 14, fontWeight: 700,
              fontFamily: font, cursor: "pointer", whiteSpace: "nowrap",
              flexShrink: 0, transition: "all 0.25s",
              letterSpacing: "0.01em",
            }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${C.accentGlow}`; }}
               onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
              See Full Product →
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// ADMIN — LOGIN
// ═══════════════════════════════════════
function AdminLogin({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      try { sessionStorage.setItem(ADMIN_SESSION_KEY, "yes"); } catch {}
      onLogin();
    } else {
      setError("Incorrect password.");
      setPwd("");
    }
  };

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "13px 16px",
    borderRadius: 10, border: `1px solid ${C.border}`,
    background: C.card, color: C.heading, fontSize: 15,
    fontFamily: font, outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 21, fontWeight: 800, color: C.heading, fontFamily: font }}>Orion<span style={{ color: C.gold }}>Soft</span></span>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "36px 32px", boxShadow: "0 24px 70px rgba(0,0,0,0.28)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 6px" }}>Product Manager</h1>
          <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font, margin: "0 0 28px" }}>Enter your admin password to continue.</p>
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: C.text, fontFamily: font, display: "block", marginBottom: 6 }}>Password</label>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input
                type={showPwd ? "text" : "password"}
                style={{ ...inp, paddingRight: 50 }}
                value={pwd}
                onChange={e => { setPwd(e.target.value); setError(""); }}
                placeholder="Admin password"
                autoFocus
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                {showPwd
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
            {error && <p style={{ fontSize: 13, color: C.rose, fontFamily: font, marginBottom: 16 }}>{error}</p>}
            <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, color: C.bg, fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>Sign In</button>
          </form>
        </div>
        <p style={{ textAlign: "center", fontSize: 11.5, color: C.textMuted, fontFamily: font, marginTop: 16 }}>
          Set VITE_ADMIN_PASSWORD in .env to change the password.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ADMIN — PRODUCT FORM (SLIDE PANEL)
// ═══════════════════════════════════════
const EMPTY_PRODUCT = {
  name: "", tag: "", status: "live", published: true, primary: false,
  headline: "", desc: "", features: [""], pricing: [], screenshots: [],
  ctaLabel: "", ctaAction: "contact", color: "#38BDF8",
};

function AdminProductForm({ product, onSave, onCancel }) {
  const isEdit = Boolean(product?.id);
  const [form, setForm] = useState(() => ({
    ...EMPTY_PRODUCT,
    ...(product || {}),
    features: product?.features?.length ? [...product.features] : [""],
    pricing: product?.pricing?.length ? product.pricing.map(t => ({ ...t })) : [],
    screenshots: product?.screenshots?.length ? product.screenshots.map(s => ({ ...s })) : [],
  }));
  const [tab, setTab] = useState("info");
  const [errors, setErrors] = useState({});
  const [ssUrl, setSsUrl] = useState("");
  const [ssTitle, setSsTitle] = useState("");
  const [ssDsc, setSsDsc] = useState("");
  const [ssErr, setSsErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.headline.trim()) e.headline = "Required";
    if (!form.desc.trim()) e.desc = "Required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (!validate()) { setTab("info"); return; }
    onSave({ ...form, features: form.features.filter(f => f.trim()) });
  };

  const addFeature = () => set("features", [...form.features, ""]);
  const setFeature = (i, v) => set("features", form.features.map((f, fi) => fi === i ? v : f));
  const removeFeature = (i) => set("features", form.features.filter((_, fi) => fi !== i));
  const moveFeature = (i, d) => {
    const arr = [...form.features];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("features", arr);
  };

  const addPricing = () => set("pricing", [...form.pricing, { id: `pt-${Date.now()}`, name: "", beds: "", onboard: "", monthly: "", popular: false }]);
  const setPricing = (i, k, v) => set("pricing", form.pricing.map((t, ti) => ti === i ? { ...t, [k]: v } : t));
  const removePricing = (i) => set("pricing", form.pricing.filter((_, ti) => ti !== i));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setSsErr("Max 2MB per image"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setSsUrl(ev.target.result); setSsErr(""); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addScreenshot = () => {
    if (!ssUrl.trim()) { setSsErr("Paste a URL or upload a file"); return; }
    set("screenshots", [...form.screenshots, { id: `ss-${Date.now()}`, url: ssUrl.trim(), title: ssTitle.trim(), desc: ssDsc.trim() }]);
    setSsUrl(""); setSsTitle(""); setSsDsc(""); setSsErr("");
  };
  const removeScreenshot = (i) => set("screenshots", form.screenshots.filter((_, si) => si !== i));

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 9,
    border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", color: C.heading,
    fontSize: 14, fontFamily: font, outline: "none",
  };
  const lbl = { fontSize: 12.5, fontWeight: 600, color: C.text, fontFamily: font, marginBottom: 5, display: "block" };
  const tabs = [
    { id: "info", label: "Info" },
    { id: "features", label: `Features (${form.features.filter(f => f.trim()).length})` },
    { id: "screenshots", label: `Screenshots (${form.screenshots.length})` },
    { id: "pricing", label: `Pricing (${form.pricing.length})` },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9100, background: "rgba(4,12,24,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ width: "min(640px, 100vw)", background: C.bg, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", animation: "slideInRight 0.24s ease", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: C.heading, fontFamily: font, margin: 0 }}>{isEdit ? `Edit: ${product.name}` : "Add New Product"}</h2>
            <p style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, margin: "3px 0 0" }}>Changes apply immediately.</p>
          </div>
          <button type="button" onClick={onCancel} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ display: "flex", padding: "0 24px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{ padding: "12px 14px", background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? C.accent : "transparent"}`, color: tab === t.id ? C.accent : C.textMuted, fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.15s" }}>{t.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {tab === "info" && (
            <div style={{ display: "grid", gap: 18 }}>
              <div>
                <label style={lbl}>Product name *</label>
                <input style={{ ...inp, borderColor: errors.name ? C.rose : C.border }} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. CareCore HMS" />
                {errors.name && <p style={{ fontSize: 12, color: C.rose, fontFamily: font, marginTop: 3 }}>{errors.name}</p>}
              </div>
              <div>
                <label style={lbl}>Tag label</label>
                <input style={inp} value={form.tag} onChange={e => set("tag", e.target.value)} placeholder="e.g. FLAGSHIP PRODUCT, BETA, NEW" />
              </div>
              <div>
                <label style={lbl}>Headline *</label>
                <input style={{ ...inp, borderColor: errors.headline ? C.rose : C.border }} value={form.headline} onChange={e => set("headline", e.target.value)} placeholder="Short, powerful headline for the product card" />
                {errors.headline && <p style={{ fontSize: 12, color: C.rose, fontFamily: font, marginTop: 3 }}>{errors.headline}</p>}
              </div>
              <div>
                <label style={lbl}>Description *</label>
                <textarea style={{ ...inp, resize: "vertical" }} rows={3} value={form.desc} onChange={e => set("desc", e.target.value)} placeholder="1–2 sentences about what this product does" />
                {errors.desc && <p style={{ fontSize: 12, color: C.rose, fontFamily: font, marginTop: 3 }}>{errors.desc}</p>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>Status</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="live">Live</option>
                    <option value="beta">Beta</option>
                    <option value="coming-soon">Coming Soon</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>CTA links to</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={form.ctaAction} onChange={e => set("ctaAction", e.target.value)}>
                    <option value="products">Products page</option>
                    <option value="contact">Contact / Book Demo</option>
                    <option value="services">Services page</option>
                    <option value="work">Work / Portfolio</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>CTA button label</label>
                <input style={inp} value={form.ctaLabel} onChange={e => set("ctaLabel", e.target.value)} placeholder="e.g. Explore CareCore, Join Waitlist, Start a Build" />
              </div>
              <div>
                <label style={lbl}>Accent colour</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {PRODUCT_COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => set("color", c.value)} title={c.name} style={{ width: 34, height: 34, borderRadius: 9, background: c.value, border: "none", cursor: "pointer", boxShadow: form.color === c.value ? `0 0 0 3px ${C.bg}, 0 0 0 5px ${c.value}` : "none", transition: "box-shadow 0.18s" }} />
                  ))}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="color" value={form.color} onChange={e => set("color", e.target.value)} style={{ width: 34, height: 34, border: "none", borderRadius: 9, cursor: "pointer", padding: 0, background: "none" }} />
                    <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font }}>Custom</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <button type="button" onClick={() => set("published", !form.published)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: form.published ? C.mint : C.border, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                    <span style={{ position: "absolute", top: 3, left: form.published ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: C.white, transition: "left 0.2s" }} />
                  </button>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text, fontFamily: font }}>{form.published ? "Published" : "Hidden"}</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <button type="button" onClick={() => set("primary", !form.primary)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: form.primary ? C.accent : C.border, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                    <span style={{ position: "absolute", top: 3, left: form.primary ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: C.white, transition: "left 0.2s" }} />
                  </button>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text, fontFamily: font }}>Primary product</span>
                </label>
              </div>
            </div>
          )}
          {tab === "features" && (
            <div>
              <p style={{ fontSize: 13.5, color: C.textMuted, fontFamily: font, marginBottom: 20 }}>Key selling points shown on the product card. Use arrows to reorder.</p>
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                {form.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button type="button" onClick={() => moveFeature(i, -1)} disabled={i === 0} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, width: 22, height: 20, cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>▲</button>
                      <button type="button" onClick={() => moveFeature(i, 1)} disabled={i === form.features.length - 1} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, width: 22, height: 20, cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>▼</button>
                    </div>
                    <input style={{ ...inp, flex: 1 }} value={f} onChange={e => setFeature(i, e.target.value)} placeholder={`Feature ${i + 1}`} />
                    <button type="button" onClick={() => removeFeature(i)} style={{ background: C.roseDim, border: `1px solid ${C.rose}22`, borderRadius: 8, color: C.rose, width: 34, height: 34, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addFeature} style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, color: C.accent, borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>+ Add Feature</button>
            </div>
          )}
          {tab === "screenshots" && (
            <div>
              <p style={{ fontSize: 13.5, color: C.textMuted, fontFamily: font, marginBottom: 20 }}>Screenshots for the product gallery. Paste a URL or upload an image (max 2MB each).</p>
              {form.screenshots.length > 0 && (
                <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
                  {form.screenshots.map((s, i) => (
                    <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 80, height: 56, flexShrink: 0, background: C.surface, overflow: "hidden" }}>
                        <img src={s.url} alt={s.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading, fontFamily: font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || "Untitled"}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.desc || s.url}</div>
                      </div>
                      <button type="button" onClick={() => removeScreenshot(i)} style={{ marginRight: 12, background: C.roseDim, border: `1px solid ${C.rose}22`, borderRadius: 8, color: C.rose, width: 30, height: 30, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 14px" }}>Add Screenshot</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <label style={lbl}>Image URL or file upload</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input style={{ ...inp, flex: 1 }} value={ssUrl} onChange={e => { setSsUrl(e.target.value); setSsErr(""); }} placeholder="https://..." />
                      <label style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, padding: "0 14px", fontSize: 13, fontFamily: font, cursor: "pointer", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                        Upload <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
                      </label>
                    </div>
                    {ssErr && <p style={{ fontSize: 12, color: C.rose, fontFamily: font, marginTop: 4 }}>{ssErr}</p>}
                  </div>
                  <input style={inp} value={ssTitle} onChange={e => setSsTitle(e.target.value)} placeholder="Title (optional)" />
                  <input style={inp} value={ssDsc} onChange={e => setSsDsc(e.target.value)} placeholder="Short description (optional)" />
                  <button type="button" onClick={addScreenshot} style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, color: C.accent, borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>+ Add Screenshot</button>
                </div>
              </div>
            </div>
          )}
          {tab === "pricing" && (
            <div>
              <p style={{ fontSize: 13.5, color: C.textMuted, fontFamily: font, marginBottom: 20 }}>Add pricing tiers. Leave empty for custom / quote-based pricing.</p>
              {form.pricing.map((tier, i) => (
                <div key={tier.id || i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.heading, fontFamily: font, margin: 0 }}>Tier {i + 1}{tier.name ? `: ${tier.name}` : ""}</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => setPricing(i, "popular", !tier.popular)} style={{ fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer", borderRadius: 6, padding: "5px 10px", background: tier.popular ? C.accentDim : "rgba(255,255,255,0.05)", border: `1px solid ${tier.popular ? C.accent + "44" : C.border}`, color: tier.popular ? C.accent : C.textMuted }}>
                        {tier.popular ? "★ Most Popular" : "Mark Popular"}
                      </button>
                      <button type="button" onClick={() => removePricing(i)} style={{ background: C.roseDim, border: `1px solid ${C.rose}22`, borderRadius: 8, color: C.rose, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><label style={lbl}>Tier name</label><input style={inp} value={tier.name} onChange={e => setPricing(i, "name", e.target.value)} placeholder="e.g. Clinic" /></div>
                    <div><label style={lbl}>Size / subtitle</label><input style={inp} value={tier.beds} onChange={e => setPricing(i, "beds", e.target.value)} placeholder="e.g. 1–10 beds" /></div>
                    <div><label style={lbl}>Onboarding price</label><input style={inp} value={tier.onboard} onChange={e => setPricing(i, "onboard", e.target.value)} placeholder="₦350K – 500K" /></div>
                    <div><label style={lbl}>Monthly support</label><input style={inp} value={tier.monthly} onChange={e => setPricing(i, "monthly", e.target.value)} placeholder="₦30,000" /></div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addPricing} style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, color: C.accent, borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>+ Add Pricing Tier</button>
              {!form.pricing.length && <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 10 }}>No tiers set — visitors will see a "Contact Us" CTA.</p>}
            </div>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={handleSave} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, color: C.bg, fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>{isEdit ? "Save Changes" : "Add Product"}</button>
          <button type="button" onClick={onCancel} style={{ padding: "13px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", color: C.text, fontSize: 14, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ADMIN — DASHBOARD
// ═══════════════════════════════════════
function AdminPanel({ products, addProduct, updateProduct, deleteProduct, resetToDefaults, importProducts, setCurrentPage }) {
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const handleSave = (data) => {
    if (editing === "new") { addProduct(data); showToast("Product added"); }
    else { updateProduct(editing.id, data); showToast("Changes saved"); }
    setEditing(null);
  };

  const handleDelete = () => {
    deleteProduct(confirmDelete.id);
    setConfirmDelete(null);
    showToast("Product deleted");
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orionsoft-products-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error("not array");
        importProducts(data);
        showToast("Products imported");
      } catch { showToast("Import failed — invalid file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const STATUS = {
    live: { label: "Live", color: C.mint, bg: C.mintDim },
    beta: { label: "Beta", color: C.amber, bg: C.amberDim },
    "coming-soon": { label: "Coming Soon", color: C.purple, bg: C.purpleDim },
  };

  const btnBase = {
    background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, padding: "7px 14px",
    fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 6,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(10,37,64,0.96)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, padding: "0 clamp(16px, 3vw, 32px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={() => setCurrentPage("home")} style={{ ...btnBase, padding: "6px 12px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back to site
            </button>
            <div style={{ width: 1, height: 18, background: C.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.mint, boxShadow: `0 0 8px ${C.mint}` }} />
              <span style={{ fontSize: 14.5, fontWeight: 700, color: C.heading, fontFamily: font }}>Product Manager</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {toast && (
              <div style={{ background: C.mintDim, border: `1px solid ${C.mint}33`, borderRadius: 8, color: C.mint, padding: "6px 12px", fontSize: 12.5, fontFamily: font, fontWeight: 700 }}>{toast}</div>
            )}
            <label style={{ ...btnBase, cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import
              <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
            </label>
            <button type="button" style={btnBase} onClick={handleExport}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            <button type="button" onClick={() => setEditing("new")} style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, border: "none", borderRadius: 8, color: C.bg, padding: "8px 16px", fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              + Add Product
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px clamp(16px, 3vw, 32px)" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Products</h1>
          <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>{products.length} product{products.length !== 1 ? "s" : ""} · {products.filter(p => p.published).length} published · {products.filter(p => !p.published).length} hidden</p>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: C.accentDim, border: `1px solid ${C.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 8 }}>No products yet</h2>
            <p style={{ fontSize: 14.5, color: C.textMuted, fontFamily: font, marginBottom: 24 }}>Add your first product to get started.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setEditing("new")} style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, border: "none", borderRadius: 10, color: C.bg, padding: "12px 20px", fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>+ Add Product</button>
              <button type="button" onClick={resetToDefaults} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: "12px 20px", fontSize: 14, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>Restore Defaults</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {products.map((p) => {
              const sc = STATUS[p.status] || STATUS.live;
              return (
                <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${p.color || C.accent}33`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: p.color || C.accent, flexShrink: 0, boxShadow: `0 0 6px ${p.color || C.accent}66` }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: C.heading, fontFamily: font }}>{p.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: font, padding: "3px 8px", borderRadius: 6, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      {!p.published && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: font, padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: C.textMuted }}>Hidden</span>}
                      {p.primary && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: font, padding: "3px 8px", borderRadius: 6, background: `${C.gold}18`, color: C.gold }}>Primary</span>}
                    </div>
                    <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, margin: 0, lineHeight: 1.4 }}>{(p.desc || "").slice(0, 88)}{(p.desc || "").length > 88 ? "…" : ""}</p>
                    <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
                      <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font }}>{p.features?.length || 0} features</span>
                      <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font }}>{p.screenshots?.length || 0} screenshots</span>
                      <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font }}>{p.pricing?.length || 0} pricing tiers</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => { updateProduct(p.id, { published: !p.published }); showToast(p.published ? "Product hidden" : "Product published"); }} style={{ background: p.published ? C.mintDim : "rgba(255,255,255,0.05)", border: `1px solid ${p.published ? C.mint + "33" : C.border}`, borderRadius: 8, color: p.published ? C.mint : C.textMuted, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                      {p.published ? "Published" : "Hidden"}
                    </button>
                    <button type="button" onClick={() => setEditing(p)} style={btnBase}>Edit</button>
                    <button type="button" onClick={() => setConfirmDelete(p)} style={{ background: C.roseDim, border: `1px solid ${C.rose}22`, borderRadius: 8, color: C.rose, padding: "7px 12px", fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {products.length > 0 && (
          <div style={{ marginTop: 40, padding: "18px 22px", border: `1px dashed ${C.border}`, borderRadius: 12, display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 3px" }}>Reset to defaults</p>
              <p style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, margin: 0 }}>Restore the original CareCore HMS and Custom Software products. This overwrites all changes.</p>
            </div>
            <button type="button" onClick={() => { if (window.confirm("Reset all products to defaults? This cannot be undone.")) { resetToDefaults(); showToast("Reset to defaults"); } }} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.textMuted, padding: "9px 16px", fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>Reset</button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9200, background: "rgba(4,12,24,0.9)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "32px 28px", maxWidth: 420, width: "100%", boxShadow: "0 24px 70px rgba(0,0,0,0.4)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: C.roseDim, border: `1px solid ${C.rose}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.rose} strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 8px" }}>Delete "{confirmDelete.name}"?</h2>
            <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.65, margin: "0 0 24px" }}>This permanently removes the product and cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={handleDelete} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "none", background: C.rose, color: C.white, fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>Delete</button>
              <button type="button" onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "13px", borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)", color: C.text, fontSize: 14, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <AdminProductForm
          product={editing === "new" ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ADMIN — GATE (AUTH WRAPPER)
// ═══════════════════════════════════════
function AdminGate({ products, addProduct, updateProduct, deleteProduct, resetToDefaults, importProducts, setCurrentPage }) {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_SESSION_KEY) === "yes"; }
    catch { return false; }
  });

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <AdminPanel
      products={products}
      addProduct={addProduct}
      updateProduct={updateProduct}
      deleteProduct={deleteProduct}
      resetToDefaults={resetToDefaults}
      importProducts={importProducts}
      setCurrentPage={setCurrentPage}
    />
  );
}

// ═══════════════════════════════════════
// PRODUCTS PAGE
// ═══════════════════════════════════════
function ProductsPage({ setCurrentPage, products }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const careCoreProduct = (products || []).find(p => p.id === "carecore-hms");
  const managedPricing = careCoreProduct?.pricing?.length ? careCoreProduct.pricing : null;
  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ padding: "120px clamp(16px, 4vw, 32px) 60px", background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal>
            <button type="button" onClick={() => setCurrentPage("home")} style={{ background: "none", border: "none", color: C.accent, fontSize: 14, fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.accent, fontFamily: font, letterSpacing: "0.1em" }}>PRODUCTS</span>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "12px 0 16px", lineHeight: 1.05 }}>
              Software built for real operations.
            </h1>
            <p style={{ fontSize: 17, color: C.text, fontFamily: font, lineHeight: 1.75, maxWidth: 600, margin: 0 }}>
              CareCore HMS is live and serving healthcare facilities. More products are in development — all built to the same standard.
            </p>
          </Reveal>
        </div>
      </div>
      <CareCoreSection />
      <CareCoreDemoSection setCurrentPage={setCurrentPage} />
      <Pricing setCurrentPage={setCurrentPage} tiers={managedPricing} />
      <SystemsShowcase setCurrentPage={setCurrentPage} />
      <CTABanner setCurrentPage={setCurrentPage} />
    </div>
  );
}

// ═══════════════════════════════════════
// SERVICES PAGE
// ═══════════════════════════════════════
function ServicesPage({ setCurrentPage }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  return (
    <div style={{ background: C.light, minHeight: "100vh" }}>
      <div style={{ padding: "120px clamp(16px, 4vw, 32px) 60px", background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 100%)` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal>
            <button type="button" onClick={() => setCurrentPage("home")} style={{ background: "none", border: "none", color: C.accent, fontSize: 14, fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.mint, fontFamily: font, letterSpacing: "0.1em" }}>SERVICES</span>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "12px 0 16px", lineHeight: 1.05 }}>
              What we can do for your organisation.
            </h1>
            <p style={{ fontSize: 17, color: C.text, fontFamily: font, lineHeight: 1.75, maxWidth: 600, margin: 0 }}>
              From full product builds to technical consulting — we have the expertise to solve real problems end-to-end.
            </p>
          </Reveal>
        </div>
      </div>
      <Services setCurrentPage={setCurrentPage} />
      <ProcessSection />
      <About />
      <CTABanner setCurrentPage={setCurrentPage} />
    </div>
  );
}

// ═══════════════════════════════════════
// FEATURED WORK (HOMEPAGE SECTION)
// ═══════════════════════════════════════
function FeaturedWork({ setCurrentPage, portfolio }) {
  const featured = (portfolio || [])
    .filter(p => p.featured && p.published !== false)
    .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0))
    .slice(0, 4);
  if (featured.length === 0) return null;

  return (
    <section style={{ padding: "88px clamp(16px, 4vw, 32px)", background: C.light }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 16 }}>
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.1em" }}>SELECTED WORK</span>
              <h2 style={{ fontSize: "clamp(26px, 3.8vw, 40px)", fontWeight: 800, fontFamily: font, color: C.lightHeading, letterSpacing: "-0.025em", margin: "10px 0 0", lineHeight: 1.12 }}>
                Projects we're proud of.
              </h2>
            </div>
            <button type="button" onClick={() => setCurrentPage("work")} style={{ background: "none", border: `1px solid ${C.lightBorder}`, color: C.lightText, borderRadius: 8, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>
              See all work →
            </button>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 20 }}>
          {featured.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.08}>
              <article style={{ background: C.lightCard, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.lightBorder}`, transition: "all 0.3s", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.10)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}>
                <div style={{ height: 160, background: C.surface, overflow: "hidden", position: "relative" }}>
                  {(item.coverImage || item.screenshots?.[0]?.url) ? (
                    <img src={item.coverImage || item.screenshots[0].url} alt={item.projectTitle} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${PORTFOLIO_INDUSTRY_COLORS[item.industry] || C.accent}22, transparent)`, fontSize: 40 }}>🖼️</div>
                  )}
                  <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
                    <span style={{ background: `${PORTFOLIO_INDUSTRY_COLORS[item.industry] || C.accent}EE`, color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 700, padding: "3px 8px" }}>{item.industry}</span>
                    <span style={{ background: `${PORTFOLIO_STATUS_COLORS[item.status] || "#8DA2B8"}EE`, color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 700, padding: "3px 8px" }}>{item.status}</span>
                  </div>
                </div>
                <div style={{ padding: "20px 22px 22px" }}>
                  {(item.clientLogoUrl || item.clientName) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      {item.clientLogoUrl && <img src={item.clientLogoUrl} alt={item.clientName} style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4 }} />}
                      {item.clientName && <span style={{ fontSize: 12.5, color: C.lightMuted, fontFamily: font, fontWeight: 600 }}>{item.clientName}</span>}
                      {item.year && <span style={{ fontSize: 11.5, color: C.lightMuted, fontFamily: font, marginLeft: "auto" }}>{item.year}</span>}
                    </div>
                  )}
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: C.lightHeading, fontFamily: font, letterSpacing: "-0.01em", margin: "0 0 6px", lineHeight: 1.25 }}>{item.projectTitle}</h3>
                  {item.tagline && <p style={{ fontSize: 13.5, color: C.lightMuted, fontFamily: font, margin: "0 0 10px", fontStyle: "italic" }}>{item.tagline}</p>}
                  {item.description && <p style={{ fontSize: 13.5, color: C.lightText, fontFamily: font, lineHeight: 1.65, margin: "0 0 14px" }}>{item.description.slice(0, 120)}{item.description.length > 120 ? "…" : ""}</p>}
                  {(item.tags || []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {item.tags.slice(0, 4).map(tag => (
                        <span key={tag} style={{ fontSize: 11.5, color: C.lightMuted, background: C.lightBorder, borderRadius: 4, padding: "3px 8px", fontFamily: font }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// WORK PAGE
// ═══════════════════════════════════════
function WorkPage({ setCurrentPage, portfolio }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const [activeIndustry, setActiveIndustry] = useState("All");

  const published = (portfolio || []).filter(p => p.published !== false);
  const filtered = activeIndustry === "All" ? published : published.filter(p => p.industry === activeIndustry);

  const industriesWithItems = PORTFOLIO_INDUSTRIES.filter(ind => published.some(p => p.industry === ind));
  const filterOptions = ["All", ...industriesWithItems];

  const countFor = (ind) => ind === "All" ? published.length : published.filter(p => p.industry === ind).length;

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ padding: "120px clamp(16px, 4vw, 32px) 60px", background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal>
            <button type="button" onClick={() => setCurrentPage("home")} style={{ background: "none", border: "none", color: C.accent, fontSize: 14, fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.1em" }}>WORK</span>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "12px 0 16px", lineHeight: 1.05 }}>
              Software shipped for real clients.
            </h1>
            <p style={{ fontSize: 17, color: C.text, fontFamily: font, lineHeight: 1.75, maxWidth: 600, margin: 0 }}>
              From hospital systems to custom business tools — every project is built to production standard, delivered with training, and supported after launch.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Portfolio grid */}
      <section style={{ padding: "60px clamp(16px, 4vw, 32px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* Industry filter — only shown when there are projects */}
          {filterOptions.length > 1 && (
            <Reveal>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 40, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                {filterOptions.map(ind => (
                  <button key={ind} type="button" onClick={() => setActiveIndustry(ind)} style={{
                    background: activeIndustry === ind ? `${PORTFOLIO_INDUSTRY_COLORS[ind] || C.accent}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${activeIndustry === ind ? (PORTFOLIO_INDUSTRY_COLORS[ind] || C.accent) + "55" : C.border}`,
                    color: activeIndustry === ind ? (PORTFOLIO_INDUSTRY_COLORS[ind] || C.accent) : C.textMuted,
                    borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600,
                    display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                  }}>
                    {ind}
                    <span style={{ fontSize: 11, background: activeIndustry === ind ? `${PORTFOLIO_INDUSTRY_COLORS[ind] || C.accent}28` : "rgba(255,255,255,0.08)", borderRadius: 10, padding: "1px 7px", fontWeight: 800 }}>{countFor(ind)}</span>
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          {/* Empty states */}
          {filtered.length === 0 && published.length === 0 && (
            <Reveal>
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 12 }}>No projects published yet</h3>
                <p style={{ fontSize: 15, color: C.textMuted, fontFamily: font, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 28px" }}>
                  Projects added in the admin dashboard will appear here once published.
                </p>
                <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, color: C.bg, border: "none", borderRadius: 10, padding: "13px 24px", fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                  Start a Project
                </button>
              </div>
            </Reveal>
          )}

          {filtered.length === 0 && published.length > 0 && (
            <Reveal>
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🔍</div>
                <p style={{ fontSize: 15, color: C.textMuted, fontFamily: font, marginBottom: 12 }}>No projects in this category.</p>
                <button type="button" onClick={() => setActiveIndustry("All")} style={{ background: "none", border: "none", color: C.accent, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Show all →</button>
              </div>
            </Reveal>
          )}

          {/* Project cards */}
          {filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 24 }}>
              {filtered.map((item, i) => (
                <Reveal key={item.id} delay={Math.min(i * 0.06, 0.3)}>
                  <article style={{ background: C.card, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", transition: "all 0.3s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${PORTFOLIO_INDUSTRY_COLORS[item.industry] || C.accent}55`; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 56px rgba(0,0,0,0.24)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    {/* Cover */}
                    <div style={{ height: 180, background: C.surface, overflow: "hidden", position: "relative", flexShrink: 0 }}>
                      {(item.coverImage || item.screenshots?.[0]?.url) ? (
                        <img src={item.coverImage || item.screenshots[0].url} alt={item.projectTitle} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${PORTFOLIO_INDUSTRY_COLORS[item.industry] || C.accent}18, transparent)` }}>
                          <span style={{ fontSize: 40, opacity: 0.5 }}>🖼️</span>
                        </div>
                      )}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(10,37,64,0.7))" }} />
                      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                        <span style={{ background: `${PORTFOLIO_INDUSTRY_COLORS[item.industry] || C.accent}EE`, color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 700, padding: "4px 9px" }}>{item.industry}</span>
                        <span style={{ background: `${PORTFOLIO_STATUS_COLORS[item.status] || "#8DA2B8"}EE`, color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 700, padding: "4px 9px" }}>{item.status}</span>
                      </div>
                      {item.featured && (
                        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(214,181,109,0.92)", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 800, padding: "4px 8px" }}>★ Featured</div>
                      )}
                    </div>
                    {/* Content */}
                    <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        {item.clientLogoUrl ? (
                          <img src={item.clientLogoUrl} alt={item.clientName} style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 5, background: "rgba(255,255,255,0.1)", padding: 2 }} />
                        ) : (
                          <div style={{ width: 26, height: 26, borderRadius: 5, background: `${PORTFOLIO_INDUSTRY_COLORS[item.industry] || C.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🏢</div>
                        )}
                        <span style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, fontWeight: 500 }}>{item.clientName || "Client"}</span>
                        {item.year && <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginLeft: "auto" }}>{item.year}</span>}
                      </div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.01em", margin: "0 0 6px", lineHeight: 1.25 }}>{item.projectTitle}</h3>
                      {item.tagline && <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, margin: "0 0 10px", fontStyle: "italic" }}>{item.tagline}</p>}
                      {item.description && <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.68, margin: "0 0 14px", flex: 1 }}>{item.description.slice(0, 150)}{item.description.length > 150 ? "…" : ""}</p>}
                      {(item.tags || []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: item.testimonial?.quote ? 14 : 0 }}>
                          {item.tags.slice(0, 5).map(tag => (
                            <span key={tag} style={{ fontSize: 11.5, color: C.textMuted, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontFamily: font }}>{tag}</span>
                          ))}
                        </div>
                      )}
                      {item.testimonial?.quote && (
                        <div style={{ marginTop: 12, borderLeft: `3px solid ${PORTFOLIO_INDUSTRY_COLORS[item.industry] || C.accent}`, paddingLeft: 12 }}>
                          <p style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.6, margin: "0 0 6px", fontStyle: "italic" }}>"{item.testimonial.quote.slice(0, 100)}{item.testimonial.quote.length > 100 ? "…" : ""}"</p>
                          {item.testimonial.name && <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font, fontWeight: 600 }}>— {item.testimonial.name}{item.testimonial.title ? `, ${item.testimonial.title}` : ""}</span>}
                        </div>
                      )}
                      {(item.screenshots || []).length > 1 && (
                        <div style={{ marginTop: 12, display: "flex", gap: 4, alignItems: "center" }}>
                          {item.screenshots.slice(0, 5).map((s) => (
                            <div key={s.id} style={{ width: 32, height: 22, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}`, flexShrink: 0 }}>
                              <img src={s.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                          {item.screenshots.length > 5 && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: font }}>+{item.screenshots.length - 5}</span>}
                        </div>
                      )}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}

          {/* CareCore screenshots strip — shown when portfolio is empty as a fallback */}
          {published.length === 0 && (
            <div style={{ marginTop: 60 }}>
              <Reveal>
                <div style={{ marginBottom: 32 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.1em" }}>CARECORE HMS — LIVE SCREENSHOTS</span>
                </div>
              </Reveal>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 500px), 1fr))", gap: 24 }}>
                {CARECORE_MEDIA.map((item, i) => (
                  <Reveal key={i} delay={i * 0.08}>
                    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`, background: C.card }}>
                      <img src={item.src} alt={item.title} loading="lazy" decoding="async" style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }} />
                      <div style={{ padding: "20px 24px 24px" }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 6px" }}>{item.title}</h3>
                        <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <ExperiencePreview setCurrentPage={setCurrentPage} />
      <TechImmersion setCurrentPage={setCurrentPage} />
      <CTABanner setCurrentPage={setCurrentPage} />
    </div>
  );
}

// ═══════════════════════════════════════
// PAGE LOADER (Suspense fallback)
// ═══════════════════════════════════════
function PageLoader({ label = "Loading…" }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <span style={{ color: C.textMuted, fontFamily: font, fontSize: 14 }}>{label}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// APP
// ═══════════════════════════════════════
export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [blogPostId, setBlogPostId] = useState(null);
  const { products, addProduct, updateProduct, deleteProduct, resetToDefaults, persist } = useProducts();
  const portfolio = usePortfolio();
  const cms = useCMSData();

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); setCurrentPage("admin"); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (currentPage === "admin") return;
    try {
      const key = "orionsoft_analytics_v1";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({ page: currentPage, ts: new Date().toISOString() });
      if (existing.length > 5000) existing.splice(0, existing.length - 5000);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }, [currentPage]);

  // Dynamic page titles from SEO settings
  useEffect(() => {
    const seoData = cms?.seo?.[currentPage];
    if (seoData?.title) { document.title = seoData.title; return; }
    const defaults = {
      home: "Orion Soft Limited — Hospital Management System & Custom Software Nigeria",
      products: "CareCore HMS — Products | Orion Soft Limited",
      services: "Services — Custom Software | Orion Soft Limited",
      work: "Our Work — Portfolio | Orion Soft Limited",
      contact: "Contact — Orion Soft Limited",
      careers: "Careers — Orion Soft Limited",
      blog: "Blog — Orion Soft Limited",
      team: "Team — Orion Soft Limited",
    };
    document.title = defaults[currentPage] || "Orion Soft Limited";
  }, [currentPage, cms]);

  const navSetPage = (page) => { setCurrentPage(page); setBlogPostId(null); window.scrollTo({ top: 0 }); };

  // Redirect /about to home and scroll to #about section
  useEffect(() => {
    if (currentPage === "about") {
      setCurrentPage("home");
      setTimeout(() => document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [currentPage]);

  return (
  <CMSContext.Provider value={cms}>
    <div style={{ overflowX: "hidden", background: C.bg, minHeight: "100vh" }}>
      {/* Global styles are in src/App.css */}

      {currentPage !== "admin" && <AnnouncementBar />}
      {currentPage !== "admin" && <a className="skip-link" href="#main-content">Skip to main content</a>}
      {currentPage !== "admin" && <Nav currentPage={currentPage} setCurrentPage={navSetPage} />}

      <main id="main-content" tabIndex={-1}>
        {currentPage === "home" && (
          <>
            <Hero setCurrentPage={navSetPage} />
            <StatsBar />
            <TrustSection portfolio={portfolio} />
            <ProductHighlights setCurrentPage={navSetPage} products={products} />
            <WhyUs />
            <FeaturedWork setCurrentPage={navSetPage} portfolio={portfolio} />
            <SocialProof setCurrentPage={navSetPage} />
            <FAQSection setCurrentPage={navSetPage} />
            <CTABanner setCurrentPage={navSetPage} />
          </>
        )}

        {currentPage === "products" && (
          <ProductsPage setCurrentPage={navSetPage} products={products} />
        )}

        {currentPage === "services" && (
          <ServicesPage setCurrentPage={navSetPage} />
        )}

        {currentPage === "work" && (
          <WorkPage setCurrentPage={navSetPage} portfolio={portfolio} />
        )}

        {currentPage === "contact" && (
          <ContactPage setCurrentPage={navSetPage} />
        )}

        {currentPage === "careers" && (
          <CareersPage setCurrentPage={navSetPage} />
        )}

        {currentPage === "privacy" && (
          <LegalPage type="privacy" setCurrentPage={navSetPage} />
        )}

        {currentPage === "terms" && (
          <LegalPage type="terms" setCurrentPage={navSetPage} />
        )}

        {currentPage === "case-studies" && (
          <Suspense fallback={<PageLoader />}>
            <CaseStudiesPage setCurrentPage={navSetPage} />
          </Suspense>
        )}

        {currentPage === "security" && (
          <Suspense fallback={<PageLoader />}>
            <SecurityPage setCurrentPage={navSetPage} />
          </Suspense>
        )}

        {currentPage === "support" && (
          <Suspense fallback={<PageLoader />}>
            <SupportPage setCurrentPage={navSetPage} />
          </Suspense>
        )}

        {currentPage === "partners" && (
          <Suspense fallback={<PageLoader />}>
            <PartnersPage setCurrentPage={navSetPage} />
          </Suspense>
        )}

        {currentPage === "tech" && (
          <Suspense fallback={<PageLoader />}>
            <TechStackPage setCurrentPage={navSetPage} />
          </Suspense>
        )}

        {currentPage === "blog" && (
          <BlogPage setCurrentPage={navSetPage} postId={blogPostId} setPostId={setBlogPostId} />
        )}

        {currentPage === "team" && (
          <TeamPage setCurrentPage={navSetPage} />
        )}

        {currentPage === "admin" && (
          <Suspense fallback={<PageLoader label="Loading admin…" />}>
            <AdminDashboard />
          </Suspense>
        )}
      </main>

      {currentPage !== "admin" && <Footer setCurrentPage={navSetPage} />}
      {currentPage !== "admin" && (HAS_TAWK_LIVE_CHAT ? <TawkLiveChat /> : <LiveChatFloat setCurrentPage={navSetPage} />)}
    </div>
  </CMSContext.Provider>
  );
}
