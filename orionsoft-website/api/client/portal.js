// Client portal data for the signed-in client (matched by email):
//   GET                         → plans/contracts, invoices, receipts, tickets
//   GET ?pdf=contract:<id> | invoice:<id> | receipt:<paymentId>  → that PDF
//   POST { action: "ticket", subject, message }        → open a support ticket
//   POST { action: "reply", id, message }               → reply on a ticket
// Every record is checked against the client's email before it's returned.
import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { getSessionFromRequest } from "../_lib/auth.js";
import { get } from "../store.js";
import { normaliseContract, paymentSummary, payLink } from "../_lib/contracts.js";
import { normaliseInvoice, computeTotals, isOverdue } from "../_lib/invoicing.js";
import { renderInvoicePdf } from "../_lib/pdf.js";
import { loadReceiptPdf } from "../_lib/contractPayments.js";
import { renderContractReceiptPdf } from "../_lib/contractPdf.js";
import { sendEmail, brandedShell } from "../_lib/mailer.js";
import { CLIENT_COOKIE } from "./auth.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const mineContract = (c, email) => String(c.client?.email || c.recipientEmail || "").toLowerCase() === email && c.status !== "draft";
const mineInvoice = (i, email) => String(i.clientEmail || "").toLowerCase() === email && i.status !== "draft";

