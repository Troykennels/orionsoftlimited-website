import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════
const C = {
  bg: "#050A12",
  surface: "#0B1221",
  card: "#0F1A2E",
  cardHover: "#132240",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(0,200,255,0.2)",
  white: "#FFFFFF",
  text: "#CBD5E1",
  textMuted: "#64748B",
  heading: "#F1F5F9",
  accent: "#00C8FF",
  accentDim: "rgba(0,200,255,0.12)",
  accentGlow: "rgba(0,200,255,0.25)",
  mint: "#34D399",
  mintDim: "rgba(52,211,153,0.12)",
  purple: "#A78BFA",
  purpleDim: "rgba(167,139,250,0.12)",
  amber: "#FBBF24",
  amberDim: "rgba(251,191,36,0.12)",
  rose: "#FB7185",
  roseDim: "rgba(251,113,133,0.12)",
  success: "#34D399",
  light: "#F8FAFC",
  lightCard: "#FFFFFF",
  lightBorder: "#E2E8F0",
  lightText: "#334155",
  lightMuted: "#94A3B8",
  lightHeading: "#0F172A",
};

const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";
const COMPANY_EMAIL = "orionsoftlimited@gmail.com";
const COMPANY_PHONE = "08165556805";
const FOUNDER_NAME = "Famojuro Mathew";
const COMPANY_RC = "9535128";
const FORM_ENDPOINT = import.meta.env.VITE_ORIONSOFT_FORM_ENDPOINT || "";
const BUILT_IN_FORM_ENDPOINT = "/api/forms";
const HERO_WORDS = ["Hospitals", "Clinics", "Businesses", "Teams"];

const formRows = (data) => Object.entries(data)
  .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n");

const asPhoneLink = (phone) => `tel:+234${phone.replace(/^0/, "").replace(/\D/g, "")}`;
const asWhatsAppLink = (phone) => `https://wa.me/234${phone.replace(/^0/, "").replace(/\D/g, "")}`;

