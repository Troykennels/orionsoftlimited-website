// One place that records a successful contract payment, whichever way it
// arrived (Paystack webhook, Paystack callback check, a bank transfer the
// admin confirmed, or a payment the admin recorded by hand): numbers the
// receipt, marks the contract active, stores the receipt PDF and emails it.
import { getRecord, putRecord, listRecords } from "./records.js";
import { set, get } from "../store.js";
import { sendEmail, brandedShell } from "./mailer.js";
import { getCompanySettings } from "./settings.js";
import { normaliseContract, paymentSummary, nextReceiptNumber, money, payLink } from "./contracts.js";
import { renderContractReceiptPdf } from "./contractPdf.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const longDate = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
export const receiptKey = paymentId => `orionsoft:files:receipt_${paymentId}`;

// Paystack reports the charged amount in kobo/cents; it must match what we asked for.
export function paystackAmountMatches(payment, data) {
  const charged = Number(data?.amount) / 100;
  return Math.abs(charged - Number(payment.amount)) < 0.01 && (!data?.currency || data.currency === (payment.currency || "NGN"));
}

export async function recordSuccessfulPayment(paymentId, details = {}) {
  const payment = await getRecord("payments", paymentId);
  if (!payment) return null;
  if (payment.status === "success") return payment; // already recorded (webhook + callback both fire)
  const raw = await getRecord("contracts", payment.contractId);
  if (!raw) return null;
  const contract = normaliseContract(raw);
  Object.assign(payment, details, {
    status: "success",
    verifiedAt: new Date().toISOString(),
    paidAt: details.paidAt || payment.paidAt || new Date().toISOString(),
    receiptNumber: payment.receiptNumber || (await nextReceiptNumber(contract)),
  });
  await putRecord("payments", payment.id, payment);

  if (raw.status === "signed") { raw.status = "active"; raw.updatedAt = new Date().toISOString(); await putRecord("contracts", raw.id, raw); }

  const all = (await listRecords("payments")).filter(p => p.contractId === contract.id);
  try {
    const pdf = Buffer.from(await renderContractReceiptPdf(raw, payment, all));
    await set(receiptKey(payment.id), pdf.toString("base64"));
    payment.receiptPdfKey = receiptKey(payment.id);
    await putRecord("payments", payment.id, payment);
    await emailReceipt(raw, payment, all, pdf);
  } catch (err) {
    console.error("[receipt]", err.message);
  }
  return payment;
}

async function emailReceipt(raw, payment, all, pdf) {
  const c = normaliseContract(raw);
  if (!c.client.email) return;
  const company = await getCompanySettings();
  const sum = paymentSummary(c, all);
  const html = brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Payment received, thank you</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${esc(c.client.name)}, we've received <strong>${money(payment.amount, c.currency)}</strong> for <strong>${esc(c.title)}</strong> (${c.number}). Your official receipt is attached.</p>
    <table role="presentation" style="background:#F4F6FA;border-radius:10px;padding:14px 16px;margin:14px 0;width:100%;font-size:13.5px;color:#3A4556;">
      <tr><td style="padding:4px 0;">Receipt number</td><td style="padding:4px 0;text-align:right;"><strong>${payment.receiptNumber}</strong></td></tr>
      <tr><td style="padding:4px 0;">Date</td><td style="padding:4px 0;text-align:right;">${longDate(payment.paidAt)}</td></tr>
      <tr><td style="padding:4px 0;">Paid to date</td><td style="padding:4px 0;text-align:right;">${money(sum.paid, c.currency)}</td></tr>
      <tr><td style="padding:4px 0;">Balance</td><td style="padding:4px 0;text-align:right;"><strong>${money(sum.balance, c.currency)}</strong></td></tr>
    </table>
    ${sum.balance > 0 ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;">You can pay the next milestone or any part of the balance here:</p><p><a href="${payLink(raw)}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Open payment page</a></p>` : `<p style="color:#15803D;font-size:14px;font-weight:700;">This contract is now fully paid.</p>`}
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">Kind regards,<br>${esc(company.companyName)}</p>`, { title: `Receipt ${payment.receiptNumber}` });
  await sendEmail(c.client.email, `Receipt ${payment.receiptNumber}: ${c.title}`, html, {
    kind: "contract_receipt", attachments: [{ filename: `${payment.receiptNumber}.pdf`, content: pdf }],
  });
  payment.receiptSentAt = new Date().toISOString();
  await putRecord("payments", payment.id, payment);
}

export async function loadReceiptPdf(payment) {
  const b64 = payment.receiptPdfKey ? await get(payment.receiptPdfKey) : null;
  return b64 ? Buffer.from(b64, "base64") : null;
}
