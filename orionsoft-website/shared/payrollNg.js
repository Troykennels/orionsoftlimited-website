// Shared by the API and the admin UI: Nigerian statutory payroll for one
// month. Pure functions, no storage.
//
// Personal income tax follows the Nigeria Tax Act 2025 (in force from
// 1 January 2026): the old Consolidated Relief Allowance is gone, rent relief
// is 20% of annual rent paid (capped at ₦500,000), and pension, NHF and NHIS
// contributions are deducted before tax. Annual bands:
//   first ₦800,000          0%
//   next  ₦2,200,000       15%
//   next  ₦9,000,000       18%
//   next  ₦13,000,000      21%
//   next  ₦25,000,000      23%
//   above ₦50,000,000      25%
// Pension Reform Act 2014: employee 8% + employer 10% of basic + housing +
// transport. NHF: 2.5% of basic (where the employee contributes). NSITF:
// employer 1% of total monthly emoluments. ITF: employer 1% of annual payroll
// (companies with 5+ staff or ₦50m+ turnover).
// These are statutory defaults; the admin can still edit any line.

export const PAYE_BANDS = [
  [800_000, 0],
  [2_200_000, 0.15],
  [9_000_000, 0.18],
  [13_000_000, 0.21],
  [25_000_000, 0.23],
  [Infinity, 0.25],
];

const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function annualPaye(chargeable) {
  let left = Math.max(0, Number(chargeable) || 0), tax = 0;
  for (const [width, rate] of PAYE_BANDS) {
    const slice = Math.min(left, width);
    tax += slice * rate;
    left -= slice;
    if (left <= 0) break;
  }
  return r2(tax);
}

// opts (all monthly ₦ unless named annual):
//   pensionable  basic + housing + transport (defaults to gross)
//   basic        basic salary, for NHF (defaults to pensionable)
//   annualRent   rent the employee pays a year, for rent relief
//   nhf          true if the employee contributes to the NHF
//   nhis         monthly health insurance contribution by the employee
//   pension      false to skip pension (e.g. fewer than 3 staff, or exempt)
export function computeNigerianPayroll(grossMonthly, opts = {}) {
  const gross = Math.max(0, Number(grossMonthly) || 0);
  const pensionable = Math.min(gross, Math.max(0, Number(opts.pensionable ?? gross) || 0));
  const basic = Math.min(pensionable, Math.max(0, Number(opts.basic ?? pensionable) || 0));
  const pensionEe = opts.pension === false ? 0 : r2(pensionable * 0.08);
  const pensionEr = opts.pension === false ? 0 : r2(pensionable * 0.10);
  const nhf = opts.nhf ? r2(basic * 0.025) : 0;
  const nhis = Math.max(0, Number(opts.nhis) || 0);
  const rentRelief = Math.min(500_000, Math.max(0, Number(opts.annualRent) || 0) * 0.2);
  const annualGross = gross * 12;
  const chargeable = Math.max(0, annualGross - (pensionEe + nhf + nhis) * 12 - rentRelief);
  const paye = r2(annualPaye(chargeable) / 12);

  const deductions = [
    paye > 0 && { label: "PAYE income tax", amount: paye, kind: "paye" },
    pensionEe > 0 && { label: "Pension (employee 8%)", amount: pensionEe, kind: "pension" },
    nhf > 0 && { label: "National Housing Fund (2.5%)", amount: nhf, kind: "nhf" },
    nhis > 0 && { label: "Health insurance (NHIS)", amount: nhis, kind: "nhis" },
  ].filter(Boolean);
  const employerCosts = [
    pensionEr > 0 && { label: "Pension (employer 10%)", amount: pensionEr, kind: "pension_er" },
    { label: "NSITF (employer 1%)", amount: r2(gross * 0.01), kind: "nsitf" },
    { label: "ITF (employer 1%)", amount: r2(gross * 0.01), kind: "itf" },
  ].filter(Boolean);
  const totalDeductions = r2(deductions.reduce((s, d) => s + d.amount, 0));
  return {
    gross, pensionable, chargeableAnnual: r2(chargeable), rentRelief: r2(rentRelief),
    effectiveTaxRate: gross ? r2((paye / gross) * 100) : 0,
    deductions, employerCosts, totalDeductions,
    net: r2(gross - totalDeductions),
    employerTotalCost: r2(gross + employerCosts.reduce((s, c) => s + c.amount, 0)),
  };
}

// How much of `taxable` falls in each band and the tax on it.
export function bandBreakdown(taxable, bands = PAYE_BANDS) {
  let left = Math.max(0, Number(taxable) || 0);
  return bands.map(([width, rate]) => {
    const slice = Math.min(left, width);
    left -= slice;
    return { width, rate, slice: r2(slice), tax: r2(slice * rate) };
  });
}

// The old Personal Income Tax Act (to 31 Dec 2025), for comparisons:
// consolidated relief of the higher of ₦200,000 or 1% of gross, plus 20% of
// gross; pension, NHF and NHIS deductible; minimum tax of 1% of gross;
// minimum-wage earners (₦70,000 a month) exempt.
export const OLD_PITA_BANDS = [[300_000, 0.07], [300_000, 0.11], [500_000, 0.15], [500_000, 0.19], [1_600_000, 0.21], [Infinity, 0.24]];
export function oldLawMonthlyPaye(grossMonthly, reliefsMonthly = 0) {
  const gross = Math.max(0, Number(grossMonthly) || 0);
  if (gross <= 70_000) return 0;
  const annual = gross * 12;
  const cra = Math.max(200_000, annual * 0.01) + annual * 0.2;
  const taxable = Math.max(0, annual - cra - Math.max(0, Number(reliefsMonthly) || 0) * 12);
  const tax = bandBreakdown(taxable, OLD_PITA_BANDS).reduce((s, b) => s + b.tax, 0);
  return r2(Math.max(tax, annual * 0.01) / 12);
}

// Everything the public calculator and API show: the payroll result, PAYE
// under the new and old law, the difference, and the band breakdown.
export function payeSummary(grossMonthly, opts = {}) {
  const result = computeNigerianPayroll(grossMonthly, opts);
  const payeNew = result.deductions.find(d => d.kind === "paye")?.amount || 0;
  const reliefs = result.deductions.filter(d => d.kind !== "paye").reduce((s, d) => s + d.amount, 0);
  const payeOld = oldLawMonthlyPaye(result.gross, reliefs);
  return {
    ...result,
    paye: { monthly: payeNew, annual: r2(payeNew * 12) },
    comparison: { oldLawMonthly: payeOld, newLawMonthly: payeNew, monthlySaving: r2(payeOld - payeNew), annualSaving: r2((payeOld - payeNew) * 12) },
    bands: bandBreakdown(result.chargeableAnnual).filter(b => b.slice > 0),
  };
}
