// Creates and sends a payment plan from code (an accepted proposal, a
// subscription renewal), exactly as if the admin had made it in Contracts:
// numbered, with its PDF, short payment link, per-item invoices, reminders
// and receipts.
import { listRecords, putRecord, newId } from "./records.js";
import { set } from "../store.js";
import { nextContractNumber, autoFill, ensurePayCode, saveContract, normaliseContract } from "./contracts.js";
import { CONTRACT_TEMPLATES, fillTemplate } from "./contractTemplates.js";
import { getCompanySettings } from "./settings.js";
import { renderContractPdfV2 } from "./contractPdf.js";

async function planTemplate() {
  const existing = (await listRecords("templates")).find(t => t.type === "payment_plan");
  if (existing) return existing;
  const def = CONTRACT_TEMPLATES.payment_plan, now = new Date().toISOString();
  const t = { id: newId("tpl"), type: "payment_plan", name: def.name, bodyMarkup: def.bodyMarkup, createdAt: now, updatedAt: now };
  await putRecord("templates", t.id, t);
  return t;
}

const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// items: [{ title, amount, dueDate, description? }]; client: { name, organisation, email, phone, address }
export async function createPlan({ client, title, items, currency = "NGN", vatIncluded = false, paymentTerms = "", source = null, send = true, createdBy = "system" }) {
  const template = await planTemplate();
  const def = CONTRACT_TEMPLATES.payment_plan;
  const schedule = items.filter(i => r2(i.amount) > 0).map(i => ({
    id: newId("ms"), title: String(i.title).slice(0, 140), description: String(i.description || "").slice(0, 400), amount: r2(i.amount),
    dueDate: i.dueDate || null, trigger: "", status: "pending", completedAt: null,
  }));
  if (!schedule.length) throw new Error("A payment plan needs at least one item with an amount");
  const amount = r2(schedule.reduce((s, m) => s + m.amount, 0));
  const c = {
    id: newId("ctr"), templateId: template.id, type: "payment_plan", kind: "plan", docLabel: def.docLabel,
    title: String(title || `Payment plan: ${client.organisation || client.name}`).slice(0, 160),
    number: await nextContractNumber(),
    client: { name: client.name || client.organisation || "Client", organisation: client.organisation || "", email: client.email || "", phone: client.phone || "", address: client.address || "" },
    recipientName: client.name || "", recipientEmail: client.email || "",
    effectiveDate: new Date().toISOString().slice(0, 10), endDate: null, currency, amount, vatIncluded, allowPartial: true,
    scope: "", deliverables: [], paymentTerms, schedule, fillData: {}, signatoryIds: [], customBody: null, payBeforeSigning: false,
    status: "draft", milestones: [], pdfKey: null, signedPdfKey: null, sentAt: null, signedAt: null, signedByName: "", completedAt: null,
    source, createdAt: new Date().toISOString(), createdBy,
  };
  const company = await getCompanySettings();
  c.bodyFilled = fillTemplate(template.bodyMarkup, { ...autoFill(c, company) }).replace(/\{\{\s*(\w+)\s*\}\}/g, "");
  await ensurePayCode(c);
  if (send) { c.status = "active"; c.sentAt = new Date().toISOString(); }
  const key = `orionsoft:files:contract_${c.id}`;
  await set(key, Buffer.from(await renderContractPdfV2(c, [], { template: { kind: "plan", docLabel: def.docLabel, name: def.name } })).toString("base64"));
  c.pdfKey = key;
  await saveContract(c); // also creates the per-item invoices once live
  if (send && c.client.email) {
    const { sendPaymentLinkEmail } = await import("../admin/contracts.js");
    const ok = await sendPaymentLinkEmail(c).catch(() => false);
    if (ok) { c.paymentLinkSentAt = new Date().toISOString(); await saveContract(c); }
  }
  return normaliseContract(c);
}
