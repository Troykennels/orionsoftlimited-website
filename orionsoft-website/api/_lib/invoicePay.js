// Paying an invoice online, in full or in parts. Each sent invoice has one
// short permanent link (/pay/invoice/<code>); every payment made through it is
// added to that same invoice (never a fresh one), the PDF is regenerated with
// what's been paid and what's left, and a receipt goes to the client.
// Invoices that follow a payment plan are paid through the plan's own link.
import { getRecord, putRecord, listRecords, newId, setLookup, getByLookup } from "./records.js";
import { claim, del } from "../store.js";
import { siteUrl } from "./contracts.js";
import { computeTotals, normaliseInvoice, statusAfterPayment } from "./invoicing.js";

export const MIN_PART_PAYMENT = 100;
export const ONLINE_CURRENCIES = ["NGN", "USD"];
export const REFERENCE_PREFIX = "orionsoft_inv_";
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Same 10-character alphabet as payment-plan links (≈49 bits, not guessable).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export async function ensureInvoicePayCode(invoice) {
  if (invoice.payCode || invoice.source?.contractId) return invoice.payCode || "";
  const { randomBytes } = await import("node:crypto");
  invoice.payCode = Array.from(randomBytes(10), b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  await setLookup("invoices", "paycode", invoice.payCode, invoice.id);
  return invoice.payCode;
}

export async function invoiceByPayCode(code) {
  return /^[A-Z0-9]{8,16}$/.test(String(code || "")) ? getByLookup("invoices", "paycode", String(code)) : null;
}

export const isPayable = inv => ["sent", "partially_paid"].includes(inv.status) && !inv.source?.contractId;

// The link to print and email while something is still owed.
export function invoicePayLink(inv) {
  if (!inv.payCode || !isPayable(inv) || computeTotals(inv).balance <= 0) return "";
  return `${siteUrl()}/pay/invoice/${inv.payCode}`;
}

// What the client may pay now: any amount from the minimum (or the whole
// balance when it's smaller) up to the balance.
export function checkInvoiceAmount(inv, amount) {
  const { balance } = computeTotals(inv);
  const amt = amount === undefined || amount === null || amount === "" ? balance : r2(amount);
  if (!(amt > 0)) return { error: "Enter an amount above zero" };
  if (amt > balance + 0.004) return { error: `That's more than the balance of ${inv.currency} ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` };
  if (amt < Math.min(MIN_PART_PAYMENT, balance) - 0.004) return { error: `The smallest part-payment is ${inv.currency} ${MIN_PART_PAYMENT.toLocaleString("en-US", { minimumFractionDigits: 2 })}` };
  return { amount: amt };
}

export async function startInvoiceCheckout(inv, { amount, email }, secretKey) {
  const chk = checkInvoiceAmount(inv, amount);
  if (chk.error) return chk;
  const payer = String(email || inv.clientEmail || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payer)) return { error: "Enter the email address for your receipt" };
  const id = newId("ipay"), reference = `${REFERENCE_PREFIX}${id}`;
  const r = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST", headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payer, amount: Math.round(chk.amount * 100), currency: inv.currency, reference,
      callback_url: `${siteUrl()}/pay/invoice/${inv.payCode}?reference=${reference}`,
      channels: ["card", "bank_transfer", "ussd", "bank"],
      metadata: { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status || !String(j.data?.authorization_url || "").startsWith("https://checkout.paystack.com/")) {
    return { error: j.message || "The payment provider couldn't start the payment. Please try again.", status: 502 };
  }
  await putRecord("invoice_payments", id, { id, invoiceId: inv.id, reference, amount: chk.amount, currency: inv.currency, email: payer, status: "initialized", createdAt: new Date().toISOString() });
  return { authorizationUrl: j.data.authorization_url, reference };
}

export function attemptIdFromReference(reference) {
  return String(reference || "").startsWith(REFERENCE_PREFIX) ? String(reference).slice(REFERENCE_PREFIX.length) : "";
}

