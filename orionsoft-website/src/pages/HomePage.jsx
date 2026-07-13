import { useState, useEffect, useRef } from "react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const LC = {
  bg:           "#FFFFFF",
  bgAlt:        "#F5F7FC",
  bgDark:       "#061828",
  bgDarkMid:    "#0D2540",
  bgSlate:      "#101C2E",
  navy:         "#061828",
  gold:         "#C8A850",
  goldLight:    "#E8C96A",
  goldDark:     "#A87C30",
  goldDim:      "rgba(200,168,80,0.10)",
  text:         "#1A2B3C",
  textLight:    "#4A5B6C",
  textMuted:    "#8094A8",
  border:       "rgba(6,24,40,0.07)",
  borderStrong: "rgba(6,24,40,0.14)",
  white:        "#FFFFFF",
  shadow:       "0 2px 16px rgba(6,24,40,0.06)",
  shadowMd:     "0 10px 40px rgba(6,24,40,0.11)",
};
const font = "'Instrument Sans','DM Sans',system-ui,-apple-system,sans-serif";

// ─── Static data ───────────────────────────────────────────────────────────────
const HP_PRODUCTS = [
  { id:"carecore-ai",    name:"CareCore AI",                 category:"Healthcare",       color:"#4F8EF7", emoji:"🏥", tagline:"Cloud Hospital Management",   desc:"AI-powered cloud platform for hospitals. Patient records, pharmacy, lab, billing, and real-time analytics accessible from any device.", benefits:["AI clinical decision support","Cloud access from any device","Multi-branch analytics dashboard","NHIS & LHIS billing automation"], page:"carecore" },
  { id:"carecore-local", name:"CareCore Local",              category:"Healthcare",       color:"#10B981", emoji:"💻", tagline:"Offline Hospital Management",  desc:"Same 25+ hospital modules as CareCore AI running entirely offline. Zero internet dependency, full sync when connectivity returns.",    benefits:["100% offline no internet needed","Full data sync on reconnect","On-premise storage for compliance","Identical module set to CareCore AI"],   page:"carecore" },
  { id:"schoolcore",     name:"School Management System",    category:"Education",        color:"#F59E0B", emoji:"🎓", tagline:"Academic & School Operations", desc:"End-to-end school management admissions, attendance, results, fee collection, CBT exams, timetable, and a parent communication portal.", benefits:["WAEC/NECO result formatting","Online & offline fee collection","Parent communication portal","CBT examination and timetable builder"],  page:"schoolcore" },
  { id:"directors",      name:"Directors' Portal",           category:"Executive",        color:"#C8A850", emoji:"📊", tagline:"Executive Intelligence",       desc:"A secure executive dashboard aggregating KPIs, operational data, and governance insights from across your entire organisation in real time.", benefits:["Unified cross-department view","Board-level reporting packs","Secure role-based access","Real-time KPI drill-down"],               page:"contact" },
  { id:"compliancecore", name:"ComplianceCore",              category:"Compliance",       color:"#F59E0B", emoji:"⚖️", tagline:"Compliance & Risk Management", desc:"Stay audit-ready with automated Nigerian regulatory tracking. Policies, risk registers, audit trails, and a full compliance calendar.",     benefits:["NDPR, CAC, CBN, NAFDAC calendar","Policy management & document control","Risk register with auto-alerts","Complete audit trail"],    page:"compliancecore" },
  { id:"inventorycore",  name:"Inventory Management System", category:"Operations",       color:"#8B5CF6", emoji:"📦", tagline:"Inventory & Supply Chain",     desc:"Real-time stock visibility across every warehouse, branch, and location with expiry tracking, supplier management, and barcode scanning.",  benefits:["Multi-warehouse real-time tracking","Expiry & batch management","Auto purchase orders & reorder alerts","Barcode & QR scanning"],      page:"inventorycore" },
  { id:"custom-dev",     name:"Custom Software Development", category:"Technology",       color:"#6366F1", emoji:"🛠️", tagline:"Bespoke Websites & Web Apps",  desc:"When an off-the-shelf product won't do, we build to your exact specification websites, web applications, mobile apps, and API systems.",    benefits:["Business websites & corporate portals","Custom web applications & dashboards","iOS & Android mobile apps","API development & integrations"], page:"contact" },
  { id:"ai-automation",  name:"AI Business Automation",      category:"Technology",       color:"#06B6D4", emoji:"🤖", tagline:"AI-Powered Process Automation", desc:"Transform repetitive workflows into intelligent automated pipelines. Document extraction, decision automation, and cross-system orchestration.", benefits:["AI document extraction & processing","Intelligent workflow orchestration","Cross-system data routing","Real-time monitoring & exceptions"],  page:"contact" },
];

const INDUSTRIES = [
  { name:"Healthcare",          color:"#4F8EF7", emoji:"❤️‍🩹", desc:"Hospitals, clinics, pharmacies, diagnostic labs and health centres.",            products:["CareCore AI","CareCore Local","InventoryCore"] },
  { name:"Education",           color:"#F59E0B", emoji:"🎓",    desc:"Primary, secondary, tertiary and vocational institutions.",                       products:["School Management System","HRCore","FinanceCore"] },
  { name:"Government & NGOs",   color:"#F43F5E", emoji:"🏛️",    desc:"Public sector agencies, MDAs, civil service and donor-funded NGOs.",              products:["ComplianceCore","HRCore","FinanceCore"] },
  { name:"Financial Services",  color:"#C8A850", emoji:"💹",    desc:"Banks, microfinance, fintech, insurance and professional services firms.",         products:["FinanceCore","ComplianceCore","HRCore"] },
  { name:"Manufacturing",       color:"#F59E0B", emoji:"🏭",    desc:"Factories, production lines, FMCG and supply chain operations.",                  products:["InventoryCore","FinanceCore","HRCore"] },
  { name:"Logistics & Fleet",   color:"#06B6D4", emoji:"🚛",    desc:"Transport companies, couriers, haulage and government vehicle fleets.",            products:["FleetCore","InventoryCore"] },
  { name:"Faith Organisations", color:"#7C3AED", emoji:"⛪",    desc:"Churches, mosques, ministries and faith-based organisations.",                    products:["ChurchCore","FinanceCore"] },
  { name:"SMEs & Corporates",   color:"#8B5CF6", emoji:"🏢",    desc:"Growing businesses, holding companies and corporate organisations.",               products:["HRCore","FinanceCore","InventoryCore"] },
];

const WHY_REASONS = [
  { num:"01", color:"#4F8EF7", title:"Production-grade from day one.", body:"Security, audit logs, and role-based access are baseline not extras. We don't ship half-finished products and patch them in production. Every module undergoes security review, load testing, and client acceptance before going live.", stat:"99.5%", statLabel:"uptime SLA" },
  { num:"02", color:"#10B981", title:"Built for African business reality.", body:"PAYE, WHT, NHIS, NHF, NDPR, CAC: our systems know Nigerian regulation the way your accountant does. We don't localise afterwards. We build for Nigeria first, then make it global-ready.", stat:"8+", statLabel:"Nigerian regulations supported" },
  { num:"03", color:"#C8A850", title:"We stay long after launch.", body:"Staff training, go-live support, and SLA-backed maintenance are written into every engagement. You don't get handed to a call centre. You get a dedicated team that knows your deployment.", stat:"100%", statLabel:"deployments with support SLA" },
  { num:"04", color:"#F43F5E", title:"Architecture that holds up under scrutiny.", body:"API-first design, documented endpoints, role-based audit logs, and infrastructure on AWS. When a client's IT team or a government procurement committee asks technical questions, we hand them the documentation. Nothing is hidden behind 'our proprietary approach'.", stat:"25+", statLabel:"core modules shipped" },
];

const TESTIMONIALS = [
  { quote:"We interviewed four vendors. Three gave us demos. Orion Soft gave us a scoping document that showed they'd actually listened. The deployment took nine weeks. By week twelve, our billing reconciliation was closing in four hours instead of two days.", name:"Dr. Adewale Okonkwo", role:"Medical Director", company:"St. Mary's Hospital, Lagos", productColor:"#4F8EF7" },
  { quote:"Parents called the school on results day for the first time in years. Not to complain, but to say they had already seen their child's results online. SchoolCore published 234 results that morning. Nothing crashed. Nobody printed a single sheet of paper.", name:"Mrs. Blessing Eze", role:"Principal", company:"Excellence College, Abuja", productColor:"#F59E0B" },
  { quote:"Our CBN examination last year was the first one I've walked into without a folder of printed documents. ComplianceCore had every policy, risk register, and audit trail ready to share from a link. The examiner asked where we got the system. I said we built it in Nigeria.", name:"Emeka Nwosu", role:"Chief Compliance Officer", company:"Apex Microfinance Bank", productColor:"#C8A850" },
];

