// Admin contracts: create from a template with structured details (client,
// dates, scope, deliverables, value and milestone payment schedule), send for
// signature, send the payment link, record/confirm payments with receipts,
// and track milestones. PDFs are generated fresh so they always show the
// current signing and payment state.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth, signSession } from "../_lib/auth.js";
import { set } from "../store.js";
import { renderContractPdfV2, renderContractReceiptPdf } from "../_lib/contractPdf.js";
import { sendEmail, brandedShell } from "../_lib/mailer.js";
import { notifyMilestoneCompleted } from "../_lib/emailTemplates.js";
import { logAudit } from "../_lib/audit.js";
import { getCompanySettings } from "../_lib/settings.js";
import { CONTRACT_TEMPLATES, fillTemplate } from "../_lib/contractTemplates.js";
import { normaliseContract, paymentSummary, nextContractNumber, autoFill, payLink, money, saveContract, siteUrl, ensurePayCode } from "../_lib/contracts.js";
import { ensureDedicatedAccount } from "../_lib/paystackDva.js";
import { recordSuccessfulPayment, loadReceiptPdf } from "../_lib/contractPayments.js";
import { PAYMENT_METHODS } from "../_lib/invoicing.js";

const SIGN_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const isDate = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const today = () => new Date().toISOString().slice(0, 10);
const LABELS = { recipientName: "client name", role: "job title", department: "department", startDate: "start date", salaryAmount: "salary amount", licensedProducts: "licensed product(s)", productName: "product name", purpose: "purpose" };

// Template settings come from the stored template, falling back to the
// built-in definition of its type.
function templateMeta(t) {
  const def = CONTRACT_TEMPLATES[t.type] || {};
  return { kind: t.kind || def.kind || "agreement", docLabel: t.docLabel || def.docLabel || "Agreement", requiresScope: t.requiresScope ?? def.requiresScope ?? false, payable: t.payable ?? def.payable ?? false, name: t.name };
}

