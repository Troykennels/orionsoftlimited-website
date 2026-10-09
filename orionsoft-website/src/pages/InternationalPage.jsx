// /international: for companies and organisations outside Nigeria looking for
// a software team, and for international organisations building for users in
// Africa. Claims here are ones the business stands behind (time zone, products
// in production, engagement models); keep them in step with the Clutch and
// GoodFirms profiles.
import { useEffect } from "react";
import { BRAND } from "../lib/brand.js";
import { INTERNATIONAL_FAQS } from "../lib/internationalFaqs.js";

const C = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828", raised: "#14203A",
  border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.16)",
  heading: "#F2F6FF", text: "#C8D0E0", textMuted: "#7D8BA6",
  gold: BRAND.gold, mint: "#10B981", blue: "#4F8EF7",
};
const font = "'Instrument Sans','DM Sans',system-ui,sans-serif";

const REASONS = [
  ["Your working hours, not ours", "Lagos runs on UTC+1 all year: the same time as London in summer and one hour ahead in winter, matching Paris and Berlin in winter. US East Coast mornings overlap with our afternoons."],
  ["Experienced engineers, fair rates", "Experienced engineers from under $25 an hour, with fixed-price quotes so you know the cost before work starts."],
  ["Software that's already in production", "We don't just build demos. Our hospital system, CareCore, runs in Nigerian hospitals today, and our school system runs in schools, handling real patients, students and money every day."],
  ["Built for hard conditions", "Our systems keep working offline and on slow connections, which makes everything we build sturdier, wherever your users are."],
  ["Clear, English-first communication", "Weekly demos of working software, written progress updates and a project lead you can reach directly, on Slack, Teams, Meet, Zoom, email or WhatsApp."],
  ["Africa expertise when you need it", "Launching in Africa? We know local payments, tax, data protection and how people actually use phones and the internet here."],
];

const SERVICES = [
  ["Web applications & SaaS", "Customer portals, dashboards, internal tools and full SaaS products, from first version to scale."],
  ["Mobile apps", "Android and iOS apps, including apps that work offline and sync when the connection returns."],
  ["Healthcare software", "Hospital, clinic, pharmacy and lab systems, patient records and claims, built on our experience with CareCore."],
  ["Education software", "School management, results, online exams and parent portals, built on our experience with SchoolCore."],
  ["Websites & e-commerce", "Fast, search-optimised business websites and online shops."],
  ["Support & maintenance", "Taking over, fixing and improving existing systems, with ongoing support after launch."],
];

const MODELS = [
  ["Fixed-price project", "A defined scope, a written fixed quote and payment by milestone. Best for new products and clear requirements."],
  ["Dedicated developer or team", "Engineers working on your product every month, managed by you or by us. Best for ongoing development."],
  ["Support & maintenance", "A monthly retainer to keep your software secure, up to date and improving after launch."],
];

const STEPS = [
  ["Free discovery call", "30 minutes on Zoom, Meet or Teams to understand what you need. We're happy to sign your NDA first."],
  ["Proposal & fixed quote", "A written scope, timeline and price, usually within a few working days, in USD, GBP or EUR."],
  ["Build in milestones", "Working software every week, so you see progress and can change direction early."],
  ["Launch & support", "We deploy, train your team and stay on to support and improve what we built."],
];

