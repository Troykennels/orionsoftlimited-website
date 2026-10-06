// Invoices that follow a payment plan or contract: one invoice per item /
// milestone, created when the plan goes live (or the agreement is signed),
// and kept in step with what's been paid. Payments are taken through the
// plan's payment link, so these invoices mirror it: paid, part-paid or
// outstanding, and voided if the plan is cancelled. Accounts see everything in
// Invoices without retyping anything.
import { listRecords, getRecord, putRecord, newId } from "./records.js";
import { incr } from "../store.js";
import { normaliseContract, paymentSummary, payLink } from "./contracts.js";
import { statusAfterPayment, computeTotals } from "./invoicing.js";

const today = () => new Date().toISOString().slice(0, 10);

async function nextInvoiceNumber() {
  const next = await incr("orionsoft:invoices:seq");
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(next).padStart(4, "0")}`;
}

export function invoicesWanted(c) {
  if (!(c.amount > 0) || c.status === "draft") return false;
  return c.kind === "plan" || ["signed", "active", "completed", "cancelled"].includes(c.status) || !!c.payBeforeSigning;
}

export async function syncContractInvoices(raw) {
  const c = normaliseContract(raw);
  if (!invoicesWanted(c)) return [];
  const [payments, invoices] = await Promise.all([listRecords("payments"), listRecords("invoices")]);
  const sum = paymentSummary(c, payments.filter(p => p.contractId === c.id));
  const mine = invoices.filter(i => i.source?.contractId === c.id);
  const out = [];
  for (const m of sum.schedule) {
    let inv = mine.find(i => i.source?.milestoneId === m.id);
    if (!inv) {
      if (c.status === "cancelled") continue;
      inv = {
        id: newId("inv"), invoiceNumber: await nextInvoiceNumber(),
        clientName: c.client.organisation || c.client.name, clientEmail: c.client.email || "", clientPhone: c.client.phone || "", clientAddress: c.client.address || "",
        currency: c.currency || "NGN", taxPercent: 0, taxLabel: "VAT", discountType: null, discountValue: 0,
        items: [{ description: `${m.title}${m.description ? `: ${m.description}` : ""} (${c.number})`, qty: 1, unitPrice: m.amount }],
        issueDate: today(), dueDate: m.dueDate || null,
        notes: `${c.vatIncluded ? "Amount includes VAT. " : ""}Part of ${c.title} (${c.number}). Pay securely at ${c.payCode ? payLink(raw) : "the payment link we sent you"}.`,
        terms: "", status: "sent", payments: [], pdfKey: null, paidAt: null, sentAt: new Date().toISOString(),
        source: { contractId: c.id, milestoneId: m.id, contractNumber: c.number },
        createdAt: new Date().toISOString(), createdBy: "system",
      };
    }
    // Mirror what's been paid towards this item.
    const lastPaid = sum.receipts.filter(r => !r.milestoneId || r.milestoneId === m.id).map(r => r.paidAt).filter(Boolean).sort().pop();
    inv.payments = m.paid > 0 ? [{ id: "plan", amount: m.paid, method: "other", reference: c.number, paidAt: String(lastPaid || new Date().toISOString()).slice(0, 10), notes: "Paid through the payment link" }] : [];
    if (c.status === "cancelled" && !(m.paid > 0)) inv.status = "void";
    else if (inv.status !== "void") {
      const t = computeTotals(inv);
      inv.status = statusAfterPayment(t.total, t.amountPaid);
      inv.paidAt = inv.status === "paid" ? inv.paidAt || new Date().toISOString() : null;
    }
    inv.dueDate = m.dueDate || inv.dueDate;
    inv.updatedAt = new Date().toISOString();
    await putRecord("invoices", inv.id, inv);
    out.push(inv);
  }
  return out;
}

export async function syncContractInvoicesById(id) {
  const raw = await getRecord("contracts", id);
  if (raw) await syncContractInvoices(raw);
}
