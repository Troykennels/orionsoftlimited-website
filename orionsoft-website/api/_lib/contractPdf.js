// Contract and receipt PDFs. Agreement layout: letterhead, document label and
// title, summary card, numbered sections (parties, scope, deliverables, term,
// fees and payment schedule, terms and conditions), signature cards and an
// electronic signing record. Sections only appear when they have content, so
// a contract can never print an empty "Scope" or "Deliverables" heading.
import { PDFDocument, rgb } from "pdf-lib";
import {
  PAGE_W, PAGE_H, MARGIN, NAVY, GOLD, TEXT, MUTED, HAIRLINE, PANEL, WHITE, WHITE_DIM,
  drawPageChrome, drawFooter, makeCursor, embedAllFonts, embedSignatureImage, drawParagraphs, wrapPlain, rightAlignedX,
} from "./pdf.js";
import { parseRichText } from "./richtext.js";
import { getCompanySettings } from "./settings.js";
import { normaliseContract, paymentSummary, money } from "./contracts.js";
import { amountInWords } from "./invoicing.js";

const W = PAGE_W - MARGIN * 2;
const GREEN = rgb(0.08, 0.5, 0.24), AMBER = rgb(0.71, 0.33, 0.04), RED = rgb(0.72, 0.11, 0.11);
const longDate = d => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }) : "");
const dateTime = d => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }) + " WAT" : "");
const METHOD = { paystack: "Card / bank (Paystack)", bank_transfer: "Bank transfer", cash: "Cash", pos: "POS", cheque: "Cheque", other: "Other" };

function sectionHeading(cursor, fonts, n, title) {
  cursor.ensure(110);
  cursor.y -= 8;
  cursor.page.drawText(String(n).padStart(2, "0"), { x: MARGIN, y: cursor.y, size: 9, font: fonts.bold, color: GOLD });
  cursor.page.drawText(title, { x: MARGIN + 22, y: cursor.y, size: 12.5, font: fonts.bold, color: NAVY });
  cursor.page.drawLine({ start: { x: MARGIN, y: cursor.y - 7 }, end: { x: PAGE_W - MARGIN, y: cursor.y - 7 }, thickness: 0.6, color: HAIRLINE });
  cursor.y -= 24;
}

function textBlock(cursor, font, text, size = 10, lh = 14.5, color = TEXT, x = MARGIN, width = W) {
  for (const line of wrapPlain(text, font, size, width)) {
    cursor.ensure(70);
    cursor.page.drawText(line, { x, y: cursor.y, size, font, color });
    cursor.y -= lh;
  }
}

// Two side-by-side panels whose height fits the longer one.
function twoPanels(cursor, fonts, left, right) {
  const gap = 14, pw = (W - gap) / 2, pad = 12;
  const lines = p => p.rows.flatMap(r => wrapPlain(r.text, r.bold ? fonts.bold : fonts.regular, r.size || 9.5, pw - pad * 2).map(t => ({ ...r, text: t })));
  const L = lines(left), R = lines(right);
  const h = 30 + Math.max(L.length, R.length) * 13.5 + 8;
  cursor.ensure(h + 50);
  const top = cursor.y + 6;
  [[left, L, MARGIN], [right, R, MARGIN + pw + gap]].forEach(([p, ls, x]) => {
    cursor.page.drawRectangle({ x, y: top - h, width: pw, height: h, color: PANEL, borderColor: HAIRLINE, borderWidth: 0.8 });
    cursor.page.drawText(p.label, { x: x + pad, y: top - 18, size: 7.5, font: fonts.bold, color: GOLD });
    ls.forEach((r, i) => cursor.page.drawText(r.text, { x: x + pad, y: top - 34 - i * 13.5, size: r.size || 9.5, font: r.bold ? fonts.bold : fonts.regular, color: r.muted ? MUTED : TEXT }));
  });
  cursor.y = top - h - 16;
}