function sendPdf(res, buf, name) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${name}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(Buffer.from(buf));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const s = getSessionFromRequest(req, CLIENT_COOKIE);
  if (!s || s.role !== "client" || !s.email) return res.status(401).json({ error: "Please sign in" });
  const email = String(s.email).toLowerCase();

  if (req.method === "GET" && req.query.pdf) {
    const [kind, id] = String(req.query.pdf).split(":");
    if (kind === "contract") {
      const c = await getRecord("contracts", id);
      if (!c || !mineContract(c, email)) return res.status(404).json({ error: "Not found" });
      const b64 = await get(c.signedPdfKey || c.pdfKey || "");
      return b64 ? sendPdf(res, Buffer.from(b64, "base64"), normaliseContract(c).number) : res.status(404).json({ error: "PDF not available yet" });
    }
    if (kind === "invoice") {
      const inv = await getRecord("invoices", id);
      if (!inv || !mineInvoice(inv, email)) return res.status(404).json({ error: "Not found" });
      return sendPdf(res, await renderInvoicePdf(inv), inv.invoiceNumber);
    }
    if (kind === "receipt") {
      const p = await getRecord("payments", id);
      const c = p && await getRecord("contracts", p.contractId);
      if (!p || p.status !== "success" || !c || !mineContract(c, email)) return res.status(404).json({ error: "Not found" });
      const pdf = (await loadReceiptPdf(p)) || await renderContractReceiptPdf(c, p, (await listRecords("payments")).filter(x => x.contractId === c.id));
      return sendPdf(res, pdf, p.receiptNumber);
    }
    return res.status(400).json({ error: "Unknown file" });
  }

  if (req.method === "GET") {
    const [contracts, invoices, payments, tickets] = await Promise.all([listRecords("contracts"), listRecords("invoices"), listRecords("payments"), listRecords("tickets")]);
    const mine = contracts.filter(c => mineContract(c, email)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const docs = mine.map(raw => {
      const c = normaliseContract(raw);
      const sum = paymentSummary(c, payments.filter(p => p.contractId === c.id));
      const next = sum.schedule.find(m => m.balance > 0) || null;
      return {
        id: c.id, number: c.number, title: c.title, kind: c.kind || "agreement", status: c.status, currency: c.currency,
        amount: c.amount, paid: sum.paid, balance: sum.balance, hasPdf: !!(raw.signedPdfKey || raw.pdfKey),
        next: next ? { title: next.title, dueDate: next.dueDate, balance: next.balance, overdue: next.payStatus === "overdue" } : null,
        items: sum.schedule.map(m => ({ title: m.title, amount: m.amount, dueDate: m.dueDate, payStatus: m.payStatus })),
        payLink: c.amount > 0 && raw.payCode && c.status !== "cancelled" ? payLink(raw) : "",
      };
    });
    const ids = new Set(mine.map(c => c.id));
    const receipts = payments.filter(p => ids.has(p.contractId) && p.status === "success")
      .sort((a, b) => String(b.paidAt || b.verifiedAt).localeCompare(String(a.paidAt || a.verifiedAt)))
      .map(p => ({ id: p.id, receiptNumber: p.receiptNumber, amount: p.amount, currency: p.currency || "NGN", paidAt: p.paidAt || p.verifiedAt, contractNumber: (mine.find(c => c.id === p.contractId) || {}).number || "" }));
    const invs = invoices.filter(i => mineInvoice(i, email)).map(i => {
      const n = normaliseInvoice(i), t = computeTotals(n);
      return { id: i.id, invoiceNumber: i.invoiceNumber, issueDate: i.issueDate, dueDate: i.dueDate, currency: i.currency, total: t.total, paid: t.amountPaid, balance: t.balance, status: i.status, overdue: isOverdue(n), contractNumber: i.source?.contractNumber || "" };
    }).sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)));
    const myTickets = tickets.filter(t => String(t.clientEmail || "").toLowerCase() === email)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .map(t => ({ id: t.id, subject: t.subject, status: t.status, createdAt: t.createdAt, updatedAt: t.updatedAt, description: t.description, comments: (t.comments || []).filter(c => !c.internal).map(c => ({ author: c.author, text: c.text, at: c.at, fromClient: !!c.fromClient })) }));
    const outstanding = docs.reduce((n, d) => n + (d.currency === "NGN" ? d.balance : 0), 0);
    return res.json({ ok: true, client: { email, name: s.name || "" }, summary: { outstanding, documents: docs.length, openTickets: myTickets.filter(t => !["resolved", "closed"].includes(t.status)).length }, documents: docs, invoices: invs, receipts, tickets: myTickets });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const message = String(b.message || "").trim().slice(0, 4000);
    if (b.action === "ticket") {
      const subject = String(b.subject || "").trim().slice(0, 160);
      if (!subject || !message) return res.status(400).json({ error: "Add a subject and a message" });
      const id = newId("tkt");
      const ticket = {
        id, subject, description: message, category: "Client support", priority: b.urgent ? "high" : "medium",
        raisedByName: s.name || email, clientEmail: email, assignedToId: null, assignedToName: "",
        status: "open", comments: [], resolvedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: `client:${email}`,
      };
      await putRecord("tickets", id, ticket);
      const to = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com";
      await sendEmail(to, `New client ticket: ${subject}`, brandedShell(`<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">New support ticket</h2>
        <p style="color:#3A4556;font-size:14px;line-height:1.7;"><strong>${esc(s.name || email)}</strong> (${esc(email)}) wrote:</p>
        <p style="color:#3A4556;font-size:14px;line-height:1.7;white-space:pre-wrap;background:#F4F6FA;border-radius:10px;padding:14px;">${esc(message)}</p>
        <p style="color:#3A4556;font-size:14px;">Reply in Admin → Helpdesk; the client is emailed your reply.</p>`, { title: "Client support" }), { kind: "client_ticket" }).catch(() => {});
      return res.json({ ok: true, id });
    }
    if (b.action === "reply") {
      const t = await getRecord("tickets", b.id);
      if (!t || String(t.clientEmail || "").toLowerCase() !== email) return res.status(404).json({ error: "Ticket not found" });
      if (!message) return res.status(400).json({ error: "Write your message" });
      t.comments = [...(t.comments || []), { id: newId("cmt"), author: s.name || email, text: message, at: new Date().toISOString(), fromClient: true }];
      if (["resolved", "closed"].includes(t.status)) t.status = "open";
      t.updatedAt = new Date().toISOString();
      await putRecord("tickets", t.id, t);
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: "Unknown action" });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
