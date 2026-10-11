// Kenya and Ghana take-home pay for salaried employees (one month). Pure
// functions, shared by the public calculators and the PAYE API.
//
// KENYA (checked October 2026)
//   PAYE monthly bands: 10% on the first 24,000; 25% on the next 8,333;
//   30% on the next 467,667; 32.5% on the next 300,000; 35% above 800,000.
//   Personal relief KES 2,400 a month, taken off the tax.
//   Deducted BEFORE PAYE (Tax Laws (Amendment) Act 2024, from 27 Dec 2024):
//     NSSF 6% of pensionable pay up to KES 108,000 (max KES 6,480, from
//     1 Feb 2026); SHIF 2.75% of gross (min KES 300); Affordable Housing
//     Levy 1.5% of gross.
//   Employer: NSSF match, Housing Levy 1.5%, NITA KES 50.
// GHANA (GRA bands effective 1 September 2026)
//   Monthly: first 588 at 0%; next 80 at 5%; next 100 at 10%; next 2,900 at
//   17.5%; next 16,000 at 25%; next 30,332 at 30%; above 50,000 at 35%.
//   Deducted BEFORE PAYE: SSNIT 5.5% of basic salary; provident fund up to
//   16.5% of basic.
//   Employer: SSNIT 13% of basic.

const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = v => Math.max(0, Number(v) || 0);

function bands(taxable, table) {
  let left = Math.max(0, taxable), tax = 0;
  const rows = [];
  for (const [width, rate] of table) {
    const slice = Math.min(left, width);
    if (slice > 0) rows.push({ width, rate, slice: r2(slice), tax: r2(slice * rate) });
    tax += slice * rate;
    left -= slice;
    if (left <= 0) break;
  }
  return { tax: r2(tax), rows };
}

export const KENYA_BANDS = [[24_000, 0.10], [8_333, 0.25], [467_667, 0.30], [300_000, 0.325], [Infinity, 0.35]];
export const KENYA = { personalRelief: 2_400, nssfRate: 0.06, nssfCeiling: 108_000, shifRate: 0.0275, shifMin: 300, housingRate: 0.015, nita: 50 };

/** opts: { pensionable } monthly pay NSSF is charged on (defaults to gross). */
export function kenyaPay(grossMonthly, opts = {}) {
  const gross = num(grossMonthly);
  const pensionable = Math.min(gross, num(opts.pensionable ?? gross));
  const nssf = r2(Math.min(pensionable, KENYA.nssfCeiling) * KENYA.nssfRate);
  const shif = gross > 0 ? r2(Math.max(KENYA.shifMin, gross * KENYA.shifRate)) : 0;
  const housing = r2(gross * KENYA.housingRate);
  const taxable = r2(Math.max(0, gross - nssf - shif - housing));
  const b = bands(taxable, KENYA_BANDS);
  const paye = r2(Math.max(0, b.tax - KENYA.personalRelief));
  const deductions = [
    { label: 'PAYE income tax', amount: paye, kind: 'paye' },
    { label: 'NSSF pension (6%)', amount: nssf, kind: 'pension' },
    { label: 'SHIF health (2.75%)', amount: shif, kind: 'health' },
    { label: 'Housing Levy (1.5%)', amount: housing, kind: 'housing' },
  ].filter(d => d.amount > 0);
  const total = r2(deductions.reduce((s, d) => s + d.amount, 0));
  const employerCosts = [
    { label: 'NSSF (employer match)', amount: nssf },
    { label: 'Housing Levy (employer 1.5%)', amount: housing },
    gross > 0 && { label: 'NITA levy', amount: KENYA.nita },
  ].filter(Boolean).filter(c => c.amount > 0);
  return {
    country: 'KE', currency: 'KES', gross, taxable, taxBeforeRelief: b.tax, relief: KENYA.personalRelief, paye,
    deductions, totalDeductions: total, net: r2(gross - total), bands: b.rows,
    effectiveTaxRate: gross ? r2((paye / gross) * 100) : 0,
    employerCosts, employerTotalCost: r2(gross + employerCosts.reduce((s, c) => s + c.amount, 0)),
  };
}

export const GHANA_BANDS = [[588, 0], [80, 0.05], [100, 0.10], [2_900, 0.175], [16_000, 0.25], [30_332, 0.30], [Infinity, 0.35]];
export const GHANA = { ssnitEmployee: 0.055, ssnitEmployer: 0.13, providentMax: 0.165 };

/** opts: { basic } monthly basic salary (defaults to gross); { providentPct } 0–16.5. */
export function ghanaPay(grossMonthly, opts = {}) {
  const gross = num(grossMonthly);
  const basic = Math.min(gross, num(opts.basic ?? gross));
  const ssnit = r2(basic * GHANA.ssnitEmployee);
  const provPct = Math.min(GHANA.providentMax * 100, num(opts.providentPct)) / 100;
  const provident = r2(basic * provPct);
  const chargeable = r2(Math.max(0, gross - ssnit - provident));
  const b = bands(chargeable, GHANA_BANDS);
  const paye = b.tax;
  const deductions = [
    { label: 'PAYE income tax', amount: paye, kind: 'paye' },
    { label: 'SSNIT (5.5% of basic)', amount: ssnit, kind: 'pension' },
    { label: `Provident fund (${r2(provPct * 100)}% of basic)`, amount: provident, kind: 'provident' },
  ].filter(d => d.amount > 0);
  const total = r2(deductions.reduce((s, d) => s + d.amount, 0));
  const employerCosts = [{ label: 'SSNIT (employer 13% of basic)', amount: r2(basic * GHANA.ssnitEmployer) }].filter(c => c.amount > 0);
  return {
    country: 'GH', currency: 'GHS', gross, taxable: chargeable, paye,
    deductions, totalDeductions: total, net: r2(gross - total), bands: b.rows,
    effectiveTaxRate: gross ? r2((paye / gross) * 100) : 0,
    employerCosts, employerTotalCost: r2(gross + employerCosts.reduce((s, c) => s + c.amount, 0)),
  };
}