async function drawSignatureCards(doc, cursor, fonts, contract, company, signatories, kind) {
  const c = contract, signed = ["signed", "active", "completed"].includes(c.status);
  const gap = 14, pw = kind === "certificate" ? W * 0.55 : (W - gap) / 2, h = 168;
  cursor.ensure(h + 80);
  cursor.y -= 6;
  const title = kind === "certificate" ? "Issued and authorised" : "Agreement & acceptance";
  cursor.page.drawText(title, { x: MARGIN, y: cursor.y, size: 12.5, font: fonts.bold, color: NAVY });
  cursor.y -= 16;
  if (kind !== "certificate") {
    textBlock(cursor, fonts.regular, "By signing below, the parties confirm they have read, understood and agree to the terms of this document.", 9.5, 13, MUTED);
  }
  cursor.y -= 6;
  const top = cursor.y;
  const sig = signatories[0];
  const card = async (x, label, heading, sub, img, typedName, name, role, dateLabel) => {
    cursor.page.drawRectangle({ x, y: top - h, width: pw, height: h, color: WHITE, borderColor: HAIRLINE, borderWidth: 0.8 });
    cursor.page.drawText(label, { x: x + 12, y: top - 18, size: 7.5, font: fonts.bold, color: GOLD });
    let y = top - 34;
    for (const l of wrapPlain(heading, fonts.bold, 10.5, pw - 24).slice(0, 2)) { cursor.page.drawText(l, { x: x + 12, y, size: 10.5, font: fonts.bold, color: NAVY }); y -= 13; }
    if (sub) { cursor.page.drawText(sub.slice(0, 60), { x: x + 12, y, size: 8, font: fonts.regular, color: MUTED }); }
    const sigBase = top - 112;
    if (img) {
      const dims = img.scaleToFit(pw - 60, 40);
      cursor.page.drawImage(img, { x: x + 12, y: sigBase + 4, width: dims.width, height: dims.height });
    } else if (typedName) {
      cursor.page.drawText(typedName.slice(0, 40), { x: x + 12, y: sigBase + 10, size: 17, font: fonts.boldItalic, color: NAVY });
    }
    cursor.page.drawLine({ start: { x: x + 12, y: sigBase }, end: { x: x + pw - 12, y: sigBase }, thickness: 0.7, color: TEXT });
    cursor.page.drawText(name || "Name: ______________________", { x: x + 12, y: sigBase - 14, size: 9.5, font: fonts.bold, color: TEXT });
    if (role) cursor.page.drawText(role.slice(0, 60), { x: x + 12, y: sigBase - 27, size: 8.5, font: fonts.regular, color: MUTED });
    cursor.page.drawText(dateLabel, { x: x + 12, y: sigBase - 42, size: 8.5, font: fonts.regular, color: MUTED });
  };
  const coImg = sig ? await embedSignatureImage(doc, sig.signatureImageDataUrl) : null;
  await card(MARGIN, kind === "certificate" ? "ISSUED BY" : "FOR THE SERVICE PROVIDER", company.companyName, `RC ${company.rc}`, coImg, null,
    sig?.fullName || "Authorised signatory", sig ? `${sig.title || "Authorised signatory"}` : "", `Date: ${longDate(c.sentAt || c.createdAt)}`);
  if (kind !== "certificate") {
    const clientImg = c.signedSignatureImageDataUrl ? await embedSignatureImage(doc, c.signedSignatureImageDataUrl) : null;
    await card(MARGIN + pw + gap, kind === "letter" ? "ACCEPTED BY" : "FOR THE CLIENT", c.client.organisation || c.client.name, c.client.organisation ? c.client.name : "", clientImg,
      signed && !clientImg ? c.signedByName : null, signed ? c.signedByName : "", signed ? (c.signedByTitle || "Client / authorised representative") : "Client / authorised representative",
      signed ? `Signed: ${longDate(c.signedAt)}` : "Date: ______________________");
  }
  cursor.y = top - h - 16;
  for (const extra of signatories.slice(1)) {
    cursor.ensure(80);
    const img = await embedSignatureImage(doc, extra.signatureImageDataUrl);
    if (img) { const d = img.scaleToFit(150, 34); cursor.page.drawImage(img, { x: MARGIN, y: cursor.y - 30, width: d.width, height: d.height }); }
    cursor.page.drawLine({ start: { x: MARGIN, y: cursor.y - 34 }, end: { x: MARGIN + 200, y: cursor.y - 34 }, thickness: 0.6, color: TEXT });
    cursor.page.drawText(`${extra.fullName}${extra.title ? `, ${extra.title}` : ""}`, { x: MARGIN, y: cursor.y - 47, size: 9, font: fonts.bold, color: TEXT });
    cursor.y -= 64;
  }
  if (signed && kind !== "certificate") {
    const rec = `Electronic signing record: signed by ${c.signedByName} on ${dateTime(c.signedAt)} (${c.signatureMethod === "typed" ? "typed signature" : "drawn signature"})${c.signedIp ? ` from IP ${c.signedIp}` : ""}. Document ${c.number}.`;
    const lines = wrapPlain(rec, fonts.regular, 8.5, W - 24);
    const h2 = 12 + lines.length * 12;
    cursor.ensure(h2 + 50);
    cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - h2 + 8, width: W, height: h2, color: rgb(0.906, 0.961, 0.933) });
    lines.forEach((l, i) => cursor.page.drawText(l, { x: MARGIN + 12, y: cursor.y - 4 - i * 12, size: 8.5, font: fonts.regular, color: rgb(0.06, 0.4, 0.25) }));
    cursor.y -= h2 + 12;
  }
}