// Validates the structured details. Returns { data } or { error }.
function cleanDetails(b, meta, { partial = false } = {}) {
  const d = {};
  const client = { ...(b.client || {}) };
  if (b.recipientName !== undefined && !client.name) client.name = b.recipientName;
  if (b.recipientEmail !== undefined && !client.email) client.email = b.recipientEmail;
  if (b.client || b.recipientName !== undefined || !partial) {
    d.client = {
      name: String(client.name || "").trim().slice(0, 120), organisation: String(client.organisation || "").trim().slice(0, 160),
      email: String(client.email || "").trim().slice(0, 160), phone: String(client.phone || "").trim().slice(0, 40), address: String(client.address || "").trim().slice(0, 400),
    };
    if (!d.client.name) return { error: "Enter the client's (or recipient's) name" };
    if (d.client.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.client.email)) return { error: "The client email doesn't look right" };
    d.recipientName = d.client.name; d.recipientEmail = d.client.email;
  }
  for (const k of ["effectiveDate", "endDate"]) {
    if (b[k] === undefined) continue;
    if (!b[k]) { d[k] = k === "effectiveDate" ? today() : null; continue; }
    if (!isDate(b[k])) return { error: `The ${k === "effectiveDate" ? "effective" : "end"} date isn't a valid date` };
    d[k] = b[k];
  }
  if (!partial && !d.effectiveDate) d.effectiveDate = today();
  if (d.endDate && d.endDate < (d.effectiveDate || b.effectiveDate || today())) return { error: "The end date can't be before the effective date" };
  if (b.scope !== undefined) d.scope = String(b.scope || "").trim().slice(0, 6000);
  if (b.deliverables !== undefined) d.deliverables = (Array.isArray(b.deliverables) ? b.deliverables : String(b.deliverables || "").split(/\n+/)).map(x => String(x).replace(/^\s*(?:[•*\-–]|\d{1,2}[.)])\s+/, "").trim()).filter(Boolean).slice(0, 40);
  if (meta.kind === "agreement" && meta.requiresScope && !partial) {
    if (!d.scope) return { error: "Describe the scope of work: this agreement needs it" };
    if (!d.deliverables?.length) return { error: "List at least one deliverable: this agreement needs them" };
  }
  if (b.currency !== undefined) { if (!CURRENCIES.includes(b.currency)) return { error: "Choose a supported currency" }; d.currency = b.currency; }
  if (b.amount !== undefined) { const a = round2(b.amount); if (!(a >= 0)) return { error: "The contract value can't be negative" }; d.amount = a; }
  if (b.vatIncluded !== undefined) d.vatIncluded = !!b.vatIncluded;
  if (b.allowPartial !== undefined) d.allowPartial = !!b.allowPartial;
  if (b.paymentTerms !== undefined) d.paymentTerms = String(b.paymentTerms || "").trim().slice(0, 2000);
  if (b.title !== undefined && String(b.title).trim()) d.title = String(b.title).trim().slice(0, 160);
  if (b.schedule !== undefined) {
    if (!Array.isArray(b.schedule)) return { error: "The payment schedule is invalid" };
    d.schedule = [];
    for (const m of b.schedule) {
      const title = String(m.title || "").trim().slice(0, 140);
      if (!title && !Number(m.amount)) continue;
      if (!title) return { error: "Every milestone needs a name" };
      const amount = round2(m.amount);
      if (!(amount > 0)) return { error: `Give "${title}" an amount above 0` };
      if (m.dueDate && !isDate(m.dueDate)) return { error: `"${title}" has an invalid due date` };
      d.schedule.push({ id: m.id || newId("ms"), title, description: String(m.description || "").trim().slice(0, 400), amount, dueDate: m.dueDate || null, trigger: String(m.trigger || "").trim().slice(0, 80), status: m.status === "completed" ? "completed" : "pending", completedAt: m.completedAt || null });
    }
  }
  const amount = d.amount ?? b.amountExisting ?? 0;
  const schedule = d.schedule ?? b.scheduleExisting;
  if (amount > 0 && schedule) {
    if (!schedule.length) d.schedule = [{ id: newId("ms"), title: "Full payment", description: "", amount, dueDate: null, trigger: "On signing", status: "pending", completedAt: null }];
    else {
      const sum = round2(schedule.reduce((s, m) => s + m.amount, 0));
      if (Math.abs(sum - amount) > 0.009) return { error: `The milestones add up to ${money(sum, d.currency || b.currency || "NGN")}, but the contract value is ${money(amount, d.currency || b.currency || "NGN")}. Make them match.` };
    }
  }
  if (amount === 0 && d.schedule?.length) return { error: "Set the contract value to match the payment schedule, or remove the milestones" };
  return { data: d };
}

// Something to pay: plans at once, agreements once signed (or when the
// client may pay before signing).
export const payable = c => c.amount > 0 && c.status !== "cancelled" && (c.kind === "plan" || ["signed", "active", "completed"].includes(c.status) || (c.payBeforeSigning && c.status !== "draft"));

// The document text: the contract's own edited copy if the admin changed it,
// otherwise the template. {{placeholders}} are filled either way.
async function fillBody(contract, template, fillData, { lenient = false } = {}) {
  const company = await getCompanySettings();
  let body = fillTemplate(contract.customBody || template.bodyMarkup, { ...autoFill(contract, company), ...fillData });
  if (lenient) body = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => `[${LABELS[k] || k.replace(/([A-Z])/g, " $1").toLowerCase()}]`);
  const missing = [...new Set([...body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]))];
  if (missing.length) return { error: `Fill in: ${missing.map(k => LABELS[k] || k.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ")}` };
  return { body };
}

async function pdfFor(contract) {
  const [sigs, payments, template] = await Promise.all([listRecords("signatories"), listRecords("payments"), getRecord("templates", contract.templateId)]);
  const c = normaliseContract(contract);
  return Buffer.from(await renderContractPdfV2(contract, sigs.filter(s => (contract.signatoryIds || []).includes(s.id)), {
    template: template ? templateMeta(template) : {}, payments: payments.filter(p => p.contractId === contract.id),
    payLinkUrl: c.amount > 0 && contract.payCode && (c.kind === "plan" || contract.payBeforeSigning || ["signed", "active", "completed"].includes(c.status)) ? payLink(contract) : "",
    dva: contract.dva || null,
  }));
}

