// Proposals (quotes): built from a price list, sent as a branded PDF with a
// link where the client reads and accepts it online. Accepting turns it into
// a payment plan (invoices, pay link, reminders, receipts), starts renewals
// for recurring items, and marks the deal won.
import { randomBytes } from "node:crypto";
import { listRecords, getRecord, putRecord, newId, setLookup, getByLookup } from "./records.js";
import { get, set, incr } from "../store.js";
import { notify } from "./office.js";

export const PRICE_LIST_KEY = "orionsoft:pricelist";
export const RECURRING = { once: "One-off", monthly: "per month", quarterly: "per quarter", yearly: "per year" };
export const SPLITS = {
  full: [["Full payment", 100, 0]],
  "50/50": [["Deposit", 50, 0], ["Balance", 50, 30]],
  "40/40/20": [["Deposit", 40, 0], ["Second payment", 40, 30], ["Final payment", 20, 60]],
  "30/30/30/10": [["Deposit", 30, 0], ["Second payment", 30, 30], ["Third payment", 30, 60], ["Final payment", 10, 90]],
};
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const lagosToday = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export async function getPriceList() { return (await get(PRICE_LIST_KEY)) || []; }
export async function savePriceList(items) {
  const clean = (Array.isArray(items) ? items : []).filter(i => String(i?.name || "").trim()).slice(0, 200).map(i => ({
    id: i.id || newId("pl"), name: String(i.name).trim().slice(0, 120), description: String(i.description || "").slice(0, 400),
    unitPrice: r2(Math.max(0, Number(i.unitPrice) || 0)), unit: String(i.unit || "").slice(0, 30),
    recurring: RECURRING[i.recurring] ? i.recurring : "once", product: String(i.product || "").slice(0, 40),
  }));
  await set(PRICE_LIST_KEY, clean);
  return clean;
}

export function cleanItems(items) {
  return (Array.isArray(items) ? items : []).filter(i => String(i?.name || "").trim()).slice(0, 60).map(i => ({
    name: String(i.name).trim().slice(0, 140), description: String(i.description || "").slice(0, 600),
    qty: Math.max(0, Number(i.qty) || 0) || 1, unitPrice: r2(Math.max(0, Number(i.unitPrice) || 0)),
    recurring: RECURRING[i.recurring] ? i.recurring : "once",
  }));
}

// Money: one-off items plus the first period of recurring ones are paid
// through the plan; recurring items renew automatically afterwards.
export function totals(p) {
  const items = p.items || [];
  const line = i => r2(i.qty * i.unitPrice);
  const subtotal = r2(items.reduce((s, i) => s + line(i), 0));
  const discount = r2(subtotal * Math.min(100, Math.max(0, Number(p.discountPct) || 0)) / 100);
  const afterDiscount = r2(subtotal - discount);
  const vat = r2(afterDiscount * Math.min(100, Math.max(0, Number(p.vatPct) || 0)) / 100);
  const total = r2(afterDiscount + vat);
  const factor = subtotal ? total / subtotal : 1;
  const recurring = items.filter(i => i.recurring !== "once").map(i => ({ name: i.name, interval: i.recurring, amount: r2(line(i) * factor) }));
  return { subtotal, discount, vat, total, recurring, lines: items.map(i => ({ ...i, amount: line(i) })) };
}

export function installments(p, startDate = lagosToday()) {
  const t = totals(p);
  const parts = (p.split === "custom" && Array.isArray(p.customSplit) && p.customSplit.length ? p.customSplit : SPLITS[p.split] || SPLITS.full)
    .map(x => (Array.isArray(x) ? x : [x.title, x.percent, x.dueDays]));
  let left = t.total;
  return parts.map(([title, pct, days], i) => {
    const amount = i === parts.length - 1 ? r2(left) : r2(t.total * Number(pct) / 100);
    left = r2(left - amount);
    return { title: String(title || `Payment ${i + 1}`), percent: Number(pct), dueDays: Number(days) || 0, amount, dueDate: addDays(startDate, Number(days) || 0) };
  });
}

