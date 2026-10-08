// Public pages that bring people and links to the site.
//   /paye-calculator  Free tool: Nigeria PAYE & take-home pay under the Nigeria
//                     Tax Act 2025 (in force 2026), compared with the old law.
//                     People search for it, share their results and link to
//                     it. ?embed=1 gives a compact version other sites embed.
//   /press            Press & media kit.
import { useEffect, useMemo, useState } from "react";
import { BRAND } from "../lib/brand.js";
import { computeNigerianPayroll, PAYE_BANDS } from "../../shared/payrollNg.js";
import { SHARE_TARGETS, openShare } from "../staff/api.js";
import { PAYE_FAQS as FAQS } from "../lib/payeFaqs.js";
import { usePublishedList } from "../lib/siteContent.js";

const C = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828", raised: "#14203A",
  border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.16)",
  heading: "#F2F6FF", text: "#C8D0E0", textMuted: "#7D8BA6",
  gold: BRAND.gold, goldDim: `rgba(${BRAND.rgb},0.12)`,
  mint: "#10B981", mintDim: "rgba(16,185,129,0.12)", rose: "#F43F5E", roseDim: "rgba(244,63,94,0.12)", blue: "#4F8EF7",
};
const font = "'Instrument Sans','DM Sans',system-ui,sans-serif";
const SITE = "https://www.orionsoftlimited.com";
const naira = n => `₦${Math.round(Number(n) || 0).toLocaleString("en-NG")}`;
const digits = s => Number(String(s).replace(/[^\d.]/g, "")) || 0;
const fmtInput = n => (n ? Math.round(n).toLocaleString("en-NG") : "");

// The old Personal Income Tax Act (to 31 Dec 2025), for the comparison:
// consolidated relief of the higher of ₦200,000 or 1% of gross, plus 20% of
// gross; pension/NHF/NHIS deductible; minimum tax of 1% of gross; minimum-wage
// earners exempt.
const OLD_BANDS = [[300_000, 0.07], [300_000, 0.11], [500_000, 0.15], [500_000, 0.19], [1_600_000, 0.21], [Infinity, 0.24]];
function bandTax(taxable, bands) {
  let left = Math.max(0, taxable), tax = 0;
  const rows = [];
  for (const [width, rate] of bands) {
    const slice = Math.min(left, width);
    rows.push({ width, rate, slice, tax: slice * rate });
    tax += slice * rate;
    left -= slice;
  }
  return { tax, rows };
}
function oldLawMonthlyPaye(grossMonthly, reliefsMonthly) {
  const annual = grossMonthly * 12;
  if (grossMonthly <= 70_000) return 0;
  const cra = Math.max(200_000, annual * 0.01) + annual * 0.2;
  const taxable = Math.max(0, annual - cra - reliefsMonthly * 12);
  return Math.max(bandTax(taxable, OLD_BANDS).tax, annual * 0.01) / 12;
}


function Toggle({ checked, onChange, label, hint }) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontFamily: font }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: C.gold }} />
      <span><span style={{ color: C.heading, fontSize: 14, fontWeight: 600 }}>{label}</span>{hint && <span style={{ display: "block", color: C.textMuted, fontSize: 12.5 }}>{hint}</span>}</span>
    </label>
  );
}

function MoneyField({ label, value, onChange, hint, id }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: font }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textMuted, fontWeight: 700, fontFamily: font }}>₦</span>
        <input id={id} inputMode="numeric" value={fmtInput(value)} onChange={e => onChange(digits(e.target.value))} placeholder="0"
          style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 12, padding: "13px 14px 13px 32px", color: C.heading, fontSize: 18, fontWeight: 700, fontFamily: font, outline: "none" }} />
      </div>
      {hint && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5, fontFamily: font }}>{hint}</div>}
    </div>
  );
}

function readParams() {
  const q = new URLSearchParams(window.location.search);
  const n = k => Math.max(0, Number(q.get(k)) || 0);
  return { salary: n("salary") || 250_000, period: q.get("period") === "annual" ? "annual" : "monthly", rent: n("rent"), pension: q.get("pension") !== "0", nhf: q.get("nhf") === "1", nhis: n("nhis") };
}

