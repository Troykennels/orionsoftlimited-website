import { useState, useEffect, useRef } from "react";

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
const COMPANY_PHONE = "08165556805";
const COMPANY_RC = "9535128";
const FORM_ENDPOINT = import.meta.env.VITE_ORIONSOFT_FORM_ENDPOINT || "";
const BUILT_IN_FORM_ENDPOINT = "/api/forms";
const TAWK_PROPERTY_ID = import.meta.env.VITE_TAWK_PROPERTY_ID || "";
const TAWK_WIDGET_ID = import.meta.env.VITE_TAWK_WIDGET_ID || "";
const HAS_TAWK_LIVE_CHAT = Boolean(TAWK_PROPERTY_ID && TAWK_WIDGET_ID);
const HERO_WORDS = ["Hospitals", "Clinics", "Businesses", "Teams"];
const CAREER_ROLES = [
  {
    title: "Health Liaison Officer",
    type: "Healthcare Growth",
    location: "Lagos",
    color: C.accent,
    desc: "Build trusted relationships with hospitals and clinics, demo CareCore HMS, support onboarding, and translate healthcare workflow needs for the Orion Soft team.",
    requirements: [
      "Healthcare background such as nursing, midwifery, public health, or clinical administration",
      "Valid professional license or healthcare work experience is an advantage",
      "Strong communication and presentation skills",
      "Comfortable using smartphones and computers",
      "Willingness to travel within Lagos and environs",
    ],
    compensation: "NGN 25K-30K base + NGN 10K transport + NGN 5K data + NGN 30K-50K commission per onboarding",
  },
  {
    title: "Business Development Officer (Marketing)",
    type: "Sales",
    location: "Lagos",
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
    location: "Lagos / Remote",
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
    location: "Lagos / Remote",
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
      transform: inView ? "translateY(0)" : "translateY(32px)",
      transition: `all 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      ...style,
    }}>{children}</div>
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

  const links = [
    { label: "Home", page: "home" },
    { label: "Products", page: "home", anchor: "#products" },
    { label: "Systems", page: "home", anchor: "#systems" },
    { label: "Standards", page: "home", anchor: "#standards" },
    { label: "Trust", page: "home", anchor: "#trust" },
    { label: "Services", page: "home", anchor: "#services" },
    { label: "Pricing", page: "home", anchor: "#pricing" },
    { label: "About", page: "home", anchor: "#about" },
    { label: "Careers", page: "careers" },
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
      background: scrolled ? "rgba(10,37,64,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(24px) saturate(1.2)" : "none",
      borderBottom: scrolled ? `1px solid ${C.border}` : "none",
      transition: "all 0.35s ease", padding: "0 clamp(16px, 4vw, 32px)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 68 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
             onClick={() => { setCurrentPage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <OrionLogo size={32} gradientId="nav-orion-logo" />
          <span style={{ fontSize: 19, fontWeight: 700, color: C.white, fontFamily: font, letterSpacing: "-0.03em" }}>
            Orion<span style={{ color: C.gold }}>Soft</span>
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
          background: "rgba(10,37,64,0.98)", backdropFilter: "blur(24px)",
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
  const dataSaver = useDataSaver();
  useEffect(() => {
    if (dataSaver) return;
    const t = setInterval(() => setWordIdx(i => (i + 1) % HERO_WORDS.length), 2800);
    return () => clearInterval(t);
  }, [dataSaver]);

  return (
    <section style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      background: `linear-gradient(135deg, ${C.bg} 0%, ${C.surface} 54%, #17365A 100%)`,
      position: "relative", overflow: "hidden",
      padding: "100px clamp(16px, 4vw, 32px) 80px",
    }}>
      {/* Mesh gradients */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.72,
        background: `radial-gradient(ellipse 680px 520px at 22% 24%, rgba(56,189,248,0.14), transparent),
                     radial-gradient(ellipse 520px 420px at 78% 68%, rgba(45,212,191,0.10), transparent),
                     radial-gradient(ellipse 760px 560px at 52% 52%, rgba(196,181,253,0.08), transparent)` }} />
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
                GLOBAL SOFTWARE COMPANY
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
              helping hospitals and growing teams run with more clarity, speed, and control.
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
              <a href="#trust" style={{
                border: `1px solid rgba(45,212,191,0.28)`, color: C.mint,
                padding: "15px 32px", borderRadius: 11, textDecoration: "none",
                fontSize: 15, fontWeight: 700, fontFamily: font,
                background: "rgba(45,212,191,0.06)", transition: "all 0.3s",
              }} onMouseEnter={e => { e.target.style.background = "rgba(45,212,191,0.12)"; }}
                 onMouseLeave={e => { e.target.style.background = "rgba(45,212,191,0.06)"; }}>
                See Trust Layer
              </a>
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
              { val: "25+", label: "Software Modules" },
              { val: "118", label: "API Endpoints" },
              { val: "99.5%", label: "Uptime SLA" },
              { val: "Secure", label: "Privacy-first" },
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
                  Let visitors feel the system before they book a demo.
                </h2>
                <p style={{ color: C.text, fontFamily: font, fontSize: 15.5, lineHeight: 1.75, margin: 0 }}>
                  Tap a view to see how Orion Soft thinks: not just websites, but practical operating systems for real teams.
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
                <button type="button" onClick={() => setCurrentPage("onboarding")} style={{
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
      desc: "A complete hospital management system with 25+ integrated modules — patient records, clinical decision support, triage, billing, lab, pharmacy, maternal health, ward management, analytics, and more.",
      features: ["Clinical Decision Support", "NEWS2 Early Warning", "Drug Interaction Checker", "Real-Time Analytics", "Multi-Facility Support", "Full Audit Trail"],
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
      desc: "We are building more products for growing businesses, including inventory management, school administration, and logistics platforms. Join the waitlist to be first in line.",
      features: ["Inventory & Supply Chain", "School Management System", "Logistics & Fleet", "Point of Sale", "HR & Payroll", "More Coming"],
      color: C.mint,
      icon: "🚀",
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
            subtitle="From healthcare management to custom enterprise software — we build systems that solve real problems for real businesses."
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
                  <span style={{ fontSize: 36 }}>{p.icon}</span>
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
    { icon: "💻", title: "Software Development", desc: "Full-stack web applications built with modern frameworks. From concept to deployment.", color: C.accent, price: "Custom quote" },
    { icon: "🏥", title: "CareCore Deployment", desc: "Complete hospital management system setup, configuration, training, and ongoing support.", color: C.mint, price: "Deployment quote" },
    { icon: "🔧", title: "System Integration", desc: "Connect your existing systems with custom APIs and automated data flows.", color: C.purple, price: "Scoped quote" },
    { icon: "📊", title: "Data & Analytics", desc: "Custom dashboards and reporting tools for real-time business intelligence.", color: C.amber, price: "Custom quote" },
    { icon: "🛡️", title: "IT Consulting", desc: "Technical strategy, architecture review, security audit, and digital transformation guidance.", color: C.rose, price: "Strategy quote" },
    { icon: "🎓", title: "Training & Support", desc: "Staff training, documentation, SLA-backed support, and ongoing system maintenance.", color: C.mint, price: "Support quote" },
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
            title="The Reassurance Buyers Look For"
            subtitle="Professional healthcare and business software sites make security, implementation, support, and reliability easy to verify before a conversation starts."
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
            tag="TECH EXPERIENCE"
            tagColor={C.gold}
            title="A Website That Feels Like the Product"
            subtitle="Visitors should understand that Orion Soft builds operational software, not ordinary brochure pages. The visual system now moves through healthcare, code, infrastructure, and business command."
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
            <button type="button" onClick={() => setCurrentPage("onboarding")} style={{
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
    { name: "Clinic", beds: "1-10 beds", onboard: "Starter quote", monthly: "Managed plan", color: C.mint, popular: false },
    { name: "Small Hospital", beds: "11-50 beds", onboard: "Growth quote", monthly: "Managed plan", color: C.accent, popular: true },
    { name: "Medium Hospital", beds: "51-150 beds", onboard: "Scale quote", monthly: "Managed plan", color: C.purple, popular: false },
    { name: "Large Hospital", beds: "150+ beds", onboard: "Enterprise quote", monthly: "Enterprise SLA", color: C.amber, popular: false },
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
    systemType: "", users: "", workflow: "", platform: "", integrations: "", priority: "",
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
      formType === "custom" && (!form.systemType || !form.projectDesc.trim()) ? "custom" :
      formType === "consult" && !form.service ? "service" :
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
    } catch (err) {
      window.location.href = buildFallbackMailto(`request: ${formType}`, form);
      setDelivery("email-draft");
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
          <button onClick={() => setCurrentPage("home")} style={{
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

            {/* Common bottom */}
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
// CTA BANNER
// ═══════════════════════════════════════
function CareersPage({ setCurrentPage }) {
  const [selectedRole, setSelectedRole] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState("");
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", location: "",
    role: CAREER_ROLES[0].title, experience: "", qualification: "",
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
    update("role", CAREER_ROLES[index].title);
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
      role: CAREER_ROLES[0].title, experience: "", qualification: "",
      availability: "", cvLink: "", portfolio: "", referral: "",
      whyOrion: "", website: "",
    });
  };

  const activeRole = CAREER_ROLES[selectedRole];
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
            <button onClick={resetForm} style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
              color: C.bg, padding: "14px 28px", borderRadius: 10, border: "none",
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
            }}>Apply for Another Role</button>
            <button onClick={() => setCurrentPage("home")} style={{
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
          <button onClick={() => setCurrentPage("home")} style={{
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
              {CAREER_ROLES.map((role, index) => (
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
                <div><label style={labelSt}>Phone *</label><input style={inputSt} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+234 801 000 0000" /></div>
                <div><label style={labelSt}>City / Region *</label><input style={inputSt} value={form.location} onChange={e => update("location", e.target.value)} placeholder="Lagos, Nigeria" /></div>
              </div>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelSt}>Role *</label>
                  <select style={{ ...inputSt, cursor: "pointer" }} value={form.role} onChange={e => {
                    const nextIndex = CAREER_ROLES.findIndex(role => role.title === e.target.value);
                    if (nextIndex >= 0) setSelectedRole(nextIndex);
                    update("role", e.target.value);
                  }}>
                    {CAREER_ROLES.map(role => <option key={role.title}>{role.title}</option>)}
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
            <button onClick={() => setCurrentPage("careers")} style={{
              border: `1px solid ${C.mint}44`, color: C.mint,
              padding: "14px 32px", borderRadius: 10, textDecoration: "none",
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
              background: `${C.mint}10`, transition: "all 0.3s",
            }}>View Careers</button>
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
    } catch (err) {
      window.location.href = buildFallbackMailto("visitor feedback", form);
      setDelivery("email-draft");
      setSubmitted(true);
      setError(err.message);
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
            {delivery === "email-draft"
              ? `The website could not send automatically, so an email draft has been opened for ${COMPANY_EMAIL}. Please send it so Orion Soft receives your feedback.`
              : "Thank you. Your report helps Orion Soft improve the website and product experience."}
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
            background: `linear-gradient(180deg, ${C.amber}12, rgba(19,47,76,0.98) 190px)`,
            borderRadius: 20,
            padding: "clamp(24px, 4vw, 40px)",
            border: `1px solid ${C.amber}40`,
            boxShadow: `0 24px 70px ${C.amber}0F`,
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
            <div style={{ border: `1px solid ${C.amber}33`, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 18, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: C.amber, fontFamily: font, marginBottom: 6 }}>WEBSITE FEEDBACK DESK</div>
              <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.65, margin: 0 }}>
                Use this form for bugs, broken pages, confusing content, product suggestions, and visitor experience reports.
              </p>
            </div>

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
            }}>{submitting ? "Sending..." : "Send Website Report"}</button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
// FOOTER
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
              <button type="button" onClick={() => { setCurrentPage("onboarding"); setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
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
          fontSize: 17,
          lineHeight: 1,
        }} aria-hidden="true">?</span>
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
            <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 1.7, maxWidth: 250 }}>
              Building practical software for healthcare providers and ambitious businesses. Registered in Nigeria. Privacy-aware.
            </p>
          </div>

          {[
            { title: "Products", links: [{ l: "CareCore HMS", a: "#products", onClick: goHomeAnchor("#products") }, { l: "Systems & Apps", a: "#systems", onClick: goHomeAnchor("#systems") }, { l: "Engineering Standard", a: "#standards", onClick: goHomeAnchor("#standards") }, { l: "Custom Software", a: "#services", onClick: goHomeAnchor("#services") }] },
            { title: "Company", links: [{ l: "About Us", a: "#about", onClick: goHomeAnchor("#about") }, { l: "Careers", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("careers"); } }, { l: "Feedback", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("feedback"); } }, { l: "Contact", a: "#", onClick: (e) => { e.preventDefault(); setCurrentPage("onboarding"); } }] },
            { title: "Contact", isContact: true },
          ].map((col, ci) => (
            <div key={ci}>
              <h4 style={{ fontSize: 12.5, fontWeight: 700, color: C.text, fontFamily: font, marginBottom: 14, letterSpacing: "0.06em" }}>{col.title}</h4>
              {col.isContact ? (
                <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 2 }}>
                  <a href={asPhoneLink(COMPANY_PHONE)} style={{ color: C.textMuted, textDecoration: "none" }}>{COMPANY_PHONE}</a><br />
                  <a href={`mailto:${COMPANY_EMAIL}`} style={{ color: C.textMuted, textDecoration: "none" }}>{COMPANY_EMAIL}</a><br />
                  <a href={asDirectMessageLink(COMPANY_PHONE)} target="_blank" rel="noreferrer" style={{ color: C.textMuted, textDecoration: "none" }}>Message Orion Soft</a><br />
                  Lagos, Nigeria
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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; min-width: 320px; }
        * { letter-spacing: 0 !important; }
        button, a, input, textarea, select { font: inherit; }
        select option { color: #0F172A; background: #FFFFFF; }
        button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: 3px solid ${C.accent};
          outline-offset: 3px;
        }
        ::selection { background: ${C.accent}33; color: ${C.white}; }
        input:focus, textarea:focus, select:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentDim}; }
        .skip-link {
          position: fixed;
          top: 12px;
          left: 12px;
          transform: translateY(-140%);
          z-index: 2000;
          background: ${C.white};
          color: ${C.bg};
          padding: 10px 14px;
          border-radius: 8px;
          font-family: ${font};
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 10px 30px rgba(0,0,0,0.22);
        }
        .skip-link:focus { transform: translateY(0); }
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
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-grid img { min-height: 360px !important; }
          .experience-grid { grid-template-columns: 1fr !important; }
          .tech-mosaic { grid-template-columns: 1fr !important; }
          .tech-mosaic > div, .tech-mosaic-wide { grid-column: auto !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .career-layout { grid-template-columns: 1fr !important; }
          .career-notes { grid-template-columns: 1fr !important; }
          .chat-label { display: none !important; }
        }
        @media (min-width: 769px) {
          .nav-burger { display: none !important; }
          .mobile-menu { display: none !important; }
        }
        @media (max-width: 560px) {
          section { padding-left: 18px !important; padding-right: 18px !important; }
          button, a { max-width: 100%; }
          input, textarea, select { font-size: 16px !important; }
          .live-chat { right: 16px !important; bottom: 16px !important; }
        }
      `}</style>

      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main id="main-content" tabIndex={-1}>
        {currentPage === "home" && (
          <>
            <Hero setCurrentPage={setCurrentPage} />
            <ExperiencePreview setCurrentPage={setCurrentPage} />
            <Products setCurrentPage={setCurrentPage} />
            <SystemsShowcase setCurrentPage={setCurrentPage} />
            <EngineeringStandards />
            <TrustSecurity />
            <TechImmersion setCurrentPage={setCurrentPage} />
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

        {currentPage === "careers" && (
          <CareersPage setCurrentPage={setCurrentPage} />
        )}

        {currentPage === "privacy" && (
          <LegalPage type="privacy" setCurrentPage={setCurrentPage} />
        )}

        {currentPage === "terms" && (
          <LegalPage type="terms" setCurrentPage={setCurrentPage} />
        )}
      </main>

      <Footer setCurrentPage={setCurrentPage} />
      {HAS_TAWK_LIVE_CHAT ? <TawkLiveChat /> : <LiveChatFloat setCurrentPage={setCurrentPage} />}
    </div>
  );
}
