// Free public API: Nigeria PAYE and take-home pay under the Nigeria Tax Act
// 2025, with the old-law comparison (and Kenya / Ghana with ?country=ke|gh). Documented at /developers. Open to any
// website or app (CORS *), rate-limited per IP so nobody can hammer the server.
//   GET /api/public/paye?salary=500000[&period=annual][&rent=1200000]
//       [&pension=0][&nhf=1][&nhis=5000][&pensionable=400000][&basic=250000]
import { payeSummary, PAYE_BANDS } from "../../shared/payrollNg.js";
import { kenyaPay, ghanaPay } from "../../shared/payrollAfrica.js";

const LIMIT = 60, WINDOW_MS = 60_000;
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) { hits.set(ip, { n: 1, reset: now + WINDOW_MS }); return false; }
  h.n++;
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  return h.n > LIMIT;
}

const MAX = 10_000_000_000;
const num = v => (v === undefined || v === "" ? undefined : Number(v));
const flag = (v, dflt) => (v === undefined || v === "" ? dflt : !["0", "false", "no", "off"].includes(String(v).toLowerCase()));

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  if (limited(ip)) { res.setHeader("Retry-After", "60"); return res.status(429).json({ error: `Too many requests: up to ${LIMIT} a minute. Try again shortly.` }); }

  const q = req.query;
  const period = q.period === "annual" ? "annual" : "monthly";
  const salary = num(q.salary);
  if (salary === undefined || !Number.isFinite(salary) || salary < 0 || salary > MAX) {
    return res.status(400).json({ error: "salary is required: gross pay in naira (monthly unless period=annual)", example: "/api/public/paye?salary=500000" });
  }
  const monthly = period === "annual" ? salary / 12 : salary;

  // ?country=ke | gh: Kenya / Ghana (shared/payrollAfrica.js). Default: Nigeria.
  const country = String(q.country || "ng").toLowerCase();
  if (country === "ke" || country === "gh") {
    const basicIn = num(q.basic), prov = num(q.provident);
    for (const [k, v] of [["basic", basicIn], ["provident", prov]]) {
      if (typeof v === "number" && (!Number.isFinite(v) || v < 0 || v > MAX)) return res.status(400).json({ error: `${k} must be a positive number` });
    }
    const r = country === "ke"
      ? kenyaPay(monthly, { pensionable: num(q.pensionable) })
      : ghanaPay(monthly, { basic: basicIn === undefined ? undefined : (period === "annual" ? basicIn / 12 : basicIn), providentPct: prov || 0 });
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.json({
      country: r.country, currency: r.currency,
      law: country === "ke" ? "Kenya: KRA PAYE bands, NSSF (Feb 2026), SHIF and Housing Levy deducted before tax (Tax Laws (Amendment) Act 2024)" : "Ghana: GRA resident rates effective 1 September 2026",
      input: { salary, period },
      monthly: { gross: r.gross, taxable: r.taxable, paye: r.paye, deductions: r.deductions, totalDeductions: r.totalDeductions, takeHome: r.net },
      annual: { gross: Math.round(r.gross * 12 * 100) / 100, paye: Math.round(r.paye * 12 * 100) / 100, takeHome: Math.round(r.net * 12 * 100) / 100 },
      effectiveTaxRate: r.effectiveTaxRate,
      bands: r.bands.map(b => ({ width: b.width === Infinity ? null : b.width, rate: b.rate, income: b.slice, tax: b.tax })),
      employer: { costs: r.employerCosts, totalMonthlyCost: r.employerTotalCost },
      disclaimer: "Estimate for salaried employees; not tax advice.",
      source: "Orion Soft PAYE API, https://www.orionsoftlimited.com/developers",
    });
  }
  if (country !== "ng") return res.status(400).json({ error: "country must be ng (Nigeria, default), ke (Kenya) or gh (Ghana)" });

  const opts = { annualRent: num(q.rent), pension: flag(q.pension, true), nhf: flag(q.nhf, false), nhis: num(q.nhis), pensionable: num(q.pensionable), basic: num(q.basic) };
  for (const [k, v] of Object.entries(opts)) {
    if (typeof v === "number" && (!Number.isFinite(v) || v < 0 || v > MAX)) return res.status(400).json({ error: `${k === "annualRent" ? "rent" : k} must be a positive number in naira` });
  }
  if (opts.pensionable === undefined) delete opts.pensionable;
  if (opts.basic === undefined) delete opts.basic;

  const s = payeSummary(monthly, opts);
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.json({
    law: "Nigeria Tax Act 2025 (in force from 1 January 2026)",
    currency: "NGN",
    input: { salary, period, rent: opts.annualRent || 0, pension: opts.pension, nhf: opts.nhf, nhis: opts.nhis || 0 },
    monthly: { gross: s.gross, paye: s.paye.monthly, deductions: s.deductions, totalDeductions: s.totalDeductions, takeHome: s.net },
    annual: { gross: s.gross * 12, paye: s.paye.annual, takeHome: Math.round(s.net * 12 * 100) / 100, chargeableIncome: s.chargeableAnnual, rentRelief: s.rentRelief },
    effectiveTaxRate: s.effectiveTaxRate,
    bands: s.bands.map(b => ({ band: b.width === Infinity ? "above ₦50,000,000" : `₦${b.width.toLocaleString("en-NG")}`, rate: b.rate, income: b.slice, tax: b.tax })),
    comparedWithOldLaw: s.comparison,
    employer: { costs: s.employerCosts, totalMonthlyCost: s.employerTotalCost },
    // Each band's width (null = everything above) and rate, applied in order.
    rates: PAYE_BANDS.map(([width, rate]) => ({ width: width === Infinity ? null : width, rate })),
    disclaimer: "Estimate for salaried employees; not tax advice.",
    source: "Orion Soft PAYE API, https://www.orionsoftlimited.com/developers",
  });
}