// Record a verified Paystack charge on its invoice, exactly once (the webhook
// and the payer's return page usually arrive together).
export async function recordInvoiceOnlinePayment(attemptId, data) {
  let attempt = await getRecord("invoice_payments", attemptId);
  if (!attempt || ["success", "review"].includes(attempt.status)) return attempt;
  const charged = Number(data?.amount) / 100;
  if (data?.reference !== attempt.reference || Math.abs(charged - attempt.amount) >= 0.01 || (data?.currency && data.currency !== attempt.currency)) {
    attempt.status = "amount_mismatch"; attempt.paystackAmount = data?.amount;
    await putRecord("invoice_payments", attempt.id, attempt);
    return attempt;
  }
  // One lock per invoice: two payments landing together must each see the
  // other's effect on the balance.
  const lock = `orionsoft:lock:invoice:${attempt.invoiceId}`;
  let locked = false;
  for (let i = 0; i < 30 && !(locked = await claim(lock, 60)); i++) await new Promise(r => setTimeout(r, 300));
  if (!locked) throw new Error("Invoice is busy; try again shortly");
  let invoice;
  try {
    attempt = await getRecord("invoice_payments", attemptId);
    if (["success", "review"].includes(attempt.status)) return attempt;
    const stored = await getRecord("invoices", attempt.invoiceId);
    invoice = stored && normaliseInvoice(stored);
    const paidAt = String(data.paid_at || new Date().toISOString());
    if (!invoice || !isPayable(invoice) || attempt.amount > computeTotals(invoice).balance + 0.004) {
      // Settled or voided some other way meanwhile: keep the money visible
      // for a person to refund or apply. Never overpay the invoice.
      Object.assign(attempt, { status: "review", paidAt, verifiedAt: new Date().toISOString() });
      await putRecord("invoice_payments", attempt.id, attempt);
      return attempt;
    }
    invoice.payments.push({ id: newId("pay"), amount: attempt.amount, method: data.channel === "card" ? "card" : "bank_transfer", reference: attempt.reference, paidAt: paidAt.slice(0, 10), notes: "Paid online through the invoice payment link", recordedAt: new Date().toISOString(), recordedBy: "paystack" });
    const after = computeTotals(invoice);
    invoice.status = statusAfterPayment(after.total, after.amountPaid);
    invoice.paidAt = invoice.status === "paid" ? new Date().toISOString() : null;
    const { saveInvoice } = await import("../admin/invoices.js");
    await saveInvoice(invoice);
    Object.assign(attempt, { status: "success", paidAt, verifiedAt: new Date().toISOString(), channel: data.channel || "" });
    await putRecord("invoice_payments", attempt.id, attempt);
  } finally {
    await del(lock).catch(() => {});
  }
  // The receipt carries the regenerated invoice: paid so far and balance left.
  try {
    const { emailInvoice } = await import("../admin/invoices.js");
    await emailInvoice({ ...invoice, clientEmail: invoice.clientEmail || attempt.email }, "receipt");
    attempt.receiptSentAt = new Date().toISOString();
    await putRecord("invoice_payments", attempt.id, attempt);
  } catch (err) { console.error("[invoice-receipt]", err.message); }
  return attempt;
}

// Ask Paystack directly (never trust the return URL) and record if paid.
export async function verifyInvoicePayment(reference, secretKey) {
  const attempt = await getRecord("invoice_payments", attemptIdFromReference(reference));
  if (!attempt) return null;
  if (["success", "review"].includes(attempt.status)) return attempt;
  const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secretKey}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status) throw new Error("Could not verify payment");
  if (j.data.status === "failed") { await putRecord("invoice_payments", attempt.id, { ...attempt, status: "failed", checkedAt: new Date().toISOString() }); return { ...attempt, status: "failed" }; }
  if (j.data.status !== "success") return { ...attempt, status: "pending" };
  return recordInvoiceOnlinePayment(attempt.id, j.data);
}

// Fallback for a missed webhook: check recent unconfirmed checkouts with
// Paystack (a few at a time, up to a week old).
export async function reconcilePendingInvoicePayments() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return 0;
  const weekAgo = Date.now() - 7 * 86400000;
  const pending = (await listRecords("invoice_payments"))
    .filter(a => a.status === "initialized" && Date.parse(a.createdAt) > weekAgo)
    .sort((a, b) => String(a.checkedAt || "").localeCompare(String(b.checkedAt || "")))
    .slice(0, 10);
  let settled = 0;
  for (const a of pending) {
    try {
      const out = await verifyInvoicePayment(a.reference, secretKey);
      if (out?.status === "success") settled++;
      else { const fresh = await getRecord("invoice_payments", a.id); if (fresh?.status === "initialized") await putRecord("invoice_payments", a.id, { ...fresh, checkedAt: new Date().toISOString() }); }
    } catch (err) { console.error("[invoice-pay reconcile]", err.message); }
  }
  return settled;
}
