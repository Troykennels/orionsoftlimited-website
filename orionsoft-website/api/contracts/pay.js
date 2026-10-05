// Public payment page for a signed contract (/pay/contract/<id>?token=…).
// The client chooses a milestone or an amount, then pays online (Paystack) or
// tells us about a bank transfer, which the admin confirms. Gated by a
// contract-scoped token sent after signing; it can't be used for anything else.
import { getRecord, putRecord, listRecords, newId } from "../_lib/records.js";
import { verifySession } from "../_lib/auth.js";
import { getCompanySettings } from "../_lib/settings.js";
import { normaliseContract, paymentSummary, money, siteUrl, contractByPayCode, payLink } from "../_lib/contracts.js";
import { ensureDedicatedAccount } from "../_lib/paystackDva.js";
import { sendEmail, brandedShell } from "../_lib/mailer.js";
import { requestMeta } from "../_lib/fieldIntel.js";

const MIN_PAYMENT = 100;
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

function tokenOk(token, contractId) {
  const p = verifySession(token);
  return !!p && ["contract-pay", "contract-sign"].includes(p.role) && p.contractId === contractId;
}

// What the client may pay: a milestone's remaining balance, or (when
// part-payments are allowed) any amount up to the balance.
function checkAmount(summary, contract, { milestoneId, amount }) {
  const amt = round2(amount);
  if (!(amt >= MIN_PAYMENT)) return { error: `The minimum payment is ${money(MIN_PAYMENT, contract.currency)}` };
  if (amt > summary.balance + 0.004) return { error: `That's more than the balance of ${money(summary.balance, contract.currency)}` };
  if (milestoneId) {
    const m = summary.schedule.find(x => x.id === milestoneId);
    if (!m) return { error: "That milestone doesn't exist" };
    if (m.balance <= 0) return { error: "That milestone is already paid" };
    if (amt > m.balance + 0.004) return { error: `That's more than this milestone's balance of ${money(m.balance, contract.currency)}` };
    if (!contract.allowPartial && Math.abs(amt - m.balance) > 0.004) return { error: `Please pay the full milestone amount of ${money(m.balance, contract.currency)}` };
  } else if (!contract.allowPartial && Math.abs(amt - summary.balance) > 0.004) {
    return { error: `Please pay the full balance of ${money(summary.balance, contract.currency)}` };
  }
  return { amount: amt };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  // Either the short permanent link (/p/<code>) or the older signed link.
  const code = String(req.query.code || req.body?.code || "").toUpperCase();
  const contractId = req.query.contractId || req.body?.contractId;
  const token = req.query.token || req.body?.token;
  let raw = null;
  if (code) raw = await contractByPayCode(code);
  else if (contractId && token && tokenOk(token, contractId)) raw = await getRecord("contracts", contractId);
  if (!raw) return res.status(401).json({ error: "This payment link is invalid. Ask us for a new one." });
  const c = normaliseContract(raw);
  if (c.status === "cancelled") return res.status(400).json({ error: "This document was cancelled, so there's nothing to pay. Contact us if you think that's wrong." });
  // Payment plans need no signature; agreements can allow paying before signing.
  const canPay = c.kind === "plan" || ["signed", "active", "completed"].includes(c.status) || (c.status !== "draft" && raw.payBeforeSigning);
  if (!canPay) return res.status(400).json({ error: "This agreement must be signed before payments can be made.", signFirst: true });
  const payments = (await listRecords("payments")).filter(p => p.contractId === c.id);
  const summary = paymentSummary(c, payments);
  const company = await getCompanySettings();

  if (req.method === "GET") {
    const dva = summary.balance > 0 ? await ensureDedicatedAccount(raw) : raw.dva || null;
    const next = summary.schedule.find(m => m.balance > 0) || null;
    return res.json({
      next: next ? { id: next.id, title: next.title, dueDate: next.dueDate || null, trigger: next.trigger || "", balance: next.balance, payStatus: next.payStatus } : null,
      dva: dva ? { bankName: dva.bankName, accountNumber: dva.accountNumber, accountName: dva.accountName } : null,
      link: payLink(raw),
      ok: true,
      contract: { id: c.id, number: c.number, kind: c.kind || "agreement", docLabel: c.docLabel || "", pdfKey: raw.signedPdfKey || raw.pdfKey || "", title: c.title, clientName: c.client.name, organisation: c.client.organisation, currency: c.currency, allowPartial: c.allowPartial, status: c.status },
      summary: { total: summary.total, paid: summary.paid, balance: summary.balance, schedule: summary.schedule.map(m => ({ id: m.id, title: m.title, description: m.description || "", dueDate: m.dueDate || null, trigger: m.trigger || "", amount: m.amount, paid: m.paid, balance: m.balance, payStatus: m.payStatus })), receipts: summary.receipts.map(r => ({ receiptNumber: r.receiptNumber, amount: r.amount, paidAt: r.paidAt, method: r.method, pdfKey: payments.find(p => p.id === r.id)?.receiptPdfKey || "" })), pending: summary.pending.map(p => ({ amount: p.amount, bankReference: p.bankReference, createdAt: p.createdAt })) },
      payOnline: !!process.env.PAYSTACK_SECRET_KEY,
      bankDetails: company.bankDetails || "",
      company: { name: company.companyName, email: company.email, phone: company.phone },
    });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (summary.balance <= 0) return res.status(400).json({ error: "This contract is already fully paid. Thank you." });
  const b = req.body || {};
  const chk = checkAmount(summary, c, b);
  if (chk.error) return res.status(400).json({ error: chk.error });

  if (b.action === "paystack") {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return res.status(503).json({ error: "Online payment isn't available right now. Please pay by bank transfer." });
    if (!c.client.email) return res.status(400).json({ error: "We need an email address on this contract to take an online payment. Contact us." });
    const id = newId("pmt"), reference = `orionsoft_${id}`;
    try {
      const r = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST", headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: c.client.email, amount: Math.round(chk.amount * 100), currency: c.currency === "USD" ? "USD" : "NGN", reference,
          callback_url: code ? `${siteUrl()}/pay/callback?reference=${reference}&code=${encodeURIComponent(code)}` : `${siteUrl()}/pay/callback?reference=${reference}&contract=${encodeURIComponent(c.id)}&token=${encodeURIComponent(token)}`,
          // Card, bank transfer (Paystack shows an account number to pay into), USSD and bank.
          channels: ["card", "bank_transfer", "ussd", "bank"],
          metadata: { contractId: c.id, contractNumber: c.number, milestoneId: b.milestoneId || "" },
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.status) return res.status(502).json({ error: j.message || "The payment provider couldn't start the payment. Try again or pay by bank transfer." });
      await putRecord("payments", id, { id, contractId: c.id, reference, amount: chk.amount, currency: c.currency, milestoneId: b.milestoneId || null, method: "paystack", status: "initialized", createdAt: new Date().toISOString() });
      return res.json({ ok: true, authorizationUrl: j.data.authorization_url, reference });
    } catch (err) {
      return res.status(502).json({ error: "Couldn't reach the payment provider. Try again or pay by bank transfer." });
    }
  }

  // "I've paid by bank transfer": recorded for the admin to confirm.
  if (b.action === "bank_notice") {
    if (summary.pending.length >= 5) return res.status(429).json({ error: "You already have transfers waiting for confirmation. We'll confirm them shortly." });
    const bankReference = String(b.bankReference || "").trim().slice(0, 80);
    const payerName = String(b.payerName || "").trim().slice(0, 100);
    if (!bankReference && !payerName) return res.status(400).json({ error: "Enter the transfer reference or the name on the paying account, so we can match it." });
    const id = newId("pmt");
    const payment = {
      id, contractId: c.id, amount: chk.amount, currency: c.currency, milestoneId: b.milestoneId || null, method: "bank_transfer",
      status: "awaiting_confirmation", bankReference, payerName, note: String(b.note || "").slice(0, 300),
      transferDate: /^\d{4}-\d{2}-\d{2}$/.test(b.transferDate || "") ? b.transferDate : null, ip: requestMeta(req).ip, createdAt: new Date().toISOString(),
    };
    await putRecord("payments", id, payment);
    try {
      await sendEmail(company.email, `Bank transfer to confirm: ${c.number}`, brandedShell(`
        <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Bank transfer to confirm</h2>
        <p style="color:#3A4556;font-size:14px;line-height:1.7;">${esc(c.client.name)} says they paid <strong>${money(chk.amount, c.currency)}</strong> for ${esc(c.title)} (${c.number}).</p>
        <p style="color:#3A4556;font-size:14px;line-height:1.7;">Reference: ${esc(bankReference || "—")} · Paid from: ${esc(payerName || "—")}${payment.transferDate ? ` · ${payment.transferDate}` : ""}</p>
        <p style="color:#3A4556;font-size:14px;line-height:1.7;">Check your bank, then confirm it in Admin → Contracts. The client gets their receipt automatically.</p>`, { title: "Bank transfer to confirm" }), { kind: "contract_bank_notice" });
    } catch { /* admin also sees it in the dashboard */ }
    return res.json({ ok: true, message: "Thank you. We'll confirm your transfer and email your receipt." });
  }

  return res.status(400).json({ error: "Unknown action" });
}