function openMailFallback(type, payload) {
  const subject = encodeURIComponent(`Orion Soft website ${type}`);
  const body = encodeURIComponent(formRows(payload));
  window.location.href = `mailto:${COMPANY_EMAIL}?subject=${subject}&body=${body}`;
  return "email";
}

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

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Submission failed");
      return "sent";
    } catch {
      return openMailFallback(type, payload);
    }
  }

  return openMailFallback(type, payload);
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
      transform: inView ? "translateY(0)" : "translateY(32px)",
      transition: `all 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

function OrionLogo({ size = 32, gradientId = "orion-logo" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${gradientId}-space`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(18 15) rotate(45) scale(62)">
          <stop stopColor="#7DD3FC" />
          <stop offset="0.38" stopColor="#00C8FF" />
          <stop offset="0.68" stopColor="#A78BFA" />
          <stop offset="1" stopColor="#34D399" />
        </radialGradient>
        <linearGradient id={`${gradientId}-orbit`} x1="14" y1="18" x2="51" y2="47" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="0.5" stopColor="#BFEFFF" />
          <stop offset="1" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="17" fill="#050A12" />
      <rect x="6" y="6" width="52" height="52" rx="15" fill={`url(#${gradientId}-space)`} />
      <circle cx="46" cy="16" r="2.5" fill="#FBBF24" />
      <circle cx="18" cy="46" r="2" fill="#F8FAFC" opacity="0.9" />
      <circle cx="18" cy="18" r="1.4" fill="#F8FAFC" opacity="0.75" />
      <path d="M20 34C20 25.163 27.163 18 36 18C44.837 18 52 25.163 52 34C52 42.837 44.837 50 36 50" stroke={`url(#${gradientId}-orbit)`} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M14 37C20 29 31 24 47 22" stroke="#050A12" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
      <circle cx="34" cy="34" r="6" fill="#050A12" />
      <circle cx="34" cy="34" r="2.4" fill="#00C8FF" />
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

  const links = [
    { label: "Home", page: "home" },
    { label: "Products", page: "home", anchor: "#products" },
    { label: "Systems", page: "home", anchor: "#systems" },
    { label: "Standards", page: "home", anchor: "#standards" },
    { label: "Services", page: "home", anchor: "#services" },
    { label: "Pricing", page: "home", anchor: "#pricing" },
    { label: "About", page: "home", anchor: "#about" },
    { label: "Feedback", page: "feedback" },
  ];

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
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? "rgba(5,10,18,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(24px) saturate(1.2)" : "none",
      borderBottom: scrolled ? `1px solid ${C.border}` : "none",
      transition: "all 0.35s ease", padding: "0 clamp(16px, 4vw, 32px)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 68 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
             onClick={() => { setCurrentPage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <OrionLogo size={32} gradientId="nav-orion-logo" />
          <span style={{ fontSize: 19, fontWeight: 700, color: C.white, fontFamily: font, letterSpacing: "-0.03em" }}>
            Orion<span style={{ color: C.accent }}>Soft</span>
          </span>
        </div>

        <div className="nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {links.map(l => (
            <a key={l.label} href={l.anchor || "#"} onClick={(e) => navigate(l, e)} style={{
              color: C.textMuted, textDecoration: "none", fontSize: 13.5, fontWeight: 500,
              fontFamily: font, transition: "color 0.2s", letterSpacing: "0.01em",
            }} onMouseEnter={e => e.target.style.color = C.accent}
               onMouseLeave={e => e.target.style.color = C.textMuted}>{l.label}</a>
          ))}
          <button onClick={() => setCurrentPage("onboarding")} style={{
            background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
            color: C.bg, padding: "9px 22px", borderRadius: 8, border: "none",
            fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer",
            transition: "all 0.25s", boxShadow: `0 4px 16px ${C.accentGlow}`,
            letterSpacing: "0.01em",
          }} onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = `0 8px 24px ${C.accentGlow}`; }}
             onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = `0 4px 16px ${C.accentGlow}`; }}>
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
        <div className="mobile-menu" style={{
          position: "absolute", top: 68, left: 0, right: 0,
          background: "rgba(5,10,18,0.98)", backdropFilter: "blur(24px)",
          padding: "16px 24px 24px", borderBottom: `1px solid ${C.border}`,
        }}>
          {links.map(l => (
            <a key={l.label} href={l.anchor || "#"} onClick={(e) => navigate(l, e)} style={{
              display: "block", color: C.text, textDecoration: "none", fontSize: 15,
              fontFamily: font, padding: "12px 0", borderBottom: `1px solid ${C.border}`,
            }}>{l.label}</a>
          ))}
          <button onClick={() => { setCurrentPage("onboarding"); setMenuOpen(false); }} style={{
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
  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % HERO_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      background: C.bg, position: "relative", overflow: "hidden",
      padding: "100px clamp(16px, 4vw, 32px) 80px",
    }}>
      {/* Mesh gradients */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.5,
        background: `radial-gradient(ellipse 600px 500px at 25% 30%, rgba(0,200,255,0.06), transparent),
                     radial-gradient(ellipse 500px 400px at 75% 70%, rgba(52,211,153,0.04), transparent),
                     radial-gradient(ellipse 800px 600px at 50% 50%, rgba(167,139,250,0.03), transparent)` }} />
      {/* Grid */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.025,
        backgroundImage: `linear-gradient(${C.accent} 1px, transparent 1px), linear-gradient(90deg, ${C.accent} 1px, transparent 1px)`,
        backgroundSize: "64px 64px" }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 760 }}>
          <Reveal>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.accentDim, border: `1px solid rgba(0,200,255,0.15)`,
              borderRadius: 100, padding: "7px 18px", marginBottom: 28,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.mint, boxShadow: `0 0 8px ${C.mint}` }} />
              <span style={{ fontSize: 12.5, color: C.accent, fontFamily: font, fontWeight: 600, letterSpacing: "0.06em" }}>
                SOFTWARE COMPANY • LAGOS, NIGERIA
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
              <span key={wordIdx} style={{
                background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                display: "inline-block", transition: "opacity 0.3s",
              }}>{HERO_WORDS[wordIdx]}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p style={{
              fontSize: "clamp(16px, 1.8vw, 19px)", color: C.text, lineHeight: 1.75,
              fontFamily: font, maxWidth: 560, margin: "0 0 40px", fontWeight: 400,
            }}>
              Orion Soft Limited designs and deploys custom software solutions for healthcare,
              operations, and business management. Our flagship product, CareCore, is already
              transforming hospitals across Nigeria.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button onClick={() => setCurrentPage("onboarding")} style={{
                background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                color: C.bg, padding: "15px 32px", borderRadius: 11, border: "none",
                fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
                boxShadow: `0 8px 30px ${C.accentGlow}`, transition: "all 0.3s",
              }} onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 14px 40px ${C.accentGlow}`; }}
                 onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = `0 8px 30px ${C.accentGlow}`; }}>
                Get Started →
              </button>
              <a href="#products" style={{
                border: `1px solid rgba(0,200,255,0.25)`, color: C.accent,
                padding: "15px 32px", borderRadius: 11, textDecoration: "none",
                fontSize: 15, fontWeight: 600, fontFamily: font,
                background: "rgba(0,200,255,0.04)", transition: "all 0.3s",
              }} onMouseEnter={e => { e.target.style.background = "rgba(0,200,255,0.1)"; }}
                 onMouseLeave={e => { e.target.style.background = "rgba(0,200,255,0.04)"; }}>
                Our Products
              </a>
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
              { val: "25+", label: "Software Modules" },
              { val: "118", label: "API Endpoints" },
              { val: "99.5%", label: "Uptime SLA" },
              { val: "NDPA", label: "Compliant" },
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

// ═══════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════
function Products({ setCurrentPage }) {
  const products = [
    {
      name: "CareCore HMS",
      tag: "FLAGSHIP",
      tagColor: C.accent,
      desc: "A complete hospital management system with 25+ integrated modules — patient records, AI diagnosis, triage, billing, lab, pharmacy, maternal health, ward management, analytics, and more.",
      features: ["AI-Assisted Diagnosis", "NEWS2 Early Warning", "Drug Interaction Checker", "Real-Time Analytics", "Multi-Facility Support", "Full Audit Trail"],
      color: C.accent,
      icon: "🏥",
    },
    {
      name: "Custom Software",
      tag: "SERVICES",
      tagColor: C.purple,
      desc: "Need a bespoke system for your business? We design, build, and deploy custom web applications, APIs, dashboards, and internal tools tailored to your exact requirements.",
      features: ["Web Applications", "API Development", "Dashboards & Analytics", "Business Automation", "Mobile-Responsive", "Ongoing Support"],
      color: C.purple,
      icon: "⚙️",
    },
    {
      name: "Coming Soon",
      tag: "2026",
      tagColor: C.mint,
      desc: "We are building more products for Nigerian businesses — inventory management, school administration, and logistics platforms. Join the waitlist to be first in line.",
      features: ["Inventory & Supply Chain", "School Management System", "Logistics & Fleet", "Point of Sale", "HR & Payroll", "More Coming"],
      color: C.mint,
      icon: "🚀",
    },
  ];

  return (
    <section id="products" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.surface }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="PRODUCTS"
            tagColor={C.accent}
            title="What We Build"
            subtitle="From healthcare management to custom enterprise software — we build systems that solve real problems for real businesses."
            dark
          />
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 20, marginTop: 56 }}>
          {products.map((p, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div style={{
                background: C.card, borderRadius: 16, padding: "clamp(24px, 3vw, 36px)",
                border: `1px solid ${C.border}`, height: "100%",
                transition: "all 0.35s ease", cursor: "default",
                display: "flex", flexDirection: "column",
              }} onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${p.color}44`;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 20px 48px rgba(0,0,0,0.25)`;
              }} onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <span style={{ fontSize: 36 }}>{p.icon}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: p.tagColor,
                    fontFamily: font, letterSpacing: "0.08em",
                    background: `${p.tagColor}15`, padding: "5px 12px", borderRadius: 6,
                  }}>{p.tag}</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", marginBottom: 12 }}>{p.name}</h3>
                <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 24, flex: 1 }}>{p.desc}</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                  {p.features.map((f, fi) => (
                    <span key={fi} style={{
                      fontSize: 12.5, color: C.text, fontFamily: font, fontWeight: 500,
                      background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                      borderRadius: 6, padding: "6px 12px",
                    }}>{f}</span>
                  ))}
                </div>

                <button onClick={() => setCurrentPage("onboarding")} style={{
                  width: "100%", padding: "13px", borderRadius: 10, border: `1px solid ${p.color}33`,
                  background: `${p.color}10`, color: p.color, fontSize: 14, fontWeight: 700,
                  fontFamily: font, cursor: "pointer", transition: "all 0.25s",
                }} onMouseEnter={e => { e.target.style.background = `${p.color}22`; }}
                   onMouseLeave={e => { e.target.style.background = `${p.color}10`; }}>
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
function Services({ setCurrentPage }) {
  const services = [
    { icon: "💻", title: "Software Development", desc: "Full-stack web applications built with modern frameworks. From concept to deployment.", color: C.accent, price: "From ₦500,000" },
    { icon: "🏥", title: "CareCore Deployment", desc: "Complete hospital management system setup, configuration, training, and ongoing support.", color: C.mint, price: "From ₦350,000" },
    { icon: "🔧", title: "System Integration", desc: "Connect your existing systems with custom APIs and automated data flows.", color: C.purple, price: "From ₦300,000" },
    { icon: "📊", title: "Data & Analytics", desc: "Custom dashboards and reporting tools for real-time business intelligence.", color: C.amber, price: "From ₦250,000" },
    { icon: "🛡️", title: "IT Consulting", desc: "Technical strategy, architecture review, security audit, and digital transformation guidance.", color: C.rose, price: "From ₦150,000" },
    { icon: "🎓", title: "Training & Support", desc: "Staff training, documentation, SLA-backed support, and ongoing system maintenance.", color: C.mint, price: "From ₦100,000" },
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
              <div style={{
                background: C.card, borderRadius: 14, padding: 28,
                border: `1px solid ${C.border}`, transition: "all 0.3s", cursor: "pointer",
                display: "flex", gap: 18, alignItems: "flex-start",
              }} onClick={() => setCurrentPage("onboarding")}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = `${s.color}33`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: `${s.color}12`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 24,
                }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: font, margin: 0 }}>{s.title}</h3>
                    <span style={{ fontSize: 12, color: s.color, fontFamily: font, fontWeight: 600 }}>{s.price}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
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
            title="A Place for Every New Product"
            subtitle="As Orion Soft develops new systems, they can be added here so visitors always see what is available, in development, and coming next."
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
            <button onClick={() => setCurrentPage("onboarding")} style={{
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
      desc: "We design around least-privilege access, secure form handling, HTTPS deployments, staff permissions, data retention, and NDPA-aware workflows.",
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
            subtitle="Tech-aware visitors should see more than a nice page. Orion Soft presents the engineering discipline, security thinking, and delivery process behind every system."
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

function CareCoreSection() {
  const modules = [
    { cat: "Clinical", color: C.accent, items: ["Patient Registration & Records", "Triage with Color Coding", "Vitals & NEWS2 Score", "AI-Assisted Diagnosis", "Prescriptions & Drug Interactions", "Discharge Summaries", "Referral System", "AI Clinical Assistant", "Body Scan Mapper"] },
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🏥</span>
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
                  }} onMouseEnter={e => { e.target.style.background = `${m.color}18`; e.target.style.borderColor = `${m.color}33`; e.target.style.color = m.color; }}
                     onMouseLeave={e => { e.target.style.background = `${m.color}08`; e.target.style.borderColor = `${m.color}18`; e.target.style.color = C.text; }}>
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
function Pricing({ setCurrentPage }) {
  const tiers = [
    { name: "Clinic", beds: "1–10 beds", onboard: "₦350K – 500K", monthly: "₦30,000", color: C.mint, popular: false },
    { name: "Small Hospital", beds: "11–50 beds", onboard: "₦500K – 800K", monthly: "₦60,000", color: C.accent, popular: true },
    { name: "Medium Hospital", beds: "51–150 beds", onboard: "₦800K – 1.2M", monthly: "₦100,000", color: C.purple, popular: false },
    { name: "Large Hospital", beds: "150+ beds", onboard: "₦1.2M – 2M", monthly: "₦150–250K", color: C.amber, popular: false },
  ];

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
                  <span style={{ fontSize: 12.5, color: C.lightMuted, fontFamily: font, fontWeight: 500 }}>Monthly</span>
                  <div style={{ fontSize: 26, fontWeight: 800, color: t.color, fontFamily: font }}>{t.monthly}<span style={{ fontSize: 13, fontWeight: 500, color: C.lightMuted }}>/mo</span></div>
                </div>
                <div style={{ flex: 1 }}>
                  {["All 25+ modules included", "Role-based staff training", "30-day onsite support", "Monthly updates & patches"].map((f, fi) => (
                    <div key={fi} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ color: t.color, fontSize: 14, fontWeight: 700 }}>✓</span>
                      <span style={{ fontSize: 13.5, color: C.lightText, fontFamily: font }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setCurrentPage("onboarding")} style={{
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
            Need custom software instead? <span style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }} onClick={() => setCurrentPage("onboarding")}>Contact us for a custom quote →</span>
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
    <section id="about" style={{ padding: "120px clamp(16px, 4vw, 32px)", background: C.bg }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 48, alignItems: "center" }}>
          <Reveal>
            <div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.purple, fontFamily: font, letterSpacing: "0.08em" }}>ABOUT US</span>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, fontFamily: font, color: C.heading, letterSpacing: "-0.02em", margin: "12px 0 20px" }}>
                Built in Lagos.<br />Built for Africa.
              </h2>
              <p style={{ fontSize: 15.5, color: C.text, fontFamily: font, lineHeight: 1.75, marginBottom: 20 }}>
                Orion Soft Limited is a CAC-registered software company based in Lagos, Nigeria. We
                build practical, affordable technology for businesses that operate in the real
                conditions of the Nigerian market — intermittent connectivity, diverse staff
                technical literacy, and cost sensitivity.
              </p>
              <p style={{ fontSize: 15.5, color: C.text, fontFamily: font, lineHeight: 1.75, marginBottom: 28 }}>
                Our team combines deep technical expertise with on-the-ground understanding of how
                Nigerian businesses actually work. We do not build software in a vacuum — we visit
                your facility, understand your workflow, and build what you actually need.
              </p>

              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { val: "CAC", label: "Registered" },
                  { val: "NDPA", label: "Compliant" },
                  { val: "Lagos", label: "Based" },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: C.card, borderRadius: 12, padding: "16px 24px",
                    border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.accent, fontFamily: font }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div style={{
              background: C.card, borderRadius: 20, padding: 36,
              border: `1px solid ${C.border}`,
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 24, letterSpacing: "-0.01em" }}>Our Values</h3>
              {[
                { title: "Integrity", desc: "We are honest about what our software can and cannot do. No overselling." },
                { title: "Impact Over Activity", desc: "Success is measured by outcomes, not hours logged or meetings held." },
                { title: "Speed", desc: "We respond fast, fix fast, deploy fast. Startups cannot afford to be slow." },
                { title: "Respect for Users", desc: "We build for people who save lives and run businesses. Their time matters." },
                { title: "Founder / CEO", desc: `${FOUNDER_NAME} leads Orion Soft Limited with a focus on practical software for healthcare and growing businesses.` },
              ].map((v, i) => (
                <div key={i} style={{ marginBottom: i < 4 ? 20 : 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 4 }}>{v.title}</div>
                  <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
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
// ONBOARDING PAGE
// ═══════════════════════════════════════
function OnboardingPage({ setCurrentPage }) {
  const [formType, setFormType] = useState("carecore");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState("");
  const [form, setForm] = useState({
    name: "", org: "", email: "", phone: "", location: "",
    facilitySize: "", departments: "", currentSystem: "",
    projectDesc: "", budget: "", timeline: "", service: "",
    hearAbout: "", message: "", website: "",
  });

  const update = (k, v) => {
    setError("");
    setForm(f => ({ ...f, [k]: v }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const missingCommon = ["name", "org", "email", "phone", "location"].find(key => !form[key].trim());
    const missingSpecific =
      formType === "carecore" && !form.facilitySize ? "facilitySize" :
      formType === "custom" && !form.projectDesc.trim() ? "projectDesc" :
      "";

    if (missingCommon || missingSpecific) {
      setError("Please complete all required fields before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await sendWebsiteForm(`request: ${formType}`, form);
      setDelivery(result);
      setSubmitted(true);
    } catch {
      setError(`We could not send this automatically. Please email ${COMPANY_EMAIL} or try again.`);
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
            Thank you for reaching out to Orion Soft. Our team will review your submission and
            contact you within 24 hours to discuss next steps.
            {delivery === "email" ? ` Your email app was opened so the message can be sent to ${COMPANY_EMAIL}.` : ""}
          </p>
          <button onClick={() => { setCurrentPage("home"); setSubmitted(false); }} style={{
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

  return (
    <section style={{ minHeight: "100vh", background: C.bg, padding: "100px clamp(16px, 4vw, 32px) 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Reveal>
          <button onClick={() => setCurrentPage("home")} style={{
            background: "none", border: "none", color: C.accent, fontSize: 14,
            fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>← Back to Home</button>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Get Started with Orion Soft
          </h1>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 32 }}>
            Fill out the form below and our team will reach out within 24 hours.
          </p>
        </Reveal>

        {/* Form type tabs */}
        <Reveal delay={0.1}>
          <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
            {[
              { id: "carecore", label: "🏥 CareCore HMS", desc: "Hospital onboarding" },
              { id: "custom", label: "⚙️ Custom Software", desc: "Bespoke project" },
              { id: "consult", label: "💬 Consultation", desc: "General inquiry" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setFormType(tab.id)} style={{
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
            background: C.card, borderRadius: 20, padding: "clamp(24px, 4vw, 40px)",
            border: `1px solid ${C.border}`,
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
            {/* Common fields */}
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div><label style={labelSt}>Full Name *</label><input style={inputSt} value={form.name} onChange={e => update("name", e.target.value)} placeholder="Your full name" /></div>
              <div><label style={labelSt}>Organisation *</label><input style={inputSt} value={form.org} onChange={e => update("org", e.target.value)} placeholder="Facility or company name" /></div>
            </div>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div><label style={labelSt}>Email *</label><input type="email" style={inputSt} value={form.email} onChange={e => update("email", e.target.value)} placeholder="name@organisation.com" /></div>
              <div><label style={labelSt}>Phone Number *</label><input style={inputSt} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="080..." /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Location *</label>
              <input style={inputSt} value={form.location} onChange={e => update("location", e.target.value)} placeholder="City, State" />
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
                    <option>Spreadsheets (Excel/Google Sheets)</option>
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
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 16 }}>Project Details</h3>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>What do you need built? *</label>
                  <textarea style={{ ...inputSt, resize: "vertical" }} rows={4} value={form.projectDesc} onChange={e => update("projectDesc", e.target.value)} placeholder="Describe your project, the problem it should solve, and any specific features you need..." />
                </div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelSt}>Budget Range</label>
                    <select style={{ ...inputSt, cursor: "pointer" }} value={form.budget} onChange={e => update("budget", e.target.value)}>
                      <option value="">Select range</option>
                      <option>₦250K – ₦500K</option>
                      <option>₦500K – ₦1M</option>
                      <option>₦1M – ₦3M</option>
                      <option>₦3M – ₦5M</option>
                      <option>₦5M+</option>
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
                  <label style={labelSt}>Service of Interest</label>
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

            {/* Common bottom */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>How did you hear about us?</label>
              <select style={{ ...inputSt, cursor: "pointer" }} value={form.hearAbout} onChange={e => update("hearAbout", e.target.value)}>
                <option value="">Select</option>
                <option>Referral from another hospital</option>
                <option>Social media</option>
                <option>Google search</option>
                <option>Our sales team visited</option>
                <option>Word of mouth</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelSt}>Additional Message</label>
              <textarea style={{ ...inputSt, resize: "vertical" }} rows={3} value={form.message} onChange={e => update("message", e.target.value)} placeholder="Anything else you'd like us to know..." />
            </div>

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
            }} onMouseEnter={e => e.target.style.boxShadow = `0 12px 36px ${C.accentGlow}`}
               onMouseLeave={e => e.target.style.boxShadow = `0 8px 28px ${C.accentGlow}`}>
              {submitting ? "Sending..." : "Submit Request →"}
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
// CTA BANNER
// ═══════════════════════════════════════
function FAQSection({ setCurrentPage }) {
  const faqs = [
    {
      q: "Can Orion Soft deploy for small clinics as well as larger hospitals?",
      a: "Yes. CareCore pricing and onboarding are based on facility size, while the system keeps the same core modules so smaller teams do not feel locked out of important features.",
    },
    {
      q: "Will the website and systems work on mobile phones and tablets?",
      a: "Yes. The public website and the systems we build are designed responsively for phones, tablets, laptops, and desktop screens.",
    },
    {
      q: "How do project inquiries reach Orion Soft?",
      a: `The site uses Orion Soft's built-in submission endpoint when deployed. If that service is unavailable, it opens a prepared email to ${COMPANY_EMAIL} so requests can still be sent.`,
    },
    {
      q: "Can you build something outside healthcare?",
      a: "Yes. Healthcare is our flagship focus, but Orion Soft also builds dashboards, portals, inventory systems, school systems, integrations, and workflow tools for other businesses.",
    },
  ];

  return (
    <section style={{ padding: "100px clamp(16px, 4vw, 32px)", background: C.surface }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Reveal>
          <SectionHeader
            tag="QUESTIONS"
            tagColor={C.mint}
            title="Clear Answers Before You Contact Us"
            subtitle="A quick look at the practical things visitors usually want to confirm before starting a project."
            dark
          />
        </Reveal>

        <div style={{ display: "grid", gap: 12, marginTop: 48 }}>
          {faqs.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.06}>
              <div style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: "22px clamp(18px, 3vw, 28px)",
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 8 }}>{item.q}</h3>
                <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>{item.a}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.22}>
          <div style={{ textAlign: "center", marginTop: 34 }}>
            <button type="button" onClick={() => setCurrentPage("onboarding")} style={{
              background: `${C.accent}10`, border: `1px solid ${C.accent}33`,
              color: C.accent, padding: "13px 24px", borderRadius: 10,
              fontSize: 14, fontWeight: 800, fontFamily: font, cursor: "pointer",
            }}>Ask a Project Question</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CTABanner({ setCurrentPage }) {
  return (
    <section style={{
      padding: "80px clamp(16px, 4vw, 32px)",
      background: `linear-gradient(135deg, ${C.accent}12, ${C.mint}08)`,
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, fontFamily: font, color: C.heading, letterSpacing: "-0.02em", marginBottom: 12 }}>
            Ready to Build Something?
          </h2>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 28 }}>
            Whether it is CareCore for your hospital or a custom system for your business,
            we are ready to start the conversation.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setCurrentPage("onboarding")} style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
              color: C.bg, padding: "14px 32px", borderRadius: 10, border: "none",
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
              boxShadow: `0 8px 28px ${C.accentGlow}`, transition: "all 0.3s",
            }}>Start Your Project →</button>
            <a href="#products" style={{
              border: `1px solid ${C.accent}33`, color: C.accent,
              padding: "14px 32px", borderRadius: 10, textDecoration: "none",
              fontSize: 15, fontWeight: 600, fontFamily: font,
              background: `${C.accent}08`, transition: "all 0.3s",
            }}>View Products</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// FEEDBACK PAGE