export default function InternationalPage({ setCurrentPage }) {
  useEffect(() => { document.title = "Software Development Company in Nigeria for International Clients | Orion Soft"; }, []);
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "clamp(18px,3vw,26px)" };
  const h2 = { fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: C.heading, letterSpacing: "-0.02em", margin: "0 0 8px" };
  const sub = { fontSize: 15.5, color: C.text, lineHeight: 1.7, margin: "0 0 22px", maxWidth: 720 };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 };
  const section = { maxWidth: 1160, margin: "0 auto", padding: "40px clamp(16px,4vw,32px)" };
  const primary = { background: C.gold, color: "#060810", border: "none", borderRadius: 12, padding: "14px 24px", fontWeight: 800, fontSize: 15, fontFamily: font, cursor: "pointer", textDecoration: "none", display: "inline-block" };
  const ghost = { ...primary, background: "transparent", color: C.heading, border: `1px solid ${C.borderStrong}`, fontWeight: 700 };
  const book = () => setCurrentPage("consultation");

  return (
    <div style={{ background: C.bg, fontFamily: font }}>
      <section style={{ padding: "150px clamp(16px,5vw,60px) 50px", textAlign: "center", background: `radial-gradient(ellipse 60% 45% at 50% 0%, ${C.gold}16, transparent)` }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: C.gold, letterSpacing: "0.14em" }}>FOR CLIENTS OUTSIDE NIGERIA</span>
        <h1 style={{ fontSize: "clamp(32px,5.4vw,60px)", fontWeight: 800, color: C.heading, letterSpacing: "-0.03em", margin: "14px auto 18px", lineHeight: 1.08, maxWidth: 940 }}>Your software team in Lagos, working on your time</h1>
        <p style={{ fontSize: "clamp(15px,2vw,19px)", color: C.text, lineHeight: 1.7, margin: "0 auto", maxWidth: 720 }}>Orion Soft builds web apps, mobile apps and business software for companies and organisations worldwide. Experienced engineers, fixed-price quotes, weekly demos, and software already running in hospitals and schools.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
          <button type="button" onClick={book} style={primary}>Book a free discovery call</button>
          <a href="mailto:orionsoftlimited@gmail.com?subject=Project%20enquiry%20from%20abroad" style={ghost}>Email us</a>
        </div>
        <div style={{ display: "flex", gap: "10px 26px", justifyContent: "center", flexWrap: "wrap", marginTop: 30, color: C.textMuted, fontSize: 13.5, fontWeight: 600 }}>
          <span>🕐 UTC+1, overlapping UK & EU hours</span><span>💬 English-first</span><span>📄 NDA on request</span><span>💳 Invoices in USD, GBP or EUR</span>
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Why international clients choose us</h2>
        <p style={sub}>A team that's easy to work with, at a price that makes sense, with the experience of shipping software people rely on every day.</p>
        <div style={grid}>
          {REASONS.map(([t, d]) => (
            <div key={t} style={card}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.heading, marginBottom: 8 }}>{t}</div>
              <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.65, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>What we build</h2>
        <p style={sub}>From a first version of your product to taking over and improving an existing system.</p>
        <div style={grid}>
          {SERVICES.map(([t, d]) => (
            <div key={t} style={{ ...card, borderLeft: `3px solid ${C.gold}` }}>
              <div style={{ fontSize: 16.5, fontWeight: 800, color: C.heading, marginBottom: 6 }}>{t}</div>
              <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.6, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <button type="button" onClick={() => setCurrentPage("case-studies")} style={ghost}>See case studies</button>
          <button type="button" onClick={() => setCurrentPage("products")} style={ghost}>Our products</button>
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>How we can work together</h2>
        <p style={sub}>Pick what suits your project. You can start with a fixed-price project and move to a dedicated team later.</p>
        <div style={grid}>
          {MODELS.map(([t, d], i) => (
            <div key={t} style={{ ...card, background: i === 0 ? `linear-gradient(160deg, ${C.raised}, ${C.card})` : C.card, borderColor: i === 0 ? `${C.gold}55` : C.border }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.heading, marginBottom: 8 }}>{t}</div>
              <p style={{ fontSize: 14.5, color: C.text, lineHeight: 1.65, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>From first call to launch</h2>
        <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", marginTop: 18 }}>
          {STEPS.map(([t, d], i) => (
            <div key={t} style={card}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${C.gold}22`, color: C.gold, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>{i + 1}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.heading, marginBottom: 6 }}>{t}</div>
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Questions from clients abroad</h2>
        <div style={{ ...card, marginTop: 16 }}>
          {INTERNATIONAL_FAQS.map(([q, a], i) => (
            <details key={q} style={{ borderTop: i ? `1px solid ${C.border}` : "none", padding: "14px 0" }}>
              <summary style={{ cursor: "pointer", color: C.heading, fontWeight: 700, fontSize: 15.5 }}>{q}</summary>
              <p style={{ color: C.text, fontSize: 14.5, lineHeight: 1.7, margin: "8px 0 0" }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section style={{ ...section, paddingBottom: 80 }}>
        <div style={{ ...card, textAlign: "center", padding: "clamp(28px,5vw,48px)", background: `linear-gradient(160deg, ${C.raised}, ${C.card})`, borderColor: `${C.gold}55` }}>
          <h2 style={{ ...h2, margin: "0 0 10px" }}>Tell us about your project</h2>
          <p style={{ ...sub, margin: "0 auto 24px" }}>Book a free 30-minute call at a time that suits you, or send a short brief by email or WhatsApp. We usually reply within one working day.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={book} style={primary}>Book a free call</button>
            <a href="mailto:orionsoftlimited@gmail.com?subject=Project%20enquiry%20from%20abroad" style={ghost}>orionsoftlimited@gmail.com</a>
            <a href="https://wa.me/2348169577059?text=Hello%20Orion%20Soft%2C%20I%27d%20like%20to%20discuss%20a%20project." target="_blank" rel="noopener noreferrer" style={ghost}>WhatsApp +234 816 957 7059</a>
          </div>
          <p style={{ color: C.textMuted, fontSize: 13, margin: "20px 0 0" }}>Orion Soft Limited · CAC RC 9535128 · Urban Prime 2, Abraham Adesanya, Ajah, Lagos, Nigeria</p>
        </div>
      </section>
    </div>
  );
}
