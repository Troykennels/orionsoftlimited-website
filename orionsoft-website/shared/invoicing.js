// Shared by the API (api/_lib/invoicing.js re-exports it) and the admin UI.
// Invoice money maths and status rules: pure functions, no storage. Same
// rules as the Orion License Manager (domain/invoicing.py) so both systems
// bill identically.
//
//  subtotal  = sum of line amounts (qty × unit price, each rounded to kobo/cents)
//  discount  = subtotal × value% (percent) or a flat value (fixed), kept
//              between 0 and the subtotal so it can't make tax negative
//  tax       = (subtotal − discount) × tax rate%
//  total     = (subtotal − discount) + tax

export const STATUSES = ["draft", "sent", "partially_paid", "paid", "void"];
export const PAYMENT_METHODS = ["bank_transfer", "card", "cash", "pos", "cheque", "other"];
// Invoice PDF designs (api/_lib/pdf.js). An invoice with no template uses the
// company default from Site Settings.
export const INVOICE_TEMPLATES = ["classic", "minimal", "bold"];

const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const lineAmount = (qty, unitPrice) => round2((Number(qty) || 0) * (Number(unitPrice) || 0));

// Older invoices stored a flat `discount` and a `cancelled` status.
export function normaliseInvoice(inv) {
  const out = { ...inv };
  if (!out.discountType && Number(out.discount) > 0) { out.discountType = "fixed"; out.discountValue = Number(out.discount); }
  if (out.status === "cancelled") out.status = "void";
  out.payments = Array.isArray(out.payments) ? out.payments : [];
  if (out.status === "paid" && !out.payments.length && out.paidAt) {
    // Marked paid before payments were recorded individually.
    out.payments = [{ id: "legacy", amount: computeTotals(out).total, method: "other", reference: "", paidAt: out.paidAt.slice(0, 10), notes: "Marked as paid" }];
  }
  return out;
}

export function computeTotals(inv) {
  const items = inv.items || [];
  const subtotal = round2(items.reduce((s, it) => s + lineAmount(it.qty, it.unitPrice), 0));
  const value = Number(inv.discountValue ?? inv.discount) || 0;
  const type = inv.discountType || (Number(inv.discount) > 0 ? "fixed" : null);
  const raw = type === "percent" ? subtotal * value / 100 : type === "fixed" ? value : 0;
  const discountAmount = round2(Math.max(0, Math.min(raw, subtotal)));
  const taxable = round2(subtotal - discountAmount);
  const taxAmount = round2(taxable * (Number(inv.taxPercent) || 0) / 100);
  const total = round2(taxable + taxAmount);
  const amountPaid = round2((inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0));
  return { subtotal, discountAmount, taxable, taxAmount, total, amountPaid, balance: round2(Math.max(0, total - amountPaid)) };
}

export function statusAfterPayment(total, amountPaid) {
  if (amountPaid <= 0) return "sent";
  if (amountPaid >= total) return "paid";
  return "partially_paid";
}

// Outstanding (sent / partly paid) with a due date in the past.
export function isOverdue(inv, today = new Date().toISOString().slice(0, 10)) {
  return ["sent", "partially_paid"].includes(inv.status) && !!inv.dueDate && inv.dueDate < today;
}

// ── Amount in words (Nigerian invoice convention) ───────────────────────────
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function under1000(n) {
  const h = Math.floor(n / 100), r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? `-${ONES[r % 10]}` : ""}`;
  return [h ? `${ONES[h]} hundred` : "", h && r ? "and" : "", rest].filter(Boolean).join(" ");
}
function intToWords(n) {
  if (n === 0) return "zero";
  const scales = ["", "thousand", "million", "billion", "trillion"];
  const parts = [];
  for (let i = 0; n > 0; i++, n = Math.floor(n / 1000)) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(`${under1000(chunk)}${scales[i] ? ` ${scales[i]}` : ""}`);
  }
  // "one thousand and five" reads naturally when the last group is small
  if (parts.length > 1 && !parts[parts.length - 1].includes("hundred") && !/ (thousand|million|billion|trillion)$/.test(parts[parts.length - 1])) parts[parts.length - 1] = `and ${parts[parts.length - 1]}`;
  return parts.join(", ").replace(/, and /, " and ");
}
const UNITS = { NGN: ["naira", "kobo"], USD: ["dollars", "cents"], GBP: ["pounds", "pence"], EUR: ["euros", "cents"] };
export function amountInWords(amount, currency = "NGN") {
  const [major, minor] = UNITS[currency] || [currency, "cents"];
  const whole = Math.floor(round2(amount));
  const fraction = Math.round((round2(amount) - whole) * 100);
  const words = `${intToWords(whole)} ${major}${fraction ? `, ${intToWords(fraction)} ${minor}` : ""} only`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
