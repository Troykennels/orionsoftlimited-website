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
