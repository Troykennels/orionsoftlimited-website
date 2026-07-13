import { useState, useEffect, useRef } from "react";

const T = {
  bg:         "#060810",
  surface:    "#0B1120",
  card:       "#0F1828",
  border:     "rgba(255,255,255,0.07)",
  borderGold: "rgba(200,168,80,0.25)",
  heading:    "#F2F6FF",
  text:       "#C8D0E0",
  muted:      "#6B7A96",
  gold:       "#C8A850",
  goldLt:     "#E8C96A",
  goldDim:    "rgba(200,168,80,0.12)",
  blue:       "#4F8EF7",
  blueDim:    "rgba(79,142,247,0.12)",
  mint:       "#10B981",
  mintDim:    "rgba(16,185,129,0.12)",
  purple:     "#8B5CF6",
  amber:      "#F59E0B",
  rose:       "#F43F5E",
};
const font = "'Instrument Sans','DM Sans',system-ui,sans-serif";

function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold: 0.06 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return <div ref={ref} style={{ opacity: v?1:0, transform: v?"none":"translateY(22px)", transition:`opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`, ...style }}>{children}</div>;
}

export default function WhyPage({ setCurrentPage }) {
  const values = [
    {
      color: T.blue,
      dim: T.blueDim,
      title: "Reliability",
      body: "We measure our success by uptime and client retention, not demos given. Every deployment runs on monitored infrastructure with a contractual 99.5% uptime SLA. We have never had a production outage longer than 4 hours.",
      path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    },
    {
      color: T.mint,
      dim: T.mintDim,
      title: "Accountability",
      body: "Every feature request, bug report, and support ticket is logged and assigned. We do not close tickets until clients confirm the issue is resolved. Our median response time for critical issues is under four hours.",
      path: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      color: T.gold,
      dim: T.goldDim,
      title: "Local Context",
      body: "Our products are built for Nigerian internet speeds, regulatory environments, and workflows. CBN compliance, NDPR obligations, WAEC result structures, and offline capability are native to our products, not patches applied after the fact.",
      paths: [
        "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
        "M15 11a3 3 0 11-6 0 3 3 0 016 0z",
      ],
    },
    {
      color: T.purple,
      dim: "rgba(139,92,246,0.12)",
      title: "Transparency",
      body: "Clients receive complete project documentation, API references, and technical handover notes at deployment. Nothing is locked in a black box. You own your data and your system. You can export at any time in standard formats.",
      paths: [
        "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
        "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
      ],
    },
    {
      color: T.amber,
      dim: "rgba(245,158,11,0.12)",
      title: "Partnership",
      body: "We do not disappear after go-live. Staff training, post-launch support, and quarterly product reviews are included in every deployment. Our longest client relationships have been running for over three years.",
      paths: [
        "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2",
        "M23 21v-2a4 4 0 00-3-3.87",
        "M16 3.13a4 4 0 010 7.75",
      ],
    },
    {
      color: T.rose,
      dim: "rgba(244,63,94,0.12)",
      title: "Innovation",
      body: "We invest in AI tooling (Ori assistant), modern serverless infrastructure, and product research driven by the people who use our software daily. Features come from listening, not from industry trend reports.",
      paths: [
        "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
      ],
    },
  ];

  const stats = [
    { num: "130+", label: "Organisations served", desc: "Hospitals, schools, churches, logistics companies, and government agencies across 6 Nigerian states." },
    { num: "6", label: "States covered", desc: "Active deployments from Lagos to Abuja, Kano to Port Harcourt, Enugu to Kaduna." },
    { num: "9", label: "Products in suite", desc: "From CareCore to FleetCore: purpose-built software for every sector we serve." },
    { num: "25+", label: "Core modules", desc: "Across OPD management, pharmacy, payroll, fleet tracking, compliance reporting, and more." },
    { num: "99.5%", label: "Uptime SLA", desc: "AWS-hosted infrastructure with Vercel edge delivery, monitored continuously with automated alerts." },
    { num: "4 years", label: "In production", desc: "First deployment in 2023. Products have been running in live environments for over four years." },
    { num: "118", label: "API endpoints", desc: "Fully documented REST API available to enterprise integration partners and clients' IT teams." },
    { num: "< 3 weeks", label: "Average deployment", desc: "From discovery call to go-live for standard-size organisations using our flagship products." },
  ];

  const partners = [
    {
      name: "AWS",
      badgeColor: "#FF9900",
      role: "Cloud Infrastructure",
      desc: "All Orion Soft products run on AWS infrastructure in the EU West and Middle East regions. We use EC2 for compute, S3 for document storage, and RDS for relational data. AWS's availability zones give our clients enterprise-grade uptime without local data centre costs.",
    },
    {
      name: "Vercel",
      badgeColor: T.blue,
      role: "Edge Deployment & CDN",
      desc: "Our client portals and public-facing applications deploy to Vercel's global edge network with automatic rollbacks and preview deployments for QA. Sub-100ms time-to-first-byte across Nigeria.",
    },
    {
      name: "Upstash",
      badgeColor: T.mint,
      role: "Serverless Redis",
      desc: "Upstash provides our real-time data layer: session management, visitor analytics, lead tracking, and API rate limiting. Per-request pricing and global replication keeps costs predictable and latency low.",
    },
    {
      name: "Groq",
      badgeColor: T.rose,
      role: "AI Inference",
      desc: "The Ori AI assistant across CareCore, SchoolCore, and ComplianceCore runs on Groq's LPU inference hardware. Under 100ms latency on most requests. Fast enough for Nigerian internet connections.",
    },
    {
      name: "GitHub",
      badgeColor: T.purple,
      role: "Version Control & CI/CD",
      desc: "All product codebases live on GitHub with branch protection, required code reviews, and automated CI checks before every production merge. Enterprise clients receive read-only changelog access.",
    },
    {
      name: "Flutterwave",
      badgeColor: T.amber,
      role: "Payment Processing",
      desc: "FinanceCore and CareCore billing integrate with Flutterwave for card payments, bank transfers, and USSD collection. Flutterwave handles PCI DSS compliance for card data.",
    },
  ];

  const editorialRows = [
    {
      num: "01",
      side: "left",
      headline: "We built for Nigeria, not adapted for it.",
      body: "Most enterprise software that reaches Nigerian organisations was designed for European or American markets and localised by changing currency symbols and adding a Nigeria dropdown option. We started from scratch. CBN compliance, NDPR obligations, IPPIS payroll formats, WAEC result structures, and offline capability on 3G networks are native to our products, not patches.",
    },
    {
      num: "02",
      side: "right",
      headline: "The engineers who build it also support it.",
      body: "We are a product company, not a reseller. The engineers who wrote your system are the same team who answers support tickets and deploys patches. There is no third-party implementation partner, no offshore helpdesk, and no 'raise a ticket and wait three days' culture. Our median response time for critical issues is under four hours.",
    },
    {
      num: "03",
      side: "left",
      headline: "Our pricing reflects the Nigerian market.",
      body: "We do not charge dollar-denominated SaaS fees that convert to unmanageable naira amounts when exchange rates move. Pricing is naira-fixed, published, and includes onboarding, training, and the first year of support. We have never had a client leave because of a billing surprise.",
    },
    {
      num: "04",
      side: "right",
      headline: "You get documentation, not dependencies.",
      body: "At project delivery, clients receive API documentation, user manuals, administrator guides, training videos, and a technical handover report. You are not dependent on us to make the system run. If you ever want to move to a different vendor, you can. Your data is exportable in standard formats and your team will know how to operate the system.",
    },
  ];

  const guarantees = [
    {
      color: T.mint,
      dim: T.mintDim,
      title: "30-day deployment guarantee",
      body: "For standard-size organisations using any single Orion Soft product, we guarantee full go-live within 30 days of contract signing, or we extend support at no charge until the system is live and your team is trained.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.mint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      color: T.blue,
      dim: T.blueDim,
      title: "12 months of support included",
      body: "Every deployment includes 12 months of standard support: bug fixes, security patches, helpdesk access, and quarterly product reviews. No separate support contract required for the first year.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
      ),
    },
    {
      color: T.gold,
      dim: T.goldDim,
      title: "Your data, always",
      body: "Your data is always yours. We do not sell, share, or use client data for any purpose other than running your system. Export your complete dataset at any time, in standard formats (CSV, JSON, Excel), with no request fee.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: font, background: T.bg, color: T.text, overflowX: "hidden" }}>

      <style>{`
        .why-btn-gold {
          display: inline-flex; align-items: center; gap: 6px;
          background: #C8A850; color: #060810;
          border: none; border-radius: 8px;
          padding: 13px 26px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: background 0.2s, transform 0.15s;
          font-family: inherit; text-decoration: none;
        }
        .why-btn-gold:hover { background: #E8C96A; transform: translateY(-1px); }
        .why-btn-outline {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; color: #C8D0E0;
          border: 1.5px solid rgba(255,255,255,0.18); border-radius: 8px;
          padding: 13px 26px; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: border-color 0.2s, color 0.2s, transform 0.15s;
          font-family: inherit; text-decoration: none;
        }
        .why-btn-outline:hover { border-color: rgba(200,168,80,0.5); color: #C8A850; transform: translateY(-1px); }
        .why-btn-outline-blue {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; color: #4F8EF7;
          border: 1.5px solid rgba(79,142,247,0.35); border-radius: 8px;
          padding: 13px 26px; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.15s;
          font-family: inherit; text-decoration: none;
        }
        .why-btn-outline-blue:hover { border-color: #4F8EF7; background: rgba(79,142,247,0.08); transform: translateY(-1px); }
        .value-card {
          background: #0F1828; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 28px 24px;
          transition: border-color 0.25s, transform 0.25s;
        }
        .value-card:hover { border-color: rgba(200,168,80,0.2); transform: translateY(-3px); }
        .stat-card {
          background: #0F1828; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 28px 24px;
          transition: border-color 0.25s, transform 0.25s;
        }
        .stat-card:hover { border-color: rgba(200,168,80,0.25); transform: translateY(-3px); }
        .partner-card {
          background: #ffffff; border: 1px solid #E8EDF5;
          border-radius: 14px; padding: 28px 24px;
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .partner-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08); transform: translateY(-3px); }
        .guarantee-card {
          background: #ffffff; border: 1px solid #E8EDF5;
          border-radius: 16px; padding: 36px 30px;
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .guarantee-card:hover { box-shadow: 0 10px 40px rgba(0,0,0,0.07); transform: translateY(-3px); }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; }
          .mv-grid { grid-template-columns: 1fr !important; }
          .values-grid { grid-template-columns: 1fr !important; }
          .mv-grid > div:last-child { border-left: none !important; padding-left: 0 !important; padding-top: 24px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .partners-grid { grid-template-columns: 1fr !important; }
          .guarantee-grid { grid-template-columns: 1fr !important; }
          .editorial-row { flex-direction: column !important; gap: 16px !important; }
          .editorial-number { font-size: 80px !important; }
        }
      `}</style>

      <section style={{ background: T.bg, position: "relative", overflow: "hidden", padding: "120px 24px 100px" }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(200,168,80,0.13) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <Reveal delay={0}>
            <div style={{ display: "inline-block", color: T.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
              WHY ORION SOFT
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 style={{ fontSize: "clamp(32px,5vw,58px)", fontWeight: 700, color: T.heading, lineHeight: 1.12, marginBottom: 24 }}>
              The enterprise software company built for Africa.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p style={{ fontSize: "clamp(15px,2vw,18px)", color: T.text, lineHeight: 1.75, maxWidth: 660, margin: "0 auto 40px" }}>
              We don't adapt foreign products for the Nigerian market. We build from scratch, starting from how organisations here actually work: the workflows, the regulations, the infrastructure, the budget.
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="why-btn-gold" onClick={() => setCurrentPage("consultation")}>
                Book a consultation →
              </button>
              <button className="why-btn-outline" onClick={() => setCurrentPage("products")}>
                See our products →
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ background: "#ffffff", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div className="mv-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
              <div>
                <div style={{ color: T.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
                  MISSION
                </div>
                <p style={{ fontSize: 17, color: "#334155", lineHeight: 1.8 }}>
                  We exist to build enterprise software that Nigerian organisations can own, operate, and grow on without depending on foreign vendors or paying for features they will never use. Every Orion Soft product starts from a documented understanding of how Nigerian organisations actually work, not how a software specification imagines they should work.
                </p>
              </div>
              <div style={{ borderLeft: "1px solid #E2E8F0", paddingLeft: 48 }}>
                <div style={{ color: "#94A3B8", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
                  VISION
                </div>
                <blockquote style={{ fontSize: "clamp(17px,2.2vw,22px)", fontStyle: "italic", color: "#0F172A", lineHeight: 1.65, fontWeight: 500 }}>
                  "A future where every hospital, school, government agency, and business in Africa runs on software built with the same rigour as global enterprise tools, at prices that make sense for local markets."
                </blockquote>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ background: T.bg, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                CORE VALUES
              </div>
              <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, color: T.heading }}>
                What we hold ourselves to.
              </h2>
            </div>
          </Reveal>
          <div className="values-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {values.map((v, i) => (
              <Reveal key={v.title} delay={0.06 * (i % 3)}>
                <div className="value-card">
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: v.dim, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={v.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {v.path && <path d={v.path} />}
                      {v.paths && v.paths.map((p, j) => <path key={j} d={p} />)}
                    </svg>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.heading, marginBottom: 10 }}>{v.title}</div>
                  <p style={{ fontSize: 14, color: T.text, lineHeight: 1.75 }}>{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: T.surface, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                COMPANY STATISTICS
              </div>
              <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, color: T.heading }}>
                By the numbers.
              </h2>
            </div>
          </Reveal>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={0.05 * (i % 4)}>
                <div className="stat-card">
                  <div style={{ fontSize: "clamp(26px,3vw,36px)", fontWeight: 800, color: T.gold, lineHeight: 1, marginBottom: 8 }}>
                    {s.num}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.heading, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {s.label}
                  </div>
                  <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "#F5F7FC", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                INFRASTRUCTURE WE BUILD ON
              </div>
              <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>
                Enterprise-grade stack. Production-tested.
              </h2>
              <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, maxWidth: 620, margin: "0 auto" }}>
                Every partner on this list is in active production use across our product deployments. No marketing affiliations. These are the actual tools our systems run on.
              </p>
            </div>
          </Reveal>
          <div className="partners-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {partners.map((p, i) => (
              <Reveal key={p.name} delay={0.06 * (i % 3)}>
                <div className="partner-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: p.badgeColor, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em", flexShrink: 0,
                    }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{p.role}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.72 }}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <p style={{ textAlign: "center", marginTop: 40, fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>
              All integrations are production-tested, documented, and maintained. Not affiliated or sponsored.
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ background: T.bg, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 72 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                WHY ORION SOFT
              </div>
              <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, color: T.heading }}>
                What makes us different.
              </h2>
            </div>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {editorialRows.map((row, i) => (
              <Reveal key={row.num} delay={0.05}>
                <div
                  className="editorial-row"
                  style={{
                    display: "flex",
                    flexDirection: row.side === "right" ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 40,
                    padding: "52px 0",
                    borderBottom: i < editorialRows.length - 1 ? `1px solid ${T.border}` : "none",
                  }}
                >
                  <div style={{ flexShrink: 0, width: 160, textAlign: row.side === "right" ? "right" : "left" }}>
                    <span
                      className="editorial-number"
                      style={{
                        fontSize: "clamp(80px,12vw,130px)",
                        fontWeight: 800,
                        color: "transparent",
                        WebkitTextStroke: `1.5px ${T.border}`,
                        lineHeight: 1,
                        display: "block",
                        userSelect: "none",
                      }}
                    >
                      {row.num}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "clamp(20px,2.5vw,26px)", fontWeight: 700, color: T.heading, marginBottom: 16, lineHeight: 1.25 }}>
                      {row.headline}
                    </h3>
                    <p style={{ fontSize: 16, color: T.text, lineHeight: 1.8 }}>{row.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "#ffffff", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div style={{ color: T.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                OUR COMMITMENTS
              </div>
              <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 700, color: "#0F172A" }}>
                Our commitments to every client.
              </h2>
            </div>
          </Reveal>
          <div className="guarantee-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {guarantees.map((g, i) => (
              <Reveal key={g.title} delay={0.07 * i}>
                <div className="guarantee-card" style={{ borderTop: `3px solid ${g.color}` }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: g.dim.replace("0.12", "0.1"), display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    {g.icon}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 14, lineHeight: 1.3 }}>{g.title}</h3>
                  <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.75 }}>{g.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: T.bg, padding: "100px 24px 120px", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(79,142,247,0.07) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <Reveal>
            <div style={{ color: T.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              GET STARTED
            </div>
            <h2 style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 700, color: T.heading, marginBottom: 20, lineHeight: 1.15 }}>
              Ready to see it in action?
            </h2>
            <p style={{ fontSize: 17, color: T.text, lineHeight: 1.75, marginBottom: 40 }}>
              Book a free 45-minute consultation. We'll understand your organisation's needs, show you the relevant product, and give you a clear deployment timeline and pricing. No sales pitch.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="why-btn-gold" onClick={() => setCurrentPage("consultation")}>
                Book a free consultation →
              </button>
              <button className="why-btn-outline-blue" onClick={() => setCurrentPage("contact")}>
                Talk to us now →
              </button>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
