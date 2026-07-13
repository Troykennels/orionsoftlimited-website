import { useState, useEffect, useRef } from "react";

const T = {
  bg:      "#FFFFFF",
  bgAlt:   "#F5F7FC",
  bgDark:  "#061828",
  bgMid:   "#0A1F35",
  bgDeep:  "#060F1A",
  gold:    "#C8A850",
  goldLt:  "#E8C96A",
  text:    "#1A2B3C",
  textLt:  "#4A5B6C",
  white:   "#FFFFFF",
  border:  "rgba(6,24,40,0.08)",
  borderW: "rgba(255,255,255,0.08)",
  muted:   "rgba(200,210,226,0.5)",
};
const font = "'Instrument Sans','DM Sans',system-ui,-apple-system,sans-serif";

function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: v ? 1 : 0,
      transform: v ? "translateY(0)" : "translateY(22px)",
      transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      ...style
    }}>
      {children}
    </div>
  );
}

const MILESTONES = [
  {
    year: "2022", quarter: "Q1",
    title: "Orion Soft Limited incorporated",
    body: "CAC registration number RC 9535128. The company was formed around a simple observation: Nigerian organisations, including hospitals, schools, and businesses, were either using spreadsheets or paying foreign vendors prices that made no sense for the local market. We decided to build something better.",
    color: "#4F8EF7",
  },
  {
    year: "2022", quarter: "Q2",
    title: "CareCore development begins",
    body: "We spent 14 months building CareCore before we showed it to a single client. We interviewed nurses, hospital administrators, billing officers, and pharmacists. We mapped workflows as they actually happened in Nigerian public and private hospitals, not as a textbook said they should happen. The difference was significant.",
    color: "#10B981",
  },
  {
    year: "2023", quarter: "Q3",
    title: "First CareCore deployment",
    body: "CareCore went live in its first hospital. The implementation took seven weeks. By the end of the third month, the hospital's billing accuracy had improved substantially and OPD paper records had been eliminated. That deployment gave us confidence that the product worked. It also taught us three things we went back and fixed.",
    color: "#C8A850",
  },
  {
    year: "2024", quarter: "Q1",
    title: "Product suite expansion",
    body: "ComplianceCore launched for financial institutions managing NDPR, CBN, and CAC obligations. InventoryCore moved into beta. The Directors' Portal, a board-level executive dashboard, was built in response to a specific request from a client who wanted consolidated KPIs across three separate Orion Soft systems.",
    color: "#8B5CF6",
  },
  {
    year: "2024", quarter: "Q4",
    title: "SchoolCore and HRCore released",
    body: "SchoolCore brought the same depth of thinking to Nigerian secondary schools that CareCore brought to hospitals: WAEC/NECO result formatting, fee collection that works offline, CBT exam infrastructure, and a parent communication portal that doesn't require parents to have a smartphone app. HRCore launched to handle payroll and PAYE compliance.",
    color: "#F43F5E",
  },
  {
    year: "2025", quarter: "Q2",
    title: "Ori AI integrated across products",
    body: "Our AI assistant, Ori, became available across CareCore, SchoolCore, and ComplianceCore. Ori answers questions about patient histories, generates compliance summaries, and flags anomalies in financial data. It runs on a low-latency inference stack and works on slow Nigerian internet connections, a design requirement from the beginning.",
    color: "#06B6D4",
  },
  {
    year: "2026", quarter: "Active",
    title: "TeleHealth and broader expansion",
    body: "TeleHealth is in active development: video consultations, digital prescriptions, and integration with CareCore for seamless handoff between remote and in-person care. We are also expanding our custom development service for organisations whose needs don't fit a packaged product.",
    color: "#F59E0B",
  },
];