async function storePdf(contract) {
  const key = `orionsoft:files:contract_${contract.id}`;
  await set(key, (await pdfFor(contract)).toString("base64"));
  contract.pdfKey = key;
}

function decorate(c, payments) {
  const n = normaliseContract(c);
  const mine = payments.filter(p => p.contractId === c.id);
  const sum = paymentSummary(n, mine);
  return {
    ...n, bodyFilled: undefined, signedSignatureImageDataUrl: undefined,
    paid: sum.paid, balance: sum.balance, scheduleStatus: sum.schedule,
    payments: mine.filter(p => p.status !== "initialized").map(p => ({ id: p.id, amount: p.amount, method: p.method || "paystack", status: p.status, receiptNumber: p.receiptNumber || "", bankReference: p.bankReference || p.reference || "", payerName: p.payerName || "", paidAt: p.paidAt || p.verifiedAt || null, createdAt: p.createdAt, milestoneId: p.milestoneId || null })),
    payLink: n.amount > 0 && n.status !== "cancelled" && c.payCode ? payLink(c) : "",
    payReady: payable(n), customBody: n.status === "draft" ? c.customBody || "" : undefined, hasCustomBody: !!c.customBody, payBeforeSigning: !!c.payBeforeSigning,
    dva: c.dva ? { bankName: c.dva.bankName, accountNumber: c.dva.accountNumber, accountName: c.dva.accountName } : null, dvaError: c.dvaError || null,
  };
}

