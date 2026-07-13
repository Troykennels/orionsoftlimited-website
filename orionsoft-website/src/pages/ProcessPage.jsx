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

// ═══════════════════════════════════════════════════════════
// CUSTOMER JOURNEY — 5 stages, horizontal flow
// ═══════════════════════════════════════════════════════════
const JOURNEY = [
  {
    num: "01", color: "#4F8EF7", label: "FIRST CONTACT", title: "You reach out",
    time: "Day 1",
    activities: [
      "Fill the enquiry form or send a WhatsApp message",
      "We respond the same business day",
      "Brief 20-minute call to understand your situation",
      "No sales pitch, just questions",
    ],
  },
  {
    num: "02", color: "#10B981", label: "DISCOVERY", title: "We learn your operation",
    time: "Days 2–10",
    activities: [
      "60–90 minute session with your team leads",
      "We map every workflow the system will touch",
      "Site visit if the implementation warrants it",
      "Written scoping document delivered to you",
    ],
  },
  {
    num: "03", color: "#C8A850", label: "PROPOSAL", title: "We put it in writing",
    time: "Days 5–14",
    activities: [
      "Fixed-price proposal or phased engagement plan",
      "Clear scope, timeline, and what's excluded",
      "Pricing that doesn't change mid-project",
      "Contract signed, work begins on receipt of deposit",
    ],
  },
  {
    num: "04", color: "#8B5CF6", label: "IMPLEMENTATION", title: "We build and configure",
    time: "Weeks 2–14",
    activities: [
      "Your team joins at UAT before anything goes live",
      "Training scheduled three weeks before go-live",
      "We don't go live until you sign the acceptance form",
      "Supported launch day with our team on standby",
    ],
  },
  {
    num: "05", color: "#F43F5E", label: "CONTINUITY", title: "We stay",
    time: "Ongoing",
    activities: [
      "30-day hypercare: daily check-in calls",
      "SLA-backed issue resolution from day one",
      "Quarterly system review included in year one",
      "Named account contact, not a call centre",
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// PROJECT METHODOLOGY — 4 editorial rows
// ═══════════════════════════════════════════════════════════
const METHODOLOGY = [
  {
    num: "01", color: "#4F8EF7",
    title: "We start with your reality, not a template.",
    body: "Every new engagement begins with listening. Before we touch a single configuration, we spend time with the people who will actually use the system: nurses, admin staff, teachers, accountants. We document how work actually gets done, not how a process diagram says it should. The gap between those two things is where most software implementations fail.",
    aside: ["Discovery-first, always", "Site visits where needed", "Workflow documentation before any build work", "No off-the-shelf demo presentations"],
  },
  {
    num: "02", color: "#10B981",
    title: "We scope, then we fix the scope.",
    body: "Scope creep is the most common reason software projects run over budget and time. Before any work begins, we agree in writing on exactly what we are building, what we are not building, what success looks like, and what happens when a change request comes in. Our proposals are long on detail because ambiguity costs everyone money.",
    aside: ["Fixed-scope or phased plans: your choice", "Change request process defined upfront", "No surprises at invoicing", "Milestone sign-offs at every phase"],
  },
  {
    num: "03", color: "#C8A850",
    title: "Your team tests before anything goes live.",
    body: "We do not deploy systems that clients haven't seen in full. User Acceptance Testing is a real event: your team members run real scenarios against real data in a staging environment. We collect feedback, fix issues, and run a second round. Only when your lead signs the acceptance form does the system move to production. This process has saved clients from discovering problems on go-live day.",
    aside: ["Structured UAT against agreed scenarios", "Two rounds of fixes included", "Signed acceptance required before production", "Parallel-run option for high-stakes go-lives"],
  },
  {
    num: "04", color: "#F43F5E",
    title: "Training is a deliverable, not an afterthought.",
    body: "Most software vendors send a user manual and call it training. We run role-specific sessions: clinical staff get different training from finance staff, who get different training from management. Each session is hands-on, not a slide deck. We record sessions for staff who couldn't attend. A week after go-live, we check back to catch anything that didn't land the first time.",
    aside: ["Role-based training groups", "Hands-on sessions, not presentations", "Session recordings provided", "Post-go-live check-in scheduled"],
  },
];

// ═══════════════════════════════════════════════════════════
// IMPLEMENTATION TIMELINE
// ═══════════════════════════════════════════════════════════
const TIMELINE = [
  {
    period: "Weeks 1–2", phase: "Discovery & Requirements",
    color: "#4F8EF7",
    items: [
      "Two to three working sessions with your operational team",
      "Workflow documentation and gap analysis",
      "Data audit: what exists, what needs migrating",
      "Delivered: scoping document and confirmed timeline",
    ],
  },
  {
    period: "Weeks 2–4", phase: "Architecture & Design",
    color: "#10B981",
    items: [
      "System data model and integration requirements",
      "User roles and permission matrix",
      "Migration plan for existing records",
      "Delivered: technical specification signed off",
    ],
  },
  {
    period: "Weeks 4–12", phase: "Development & Configuration",
    color: "#C8A850",
    items: [
      "Module configuration and custom workflow build",
      "Integration with third-party systems where needed",
      "Three rounds of internal QA testing",
      "Delivered: staging environment ready for client",
    ],
  },
  {
    period: "Weeks 12–14", phase: "UAT & Staff Training",
    color: "#8B5CF6",
    items: [
      "Your team tests the system against real scenarios",
      "Role-based training sessions run on-site or remotely",
      "Revisions based on UAT feedback",
      "Delivered: signed acceptance form, trained staff",
    ],
  },
  {
    period: "Week 14", phase: "Go-Live",
    color: "#F43F5E",
    items: [
      "Supported launch day with our team on standby",
      "Data validation and performance monitoring",
      "Parallel run if the situation calls for it",
      "Delivered: live production system",
    ],
  },
  {
    period: "Week 15+", phase: "Hypercare & Support",
    color: "#06B6D4",
    items: [
      "Daily check-in calls for the first two weeks",
      "Issue resolution SLA active from day one",
      "Quarterly review call in year one",
      "Delivered: stable, supported, maintained system",
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// SUPPORT TIERS
// ═══════════════════════════════════════════════════════════
const SUPPORT = [
  {
    tier: "Standard",
    included: true,
    color: "#4F8EF7",
    desc: "Included with every deployment at no additional cost.",
    rows: [
      ["Response time", "Within 48 hours"],
      ["Hours of coverage", "Mon–Fri, 8am–6pm WAT"],
      ["Support channels", "Email and WhatsApp"],
      ["Monthly updates", "Yes"],
      ["System monitoring", "Basic uptime alerts"],
      ["Quarterly review", "No"],
      ["Named account contact", "No"],
    ],
  },
  {
    tier: "Professional",
    included: false,
    color: "#C8A850",
    desc: "For organisations that need faster responses and closer engagement.",
    rows: [
      ["Response time", "Within 8 hours"],
      ["Hours of coverage", "Mon–Sat, 7am–9pm WAT"],
      ["Support channels", "Email, WhatsApp, phone"],
      ["Monthly updates", "Yes"],
      ["System monitoring", "Full uptime + anomaly alerts"],
      ["Quarterly review", "Yes, video call with report"],
      ["Named account contact", "Yes"],
    ],
  },
  {
    tier: "Enterprise",
    included: false,
    color: "#10B981",
    desc: "For critical deployments where the system cannot go down.",
    rows: [
      ["Response time", "Within 4 hours, 24/7"],
      ["Hours of coverage", "24 hours, 7 days a week"],
      ["Support channels", "All channels + dedicated line"],
      ["Monthly updates", "Yes, with advance staging preview"],
      ["System monitoring", "Full + custom SLA dashboard"],
      ["Quarterly review", "Monthly, with escalation path"],
      ["Named account contact", "Dedicated team"],
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// SDLC PHASES
// ═══════════════════════════════════════════════════════════
const SDLC = [
  { phase: "Requirements", color: "#4F8EF7", desc: "We document what the system must do, what it must not do, and what happens at the edges. This is the contract between the product and the people using it." },
  { phase: "Architecture", color: "#10B981", desc: "Database design, API contracts, integration points, and infrastructure decisions. Getting this wrong costs ten times more to fix later than to get right now." },
  { phase: "Development", color: "#C8A850", desc: "Feature branches, peer code review, and daily internal testing. Nothing goes to staging until it passes the team's own bar." },
  { phase: "QA & Testing", color: "#8B5CF6", desc: "Functional, regression, load, and security testing before any client eyes see the system. Our QA round catches what development testing missed." },
  { phase: "Staging", color: "#F43F5E", desc: "A production-identical environment where the client's team runs user acceptance testing. Real data, real workflows, real problems found before go-live." },
  { phase: "Production", color: "#06B6D4", desc: "Blue-green deployment with rollback tested and ready. We don't go live on a Friday afternoon. We go live when the checklist is complete." },
  { phase: "Monitor & Iterate", color: "#F59E0B", desc: "Uptime monitoring, error tracking, and performance dashboards from day one. The first three months post-launch tell us where the system gets stressed under real usage." },
];

export default function ProcessPage({ setCurrentPage }) {
  return (
    <div style={{ background: T.bg }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{
        background: T.bgDeep,
        padding: "120px clamp(20px,5vw,60px) 90px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize:"64px 64px", pointerEvents:"none" }} />

        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <Reveal>
            <span style={{ display:"inline-block", fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em", background:"rgba(200,168,80,0.1)", border:"1px solid rgba(200,168,80,0.22)", padding:"6px 14px", borderRadius:30, marginBottom:24 }}>
              HOW WE WORK
            </span>
          </Reveal>
          <Reveal delay={0.07}>
            <h1 style={{ fontSize:"clamp(32px,5.5vw,64px)", fontWeight:900, color:"#F2F6FF", fontFamily:font, lineHeight:1.08, letterSpacing:"-0.04em", margin:"0 0 22px" }}>
              From first call to<br />
              <span style={{ background:`linear-gradient(135deg,${T.gold},${T.goldLt})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>production system</span>
            </h1>
          </Reveal>
          <Reveal delay={0.13}>
            <p style={{ fontSize:"clamp(15px,1.8vw,18px)", color:"rgba(200,210,226,0.7)", fontFamily:font, lineHeight:1.75, maxWidth:620, margin:"0 auto 52px" }}>
              We've delivered software across healthcare, education, finance, and operations. This page explains exactly how we work: what happens at each stage, how decisions get made, and what you can expect when you work with us.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display:"flex", gap:40, justifyContent:"center", flexWrap:"wrap" }}>
              {[["6–14 weeks","typical implementation"], ["30 days","hypercare post-launch"], ["100%","SLA-backed support"], ["48hrs","first-response guarantee"]].map(([stat, label]) => (
                <div key={label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:900, color:T.gold, fontFamily:font, letterSpacing:"-0.04em", lineHeight:1 }}>{stat}</div>
                  <div style={{ fontSize:12, color:T.muted, fontFamily:font, marginTop:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CUSTOMER JOURNEY ─────────────────────────────────────────── */}
      <section style={{ background: T.bg, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal>
            <div style={{ marginBottom: 56 }}>
              <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>CUSTOMER JOURNEY</span>
              <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:T.text, fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 0" }}>
                What it actually looks like to work with us
              </h2>
            </div>
          </Reveal>

          {/* Horizontal stage flow */}
          <div style={{ display:"flex", gap:0, overflowX:"auto", paddingBottom:8 }}>
            {JOURNEY.map((s, i) => (
              <div key={s.num} style={{ display:"flex", alignItems:"stretch", flex:"1 1 220px", minWidth:200 }}>
                <div style={{
                  flex:1,
                  background: i % 2 === 0 ? "#FAFBFD" : T.bg,
                  border:`1px solid ${T.border}`,
                  borderRight: i < JOURNEY.length - 1 ? "none" : `1px solid ${T.border}`,
                  padding:"28px 22px 28px",
                  position:"relative",
                }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:`${s.color}14`, border:`2px solid ${s.color}35`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                    <span style={{ fontSize:12, fontWeight:900, color:s.color, fontFamily:font }}>{s.num}</span>
                  </div>
                  <div style={{ fontSize:9.5, fontWeight:800, color:s.color, fontFamily:font, letterSpacing:"0.1em", marginBottom:5 }}>{s.label}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:T.text, fontFamily:font, marginBottom:4 }}>{s.title}</div>
                  <div style={{ fontSize:11.5, color:T.textLt, fontFamily:font, marginBottom:16, fontStyle:"italic" }}>{s.time}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                    {s.activities.map((a, j) => (
                      <div key={j} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:s.color, flexShrink:0, marginTop:6 }} />
                        <span style={{ fontSize:13, color:T.textLt, fontFamily:font, lineHeight:1.55 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {i < JOURNEY.length - 1 && (
                  <div style={{ width:28, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:T.bg }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textLt} strokeWidth="1.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Reveal>
            <p style={{ fontSize:13.5, color:T.textLt, fontFamily:font, marginTop:20, lineHeight:1.6, maxWidth:600 }}>
              Timeline varies by product and organisation size. A CareCore deployment for a 30-bed hospital typically completes in 10 weeks. A multi-branch hospital group with data migration from a legacy system takes 16–20 weeks.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── PROJECT METHODOLOGY — editorial alternating rows ──────────── */}
      <section style={{ background: T.bgDark, padding: "90px 0 100px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 clamp(20px,4vw,40px)" }}>
          <Reveal>
            <div style={{ marginBottom: 64 }}>
              <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>OUR METHODOLOGY</span>
              <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 0", maxWidth:580 }}>
                Four things we believe about how software should be built
              </h2>
            </div>
          </Reveal>
          {METHODOLOGY.map((m, i) => (
            <Reveal key={m.num} delay={0.05}>
              <div className="process-methodology-row" style={{
                display:"grid",
                gridTemplateColumns: i % 2 === 0 ? "1fr 340px" : "340px 1fr",
                gap:48,
                alignItems:"start",
                padding:"48px 0",
                borderTop: `1px solid ${T.borderW}`,
              }}>
                {i % 2 === 0 ? (
                  <>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
                        <span style={{ fontSize:13, fontWeight:900, color:m.color, fontFamily:font, opacity:0.6 }}>{m.num}</span>
                        <div style={{ height:1, flex:1, background:`${m.color}30` }} />
                      </div>
                      <h3 style={{ fontSize:"clamp(20px,2.5vw,26px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, lineHeight:1.25, letterSpacing:"-0.025em", margin:"0 0 18px" }}>{m.title}</h3>
                      <p style={{ fontSize:16, color:"rgba(200,210,226,0.7)", fontFamily:font, lineHeight:1.8, margin:0 }}>{m.body}</p>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${T.borderW}`, borderRadius:12, padding:"28px 26px" }}>
                      <div style={{ fontSize:10, fontWeight:800, color:m.color, fontFamily:font, letterSpacing:"0.1em", marginBottom:16 }}>IN PRACTICE</div>
                      {m.aside.map((a, j) => (
                        <div key={j} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop:3, flexShrink:0 }}><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize:14, color:"rgba(200,210,226,0.65)", fontFamily:font, lineHeight:1.55 }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${T.borderW}`, borderRadius:12, padding:"28px 26px" }}>
                      <div style={{ fontSize:10, fontWeight:800, color:m.color, fontFamily:font, letterSpacing:"0.1em", marginBottom:16 }}>IN PRACTICE</div>
                      {m.aside.map((a, j) => (
                        <div key={j} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop:3, flexShrink:0 }}><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize:14, color:"rgba(200,210,226,0.65)", fontFamily:font, lineHeight:1.55 }}>{a}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
                        <span style={{ fontSize:13, fontWeight:900, color:m.color, fontFamily:font, opacity:0.6 }}>{m.num}</span>
                        <div style={{ height:1, flex:1, background:`${m.color}30` }} />
                      </div>
                      <h3 style={{ fontSize:"clamp(20px,2.5vw,26px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, lineHeight:1.25, letterSpacing:"-0.025em", margin:"0 0 18px" }}>{m.title}</h3>
                      <p style={{ fontSize:16, color:"rgba(200,210,226,0.7)", fontFamily:font, lineHeight:1.8, margin:0 }}>{m.body}</p>
                    </div>
                  </>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── IMPLEMENTATION TIMELINE — vertical left-ruled ────────────── */}
      <section style={{ background: T.bgAlt, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>IMPLEMENTATION TIMELINE</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:T.text, fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 14px" }}>
              Week by week, from contract to go-live
            </h2>
            <p style={{ fontSize:15, color:T.textLt, fontFamily:font, lineHeight:1.7, margin:"0 0 56px", maxWidth:560 }}>
              These are realistic timelines based on completed deployments. Simpler configurations move faster. Data migrations and multi-branch setups take longer.
            </p>
          </Reveal>

          <div style={{ position:"relative" }}>
            {/* Vertical connector line */}
            <div style={{ position:"absolute", left:110, top:24, bottom:0, width:2, background:`linear-gradient(180deg, ${T.gold}60 0%, ${T.gold}10 100%)` }} />

            {TIMELINE.map((t, i) => (
              <Reveal key={t.period} delay={i * 0.05}>
                <div style={{ display:"grid", gridTemplateColumns:"100px 40px 1fr", gap:"0 24px", marginBottom: i < TIMELINE.length - 1 ? 44 : 0, alignItems:"start" }}>
                  {/* Period label */}
                  <div style={{ textAlign:"right", paddingTop:2 }}>
                    <div style={{ fontSize:11.5, fontWeight:800, color:t.color, fontFamily:font, lineHeight:1.3 }}>{t.period}</div>
                  </div>
                  {/* Dot */}
                  <div style={{ display:"flex", justifyContent:"center", paddingTop:5, position:"relative", zIndex:1 }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", background:t.color, boxShadow:`0 0 0 4px ${t.color}22` }} />
                  </div>
                  {/* Content */}
                  <div>
                    <div style={{ fontSize:17, fontWeight:700, color:T.text, fontFamily:font, marginBottom:12 }}>{t.phase}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                      {t.items.map((item, j) => (
                        <div key={j} style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
                          <div style={{ width:5, height:5, borderRadius:"50%", background:t.color, flexShrink:0, marginTop:7 }} />
                          <span style={{ fontSize:14, color:T.textLt, fontFamily:font, lineHeight:1.6 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOFTWARE DEVELOPMENT LIFECYCLE ───────────────────────────── */}
      <section style={{ background: T.bg, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>SOFTWARE DEVELOPMENT LIFECYCLE</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:T.text, fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 14px" }}>
              How our engineering team builds
            </h2>
            <p style={{ fontSize:15, color:T.textLt, fontFamily:font, lineHeight:1.7, margin:"0 0 56px", maxWidth:560 }}>
              Every product and custom project goes through the same process. The phases can overlap (architecture and early development often run in parallel), but we never skip a phase because a client wants to launch faster.
            </p>
          </Reveal>

          {/* SVG Circular SDLC diagram */}
          <Reveal>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:64 }}>
              <svg width="420" height="420" viewBox="0 0 420 420" style={{ maxWidth:"100%", height:"auto" }}>
                <defs>
                  <filter id="sdlcGlow">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                </defs>
                {/* Outer ring */}
                <circle cx="210" cy="210" r="180" fill="none" stroke="rgba(6,24,40,0.06)" strokeWidth="1.5"/>
                <circle cx="210" cy="210" r="130" fill="rgba(200,168,80,0.03)" stroke="rgba(200,168,80,0.12)" strokeWidth="1"/>
                {/* Centre label */}
                <text x="210" y="202" textAnchor="middle" fontSize="11" fontWeight="800" fill="#061828" fontFamily="'Instrument Sans',sans-serif">ORION</text>
                <text x="210" y="218" textAnchor="middle" fontSize="11" fontWeight="800" fill="#061828" fontFamily="'Instrument Sans',sans-serif">SDLC</text>
                {/* Phase nodes — 7 phases arranged in circle, r=180 */}
                {SDLC.map((s, i) => {
                  const angle = (i / 7) * 2 * Math.PI - Math.PI / 2;
                  const cx = 210 + 180 * Math.cos(angle);
                  const cy = 210 + 180 * Math.sin(angle);
                  const tx = 210 + 210 * Math.cos(angle);
                  const ty = 210 + 210 * Math.sin(angle);
                  return (
                    <g key={s.phase}>
                      {/* Arc segment */}
                      <line x1="210" y1="210" x2={cx} y2={cy} stroke={`${s.color}20`} strokeWidth="1"/>
                      {/* Node circle */}
                      <circle cx={cx} cy={cy} r={18} fill={s.color} opacity="0.9" filter="url(#sdlcGlow)"/>
                      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="900" fill="#fff" fontFamily="'Instrument Sans',sans-serif">{i+1}</text>
                      {/* Phase label */}
                      <text
                        x={tx} y={ty}
                        textAnchor={Math.cos(angle) > 0.3 ? "start" : Math.cos(angle) < -0.3 ? "end" : "middle"}
                        dominantBaseline={Math.sin(angle) > 0.3 ? "hanging" : Math.sin(angle) < -0.3 ? "auto" : "middle"}
                        fontSize="11" fontWeight="700" fill="#1A2B3C" fontFamily="'Instrument Sans',sans-serif"
                      >{s.phase}</text>
                    </g>
                  );
                })}
                {/* Rotation direction arrow */}
                <path d="M 372 200 A 162 162 0 0 1 365 230" fill="none" stroke={T.gold} strokeWidth="2" markerEnd="url(#arrow)"/>
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill={T.gold}/>
                  </marker>
                </defs>
              </svg>
            </div>
          </Reveal>

          {/* Phase descriptions — 2-col grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap:20 }}>
            {SDLC.map((s, i) => (
              <Reveal key={s.phase} delay={Math.min(i * 0.05, 0.25)}>
                <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:`${s.color}14`, border:`1.5px solid ${s.color}35`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:3 }}>
                    <span style={{ fontSize:11, fontWeight:900, color:s.color, fontFamily:font }}>{i+1}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:font, marginBottom:5 }}>{s.phase}</div>
                    <p style={{ fontSize:13.5, color:T.textLt, fontFamily:font, lineHeight:1.65, margin:0 }}>{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPLOYMENT WORKFLOW ───────────────────────────────────────── */}
      <section style={{ background: T.bgMid, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>DEPLOYMENT WORKFLOW</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 56px", maxWidth:560 }}>
              From development machine to production server
            </h2>
          </Reveal>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap:0, border:`1px solid ${T.borderW}`, borderRadius:16, overflow:"hidden" }}>
            {[
              { env:"DEV", color:"#4F8EF7", tag:"Local development", points:["Feature branches per developer","Daily peer code review","Internal linting and unit tests","Nothing merged to main without review"] },
              { env:"STAGING", color:"#C8A850", tag:"Pre-production", points:["Production-identical environment","Client UAT happens here","Load and stress testing","Bug fixes loop back to dev"] },
              { env:"PRODUCTION", color:"#10B981", tag:"Live system", points:["Blue-green deployment strategy","Rollback plan tested before go-live","Real-time monitoring from minute one","We don't deploy on Fridays"] },
            ].map((e, i) => (
              <div key={e.env} style={{
                borderRight: i < 2 ? `1px solid ${T.borderW}` : "none",
                padding:"36px 30px",
              }}>
                <div style={{ fontSize:9.5, fontWeight:800, color:e.color, fontFamily:font, letterSpacing:"0.12em", marginBottom:8 }}>{e.env} ENVIRONMENT</div>
                <div style={{ fontSize:18, fontWeight:700, color:"#F2F6FF", fontFamily:font, marginBottom:4 }}>{e.tag}</div>
                <div style={{ height:2, width:36, background:e.color, borderRadius:2, marginBottom:22 }} />
                {e.points.map((p, j) => (
                  <div key={j} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:e.color, flexShrink:0, marginTop:8 }} />
                    <span style={{ fontSize:14, color:"rgba(200,210,226,0.65)", fontFamily:font, lineHeight:1.6 }}>{p}</span>
                  </div>
                ))}
                {i === 0 && <div style={{ fontSize:11, color:T.muted, fontFamily:font, marginTop:14, fontStyle:"italic" }}>Next: code review passes → staging</div>}
                {i === 1 && <div style={{ fontSize:11, color:T.muted, fontFamily:font, marginTop:14, fontStyle:"italic" }}>Next: client sign-off → production</div>}
                {i === 2 && <div style={{ fontSize:11, color:"#10B981", fontFamily:font, marginTop:14, fontWeight:700 }}>System live. Support SLA active.</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRAINING PROCESS — 3 stacked numbered phases ─────────────── */}
      <section style={{ background: T.bgAlt, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>TRAINING PROCESS</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:T.text, fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 56px" }}>
              Three phases. Nobody goes live unprepared.
            </h2>
          </Reveal>

          {[
            {
              num:"01", color:"#4F8EF7",
              title:"Pre-training preparation",
              timing:"Three weeks before go-live",
              details: [
                { label:"System configured", text:"User accounts, roles, and permissions are set up before training begins. Staff log in to their own accounts, not a demo account." },
                { label:"Test data loaded", text:"The training environment has realistic data, not empty screens. This makes it easier to demonstrate real workflow scenarios." },
                { label:"Training groups defined", text:"We don't run one generic session for everyone. We group staff by role: clinical, administrative, finance, management. Each group learns what's relevant to them." },
                { label:"Schedule agreed", text:"Session dates, times, venues (or video links), and attendance lists are confirmed in writing two weeks before training begins." },
              ],
            },
            {
              num:"02", color:"#C8A850",
              title:"Live training sessions",
              timing:"Two weeks before go-live",
              details: [
                { label:"Role-specific delivery", text:"Clinical staff learn patient registration, OPD consultation workflow, and clinical notes. Finance staff learn billing, receipts, and reconciliation. These are separate sessions." },
                { label:"Hands-on format", text:"We set a task, staff complete it on the system, we identify where people get stuck, and we adjust. No slide decks." },
                { label:"Real scenarios", text:"Training scenarios are based on your actual workflows, not generic examples. If your hospital admits most patients through emergency, we train that workflow first." },
                { label:"Session recordings", text:"Every remote training session is recorded and shared with you. Staff who miss a session can watch the recording before go-live." },
              ],
            },
            {
              num:"03", color:"#10B981",
              title:"Post-training support",
              timing:"Go-live day and beyond",
              details: [
                { label:"Quick reference cards", text:"One-page role-specific cards with the most common tasks printed or shared digitally. Something staff can look at in the first week when they forget a step." },
                { label:"Go-live day presence", text:"Our team is available on launch day, by phone, WhatsApp, or on-site, to handle anything that comes up in the first hours of live operation." },
                { label:"Week-two check-in", text:"We schedule a structured call at the end of the second week post-go-live to assess what's working, what isn't, and whether any workflow needs adjusting." },
                { label:"Ongoing support desk", text:"After the hypercare period, all support queries go to our support desk. Response within 48 hours for Standard, 8 hours for Professional, 4 hours for Enterprise." },
              ],
            },
          ].map((phase, i) => (
            <Reveal key={phase.num} delay={0.05}>
              <div style={{
                display:"grid",
                gridTemplateColumns:"80px 1fr",
                gap:"0 32px",
                marginBottom: i < 2 ? 48 : 0,
                paddingBottom: i < 2 ? 48 : 0,
                borderBottom: i < 2 ? `1px solid ${T.border}` : "none",
              }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", background:`${phase.color}10`, border:`2px solid ${phase.color}30`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px" }}>
                    <span style={{ fontSize:18, fontWeight:900, color:phase.color, fontFamily:font }}>{phase.num}</span>
                  </div>
                  <div style={{ height:`calc(100% - 72px)`, width:2, background:`${phase.color}20`, margin:"0 auto" }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:phase.color, fontFamily:font, fontWeight:800, letterSpacing:"0.08em", marginBottom:6 }}>{phase.timing.toUpperCase()}</div>
                  <h3 style={{ fontSize:"clamp(18px,2.2vw,22px)", fontWeight:800, color:T.text, fontFamily:font, margin:"0 0 28px", letterSpacing:"-0.02em" }}>{phase.title}</h3>
                  <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                    {phase.details.map((d) => (
                      <div key={d.label}>
                        <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:font, marginBottom:4 }}>{d.label}</div>
                        <p style={{ fontSize:14, color:T.textLt, fontFamily:font, lineHeight:1.65, margin:0 }}>{d.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── SUPPORT TIERS — horizontal comparison ────────────────────── */}
      <section style={{ background: T.bg, padding: "90px clamp(20px,4vw,40px) 100px", overflowX:"auto" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>SUPPORT & SLA</span>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, color:T.text, fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.15, margin:"12px 0 12px" }}>
              What support looks like after you go live
            </h2>
            <p style={{ fontSize:15, color:T.textLt, fontFamily:font, lineHeight:1.7, margin:"0 0 48px", maxWidth:500 }}>
              Standard support is included with every deployment. Professional and Enterprise are optional upgrades.
            </p>
          </Reveal>

          <Reveal>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden", minWidth:600 }}>
              {/* Header row */}
              {SUPPORT.map((s, i) => (
                <div key={s.tier} style={{
                  padding:"28px 24px 20px",
                  background: i === 1 ? T.bgDark : i === 0 ? T.bgAlt : "rgba(6,24,40,0.04)",
                  borderRight: i < 2 ? `1px solid ${i === 0 ? T.border : T.borderW}` : "none",
                }}>
                  <div style={{ fontSize:12, fontWeight:900, color: i === 1 ? "#F2F6FF" : T.text, fontFamily:font, letterSpacing:"-0.01em", marginBottom:4 }}>{s.tier}</div>
                  {s.included && <div style={{ display:"inline-block", fontSize:10, fontWeight:800, color:s.color, background:`${s.color}15`, padding:"2px 8px", borderRadius:20, marginBottom:8 }}>INCLUDED</div>}
                  <p style={{ fontSize:12.5, color: i === 1 ? "rgba(200,210,226,0.6)" : T.textLt, fontFamily:font, lineHeight:1.55, margin:0 }}>{s.desc}</p>
                </div>
              ))}
              {/* Data rows */}
              {SUPPORT[0].rows.map((_, rowIndex) => (
                SUPPORT.map((s, i) => (
                  <div key={`${s.tier}-${rowIndex}`} style={{
                    padding:"14px 24px",
                    borderTop: `1px solid ${i === 1 ? T.borderW : T.border}`,
                    borderRight: i < 2 ? `1px solid ${i === 0 ? T.border : T.borderW}` : "none",
                    background: i === 1 ? T.bgDark : "transparent",
                    display:"flex", flexDirection:"column", gap:3,
                  }}>
                    <div style={{ fontSize:10.5, color: i === 1 ? T.muted : T.textLt, fontFamily:font }}>{s.rows[rowIndex][0]}</div>
                    <div style={{ fontSize:13.5, fontWeight:600, color: i === 1 ? "#F2F6FF" : T.text, fontFamily:font }}>{s.rows[rowIndex][1]}</div>
                  </div>
                ))
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MAINTENANCE PLANS ─────────────────────────────────────────── */}
      <section style={{ background: T.bgDark, padding: "90px clamp(20px,4vw,40px) 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="process-plans-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"start" }}>
            <Reveal>
              <div>
                <span style={{ fontSize:11, fontWeight:800, color:T.gold, fontFamily:font, letterSpacing:"0.14em" }}>MAINTENANCE PLANS</span>
                <h2 style={{ fontSize:"clamp(24px,3vw,38px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.035em", lineHeight:1.2, margin:"12px 0 20px" }}>
                  What we maintain, and what that means in practice
                </h2>
                <p style={{ fontSize:15.5, color:"rgba(200,210,226,0.65)", fontFamily:font, lineHeight:1.8, margin:"0 0 32px" }}>
                  Every active deployment gets maintenance. This isn't a separate product. It's the standard of care that comes with working with us long-term.
                </p>
                <p style={{ fontSize:15.5, color:"rgba(200,210,226,0.65)", fontFamily:font, lineHeight:1.8, margin:0 }}>
                  We push updates on a regular cycle. Security patches go out immediately. Feature updates go through staging first. You're always told what's changing and why before it goes live on your system.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div style={{ display:"flex", flexDirection:"column", gap:0, border:`1px solid ${T.borderW}`, borderRadius:14, overflow:"hidden" }}>
                {[
                  { label:"Security patches", freq:"As required", note:"Critical vulnerabilities addressed within 24 hours of discovery" },
                  { label:"Platform updates", freq:"Monthly", note:"Bug fixes, minor improvements, and dependency updates" },
                  { label:"Feature releases", freq:"Quarterly", note:"New features staged for 2 weeks before production rollout" },
                  { label:"Database maintenance", freq:"Ongoing", note:"Index optimisation, query review, storage monitoring" },
                  { label:"Infrastructure review", freq:"Quarterly", note:"Server capacity, scaling decisions, backup verification" },
                  { label:"Annual performance audit", freq:"Yearly", note:"Full system review against current load and usage patterns" },
                ].map((item, i) => (
                  <div key={item.label} style={{
                    display:"grid",
                    gridTemplateColumns:"1fr 120px",
                    gap:16,
                    padding:"16px 20px",
                    borderBottom: i < 5 ? `1px solid ${T.borderW}` : "none",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    alignItems:"center",
                  }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:"#F2F6FF", fontFamily:font, marginBottom:3 }}>{item.label}</div>
                      <div style={{ fontSize:12, color:T.muted, fontFamily:font }}>{item.note}</div>
                    </div>
                    <div style={{ fontSize:12.5, fontWeight:700, color:T.gold, fontFamily:font, textAlign:"right" }}>{item.freq}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ background: T.bgDeep, padding: "80px clamp(20px,4vw,40px)", borderTop:`1px solid rgba(255,255,255,0.05)` }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign:"center" }}>
          <Reveal>
            <h2 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:800, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.03em", margin:"0 0 14px" }}>
              Ready to start a conversation?
            </h2>
            <p style={{ fontSize:16, color:"rgba(200,210,226,0.6)", fontFamily:font, lineHeight:1.7, margin:"0 0 36px" }}>
              Tell us what you're trying to build or fix. We'll tell you honestly whether we can help, and what it would take.
            </p>
            <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
              <button type="button" onClick={() => setCurrentPage("contact")}
                style={{ background:T.gold, border:"none", color:"#05070A", padding:"14px 32px", borderRadius:10, fontSize:15, fontWeight:900, fontFamily:font, cursor:"pointer", transition:"all 0.22s" }}
                onMouseEnter={e => { e.currentTarget.style.background=T.goldLt; e.currentTarget.style.transform="translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background=T.gold; e.currentTarget.style.transform=""; }}>
                Book a discovery call
              </button>
              <button type="button" onClick={() => setCurrentPage("products")}
                style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(200,210,226,0.75)", padding:"14px 32px", borderRadius:10, fontSize:15, fontWeight:600, fontFamily:font, cursor:"pointer", transition:"all 0.22s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.3)"; e.currentTarget.style.color="#F2F6FF"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; e.currentTarget.style.color="rgba(200,210,226,0.75)"; }}>
                Explore our products
              </button>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