const PARTNERS = [
  { name: "Amazon Web Services", category: "Cloud infrastructure", desc: "All cloud-hosted Orion Soft products run on AWS infrastructure. We use EC2, RDS, S3, and CloudFront for compute, database, storage, and edge delivery.", color: "#F59E0B" },
  { name: "Vercel", category: "Frontend deployment", desc: "CareCore AI, SchoolCore, and the Orion Soft website deploy through Vercel's global edge network. Zero-config deployments and instant rollbacks.", color: "#FFFFFF" },
  { name: "Upstash", category: "Serverless Redis", desc: "Real-time features in our products, including live dashboards, session management, and rate limiting, are powered by Upstash's serverless Redis. Works at scale without provisioning.", color: "#00E9A3" },
  { name: "Groq", category: "AI inference", desc: "The Ori AI assistant runs on Groq's inference infrastructure. We chose Groq specifically for its low latency. Ori responds in under a second even on constrained connections.", color: "#F43F5E" },
  { name: "OpenAI", category: "Language models", desc: "Document processing, clinical note extraction, and complex compliance summarisation use OpenAI's GPT models where Groq's available models are not the right fit.", color: "#10B981" },
  { name: "GitHub", category: "Version control and CI/CD", desc: "All code is versioned in GitHub with mandatory peer review before any merge. GitHub Actions runs our automated test suites on every push.", color: "#8B5CF6" },
];

const ROADMAP = [
  {
    period: "2025: Active development",
    color: "#4F8EF7",
    items: [
      { label: "TeleHealth beta", detail: "Video consultations, digital prescriptions, CareCore integration" },
      { label: "HRCore v2", detail: "Leave management, performance reviews, multi-payroll entity support" },
      { label: "InventoryCore barcode API", detail: "Mobile barcode scanning app for Android and iOS" },
      { label: "CareCore Lab module", detail: "Full laboratory information system integrated into CareCore" },
    ],
  },
  {
    period: "2026: Planned",
    color: "#C8A850",
    items: [
      { label: "FinanceCore GA", detail: "Full accounting, bank reconciliation, financial statements for Nigerian SMEs" },
      { label: "FleetCore v2", detail: "Driver behaviour analytics, maintenance scheduling, fuel management" },
      { label: "ComplianceCore for government", detail: "Expanded module set for MDAs and public sector compliance frameworks" },
      { label: "Orion Open API programme", detail: "Third-party integrations and partner developer access" },
    ],
  },
  {
    period: "2027: Strategic",
    color: "#10B981",
    items: [
      { label: "West African market entry", detail: "Ghana and Francophone West Africa localisation" },
      { label: "Partner certification programme", detail: "Certified implementation partners in each region" },
      { label: "Government sector platform", detail: "Purpose-built compliance and operational platform for federal and state agencies" },
      { label: "Orion AI platform", detail: "Standalone AI tools for Nigerian businesses not using Orion Soft products" },
    ],
  },
];

const PHILOSOPHY = [
  {
    num: "01", color: "#4F8EF7",
    principle: "We build for reality, not for demos.",
    body: "A demo can be made to look good in 30 minutes. A system that works in a 40-bed hospital during a busy OPD morning is a different thing entirely. We build for the second scenario. That means accounting for slow internet, staff who aren't technical, power cuts, and processes that don't match the textbook. Before any product goes to a client, it's been through our own stress tests, not just a QA checklist.",
  },
  {
    num: "02", color: "#C8A850",
    principle: "We stay for the long term.",
    body: "The fastest way to build a bad reputation in the Nigerian software market is to take the money, deploy the system, and disappear. We've seen it happen to clients who came to us for rescue implementations. Our engagements are structured for the five-year relationship: signed SLAs, quarterly reviews, named account contacts, and systems that get better over time because we're still paying attention.",
  },
  {
    num: "03", color: "#10B981",
    principle: "We say no to the wrong fit.",
    body: "Not every organisation is a good fit for what we build. If your requirement is fundamentally different from what our products do, we'll tell you that in the discovery call rather than trying to make something work that won't. We'd rather decline an engagement and recommend someone else than sign a contract and deliver a system that doesn't serve you. This has cost us revenue in the short term. It's also why our existing clients stay.",
  },
];

