// Staff Office proposals (sales staff with the pipeline permission).
//   GET                      → my proposals (everyone's with pipeline.all) + price list
//   GET ?pdf=<id>            → the proposal PDF
//   POST { ...fields }       → create or update a draft (id to update)
//   POST { action: "send", id }      → email it to the client with the accept link
//   POST { action: "duplicate", id } / { action: "delete", id }
//   POST { action: "pricelist", items } → save the shared price list (pipeline.all)
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { officeContext, logActivity } from "../_lib/office.js";
import { getPriceList, savePriceList, cleanItems, totals, installments, nextQuoteNumber, ensureQuoteCode, quoteLink, effectiveStatus, SPLITS } from "../_lib/proposals.js";
import { renderProposalPdf } from "../_lib/proposalPdf.js";
import { sendEmail, brandedShell } from "../_lib/mailer.js";
import { getCompanySettings } from "../_lib/settings.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const lagosToday = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);

function view(p) {
  const t = totals(p);
  return { ...p, status: effectiveStatus(p), totals: t, schedule: installments(p), link: p.code ? quoteLink(p) : "" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me } = ctx;
  const all = ctx.can("pipeline.all");
  if (!all && !ctx.can("pipeline")) return res.status(403).json({ error: "Proposals are for the sales team" });
  const mine = p => all || p.ownerId === me.id;

  if (req.method === "GET") {
    if (req.query.pdf) {
      const p = await getRecord("proposals", req.query.pdf);
      if (!p || !mine(p)) return res.status(404).json({ error: "Proposal not found" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${p.number}.pdf"`);
      return res.send(Buffer.from(await renderProposalPdf(p)));
    }
    const list = (await listRecords("proposals")).filter(mine).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(view);
    return res.json({ ok: true, proposals: list, priceList: await getPriceList(), splits: Object.keys(SPLITS), canEditPrices: all || me.staffRole === "owner" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};

  if (b.action === "pricelist") {
    if (!all && me.staffRole !== "owner") return res.status(403).json({ error: "Only sales managers can change the price list" });
    return res.json({ ok: true, priceList: await savePriceList(b.items) });
  }

  const existing = b.id ? await getRecord("proposals", b.id) : null;
  if (b.id && (!existing || !mine(existing))) return res.status(404).json({ error: "Proposal not found" });

  if (b.action === "delete") {
    if (existing.status !== "draft") return res.status(400).json({ error: "Only drafts can be deleted" });
    await deleteRecord("proposals", existing.id);
    return res.json({ ok: true });
  }

  if (b.action === "duplicate") {
    const copy = { ...existing, id: newId("qt"), number: await nextQuoteNumber(), status: "draft", code: null, acceptedBy: null, contractId: null, contractNumber: null, subscriptionIds: [], sentAt: null, viewedAt: null, declinedAt: null, issuedAt: null, validUntil: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ownerId: me.id, createdBy: me.id };
    await putRecord("proposals", copy.id, copy);
    return res.json({ ok: true, proposal: view(copy) });
  }

  if (b.action === "send") {
    const p = existing;
    if (["accepted", "declined"].includes(p.status)) return res.status(400).json({ error: `This proposal was already ${p.status}` });
    if (!p.client?.email) return res.status(400).json({ error: "Add the client's email first" });
    if (!(totals(p).total > 0)) return res.status(400).json({ error: "Add at least one priced item" });
    await ensureQuoteCode(p);
    p.status = "sent"; p.sentAt = new Date().toISOString(); p.issuedAt = p.issuedAt || lagosToday();
    if (!p.validUntil) p.validUntil = new Date(Date.parse(`${lagosToday()}T12:00:00Z`) + 30 * 86400000).toISOString().slice(0, 10);
    await putRecord("proposals", p.id, p);
    const company = await getCompanySettings();
    const t = totals(p);
    const pdf = Buffer.from(await renderProposalPdf(p));
    const ok = await sendEmail(p.client.email, `Proposal ${p.number}: ${p.title}`, brandedShell(`
      <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">${esc(p.title)}</h2>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${esc(p.client.name || "Sir/Madam")}, thank you for your interest in ${esc(company.companyName)}. Please find our proposal attached (${p.number}).</p>
      <table role="presentation" style="background:#F4F6FA;border-radius:10px;padding:14px 16px;width:100%;font-size:14px;color:#3A4556;">
        <tr><td style="padding:4px 0;">Total</td><td style="text-align:right;"><strong>${p.currency || "NGN"} ${t.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></td></tr>
        <tr><td style="padding:4px 0;">Valid until</td><td style="text-align:right;">${new Date(`${p.validUntil}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
      </table>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">You can review it and accept online in a minute. Once you accept, your payment plan and first payment link arrive straight away.</p>
      <p style="margin:18px 0;"><a href="${quoteLink(p)}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Review and accept</a></p>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Questions? Reply to this email or call ${esc(company.phone)}.<br>Kind regards,<br>${esc(p.preparedBy || me.fullName)}, ${esc(company.companyName)}</p>`, { title: "Proposal" }),
      { kind: "proposal", attachments: [{ filename: `${p.number}.pdf`, content: pdf }] });
    if (p.dealId) {
      const d = await getRecord("deals", p.dealId);
      if (d && !["won", "lost"].includes(d.stage)) {
        d.stage = "proposal"; d.value = t.total;
        d.timeline = [{ at: new Date().toISOString(), by: me.id, text: `Proposal ${p.number} sent (${p.currency || "NGN"} ${t.total.toLocaleString()})`, kind: "proposal" }, ...(d.timeline || [])].slice(0, 100);
        await putRecord("deals", d.id, d);
      }
    }
    await logActivity(me.id, "pipeline", `Sent proposal ${p.number} to ${p.client.organisation || p.client.name}`);
    return res.json({ ok: true, emailSent: !!ok, proposal: view(p) });
  }

  // Create / update a draft (or an unaccepted sent one).
  if (existing && ["accepted", "declined"].includes(existing.status)) return res.status(400).json({ error: "Accepted or declined proposals can't be changed. Duplicate it instead." });
  const items = cleanItems(b.items);
  const client = { ...(existing?.client || {}), ...(b.client || {}) };
  let deal = null;
  if (b.dealId) { deal = await getRecord("deals", b.dealId); if (deal && !all && deal.ownerId !== me.id) deal = null; }
  const p = {
    ...(existing || { id: newId("qt"), number: await nextQuoteNumber(), status: "draft", ownerId: me.id, createdBy: me.id, createdAt: new Date().toISOString() }),
    dealId: deal?.id || existing?.dealId || null,
    title: String(b.title || existing?.title || `Proposal for ${client.organisation || client.name || "client"}`).slice(0, 160),
    client: {
      name: String(client.name || deal?.contactPerson || "").slice(0, 120), organisation: String(client.organisation || deal?.organisation || "").slice(0, 160),
      email: String(client.email || deal?.contactEmail || "").trim().toLowerCase().slice(0, 160), phone: String(client.phone || deal?.contactPhone || "").slice(0, 40), address: String(client.address || "").slice(0, 400),
    },
    intro: String(b.intro ?? existing?.intro ?? "").slice(0, 20000), terms: String(b.terms ?? existing?.terms ?? "").slice(0, 20000),
    items: items.length ? items : existing?.items || [],
    discountPct: Math.min(100, Math.max(0, Number(b.discountPct ?? existing?.discountPct) || 0)),
    vatPct: Math.min(100, Math.max(0, Number(b.vatPct ?? existing?.vatPct) || 0)),
    currency: ["NGN", "USD", "GBP", "EUR"].includes(b.currency) ? b.currency : existing?.currency || "NGN",
    split: SPLITS[b.split] || b.split === "custom" ? b.split : existing?.split || "50/50",
    customSplit: Array.isArray(b.customSplit) ? b.customSplit.slice(0, 8).map(x => ({ title: String(x.title || "Payment").slice(0, 60), percent: Number(x.percent) || 0, dueDays: Math.max(0, parseInt(x.dueDays, 10) || 0) })) : existing?.customSplit || [],
    validUntil: DATE.test(b.validUntil || "") ? b.validUntil : existing?.validUntil || null,
    preparedBy: String(b.preparedBy || existing?.preparedBy || me.fullName).slice(0, 120),
    paymentNote: String(b.paymentNote ?? existing?.paymentNote ?? "").slice(0, 600),
    updatedAt: new Date().toISOString(),
  };
  if (p.split === "custom") {
    const sum = p.customSplit.reduce((s, x) => s + x.percent, 0);
    if (!p.customSplit.length || Math.abs(sum - 100) > 0.01) return res.status(400).json({ error: `Custom payment parts add up to ${sum}%. Make them 100%.` });
  }
  await putRecord("proposals", p.id, p);
  return res.json({ ok: true, proposal: view(p) });
}
