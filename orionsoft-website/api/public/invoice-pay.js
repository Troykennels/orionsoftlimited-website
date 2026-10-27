// Client page for paying an invoice (/pay/invoice/<code>): shows the invoice,
// what's been paid and the balance, and takes the full balance or a part of
// it through Paystack. Every payment is added to this same invoice.
//   GET  ?code=…               invoice summary
//   GET  ?code=…&reference=…   confirm a payment with Paystack (return page)
//   POST { code, amount?, email? }  start a checkout (no amount = full balance)
import { incrTtl } from "../store.js";
import { getCompanySettings } from "../_lib/settings.js";
import { computeTotals, normaliseInvoice } from "../_lib/invoicing.js";
import { invoiceByPayCode, isPayable, startInvoiceCheckout, verifyInvoicePayment, MIN_PART_PAYMENT, ONLINE_CURRENCIES } from "../_lib/invoicePay.js";

async function limited(req, bucket, max) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  try { return (await incrTtl(`orionsoft:rl:${bucket}:${ip}`, 60)) > max; } catch { return false; }
}

function summary(inv, company) {
  const t = computeTotals(inv);
  const payable = isPayable(inv) && t.balance > 0 && ONLINE_CURRENCIES.includes(inv.currency);
  const reason = t.balance <= 0 || inv.status === "paid" ? "This invoice is fully paid. Thank you."
    : inv.status === "void" ? "This invoice was cancelled, so there's nothing to pay. Contact us if you think that's wrong."
    : !ONLINE_CURRENCIES.includes(inv.currency) ? "Online payment isn't available in this currency. Please pay by bank transfer." : "";
  return {
    invoiceNumber: inv.invoiceNumber, clientName: inv.clientName, currency: inv.currency,
    issueDate: inv.issueDate, dueDate: inv.dueDate || null, status: inv.status,
    items: (inv.items || []).map(i => ({ description: i.description, qty: i.qty, amount: Math.round(i.qty * i.unitPrice * 100) / 100 })),
    total: t.total, amountPaid: t.amountPaid, balance: t.balance, minimumPayment: Math.min(MIN_PART_PAYMENT, t.balance),
    payments: inv.payments.map(p => ({ amount: p.amount, paidAt: p.paidAt })),
    payable, reason, email: inv.clientEmail || "", payOnline: !!process.env.PAYSTACK_SECRET_KEY,
    bankDetails: company.bankDetails || "", company: { name: company.companyName, email: company.email, phone: company.phone },
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  if (await limited(req, req.method === "POST" ? "invpay-post" : "invpay-get", req.method === "POST" ? 6 : 40)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many attempts. Please wait a minute and try again." });
  }
  const code = String(req.query.code || req.body?.code || "").toUpperCase();
  const stored = await invoiceByPayCode(code);
  if (!stored) return res.status(404).json({ error: "This payment link isn't valid. Ask us for a new one." });
  const inv = normaliseInvoice(stored);
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (req.method === "GET") {
    const reference = String(req.query.reference || "");
    let payment = null;
    if (reference) {
      if (!/^orionsoft_inv_[A-Za-z0-9_-]{4,60}$/.test(reference) || !secretKey) return res.status(400).json({ error: "That payment reference isn't valid." });
      try {
        const attempt = await verifyInvoicePayment(reference, secretKey);
        if (!attempt || attempt.invoiceId !== inv.id) return res.status(404).json({ error: "That payment reference isn't valid." });
        payment = { status: attempt.status, amount: attempt.amount };
      } catch { payment = { status: "pending" }; }
    }
    const fresh = normaliseInvoice((await invoiceByPayCode(code)) || stored);
    return res.json({ ok: true, invoice: summary(fresh, await getCompanySettings()), payment });
  }

  if (!isPayable(inv) || computeTotals(inv).balance <= 0) return res.status(400).json({ error: "This invoice has nothing left to pay. Thank you." });
  if (!ONLINE_CURRENCIES.includes(inv.currency)) return res.status(400).json({ error: "Online payment isn't available in this currency. Please pay by bank transfer." });
  if (!secretKey) return res.status(503).json({ error: "Online payment isn't available right now. Please pay by bank transfer." });
  try {
    const out = await startInvoiceCheckout(inv, { amount: req.body?.amount, email: req.body?.email }, secretKey);
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    return res.json({ ok: true, ...out });
  } catch {
    return res.status(502).json({ error: "Couldn't reach the payment provider. Please try again." });
  }
}
