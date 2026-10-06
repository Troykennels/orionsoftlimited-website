// Client view of a proposal (/q/<code>):
//   GET ?code=            → the proposal (first view tells the salesperson)
//   GET ?code=&pdf=1      → its PDF
//   POST { code, action: "accept", name, title, agree: true } → accept online
//   POST { code, action: "decline", reason }
import { putRecord } from "../_lib/records.js";
import { proposalByCode, totals, installments, effectiveStatus, acceptProposal, RECURRING } from "../_lib/proposals.js";
import { renderProposalPdf } from "../_lib/proposalPdf.js";
import { getCompanySettings } from "../_lib/settings.js";
import { notify } from "../_lib/office.js";
import { requestMeta } from "../_lib/fieldIntel.js";
import { claim } from "../store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const code = String(req.query.code || req.body?.code || "").toUpperCase();
  const p = await proposalByCode(code);
  if (!p || p.status === "draft") return res.status(404).json({ error: "This proposal link isn't valid. Ask us to send it again." });

  if (req.method === "GET" && req.query.pdf) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${p.number}.pdf"`);
    return res.send(Buffer.from(await renderProposalPdf(p)));
  }

  if (req.method === "GET") {
    if (p.status === "sent") {
      p.status = "viewed"; p.viewedAt = new Date().toISOString();
      await putRecord("proposals", p.id, p);
      await notify([p.ownerId], { type: "pipeline", title: `👀 ${p.client.organisation || p.client.name} opened proposal ${p.number}`, body: "A good moment to follow up.", link: p.dealId ? `pipeline:${p.dealId}` : "pipeline" }).catch(() => {});
    }
    const company = await getCompanySettings();
    const t = totals(p);
    return res.json({
      ok: true,
      proposal: {
        number: p.number, title: p.title, status: effectiveStatus(p), client: { name: p.client.name, organisation: p.client.organisation },
        intro: p.intro || "", terms: p.terms || "", currency: p.currency || "NGN", validUntil: p.validUntil, preparedBy: p.preparedBy,
        items: t.lines.map(l => ({ name: l.name, description: l.description, qty: l.qty, unitPrice: l.unitPrice, amount: l.amount, recurring: RECURRING[l.recurring] })),
        totals: { subtotal: t.subtotal, discount: t.discount, discountPct: p.discountPct, vat: t.vat, vatPct: p.vatPct, total: t.total },
        recurring: t.recurring.map(r => ({ ...r, interval: RECURRING[r.interval] })),
        schedule: installments(p).map(x => ({ title: x.title, percent: x.percent, dueDays: x.dueDays, amount: x.amount })),
        acceptedBy: p.acceptedBy ? { name: p.acceptedBy.name, at: p.acceptedBy.at } : null,
        payLink: p.contractId ? await (async () => { const { getRecord } = await import("../_lib/records.js"); const { payLink } = await import("../_lib/contracts.js"); const c = await getRecord("contracts", p.contractId); return c?.payCode ? payLink(c) : ""; })() : "",
      },
      company: { name: company.companyName, email: company.email, phone: company.phone },
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};
  const status = effectiveStatus(p);
  if (status === "accepted") return res.status(400).json({ error: "This proposal has already been accepted. Thank you!" });
  if (status === "declined") return res.status(400).json({ error: "This proposal was declined. Contact us if you've changed your mind." });
  if (status === "expired") return res.status(400).json({ error: "This proposal has expired. Contact us for an updated one." });

  if (b.action === "accept") {
    const name = String(b.name || "").trim();
    if (name.length < 3) return res.status(400).json({ error: "Type your full name to accept" });
    if (!b.agree) return res.status(400).json({ error: "Please confirm you agree to the proposal" });
    if (!(await claim(`orionsoft:lock:proposal:${p.id}`, 120))) return res.status(409).json({ error: "Already being processed. Refresh in a moment." });
    const { plan } = await acceptProposal(p, { name, title: b.title || "", ip: requestMeta(req).ip });
    const { payLink } = await import("../_lib/contracts.js");
    const { getRecord } = await import("../_lib/records.js");
    const raw = await getRecord("contracts", plan.id);
    return res.json({ ok: true, payLink: raw ? payLink(raw) : "", planNumber: plan.number });
  }

  if (b.action === "decline") {
    p.status = "declined"; p.declinedAt = new Date().toISOString(); p.declineReason = String(b.reason || "").slice(0, 600);
    await putRecord("proposals", p.id, p);
    await notify([p.ownerId], { type: "pipeline", title: `${p.client.organisation || p.client.name} declined ${p.number}`, body: p.declineReason || "No reason given", link: p.dealId ? `pipeline:${p.dealId}` : "pipeline" }).catch(() => {});
    return res.json({ ok: true });
  }
  return res.status(400).json({ error: "Unknown action" });
}