export async function renderContractPdfV2(rawContract, signatories = [], { template = {}, payments = [], payLinkUrl = "", dva = null } = {}) {
  const c = normaliseContract(rawContract);
  const kind = c.kind || template.kind || (c.type === "offer_letter" || c.type === "onboarding_letter" ? "letter" : "agreement");
  const company = await getCompanySettings();
  const doc = await PDFDocument.create();
  doc.setTitle(`${c.title} (${c.number})`); doc.setAuthor(company.companyName);
  const fonts = await embedAllFonts(doc);
  const { regular: font, bold } = fonts;
  const first = doc.addPage([PAGE_W, PAGE_H]);
  let y = drawPageChrome(first, font, bold, { withHeader: true }, company);
  const cursor = makeCursor(doc, fonts, y, company);

  // Label, title, number
  const label = String(c.docLabel || template.docLabel || "Agreement").toUpperCase();
  cursor.page.drawText(label, { x: MARGIN, y: cursor.y, size: 8, font: bold, color: GOLD });
  cursor.y -= 22;
  for (const l of wrapPlain(c.title, bold, 17, W)) { cursor.page.drawText(l, { x: MARGIN, y: cursor.y, size: 17, font: bold, color: NAVY }); cursor.y -= 21; }
  const numLine = `${kind === "certificate" ? "Certificate" : kind === "plan" ? "Payment plan" : "Contract"} No. ${c.number}${c.effectiveDate ? `   ·   Effective ${longDate(c.effectiveDate)}` : ""}`;
  cursor.page.drawText(numLine, { x: MARGIN, y: cursor.y, size: 9, font, color: MUTED });
  cursor.y -= 22;

  const summary = paymentSummary(c, payments);
  let n = 1;

  // Fees, payment schedule and how to pay (agreements and payment plans).
  const drawFees = heading => {
    if (c.amount > 0) {
      sectionHeading(cursor, fonts, n++, heading);
      cursor.ensure(90);
      const vt = cursor.y + 6;
      cursor.page.drawRectangle({ x: MARGIN, y: vt - 44, width: W, height: 44, color: NAVY });
      cursor.page.drawRectangle({ x: MARGIN, y: vt - 44, width: 5, height: 44, color: GOLD });
      cursor.page.drawText(kind === "plan" ? "TOTAL TO PAY" : "AGREED CONTRACT VALUE", { x: MARGIN + 18, y: vt - 17, size: 7.5, font: bold, color: WHITE_DIM });
      cursor.page.drawText(money(c.amount, c.currency), { x: MARGIN + 18, y: vt - 35, size: 15, font: bold, color: GOLD });
      const vatNote = c.vatIncluded ? "VAT inclusive" : "Exclusive of VAT (7.5%) unless stated";
      cursor.page.drawText(vatNote, { x: rightAlignedX(vatNote, font, 8.5, PAGE_W - MARGIN - 14), y: vt - 17, size: 8.5, font, color: WHITE_DIM });
      cursor.y = vt - 44 - 14;
      textBlock(cursor, fonts.italic, `In words: ${amountInWords(c.amount, c.currency)}`, 9, 13, MUTED);
      cursor.y -= 6;
      if (summary.schedule.length) {
        // When each milestone is due sits under its name, so long triggers never collide with the amount.
        const cols = [[MARGIN + 8, "#"], [MARGIN + 28, kind === "plan" ? "ITEM / DUE DATE" : "MILESTONE / WHEN DUE"], [null, "AMOUNT"], [null, "STATUS"]];
        const amtR = MARGIN + W * 0.86, stR = PAGE_W - MARGIN - 8;
        const header = () => {
          cursor.ensure(80);
          cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - 20, width: W, height: 20, color: PANEL });
          cols.forEach(([x, t], i) => { const tx = i === 2 ? rightAlignedX(t, bold, 7.5, amtR) : i === 3 ? rightAlignedX(t, bold, 7.5, stR) : x; cursor.page.drawText(t, { x: tx, y: cursor.y - 13, size: 7.5, font: bold, color: MUTED }); });
          cursor.y -= 20;
        };
        header();
        summary.schedule.forEach((m, i) => {
          const textW = amtR - 110 - (MARGIN + 28);
          const title = wrapPlain(m.title, bold, 9.5, textW);
          const due = wrapPlain(m.dueDate ? `Due ${longDate(m.dueDate)}${m.trigger ? ` · ${m.trigger}` : ""}` : m.trigger || "On completion", font, 8.5, textW);
          const desc = m.description ? wrapPlain(m.description, font, 8.5, textW) : [];
          const rh = 10 + title.length * 12.5 + (due.length + desc.length) * 11 + 4;
          const before = cursor.page; cursor.ensure(rh + 60); if (cursor.page !== before) header();
          const t0 = cursor.y;
          cursor.page.drawText(String(i + 1), { x: MARGIN + 8, y: t0 - 14, size: 9.5, font: bold, color: GOLD });
          title.forEach((l, j) => cursor.page.drawText(l, { x: MARGIN + 28, y: t0 - 14 - j * 12.5, size: 9.5, font: bold, color: TEXT }));
          [...due, ...desc].forEach((l, j) => cursor.page.drawText(l, { x: MARGIN + 28, y: t0 - 14 - title.length * 12.5 - j * 11 + 1, size: 8.5, font, color: MUTED }));
          const amt = money(m.amount, c.currency);
          cursor.page.drawText(amt, { x: rightAlignedX(amt, bold, 9.5, amtR), y: t0 - 14, size: 9.5, font: bold, color: TEXT });
          const st = { paid: ["PAID", GREEN], part_paid: ["PART-PAID", AMBER], overdue: ["OVERDUE", RED], unpaid: ["DUE", MUTED] }[m.payStatus];
          cursor.page.drawText(st[0], { x: rightAlignedX(st[0], bold, 7.5, stR), y: t0 - 14, size: 7.5, font: bold, color: st[1] });
          cursor.page.drawLine({ start: { x: MARGIN, y: t0 - rh }, end: { x: PAGE_W - MARGIN, y: t0 - rh }, thickness: 0.5, color: HAIRLINE });
          cursor.y = t0 - rh;
        });
        cursor.y -= 12;
      }
      if (summary.paid > 0) {
        textBlock(cursor, bold, `Paid to date: ${money(summary.paid, c.currency)}   ·   Balance: ${money(summary.balance, c.currency)}`, 9.5, 14, NAVY);
        cursor.y -= 4;
      }
      if (String(c.paymentTerms || "").trim()) { textBlock(cursor, font, c.paymentTerms, 9.5, 14); cursor.y -= 4; }
      // How to pay
      const how = [
        payLinkUrl ? `Online: open your payment link at any time to pay the item that is due next, by card, bank transfer or USSD${c.allowPartial ? " (part-payments accepted)" : ""}: ${payLinkUrl}` : `Online: a secure payment link is sent to ${c.client.email || "the Client"}${kind === "agreement" ? " once this agreement is signed" : ""}${c.allowPartial ? "; part-payments are accepted" : ""}.`,
        dva ? `Your own bank account for this plan: ${dva.bankName} ${dva.accountNumber} (${dva.accountName}). Transfers to it are matched and receipted automatically.` : null,
        String(company.bankDetails || "").trim() ? `Bank transfer: ${String(company.bankDetails).replace(/\n/g, " · ")}` : `Bank transfer: details are provided with the payment link, or on request from ${company.email}.`,
        `Always quote ${c.number} as the payment reference. An official receipt is issued for every payment.`,
      ];
      const hl = how.filter(Boolean).flatMap(t => wrapPlain(t, font, 9.5, W - 36));
      const hh = 26 + hl.length * 13.5 + 6;
      cursor.ensure(hh + 50);
      const ht = cursor.y + 6;
      cursor.page.drawRectangle({ x: MARGIN, y: ht - hh, width: W, height: hh, color: PANEL, borderColor: HAIRLINE, borderWidth: 0.8 });
      cursor.page.drawRectangle({ x: MARGIN, y: ht - hh, width: 4, height: hh, color: GOLD });
      cursor.page.drawText("HOW TO PAY", { x: MARGIN + 18, y: ht - 17, size: 7.5, font: bold, color: MUTED });
      hl.forEach((l, i) => cursor.page.drawText(l, { x: MARGIN + 18, y: ht - 32 - i * 13.5, size: 9.5, font, color: TEXT }));
      cursor.y = ht - hh - 14;
    }
  };

  if (kind === "letter" || kind === "plan") {
    cursor.page.drawText(c.client.name, { x: MARGIN, y: cursor.y, size: 11, font: bold, color: TEXT }); cursor.y -= 14;
    for (const l of [c.client.organisation, c.client.address, c.client.email].filter(Boolean)) { cursor.page.drawText(l.slice(0, 90), { x: MARGIN, y: cursor.y, size: 9.5, font, color: MUTED }); cursor.y -= 13; }
    cursor.y -= 10;
    drawParagraphs(cursor, fonts, parseRichText(c.bodyFilled || ""), 10.5, 16, W, TEXT, 190);
    if (kind === "plan") drawFees("Items and payment dates");
  } else {
    if (kind === "agreement") {
      // Opening statement
      const party = `${c.client.organisation ? `${c.client.organisation} (represented by ${c.client.name})` : c.client.name}${c.client.address ? ` of ${c.client.address.replace(/\n/g, ", ")}` : ""}`;
      textBlock(cursor, font, `This ${template.name || "Agreement"} is made${c.effectiveDate ? ` on ${longDate(c.effectiveDate)}` : ""} between ${company.companyName}, a company registered in Nigeria (RC ${company.rc}) of ${company.address} ("Orion Soft"), and ${party} ("the Client").`, 10, 15);
      cursor.y -= 8;
      // Summary card
      const cells = [["CLIENT", c.client.name], ["ORGANISATION", c.client.organisation || "—"], ["EFFECTIVE DATE", longDate(c.effectiveDate) || "On signing"],
        c.amount > 0 ? ["CONTRACT VALUE", money(c.amount, c.currency)] : ["END DATE", c.endDate ? longDate(c.endDate) : "See term"]];
      cursor.ensure(80);
      const top = cursor.y + 6, cw = W / 4, h = 46;
      cursor.page.drawRectangle({ x: MARGIN, y: top - h, width: W, height: h, color: PANEL, borderColor: HAIRLINE, borderWidth: 0.8 });
      cells.forEach(([k, v], i) => {
        const x = MARGIN + i * cw + 12;
        if (i) cursor.page.drawLine({ start: { x: MARGIN + i * cw, y: top - 8 }, end: { x: MARGIN + i * cw, y: top - h + 8 }, thickness: 0.6, color: HAIRLINE });
        cursor.page.drawText(k, { x, y: top - 17, size: 7, font: bold, color: MUTED });
        const vv = wrapPlain(v, bold, 9.5, cw - 18)[0] || "";
        cursor.page.drawText(vv, { x, y: top - 33, size: 9.5, font: bold, color: i === 3 && c.amount > 0 ? GOLD : TEXT });
      });
      cursor.y = top - h - 18;

      sectionHeading(cursor, fonts, n++, "Parties");
      twoPanels(cursor, fonts,
        { label: "SERVICE PROVIDER", rows: [{ text: company.companyName, bold: true, size: 10.5 }, { text: company.address, muted: true }, { text: `RC ${company.rc}${company.taxId ? ` · TIN ${company.taxId}` : ""}`, muted: true }, { text: company.email, muted: true }, { text: [company.phone, company.website].filter(Boolean).join(" · "), muted: true }] },
        { label: "CLIENT", rows: [{ text: c.client.name, bold: true, size: 10.5 }, ...[c.client.organisation, c.client.address, c.client.email, c.client.phone].filter(Boolean).map(t => ({ text: t, muted: true }))] });

      if (String(c.scope || "").trim()) { sectionHeading(cursor, fonts, n++, "Scope of work"); textBlock(cursor, font, c.scope, 10, 15); cursor.y -= 6; }
      if (c.deliverables.length) {
        sectionHeading(cursor, fonts, n++, "Deliverables");
        c.deliverables.forEach((d, i) => {
          const ls = wrapPlain(d, font, 10, W - 22);
          ls.forEach((l, j) => { cursor.ensure(70); if (!j) cursor.page.drawText(`${i + 1}.`, { x: MARGIN + 2, y: cursor.y, size: 10, font: bold, color: GOLD }); cursor.page.drawText(l, { x: MARGIN + 20, y: cursor.y, size: 10, font, color: TEXT }); cursor.y -= 14.5; });
          cursor.y -= 2;
        });
        cursor.y -= 6;
      }
      sectionHeading(cursor, fonts, n++, "Term");
      textBlock(cursor, font, `This Agreement starts on ${longDate(c.effectiveDate) || "the date it is signed"} and ${c.endDate ? `ends on ${longDate(c.endDate)}` : "continues until the obligations under it are completed"}, unless ended earlier under its terms.`, 10, 15);
      cursor.y -= 6;

      drawFees("Fees and payment");
      sectionHeading(cursor, fonts, n++, "Terms and conditions");
    }
    drawParagraphs(cursor, fonts, parseRichText(c.bodyFilled || ""), 10, 15, W, TEXT, 190);
  }

  cursor.y -= 10;
  if (kind !== "plan") await drawSignatureCards(doc, cursor, fonts, c, company, signatories, kind);
  cursor.pages.forEach((p, i) => drawFooter(p, font, i + 1, cursor.pages.length, `${kind === "certificate" ? "Certificate" : kind === "plan" ? "Payment plan" : "Contract"} No. ${c.number}`, company));
  return doc.save();
}