export function PayeCalculatorPage({ setCurrentPage }) {
  const embed = new URLSearchParams(window.location.search).has("embed");
  const [f, setF] = useState(readParams);
  const [shareFigures, setShareFigures] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");
  const set = k => v => setF(x => ({ ...x, [k]: v }));

  useEffect(() => {
    if (embed) return;
    document.title = "PAYE Calculator Nigeria 2026: Take-Home Pay Under the New Tax Act | Orion Soft";
  }, [embed]);

  const monthly = f.period === "annual" ? f.salary / 12 : f.salary;
  const r = useMemo(() => computeNigerianPayroll(monthly, { annualRent: f.rent, pension: f.pension, nhf: f.nhf, nhis: f.nhis }), [monthly, f.rent, f.pension, f.nhf, f.nhis]);
  const payeNow = r.deductions.find(d => d.kind === "paye")?.amount || 0;
  const reliefsMonthly = r.deductions.filter(d => d.kind !== "paye").reduce((s, d) => s + d.amount, 0);
  const payeOld = useMemo(() => oldLawMonthlyPaye(monthly, reliefsMonthly), [monthly, reliefsMonthly]);
  const saving = payeOld - payeNow;
  const bands = useMemo(() => bandTax(r.chargeableAnnual, PAYE_BANDS).rows.filter(b => b.slice > 0), [r.chargeableAnnual]);

  // Shareable link: no salary unless the person chooses to include it.
  const linkParams = new URLSearchParams();
  if (shareFigures) {
    linkParams.set("salary", Math.round(f.salary));
    if (f.period === "annual") linkParams.set("period", "annual");
    if (f.rent) linkParams.set("rent", Math.round(f.rent));
    if (!f.pension) linkParams.set("pension", "0");
    if (f.nhf) linkParams.set("nhf", "1");
    if (f.nhis) linkParams.set("nhis", Math.round(f.nhis));
  }
  const shareLink = `${SITE}/paye-calculator${linkParams.toString() ? `?${linkParams}` : ""}`;
  const shareText = shareFigures && saving > 1
    ? `Nigeria's new tax law (2026): I keep ${naira(saving)} more every month. Check your own take-home pay in 10 seconds:`
    : "How much tax will you pay under Nigeria's new tax law in 2026? Free take-home pay calculator:";
  const embedCode = `<iframe src="${SITE}/paye-calculator?embed=1" title="Nigeria PAYE calculator 2026" style="width:100%;max-width:720px;height:760px;border:0;border-radius:16px" loading="lazy"></iframe>\n<p style="font-size:12px">PAYE calculator by <a href="${SITE}/paye-calculator">Orion Soft</a></p>`;
  const copy = (text, what) => navigator.clipboard?.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(""), 2000); }).catch(() => {});

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "clamp(18px,3vw,28px)" };
  const h2 = { fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 14px", letterSpacing: "-0.02em" };

  const calculator = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 18, alignItems: "start" }}>
      <div style={{ ...card, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, background: C.surface, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }} role="radiogroup" aria-label="Salary period">
          {[["monthly", "Monthly salary"], ["annual", "Annual salary"]].map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={f.period === k} onClick={() => setF(x => ({ ...x, period: k, salary: k === x.period ? x.salary : k === "annual" ? x.salary * 12 : x.salary / 12 }))}
              style={{ flex: 1, background: f.period === k ? C.gold : "transparent", color: f.period === k ? "#060810" : C.text, border: "none", borderRadius: 9, padding: "9px 10px", fontWeight: 700, fontSize: 13.5, fontFamily: font, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        <MoneyField id="paye-salary" label={`Gross ${f.period} pay (before deductions)`} value={f.salary} onChange={set("salary")} />
        <MoneyField id="paye-rent" label="Rent you pay per year (optional)" value={f.rent} onChange={set("rent")} hint="20% of it, up to ₦500,000, is tax-free under the new law" />
        <Toggle checked={f.pension} onChange={set("pension")} label="I contribute to a pension (8%)" hint="Most employees do; it's deducted before tax" />
        <Toggle checked={f.nhf} onChange={set("nhf")} label="I contribute to the National Housing Fund (2.5%)" />
        <MoneyField id="paye-nhis" label="Health insurance (NHIS) per month (optional)" value={f.nhis} onChange={set("nhis")} />
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ ...card, background: `linear-gradient(160deg, ${C.raised}, ${C.card})`, borderColor: `${C.gold}44` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.1em", fontFamily: font }}>YOUR TAKE-HOME PAY (2026)</div>
          <div style={{ fontSize: "clamp(34px,6vw,48px)", fontWeight: 800, color: C.heading, fontFamily: font, letterSpacing: "-0.03em", margin: "6px 0 2px" }} aria-live="polite">{naira(r.net)}<span style={{ fontSize: 16, color: C.textMuted, fontWeight: 700 }}> / month</span></div>
          <div style={{ fontSize: 14, color: C.text, fontFamily: font }}>{naira(r.net * 12)} a year · PAYE {naira(payeNow)}/month · effective tax rate {r.effectiveTaxRate}%</div>
          {monthly > 0 && (
            <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: saving >= 0 ? C.mintDim : C.roseDim, color: saving >= 0 ? C.mint : C.rose, fontWeight: 700, fontSize: 14.5, fontFamily: font, lineHeight: 1.5 }}>
              {Math.abs(saving) < 1 ? "About the same tax as under the old law." : saving > 0
                ? <>You keep {naira(saving)} more a month ({naira(saving * 12)} a year) than under the old law.</>
                : <>You pay {naira(-saving)} more a month than under the old law.</>}
              <div style={{ fontSize: 12.5, fontWeight: 500, color: C.text, marginTop: 3 }}>Old law PAYE: {naira(payeOld)}/month · new law: {naira(payeNow)}/month</div>
            </div>
          )}
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 8 }}>Monthly breakdown</div>
          {[["Gross pay", r.gross, C.heading], ...r.deductions.map(d => [d.label, -d.amount, C.text]), ["Take-home pay", r.net, C.mint]].map(([l, v, col], i, a) => (
            <div key={l + i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: i === a.length - 1 ? `1px solid ${C.borderStrong}` : i ? `1px solid ${C.border}` : "none", fontFamily: font, fontSize: 14, fontWeight: i === 0 || i === a.length - 1 ? 800 : 500, color: col }}>
              <span>{l}</span><span>{v < 0 ? `− ${naira(-v)}` : naira(v)}</span>
            </div>
          ))}
        </div>
        {embed && <a href={`${SITE}/paye-calculator`} target="_blank" rel="noopener" style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, textAlign: "center", textDecoration: "none" }}>Free PAYE calculator by <strong style={{ color: C.gold }}>Orion Soft</strong></a>}
      </div>
    </div>
  );

  if (embed) return <div style={{ background: C.bg, padding: 14, minHeight: "100vh" }}>{calculator}</div>;

  return (
    <div style={{ background: C.bg, fontFamily: font }}>
      <section style={{ padding: "140px clamp(16px,5vw,60px) 30px", textAlign: "center", background: `radial-gradient(ellipse 60% 45% at 50% 0%, ${C.gold}14, transparent)` }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: C.gold, letterSpacing: "0.14em" }}>FREE TOOL · UPDATED FOR THE NIGERIA TAX ACT 2025</span>
        <h1 style={{ fontSize: "clamp(30px,5vw,54px)", fontWeight: 800, color: C.heading, letterSpacing: "-0.03em", margin: "14px auto 14px", lineHeight: 1.1, maxWidth: 900 }}>Nigeria PAYE &amp; Take-Home Pay Calculator 2026</h1>
        <p style={{ fontSize: "clamp(15px,2vw,18px)", color: C.text, lineHeight: 1.7, margin: "0 auto", maxWidth: 680 }}>See exactly how much tax comes out of your salary under the new law, how much you take home, and how it compares with last year. Free, instant, nothing to sign up for.</p>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "10px clamp(16px,4vw,32px) 40px" }}>
        {calculator}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 18, marginTop: 18 }}>
          <div style={card}>
            <h2 style={h2}>Share it</h2>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>Help friends and colleagues check theirs. Your salary isn't included unless you choose.</p>
            <Toggle checked={shareFigures} onChange={setShareFigures} label="Include my figures in the link" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {SHARE_TARGETS.filter(t => ["whatsapp", "x", "linkedin", "facebook", "telegram"].includes(t.id)).map(t => (
                <a key={t.id} href={t.build(shareLink, shareText)} target="_blank" rel="noopener noreferrer"
                  onClick={e => { e.preventDefault(); openShare(t, shareLink, shareText).then(m => { setNote(m); if (m) setTimeout(() => setNote(n => n === m ? "" : n), 15000); }); }}
                  style={{ background: t.id === "whatsapp" ? "#25D366" : C.surface, color: t.id === "whatsapp" ? "#062E16" : C.heading, border: `1px solid ${t.id === "whatsapp" ? "#25D366" : C.borderStrong}`, borderRadius: 10, padding: "9px 14px", fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}>{t.label}</a>
              ))}
              <button type="button" onClick={() => copy(`${shareText} ${shareLink}`, "link")} style={{ background: C.surface, color: C.heading, border: `1px solid ${C.borderStrong}`, borderRadius: 10, padding: "9px 14px", fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>{copied === "link" ? "Copied ✓" : "Copy link"}</button>
            </div>
            {note && <p role="status" style={{ fontSize: 13, color: C.textMuted, margin: "10px 0 0" }}>{note}</p>}
          </div>
          <div style={card}>
            <h2 style={h2}>For employers</h2>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>This employee costs you <strong style={{ color: C.heading }}>{naira(r.employerTotalCost)}</strong> a month, including employer pension (10%), NSITF (1%) and ITF (1%).</p>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>Orion Soft's HR &amp; payroll software works this out for your whole team every month, produces payslips and pension and PAYE schedules, and stays up to date with the law.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setCurrentPage("consultation")} style={{ background: C.gold, color: "#060810", border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 800, fontFamily: font, cursor: "pointer" }}>Book a free demo</button>
              <button type="button" onClick={() => setCurrentPage("hrcore")} style={{ background: "transparent", color: C.heading, border: `1px solid ${C.borderStrong}`, borderRadius: 10, padding: "11px 18px", fontWeight: 700, fontFamily: font, cursor: "pointer" }}>See HR &amp; payroll</button>
            </div>
          </div>
        </div>

        {bands.length > 0 && (
          <div style={{ ...card, marginTop: 18 }}>
            <h2 style={h2}>How your tax is worked out</h2>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>Chargeable income: <strong style={{ color: C.heading }}>{naira(r.chargeableAnnual)}</strong> a year (gross pay minus pension, NHF, health insurance{r.rentRelief ? ` and ${naira(r.rentRelief)} rent relief` : ""}).</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 420 }}>
                <thead><tr>{["Band", "Rate", "Your income in band", "Tax"].map(h => <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, padding: "8px 6px", borderBottom: `1px solid ${C.borderStrong}` }}>{h}</th>)}</tr></thead>
                <tbody>
                  {bands.map((b, i) => (
                    <tr key={i}><td style={{ padding: "8px 6px", color: C.text, borderBottom: `1px solid ${C.border}` }}>{b.width === Infinity ? "Above ₦50m" : `${i === 0 ? "First" : "Next"} ${naira(b.width)}`}</td>
                      <td style={{ padding: "8px 6px", color: C.heading, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{Math.round(b.rate * 100)}%</td>
                      <td style={{ padding: "8px 6px", color: C.text, borderBottom: `1px solid ${C.border}` }}>{naira(b.slice)}</td>
                      <td style={{ padding: "8px 6px", color: C.heading, borderBottom: `1px solid ${C.border}` }}>{naira(b.tax)}</td></tr>
                  ))}
                  <tr><td colSpan={3} style={{ padding: "10px 6px", color: C.heading, fontWeight: 800 }}>Annual PAYE</td><td style={{ padding: "10px 6px", color: C.gold, fontWeight: 800 }}>{naira(payeNow * 12)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ ...card, marginTop: 18 }}>
          <h2 style={h2}>Questions people ask</h2>
          {FAQS.map(([q, a]) => (
            <details key={q} style={{ borderTop: `1px solid ${C.border}`, padding: "12px 0" }}>
              <summary style={{ cursor: "pointer", color: C.heading, fontWeight: 700, fontSize: 15 }}>{q}</summary>
              <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7, margin: "8px 0 0" }}>{a}</p>
            </details>
          ))}
        </div>

        <div style={{ ...card, marginTop: 18 }}>
          <h2 style={h2}>Add this calculator to your website</h2>
          <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>Free for blogs, HR sites, news sites and schools. Paste this code where you want it to appear.</p>
          <pre style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, color: C.text, fontSize: 12.5, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: "0 0 10px" }}>{embedCode}</pre>
          <button type="button" onClick={() => copy(embedCode, "embed")} style={{ background: C.surface, color: C.heading, border: `1px solid ${C.borderStrong}`, borderRadius: 10, padding: "9px 14px", fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>{copied === "embed" ? "Copied ✓" : "Copy code"}</button>
        </div>

        <p style={{ color: C.textMuted, fontSize: 12.5, lineHeight: 1.6, margin: "18px 4px 0" }}>Estimates for salaried employees based on the Nigeria Tax Act 2025 (from 1 January 2026), the Personal Income Tax Act as amended (old-law comparison) and the Pension Reform Act 2014. Not tax advice; your actual PAYE may differ with other income, allowances or reliefs.</p>
      </section>
    </div>
  );
}

