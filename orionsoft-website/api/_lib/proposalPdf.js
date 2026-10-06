// Proposal / quotation PDF on the company letterhead: client, items table,
// totals, payment schedule, renewals, terms, and how to accept online.
import { PDFDocument } from "pdf-lib";
import {
  PAGE_W, MARGIN, NAVY, GOLD, TEXT, MUTED, HAIRLINE, PANEL, WHITE_DIM,
  drawPageChrome, drawFooter, makeCursor, embedAllFonts, drawParagraphs, wrapPlain, rightAlignedX,
} from "./pdf.js";
import { parseRichText, pdfSafe } from "./richtext.js";
import { getCompanySettings } from "./settings.js";
import { totals, installments, RECURRING, quoteLink } from "./proposals.js";
import { amountInWords } from "./invoicing.js";

const W = PAGE_W - MARGIN * 2;
const money = (n, c = "NGN") => `${c} ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longDate = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

export async function renderProposalPdf(p) {
  const company = await getCompanySettings();
  const doc = await PDFDocument.create();
  doc.setTitle(`${p.title} (${p.number})`); doc.setAuthor(company.companyName);
  const fonts = await embedAllFonts(doc);
  const { regular: font, bold } = fonts;
  const first = doc.addPage([PAGE_W, 841.89]);
  const cursor = makeCursor(doc, fonts, drawPageChrome(first, font, bold, { withHeader: true }, company), company);
  const cur = p.currency || "NGN";
  const t = totals(p);
  const text = (s, opts) => cursor.page.drawText(pdfSafe(s), opts);
  const block = (s, f = font, size = 10, lh = 14.5, color = TEXT, x = MARGIN, width = W) => {
    for (const l of wrapPlain(pdfSafe(s), f, size, width)) { cursor.ensure(80); text(l, { x, y: cursor.y, size, font: f, color }); cursor.y -= lh; }
  };
  const heading = s => { cursor.ensure(110); cursor.y -= 6; text(s.toUpperCase(), { x: MARGIN, y: cursor.y, size: 8, font: bold, color: GOLD }); cursor.y -= 6; cursor.page.drawLine({ start: { x: MARGIN, y: cursor.y }, end: { x: PAGE_W - MARGIN, y: cursor.y }, thickness: 0.6, color: HAIRLINE }); cursor.y -= 16; };

  text("PROPOSAL", { x: MARGIN, y: cursor.y, size: 8, font: bold, color: GOLD }); cursor.y -= 22;
  for (const l of wrapPlain(pdfSafe(p.title), bold, 17, W)) { text(l, { x: MARGIN, y: cursor.y, size: 17, font: bold, color: NAVY }); cursor.y -= 21; }
  text(`${p.number}   ·   ${longDate(p.issuedAt || p.createdAt)}${p.validUntil ? `   ·   Valid until ${longDate(p.validUntil)}` : ""}`, { x: MARGIN, y: cursor.y, size: 9, font, color: MUTED }); cursor.y -= 24;

  // Prepared for / by
  const c = p.client || {};
  const leftRows = [c.organisation || c.name, c.organisation ? c.name : "", c.address, c.email, c.phone].filter(Boolean);
  const rightRows = [company.companyName, p.preparedBy || "", company.email, company.phone, company.website].filter(Boolean);
  const pw = (W - 14) / 2, h = 30 + Math.max(leftRows.length, rightRows.length) * 13.5 + 8;
  const top = cursor.y + 6;
  [[`PREPARED FOR`, leftRows, MARGIN], [`PREPARED BY`, rightRows, MARGIN + pw + 14]].forEach(([label, rows, x]) => {
    cursor.page.drawRectangle({ x, y: top - h, width: pw, height: h, color: PANEL, borderColor: HAIRLINE, borderWidth: 0.8 });
    text(label, { x: x + 12, y: top - 18, size: 7.5, font: bold, color: GOLD });
    rows.forEach((r, i) => text(wrapPlain(pdfSafe(r), i ? font : bold, 9.5, pw - 24)[0] || "", { x: x + 12, y: top - 34 - i * 13.5, size: 9.5, font: i ? font : bold, color: i ? MUTED : TEXT }));
  });
  cursor.y = top - h - 18;

  if (String(p.intro || "").trim()) { heading("Overview"); drawParagraphs(cursor, fonts, parseRichText(p.intro), 10, 15, W, TEXT, 120); }

  // Items
  heading("What's included");
  const amtR = PAGE_W - MARGIN - 8, qtyR = MARGIN + W * 0.62, unitR = MARGIN + W * 0.8;
  const head = () => {
    cursor.ensure(90);
    cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - 20, width: W, height: 20, color: PANEL });
    text("ITEM", { x: MARGIN + 8, y: cursor.y - 13, size: 7.5, font: bold, color: MUTED });
    text("QTY", { x: rightAlignedX("QTY", bold, 7.5, qtyR), y: cursor.y - 13, size: 7.5, font: bold, color: MUTED });
    text("UNIT PRICE", { x: rightAlignedX("UNIT PRICE", bold, 7.5, unitR), y: cursor.y - 13, size: 7.5, font: bold, color: MUTED });
    text("AMOUNT", { x: rightAlignedX("AMOUNT", bold, 7.5, amtR), y: cursor.y - 13, size: 7.5, font: bold, color: MUTED });
    cursor.y -= 20;
  };
  head();
  for (const it of t.lines) {
    const nameLines = wrapPlain(pdfSafe(it.name), bold, 9.5, W * 0.5);
    const desc = [it.description, it.recurring !== "once" ? `Billed ${RECURRING[it.recurring]}; renews automatically` : ""].filter(Boolean).join(" · ");
    const descLines = desc ? wrapPlain(pdfSafe(desc), font, 8.5, W * 0.5) : [];
    const rh = 10 + nameLines.length * 12.5 + descLines.length * 11 + 4;
    const before = cursor.page; cursor.ensure(rh + 70); if (cursor.page !== before) head();
    const y0 = cursor.y;
    nameLines.forEach((l, i) => text(l, { x: MARGIN + 8, y: y0 - 14 - i * 12.5, size: 9.5, font: bold, color: TEXT }));
    descLines.forEach((l, i) => text(l, { x: MARGIN + 8, y: y0 - 14 - nameLines.length * 12.5 - i * 11 + 1, size: 8.5, font, color: MUTED }));
    const q = String(it.qty), u = money(it.unitPrice, cur).replace(`${cur} `, ""), a = money(it.amount, cur).replace(`${cur} `, "");
    text(q, { x: rightAlignedX(q, font, 9.5, qtyR), y: y0 - 14, size: 9.5, font, color: TEXT });
    text(u, { x: rightAlignedX(u, font, 9.5, unitR), y: y0 - 14, size: 9.5, font, color: TEXT });
    text(a, { x: rightAlignedX(a, bold, 9.5, amtR), y: y0 - 14, size: 9.5, font: bold, color: TEXT });
    cursor.page.drawLine({ start: { x: MARGIN, y: y0 - rh }, end: { x: PAGE_W - MARGIN, y: y0 - rh }, thickness: 0.5, color: HAIRLINE });
    cursor.y = y0 - rh;
  }
  // Totals
  cursor.y -= 8;
  const row = (label, value, strong) => { cursor.ensure(80); text(label, { x: MARGIN + W * 0.55, y: cursor.y, size: strong ? 10.5 : 9.5, font: strong ? bold : font, color: strong ? NAVY : MUTED }); text(value, { x: rightAlignedX(value, strong ? bold : font, strong ? 10.5 : 9.5, amtR), y: cursor.y, size: strong ? 10.5 : 9.5, font: strong ? bold : font, color: strong ? NAVY : TEXT }); cursor.y -= strong ? 18 : 15; };
  row("Subtotal", money(t.subtotal, cur));
  if (t.discount) row(`Discount (${p.discountPct}%)`, `- ${money(t.discount, cur)}`);
  if (t.vat) row(`VAT (${p.vatPct}%)`, money(t.vat, cur));
  cursor.ensure(70);
  const vt = cursor.y + 8;
  cursor.page.drawRectangle({ x: MARGIN, y: vt - 40, width: W, height: 40, color: NAVY });
  cursor.page.drawRectangle({ x: MARGIN, y: vt - 40, width: 5, height: 40, color: GOLD });
  text("TOTAL", { x: MARGIN + 18, y: vt - 16, size: 7.5, font: bold, color: WHITE_DIM });
  const tot = money(t.total, cur);
  text(tot, { x: rightAlignedX(tot, bold, 15, PAGE_W - MARGIN - 14), y: vt - 28, size: 15, font: bold, color: GOLD });
  cursor.y = vt - 54;
  block(`In words: ${amountInWords(t.total, cur)}`, fonts.italic, 9, 13, MUTED);

  // Payment schedule
  heading("Payment schedule");
  block("Due dates count from the day you accept this proposal. You'll receive one secure payment link for every payment, with a receipt each time.", font, 9.5, 14, MUTED);
  cursor.y -= 4;
  for (const x of installments(p, p.acceptedBy?.at?.slice(0, 10) || undefined)) {
    cursor.ensure(80);
    text(`${x.title} (${x.percent}%)`, { x: MARGIN + 8, y: cursor.y, size: 9.5, font: bold, color: TEXT });
    const when = x.dueDays ? `${x.dueDays} days after acceptance` : "On acceptance";
    text(when, { x: MARGIN + W * 0.45, y: cursor.y, size: 9.5, font, color: MUTED });
    const a = money(x.amount, cur);
    text(a, { x: rightAlignedX(a, bold, 9.5, amtR), y: cursor.y, size: 9.5, font: bold, color: TEXT });
    cursor.y -= 16;
  }
  if (t.recurring.length) {
    cursor.y -= 4;
    block(`After the first period, these renew automatically: ${t.recurring.map(r => `${r.name}, ${money(r.amount, cur)} ${RECURRING[r.interval]}`).join("; ")}. We send the renewal invoice two weeks before each renewal date.`, font, 9.5, 14, TEXT);
  }

  if (String(p.terms || "").trim()) { heading("Terms"); drawParagraphs(cursor, fonts, parseRichText(p.terms), 9.5, 14, W, TEXT, 120); }

  // Accept
  heading("How to accept");
  block(p.code ? `Open ${quoteLink(p)} to review and accept this proposal online. Your payment plan and first payment link are sent straight away.` : "Reply to the email this proposal came with, or contact us, to accept.", font, 10, 15, TEXT);
  if (p.acceptedBy) { cursor.y -= 4; block(`Accepted online by ${p.acceptedBy.name}${p.acceptedBy.title ? `, ${p.acceptedBy.title}` : ""} on ${longDate(p.acceptedBy.at)}.`, bold, 10, 15, NAVY); }

  cursor.pages.forEach((pg, i) => drawFooter(pg, font, i + 1, cursor.pages.length, `Proposal ${p.number}`, company));
  return doc.save();
}