// Official receipt for a contract payment.
export async function renderContractReceiptPdf(rawContract, payment, payments = []) {
  const c = normaliseContract(rawContract);
  const company = await getCompanySettings();
  const doc = await PDFDocument.create();
  doc.setTitle(`Receipt ${payment.receiptNumber}`); doc.setAuthor(company.companyName);
  const fonts = await embedAllFonts(doc);
  const { regular: font, bold } = fonts;
  const page = doc.addPage([PAGE_W, PAGE_H]);
  let y = drawPageChrome(page, font, bold, { withHeader: true }, company);
  page.drawText("OFFICIAL RECEIPT", { x: MARGIN, y, size: 8, font: bold, color: GOLD }); y -= 24;
  page.drawText("Payment received", { x: MARGIN, y, size: 20, font: bold, color: NAVY });
  page.drawText(payment.receiptNumber, { x: rightAlignedX(payment.receiptNumber, bold, 12, PAGE_W - MARGIN), y: y + 4, size: 12, font: bold, color: GOLD });
  y -= 30;
  // Amount band
  page.drawRectangle({ x: MARGIN, y: y - 62, width: W, height: 62, color: rgb(0.906, 0.961, 0.933) });
  page.drawRectangle({ x: MARGIN, y: y - 62, width: 5, height: 62, color: GREEN });
  page.drawText("AMOUNT RECEIVED", { x: MARGIN + 18, y: y - 20, size: 7.5, font: bold, color: GREEN });
  page.drawText(money(payment.amount, c.currency), { x: MARGIN + 18, y: y - 44, size: 22, font: bold, color: NAVY });
  y -= 78;
  for (const l of wrapPlain(`In words: ${amountInWords(payment.amount, c.currency)}`, fonts.italic, 9.5, W)) { page.drawText(l, { x: MARGIN, y, size: 9.5, font: fonts.italic, color: MUTED }); y -= 13; }
  y -= 12;
  const sum = paymentSummary(c, payments);
  const ms = payment.milestoneId && sum.schedule.find(m => m.id === payment.milestoneId);
  const rows = [
    ["Received from", c.client.organisation ? `${c.client.organisation} (${c.client.name})` : c.client.name],
    ["For", `${c.title}`], ["Contract No.", c.number], ...(ms ? [["Milestone", ms.title]] : []),
    ["Payment date", longDate(payment.paidAt || payment.verifiedAt || payment.createdAt)],
    ["Method", METHOD[payment.method || "paystack"] || payment.method], ...(payment.reference || payment.bankReference ? [["Transaction reference", payment.bankReference || payment.reference]] : []),
    ["Contract value", money(sum.total, c.currency)], ["Total paid to date", money(sum.paid, c.currency)], ["Balance remaining", money(sum.balance, c.currency)],
  ];
  for (const [k, v] of rows) {
    page.drawText(k, { x: MARGIN, y, size: 9.5, font, color: MUTED });
    const vl = wrapPlain(String(v), bold, 10, W * 0.62);
    vl.forEach((l, i) => page.drawText(l, { x: MARGIN + W * 0.36, y: y - i * 13, size: 10, font: bold, color: k === "Balance remaining" && sum.balance > 0 ? AMBER : TEXT }));
    y -= Math.max(1, vl.length) * 13 + 12;
    page.drawLine({ start: { x: MARGIN, y: y + 15 }, end: { x: PAGE_W - MARGIN, y: y + 15 }, thickness: 0.4, color: HAIRLINE });
  }
  y -= 16;
  if (sum.balance <= 0) {
    page.drawRectangle({ x: MARGIN, y: y - 26, width: W, height: 28, color: rgb(0.906, 0.961, 0.933) });
    page.drawText("This contract is now fully paid. Thank you.", { x: MARGIN + 12, y: y - 17, size: 10, font: bold, color: GREEN });
    y -= 40;
  }
  for (const l of wrapPlain(`This receipt was issued electronically by ${company.companyName} and is valid without a signature. Keep it for your records; quote ${payment.receiptNumber} in any query about this payment.`, font, 9, W)) { page.drawText(l, { x: MARGIN, y, size: 9, font, color: MUTED }); y -= 12.5; }
  drawFooter(page, font, 1, 1, `Receipt ${payment.receiptNumber}`, company);
  return doc.save();
}