// ─── /press: press & media kit ──────────────────────────────────────────────
// What a journalist, blogger or event organiser needs to write about Orion
// Soft without having to ask: the approved description, key facts, logos,
// latest news and who to contact. The facts are the ones published elsewhere
// on the site (About page, Site Settings); keep them in step.
const BOILERPLATE = "Orion Soft Limited is a Nigerian software company (CAC RC 9535128) based in Lagos that builds business management software for African organisations, alongside custom websites, web apps and mobile apps. Its products include CareCore, a hospital management system running in Nigerian hospitals, SchoolCore for schools, and software for accounting and payroll, HR, inventory, compliance, churches and fleets. Orion Soft builds for local conditions: systems that keep working offline, Nigerian tax and regulatory rules, and on-site training and support.";

const PRESS_FACTS = [
  ["Company", "Orion Soft Limited"], ["Registration", "CAC RC 9535128"], ["Incorporated", "2022"],
  ["Headquarters", "Lagos Island, Lagos, Nigeria"], ["Serves", "Nigeria and the rest of Africa"],
  ["What we make", "Business management software (hospital, school, accounting & payroll, HR, inventory, compliance, church, fleet) and custom web and mobile software"],
  ["Flagship", "CareCore hospital management system, live in Nigerian hospitals"],
  ["Website", "www.orionsoftlimited.com"],
];