export async function nextQuoteNumber() {
  const y = new Date().getFullYear();
  return `QT-${y}-${String(await incr(`orionsoft:proposals:seq:${y}`)).padStart(3, "0")}`;
}

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export async function ensureQuoteCode(p) {
  if (p.code) return p.code;
  p.code = Array.from(randomBytes(10), b => ALPHA[b % ALPHA.length]).join("");
  await setLookup("proposals", "code", p.code, p.id);
  return p.code;
}
export const proposalByCode = code => (/^[A-Z0-9]{8,16}$/.test(String(code || "")) ? getByLookup("proposals", "code", String(code)) : null);
export const quoteLink = p => `${(process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "")}/q/${p.code}`;

export function effectiveStatus(p) {
  if (["sent", "viewed"].includes(p.status) && p.validUntil && p.validUntil < lagosToday()) return "expired";
  return p.status;
}

// The client accepted: payment plan + renewals + deal won + everyone told.
export async function acceptProposal(p, { name, title = "", ip = "" }) {
  const today = lagosToday();
  p.status = "accepted";
  p.acceptedBy = { name: String(name).slice(0, 120), title: String(title).slice(0, 120), at: new Date().toISOString(), ip };
  const t = totals(p);
  const { createPlan } = await import("./planFactory.js");
  const plan = await createPlan({
    client: p.client, title: `${p.title} (${p.number})`, currency: p.currency || "NGN", vatIncluded: Number(p.vatPct) > 0,
    items: installments(p, today).map(x => ({ title: x.title, amount: x.amount, dueDate: x.dueDate, description: `${x.percent}% of ${p.number}` })),
    paymentTerms: p.paymentNote || "", source: { proposalId: p.id, proposalNumber: p.number }, createdBy: p.createdBy || "system",
  });
  p.contractId = plan.id; p.contractNumber = plan.number;
  // Recurring items renew automatically once their first period is up.
  if (t.recurring.length) {
    const { createSubscription } = await import("./subscriptions.js");
    const byInterval = {};
    for (const r of t.recurring) (byInterval[r.interval] = byInterval[r.interval] || []).push(r);
    p.subscriptionIds = [];
    for (const [interval, rs] of Object.entries(byInterval)) {
      const s = await createSubscription({ client: p.client, title: rs.map(r => r.name).join(" + "), items: rs.map(r => ({ name: r.name, amount: r.amount })), interval, startDate: today, currency: p.currency || "NGN", source: { proposalId: p.id, proposalNumber: p.number, dealId: p.dealId || null } });
      p.subscriptionIds.push(s.id);
    }
  }
  p.updatedAt = new Date().toISOString();
  await putRecord("proposals", p.id, p);
  if (p.dealId) {
    const d = await getRecord("deals", p.dealId);
    if (d) {
      d.stage = "won"; d.wonAt = new Date().toISOString(); d.value = t.total;
      d.timeline = [{ at: d.wonAt, by: "system", text: `Proposal ${p.number} accepted online by ${p.acceptedBy.name}. Payment plan ${plan.number} sent.`, kind: "won" }, ...(d.timeline || [])].slice(0, 100);
      await putRecord("deals", d.id, d);
    }
  }
  const owners = (await listRecords("employees")).filter(e => e.status === "active" && e.staffRole === "owner").map(e => e.id);
  await notify([p.ownerId, ...owners].filter(Boolean), { type: "pipeline", title: `🎉 ${p.client.organisation || p.client.name} accepted ${p.number}`, body: `${(p.currency || "NGN")} ${t.total.toLocaleString()} · payment plan ${plan.number} sent`, link: p.dealId ? `pipeline:${p.dealId}` : "pipeline" });
  return { proposal: p, plan };
}