// ═══════════════════════════════════════
function FeedbackPage({ setCurrentPage }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "Website feedback",
    pageVisited: "",
    rating: "5",
    message: "",
    website: "",
  });

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const update = (key, value) => {
    setError("");
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.message.trim()) {
      setError("Please write the feedback or report before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await sendWebsiteForm("visitor feedback", form);
      setDelivery(result);
      setSubmitted(true);
    } catch {
      setError(`We could not send this automatically. Please email ${COMPANY_EMAIL} or try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const inputSt = {
    width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.card, color: C.heading,
    fontSize: 14, fontFamily: font, outline: "none", transition: "border-color 0.2s",
  };
  const labelSt = { fontSize: 13, fontWeight: 600, color: C.text, fontFamily: font, marginBottom: 6, display: "block" };

  if (submitted) {
    return (
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "120px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: "0 auto 24px",
            background: `linear-gradient(135deg, ${C.accent}20, ${C.mint}20)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
          }}>✓</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 12 }}>Feedback Received</h2>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 32 }}>
            Thank you. Your report helps Orion Soft improve the website and product experience.
            {delivery === "email" ? ` Your email app was opened so the message can be sent to ${COMPANY_EMAIL}.` : ""}
          </p>
          <button onClick={() => { setCurrentPage("home"); setSubmitted(false); }} style={{
            background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
            color: C.bg, padding: "14px 32px", borderRadius: 10, border: "none",
            fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
          }}>Back to Home</button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ minHeight: "100vh", background: C.bg, padding: "100px clamp(16px, 4vw, 32px) 80px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Reveal>
          <button onClick={() => setCurrentPage("home")} style={{
            background: "none", border: "none", color: C.accent, fontSize: 14,
            fontFamily: font, cursor: "pointer", marginBottom: 24, fontWeight: 600,
          }}>← Back to Home</button>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Visitor Reports & Feedback
          </h1>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 32 }}>
            Visitors can report website issues, request improvements, or share product feedback here.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <form onSubmit={handleSubmit} style={{
            background: C.card, borderRadius: 20, padding: "clamp(24px, 4vw, 40px)",
            border: `1px solid ${C.border}`,
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
              <label style={labelSt}>Page or system involved</label>
              <input style={inputSt} value={form.pageVisited} onChange={e => update("pageVisited", e.target.value)} placeholder="e.g. Pricing, CareCore, Contact form" />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelSt}>Feedback / Report *</label>
              <textarea style={{ ...inputSt, resize: "vertical" }} rows={6} value={form.message} onChange={e => update("message", e.target.value)} placeholder="Tell us what happened, what you need, or what should be improved..." />
            </div>
            {error && <p style={{ fontSize: 13, color: C.rose, fontFamily: font, marginBottom: 14 }}>{error}</p>}
            <button type="submit" disabled={submitting} style={{
              width: "100%", padding: "15px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
              color: C.bg, fontSize: 15, fontWeight: 700, fontFamily: font,
              cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.75 : 1,
              boxShadow: `0 8px 28px ${C.accentGlow}`,
            }}>{submitting ? "Sending..." : "Send Feedback"}</button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════
function LegalPage({ type, setCurrentPage }) {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const intro = isPrivacy
    ? "This policy explains how Orion Soft Limited handles information submitted through this website."
    : "These terms explain how visitors may use the Orion Soft Limited website and request services.";
  const sections = isPrivacy ? [
    {
      h: "Information We Collect",
      p: "When you submit a project request or feedback, we collect the details you choose to provide, including your name, organisation, email, phone number, location, request category, and message.",
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
              <span style={{ fontSize: 17, fontWeight: 700, color: C.white, fontFamily: font }}>Orion<span style={{ color: C.accent }}>Soft</span></span>
            </div>
            <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 1.7, maxWidth: 250 }}>
              Building practical software for Nigerian businesses. Founded by {FOUNDER_NAME}. Registration details available on request. NDPA-aware.
            </p>
          </div>

          {[
            { title: "Products", links: [{ l: "CareCore HMS", a: "#products", onClick: goHomeAnchor("#products") }, { l: "Systems & Apps", a: "#systems", onClick: goHomeAnchor("#systems") }, { l: "Engineering Standard", a: "#standards", onClick: goHomeAnchor("#standards") }, { l: "Custom Software", a: "#services", onClick: goHomeAnchor("#services") }] },
            { title: "Company", links: [{ l: "About Us", a: "#about", onClick: goHomeAnchor("#about") }, { l: "Feedback", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("feedback"); } }, { l: "Contact", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("onboarding"); } }] },
            { title: "Contact", isContact: true },
          ].map((col, ci) => (
            <div key={ci}>
              <h4 style={{ fontSize: 12.5, fontWeight: 700, color: C.text, fontFamily: font, marginBottom: 14, letterSpacing: "0.06em" }}>{col.title}</h4>
              {col.isContact ? (
                <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 2 }}>
                  <a href={asPhoneLink(COMPANY_PHONE)} style={{ color: C.textMuted, textDecoration: "none" }}>{COMPANY_PHONE}</a><br />
                  <a href={`mailto:${COMPANY_EMAIL}`} style={{ color: C.textMuted, textDecoration: "none" }}>{COMPANY_EMAIL}</a><br />
                  <a href={asWhatsAppLink(COMPANY_PHONE)} target="_blank" rel="noreferrer" style={{ color: C.textMuted, textDecoration: "none" }}>WhatsApp Orion Soft</a><br />
                  Founder/CEO: {FOUNDER_NAME}<br />Lagos, Nigeria
                </div>
              ) : col.links.map((link, li) => (
                <a key={li} href={link.a} onClick={link.onClick} style={{
                  display: "block", color: C.textMuted, textDecoration: "none",
                  fontSize: 13, fontFamily: font, marginBottom: 8, transition: "color 0.2s",
                }} onMouseEnter={e => e.target.style.color = C.accent}
                   onMouseLeave={e => e.target.style.color = C.textMuted}>{link.l}</a>
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
            © 2026 Orion Soft Limited. All rights reserved. RC: {COMPANY_RC}
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            <button type="button" onClick={() => setCurrentPage("privacy")} style={{ background: "none", border: "none", color: C.textMuted, textDecoration: "none", fontSize: 12, fontFamily: font, cursor: "pointer" }}>Privacy Policy</button>
            <button type="button" onClick={() => setCurrentPage("terms")} style={{ background: "none", border: "none", color: C.textMuted, textDecoration: "none", fontSize: 12, fontFamily: font, cursor: "pointer" }}>Terms of Service</button>
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
// APP
// ═══════════════════════════════════════
export default function App() {
  const [currentPage, setCurrentPage] = useState("home");

  return (
    <div style={{ overflowX: "hidden", background: C.bg, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; min-width: 320px; }
        * { letter-spacing: 0 !important; }
        button, a, input, textarea, select { font: inherit; }
        button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: 3px solid ${C.accent};
          outline-offset: 3px;
        }
        ::selection { background: ${C.accent}33; color: ${C.white}; }
        input:focus, textarea:focus, select:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentDim}; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-burger { display: block !important; }
          .form-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .nav-burger { display: none !important; }
          .mobile-menu { display: none !important; }
        }
        @media (max-width: 560px) {
          section { padding-left: 18px !important; padding-right: 18px !important; }
          button, a { max-width: 100%; }
          input, textarea, select { font-size: 16px !important; }
        }
      `}</style>

      <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {currentPage === "home" && (
        <>
          <Hero setCurrentPage={setCurrentPage} />
          <Products setCurrentPage={setCurrentPage} />
          <SystemsShowcase setCurrentPage={setCurrentPage} />
          <EngineeringStandards />
          <Services setCurrentPage={setCurrentPage} />
          <CareCoreSection />
          <Pricing setCurrentPage={setCurrentPage} />
          <About />
          <FAQSection setCurrentPage={setCurrentPage} />
          <CTABanner setCurrentPage={setCurrentPage} />
        </>
      )}

      {currentPage === "onboarding" && (
        <OnboardingPage setCurrentPage={setCurrentPage} />
      )}

      {currentPage === "feedback" && (
        <FeedbackPage setCurrentPage={setCurrentPage} />
      )}

      {currentPage === "privacy" && (
        <LegalPage type="privacy" setCurrentPage={setCurrentPage} />
      )}

      {currentPage === "terms" && (
        <LegalPage type="terms" setCurrentPage={setCurrentPage} />
      )}

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
