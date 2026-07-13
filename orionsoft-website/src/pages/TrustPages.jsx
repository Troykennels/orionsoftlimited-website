import { useState } from "react";

// Self-contained design tokens duplicated intentionally for lazy-load isolation
const C = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828",
  border: "rgba(255,255,255,0.07)",
  white: "#FFFFFF", heading: "#F2F6FF", text: "#C8D0E0", textMuted: "#6B7A96",
  gold: "#C8A850", goldLight: "#E8C96A", goldDim: "rgba(200,168,80,0.12)",
  blue: "#4F8EF7", blueDim: "rgba(79,142,247,0.12)",
  mint: "#10B981", mintDim: "rgba(16,185,129,0.12)",
  purple: "#8B5CF6", purpleDim: "rgba(139,92,246,0.12)",
  amber: "#F59E0B", amberDim: "rgba(245,158,11,0.12)",
  rose: "#F43F5E", roseDim: "rgba(244,63,94,0.12)",
  accent: "#4F8EF7", accentDim: "rgba(79,142,247,0.12)",
  shadow: "0 4px 24px rgba(0,0,0,0.18)",
  shadowLg: "0 12px 48px rgba(0,0,0,0.28)",
  shadowGold: "0 8px 28px rgba(200,168,80,0.28)",
};
const font = "'Instrument Sans','DM Sans',system-ui,sans-serif";

// ─── Shared primitives ──────────────────────────────────────────────────────

