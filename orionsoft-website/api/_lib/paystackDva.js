// Paystack Dedicated Virtual Accounts: each client gets their own bank
// account number (Wema Bank / Titan Paystack). Whatever they transfer into it,
// whenever they pay, is reported by Paystack's webhook and applied to their
// next unpaid item automatically, with a receipt.
//
// Needs PAYSTACK_SECRET_KEY, and Dedicated Accounts enabled on the Paystack
// business (Paystack dashboard → Settings, or ask Paystack support; available
// to registered Nigerian businesses). PAYSTACK_DVA_BANK picks the bank
// ("wema-bank" by default, "titan-paystack" also works). If it isn't enabled,
// the payment page simply falls back to Paystack checkout, which also offers
// "Pay with transfer" with a one-time account number.
import { putRecord, listRecords, setLookup, getByLookup, newId } from "./records.js";
import { normaliseContract, paymentSummary } from "./contracts.js";

const API = "https://api.paystack.co";
const key = () => process.env.PAYSTACK_SECRET_KEY;
export const dvaPossible = () => !!key() && process.env.PAYSTACK_DVA !== "off";

async function ps(path, body, method = "POST") {
  const r = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status === false) throw new Error(j.message || `Paystack error ${r.status}`);
  return j.data;
}

// The client's account (shared by all their plans with the same email).
export async function ensureDedicatedAccount(raw) {
  const c = normaliseContract(raw);
  if (raw.dva?.accountNumber) return raw.dva;
  if (!dvaPossible() || !c.client.email) return null;
  // Don't hammer Paystack if it already said no recently.
  if (raw.dvaError && Date.now() - Date.parse(raw.dvaErrorAt || 0) < 6 * 3600 * 1000) return null;
  try {
    let customer = await getByLookup("paystackcustomers", "email", c.client.email.toLowerCase());
    if (!customer) {
      const [first, ...rest] = (c.client.name || c.client.organisation || "Client").trim().split(/\s+/);
      const data = await ps("/customer", { email: c.client.email, first_name: first, last_name: rest.join(" ") || first, phone: c.client.phone || undefined, metadata: { organisation: c.client.organisation || "" } });
      customer = { id: data.customer_code, code: data.customer_code, email: c.client.email.toLowerCase(), name: c.client.name, dva: null };
      await putRecord("paystackcustomers", customer.id, customer);
      await setLookup("paystackcustomers", "email", customer.email, customer.id);
    }
    if (!customer.dva) {
      const d = await ps("/dedicated_account", { customer: customer.code, preferred_bank: process.env.PAYSTACK_DVA_BANK || "wema-bank" });
      customer.dva = { accountNumber: d.account_number, accountName: d.account_name, bankName: d.bank?.name || "Wema Bank", createdAt: new Date().toISOString() };
      await putRecord("paystackcustomers", customer.id, customer);
    }
    raw.dva = { ...customer.dva, customerCode: customer.code };
    raw.dvaError = null;
    await putRecord("contracts", raw.id, raw);
    return raw.dva;
  } catch (e) {
    raw.dvaError = e.message; raw.dvaErrorAt = new Date().toISOString();
    await putRecord("contracts", raw.id, raw).catch(() => {});
    console.error("[dva]", e.message);
    return null;
  }
}

// A transfer arrived in a client's dedicated account (webhook charge.success,
// channel "dedicated_nuban"). Applies it to that client's plan with the
// earliest unpaid item and records it like any other payment.
export async function applyDedicatedTransfer(data) {
  const customerCode = data?.customer?.customer_code;
  const reference = data?.reference;
  if (!customerCode || !reference) return null;
  const payments = await listRecords("payments");
  if (payments.some(p => p.reference === reference)) return null; // already recorded
  const contracts = (await listRecords("contracts")).filter(c => c.dva?.customerCode === customerCode && !["cancelled", "draft"].includes(c.status));
  const amount = Math.round(Number(data.amount)) / 100;
  // Earliest due unpaid item first; otherwise any plan with a balance.
  const candidates = contracts.map(c => {
    const sum = paymentSummary(normaliseContract(c), payments.filter(p => p.contractId === c.id));
    const next = sum.schedule.find(m => m.balance > 0);
    return { c, sum, due: next?.dueDate || "9999" };
  }).filter(x => x.sum.balance > 0).sort((a, b) => a.due.localeCompare(b.due));
  const target = candidates[0]?.c || contracts[0];
  if (!target) { console.error("[dva] transfer from unknown customer", customerCode, reference); return null; }
  const { recordSuccessfulPayment } = await import("./contractPayments.js");
  const id = newId("pmt");
  await putRecord("payments", id, {
    id, contractId: target.id, reference, amount, currency: data.currency || "NGN", milestoneId: null, method: "bank_transfer", via: "paystack_dedicated_account",
    payerName: data.authorization?.sender_name || data.authorization?.account_name || "", bankReference: data.authorization?.narration || reference,
    status: "recording", createdAt: new Date().toISOString(),
  });
  return recordSuccessfulPayment(id, { paidAt: data.paid_at || new Date().toISOString(), paystackData: { channel: data.channel, sender: data.authorization?.sender_bank || "" } });
}

