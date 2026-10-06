// Recurring billing: hosting, licences, support plans. Each subscription
// renews on its date: a set number of days before (14 by default) the client
// is sent a payment plan for the renewal, with its invoice, pay link,
// reminders and receipt, and the next renewal date moves on by one period.
import { listRecords, getRecord, putRecord, newId } from "./records.js";
import { notify } from "./office.js";

export const INTERVALS = { monthly: 1, quarterly: 3, yearly: 12 };
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const lagosToday = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);

export function addInterval(date, interval) {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + (INTERVALS[interval] || 12));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); // 31 Jan + 1 month = 28/29 Feb
  return d.toISOString().slice(0, 10);
}

export function periodLabel(start, interval) {
  const end = new Date(Date.parse(`${addInterval(start, interval)}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const f = d => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${f(start)} to ${f(end)}`;
}

export function cleanSubscription(b, prev = {}) {
  const items = (Array.isArray(b.items) ? b.items : prev.items || []).filter(i => String(i?.name || "").trim()).slice(0, 20)
    .map(i => ({ name: String(i.name).trim().slice(0, 140), amount: r2(Math.max(0, Number(i.amount) || 0)) }));
  const client = { ...(prev.client || {}), ...(b.client || {}) };
  return {
    client: { name: String(client.name || "").trim().slice(0, 120), organisation: String(client.organisation || "").trim().slice(0, 160), email: String(client.email || "").trim().toLowerCase().slice(0, 160), phone: String(client.phone || "").slice(0, 40), address: String(client.address || "").slice(0, 400) },
    title: String(b.title ?? prev.title ?? "").trim().slice(0, 160) || items.map(i => i.name).join(" + "),
    items, amount: r2(items.reduce((s, i) => s + i.amount, 0)),
    interval: INTERVALS[b.interval] ? b.interval : prev.interval || "yearly",
    currency: ["NGN", "USD", "GBP", "EUR"].includes(b.currency) ? b.currency : prev.currency || "NGN",
    nextRenewal: /^\d{4}-\d{2}-\d{2}$/.test(b.nextRenewal || "") ? b.nextRenewal : prev.nextRenewal,
    leadDays: Math.min(60, Math.max(0, parseInt(b.leadDays ?? prev.leadDays ?? 14, 10) || 0)),
  };
}

export async function createSubscription({ client, title, items, interval = "yearly", startDate = lagosToday(), currency = "NGN", source = null, nextRenewal = null, leadDays = 14 }) {
  const s = {
    id: newId("sub"), ...cleanSubscription({ client, title, items, interval, currency, leadDays, nextRenewal: nextRenewal || addInterval(startDate, interval) }),
    status: "active", startDate, source, history: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  if (!s.amount) throw new Error("A subscription needs an amount");
  if (!s.client.email) throw new Error("A subscription needs the client's email");
  await putRecord("subscriptions", s.id, s);
  return s;
}

// Bill one renewal now: a payment plan due on the renewal date.
export async function billRenewal(s) {
  const { createPlan } = await import("./planFactory.js");
  const due = s.nextRenewal;
  const plan = await createPlan({
    client: s.client, title: `${s.title}: renewal`, currency: s.currency,
    items: [{ title: `${s.title} (${periodLabel(due, s.interval)})`, amount: s.amount, dueDate: due, description: s.items.map(i => `${i.name}: ${i.amount.toLocaleString()}`).join(" · ") }],
    source: { subscriptionId: s.id }, paymentTerms: "Renews automatically. Tell us if you'd like to change or stop this service.",
  });
  s.history = [{ periodStart: due, contractId: plan.id, contractNumber: plan.number, amount: s.amount, billedAt: new Date().toISOString() }, ...(s.history || [])].slice(0, 60);
  s.lastBilled = due;
  s.nextRenewal = addInterval(due, s.interval);
  s.updatedAt = new Date().toISOString();
  await putRecord("subscriptions", s.id, s);
  return plan;
}

// Daily: bill every active subscription whose renewal is within its lead time.
export async function renewDue(today = lagosToday()) {
  const subs = (await listRecords("subscriptions")).filter(s => s.status === "active" && s.nextRenewal);
  const billed = [];
  for (const s of subs) {
    const billFrom = new Date(Date.parse(`${s.nextRenewal}T12:00:00Z`) - (s.leadDays ?? 14) * 86400000).toISOString().slice(0, 10);
    if (billFrom > today || s.lastBilled === s.nextRenewal) continue;
    try { billed.push({ s, plan: await billRenewal(s) }); } catch (e) { console.error("[renewals]", s.id, e.message); }
  }
  if (billed.length) {
    const owners = (await listRecords("employees")).filter(e => e.status === "active" && e.staffRole === "owner").map(e => e.id);
    await notify(owners, { type: "system", title: `${billed.length} renewal${billed.length === 1 ? "" : "s"} billed today`, body: billed.map(b => `${b.s.client.organisation || b.s.client.name}: ${b.s.currency} ${b.s.amount.toLocaleString()}`).join(" · "), link: "home" });
  }
  return billed.length;
}

export async function getSubscription(id) { return getRecord("subscriptions", id); }