async function emailClient(c, subject, heading, bodyHtml, attachments) {
  const company = await getCompanySettings();
  return sendEmail(c.client.email, subject, brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">${heading}</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${esc(c.client.name)},</p>
    ${bodyHtml}
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">Kind regards,<br>${esc(company.companyName)}</p>`, { title: heading }), { kind: "contract", attachments });
}
const btn = (href, label) => `<p style="margin:18px 0;"><a href="${href}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">${label}</a></p>`;

export async function sendPaymentLinkEmail(raw) {
  await ensurePayCode(raw);
  await ensureDedicatedAccount(raw);
  const c = normaliseContract(raw);
  const sum = paymentSummary(c, (await listRecords("payments")).filter(p => p.contractId === c.id));
  const next = sum.schedule.find(m => m.balance > 0);
  return emailClient(c, `Payment link: ${c.title} (${c.number})`, "Your payment link is ready",
    `<p style="color:#3A4556;font-size:14px;line-height:1.7;">Use the secure page below to pay for <strong>${esc(c.title)}</strong> (${c.number}). Choose the milestone you're paying for${c.allowPartial ? ", or pay part of the balance" : ""}, then pay online or by bank transfer.</p>
     <table role="presentation" style="background:#F4F6FA;border-radius:10px;padding:14px 16px;width:100%;font-size:13.5px;color:#3A4556;">
       <tr><td style="padding:4px 0;">Contract value</td><td style="text-align:right;">${money(sum.total, c.currency)}</td></tr>
       <tr><td style="padding:4px 0;">Paid so far</td><td style="text-align:right;">${money(sum.paid, c.currency)}</td></tr>
       <tr><td style="padding:4px 0;">Balance</td><td style="text-align:right;"><strong>${money(sum.balance, c.currency)}</strong></td></tr>
       ${next ? `<tr><td style="padding:4px 0;">Next payment</td><td style="text-align:right;"><strong>${esc(next.title)}: ${money(next.balance, c.currency)}</strong>${next.dueDate ? ` · due ${new Date(`${next.dueDate}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}</td></tr>` : ""}
     </table>
     ${raw.dva ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;">You can also transfer to your own account for this plan from any bank app. Payments are matched and receipted automatically:<br><strong style="font-size:17px;">${esc(raw.dva.accountNumber)}</strong> · ${esc(raw.dva.bankName)} · ${esc(raw.dva.accountName)}</p>` : ""}
     ${btn(payLink(raw), "Open payment page")}
     <p style="color:#6B7A96;font-size:12.5px;line-height:1.6;">Keep this email: the same link works for every payment until everything is paid. Link: ${payLink(raw)}</p>`);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    if (req.query.pdf) {
      const c = await getRecord("contracts", req.query.pdf);
      if (!c) return res.status(404).json({ error: "Contract not found" });
      const pdf = await pdfFor(c);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${req.query.download ? "attachment" : "inline"}; filename="${normaliseContract(c).number}.pdf"`);
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(pdf);
    }
    if (req.query.receipt) {
      const p = await getRecord("payments", req.query.receipt);
      if (!p || p.status !== "success") return res.status(404).json({ error: "Receipt not found" });
      const c = await getRecord("contracts", p.contractId);
      const pdf = (await loadReceiptPdf(p)) || Buffer.from(await renderContractReceiptPdf(c, p, (await listRecords("payments")).filter(x => x.contractId === c.id)));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${req.query.download ? "attachment" : "inline"}; filename="${p.receiptNumber}.pdf"`);
      return res.send(pdf);
    }
    const [contracts, payments] = await Promise.all([listRecords("contracts"), listRecords("payments")]);
    if (req.query.id) {
      const c = contracts.find(x => x.id === req.query.id);
      if (!c) return res.status(404).json({ error: "Contract not found" });
      return res.json({ ok: true, contract: { ...decorate(c, payments), bodyFilled: c.bodyFilled } });
    }
    return res.json({ ok: true, contracts: contracts.map(c => decorate(c, payments)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    // Live preview while composing: the real PDF, nothing saved.
    if (b.action === "preview") {
      const template = b.templateId ? await getRecord("templates", b.templateId) : null;
      if (!template) return res.status(400).json({ error: "Choose a template" });
      const meta = templateMeta(template);
      const client = { ...(b.client || {}) };
      if (!String(client.name || "").trim()) client.name = "Client name";
      const { data } = cleanDetails({ ...b, client, amount: b.amount ?? 0, schedule: b.schedule ?? [] }, { ...meta, requiresScope: false }, { partial: true });
      const draft = {
        id: b.id || "preview", templateId: template.id, type: template.type, kind: meta.kind, docLabel: meta.docLabel, number: b.number || "DRAFT",
        status: "draft", currency: "NGN", amount: 0, schedule: [], deliverables: [], ...(data || {}),
        title: (data && data.title) || `${meta.kind === "plan" ? "Payment plan" : template.name}: ${client.organisation || client.name}`,
        customBody: String(b.customBody || "").trim() ? String(b.customBody).slice(0, 60000) : null, createdAt: new Date().toISOString(),
      };
      draft.bodyFilled = (await fillBody(draft, template, b.fillData || {}, { lenient: true })).body;
      const sigs = (await listRecords("signatories")).filter(sg => (b.signatoryIds || []).includes(sg.id));
      const pdf = Buffer.from(await renderContractPdfV2(draft, sigs, { template: meta, payments: [], payLinkUrl: "" }));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "no-store");
      return res.send(pdf);
    }
    if (!b.templateId) return res.status(400).json({ error: "Choose a template" });
    const template = await getRecord("templates", b.templateId);
    if (!template) return res.status(404).json({ error: "Template not found" });
    const meta = templateMeta(template);
    const { data, error } = cleanDetails({ ...b, amount: b.amount ?? 0, schedule: b.schedule ?? [] }, meta);
    if (error) return res.status(400).json({ error });
    const id = newId("ctr");
    const contract = {
      id, templateId: template.id, type: template.type, kind: meta.kind, docLabel: meta.docLabel,
      title: data.title || `${meta.kind === "plan" ? "Payment plan" : template.name}: ${data.client.organisation || data.client.name}`,
      number: await nextContractNumber(),
      ...data, currency: data.currency || "NGN", amount: data.amount || 0, allowPartial: data.allowPartial !== false,
      scope: data.scope || "", deliverables: data.deliverables || [], paymentTerms: data.paymentTerms || "", schedule: data.schedule || [],
      fillData: Object.fromEntries(Object.entries(b.fillData || {}).filter(([, v]) => String(v ?? "").trim()).map(([k, v]) => [k, String(v).slice(0, 500)])),
      signatoryIds: Array.isArray(b.signatoryIds) ? b.signatoryIds : [], employeeId: b.employeeId || null,
      customBody: String(b.customBody || "").trim() ? String(b.customBody).slice(0, 60000) : null, payBeforeSigning: !!b.payBeforeSigning,
      status: "draft", milestones: [], pdfKey: null, signedPdfKey: null, sentAt: null, signedAt: null, signedByName: "", signedIp: "", completedAt: null,
      createdAt: new Date().toISOString(), createdBy: session.sub,
    };
    const filled = await fillBody(contract, template, contract.fillData);
    if (filled.error) return res.status(400).json({ error: filled.error });
    contract.bodyFilled = filled.body;
    if (contract.amount > 0) await ensurePayCode(contract);
    await storePdf(contract);
    await saveContract(contract);
    await logAudit(session, "create_contract", `contract ${contract.number}`, contract.title);
    return res.json({ ok: true, contract: decorate(contract, []) });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    if (!b.id) return res.status(400).json({ error: "id is required" });
    const raw = await getRecord("contracts", b.id);
    if (!raw) return res.status(404).json({ error: "Contract not found" });
    const c = normaliseContract(raw);
    const ref = `contract ${c.number}`;
    const allPayments = await listRecords("payments");
    const mine = allPayments.filter(p => p.contractId === c.id);

    if (b.action === "send") {
      if (raw.status !== "draft") return res.status(400).json({ error: "Only a draft can be sent. This one has already been sent, signed or cancelled." });
      if (!c.client.email) return res.status(400).json({ error: "Add the client's email address first" });
      const pdf = await pdfFor(raw);
      let emailSent, signLink = "";
      if (c.kind === "plan") {
        // Payment plans aren't signed: the client gets the payment link at once.
        await ensurePayCode(raw);
        await ensureDedicatedAccount(raw);
        raw.status = "active"; raw.sentAt = new Date().toISOString();
        await storePdf(raw); await saveContract(raw);
        emailSent = await sendPaymentLinkEmail(raw);
        if (emailSent) raw.paymentLinkSentAt = raw.sentAt;
      } else if (c.kind === "certificate") {
        emailSent = await emailClient(c, `${c.title} (${c.number})`, c.docLabel || "Your certificate", `<p style="color:#3A4556;font-size:14px;line-height:1.7;">Please find your ${esc(c.docLabel || "certificate")} attached.</p>`, [{ filename: `${c.number}.pdf`, content: pdf }]);
        raw.status = "completed"; raw.sentAt = raw.completedAt = new Date().toISOString();
      } else {
        const token = signSession({ sub: raw.id, role: "contract-sign", contractId: raw.id }, SIGN_TOKEN_TTL_SECONDS);
        const link = signLink = `${siteUrl()}/sign/${raw.id}?token=${token}`;
        emailSent = await emailClient(c, `Please review and sign: ${c.title} (${c.number})`, c.title,
          `<p style="color:#3A4556;font-size:14px;line-height:1.7;">Please review your ${esc(String(c.docLabel || "agreement").toLowerCase())} (${c.number}) and sign it electronically. A copy is attached.</p>${btn(link, "Review and sign")}${c.amount > 0 ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;">Once you've signed, we'll send a secure payment link for the first milestone.</p>` : ""}`,
          [{ filename: `${c.number}.pdf`, content: pdf }]);
        raw.status = "sent"; raw.sentAt = new Date().toISOString();
      }
      await storePdf(raw); await saveContract(raw);
      await logAudit(session, "send_contract", ref, c.title);
      return res.json({ ok: true, emailSent: !!emailSent, signLink, contract: decorate(raw, allPayments) });
    }

    if (b.action === "send_payment_link") {
      if (!payable(raw)) return res.status(400).json({ error: raw.status === "draft" ? "Send the document first" : "The contract must be signed first, or allow the client to pay before signing" });
      if (!(c.amount > 0)) return res.status(400).json({ error: "This contract has no amount to pay" });
      if (!c.client.email) return res.status(400).json({ error: "Add the client's email address first" });
      const emailSent = await sendPaymentLinkEmail(raw);
      if (emailSent) { raw.paymentLinkSentAt = new Date().toISOString(); await saveContract(raw); }
      await logAudit(session, "send_payment_link", ref, c.title);
      return res.json({ ok: true, emailSent: !!emailSent, contract: decorate(raw, allPayments) });
    }

    // A payment received outside Paystack (bank transfer, cash, POS, cheque).
    if (b.action === "record_payment") {
      if (!payable(raw) && raw.status !== "completed") return res.status(400).json({ error: "The contract must be signed before recording payments" });
      const sum = paymentSummary(c, mine);
      const amount = round2(b.amount);
      if (!(amount > 0)) return res.status(400).json({ error: "Enter an amount above 0" });
      if (amount > sum.balance + 0.004) return res.status(400).json({ error: `That's more than the balance of ${money(sum.balance, c.currency)}` });
      if (b.milestoneId && !sum.schedule.some(m => m.id === b.milestoneId)) return res.status(400).json({ error: "Milestone not found" });
      if (b.paidAt && !isDate(b.paidAt)) return res.status(400).json({ error: "Invalid payment date" });
      const id = newId("pmt");
      await putRecord("payments", id, { id, contractId: c.id, amount, currency: c.currency, milestoneId: b.milestoneId || null, method: PAYMENT_METHODS.includes(b.method) ? b.method : "bank_transfer", bankReference: String(b.reference || "").slice(0, 80), status: "recording", recordedBy: session.sub, createdAt: new Date().toISOString() });
      const p = await recordSuccessfulPayment(id, { paidAt: b.paidAt ? `${b.paidAt}T12:00:00.000Z` : new Date().toISOString() });
      await logAudit(session, "record_contract_payment", ref, `${money(amount, c.currency)} · ${p.receiptNumber}`);
      return res.json({ ok: true, receiptNumber: p.receiptNumber, contract: decorate(await getRecord("contracts", c.id), await listRecords("payments")) });
    }

    // Client reported a bank transfer: confirm (receipt goes out) or reject.
    if (b.action === "confirm_payment" || b.action === "reject_payment") {
      const p = mine.find(x => x.id === b.paymentId);
      if (!p || p.status !== "awaiting_confirmation") return res.status(404).json({ error: "No transfer waiting for confirmation" });
      if (b.action === "reject_payment") {
        p.status = "rejected"; p.rejectedReason = String(b.reason || "").slice(0, 300); p.rejectedAt = new Date().toISOString();
        await putRecord("payments", p.id, p);
        await logAudit(session, "reject_contract_payment", ref, p.rejectedReason);
      } else {
        const sum = paymentSummary(c, mine);
        if (p.amount > sum.balance + 0.004) return res.status(400).json({ error: `This transfer is more than the balance of ${money(sum.balance, c.currency)}` });
        const done = await recordSuccessfulPayment(p.id, { paidAt: p.transferDate ? `${p.transferDate}T12:00:00.000Z` : new Date().toISOString(), confirmedBy: session.sub });
        await logAudit(session, "confirm_contract_payment", ref, `${money(p.amount, c.currency)} · ${done.receiptNumber}`);
      }
      return res.json({ ok: true, contract: decorate(await getRecord("contracts", c.id), await listRecords("payments")) });
    }

    // Older documents get their short link the first time it's asked for.
    if (b.action === "get_payment_link") {
      if (!(c.amount > 0)) return res.status(400).json({ error: "This document has no amount to pay" });
      await ensurePayCode(raw); await saveContract(raw);
      return res.json({ ok: true, link: payLink(raw), contract: decorate(raw, allPayments) });
    }

    if (b.action === "update_milestone") {
      const ms = (raw.schedule || []).find(m => m.id === b.milestoneId) || (raw.milestones || []).find(m => m.id === b.milestoneId);
      if (!ms) return res.status(404).json({ error: "Milestone not found" });
      ms.status = b.status === "completed" ? "completed" : "pending";
      ms.completedAt = ms.status === "completed" ? new Date().toISOString() : null;
      await saveContract(raw);
      if (ms.status === "completed") { try { await notifyMilestoneCompleted(raw, ms); } catch { /* best-effort */ } }
      return res.json({ ok: true, contract: decorate(raw, allPayments) });
    }

    if (b.action === "add_milestone") {
      if (!String(b.title || "").trim()) return res.status(400).json({ error: "milestone title is required" });
      raw.milestones = raw.milestones || [];
      raw.milestones.push({ id: newId("ms"), title: String(b.title).trim().slice(0, 140), dueDate: b.dueDate || null, status: "pending", completedAt: null });
      await saveContract(raw);
      return res.json({ ok: true, contract: decorate(raw, allPayments) });
    }

    if (b.action === "cancel") {
      if (mine.some(p => p.status === "success")) return res.status(400).json({ error: "This contract has payments recorded, so it can't be cancelled. Mark it completed or record a refund separately." });
      raw.status = "cancelled"; await saveContract(raw);
      await logAudit(session, "cancel_contract", ref, c.title);
      return res.json({ ok: true, contract: decorate(raw, allPayments) });
    }

    if (b.action === "complete") {
      if (!["signed", "active"].includes(raw.status)) return res.status(400).json({ error: "Only a signed contract can be marked completed." });
      raw.status = "completed"; raw.completedAt = new Date().toISOString(); await saveContract(raw);
      await logAudit(session, "complete_contract", ref, c.title);
      return res.json({ ok: true, contract: decorate(raw, allPayments) });
    }

    if (b.action) return res.status(400).json({ error: "Unknown action" });

    // Edit (drafts only)
    if (raw.status !== "draft") return res.status(400).json({ error: "Only draft contracts can be edited." });
    const template = await getRecord("templates", raw.templateId);
    const meta = template ? templateMeta(template) : { kind: raw.kind || "agreement" };
    const { data, error } = cleanDetails({ ...b, amountExisting: raw.amount || 0, scheduleExisting: b.schedule === undefined ? raw.schedule : undefined }, meta, { partial: true });
    if (error) return res.status(400).json({ error });
    Object.assign(raw, data);
    if (b.fillData) raw.fillData = Object.fromEntries(Object.entries(b.fillData).filter(([, v]) => String(v ?? "").trim()).map(([k, v]) => [k, String(v).slice(0, 500)]));
    if (b.signatoryIds) raw.signatoryIds = b.signatoryIds;
    if (b.customBody !== undefined) raw.customBody = String(b.customBody || "").trim() ? String(b.customBody).slice(0, 60000) : null;
    if (b.payBeforeSigning !== undefined) raw.payBeforeSigning = !!b.payBeforeSigning;
    if ((raw.amount || 0) > 0) await ensurePayCode(raw);
    if (template) {
      const filled = await fillBody(raw, template, raw.fillData || {});
      if (filled.error) return res.status(400).json({ error: filled.error });
      raw.bodyFilled = filled.body;
    }
    await storePdf(raw); await saveContract(raw);
    return res.json({ ok: true, contract: decorate(raw, allPayments) });
  }

  if (req.method === "DELETE") {
    const c = await getRecord("contracts", req.query.id);
    if (!c) return res.status(404).json({ error: "Contract not found" });
    if (c.status !== "draft") return res.status(400).json({ error: "Only draft contracts can be deleted" });
    await deleteRecord("contracts", c.id);
    return res.json({ ok: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
