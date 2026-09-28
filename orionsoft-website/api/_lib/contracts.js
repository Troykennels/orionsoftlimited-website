// Contract rules shared by the admin API, the signing and payment pages, the
// Paystack webhook and the PDFs: numbering, the milestone payment schedule,
// what has been paid, and the fields filled into every template.
import { listRecords, putRecord } from "./records.js";
import { incr } from "../store.js";
import { signSession } from "./auth.js";

export const PAY_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const siteUrl = () => (process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "");

export async function nextContractNumber() {
  const year = new Date().getFullYear();
  const n = await incr(`orionsoft:contracts:seq:${year}`);
  return `CTR-${year}-${String(n).padStart(3, "0")}`;
}

// Older contracts have no number / schedule / client block.
export function normaliseContract(c) {
  const out = { ...c };
  out.number = out.number || `CTR-${String(out.id || "").slice(-6).toUpperCase()}`;
  out.client = { name: out.recipientName || "", organisation: "", email: out.recipientEmail || "", phone: "", address: "", ...(out.client || {}) };
  out.schedule = Array.isArray(out.schedule) ? out.schedule : [];
  out.deliverables = Array.isArray(out.deliverables) ? out.deliverables : [];
  out.allowPartial = out.allowPartial !== false;
  return out;
}

export async function contractPayments(contractId) {
  return (await listRecords("payments")).filter(p => p.contractId === contractId);
}

// Money picture: what's been paid, what's left, and each milestone's status.
// Successful payments are applied to the milestone they were made for, and
// any unallocated amount to the earliest unpaid milestones.
export function paymentSummary(contract, payments) {
  const c = normaliseContract(contract);
  const ok = payments.filter(p => p.status === "success").sort((a, b) => String(a.verifiedAt || a.createdAt).localeCompare(String(b.verifiedAt || b.createdAt)));
  const total = round2(c.amount || 0);
  const paid = round2(ok.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const schedule = c.schedule.map(m => ({ ...m, amount: round2(m.amount), paid: 0 }));
  let loose = 0;
  for (const p of ok) {
    const m = p.milestoneId && schedule.find(x => x.id === p.milestoneId);
    if (m) { const take = Math.min(m.amount - m.paid, p.amount); m.paid = round2(m.paid + take); loose += p.amount - take; }
    else loose += Number(p.amount) || 0;
  }
  for (const m of schedule) {
    if (loose <= 0) break;
    const take = Math.min(m.amount - m.paid, loose);
    m.paid = round2(m.paid + take); loose = round2(loose - take);
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const m of schedule) {
    m.balance = round2(Math.max(0, m.amount - m.paid));
    m.payStatus = m.balance <= 0 ? "paid" : m.paid > 0 ? "part_paid" : m.dueDate && m.dueDate < today ? "overdue" : "unpaid";
  }
  return {
    total, paid, balance: round2(Math.max(0, total - paid)),
    schedule, pending: payments.filter(p => p.status === "awaiting_confirmation"),
    receipts: ok.map(p => ({ id: p.id, receiptNumber: p.receiptNumber, amount: p.amount, method: p.method || "paystack", paidAt: p.paidAt || p.verifiedAt, milestoneId: p.milestoneId || null })),
  };
}

// Next receipt number for a contract: CTR-2026-004-P001, P002…
export async function nextReceiptNumber(contract) {
  const c = normaliseContract(contract);
  // Atomic counter, seeded past any receipts issued before it existed.
  const issued = (await contractPayments(c.id)).filter(p => p.receiptNumber).length;
  let n = await incr(`orionsoft:contracts:receipt-seq:${c.id}`);
  while (n <= issued) n = await incr(`orionsoft:contracts:receipt-seq:${c.id}`);
  return `${c.number}-P${String(n).padStart(3, "0")}`;
}

export function payToken(contract) {
  return signSession({ sub: contract.id, role: "contract-pay", contractId: contract.id }, PAY_TOKEN_TTL_SECONDS);
}
export const payLink = contract => `${siteUrl()}/pay/contract/${contract.id}?token=${encodeURIComponent(payToken(contract))}`;

const longDate = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
export const money = (n, c = "NGN") => `${c} ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Filled into every template automatically.
export const AUTO_KEYS = ["contractNumber", "clientName", "contactName", "recipientName", "clientOrganisation", "clientEmail", "clientAddress", "effectiveDate", "endDate", "contractValue", "currency", "companyName", "companyAddress", "companyEmail", "companyPhone", "companyWebsite", "companyRc"];
export function autoFill(contract, company) {
  const c = normaliseContract(contract);
  return {
    // The party to an agreement is the organisation when there is one; letters address the person.
    contractNumber: c.number, clientName: c.client.organisation || c.client.name, contactName: c.client.name, recipientName: c.client.name,
    clientOrganisation: c.client.organisation || c.client.name, clientEmail: c.client.email, clientAddress: c.client.address,
    effectiveDate: longDate(c.effectiveDate), endDate: c.endDate ? longDate(c.endDate) : "",
    contractValue: c.amount ? money(c.amount, c.currency) : "", currency: c.currency || "NGN",
    companyName: company.companyName, companyAddress: company.address, companyEmail: company.email,
    companyPhone: company.phone, companyWebsite: company.website || "", companyRc: company.rc,
  };
}

export async function saveContract(c) {
  c.updatedAt = new Date().toISOString();
  await putRecord("contracts", c.id, c);
  return c;
}