const STORY_IDEAS = [
  "Why many Nigerian hospitals still run on paper, and what it takes to change that",
  "Software that keeps working when the internet and power don't",
  "What the Nigeria Tax Act 2025 means for payslips (see our free PAYE calculator)",
  "Moving a school from spreadsheets to a management system in one term",
  "Building software for Nigerian rules: NDPA, NHIA claims, PAYE and pensions",
];

export function PressPage({ setCurrentPage }) {
  const posts = usePublishedList("orionsoft_blog_v1").filter(p => p && p.title && p.published !== false)
    .sort((a, b) => String(b.date || b.createdAt || "").localeCompare(String(a.date || a.createdAt || ""))).slice(0, 6);
  const [copied, setCopied] = useState(false);
  useEffect(() => { document.title = "Press & Media Kit | Orion Soft Limited"; }, []);
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "clamp(18px,3vw,28px)" };
  const h2 = { fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 14px", letterSpacing: "-0.02em" };
  const btn = { display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, color: C.heading, border: `1px solid ${C.borderStrong}`, borderRadius: 10, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, fontFamily: font, cursor: "pointer", textDecoration: "none" };
  return (
    <div style={{ background: C.bg, fontFamily: font }}>
      <section style={{ padding: "140px clamp(16px,5vw,60px) 30px", textAlign: "center", background: `radial-gradient(ellipse 60% 45% at 50% 0%, ${C.gold}14, transparent)` }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: C.gold, letterSpacing: "0.14em" }}>PRESS &amp; MEDIA</span>
        <h1 style={{ fontSize: "clamp(30px,5vw,54px)", fontWeight: 800, color: C.heading, letterSpacing: "-0.03em", margin: "14px auto", lineHeight: 1.1, maxWidth: 860 }}>Writing about Orion Soft?</h1>
        <p style={{ fontSize: "clamp(15px,2vw,18px)", color: C.text, lineHeight: 1.7, margin: "0 auto", maxWidth: 660 }}>Everything you need in one place: who we are, key facts, logos and our latest news. For interviews, comment or a product demo, contact our press desk.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
          <a href="mailto:orionsoftlimited@gmail.com?subject=Press%20enquiry" style={{ ...btn, background: C.gold, color: "#060810", border: "none" }}>Email the press desk</a>
          <a href="https://wa.me/2348169577059?text=Hello%2C%20I%27m%20writing%20about%20Orion%20Soft." target="_blank" rel="noopener noreferrer" style={btn}>WhatsApp us</a>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "10px clamp(16px,4vw,32px) 60px", display: "grid", gap: 18 }}>
        <div style={card}>
          <h2 style={h2}>About Orion Soft (approved description)</h2>
          <p style={{ color: C.text, fontSize: 15, lineHeight: 1.75, margin: "0 0 14px" }}>{BOILERPLATE}</p>
          <button type="button" style={btn} onClick={() => navigator.clipboard?.writeText(BOILERPLATE).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {})}>{copied ? "Copied ✓" : "Copy text"}</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 18 }}>
          <div style={card}>
            <h2 style={h2}>Fact sheet</h2>
            {PRESS_FACTS.map(([k, v]) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(100px, 130px) 1fr", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.border}`, fontSize: 14 }}>
                <span style={{ color: C.textMuted, fontWeight: 700 }}>{k}</span><span style={{ color: C.heading }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <h2 style={h2}>Logos &amp; images</h2>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <img src="/favicon.svg" alt="Orion Soft logo mark" width="72" height="72" />
              <div style={{ fontSize: 30, fontWeight: 800, color: C.heading, letterSpacing: "-0.02em" }}>Orion<span style={{ color: C.gold }}>Soft</span></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href="/favicon.svg" download="orion-soft-logo.svg" style={btn}>Logo mark (SVG)</a>
              <a href="/og-image.png" download="orion-soft-banner.png" style={btn}>Banner (PNG, 1200×630)</a>
              <a href="/og-image.svg" download="orion-soft-banner.svg" style={btn}>Banner (SVG)</a>
            </div>
            <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, margin: "14px 0 0" }}>Write the name as <strong style={{ color: C.text }}>Orion Soft</strong> or <strong style={{ color: C.text }}>Orion Soft Limited</strong>. Brand colours: gold #C8A850 on deep navy #060810. Please don't change the logo's colours or proportions.</p>
          </div>
        </div>

        <div style={card}>
          <h2 style={h2}>Latest news</h2>
          {posts.length === 0 && <p style={{ color: C.textMuted, margin: 0 }}>See our blog for the latest.</p>}
          {posts.map(p => (
            <a key={p.id || p.slug} href={`/blog/${encodeURIComponent(p.slug || p.id)}`} onClick={e => { e.preventDefault(); setCurrentPage("blog", p.slug || p.id); }}
              style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "12px 0", borderTop: `1px solid ${C.border}`, textDecoration: "none", flexWrap: "wrap" }}>
              <span style={{ color: C.heading, fontWeight: 700, fontSize: 15 }}>{p.title}</span>
              <span style={{ color: C.textMuted, fontSize: 13 }}>{[p.category, p.date].filter(Boolean).join(" · ")}</span>
            </a>
          ))}
        </div>

        <div style={card}>
          <h2 style={h2}>Stories we can talk about</h2>
          <p style={{ color: C.text, fontSize: 14.5, lineHeight: 1.6, marginTop: 0 }}>Our team is available for interviews, panels and expert comment on these and related topics:</p>
          <ul style={{ color: C.text, fontSize: 14.5, lineHeight: 1.9, margin: 0, paddingLeft: 20 }}>{STORY_IDEAS.map(i => <li key={i}>{i}</li>)}</ul>
        </div>

        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: C.heading, fontWeight: 800, fontSize: 18 }}>Press desk</div>
            <div style={{ color: C.text, fontSize: 14.5, marginTop: 4 }}>orionsoftlimited@gmail.com · +234 816 957 7059 (calls &amp; WhatsApp) · Lagos Island, Lagos</div>
          </div>
          <button type="button" onClick={() => setCurrentPage("about")} style={btn}>About the company</button>
        </div>
      </section>
    </div>
  );
}