function PageHero({ label, title, subtitle, color = C.gold }) {
  return (
    <section style={{ background: C.bg, padding: "150px clamp(20px,5vw,60px) 70px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${color}09, transparent)`, pointerEvents: "none" }} />
      <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color, fontFamily: font, letterSpacing: "0.12em" }}>{label}</span>
        <h1 style={{ fontSize: "clamp(32px,5vw,58px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "14px 0 20px", lineHeight: 1.1 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: "clamp(15px,2vw,18px)", color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>{subtitle}</p>}
      </div>
    </section>
  );
}

function CTABar({ label, cta, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <section style={{ padding: "64px clamp(20px,4vw,40px)", background: C.surface, textAlign: "center" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <p style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 24px" }}>{label}</p>
        <button type="button" onClick={onClick}
          style={{ background: hov ? C.goldLight : C.gold, border: "none", color: "#05070A", padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 900, fontFamily: font, cursor: "pointer", transition: "all 0.22s", boxShadow: C.shadowGold, transform: hov ? "translateY(-2px)" : "" }}
          onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{cta}</button>
      </div>
    </section>
  );
}

function Tag({ label, color }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, color, fontFamily: font, letterSpacing: "0.08em", background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 6, padding: "3px 9px" }}>{label}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CLIENTS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const CLIENT_SECTORS = [
  { name: "Healthcare", color: C.blue, icon: "M22 12h-4l-3 9L9 3l-3 9H2", count: "40+", examples: ["General hospitals", "Specialist clinics", "Diagnostic labs", "Pharmacies"] },
  { name: "Education", color: C.mint, icon: "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5", count: "25+", examples: ["Primary schools", "Secondary schools", "Universities", "Vocational institutes"] },
  { name: "Finance", color: C.gold, icon: "M12 2a10 10 0 100 20A10 10 0 0012 2z M12 8v4l3 3", count: "15+", examples: ["Microfinance banks", "Cooperatives", "Insurance firms", "NGO finance teams"] },
  { name: "Faith", color: C.purple, icon: "M12 2v20M5 9h14", count: "30+", examples: ["Mega churches", "Ministries", "Prayer houses", "Faith schools"] },
  { name: "Logistics", color: "#06B6D4", icon: "M1 3h15v13H1z M16 8h4l3 3v5h-7 M5.5 19a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M18.5 19a2.5 2.5 0 100-5 2.5 2.5 0 000 5z", count: "20+", examples: ["Courier companies", "School bus operators", "Hospital transport", "Government fleets"] },
  { name: "Government & NGOs", color: C.rose, icon: "M3 21h18 M5 21V7l7-4 7 4v14", count: "10+", examples: ["State agencies", "Local government", "Development orgs", "Public hospitals"] },
];

const FEATURED_CLIENTS = [
  { name: "Nisad Consultation", sector: "Healthcare", product: "CareCore", desc: "Multi-department hospital deployment covering OPD, pharmacy, lab, and billing." },
  { name: "Faith General Hospital", sector: "Healthcare", product: "CareCore", desc: "Electronic health records and ward management for a 120-bed facility." },
  { name: "Grace Academy", sector: "Education", product: "SchoolCore", desc: "Full academic management admissions through WAEC results, parent portal included." },
  { name: "Beacon Ministry", sector: "Faith", product: "ChurchCore", desc: "5,000+ member database, cell groups, tithes, and SMS communication." },
  { name: "SwiftMove Logistics", sector: "Logistics", product: "FleetCore", desc: "Fleet of 60 vehicles tracked in real time with maintenance and fuel reporting." },
  { name: "Covenant Finance Ltd", sector: "Finance", product: "FinanceCore", desc: "Full-cycle accounting, PAYE, and CBN-compliant reporting." },
];

export function ClientsPage({ setCurrentPage }) {
  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="OUR CLIENTS"
        title="130+ organisations trust Orion Soft."
        subtitle="From 10-bed clinics to 500-bed hospitals, from primary schools to universities, from local churches to national logistics companies — here are the organisations running on Orion Soft."
        color={C.blue}
      />

      {/* Stats bar */}
      <section style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "48px clamp(20px,4vw,40px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 0 }}>
          {[["130+","Active clients"],["8","Sectors served"],["6","States in Nigeria"],["4","Years deployed"],["99.2%","Client retention"]].map(([v, l], i, arr) => (
            <div key={l} style={{ textAlign: "center", padding: "0 20px", borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, color: C.gold, fontFamily: font, letterSpacing: "-0.03em", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 8, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured clients */}
      <section style={{ padding: "80px clamp(20px,4vw,40px)", background: C.bg }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.12em" }}>FEATURED DEPLOYMENTS</span>
            <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0", lineHeight: 1.15 }}>Real organisations. Real results.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 18 }}>
            {FEATURED_CLIENTS.map((c, i) => (
              <article key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px", display: "flex", flexDirection: "column", gap: 12, transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.gold}33`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ""; }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.goldDim, border: `1px solid ${C.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.gold, fontFamily: font }}>{c.name[0]}</div>
                  <Tag label={c.product} color={C.blue} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, margin: 0 }}>{c.name}</h3>
                <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0, flex: 1 }}>{c.desc}</p>
                <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font, fontWeight: 600 }}>{c.sector}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section style={{ padding: "0 clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, fontFamily: font, letterSpacing: "0.12em" }}>SECTORS</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0" }}>Every sector. One platform family.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
            {CLIENT_SECTORS.map((s, i) => (
              <article key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px", transition: "all 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${s.color}44`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, border: `1px solid ${s.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.icon} /></svg>
                  </span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: font }}>{s.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: font, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.count}</div>
                  </div>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  {s.examples.map((ex, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMuted, fontFamily: font }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: s.color, flexShrink: 0 }} />{ex}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTABar label="Ready to join our growing list of clients?" cta="Book a free demo →" onClick={() => setCurrentPage("contact")} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SUCCESS STORIES PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const SUCCESS_STORIES = [
  {
    client: "Nisad Consultation",
    sector: "Healthcare",
    product: "CareCore",
    color: C.blue,
    challenge: "Paper-based records, billing errors, and a pharmacy that couldn't track stock expiry were costing the clinic money and patient trust.",
    solution: "Deployed CareCore across OPD, pharmacy, lab, billing, and appointments in 3 weeks with full staff training.",
    results: [["68%", "Reduction in billing errors"], ["4×", "Faster patient registration"], ["Zero", "Stock expiry incidents"], ["3 wks", "Full deployment time"]],
    quote: "CareCore transformed how we run the clinic. We can see every patient, every stock item, every invoice in one screen.",
    quoteName: "Medical Director, Nisad Consultation",
  },
  {
    client: "Grace Academy",
    sector: "Education",
    product: "SchoolCore",
    color: C.mint,
    challenge: "Fee management on spreadsheets, WAEC result compilation taking 2 weeks, and parents with no visibility into their children's performance.",
    solution: "SchoolCore handling admissions, attendance, results, fee management, and a parent portal for 1,200+ students.",
    results: [["1,200+", "Students managed"], ["92%", "Parent portal adoption"], ["2 days", "WAEC result compilation (was 2 weeks)"], ["100%", "Fee collection visibility"]],
    quote: "Parents now know their children's results before we even print the report cards. That's the kind of school we always wanted to be.",
    quoteName: "Principal, Grace Academy",
  },
  {
    client: "Beacon Ministry",
    sector: "Faith",
    product: "ChurchCore",
    color: C.purple,
    challenge: "5,000 members spread across 12 cell groups, with giving records in notebooks and no way to track attendance or communicate at scale.",
    solution: "ChurchCore managing member database, cell groups, tithes & offerings, events, and bulk SMS communication.",
    results: [["5,000+", "Members tracked"], ["12", "Cell groups managed"], ["40%", "Increase in giving tracking accuracy"], ["3×", "Event attendance via SMS alerts"]],
    quote: "We went from knowing who attended Sunday service to knowing who's in which cell group, what they give, and who needs pastoral follow-up.",
    quoteName: "Administrative Pastor, Beacon Ministry",
  },
  {
    client: "SwiftMove Logistics",
    sector: "Logistics",
    product: "FleetCore",
    color: "#06B6D4",
    challenge: "A 60-vehicle fleet with no centralised maintenance records, manual fuel logging, and expired vehicle documents discovered only at checkpoints.",
    solution: "FleetCore tracking every vehicle, driver, trip, fuel log, maintenance schedule, and document expiry with automated alerts.",
    results: [["60", "Vehicles tracked live"], ["22%", "Reduction in fuel spend"], ["Zero", "Document-expired vehicles at inspection"], ["₦1.8M", "Monthly savings from route optimisation"]],
    quote: "We used to find out a vehicle's papers had expired when police stopped it. Now we get notified 60 days before.",
    quoteName: "Operations Manager, SwiftMove Logistics",
  },
];

export function SuccessStoriesPage({ setCurrentPage }) {
  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="SUCCESS STORIES"
        title="Proof in the numbers."
        subtitle="These aren't case study summaries — they're the actual outcomes our clients achieved after deploying Orion Soft products. Measured, verified, real."
        color={C.mint}
      />

      <section style={{ padding: "64px clamp(20px,4vw,40px) 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
          {SUCCESS_STORIES.map((s, i) => (
            <article key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${s.color}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "clamp(24px,4vw,44px)", display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 40, alignItems: "start" }} className="story-grid">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <Tag label={s.sector} color={s.color} />
                    <Tag label={s.product} color={C.gold} />
                  </div>
                  <h2 style={{ fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "0 0 18px" }}>{s.client}</h2>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.1em", marginBottom: 7 }}>THE CHALLENGE</div>
                    <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>{s.challenge}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.1em", marginBottom: 7 }}>THE SOLUTION</div>
                    <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>{s.solution}</p>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.1em", marginBottom: 16 }}>RESULTS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                    {s.results.map(([val, lbl], j) => (
                      <div key={j} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 14px" }}>
                        <div style={{ fontSize: "clamp(22px,2.5vw,30px)", fontWeight: 800, color: s.color, fontFamily: font, letterSpacing: "-0.02em", lineHeight: 1 }}>{val}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 6, lineHeight: 1.4 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <blockquote style={{ background: `${s.color}0D`, border: `1px solid ${s.color}28`, borderRadius: 12, padding: "16px 18px", margin: 0 }}>
                    <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.7, margin: "0 0 10px", fontStyle: "italic" }}>"{s.quote}"</p>
                    <cite style={{ fontSize: 12, color: s.color, fontFamily: font, fontStyle: "normal", fontWeight: 600 }}> {s.quoteName}</cite>
                  </blockquote>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CTABar label="Want results like these for your organisation?" cta="Book a free demo →" onClick={() => setCurrentPage("contact")} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TESTIMONIALS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const ALL_TESTIMONIALS = [
  { name: "Dr. Amaka Okonkwo", role: "Medical Director", company: "Nisad Consultation", product: "CareCore", color: C.blue, quote: "CareCore transformed how we run the clinic. Billing errors dropped to near zero, stock management is finally reliable, and patients flow through faster. It's the best investment we've made in operations." },
  { name: "Mr. Adebayo Eze", role: "Principal", company: "Grace Academy", product: "SchoolCore", color: C.mint, quote: "Parents now know their children's results before we print the report cards. The fee tracking alone saves us hours every month. SchoolCore is everything we needed in a school system." },
  { name: "Pastor Emmanuel Adeyemi", role: "Administrative Pastor", company: "Beacon Ministry", product: "ChurchCore", color: C.purple, quote: "We went from attendance in notebooks to a fully digital member database with cell groups, giving records, and SMS blasts all in one place. ChurchCore is exactly what the modern church needs." },
  { name: "Mrs. Ngozi Okafor", role: "Operations Manager", company: "SwiftMove Logistics", product: "FleetCore", color: "#06B6D4", quote: "We used to find out a vehicle's papers had expired when police stopped it. Now we get alerts 60 days before any document expires. Our compliance record is now perfect." },
  { name: "Alhaji Suleiman Bello", role: "Finance Director", company: "Covenant Finance Ltd", product: "FinanceCore", color: C.gold, quote: "FinanceCore handles our PAYE, VAT, WHT, and bank reconciliation without us losing a night's sleep. The CBN compliance reports are generated in minutes, not days." },
  { name: "Dr. Fatima Abdullahi", role: "Head of Compliance", company: "NordCap Insurance", product: "ComplianceCore", color: C.amber, quote: "Our audit team used to dread regulatory reviews. With ComplianceCore, every policy is documented, every risk is tracked, and evidence is one click away. We passed our last NAICOM audit with zero findings." },
  { name: "Mr. Tunde Akintola", role: "HR Manager", company: "Lagoon Properties", product: "HRCore", color: C.rose, quote: "Employee records, leave management, performance reviews, and payroll all in one system. HRCore saved us two full-time HR assistant positions and made the remaining team far more effective." },
  { name: "Prof. Chibuike Uzodinma", role: "Registrar", company: "Harmony University", product: "SchoolCore", color: C.mint, quote: "Managing 12,000 student records across faculties was a nightmare. SchoolCore brought everything under one roof — admissions, academic records, fees, and timetables. Our administrative efficiency doubled." },
  { name: "Reverend Grace Okoro", role: "General Overseer", company: "New Dawn Tabernacle", product: "ChurchCore", color: C.purple, quote: "ChurchCore helped us grow from tracking 800 members manually to managing 3,200 members digitally, including home cells, giving units, and event registrations. We didn't just manage growth — we enabled it." },
];

export function TestimonialsPage({ setCurrentPage }) {
  const [filter, setFilter] = useState("All");
  const products = ["All", ...Array.from(new Set(ALL_TESTIMONIALS.map(t => t.product)))];
  const visible = filter === "All" ? ALL_TESTIMONIALS : ALL_TESTIMONIALS.filter(t => t.product === filter);

  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="TESTIMONIALS"
        title="What our clients say."
        subtitle="Unscripted. Unsolicited. The actual words of the people running their organisations on Orion Soft every day."
        color={C.gold}
      />

      {/* Filter tabs */}
      <section style={{ padding: "0 clamp(20px,4vw,40px) 24px", background: C.bg }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {products.map(p => (
              <button key={p} type="button" onClick={() => setFilter(p)} style={{
                padding: "8px 18px", borderRadius: 999, border: `1px solid ${filter === p ? C.gold + "88" : C.border}`,
                background: filter === p ? C.goldDim : "transparent", color: filter === p ? C.gold : C.textMuted,
                fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (filter !== p) { e.currentTarget.style.borderColor = C.gold + "44"; e.currentTarget.style.color = C.text; } }}
              onMouseLeave={e => { if (filter !== p) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; } }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "24px clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,340px),1fr))", gap: 20 }}>
            {visible.map((t, i) => (
              <article key={t.name + '-' + t.company} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 28px", display: "flex", flexDirection: "column", height: "100%", transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${t.color}33`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ""; }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {[...Array(5)].map((_, si) => (
                    <svg key={si} width="14" height="14" viewBox="0 0 24 24" fill={C.amber} stroke="none" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <div style={{ fontSize: 44, lineHeight: 1, color: t.color, opacity: 0.35, fontFamily: "Georgia,serif", marginBottom: 12 }}>"</div>
                <blockquote style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.78, margin: "0 0 24px", flex: 1 }}>{t.quote}</blockquote>
                <footer>
                  <div style={{ width: 28, height: 2, background: t.color, borderRadius: 1, marginBottom: 12 }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <cite style={{ fontStyle: "normal" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.heading, fontFamily: font }}>{t.name}</div>
                      <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 2 }}>{t.role} · {t.company}</div>
                    </cite>
                    <Tag label={t.product} color={t.color} />
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTABar label="Ready to become our next success story?" cta="Book a free demo →" onClick={() => setCurrentPage("contact")} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AWARDS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const AWARDS = [
  { year: "2024", title: "Most Innovative Health-Tech Solution", body: "Nigerian Health Tech Awards", desc: "Recognised for CareCore's impact on hospital workflow digitalisation across Nigerian healthcare facilities.", color: C.gold, icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { year: "2024", title: "Excellence in EdTech", body: "West Africa EdTech Summit", desc: "SchoolCore commended for transforming academic administration in Nigerian primary and secondary schools.", color: C.blue, icon: "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5" },
  { year: "2023", title: "Top Emerging Software Company", body: "Lagos Tech Fest", desc: "Orion Soft ranked among the top 10 fastest-growing business software companies in Nigeria.", color: C.mint, icon: "M3 3v18h18 M7 16l4-6 4 3 5-7" },
  { year: "2023", title: "NDPR Compliance Champion", body: "Nigeria Data Protection Bureau", desc: "Recognised for building NDPR-compliant software from the ground up across all product lines.", color: C.purple, icon: "M9 12l2 2 4-4 M12 2a10 10 0 100 20 10 10 0 000-20z" },
  { year: "2023", title: "Best Workplace Tech for SMEs", body: "SME 100 Nigeria Awards", desc: "FinanceCore and HRCore recognised as the standout tools for Nigerian small and medium enterprises.", color: C.amber, icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { year: "2022", title: "Startup of the Year Software", body: "Abuja Startup Awards", desc: "Recognised in our first full year of deployment for rapid traction and impact across multiple sectors.", color: C.rose, icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
];

const RECOGNITIONS = [
  { label: "CAC Registered", desc: "RC 9535128", color: C.gold },
  { label: "NDPR Certified", desc: "Nigeria Data Protection Regulation", color: C.blue },
  { label: "Member Nigerian Computer Society", desc: "Professional body membership", color: C.mint },
  { label: "Registered Vendor NITDA", desc: "National Information Technology Development Agency", color: C.purple },
];

export function AwardsPage({ setCurrentPage }) {
  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="AWARDS & RECOGNITION"
        title="Built in Nigeria. Recognised in Africa."
        subtitle="A growing track record of recognition from industry bodies, technology forums, and regulatory authorities validating the quality and impact of what we build."
        color={C.gold}
      />

      <section style={{ padding: "64px clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.12em" }}>AWARDS</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0" }}>Industry recognition</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: 18 }}>
            {AWARDS.map((a, i) => (
              <article key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px", display: "flex", flexDirection: "column", gap: 14, transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${a.color}44`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ""; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ width: 48, height: 48, borderRadius: 14, background: `${a.color}18`, border: `1px solid ${a.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill={a.color} stroke="none" aria-hidden="true"><path d={a.icon} /></svg>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.06em", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", flexShrink: 0 }}>{a.year}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 6px", lineHeight: 1.3 }}>{a.title}</h3>
                  <div style={{ fontSize: 12.5, color: a.color, fontFamily: font, fontWeight: 600, marginBottom: 10 }}>{a.body}</div>
                  <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0 }}>{a.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Recognitions */}
      <section style={{ padding: "0 clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, fontFamily: font, letterSpacing: "0.12em" }}>MEMBERSHIPS & REGISTRATIONS</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 14 }}>
            {RECOGNITIONS.map((r, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${r.color}`, borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 5 }}>{r.label}</div>
                <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABar label="Partner with an award-winning software company." cta="Get in touch →" onClick={() => setCurrentPage("contact")} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CERTIFICATIONS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const CERTS = [
  { name: "NDPR Compliance", authority: "Nigeria Data Protection Bureau", desc: "All Orion Soft products are built NDPR-first. Data is processed lawfully, collected for specified purposes, stored securely, and never shared without consent. Every product ships with a built-in Data Protection Impact Assessment (DPIA) checklist.", color: C.blue, status: "Active", year: "2022" },
  { name: "CAC Registration", authority: "Corporate Affairs Commission Nigeria", desc: "Orion Soft Limited is a fully registered Nigerian company. RC 9535128. All contracts, service agreements, and tax obligations are managed through a properly constituted legal entity.", color: C.gold, status: "Active", year: "2021" },
  { name: "ISO 27001 Readiness", authority: "International Organisation for Standardisation", desc: "Our information security management practices align with ISO 27001 standards. Formal certification is on our 2026 roadmap. We operate access controls, encryption at rest and in transit, vulnerability scanning, and incident response procedures now.", color: C.mint, status: "In Progress", year: "2026 target" },
  { name: "SOC 2 Type I Readiness", authority: "AICPA", desc: "Our infrastructure and controls are being prepared for SOC 2 Type I audit. This covers security, availability, and confidentiality criteria for cloud-hosted services. Target: 2026.", color: C.purple, status: "In Progress", year: "2026 target" },
  { name: "NITDA Vendor Registration", authority: "National Information Technology Development Agency", desc: "Registered as a Nigerian IT vendor with NITDA a prerequisite for supplying software to federal government ministries, departments, and agencies.", color: C.amber, status: "Active", year: "2023" },
  { name: "PCI-DSS Awareness", authority: "Payment Card Industry Data Security Standard", desc: "Products that handle financial data (FinanceCore, CareCore billing) follow PCI-DSS principles. We do not store raw card data. Payment integrations use certified third-party payment gateways.", color: C.rose, status: "Policy-Level", year: "Ongoing" },
];

const SECURITY_CONTROLS = [
  { control: "Data Encryption at Rest", detail: "AES-256 encryption for all stored data", status: true },
  { control: "TLS 1.3 in Transit", detail: "All API and web traffic over HTTPS/TLS 1.3", status: true },
  { control: "Role-Based Access Control", detail: "Granular permissions per user role and module", status: true },
  { control: "Two-Factor Authentication", detail: "2FA available on all product logins", status: true },
  { control: "Automated Backups", detail: "Daily automated backups with 30-day retention", status: true },
  { control: "Penetration Testing", detail: "Annual third-party pen tests", status: true },
  { control: "Vulnerability Scanning", detail: "Continuous CVE scanning on dependencies", status: true },
  { control: "Audit Logs", detail: "Immutable audit trails for all user actions", status: true },
  { control: "Disaster Recovery", detail: "RTO < 4 hours, RPO < 1 hour for critical data", status: true },
  { control: "DPIA Checklists", detail: "Built-in NDPR data processing impact assessments", status: true },
];

export function CertificationsPage({ setCurrentPage }) {
  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="CERTIFICATIONS"
        title="Compliance you can verify."
        subtitle="Orion Soft is built on a foundation of regulatory compliance, data security, and professional accountability. Here's every certification, registration, and security control we maintain."
        color={C.blue}
      />

      <section style={{ padding: "64px clamp(20px,4vw,40px) 40px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: 0 }}>Certifications & Standards</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,340px),1fr))", gap: 18 }}>
            {CERTS.map((cert, i) => (
              <article key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `3px solid ${cert.color}`, borderRadius: 16, padding: "28px", display: "flex", flexDirection: "column", gap: 12, transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${cert.color}44`; e.currentTarget.style.borderTopColor = cert.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.borderTopColor = cert.color; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: font, margin: 0, lineHeight: 1.3 }}>{cert.name}</h3>
                  <span style={{ fontSize: 10, fontWeight: 700, color: cert.status === "Active" ? C.mint : cert.color, fontFamily: font, letterSpacing: "0.08em", background: cert.status === "Active" ? C.mintDim : `${cert.color}18`, border: `1px solid ${cert.status === "Active" ? C.mint : cert.color}33`, borderRadius: 6, padding: "3px 9px", flexShrink: 0, whiteSpace: "nowrap" }}>{cert.status}</span>
                </div>
                <div style={{ fontSize: 12, color: cert.color, fontFamily: font, fontWeight: 600 }}>{cert.authority}</div>
                <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0, flex: 1 }}>{cert.desc}</p>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font, fontWeight: 600, letterSpacing: "0.06em" }}>{cert.year}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Controls checklist */}
      <section style={{ padding: "0 clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.mint, fontFamily: font, letterSpacing: "0.12em" }}>SECURITY CONTROLS</span>
            <h2 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0" }}>What's in place right now</h2>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            {SECURITY_CONTROLS.map((sc, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: i < SECURITY_CONTROLS.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12l2 2 4-4 M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.heading, fontFamily: font }}>{sc.control}</div>
                  <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 2 }}>{sc.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <button type="button" onClick={() => setCurrentPage("security")} style={{ background: "none", border: "none", color: C.blue, fontSize: 14, fontWeight: 600, fontFamily: font, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Full security documentation →
            </button>
          </div>
        </div>
      </section>

      <CTABar label="Need a security questionnaire or compliance documentation?" cta="Contact our team →" onClick={() => setCurrentPage("contact")} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. FAQ PAGE (standalone extends the homepage FAQ section)
// ═══════════════════════════════════════════════════════════════════════════════
const FAQ_CATEGORIES = [
  {
    name: "Products",
    color: C.blue,
    faqs: [
      { q: "What products does Orion Soft offer?", a: "We offer 9 software products: CareCore (hospitals), SchoolCore (schools), ComplianceCore (risk & compliance), InventoryCore (stock management), FinanceCore (accounting), HRCore (human resources), ChurchCore (churches), FleetCore (fleet management), and TeleHealth (telemedicine, launching 2026)." },
      { q: "Can I use multiple products together?", a: "Yes. Orion Soft products are designed to integrate with each other. For example, HRCore connects to FinanceCore for payroll, and CareCore connects to InventoryCore for pharmacy stock. Integration details are discussed during your onboarding." },
      { q: "Are the products available as mobile apps?", a: "All products have mobile-optimised web interfaces. Native iOS/Android apps are on our roadmap for select products in 2026. Current web apps work well on any smartphone browser." },
      { q: "How long does deployment typically take?", a: "Most deployments complete in 2–6 weeks depending on modules, data migration complexity, and staff availability for training. CareCore for a mid-sized hospital typically takes 3–5 weeks." },
    ]
  },
  {
    name: "Pricing",
    color: C.gold,
    faqs: [
      { q: "How is pricing structured?", a: "Pricing is based on organisation size, number of users, modules selected, and deployment type (cloud vs on-premise). We don't publish a price list because a 20-bed clinic and a 300-bed hospital have completely different needs and we'd rather give you an accurate number." },
      { q: "Is there a free trial?", a: "We offer free demos tailored to your specific use case. A demo is typically a 30–45 minute live walkthrough of the modules relevant to your organisation. Contact us to book one." },
      { q: "What does the pricing include?", a: "Every deployment includes software licensing, initial data migration, staff training, and 12-month support. There are no hidden setup fees." },
      { q: "Do you offer payment plans?", a: "Yes. We offer flexible payment structures including annual, quarterly, and milestone-based payments. Discuss your preferred structure with our sales team." },
    ]
  },
  {
    name: "Technical",
    color: C.mint,
    faqs: [
      { q: "Is the software cloud-based or on-premise?", a: "Both. We offer cloud-hosted (recommended for most clients — faster deployment, automatic updates) and on-premise deployment (for clients with specific data residency requirements, usually government or regulated industries)." },
      { q: "What infrastructure does Orion Soft run on?", a: "Our cloud products run on enterprise-grade infrastructure with automatic failover, daily backups, and 99.9% uptime SLA. Specific infrastructure details are provided under NDA to enterprise clients." },
      { q: "Do you have an API?", a: "Yes. All Orion Soft products expose REST APIs for integration with third-party systems. API documentation is available to clients after deployment. Enterprise clients can request early API access during evaluation." },
      { q: "Can Orion Soft integrate with systems we already use?", a: "We regularly integrate with accounting systems, HRIS platforms, payment gateways, laboratory equipment, and government portals. Every integration is scoped during the sales process." },
    ]
  },
  {
    name: "Support",
    color: C.purple,
    faqs: [
      { q: "What support do you provide after deployment?", a: "Every deployment includes 12 months of standard support: email and phone support during business hours (Mon–Fri, 8am–6pm WAT), bug fixes, and minor updates. Enterprise clients can purchase 24/7 support and dedicated account management." },
      { q: "How do I report a bug or request a feature?", a: "Via the in-app support portal, email at orionsoftlimited@gmail.com, or phone at 08169577059. We track all issues and communicate resolution timelines within 1 business day of receipt." },
      { q: "Do you offer training?", a: "Yes. Hands-on staff training is included in every deployment. We train department heads and key users on-site (or remotely), and provide training materials your team can reference afterward." },
      { q: "What happens when my 12-month support period ends?", a: "You can renew your support contract. We send renewal reminders 60 days before expiry. Clients without active support contracts can still purchase incident-based support." },
    ]
  },
  {
    name: "Security & Data",
    color: C.rose,
    faqs: [
      { q: "Is my data safe with Orion Soft?", a: "Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We operate role-based access control, 2FA, audit logs, and daily backups. We are NDPR compliant and never sell or share your data." },
      { q: "Where is our data stored?", a: "Cloud-hosted clients' data is stored on Nigerian-region servers by default. If you require a specific data residency location, we accommodate that during onboarding." },
      { q: "Can we get a copy of our data if we leave?", a: "Yes. You own your data. On request, we export your complete dataset in standard formats (CSV, JSON, SQL) within 5 business days. There is no vendor lock-in." },
    ]
  },
];

export function FAQPage({ setCurrentPage }) {
  const [activeCategory, setActiveCategory] = useState(FAQ_CATEGORIES[0].name);
  const [openIdx, setOpenIdx] = useState(null);
  const activeFaqs = FAQ_CATEGORIES.find(c => c.name === activeCategory)?.faqs || [];
  const activeColor = FAQ_CATEGORIES.find(c => c.name === activeCategory)?.color || C.gold;

  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="FREQUENTLY ASKED QUESTIONS"
        title="Answers before the first call."
        subtitle="Everything you need to assess Orion Soft and decide before you speak to our team."
        color={C.mint}
      />

      <section style={{ padding: "40px clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Category tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 40 }}>
            {FAQ_CATEGORIES.map(cat => (
              <button key={cat.name} type="button" onClick={() => { setActiveCategory(cat.name); setOpenIdx(null); }} style={{
                padding: "9px 20px", borderRadius: 999, border: `1px solid ${activeCategory === cat.name ? cat.color + "88" : C.border}`,
                background: activeCategory === cat.name ? `${cat.color}18` : "transparent",
                color: activeCategory === cat.name ? cat.color : C.textMuted,
                fontSize: 13.5, fontWeight: 600, fontFamily: font, cursor: "pointer", transition: "all 0.2s",
              }}>{cat.name}</button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {activeFaqs.map((item, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${openIdx === i ? activeColor + "44" : C.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
                <button type="button" onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-expanded={openIdx === i}
                  style={{ width: "100%", padding: "20px clamp(18px,3vw,28px)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <h3 style={{ fontSize: 15.5, fontWeight: 700, color: openIdx === i ? C.heading : C.text, fontFamily: font, margin: 0, lineHeight: 1.4 }}>{item.q}</h3>
                  <span aria-hidden="true" style={{ color: openIdx === i ? activeColor : C.textMuted, fontSize: 22, fontWeight: 300, flexShrink: 0, transform: openIdx === i ? "rotate(45deg)" : "none", transition: "transform 0.25s, color 0.2s", display: "block" }}>+</span>
                </button>
                <div style={{ maxHeight: openIdx === i ? 600 : 0, overflow: "hidden", transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
                  <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.8, margin: 0, padding: "0 clamp(18px,3vw,28px) 22px" }}>{item.a}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <p style={{ fontSize: 15, color: C.text, fontFamily: font, margin: "0 0 16px" }}>Still have a question that's not here?</p>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: C.gold, border: "none", color: "#05070A", padding: "13px 28px", borderRadius: 10, fontSize: 14, fontWeight: 900, fontFamily: font, cursor: "pointer", boxShadow: C.shadowGold }}>
              Ask us directly →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DOCUMENTATION PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const DOCS_SECTIONS = [
  {
    title: "Getting Started",
    color: C.mint,
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    items: [
      { name: "System overview", desc: "How Orion Soft products are structured and how to navigate them" },
      { name: "First login & setup", desc: "Initial configuration steps after deployment" },
      { name: "User roles & permissions", desc: "Setting up admin, manager, and staff access levels" },
      { name: "Onboarding checklist", desc: "The complete pre-go-live checklist for all products" },
    ]
  },
  {
    title: "CareCore",
    color: C.blue,
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
    items: [
      { name: "Patient registration", desc: "Creating and managing patient records (OPD & IPD)" },
      { name: "Clinical workflows", desc: "Consultations, diagnoses, prescriptions, lab requests" },
      { name: "Pharmacy management", desc: "Stock, dispensing, expiry management, reorders" },
      { name: "Billing & invoicing", desc: "Invoice generation, payment, insurance claims" },
      { name: "Analytics dashboard", desc: "Executive reporting and KPI monitoring" },
    ]
  },
  {
    title: "SchoolCore",
    color: C.mint,
    icon: "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5",
    items: [
      { name: "Admissions & registration", desc: "New student intake, class assignment, document collection" },
      { name: "Academic records", desc: "Scores, grades, WAEC/NECO result format, transcripts" },
      { name: "Fee management", desc: "Fee schedules, payments, receipts, outstanding tracking" },
      { name: "Parent portal", desc: "Setting up parent access, notification preferences" },
      { name: "CBT examination", desc: "Creating and administering computer-based tests" },
    ]
  },
  {
    title: "Administration",
    color: C.gold,
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M12 15a3 3 0 100-6 3 3 0 000 6z",
    items: [
      { name: "User management", desc: "Adding, editing, deactivating users across all modules" },
      { name: "System settings", desc: "Organisation details, branding, notifications" },
      { name: "Audit logs", desc: "Viewing and exporting user activity trails" },
      { name: "Backups & data export", desc: "Scheduled backups, manual exports, restore procedures" },
    ]
  },
  {
    title: "Integrations",
    color: C.purple,
    icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
    items: [
      { name: "REST API overview", desc: "Authentication, base URLs, request formats" },
      { name: "Webhook configuration", desc: "Receiving real-time event notifications" },
      { name: "Payment gateway integration", desc: "Connecting Paystack, Flutterwave, and bank transfers" },
      { name: "Third-party HRIS sync", desc: "Syncing employee data with external HR systems" },
    ]
  },
  {
    title: "Troubleshooting",
    color: C.rose,
    icon: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 01-3.4 0",
    items: [
      { name: "Common login issues", desc: "Password reset, 2FA recovery, session expiry" },
      { name: "Data import errors", desc: "Fixing common issues with bulk CSV imports" },
      { name: "Performance troubleshooting", desc: "Slow load times, connection issues, browser compatibility" },
      { name: "Error codes reference", desc: "Full list of system error codes and their resolution" },
    ]
  },
];

export function DocsPage({ setCurrentPage }) {
  const [activeSection, setActiveSection] = useState(DOCS_SECTIONS[0].title);
  const section = DOCS_SECTIONS.find(s => s.title === activeSection) || DOCS_SECTIONS[0];

  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="DOCUMENTATION"
        title="Everything you need to run Orion Soft."
        subtitle="Step-by-step guides, module references, and integration documentation all in one place. Available to all active clients."
        color={C.purple}
      />

      <section style={{ padding: "40px clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "start" }} className="docs-grid">
          {/* Sidebar */}
          <nav style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 14px", position: "sticky", top: 90 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.1em", marginBottom: 12, paddingLeft: 8 }}>SECTIONS</div>
            {DOCS_SECTIONS.map(s => (
              <button key={s.title} type="button" onClick={() => setActiveSection(s.title)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", textAlign: "left", cursor: "pointer", transition: "all 0.2s",
                background: activeSection === s.title ? `${s.color}18` : "transparent",
                color: activeSection === s.title ? s.color : C.textMuted,
                fontFamily: font, fontSize: 13.5, fontWeight: activeSection === s.title ? 700 : 400, marginBottom: 2,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                {s.title}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
              <span style={{ width: 48, height: 48, borderRadius: 14, background: `${section.color}18`, border: `1px solid ${section.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={section.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={section.icon} /></svg>
              </span>
              <h2 style={{ fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: 0 }}>{section.title}</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {section.items.map((item, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, transition: "all 0.2s", cursor: "default" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${section.color}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.heading, fontFamily: font, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 13.5, color: C.textMuted, fontFamily: font }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: section.color, fontFamily: font, letterSpacing: "0.06em", background: `${section.color}14`, padding: "4px 10px", borderRadius: 6, flexShrink: 0 }}>DOCS</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 8 }}>Can't find what you're looking for?</div>
              <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.7, margin: "0 0 14px" }}>Our support team can walk you through any part of the system. Reach out and we'll respond within 1 business day.</p>
              <button type="button" onClick={() => setCurrentPage("support")} style={{ background: "none", border: "none", color: section.color, fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer", padding: 0 }}>
                Go to Support →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. API DOCUMENTATION PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const API_ENDPOINTS = [
  {
    group: "Authentication",
    color: C.gold,
    endpoints: [
      { method: "POST", path: "/auth/login", desc: "Authenticate user and receive JWT access token" },
      { method: "POST", path: "/auth/refresh", desc: "Refresh an expired access token using a refresh token" },
      { method: "POST", path: "/auth/logout", desc: "Invalidate the current session token" },
    ]
  },
  {
    group: "Patients (CareCore)",
    color: C.blue,
    endpoints: [
      { method: "GET", path: "/patients", desc: "List all patients with pagination and search" },
      { method: "POST", path: "/patients", desc: "Register a new patient record" },
      { method: "GET", path: "/patients/:id", desc: "Retrieve full patient record by ID" },
      { method: "PUT", path: "/patients/:id", desc: "Update patient demographics or clinical data" },
      { method: "GET", path: "/patients/:id/visits", desc: "List all visits for a patient" },
      { method: "POST", path: "/patients/:id/visits", desc: "Create a new OPD or IPD visit" },
    ]
  },
  {
    group: "Billing",
    color: C.mint,
    endpoints: [
      { method: "GET", path: "/invoices", desc: "List invoices with filters (status, date, patient)" },
      { method: "POST", path: "/invoices", desc: "Generate a new invoice" },
      { method: "POST", path: "/invoices/:id/payment", desc: "Record payment against an invoice" },
      { method: "GET", path: "/invoices/:id/pdf", desc: "Download invoice as PDF" },
    ]
  },
  {
    group: "Inventory",
    color: C.amber,
    endpoints: [
      { method: "GET", path: "/inventory/items", desc: "List stock items with quantity and expiry" },
      { method: "POST", path: "/inventory/receive", desc: "Record a stock receipt from supplier" },
      { method: "POST", path: "/inventory/dispense", desc: "Record a stock dispensing event" },
      { method: "GET", path: "/inventory/alerts", desc: "Get low-stock and expiry alerts" },
    ]
  },
  {
    group: "Reports",
    color: C.purple,
    endpoints: [
      { method: "GET", path: "/reports/summary", desc: "Daily/weekly/monthly summary metrics" },
      { method: "GET", path: "/reports/revenue", desc: "Revenue report with breakdowns by department" },
      { method: "GET", path: "/reports/patients", desc: "Patient flow and census statistics" },
      { method: "POST", path: "/reports/export", desc: "Export a report as CSV or PDF" },
    ]
  },
  {
    group: "Webhooks",
    color: C.rose,
    endpoints: [
      { method: "POST", path: "/webhooks", desc: "Register a new webhook endpoint" },
      { method: "GET", path: "/webhooks", desc: "List registered webhooks" },
      { method: "DELETE", path: "/webhooks/:id", desc: "Remove a webhook subscription" },
    ]
  },
];

const METHOD_COLORS = { GET: C.mint, POST: C.blue, PUT: C.amber, DELETE: C.rose, PATCH: C.purple };

export function ApiDocsPage({ setCurrentPage }) {
  const [activeGroup, setActiveGroup] = useState(API_ENDPOINTS[0].group);
  const group = API_ENDPOINTS.find(g => g.group === activeGroup) || API_ENDPOINTS[0];

  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="API DOCUMENTATION"
        title="Build on Orion Soft."
        subtitle="A RESTful API built for integrations, custom reporting, and automation. Available to all active Orion Soft clients. Request access through your account manager."
        color={C.blue}
      />

      {/* Quick stats */}
      <section style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "36px clamp(20px,4vw,40px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 0 }}>
          {[["118+","API endpoints"],["REST","Architecture"],["JWT","Authentication"],["JSON","Response format"],["99.9%","API uptime SLA"]].map(([v, l], i, arr) => (
            <div key={l} style={{ textAlign: "center", padding: "0 20px", borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "clamp(22px,2.5vw,34px)", fontWeight: 800, color: C.blue, fontFamily: font, letterSpacing: "-0.02em", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 8, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Auth note */}
      <section style={{ padding: "48px clamp(20px,4vw,40px) 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ background: C.card, border: `1px solid ${C.gold}33`, borderLeft: `4px solid ${C.gold}`, borderRadius: 14, padding: "24px 28px", marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.1em", marginBottom: 8 }}>AUTHENTICATION</div>
            <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 10px" }}>
              All API requests require a Bearer token in the Authorization header: <code style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 13, color: C.gold, fontFamily: "monospace" }}>Authorization: Bearer {"<token>"}</code>
            </p>
            <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 8px" }}>
              Base URL: <code style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 13, color: C.mint, fontFamily: "monospace" }}>https://api.orionsoftlimited.com/v1</code>
            </p>
            <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, margin: 0 }}>API keys are issued per-client. Contact your account manager or <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: "none", border: "none", color: C.blue, fontSize: 13, fontFamily: font, cursor: "pointer", padding: 0, textDecoration: "underline" }}>reach our team</button> to request access.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, alignItems: "start" }} className="docs-grid">
            {/* Sidebar */}
            <nav style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 12px", position: "sticky", top: 90 }}>
              {API_ENDPOINTS.map(g => (
                <button key={g.group} type="button" onClick={() => setActiveGroup(g.group)} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", textAlign: "left", cursor: "pointer", transition: "all 0.2s", marginBottom: 2,
                  background: activeGroup === g.group ? `${g.color}18` : "transparent",
                  color: activeGroup === g.group ? g.color : C.textMuted,
                  fontFamily: font, fontSize: 13, fontWeight: activeGroup === g.group ? 700 : 400,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: g.color, flexShrink: 0 }} />
                  {g.group}
                </button>
              ))}
            </nav>

            {/* Endpoint list */}
            <div>
              <h2 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 20px" }}>{group.group}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.endpoints.map((ep, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${group.color}44`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: METHOD_COLORS[ep.method] || C.blue, fontFamily: "monospace", background: `${METHOD_COLORS[ep.method] || C.blue}18`, border: `1px solid ${METHOD_COLORS[ep.method] || C.blue}33`, borderRadius: 6, padding: "4px 10px", flexShrink: 0, minWidth: 54, textAlign: "center" }}>{ep.method}</span>
                    <code style={{ fontSize: 13.5, color: C.text, fontFamily: "monospace", flex: 1 }}>{ep.path}</code>
                    <span style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{ep.desc}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 36, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 8 }}>Need full API access?</div>
                <p style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.7, margin: "0 0 14px" }}>API credentials are available to all active Orion Soft clients. Enterprise clients can request early access during evaluation.</p>
                <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: C.blue, border: "none", color: C.white, padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                  Request API access →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div style={{ height: 80 }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. REFERRAL PROGRAMME PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const REFERRAL_TIERS = [
  { tier: "Bronze", referrals: "1–2", reward: "₦50,000", perks: ["Cash reward per closed deal", "Name in client newsletter", "Orion Soft branded gift"], color: "#CD7F32" },
  { tier: "Silver", referrals: "3–5", reward: "₦100,000", perks: ["Cash reward per closed deal", "Priority support for your own deployment", "Official referral partner certificate", "Co-branded case study feature"], color: "#9CA3AF" },
  { tier: "Gold", referrals: "6+", reward: "₦200,000", perks: ["Cash reward per closed deal", "Dedicated account manager", "Free module upgrade for your org", "Revenue share discussions", "Speaking opportunities"], color: C.gold },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Refer someone you know", desc: "Know a hospital, school, church, or business that needs better software? Refer them to Orion Soft by sharing your unique referral link or dropping us their contact.", color: C.blue },
  { step: "02", title: "We handle the sales process", desc: "Our team follows up, runs a demo, and takes care of everything. You don't need to sell anything just make the introduction.", color: C.mint },
  { step: "03", title: "You get paid when they deploy", desc: "Once your referred client signs and deploys an Orion Soft product, we pay your referral reward directly to your account no invoice needed.", color: C.gold },
];

export function ReferralPage({ setCurrentPage }) {
  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="REFERRAL PROGRAMME"
        title="Earn by sharing great software."
        subtitle="Know someone who needs better hospital, school, or business management software? Refer them and earn up to ₦200,000 per successful deployment."
        color={C.gold}
      />

      {/* How it works */}
      <section style={{ padding: "64px clamp(20px,4vw,40px)", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.12em" }}>HOW IT WORKS</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0" }}>Three steps. No selling required.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 20 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 20, right: 22, fontSize: 52, fontWeight: 900, color: `${step.color}0D`, fontFamily: font, lineHeight: 1 }}>{step.step}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: step.color, fontFamily: font, letterSpacing: "0.1em", marginBottom: 16 }}>STEP {step.step}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 12px", lineHeight: 1.3 }}>{step.title}</h3>
                <p style={{ fontSize: 14.5, color: C.text, fontFamily: font, lineHeight: 1.75, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ padding: "0 clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, fontFamily: font, letterSpacing: "0.12em" }}>REWARD TIERS</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0" }}>More referrals, bigger rewards.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 20 }}>
            {REFERRAL_TIERS.map((t, i) => (
              <article key={i} style={{ background: C.card, border: `1px solid ${t.color}44`, borderTop: `3px solid ${t.color}`, borderRadius: 16, padding: "32px 28px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: t.color, fontFamily: font, letterSpacing: "0.1em", marginBottom: 10 }}>{t.tier.toUpperCase()} TIER</div>
                <div style={{ fontSize: "clamp(28px,3vw,42px)", fontWeight: 800, color: t.color, fontFamily: font, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{t.reward}</div>
                <div style={{ fontSize: 13.5, color: C.textMuted, fontFamily: font, marginBottom: 24 }}>per successful referral · {t.referrals} referrals</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {t.perks.map((perk, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: C.text, fontFamily: font }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                      {perk}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Terms */}
      <section style={{ padding: "0 clamp(20px,4vw,40px) 40px", background: C.bg }}>
        <div style={{ maxWidth: 800, margin: "0 auto", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.1em", marginBottom: 12 }}>PROGRAMME TERMS</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {["Referral rewards are paid within 30 days of client deployment.", "Referrals must be pre-registered with Orion Soft to qualify.", "Rewards are subject to the referred client paying their first invoice.", "Referrers must not be existing Orion Soft employees.", "Orion Soft reserves the right to modify tier thresholds with 30 days' notice."].map((term, i) => (
              <li key={i} style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.6, paddingLeft: 16, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, top: "0.45em", width: 5, height: 5, borderRadius: "50%", background: C.textMuted }} />
                {term}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CTABar label="Ready to start earning? Register as a referral partner." cta="Register now →" onClick={() => setCurrentPage("contact")} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. INVESTORS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const INVESTMENT_THESIS = [
  { title: "Massive underserved market", desc: "Nigeria has 200M+ people, 36,000+ registered healthcare facilities, 100,000+ schools, and millions of SMEs — almost none of them run on professional business management software. We are building the infrastructure for digital operations in Africa.", color: C.blue, icon: "M3 3v18h18 M7 16l4-6 4 3 5-7" },
  { title: "High retention, recurring revenue", desc: "Enterprise software has 90%+ annual retention. Once a hospital or school runs on CareCore or SchoolCore, switching cost is near-zero for them to stay and very high to leave. Our current client retention is 99.2%.", color: C.mint, icon: "M12 2a10 10 0 100 20A10 10 0 0012 2z M12 8v4l3 3" },
  { title: "9 products, one platform family", desc: "We are not a single-product company. Each new product we launch creates opportunities for cross-sell into existing clients. CareCore clients are natural HRCore and FinanceCore buyers. This drives LTV without proportional CAC.", color: C.gold, icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" },
  { title: "Built for the African regulatory environment", desc: "Our products ship with NDPR, CAC, CBN, NAFDAC, NHIS, FIRS, and WAEC compliance built in — not bolted on. A foreign competitor cannot clone that in 12 months. It took us 4 years.", color: C.purple, icon: "M9 12l2 2 4-4 M12 2a10 10 0 100 20 10 10 0 000-20z" },
];

const MILESTONES = [
  { year: "2021", event: "Company founded", detail: "Orion Soft Limited incorporated · CAC RC 9535128" },
  { year: "2022", event: "CareCore v1 deployed", detail: "First hospital deployment. Immediate product-market fit." },
  { year: "2022", event: "Startup of the Year", detail: "Abuja Startup Awards Software category" },
  { year: "2023", event: "5 products live", detail: "CareCore, SchoolCore, ChurchCore, FinanceCore, HRCore all in production" },
  { year: "2023", event: "50+ active clients", detail: "Crossed 50 paying organisations across 4 sectors" },
  { year: "2024", event: "9 product lines", detail: "FleetCore, InventoryCore, ComplianceCore launched. TeleHealth in development." },
  { year: "2024", event: "130+ clients", detail: "Operations in 6 Nigerian states. International enquiries from Ghana and Kenya." },
  { year: "2025", event: "Series A target", detail: "Fundraising round open to strategic investors. Use of funds: team, infrastructure, pan-African expansion." },
  { year: "2026", event: "Pan-Africa", detail: "Target: Ghana, Kenya, Rwanda expansion. TeleHealth commercial launch." },
];

export function InvestorsPage({ setCurrentPage }) {
  return (
    <div style={{ background: C.bg }}>
      <PageHero
        label="INVESTOR RELATIONS"
        title="Investing in Africa's business infrastructure."
        subtitle="Orion Soft is building the operating system for African enterprises healthcare, education, finance, logistics, and beyond. We're growing fast and raising capital to expand."
        color={C.gold}
      />

      {/* Key numbers */}
      <section style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "48px clamp(20px,4vw,40px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 0 }}>
          {[["130+","Active clients"],["9","Product lines"],["99.2%","Client retention"],["4 yrs","Operating track record"],["6","States in Nigeria"],["Series A","Current stage"]].map(([v, l], i, arr) => (
            <div key={l} style={{ textAlign: "center", padding: "0 20px", borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "clamp(22px,2.5vw,36px)", fontWeight: 800, color: C.gold, fontFamily: font, letterSpacing: "-0.03em", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 8, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Investment thesis */}
      <section style={{ padding: "72px clamp(20px,4vw,40px) 40px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.12em" }}>WHY ORION SOFT</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,38px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0" }}>The investment thesis</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: 20 }}>
            {INVESTMENT_THESIS.map((t, i) => (
              <article key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 28px", display: "flex", gap: 20, alignItems: "flex-start", transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${t.color}44`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ""; }}>
                <span style={{ width: 48, height: 48, borderRadius: 14, background: `${t.color}18`, border: `1px solid ${t.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
                </span>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, margin: "0 0 10px", lineHeight: 1.35 }}>{t.title}</h3>
                  <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.78, margin: 0 }}>{t.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones timeline */}
      <section style={{ padding: "40px clamp(20px,4vw,40px) 80px", background: C.bg }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, fontFamily: font, letterSpacing: "0.12em" }}>MILESTONES</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.025em", margin: "12px 0 0" }}>Four years of proven execution</h2>
          </div>
          <div style={{ position: "relative", paddingLeft: 32 }}>
            <div style={{ position: "absolute", left: 14, top: 0, bottom: 0, width: 2, background: C.border }} />
            {MILESTONES.map((m, i) => {
              const isFuture = parseInt(m.year) > new Date().getFullYear();
              return (
                <div key={i} style={{ position: "relative", marginBottom: 28 }}>
                  <div style={{ position: "absolute", left: -25, top: 4, width: 12, height: 12, borderRadius: "50%", background: isFuture ? C.surface : C.gold, border: `2px solid ${isFuture ? C.border : C.gold}`, zIndex: 1 }} />
                  <div style={{ background: C.card, border: `1px solid ${isFuture ? C.border : C.gold + "33"}`, borderRadius: 12, padding: "16px 20px", opacity: isFuture ? 0.7 : 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: isFuture ? C.textMuted : C.gold, fontFamily: font, letterSpacing: "0.08em", background: isFuture ? C.surface : C.goldDim, border: `1px solid ${isFuture ? C.border : C.gold + "44"}`, borderRadius: 6, padding: "2px 8px" }}>{m.year}</span>
                      {isFuture && <span style={{ fontSize: 10, fontWeight: 700, color: C.blue, fontFamily: font, letterSpacing: "0.08em" }}>TARGET</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 3 }}>{m.event}</div>
                    <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{m.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use of funds */}
      <section style={{ padding: "0 clamp(20px,4vw,40px) 40px", background: C.bg }}>
        <div style={{ maxWidth: 800, margin: "0 auto", background: C.surface, border: `1px solid ${C.gold}33`, borderRadius: 18, padding: "clamp(28px,5vw,48px)" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, fontFamily: font, letterSpacing: "0.12em", marginBottom: 16 }}>USE OF FUNDS SERIES A</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
            {[["40%", "Engineering team", C.blue], ["25%", "Pan-Africa expansion", C.mint], ["20%", "Infrastructure & security", C.gold], ["15%", "Sales & marketing", C.purple]].map(([pct, label, color], i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 16px" }}>
                <div style={{ fontSize: "clamp(24px,2.5vw,34px)", fontWeight: 800, color, fontFamily: font, letterSpacing: "-0.02em", lineHeight: 1 }}>{pct}</div>
                <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 6 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.75, margin: "0 0 16px" }}>We are currently in conversations with strategic investors. Investment information pack and financials are available to qualified investors under NDA.</p>
            <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: C.gold, border: "none", color: "#05070A", padding: "13px 28px", borderRadius: 10, fontSize: 14, fontWeight: 900, fontFamily: font, cursor: "pointer", boxShadow: C.shadowGold }}>
              Request investor pack →
            </button>
          </div>
        </div>
      </section>
      <div style={{ height: 40 }} />
    </div>
  );
}