export default function CompanyPage({ setCurrentPage }) {
  return (
    <div style={{ background: T.bg }}>

      {/* ── OPENING STATEMENT — dark, centred, large ─────────────────── */}
      <section style={{
        background: T.bgDeep,
        padding: "120px clamp(20px,5vw,60px) 100px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize:"64px 64px", pointerEvents:"none" }} />
        <div style={{ maxWidth: 840, margin:"0 auto", position:"relative" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>ABOUT ORION SOFT</span>
          </Reveal>
          <Reveal delay={0.07}>
            <h1 style={{ fontSize:"clamp(28px,4.5vw,54px)", fontWeight:900, color:"#F2F6FF", fontFamily:font, lineHeight:1.12, letterSpacing:"-0.04em", margin:"18px 0 0" }}>
              We started because Nigerian organisations deserved better software than what was available to them.
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap:0, marginTop:56, border:`1px solid ${T.borderW}`, borderRadius:12 }}>
              {[["RC 9535128","CAC Registered"], ["Nigeria","Headquarters"], ["NDPR","Compliant"], ["7+","Products live"]].map(([val, label], i) => (
                <div key={label} style={{ padding:"20px 22px", borderRight: i < 3 ? `1px solid ${T.borderW}` : "none", textAlign:"center" }}>
                  <div style={{ fontSize:"clamp(16px,2vw,22px)", fontWeight:800, color:T.gold, fontFamily:font }}>{val}</div>
                  <div style={{ fontSize:11, color:T.muted, fontFamily:font, marginTop:4, letterSpacing:"0.06em" }}>{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MISSION / VISION ─────────────────────────────────────────── */}
      <section style={{ background: "#FFFFFF", padding: "80px clamp(20px,5vw,60px)" }}>
        <div className="company-mv-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start" }}>
          <Reveal>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.gold, fontFamily: font, letterSpacing: "0.12em" }}>OUR MISSION</span>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 800, color: "#0F172A", fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 20px", lineHeight: 1.2 }}>
                Why we exist.
              </h2>
              <p style={{ fontSize: 17, color: "#334155", fontFamily: font, lineHeight: 1.85, margin: 0 }}>
                We exist to build enterprise software that Nigerian organisations can own, operate, and grow on, without depending on foreign vendors or paying for features they will never use. Every Orion Soft product starts from a documented understanding of how Nigerian organisations actually work, not how a software specification imagines they should work.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="company-mv-right" style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 32 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#4A5B6C", fontFamily: font, letterSpacing: "0.12em" }}>OUR VISION</span>
              <blockquote style={{ margin: "16px 0 0", padding: 0, border: "none" }}>
                <p style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 700, color: "#0F172A", fontFamily: font, lineHeight: 1.55, fontStyle: "italic" }}>
                  "A future where every hospital, school, government agency, and business in Africa runs on software built with the same rigour as global enterprise tools, at prices that make sense for local markets."
                </p>
              </blockquote>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CORE VALUES ──────────────────────────────────────────────── */}
      <section style={{ background: "#F5F7FC", padding: "80px clamp(20px,5vw,60px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.gold, fontFamily: font, letterSpacing: "0.12em" }}>CORE VALUES</span>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 800, color: "#0F172A", fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0", lineHeight: 1.2 }}>
                What we hold ourselves to.
              </h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {[
              {
                title: "Reliability",
                color: "#4F8EF7",
                icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                body: "We measure success by uptime and client retention, not by demos given. Every system we deploy runs on monitored infrastructure with a contractual 99.5% uptime SLA. We have never had a production outage longer than four hours.",
              },
              {
                title: "Accountability",
                color: "#10B981",
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                body: "Every feature request, bug report, and support ticket is logged and assigned. We do not close tickets until clients confirm the issue is resolved. Our median response time for critical issues is under four hours.",
              },
              {
                title: "Local Context",
                color: "#C8A850",
                icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
                body: "Our products are built for Nigerian internet speeds, regulatory environments, and workflows. CBN compliance, NDPR obligations, WAEC result structures, and offline capability on 3G networks are native to our products, not patches applied after the fact.",
              },
              {
                title: "Transparency",
                color: "#8B5CF6",
                icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                body: "Clients receive complete project documentation, API references, and technical handover notes at deployment. Nothing is locked in a black box. You own your data and your system. Export them at any time in standard formats.",
              },
              {
                title: "Partnership",
                color: "#F59E0B",
                icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
                body: "We do not disappear after go-live. Staff training, post-launch support, and quarterly product reviews are included in every deployment. Our longest active client relationships have been running for over three years.",
              },
              {
                title: "Innovation",
                color: "#F43F5E",
                icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
                body: "We invest in AI tooling (Ori assistant), modern serverless infrastructure, and product research driven by the people who use our software daily. Features come from listening to clients, not from reading industry trend reports.",
              },
            ].map((v, i) => (
              <Reveal key={v.title} delay={Math.min(i * 0.05, 0.25)}>
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(6,24,40,0.08)",
                    borderRadius: 12,
                    padding: 28,
                    transition: "box-shadow 0.22s, transform 0.22s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(6,24,40,0.1)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = ""; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${v.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <svg width={20} height={20} fill="none" stroke={v.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d={v.icon} />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", fontFamily: font, margin: "0 0 10px", letterSpacing: "-0.01em" }}>{v.title}</h3>
                  <p style={{ fontSize: 14, color: "#334155", fontFamily: font, lineHeight: 1.75, margin: 0 }}>{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPANY STORY — narrative, two-column ────────────────────── */}
      <section style={{ background: T.bg, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display:"grid", gridTemplateColumns:"1fr 360px", gap:72, alignItems:"start" }} className="story-grid">
          <Reveal>
            <div>
              <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>OUR STORY</span>
              <h2 style={{ fontSize:"clamp(24px,3vw,36px)", fontWeight:800, color:T.text, fontFamily:font, letterSpacing:"-0.03em", margin:"14px 0 28px" }}>
                Why we built this company
              </h2>
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                <p style={{ fontSize:16, color:T.textLt, fontFamily:font, lineHeight:1.85, margin:0 }}>
                  Orion Soft Limited was incorporated in 2022, but the thinking behind it started earlier. Our founders had spent years building and maintaining software for organisations in Nigeria and kept running into the same problem: the systems available were either too generic to be useful or too expensive to be realistic.
                </p>
                <p style={{ fontSize:16, color:T.textLt, fontFamily:font, lineHeight:1.85, margin:0 }}>
                  A hospital looking for a proper HMS was quoted $40,000 upfront for a system built for American healthcare workflows. A secondary school trying to automate its result processing was handed a spreadsheet macro and told to manage. A logistics company running 80 trucks was keeping driver records in a WhatsApp group because the alternatives cost more than a junior staff salary per month.
                </p>
                <p style={{ fontSize:16, color:T.textLt, fontFamily:font, lineHeight:1.85, margin:0 }}>
                  We decided to build the systems ourselves, from scratch, in Nigeria, for the Nigerian context.
                </p>
                <blockquote style={{ margin:"8px 0", padding:"20px 24px", borderLeft:`3px solid ${T.gold}`, background:"rgba(200,168,80,0.04)" }}>
                  <p style={{ fontSize:17, color:T.text, fontFamily:font, lineHeight:1.75, margin:0, fontStyle:"italic", fontWeight:500 }}>
                    "CareCore was our first product. We spent 14 months building it before we showed it to a single client. We mapped workflows of real Nigerian hospitals, talked to nurses and doctors and billing officers, and built around what we found, not around what a specification document said should happen."
                  </p>
                </blockquote>
                <p style={{ fontSize:16, color:T.textLt, fontFamily:font, lineHeight:1.85, margin:0 }}>
                  That first CareCore deployment validated the approach. By month three, the hospital had eliminated OPD paper records. By month four, their billing reconciliation time had dropped by more than half. The system wasn't perfect. We went back and fixed three things we learned from that deployment. But it was clear we were building the right thing.
                </p>
                <p style={{ fontSize:16, color:T.textLt, fontFamily:font, lineHeight:1.85, margin:0 }}>
                  Since then, we've expanded across healthcare, education, finance, HR, compliance, inventory, fleet, and governance. Every product follows the same discipline: deep workflow research first, build second, client testing before go-live, and long-term support as standard, not an add-on.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div style={{ position:"sticky", top:100 }}>
              <div style={{ background:T.bgDark, border:`1px solid ${T.borderW}`, borderRadius:14, padding:"32px 28px", marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.1em", marginBottom:18 }}>COMPANY FACTS</div>
                {[
                  ["Company name", "Orion Soft Limited"],
                  ["RC number", "9535128"],
                  ["Headquarters", "Nigeria"],
                  ["Email", "orionsoftlimited@gmail.com"],
                  ["Compliance", "NDPR, CAC"],
                  ["Products", "9 products and growing"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${T.borderW}` }}>
                    <span style={{ fontSize:13, color:T.muted, fontFamily:font }}>{k}</span>
                    <span style={{ fontSize:13, color:"#F2F6FF", fontFamily:font, fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:"rgba(200,168,80,0.06)", border:`1px solid rgba(200,168,80,0.18)`, borderRadius:14, padding:"24px 28px" }}>
                <div style={{ fontSize:10, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.1em", marginBottom:12 }}>OUR MISSION</div>
                <p style={{ fontSize:15, color:T.text, fontFamily:font, lineHeight:1.7, margin:0, fontWeight:500 }}>
                  Build software that makes Nigerian organisations more efficient, more competitive, and more capable.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MILESTONES — alternating left/right editorial ─────────────── */}
      <section style={{ background: T.bgDark, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>COMPANY MILESTONES</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 64px", maxWidth:500 }}>
              How we got here
            </h2>
          </Reveal>

          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {MILESTONES.map((m, i) => (
              <Reveal key={`${m.year}-${m.title}`} delay={0.04}>
                <div style={{
                  display:"grid",
                  gridTemplateColumns: i % 2 === 0 ? "1fr 160px" : "160px 1fr",
                  gap:"0 48px",
                  padding:"44px 0",
                  borderBottom: i < MILESTONES.length - 1 ? `1px solid ${T.borderW}` : "none",
                  alignItems:"start",
                }}>
                  {i % 2 === 0 ? (
                    <>
                      <div>
                        <h3 style={{ fontSize:"clamp(16px,2vw,20px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, margin:"0 0 12px", letterSpacing:"-0.02em" }}>{m.title}</h3>
                        <p style={{ fontSize:15, color:"rgba(200,210,226,0.65)", fontFamily:font, lineHeight:1.8, margin:0 }}>{m.body}</p>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:900, color:m.color, fontFamily:font, letterSpacing:"-0.05em", lineHeight:1 }}>{m.year}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:m.color, fontFamily:font, opacity:0.6, marginTop:4 }}>{m.quarter}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:900, color:m.color, fontFamily:font, letterSpacing:"-0.05em", lineHeight:1 }}>{m.year}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:m.color, fontFamily:font, opacity:0.6, marginTop:4 }}>{m.quarter}</div>
                      </div>
                      <div>
                        <h3 style={{ fontSize:"clamp(16px,2vw,20px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, margin:"0 0 12px", letterSpacing:"-0.02em" }}>{m.title}</h3>
                        <p style={{ fontSize:15, color:"rgba(200,210,226,0.65)", fontFamily:font, lineHeight:1.8, margin:0 }}>{m.body}</p>
                      </div>
                    </>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY PARTNERS — 2-col descriptive grid ─────────────── */}
      <section style={{ background: T.bg, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>TECHNOLOGY PARTNERS</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:T.text, fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 14px" }}>
              What we build on
            </h2>
            <p style={{ fontSize:15, color:T.textLt, fontFamily:font, lineHeight:1.7, margin:"0 0 52px", maxWidth:520 }}>
              We don't use technology because it's trendy. We use it because it's the right tool for a specific job. Every partner below was chosen deliberately.
            </p>
          </Reveal>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap:1, border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
            {PARTNERS.map((p, i) => (
              <Reveal key={p.name} delay={Math.min(i * 0.05, 0.2)}>
                <div style={{
                  padding:"28px 28px",
                  borderRight: i % 2 === 0 ? `1px solid ${T.border}` : "none",
                  borderBottom: i < PARTNERS.length - 2 ? `1px solid ${T.border}` : "none",
                  background: i % 3 === 1 ? T.bgAlt : T.bg,
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:p.color === "#FFFFFF" ? T.gold : p.color }} />
                    <span style={{ fontSize:15, fontWeight:800, color:T.text, fontFamily:font }}>{p.name}</span>
                    <span style={{ fontSize:10.5, color:T.textLt, fontFamily:font, background:"rgba(6,24,40,0.05)", padding:"2px 8px", borderRadius:20 }}>{p.category}</span>
                  </div>
                  <p style={{ fontSize:14, color:T.textLt, fontFamily:font, lineHeight:1.65, margin:0 }}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROADMAP — year/quarter table format ──────────────────────── */}
      <section style={{ background: T.bgMid, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>FUTURE ROADMAP</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 14px" }}>
              What we're building next
            </h2>
            <p style={{ fontSize:15, color:T.muted, fontFamily:font, lineHeight:1.7, margin:"0 0 52px", maxWidth:520 }}>
              Roadmap items are confirmed work in progress or committed plans. We don't publish vaporware.
            </p>
          </Reveal>

          <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
            {ROADMAP.map((r) => (
              <Reveal key={r.period} delay={0.04}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
                    <div style={{ height:2, width:32, background:r.color, borderRadius:2 }} />
                    <span style={{ fontSize:13, fontWeight:700, color:r.color, fontFamily:font }}>{r.period}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap:1, border:`1px solid ${T.borderW}`, borderRadius:10, overflow:"hidden" }}>
                    {r.items.map((item, j) => (
                      <div key={item.label} style={{
                        padding:"20px 22px",
                        borderRight: j < r.items.length - 1 ? `1px solid ${T.borderW}` : "none",
                        background: j % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      }}>
                        <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:7 }}>
                          <div style={{ width:5, height:5, borderRadius:"50%", background:r.color, flexShrink:0, marginTop:7 }} />
                          <span style={{ fontSize:14, fontWeight:700, color:"#F2F6FF", fontFamily:font, lineHeight:1.4 }}>{item.label}</span>
                        </div>
                        <p style={{ fontSize:12.5, color:T.muted, fontFamily:font, lineHeight:1.6, margin:"0 0 0 13px" }}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY — 3 large numbered principles ─────────────────── */}
      <section style={{ background: T.bgAlt, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>OUR PHILOSOPHY</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:T.text, fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 56px", maxWidth:500 }}>
              Three things we believe about how this work should be done
            </h2>
          </Reveal>

          {PHILOSOPHY.map((p, i) => (
            <Reveal key={p.num} delay={0.05}>
              <div style={{
                display:"grid",
                gridTemplateColumns:"72px 1fr",
                gap:"0 36px",
                padding:"48px 0",
                borderTop:`1px solid ${T.border}`,
                alignItems:"start",
              }}>
                <div>
                  <div style={{ fontSize:"clamp(32px,4vw,52px)", fontWeight:900, color:`${p.color}25`, fontFamily:font, letterSpacing:"-0.06em", lineHeight:1 }}>{p.num}</div>
                </div>
                <div>
                  <h3 style={{ fontSize:"clamp(18px,2.5vw,24px)", fontWeight:800, color:T.text, fontFamily:font, margin:"0 0 18px", lineHeight:1.25, letterSpacing:"-0.025em" }}>{p.principle}</h3>
                  <p style={{ fontSize:16, color:T.textLt, fontFamily:font, lineHeight:1.85, margin:0 }}>{p.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ background: T.bgDeep, padding: "80px clamp(20px,4vw,40px)", borderTop:`1px solid rgba(255,255,255,0.05)` }}>
        <div style={{ maxWidth: 680, margin:"0 auto", textAlign:"center" }}>
          <Reveal>
            <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.03em", margin:"0 0 14px" }}>
              Work with people who stay.
            </h2>
            <p style={{ fontSize:16, color:"rgba(200,210,226,0.6)", fontFamily:font, lineHeight:1.7, margin:"0 0 36px" }}>
              Every engagement is built for the long term. We don't ghost clients after go-live, and we don't build systems we're not willing to maintain.
            </p>
            <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
              <button type="button" onClick={() => setCurrentPage("contact")}
                style={{ background:T.gold, border:"none", color:"#05070A", padding:"14px 32px", borderRadius:10, fontSize:15, fontWeight:900, fontFamily:font, cursor:"pointer", transition:"all 0.22s" }}
                onMouseEnter={e => { e.currentTarget.style.background=T.goldLt; e.currentTarget.style.transform="translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background=T.gold; e.currentTarget.style.transform=""; }}>
                Start a conversation
              </button>
              <button type="button" onClick={() => setCurrentPage("process")}
                style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(200,210,226,0.75)", padding:"14px 32px", borderRadius:10, fontSize:15, fontWeight:600, fontFamily:font, cursor:"pointer", transition:"all 0.22s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.3)"; e.currentTarget.style.color="#F2F6FF"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; e.currentTarget.style.color="rgba(200,210,226,0.75)"; }}>
                See how we work
              </button>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