const TECH_STACK = [
  { category:"Backend",      items:["Node.js","Python","PostgreSQL","MongoDB","Redis","REST & GraphQL APIs"] },
  { category:"Frontend",     items:["React","React Native","Next.js","TypeScript","Vite"] },
  { category:"Cloud",        items:["AWS","Vercel","Azure","Cloudflare","Upstash KV"] },
  { category:"AI & ML",      items:["Groq","OpenAI","LLaMA 3","Hugging Face","RAG Pipelines"] },
  { category:"DevOps & QA",  items:["Docker","GitHub Actions","Nginx","PM2","Automated Testing"] },
];

const IMPL_STEPS = [
  { num:"01", title:"Discovery", time:"Week 1–2",    icon:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", desc:"We map your workflows, identify the right modules, and scope exactly what your organisation needs. No assumptions, no generic demos." },
  { num:"02", title:"Design",    time:"Week 2–4",    icon:"M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z", desc:"System architecture, data migration plan, user role design, and a milestone roadmap with clear sign-off points at every stage." },
  { num:"03", title:"Build",     time:"Week 4–12",   icon:"M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", desc:"Custom configuration, existing system integrations, full user roles, and end-to-end testing before anything reaches your staff." },
  { num:"04", title:"Go-Live",   time:"Week 12–14",  icon:"M5 3l14 9-14 9V3z", desc:"Hands-on staff training sessions, parallel running period if required, and a fully supported go-live day with our team on standby." },
  { num:"05", title:"Support",   time:"Ongoing",     icon:"M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z", desc:"SLA-backed maintenance, regular platform updates, quarterly reviews, and a named account contact for the long term." },
];

const NEWS_ITEMS = [
  { date:"Dec 2024", category:"PRODUCT UPDATE", tag:"Healthcare", color:"#4F8EF7", title:"CareCore AI adds real-time multi-branch analytics for hospital networks", excerpt:"Orion Soft releases a major update to CareCore AI featuring consolidated dashboards for hospital groups managing multiple branches or clinics, with drill-down capability to individual site metrics." },
  { date:"Nov 2024", category:"COMPANY NEWS",   tag:"Company",    color:"#C8A850", title:"Orion Soft expands with Directors' Portal for executive governance", excerpt:"Growing organisations using multiple Orion Soft products can now access a unified board-level dashboard showing consolidated KPIs, compliance status, and financial summaries." },
  { date:"Oct 2024", category:"ANNOUNCEMENT",   tag:"Coming Soon",color:"#06B6D4", title:"TeleHealth platform confirmed for 2026 launch with video consultation suite", excerpt:"Orion Soft confirms its telemedicine platform will launch in 2026, featuring video consultations, digital prescriptions, and full integration with CareCore AI." },
];

// ─── Scroll-reveal ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}
function SvgIcon({ d, size = 20, color = LC.navy, stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §1 HERO world-class SaaS hero, dark navy + dashboard collage
// ═══════════════════════════════════════════════════════════════════════════════

// Inner dashboard card rendered inside the hero collage
function HeroDashboard() {
  return (
    <div style={{
      background: "#0D2540",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.09)",
      boxShadow: "0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
      overflow: "hidden",
      width: "100%",
    }}>
      {/* Window chrome */}
      <div style={{ height:34, background:"#071626", display:"flex", alignItems:"center", padding:"0 12px", gap:6, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        {["#EF4444","#F59E0B","#10B981"].map(c=><span key={c} style={{ width:9,height:9,borderRadius:"50%",background:c,opacity:0.75 }}/>)}
        <span style={{ fontSize:10.5, color:"rgba(200,210,226,0.35)", fontFamily:font, marginLeft:10, letterSpacing:"0.03em" }}>CareCore AI · Dashboard</span>
        <span style={{ marginLeft:"auto", fontSize:9, padding:"2px 7px", background:"rgba(79,142,247,0.2)", color:"#4F8EF7", borderRadius:4, fontFamily:font, fontWeight:700, letterSpacing:"0.06em" }}>● LIVE</span>
      </div>
      {/* Nav tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"#071626" }}>
        {[["Dashboard",true],["Patients",false],["Billing",false],["Reports",false]].map(([t,a])=>(
          <div key={t} style={{ padding:"8px 12px", fontSize:10.5, fontWeight:a?700:400, color:a?"#4F8EF7":"rgba(200,210,226,0.33)", borderBottom:a?"2px solid #4F8EF7":"2px solid transparent", fontFamily:font, cursor:"default" }}>{t}</div>
        ))}
      </div>
      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5, padding:"9px 9px 5px" }}>
        {[["1,247","Patients","#4F8EF7"],["₦4.2M","Revenue","#10B981"],["98.5%","Uptime","#C8A850"],["142","Staff","#8B5CF6"]].map(([v,l,c])=>(
          <div key={l} style={{ background:"rgba(255,255,255,0.04)", borderRadius:7, padding:"7px 8px", border:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize:12.5, fontWeight:800, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.02em" }}>{v}</div>
            <div style={{ fontSize:9.5, color:c, fontFamily:font, marginTop:1, fontWeight:700 }}>{l}</div>
          </div>
        ))}
      </div>
      {/* Chart + activity */}
      <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:5, padding:"0 9px 9px" }}>
        {/* Area chart */}
        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:7, padding:"8px", border:"1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize:9, color:"rgba(200,210,226,0.3)", fontFamily:font, marginBottom:5, fontWeight:700, letterSpacing:"0.06em" }}>MONTHLY REVENUE (₦)</div>
          <svg viewBox="0 0 200 48" width="100%" height={48} preserveAspectRatio="none">
            <defs>
              <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F8EF7" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#4F8EF7" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,44 L18,38 L36,41 L54,29 L72,33 L90,20 L108,24 L126,12 L144,16 L162,6 L180,10 L200,4 L200,48 L0,48Z" fill="url(#hGrad)"/>
            <path d="M0,44 L18,38 L36,41 L54,29 L72,33 L90,20 L108,24 L126,12 L144,16 L162,6 L180,10 L200,4" stroke="#4F8EF7" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="200" cy="4" r="3" fill="#4F8EF7"/>
            <circle cx="200" cy="4" r="6" fill="#4F8EF7" fillOpacity="0.2"/>
          </svg>
        </div>
        {/* Activity */}
        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:7, padding:"8px", border:"1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize:9, color:"rgba(200,210,226,0.3)", fontFamily:font, marginBottom:6, fontWeight:700, letterSpacing:"0.06em" }}>RECENT ACTIVITY</div>
          {[["OPD Visit #4821","#4F8EF7"],["Lab Result Ready","#10B981"],["Invoice #8820","#C8A850"],["Staff Clock-in","#8B5CF6"]].map(([t,c])=>(
            <div key={t} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:c,flexShrink:0 }}/>
              <span style={{ fontSize:9,color:"rgba(200,210,226,0.5)",fontFamily:font,lineHeight:1.3 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      {/* AI insight bar */}
      <div style={{ background:"rgba(79,142,247,0.07)", borderTop:"1px solid rgba(79,142,247,0.1)", padding:"8px 12px", display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ fontSize:11 }}>🤖</span>
        <span style={{ fontSize:9.5, color:"rgba(200,210,226,0.55)", fontFamily:font, fontStyle:"italic" }}>Ori AI: Revenue +12% this month pharmacy restock recommended for Ward 3</span>
      </div>
    </div>
  );
}

function HeroSection({ setCurrentPage }) {
  const [tourHov, setTourHov] = useState(false);
  return (
    <section className="hero-enterprise" style={{
      background: "#060F1A",
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "5fr 7fr",
      alignItems: "center",
      padding: "140px clamp(20px,4vw,72px) 80px",
      gap: "clamp(36px,4vw,64px)",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── Animated background ───────────────────────────────────────── */}
      <div aria-hidden="true" style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-18%", left:"10%", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle, rgba(79,142,247,0.11) 0%, transparent 60%)", filter:"blur(70px)", animation:"floatSoft 9s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", bottom:"-22%", right:"8%", width:560, height:560, borderRadius:"50%", background:"radial-gradient(circle, rgba(200,168,80,0.08) 0%, transparent 65%)", filter:"blur(60px)", animation:"floatSoft 12s ease-in-out infinite reverse" }}/>
        <div style={{ position:"absolute", top:"35%", right:"28%", width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)", filter:"blur(40px)" }}/>
        {/* dot grid */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} aria-hidden="true">
          {Array.from({length:22},(_,r)=>Array.from({length:34},(_,c)=>(
            <circle key={`${r}-${c}`} cx={c*68} cy={r*68} r="1.1" fill="#4F8EF7" fillOpacity="0.16"/>
          )))}
        </svg>
        {/* subtle grid lines */}
        <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 67px,rgba(255,255,255,0.013) 68px),repeating-linear-gradient(90deg,transparent,transparent 67px,rgba(255,255,255,0.013) 68px)" }}/>
      </div>

      {/* ── Left: Copy ───────────────────────────────────────────────── */}
      <div style={{ position:"relative", zIndex:2 }}>
        {/* Badge */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(200,168,80,0.1)", border:"1px solid rgba(200,168,80,0.28)", borderRadius:999, padding:"7px 16px", marginBottom:26 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:LC.gold, flexShrink:0, animation:"pulse 2s ease-in-out infinite" }}/>
          <span style={{ fontSize:10.5, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.11em" }}>ENTERPRISE SOFTWARE · ORION SOFT LIMITED</span>
        </div>

        {/* H1 */}
        <h1 style={{ fontSize:"clamp(32px,3.6vw,58px)", fontWeight:900, color:"#F2F6FF", fontFamily:font, lineHeight:1.07, letterSpacing:"-0.04em", margin:"0 0 20px" }}>
          Building Intelligent<br/>
          Software That Powers<br/>
          <span style={{ backgroundImage:"linear-gradient(120deg,#4F8EF7 0%,#06B6D4 40%,#10B981 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            Modern Organizations.
          </span>
        </h1>

        {/* Subheadline */}
        <p style={{ fontSize:"clamp(15px,1.3vw,17px)", color:"rgba(200,210,226,0.68)", fontFamily:font, lineHeight:1.88, margin:"0 0 34px", maxWidth:470 }}>
          Orion Soft Limited builds software that hospitals, schools, government agencies, and businesses across Nigeria use every day to run their operations.
        </p>

        {/* CTAs */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:40, alignItems:"center" }}>
          {/* Book Free Demo */}
          <button type="button" onClick={() => setCurrentPage("contact")}
            style={{ background:"linear-gradient(135deg,#C8A850,#E8C96A)", color:"#06100E", border:"none", borderRadius:11, padding:"14px 26px", fontSize:14.5, fontWeight:800, fontFamily:font, cursor:"pointer", boxShadow:"0 8px 28px rgba(200,168,80,0.38)", transition:"all 0.28s cubic-bezier(0.16,1,0.3,1)" }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px) scale(1.02)"; e.currentTarget.style.boxShadow="0 18px 48px rgba(200,168,80,0.48)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 8px 28px rgba(200,168,80,0.38)"; }}>
            Book Free Demo
          </button>
          {/* Explore Products */}
          <button type="button" onClick={() => setCurrentPage("products")}
            style={{ background:"rgba(255,255,255,0.08)", color:"#F2F6FF", border:"1px solid rgba(255,255,255,0.15)", borderRadius:11, padding:"14px 26px", fontSize:14.5, fontWeight:700, fontFamily:font, cursor:"pointer", transition:"all 0.25s" }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.28)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; }}>
            Explore Our Products
          </button>
          {/* Watch Tour */}
          <button type="button"
            onMouseEnter={() => setTourHov(true)}
            onMouseLeave={() => setTourHov(false)}
            style={{ background:"none", border:"none", color:tourHov?"rgba(200,210,226,0.92)":"rgba(200,210,226,0.55)", fontSize:13.5, fontWeight:600, fontFamily:font, cursor:"pointer", display:"flex", alignItems:"center", gap:9, padding:"4px 0", transition:"color 0.2s" }}>
            <span style={{
              width:32, height:32, borderRadius:"50%",
              background:tourHov?"rgba(255,255,255,0.14)":"rgba(255,255,255,0.07)",
              border:"1px solid rgba(255,255,255,0.16)",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.22s", flexShrink:0,
            }}>
              <svg width="11" height="12" viewBox="0 0 11 12" fill="rgba(200,210,226,0.8)"><path d="M0 0l11 6-11 6V0z"/></svg>
            </span>
            Watch Product Tour
          </button>
        </div>

        {/* Trust strip */}
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:10.5, color:"rgba(200,210,226,0.3)", fontFamily:font, letterSpacing:"0.09em" }}>DEPLOYED ACROSS</span>
          {["Healthcare","Education","Finance","Government","Logistics"].map(s=>(
            <span key={s} style={{ fontSize:11.5, fontWeight:700, color:"rgba(200,210,226,0.48)", fontFamily:font, padding:"4px 10px", background:"rgba(255,255,255,0.05)", borderRadius:6, border:"1px solid rgba(255,255,255,0.07)" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* ── Right: Dashboard Collage ──────────────────────────────────── */}
      <div style={{ position:"relative", height:"clamp(500px,52vw,600px)", zIndex:2 }} className="hero-constellation">

        {/* Ambient glow behind main card */}
        <div aria-hidden="true" style={{ position:"absolute", top:"10%", left:"50%", transform:"translateX(-50%)", width:"80%", height:"60%", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(79,142,247,0.14) 0%, transparent 70%)", filter:"blur(30px)", pointerEvents:"none" }}/>

        {/* Main CareCore dashboard centered anchor */}
        <div style={{ position:"absolute", top:40, left:"50%", transform:"translateX(-50%)", width:"clamp(300px,58%,410px)", zIndex:2, animation:"heroCardIn 0.9s cubic-bezier(0.16,1,0.3,1) both" }}>
          <HeroDashboard/>
        </div>

        {/* ── Floating card 1: CareCore notification (top-right) */}
        <div style={{
          position:"absolute", top:6, right:0, zIndex:4,
          width:214, background:"#0D2540",
          border:"1px solid rgba(79,142,247,0.22)",
          borderRadius:12,
          boxShadow:"0 20px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(79,142,247,0.08)",
          padding:"12px 13px",
          animation:"hpFloat1 5.2s ease-in-out infinite",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
            <span style={{ fontSize:13 }}>🏥</span>
            <span style={{ fontSize:10.5, fontWeight:700, color:"#4F8EF7", fontFamily:font }}>CareCore AI</span>
            <span style={{ marginLeft:"auto", width:7, height:7, borderRadius:"50%", background:"#10B981", animation:"pulse 2s infinite", flexShrink:0 }}/>
          </div>
          <div style={{ fontSize:11.5, fontWeight:700, color:"#F2F6FF", fontFamily:font, marginBottom:3 }}>Patient admitted Ward 3</div>
          <div style={{ fontSize:9.5, color:"rgba(200,210,226,0.42)", fontFamily:font }}>Michael Okonkwo · OPD #4821 · just now</div>
        </div>

        {/* ── Floating card 2: Directors' Portal (left-center) */}
        <div style={{
          position:"absolute", top:"34%", left:0, zIndex:4,
          width:164, background:"linear-gradient(140deg,#0D2540,#152840)",
          border:"1px solid rgba(200,168,80,0.25)",
          borderRadius:12,
          boxShadow:"0 20px 56px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,168,80,0.07)",
          padding:"13px 14px",
          animation:"hpFloat2 7.8s ease-in-out infinite",
        }}>
          <div style={{ fontSize:9, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.08em", marginBottom:7 }}>DIRECTORS' PORTAL</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:3, marginBottom:2 }}>
            <span style={{ fontSize:10, color:"#10B981", fontFamily:font, fontWeight:800 }}>↑</span>
            <span style={{ fontSize:30, fontWeight:900, color:"#F2F6FF", fontFamily:font, letterSpacing:"-0.05em", lineHeight:1 }}>18%</span>
          </div>
          <div style={{ fontSize:9.5, color:"rgba(200,210,226,0.4)", fontFamily:font, marginBottom:9 }}>Revenue growth · Q4 2024</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:22 }}>
            {[55,68,60,78,72,88,82].map((h,i)=>(
              <div key={i} style={{ flex:1, height:`${h}%`, background:i===6?"#C8A850":"rgba(200,168,80,0.28)", borderRadius:"2px 2px 0 0" }}/>
            ))}
          </div>
        </div>

        {/* ── Floating card 3: SchoolCore results (right-center) */}
        <div style={{
          position:"absolute", top:"46%", right:0, zIndex:3,
          width:196, background:"#0D2540",
          border:"1px solid rgba(245,158,11,0.2)",
          borderRadius:12,
          boxShadow:"0 20px 56px rgba(0,0,0,0.45)",
          padding:"12px 13px",
          animation:"hpFloat0 6.4s ease-in-out infinite",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
            <span style={{ fontSize:13 }}>🎓</span>
            <span style={{ fontSize:10.5, fontWeight:700, color:"#F59E0B", fontFamily:font }}>SchoolCore</span>
          </div>
          <div style={{ fontSize:11.5, fontWeight:700, color:"#F2F6FF", fontFamily:font, marginBottom:2 }}>234 results published</div>
          <div style={{ fontSize:9.5, color:"rgba(200,210,226,0.38)", fontFamily:font, marginBottom:8 }}>JSS 3 · Term 3 · 2024/25</div>
          <div style={{ display:"flex", gap:2, alignItems:"flex-end", height:20 }}>
            {[70,88,62,92,75,84,91].map((h,i)=>(
              <div key={i} style={{ flex:1, borderRadius:"2px 2px 0 0", background:i===3||i===6?"rgba(245,158,11,0.8)":"rgba(245,158,11,0.25)", height:`${h}%` }}/>
            ))}
          </div>
        </div>

        {/* ── Floating card 4: ComplianceCore status (bottom-right) */}
        <div style={{
          position:"absolute", bottom:"12%", right:"3%", zIndex:3,
          width:180, background:"#0D2540",
          border:"1px solid rgba(16,185,129,0.18)",
          borderRadius:12,
          boxShadow:"0 20px 56px rgba(0,0,0,0.44)",
          padding:"12px 13px",
          animation:"hpFloat2 6.9s ease-in-out infinite reverse",
        }}>
          <div style={{ fontSize:9, fontWeight:800, color:"#10B981", fontFamily:font, letterSpacing:"0.08em", marginBottom:8 }}>COMPLIANCECORE</div>
          {[["NDPR","#10B981","Compliant"],["CBN","#10B981","Compliant"],["CAC","#10B981","Compliant"],["FIRS","#F59E0B","Review due"]].map(([l,c,s])=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
              <span style={{ width:14,height:14,borderRadius:"50%",background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span style={{ fontSize:9.5,color:"rgba(200,210,226,0.55)",fontFamily:font }}><b style={{color:c,fontWeight:700}}>{l}</b> {s}</span>
            </div>
          ))}
        </div>

        {/* ── Floating card 5: InventoryCore analytics (bottom-left) */}
        <div style={{
          position:"absolute", bottom:"4%", left:"4%", zIndex:4,
          width:188, background:"#0D2540",
          border:"1px solid rgba(139,92,246,0.22)",
          borderRadius:12,
          boxShadow:"0 20px 56px rgba(0,0,0,0.52)",
          padding:"12px 13px",
          animation:"hpFloat1 5.8s ease-in-out infinite reverse",
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:9, fontWeight:800, color:"#8B5CF6", fontFamily:font, letterSpacing:"0.08em" }}>INVENTORYCORE</span>
            <span style={{ fontSize:9, color:"rgba(200,210,226,0.3)", fontFamily:font }}>Live</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            {/* Donut */}
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink:0 }}>
              <circle cx="22" cy="22" r="16" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
              <circle cx="22" cy="22" r="16" fill="none" stroke="#8B5CF6" strokeWidth="6"
                strokeDasharray={`${0.94*2*Math.PI*16} ${2*Math.PI*16}`}
                strokeDashoffset={0.25*2*Math.PI*16}
                strokeLinecap="round" transform="rotate(-90 22 22)"/>
              <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="900" fill="#F2F6FF" fontFamily={font}>94%</text>
            </svg>
            <div>
              <div style={{ fontSize:11.5,fontWeight:800,color:"#F2F6FF",fontFamily:font,letterSpacing:"-0.01em" }}>Stock Health</div>
              <div style={{ fontSize:9.5,color:"rgba(200,210,226,0.4)",fontFamily:font }}>3 items low stock</div>
            </div>
          </div>
          {/* Sparkline */}
          <svg viewBox="0 0 160 24" width="100%" height={24} preserveAspectRatio="none">
            <path d="M0,20 L20,16 L40,18 L60,11 L80,14 L100,7 L120,9 L140,3 L160,5" stroke="#8B5CF6" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            <circle cx="160" cy="5" r="2.5" fill="#8B5CF6"/>
          </svg>
        </div>

        {/* ── Floating AI notification badge (top-left of collage) */}
        <div style={{
          position:"absolute", top:"20%", left:"4%", zIndex:3,
          width:160, background:"rgba(6,182,212,0.08)",
          border:"1px solid rgba(6,182,212,0.22)",
          borderRadius:10,
          padding:"10px 12px",
          animation:"hpFloat0 8.5s ease-in-out infinite",
          backdropFilter:"blur(12px)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
            <span style={{ fontSize:12 }}>🤖</span>
            <span style={{ fontSize:9.5, fontWeight:800, color:"#06B6D4", fontFamily:font }}>Ori AI Assistant</span>
          </div>
          <p style={{ fontSize:9.5, color:"rgba(200,210,226,0.65)", fontFamily:font, lineHeight:1.5, margin:0 }}>Revenue up 12%. Recommend restocking pharmacy supply chain.</p>
        </div>

      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §2 WHO WE ARE dark bg, large stats left + narrative right + 4 identity cards
// ═══════════════════════════════════════════════════════════════════════════════
function WhoWeAreSection({ setCurrentPage }) {
  return (
    <section style={{ background:LC.bgDark, padding:"120px clamp(24px,5vw,80px)", position:"relative", overflow:"hidden" }}>
      <div aria-hidden="true" style={{ position:"absolute", top:"-20%", right:"-5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(200,168,80,0.07) 0%, transparent 65%)" }}/>
      <div aria-hidden="true" style={{ position:"absolute", bottom:"-15%", left:"-5%", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle, rgba(79,142,247,0.06) 0%, transparent 65%)" }}/>

      <div style={{ maxWidth:1360, margin:"0 auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"clamp(48px,7vw,100px)", alignItems:"center", marginBottom:80 }} className="intro-grid">
          <Reveal>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:18 }}>WHO WE ARE</div>
              <h2 style={{ fontSize:"clamp(32px,4vw,56px)", fontWeight:900, color:"#F2F6FF", fontFamily:font, lineHeight:1.06, letterSpacing:"-0.035em", margin:"0 0 24px" }}>
                We are Orion Soft Limited.
              </h2>
              <p style={{ fontSize:17, color:"rgba(200,210,226,0.78)", fontFamily:font, lineHeight:1.88, margin:"0 0 18px" }}>
                A full-stack enterprise software company headquartered in Nigeria. We design, engineer, and deploy production-grade platforms that organisations across healthcare, education, finance, government, and industry depend on every day.
              </p>
              <p style={{ fontSize:17, color:"rgba(200,210,226,0.78)", fontFamily:font, lineHeight:1.88, margin:"0 0 36px" }}>
                We are not a single-product company. We are building a growing suite of enterprise platforms each purpose-built for its industry, each held to the same engineering standard, each delivered with long-term support.
              </p>
              <button type="button" onClick={() => setCurrentPage("about")}
                style={{ background:LC.gold, color:"#06100E", border:"none", borderRadius:10, padding:"14px 28px", fontSize:14.5, fontWeight:800, fontFamily:font, cursor:"pointer", boxShadow:"0 6px 28px rgba(200,168,80,0.35)", transition:"all 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.background=LC.goldLight; e.currentTarget.style.transform="translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background=LC.gold; e.currentTarget.style.transform=""; }}>
                Our Story →
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {[
                { v:"9",     l:"Enterprise\nPlatforms",  color:"#4F8EF7" },
                { v:"8+",    l:"Industries\nServed",      color:"#10B981" },
                { v:"25+",   l:"Core Modules\nin CareCore", color:"#C8A850" },
                { v:"2022",  l:"Founded\nin Nigeria",     color:"#F43F5E" },
              ].map(s => (
                <div key={s.l} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"28px 22px", transition:"all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor=`${s.color}30`; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}>
                  <div style={{ fontSize:"clamp(32px,4vw,48px)", fontWeight:900, color:s.color, fontFamily:font, letterSpacing:"-0.04em", lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:13, color:"rgba(200,210,226,0.55)", fontFamily:font, marginTop:8, lineHeight:1.4, whiteSpace:"pre-line" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }} className="four-col-grid">
            {[
              { icon:"M9 12l2 2 4-4 M12 2a10 10 0 100 20 10 10 0 000-20z", label:"Production-Grade",    desc:"Security, audit logs and role-based access are baseline not extras.", color:"#4F8EF7" },
              { icon:"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",   label:"Built for Nigeria",     desc:"PAYE, NDPR, NHIS, and local workflows no painful localisation.",  color:"#10B981" },
              { icon:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z",    label:"Long-Term Support",     desc:"Training, go-live, and SLA maintenance included in every contract.", color:"#C8A850" },
              { icon:"M3 12a9 9 0 1018 0 9 9 0 01-18 0z M3.6 9h16.8M3.6 15h16.8",               label:"Global Standards",       desc:"API-first, fully documented, and ready for international procurement.", color:"#F43F5E" },
            ].map(c => (
              <div key={c.label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"20px 18px" }}>
                <div style={{ width:38, height:38, borderRadius:9, background:`${c.color}14`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:13 }}>
                  <SvgIcon d={c.icon} size={18} color={c.color}/>
                </div>
                <div style={{ fontSize:13.5, fontWeight:800, color:"#F2F6FF", fontFamily:font, marginBottom:7 }}>{c.label}</div>
                <div style={{ fontSize:12.5, color:"rgba(200,210,226,0.52)", fontFamily:font, lineHeight:1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §3 INDUSTRIES horizontal scrollable portrait cards
// ═══════════════════════════════════════════════════════════════════════════════
function IndustriesSection({ setCurrentPage }) {
  const [hov, setHov] = useState(null);
  return (
    <section style={{ background:LC.bgAlt, padding:"120px 0" }}>
      <div style={{ maxWidth:1360, margin:"0 auto", padding:"0 clamp(24px,5vw,80px)" }}>
        <Reveal>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:44, flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:12 }}>INDUSTRIES WE SERVE</div>
              <h2 style={{ fontSize:"clamp(30px,3.5vw,50px)", fontWeight:900, color:LC.navy, fontFamily:font, lineHeight:1.06, letterSpacing:"-0.035em", margin:0 }}>
                Built for the sectors that<br/>power Africa's economy.
              </h2>
            </div>
            <button type="button" onClick={() => setCurrentPage("industries")}
              style={{ background:"none", border:`1.5px solid ${LC.borderStrong}`, color:LC.navy, borderRadius:9, padding:"11px 22px", fontFamily:font, fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.22s", whiteSpace:"nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.background=LC.navy; e.currentTarget.style.color=LC.white; }}
              onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color=LC.navy; }}>
              All industries →
            </button>
          </div>
        </Reveal>
      </div>

      {/* Horizontal scroll row */}
      <div style={{ overflowX:"auto", paddingBottom:8, scrollbarWidth:"thin", scrollbarColor:"rgba(6,24,40,0.15) transparent" }}>
        <div style={{ display:"flex", gap:16, padding:"0 clamp(24px,5vw,80px)", width:"max-content" }}>
          {INDUSTRIES.map((ind, i) => (
            <Reveal key={ind.name} delay={Math.min(i*0.05,0.3)}>
              <button type="button" onClick={() => setCurrentPage("industries")}
                onMouseEnter={() => setHov(ind.name)}
                onMouseLeave={() => setHov(null)}
                style={{
                  width:200, background:LC.white, border:`1.5px solid ${hov===ind.name ? ind.color+"50" : LC.border}`,
                  borderRadius:18, overflow:"hidden", cursor:"pointer", textAlign:"left",
                  boxShadow: hov===ind.name ? `0 14px 50px ${ind.color}16` : LC.shadow,
                  transform: hov===ind.name ? "translateY(-6px)" : "none",
                  transition:"all 0.28s cubic-bezier(0.16,1,0.3,1)",
                }}>
                {/* Colored top half */}
                <div style={{ height:120, background:`linear-gradient(140deg, ${ind.color}14, ${ind.color}28)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, position:"relative" }}>
                  {ind.emoji}
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2.5, background:ind.color }}/>
                </div>
                {/* Content */}
                <div style={{ padding:"16px 16px 20px" }}>
                  <div style={{ fontSize:14.5, fontWeight:800, color:LC.navy, fontFamily:font, marginBottom:7, lineHeight:1.2 }}>{ind.name}</div>
                  <div style={{ fontSize:12, color:LC.textLight, fontFamily:font, lineHeight:1.6, marginBottom:12 }}>{ind.desc}</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {ind.products.slice(0,2).map(p => (
                      <span key={p} style={{ fontSize:10, fontWeight:700, color:ind.color, background:`${ind.color}10`, borderRadius:4, padding:"2px 7px" }}>{p.split(" ")[0]}</span>
                    ))}
                  </div>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4 OUR PRODUCTS interactive list-left / showcase-right
// ═══════════════════════════════════════════════════════════════════════════════
function ProductsSection({ setCurrentPage }) {
  const [activeId, setActiveId] = useState(HP_PRODUCTS[0].id);
  const active = HP_PRODUCTS.find(p => p.id === activeId);

  return (
    <section style={{ background:LC.bg, padding:"120px clamp(24px,5vw,80px)" }}>
      <div style={{ maxWidth:1360, margin:"0 auto" }}>
        <Reveal>
          <div style={{ marginBottom:52 }}>
            <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:12 }}>OUR PRODUCTS</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:16 }}>
              <h2 style={{ fontSize:"clamp(30px,3.5vw,50px)", fontWeight:900, color:LC.navy, fontFamily:font, lineHeight:1.06, letterSpacing:"-0.035em", margin:0 }}>
                Eight platforms. Select one<br/>to see what it solves.
              </h2>
              <button type="button" onClick={() => setCurrentPage("products")}
                style={{ background:"none", border:`1.5px solid ${LC.borderStrong}`, color:LC.navy, borderRadius:9, padding:"11px 22px", fontFamily:font, fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.22s", whiteSpace:"nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.background=LC.navy; e.currentTarget.style.color=LC.white; }}
                onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color=LC.navy; }}>
                View all products →
              </button>
            </div>
          </div>
        </Reveal>

        <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:0, background:LC.bgAlt, borderRadius:24, overflow:"hidden", border:`1px solid ${LC.border}`, boxShadow:"0 4px 32px rgba(6,24,40,0.06)" }} className="product-showcase-grid">
          {/* Left: product list */}
          <div style={{ padding:"8px 8px", borderRight:`1px solid ${LC.border}`, display:"flex", flexDirection:"column" }}>
            {HP_PRODUCTS.map(p => {
              const isActive = p.id === activeId;
              return (
                <button key={p.id} type="button" onClick={() => setActiveId(p.id)}
                  style={{
                    display:"flex", alignItems:"center", gap:10, textAlign:"left",
                    background: isActive ? LC.white : "transparent",
                    border:"none", borderRadius:12,
                    padding:"11px 14px",
                    cursor:"pointer",
                    boxShadow: isActive ? LC.shadow : "none",
                    transition:"all 0.22s",
                  }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:p.color, flexShrink:0, boxShadow: isActive ? `0 0 0 3px ${p.color}30` : "none", transition:"all 0.22s" }}/>
                  <span style={{ fontSize:13.5, fontWeight: isActive ? 800 : 500, color: isActive ? LC.navy : LC.textLight, fontFamily:font, lineHeight:1.2 }}>{p.name}</span>
                </button>
              );
            })}
            <div style={{ padding:"12px 14px", marginTop:"auto" }}>
              <div style={{ fontSize:11.5, color:LC.textMuted, fontFamily:font, lineHeight:1.6 }}>
                Hover a product to preview. Click <strong>Learn More</strong> to see the full page.
              </div>
            </div>
          </div>

          {/* Right: showcase */}
          <div key={active.id} style={{ display:"flex", flexDirection:"column", animation:"showcaseFadeIn 0.3s ease" }}>
            {/* Gradient header */}
            <div style={{ height:200, background:`linear-gradient(135deg, ${active.color}10, ${active.color}22)`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", flexShrink:0 }}>
              <div aria-hidden="true" style={{ position:"absolute", bottom:-30, right:-30, width:180, height:180, borderRadius:"50%", background:`${active.color}0A`, filter:"blur(30px)" }}/>
              <div style={{ textAlign:"center", position:"relative", zIndex:1 }}>
                <div style={{ fontSize:64, marginBottom:10 }}>{active.emoji}</div>
                <div style={{ fontSize:11, fontWeight:800, color:active.color, fontFamily:font, letterSpacing:"0.1em" }}>{active.category.toUpperCase()}</div>
              </div>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:active.color }}/>
            </div>
            {/* Content */}
            <div style={{ padding:"32px 36px 36px", flex:1, display:"flex", flexDirection:"column" }}>
              <h3 style={{ fontSize:"clamp(22px,2.4vw,30px)", fontWeight:900, color:LC.navy, fontFamily:font, letterSpacing:"-0.025em", margin:"0 0 6px" }}>{active.name}</h3>
              <div style={{ fontSize:13, color:active.color, fontWeight:700, fontFamily:font, letterSpacing:"0.04em", marginBottom:14 }}>{active.tagline}</div>
              <p style={{ fontSize:15, color:LC.textLight, fontFamily:font, lineHeight:1.78, margin:"0 0 22px" }}>{active.desc}</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px", marginBottom:28 }}>
                {active.benefits.map(b => (
                  <div key={b} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                    <span style={{ width:16, height:16, borderRadius:"50%", background:`${active.color}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={active.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    <span style={{ fontSize:13, color:LC.textLight, fontFamily:font, lineHeight:1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:"auto", display:"flex", gap:12, flexWrap:"wrap" }}>
                <button type="button" onClick={() => setCurrentPage(active.page)}
                  style={{ background:active.color, color:LC.white, border:"none", borderRadius:9, padding:"12px 24px", fontSize:14, fontWeight:700, fontFamily:font, cursor:"pointer", transition:"all 0.22s", boxShadow:`0 6px 24px ${active.color}30` }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform=""; }}>
                  Explore {active.name} →
                </button>
                <button type="button" onClick={() => setCurrentPage("contact")}
                  style={{ background:"transparent", color:LC.navy, border:`1.5px solid ${LC.borderStrong}`, borderRadius:9, padding:"12px 24px", fontSize:14, fontWeight:700, fontFamily:font, cursor:"pointer", transition:"all 0.22s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=LC.navy; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=LC.borderStrong; }}>
                  Book a demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §5 WHY CHOOSE editorial full-width numbered rows
// ═══════════════════════════════════════════════════════════════════════════════
function WhyChooseSection({ setCurrentPage }) {
  return (
    <section style={{ background:LC.bgAlt, padding:"120px clamp(24px,5vw,80px)" }}>
      <div style={{ maxWidth:1360, margin:"0 auto" }}>
        <Reveal>
          <div style={{ marginBottom:64 }}>
            <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:14 }}>WHY ORION SOFT</div>
            <h2 style={{ fontSize:"clamp(30px,3.8vw,54px)", fontWeight:900, color:LC.navy, fontFamily:font, lineHeight:1.05, letterSpacing:"-0.035em", maxWidth:600, margin:0 }}>
              Why businesses across Africa choose us.
            </h2>
          </div>
        </Reveal>

        <div style={{ display:"flex", flexDirection:"column" }}>
          {WHY_REASONS.map((r, i) => (
            <Reveal key={r.num} delay={i * 0.08}>
              <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:"0 clamp(28px,4vw,60px)", alignItems:"center", padding:"40px 0", borderTop:`1px solid ${LC.border}` }} className="why-row">
                {/* Number + title */}
                <div style={{ display:"flex", alignItems:"baseline", gap:20, minWidth:300 }}>
                  <span style={{ fontSize:"clamp(36px,5vw,64px)", fontWeight:900, color:`${r.color}22`, fontFamily:font, letterSpacing:"-0.04em", lineHeight:1, flexShrink:0 }}>{r.num}</span>
                  <div>
                    <span style={{ fontSize:9.5, fontWeight:800, color:r.color, fontFamily:font, letterSpacing:"0.1em", display:"block", marginBottom:6 }}>REASON {r.num}</span>
                    <span style={{ fontSize:"clamp(16px,1.8vw,20px)", fontWeight:800, color:LC.navy, fontFamily:font, lineHeight:1.2 }}>{r.title}</span>
                  </div>
                </div>
                {/* Body */}
                <p style={{ fontSize:15, color:LC.textLight, fontFamily:font, lineHeight:1.82, margin:0 }}>{r.body}</p>
                {/* Stat */}
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:"clamp(28px,3.5vw,44px)", fontWeight:900, color:r.color, fontFamily:font, letterSpacing:"-0.03em", lineHeight:1 }}>{r.stat}</div>
                  <div style={{ fontSize:11.5, color:LC.textMuted, fontFamily:font, marginTop:5, maxWidth:100, textAlign:"right", lineHeight:1.4 }}>{r.statLabel}</div>
                </div>
              </div>
            </Reveal>
          ))}
          <div style={{ borderTop:`1px solid ${LC.border}`, paddingTop:40 }}>
            <button type="button" onClick={() => setCurrentPage("about")}
              style={{ background:LC.navy, color:LC.white, border:"none", borderRadius:10, padding:"14px 28px", fontSize:14.5, fontWeight:700, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 20px rgba(6,24,40,0.2)", transition:"all 0.25s" }}
              onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform=""}>
              Read our full story →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §6 CUSTOMER SUCCESS STORIES dark auto-advancing carousel
// ═══════════════════════════════════════════════════════════════════════════════
function SuccessStoriesSection() {
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const go = (next) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => { setIdx(next); setAnimating(false); }, 280);
  };

  useEffect(() => {
    const t = setInterval(() => go((idx + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(t);
  }, [idx]);

  const t = TESTIMONIALS[idx];

  return (
    <section style={{ background:LC.bgSlate, padding:"120px clamp(24px,5vw,80px)", position:"relative", overflow:"hidden" }}>
      <div aria-hidden="true" style={{ position:"absolute", top:"10%", left:"-5%", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${t.productColor}06 0%, transparent 65%)`, transition:"all 1s ease" }}/>
      <div aria-hidden="true" style={{ position:"absolute", bottom:"-10%", right:"-5%", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle, ${t.productColor}05 0%, transparent 65%)`, transition:"all 1s ease" }}/>

      <div style={{ maxWidth:1360, margin:"0 auto", position:"relative", zIndex:1 }}>
        <Reveal>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:64, flexWrap:"wrap", gap:20 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:12 }}>CUSTOMER SUCCESS STORIES</div>
              <h2 style={{ fontSize:"clamp(28px,3.2vw,46px)", fontWeight:900, color:"#F2F6FF", fontFamily:font, lineHeight:1.06, letterSpacing:"-0.03em", margin:0 }}>
                What our clients say.
              </h2>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button type="button" onClick={() => go((idx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                style={{ width:44, height:44, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.22s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.06)"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button type="button" onClick={() => go((idx + 1) % TESTIMONIALS.length)}
                style={{ width:44, height:44, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.22s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.06)"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </Reveal>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"clamp(48px,6vw,88px)", alignItems:"center" }} className="intro-grid">
          {/* Quote */}
          <div style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(12px)" : "none", transition:"all 0.28s ease" }}>
            {/* Large decorative quote */}
            <div style={{ fontSize:120, lineHeight:0.8, color:t.productColor, fontFamily:"Georgia,serif", opacity:0.18, marginBottom:24, userSelect:"none" }}>"</div>
            <blockquote style={{ fontSize:"clamp(18px,2.2vw,26px)", fontWeight:500, color:"#E8EDF4", fontFamily:font, lineHeight:1.7, margin:"0 0 40px", letterSpacing:"-0.01em" }}>
              {t.quote}
            </blockquote>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:`${t.productColor}20`, border:`2px solid ${t.productColor}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                {t.name.split(" ").map(w => w[0]).join("").slice(0,2)}
              </div>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:"#F2F6FF", fontFamily:font }}>{t.name}</div>
                <div style={{ fontSize:13, color:"rgba(200,210,226,0.6)", fontFamily:font, marginTop:2 }}>{t.role} · {t.company}</div>
              </div>
            </div>
          </div>
          {/* Navigation panel */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {TESTIMONIALS.map((te, i) => (
              <button key={i} type="button" onClick={() => go(i)}
                style={{
                  background: i === idx ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${i === idx ? te.productColor + "40" : "rgba(255,255,255,0.06)"}`,
                  borderRadius:12, padding:"14px 16px", cursor:"pointer", textAlign:"left", transition:"all 0.22s",
                }}>
                <div style={{ fontSize:12.5, fontWeight:700, color: i === idx ? "#F2F6FF" : "rgba(200,210,226,0.55)", fontFamily:font }}>{te.name}</div>
                <div style={{ fontSize:11.5, color:"rgba(200,210,226,0.4)", fontFamily:font, marginTop:3 }}>{te.company}</div>
                {i === idx && <div style={{ width:32, height:2, background:te.productColor, borderRadius:1, marginTop:8 }}/>}
              </button>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div style={{ display:"flex", gap:8, marginTop:48, justifyContent:"center" }}>
          {TESTIMONIALS.map((_, i) => (
            <button key={i} type="button" onClick={() => go(i)}
              style={{ width: i===idx ? 28 : 8, height:8, borderRadius:4, background: i===idx ? LC.gold : "rgba(255,255,255,0.18)", border:"none", cursor:"pointer", padding:0, transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)" }}/>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §7 TECHNOLOGY STACK category rows with pill tags
// ═══════════════════════════════════════════════════════════════════════════════
function TechStackSection() {
  return (
    <section style={{ background:LC.bg, padding:"120px clamp(24px,5vw,80px)" }}>
      <div style={{ maxWidth:1360, margin:"0 auto" }}>
        <Reveal>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"clamp(40px,6vw,100px)", alignItems:"end", marginBottom:64 }} className="intro-grid">
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:12 }}>TECHNOLOGY STACK</div>
              <h2 style={{ fontSize:"clamp(28px,3.5vw,50px)", fontWeight:900, color:LC.navy, fontFamily:font, lineHeight:1.06, letterSpacing:"-0.035em", margin:0 }}>
                What we build<br/>our platforms with.
              </h2>
            </div>
            <p style={{ fontSize:16, color:LC.textLight, fontFamily:font, lineHeight:1.82, margin:0 }}>
              Orion Soft uses modern, battle-tested technologies chosen for performance, security, and long-term maintainability. Everything we ship is API-first and fully documented.
            </p>
          </div>
        </Reveal>

        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {TECH_STACK.map((row, i) => (
            <Reveal key={row.category} delay={i * 0.07}>
              <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", alignItems:"center", padding:"22px 0", borderTop:`1px solid ${LC.border}`, gap:24 }} className="tech-row">
                <div style={{ fontSize:12.5, fontWeight:800, color:LC.textMuted, fontFamily:font, letterSpacing:"0.08em" }}>{row.category.toUpperCase()}</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {row.items.map(item => (
                    <span key={item} style={{ fontSize:13.5, fontWeight:600, color:LC.navy, background:LC.bgAlt, border:`1px solid ${LC.border}`, borderRadius:8, padding:"6px 14px", fontFamily:font, transition:"all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background=LC.navy; e.currentTarget.style.color=LC.white; e.currentTarget.style.borderColor=LC.navy; }}
                      onMouseLeave={e => { e.currentTarget.style.background=LC.bgAlt; e.currentTarget.style.color=LC.navy; e.currentTarget.style.borderColor=LC.border; }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
          <div style={{ borderTop:`1px solid ${LC.border}` }}/>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §8 IMPLEMENTATION PROCESS horizontal numbered timeline
// ═══════════════════════════════════════════════════════════════════════════════
function ImplementationSection() {
  const [hov, setHov] = useState(null);
  return (
    <section style={{ background:LC.bgAlt, padding:"120px clamp(24px,5vw,80px)" }}>
      <div style={{ maxWidth:1360, margin:"0 auto" }}>
        <Reveal>
          <div style={{ textAlign:"center", marginBottom:72 }}>
            <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:14 }}>IMPLEMENTATION PROCESS</div>
            <h2 style={{ fontSize:"clamp(28px,3.5vw,50px)", fontWeight:900, color:LC.navy, fontFamily:font, lineHeight:1.06, letterSpacing:"-0.035em", margin:"0 auto 14px", maxWidth:540 }}>
              From kickoff to go-live what to expect.
            </h2>
            <p style={{ fontSize:16.5, color:LC.textLight, fontFamily:font, lineHeight:1.75, maxWidth:500, margin:"0 auto" }}>
              Every Orion Soft implementation follows a clear process. No surprises. No delays. Just a predictable path from scoping to a supported go-live.
            </p>
          </div>
        </Reveal>

        {/* Timeline */}
        <div style={{ position:"relative" }}>
          {/* Connecting line */}
          <div style={{ position:"absolute", top:30, left:"10%", right:"10%", height:2, background:`linear-gradient(90deg, ${LC.gold}30, ${LC.gold}60, ${LC.gold}30)`, zIndex:0 }} className="timeline-line"/>

          <div style={{ display:"grid", gridTemplateColumns:`repeat(${IMPL_STEPS.length}, 1fr)`, gap:16, position:"relative", zIndex:1 }} className="impl-grid">
            {IMPL_STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 0.09}>
                <div
                  onMouseEnter={() => setHov(step.num)}
                  onMouseLeave={() => setHov(null)}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", cursor:"default" }}>
                  {/* Step circle */}
                  <div style={{
                    width:60, height:60, borderRadius:"50%",
                    background: hov === step.num ? LC.navy : LC.white,
                    border:`2px solid ${hov === step.num ? LC.navy : LC.border}`,
                    boxShadow: hov === step.num ? "0 8px 32px rgba(6,24,40,0.2)" : LC.shadow,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    marginBottom:24, transition:"all 0.28s cubic-bezier(0.16,1,0.3,1)",
                    position:"relative",
                  }}>
                    <SvgIcon d={step.icon} size={22} color={hov === step.num ? LC.white : LC.gold}/>
                    <div style={{ position:"absolute", top:-4, right:-4, width:20, height:20, borderRadius:"50%", background:LC.gold, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:9, fontWeight:900, color:"#06100E", fontFamily:font }}>{i+1}</span>
                    </div>
                  </div>
                  {/* Step content */}
                  <div style={{ fontSize:10, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.1em", marginBottom:7 }}>{step.time}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:LC.navy, fontFamily:font, marginBottom:10 }}>{step.title}</div>
                  <p style={{ fontSize:13, color:LC.textLight, fontFamily:font, lineHeight:1.65, margin:0 }}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §9 BOOK FREE CONSULTATION dark split: left text+form, right contacts
// ═══════════════════════════════════════════════════════════════════════════════
function ConsultationSection({ setCurrentPage }) {
  const [form, setForm] = useState({ name:"", email:"", company:"", product:"", message:"" });
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const inp = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setState("loading");
    try {
      const res = await fetch("/api/contact", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ ...form, type:"demo", source:"homepage-consultation" }),
      });
      setState(res.ok ? "done" : "error");
    } catch { setState("error"); }
  };

  const inputStyle = {
    width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:9, padding:"12px 14px", fontSize:14.5, fontFamily:font,
    color:"#F2F6FF", outline:"none", transition:"border-color 0.2s", boxSizing:"border-box",
  };
  const onFocus = e => e.currentTarget.style.borderColor = LC.gold;
  const onBlur  = e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";

  return (
    <section style={{ background:LC.bgDark, padding:"120px clamp(24px,5vw,80px)", position:"relative", overflow:"hidden" }}>
      <div aria-hidden="true" style={{ position:"absolute", top:"-30%", right:"-5%", width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle, rgba(200,168,80,0.07) 0%, transparent 65%)" }}/>

      <div style={{ maxWidth:1360, margin:"0 auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"clamp(48px,6vw,100px)", alignItems:"start" }} className="intro-grid">

          {/* Left: form */}
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:16 }}>BOOK A FREE CONSULTATION</div>
            <h2 style={{ fontSize:"clamp(28px,3.5vw,46px)", fontWeight:900, color:"#F2F6FF", fontFamily:font, lineHeight:1.06, letterSpacing:"-0.035em", margin:"0 0 14px" }}>
              Talk to us. No sales pressure, just good advice.
            </h2>
            <p style={{ fontSize:16, color:"rgba(200,210,226,0.7)", fontFamily:font, lineHeight:1.8, margin:"0 0 36px" }}>
              Tell us what you're trying to solve. We'll listen, ask the right questions, and tell you honestly whether we're the right fit and which product or approach suits you best.
            </p>

            {state === "done" ? (
              <div style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:14, padding:"32px 28px", textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
                <div style={{ fontSize:18, fontWeight:800, color:"#6EE7B7", fontFamily:font, marginBottom:8 }}>Message received!</div>
                <div style={{ fontSize:14, color:"rgba(200,210,226,0.7)", fontFamily:font, lineHeight:1.65 }}>We'll be in touch within one business day. Check your email for a confirmation.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:"rgba(200,210,226,0.6)", fontFamily:font, letterSpacing:"0.06em", display:"block", marginBottom:7 }}>FULL NAME *</label>
                    <input name="name" value={form.name} onChange={inp} placeholder="Your name" required style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:"rgba(200,210,226,0.6)", fontFamily:font, letterSpacing:"0.06em", display:"block", marginBottom:7 }}>EMAIL *</label>
                    <input name="email" type="email" value={form.email} onChange={inp} placeholder="your@email.com" required style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(200,210,226,0.6)", fontFamily:font, letterSpacing:"0.06em", display:"block", marginBottom:7 }}>COMPANY / ORGANISATION</label>
                  <input name="company" value={form.company} onChange={inp} placeholder="Where do you work?" style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(200,210,226,0.6)", fontFamily:font, letterSpacing:"0.06em", display:"block", marginBottom:7 }}>WHICH PRODUCT INTERESTS YOU?</label>
                  <select name="product" value={form.product} onChange={inp} style={{ ...inputStyle, cursor:"pointer" }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Not sure yet need a recommendation</option>
                    {HP_PRODUCTS.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(200,210,226,0.6)", fontFamily:font, letterSpacing:"0.06em", display:"block", marginBottom:7 }}>WHAT WOULD YOU LIKE TO SOLVE?</label>
                  <textarea name="message" value={form.message} onChange={inp} rows={4} placeholder="Briefly describe your current challenge or what you're looking to build..." style={{ ...inputStyle, resize:"vertical", minHeight:110 }} onFocus={onFocus} onBlur={onBlur}/>
                </div>
                <button type="submit" disabled={state==="loading"}
                  style={{ background:LC.gold, color:"#06100E", border:"none", borderRadius:10, padding:"15px 28px", fontSize:15, fontWeight:800, fontFamily:font, cursor:state==="loading"?"wait":"pointer", opacity:state==="loading"?0.7:1, boxShadow:"0 6px 28px rgba(200,168,80,0.35)", transition:"all 0.25s", marginTop:4 }}
                  onMouseEnter={e => { if(state!=="loading") { e.currentTarget.style.background=LC.goldLight; e.currentTarget.style.transform="translateY(-2px)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.background=LC.gold; e.currentTarget.style.transform=""; }}>
                  {state==="loading" ? "Sending…" : "Book Free Consultation →"}
                </button>
                {state==="error" && <div style={{ fontSize:13, color:"#FCA5A5", fontFamily:font }}>Something went wrong. Please try again or email us directly.</div>}
              </form>
            )}
          </div>

          {/* Right: contact details + what to expect */}
          <Reveal delay={0.12}>
            <div>
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, padding:"32px 28px", marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.08em", marginBottom:20 }}>WHAT TO EXPECT</div>
                {[
                  { icon:"M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", text:"We respond within 1 business day" },
                  { icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", text:"30-min discovery call no pitch, just listening" },
                  { icon:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text:"Honest advice including if we're not the right fit" },
                  { icon:"M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", text:"A tailored proposal not a generic quote" },
                ].map(item => (
                  <div key={item.text} style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:16 }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:"rgba(200,168,80,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <SvgIcon d={item.icon} size={16} color={LC.gold}/>
                    </div>
                    <span style={{ fontSize:14, color:"rgba(200,210,226,0.75)", fontFamily:font, lineHeight:1.6, marginTop:6 }}>{item.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, padding:"28px" }}>
                <div style={{ fontSize:13, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.08em", marginBottom:18 }}>CONTACT DIRECTLY</div>
                {[
                  { icon:"M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label:"Email", val:"orionsoftlimited@gmail.com" },
                  { icon:"M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", label:"Phone", val:"08169577059" },
                  { icon:"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", label:"Location", val:"Nigeria · CAC RC 9535128" },
                ].map(item => (
                  <div key={item.label} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <SvgIcon d={item.icon} size={16} color="rgba(200,168,80,0.7)"/>
                    <div>
                      <span style={{ fontSize:11, fontWeight:700, color:"rgba(200,210,226,0.4)", fontFamily:font, letterSpacing:"0.06em", marginRight:8 }}>{item.label.toUpperCase()}</span>
                      <span style={{ fontSize:13.5, color:"rgba(200,210,226,0.75)", fontFamily:font }}>{item.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §10 LATEST NEWS asymmetric 1-large + 2-small grid
// ═══════════════════════════════════════════════════════════════════════════════
function LatestNewsSection({ setCurrentPage }) {
  const [feat, ...rest] = NEWS_ITEMS;
  return (
    <section style={{ background:LC.bg, padding:"120px clamp(24px,5vw,80px) 100px" }}>
      <div style={{ maxWidth:1360, margin:"0 auto" }}>
        <Reveal>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48, flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:LC.gold, fontFamily:font, letterSpacing:"0.14em", marginBottom:12 }}>LATEST UPDATES</div>
              <h2 style={{ fontSize:"clamp(28px,3.2vw,46px)", fontWeight:900, color:LC.navy, fontFamily:font, lineHeight:1.06, letterSpacing:"-0.03em", margin:0 }}>What's new at Orion Soft.</h2>
            </div>
          </div>
        </Reveal>

        <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:24 }} className="news-grid">
          {/* Large featured */}
          <Reveal>
            <article style={{ background:LC.bgAlt, borderRadius:20, overflow:"hidden", border:`1px solid ${LC.border}`, height:"100%", display:"flex", flexDirection:"column", transition:"all 0.28s cubic-bezier(0.16,1,0.3,1)" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow=LC.shadowMd; e.currentTarget.style.transform="translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform=""; }}>
              {/* Colour bar */}
              <div style={{ height:180, background:`linear-gradient(135deg, ${feat.color}12, ${feat.color}24)`, borderBottom:`3px solid ${feat.color}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:56 }}>📰</span>
              </div>
              <div style={{ padding:"28px 28px 32px", flex:1, display:"flex", flexDirection:"column" }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
                  <span style={{ fontSize:10.5, fontWeight:800, color:feat.color, background:`${feat.color}10`, borderRadius:5, padding:"3px 9px", fontFamily:font, letterSpacing:"0.06em" }}>{feat.tag}</span>
                  <span style={{ fontSize:12.5, color:LC.textMuted, fontFamily:font }}>{feat.date}</span>
                </div>
                <h3 style={{ fontSize:"clamp(18px,2vw,24px)", fontWeight:800, color:LC.navy, fontFamily:font, lineHeight:1.3, margin:"0 0 14px", letterSpacing:"-0.015em" }}>{feat.title}</h3>
                <p style={{ fontSize:14.5, color:LC.textLight, fontFamily:font, lineHeight:1.72, margin:"0 0 auto" }}>{feat.excerpt}</p>
                <button type="button" onClick={() => setCurrentPage("contact")}
                  style={{ marginTop:28, background:"none", border:"none", color:feat.color, fontFamily:font, fontSize:14, fontWeight:700, cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:6, transition:"gap 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.gap="10px"}
                  onMouseLeave={e => e.currentTarget.style.gap="6px"}>
                  Read more <span style={{ fontSize:16 }}>→</span>
                </button>
              </div>
            </article>
          </Reveal>

          {/* 2 small */}
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            {rest.map((n, i) => (
              <Reveal key={n.title} delay={0.1 + i*0.08} style={{ flex:1 }}>
                <article style={{ background:LC.bgAlt, borderRadius:18, overflow:"hidden", border:`1px solid ${LC.border}`, display:"flex", flexDirection:"column", height:"100%", transition:"all 0.28s cubic-bezier(0.16,1,0.3,1)" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow=LC.shadowMd; e.currentTarget.style.transform="translateY(-4px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform=""; }}>
                  <div style={{ height:4, background:n.color }}/>
                  <div style={{ padding:"22px 22px 24px", flex:1, display:"flex", flexDirection:"column" }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:n.color, background:`${n.color}10`, borderRadius:4, padding:"2px 8px", fontFamily:font, letterSpacing:"0.06em" }}>{n.tag}</span>
                      <span style={{ fontSize:11.5, color:LC.textMuted, fontFamily:font }}>{n.date}</span>
                    </div>
                    <h3 style={{ fontSize:16, fontWeight:800, color:LC.navy, fontFamily:font, lineHeight:1.35, margin:"0 0 10px" }}>{n.title}</h3>
                    <p style={{ fontSize:13, color:LC.textLight, fontFamily:font, lineHeight:1.65, margin:"0 0 auto", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{n.excerpt}</p>
                    <button type="button" onClick={() => setCurrentPage("contact")}
                      style={{ marginTop:16, background:"none", border:"none", color:n.color, fontFamily:font, fontSize:13, fontWeight:700, cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:5, transition:"gap 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.gap="9px"}
                      onMouseLeave={e => e.currentTarget.style.gap="5px"}>
                      Read more <span>→</span>
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════════
export default function HomePage({ setCurrentPage }) {
  return (
    <div style={{ background:LC.bg, overflowX:"hidden" }}>
      <HeroSection           setCurrentPage={setCurrentPage}/>
      <WhoWeAreSection       setCurrentPage={setCurrentPage}/>
      <IndustriesSection     setCurrentPage={setCurrentPage}/>
      <ProductsSection       setCurrentPage={setCurrentPage}/>
      <WhyChooseSection      setCurrentPage={setCurrentPage}/>
      <SuccessStoriesSection/>
      <TechStackSection/>
      <ImplementationSection/>
      <ConsultationSection   setCurrentPage={setCurrentPage}/>
      <LatestNewsSection     setCurrentPage={setCurrentPage}/>
    </div>
  );
}
