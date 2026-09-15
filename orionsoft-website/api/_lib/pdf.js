// Letterhead PDF generation — pure JS (pdf-lib), no headless browser, safe for
// serverless cold starts. Used for contracts/letters and payslips. Design goal:
// a clean, internationally-presentable corporate letterhead — full-width navy
// header band, gold accent rule, formal letter conventions, real signature
// lines, and a polished payslip layout — not just plain text on a page.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { parseRichText } from "./richtext.js";

const PAGE_W = 595.28, PAGE_H = 841.89; // A4
const MARGIN = 60;
const HEADER_H = 96;

const NAVY = rgb(0.039, 0.145, 0.251); // #0A2540
const GOLD = rgb(0.784, 0.659, 0.314); // #C8A850
const TEXT = rgb(0.13, 0.15, 0.19);
const MUTED = rgb(0.42, 0.48, 0.56);
const HAIRLINE = rgb(0.86, 0.88, 0.91);
const PANEL = rgb(0.965, 0.97, 0.98);
const WHITE = rgb(1, 1, 1);
const WHITE_DIM = rgb(0.78, 0.83, 0.89);

const COMPANY_ADDRESS_LINES = [
  "Orion Soft Limited",
  "RC 9535128 · Nigeria",
  "orionsoftlimited@gmail.com · 08169577059",
];

function rightAlignedX(text, font, size, rightEdge) {
  return rightEdge - font.widthOfTextAtSize(text, size);
}

async function embedSignatureImage(doc, dataUrl) {
  if (!dataUrl) return null;
  try {
    const match = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    const bytes = Buffer.from(match[2], "base64");
    return match[1] === "png" ? doc.embedPng(bytes) : doc.embedJpg(bytes);
  } catch { return null; }
}

// The same orbit-ring mark used site-wide (src/App.jsx's OrionLogo), redrawn
// as PDF vector shapes from the same 64x64 viewBox so the letterhead carries
// the real brand mark rather than text alone.
function drawOrionLogoMark(page, cx, cy, size) {
  const s = size / 64;
  page.drawEllipse({ x: cx, y: cy, xScale: 24 * s, yScale: 24 * s, borderColor: GOLD, borderWidth: 4 * s });
  page.drawEllipse({ x: cx, y: cy, xScale: 14 * s, yScale: 14 * s, borderColor: GOLD, borderWidth: 2.8 * s });
  page.drawEllipse({ x: cx, y: cy, xScale: 4.4 * s, yScale: 4.4 * s, color: GOLD });
}

// Full-width navy header band with wordmark + contact block, gold rule beneath,
// and a slim gold spine down the left edge — drawn on every page for continuity.
function drawPageChrome(page, font, boldFont, { withHeader }) {
  page.drawRectangle({ x: 0, y: 0, width: 5, height: PAGE_H, color: GOLD });

  if (!withHeader) return PAGE_H - 44;

  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: GOLD });

  const logoSize = 30;
  drawOrionLogoMark(page, MARGIN + logoSize / 2, PAGE_H - 48, logoSize);
  const textX = MARGIN + logoSize + 12;

  const wmY = PAGE_H - 42;
  page.drawText("Orion", { x: textX, y: wmY, size: 22, font: boldFont, color: WHITE });
  const orionWidth = boldFont.widthOfTextAtSize("Orion", 22);
  page.drawText("Soft", { x: textX + orionWidth, y: wmY, size: 22, font: boldFont, color: GOLD });
  page.drawText("Enterprise Software, Built for Africa", { x: textX, y: wmY - 18, size: 9, font, color: WHITE_DIM });

  COMPANY_ADDRESS_LINES.forEach((line, i) => {
    const size = 8.5;
    const x = rightAlignedX(line, font, size, PAGE_W - MARGIN);
    page.drawText(line, { x, y: PAGE_H - 34 - i * 12, size, font, color: WHITE_DIM });
  });

  return PAGE_H - HEADER_H - 34;
}

function drawFooter(page, font, pageNum, pageCount, docRef) {
  page.drawLine({ start: { x: MARGIN, y: 46 }, end: { x: PAGE_W - MARGIN, y: 46 }, thickness: 0.75, color: HAIRLINE });
  page.drawText("Orion Soft Limited · Confidential", { x: MARGIN, y: 30, size: 8, font, color: MUTED });
  if (docRef) {
    const size = 8;
    const x = (PAGE_W - font.widthOfTextAtSize(docRef, size)) / 2;
    page.drawText(docRef, { x, y: 30, size, font, color: MUTED });
  }
  const pageLabel = `Page ${pageNum} of ${pageCount}`;
  page.drawText(pageLabel, { x: rightAlignedX(pageLabel, font, 8, PAGE_W - MARGIN), y: 30, size: 8, font, color: MUTED });
}

function makeCursor(doc, fonts, startY) {
  const page0 = doc.getPages()[0];
  const pages = [page0];
  const state = { page: page0, y: startY };
  return {
    pages,
    ensure(minY) {
      if (state.y < minY) {
        const p = doc.addPage([PAGE_W, PAGE_H]);
        state.y = drawPageChrome(p, fonts.regular, fonts.bold, { withHeader: false });
        pages.push(p);
        state.page = p;
      }
    },
    get page() { return state.page; },
    get y() { return state.y; },
    set y(v) { state.y = v; },
  };
}

function fontFor(fonts, bold, italic) {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

// Greedy word-wrap over styled runs (mixed bold/italic within a paragraph line).
function wrapRuns(runs, fonts, size, maxWidth) {
  const words = [];
  for (const run of runs) {
    for (const word of run.text.split(/\s+/).filter(Boolean)) {
      words.push({ word, bold: run.bold, italic: run.italic });
    }
  }
  const spaceWidth = fonts.regular.widthOfTextAtSize(" ", size);
  const wrapped = [];
  let current = [];
  let currentWidth = 0;
  for (const tok of words) {
    const w = fontFor(fonts, tok.bold, tok.italic).widthOfTextAtSize(tok.word, size);
    const extra = current.length ? spaceWidth + w : w;
    if (currentWidth + extra > maxWidth && current.length) {
      wrapped.push(current);
      current = [tok];
      currentWidth = w;
    } else {
      current.push(tok);
      currentWidth += extra;
    }
  }
  if (current.length) wrapped.push(current);
  return wrapped;
}

function drawWrappedLine(page, tokens, x, y, size, fonts, color) {
  let cx = x;
  const spaceWidth = fonts.regular.widthOfTextAtSize(" ", size);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const f = fontFor(fonts, tok.bold, tok.italic);
    page.drawText(tok.word, { x: cx, y, size, font: f, color });
    cx += f.widthOfTextAtSize(tok.word, size) + (i < tokens.length - 1 ? spaceWidth : 0);
  }
}

function drawParagraphs(cursor, fonts, paragraphs, size, lineHeight, maxWidth, color, minY) {
  for (const para of paragraphs) {
    for (const runs of para.lines) {
      const wrapped = wrapRuns(runs, fonts, size, maxWidth);
      for (const tokens of wrapped) {
        cursor.ensure(minY);
        drawWrappedLine(cursor.page, tokens, MARGIN, cursor.y, size, fonts, color);
        cursor.y -= lineHeight;
      }
    }
    cursor.y -= lineHeight * 0.55; // paragraph spacing
  }
}

// A formal signature block: drawn signature image (if any) sitting just above
// a rule, printed name in bold beneath it, title/role in muted text below that.
function drawSignatureBlock(page, x, width, y, { name, roleLabel, dateLabel, image, fonts }) {
  if (image) {
    const maxImgW = width * 0.8;
    const maxImgH = 32;
    const scale = Math.min(0.4, maxImgW / image.width, maxImgH / image.height);
    const dims = image.scale(scale);
    // Sits just above the signature line, growing upward, so it never
    // overlaps the printed name/title drawn below the line.
    page.drawImage(image, { x, y: y + 3, width: dims.width, height: dims.height });
  }
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 1, color: rgb(0.55, 0.58, 0.63) });
  page.drawText(name, { x, y: y - 15, size: 10.5, font: fonts.bold, color: TEXT });
  if (roleLabel) page.drawText(roleLabel, { x, y: y - 29, size: 8.5, font: fonts.regular, color: MUTED });
  if (dateLabel) page.drawText(dateLabel, { x, y: y - 41, size: 8.5, font: fonts.regular, color: MUTED });
}

async function embedAllFonts(doc) {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
}

function docRefFor(contract) {
  const d = new Date(contract.createdAt || Date.now());
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const shortId = contract.id.replace(/^ctr_/, "").slice(-5).toUpperCase();
  return `Ref: CTR-${datePart}-${shortId}`;
}

export async function renderContractPdf(contract, signatories = []) {
  const doc = await PDFDocument.create();
  const fonts = await embedAllFonts(doc);
  const { regular: font, bold: boldFont } = fonts;
  const bodySize = 11, lineHeight = 16.5, maxWidth = PAGE_W - MARGIN * 2;

  const firstPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = drawPageChrome(firstPage, font, boldFont, { withHeader: true });

  // Reference + date line
  const dateStr = new Date(contract.createdAt || Date.now()).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
  firstPage.drawText(docRefFor(contract), { x: MARGIN, y, size: 9, font, color: MUTED });
  firstPage.drawText(dateStr, { x: rightAlignedX(dateStr, font, 9, PAGE_W - MARGIN), y, size: 9, font, color: MUTED });
  y -= 28;

  // Recipient block (formal letter convention)
  firstPage.drawText(contract.recipientName, { x: MARGIN, y, size: 11, font: boldFont, color: TEXT });
  y -= 15;
  if (contract.recipientEmail) {
    firstPage.drawText(contract.recipientEmail, { x: MARGIN, y, size: 9.5, font, color: MUTED });
    y -= 24;
  } else {
    y -= 10;
  }

  // Subject line
  firstPage.drawLine({ start: { x: MARGIN, y: y + 6 }, end: { x: PAGE_W - MARGIN, y: y + 6 }, thickness: 0.75, color: HAIRLINE });
  y -= 10;
  firstPage.drawText(`RE: ${contract.title}`, { x: MARGIN, y, size: 12.5, font: boldFont, color: NAVY });
  y -= 28;

  const cursor = makeCursor(doc, fonts, y);
  const paragraphs = parseRichText(contract.bodyFilled || "");
  drawParagraphs(cursor, fonts, paragraphs, bodySize, lineHeight, maxWidth, TEXT, 190);

  // Signature section
  cursor.ensure(230);
  cursor.y -= 16;
  cursor.page.drawText("Executed by the parties below:", { x: MARGIN, y: cursor.y, size: 9.5, font, color: MUTED });
  cursor.y -= 30;

  const colWidth = (maxWidth - 40) / 2;
  cursor.page.drawText("FOR ORION SOFT LIMITED", { x: MARGIN, y: cursor.y, size: 8.5, font: boldFont, color: GOLD });
  cursor.page.drawText("RECIPIENT", { x: MARGIN + colWidth + 40, y: cursor.y, size: 8.5, font: boldFont, color: GOLD });
  cursor.y -= 48;

  const rowTopY = cursor.y;

  const primarySignatory = signatories[0];
  const sigImage = primarySignatory ? await embedSignatureImage(doc, primarySignatory.signatureImageDataUrl) : null;
  drawSignatureBlock(cursor.page, MARGIN, colWidth, rowTopY, {
    name: primarySignatory?.fullName || "Authorised Signatory",
    roleLabel: primarySignatory?.title || "",
    fonts,
    image: sigImage,
  });

  drawSignatureBlock(cursor.page, MARGIN + colWidth + 40, colWidth, rowTopY, {
    name: contract.signedByName || "",
    roleLabel: contract.recipientName,
    dateLabel: contract.signedAt ? new Date(contract.signedAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) : "Date: _______________",
    fonts,
    image: null,
  });
  cursor.y = rowTopY - 60;

  // Additional signatories beyond the first, stacked below
  for (const sig of signatories.slice(1)) {
    cursor.ensure(90);
    const img = await embedSignatureImage(doc, sig.signatureImageDataUrl);
    cursor.y -= 24;
    drawSignatureBlock(cursor.page, MARGIN, colWidth, cursor.y, { name: sig.fullName, roleLabel: sig.title, fonts, image: img });
    cursor.y -= 44;
  }

  if (contract.status === "signed" || contract.status === "active" || contract.status === "completed") {
    cursor.ensure(70);
    cursor.y -= 10;
    const bannerY = cursor.y;
    cursor.page.drawRectangle({ x: MARGIN, y: bannerY - 26, width: maxWidth, height: 30, color: rgb(0.906, 0.961, 0.933) });
    cursor.page.drawText(
      `SIGNED: Electronically signed by ${contract.signedByName} on ${new Date(contract.signedAt).toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" })}`,
      { x: MARGIN + 10, y: bannerY - 17, size: 9, font: boldFont, color: rgb(0.06, 0.45, 0.28) },
    );
    cursor.y = bannerY - 40;
  }

  const docRef = docRefFor(contract);
  cursor.pages.forEach((p, i) => drawFooter(p, font, i + 1, cursor.pages.length, docRef));
  return doc.save();
}

export async function renderPayslipPdf(payroll, employee) {
  const doc = await PDFDocument.create();
  const fonts = await embedAllFonts(doc);
  const { regular: font, bold: boldFont } = fonts;
  const maxWidth = PAGE_W - MARGIN * 2;

  const page = doc.addPage([PAGE_W, PAGE_H]);
  let y = drawPageChrome(page, font, boldFont, { withHeader: true });

  page.drawText("PAYSLIP", { x: MARGIN, y, size: 18, font: boldFont, color: NAVY });
  const periodLabel = payroll.period;
  page.drawText(periodLabel, { x: rightAlignedX(periodLabel, boldFont, 14, PAGE_W - MARGIN), y: y + 2, size: 14, font: boldFont, color: GOLD });
  y -= 34;

  // Employee info panel
  const panelH = 78;
  page.drawRectangle({ x: MARGIN, y: y - panelH, width: maxWidth, height: panelH, color: PANEL, borderColor: HAIRLINE, borderWidth: 1 });
  const info = [
    ["Employee", employee.fullName], ["Title", employee.title || "—"],
    ["Department", employee.department || "—"], ["Currency", payroll.currency],
  ];
  info.forEach(([label, value], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = MARGIN + 20 + col * (maxWidth / 2);
    const cy = y - 24 - row * 28;
    page.drawText(label.toUpperCase(), { x: cx, y: cy, size: 7.5, font, color: MUTED });
    page.drawText(String(value), { x: cx, y: cy - 14, size: 11, font: boldFont, color: TEXT });
  });
  y -= panelH + 30;

  // Earnings / deductions table
  const tableTop = y;
  page.drawRectangle({ x: MARGIN, y: tableTop - 22, width: maxWidth, height: 22, color: NAVY });
  page.drawText("DESCRIPTION", { x: MARGIN + 12, y: tableTop - 15, size: 8.5, font: boldFont, color: WHITE });
  const amountColX = PAGE_W - MARGIN - 12;
  page.drawText("AMOUNT", { x: rightAlignedX("AMOUNT", boldFont, 8.5, amountColX), y: tableTop - 15, size: 8.5, font: boldFont, color: WHITE });
  y = tableTop - 22;

  function row(label, value, opts = {}) {
    const rowH = 26;
    if (opts.shaded) page.drawRectangle({ x: MARGIN, y: y - rowH, width: maxWidth, height: rowH, color: PANEL });
    page.drawText(label, { x: MARGIN + 12, y: y - rowH + 8, size: 10, font: opts.bold ? boldFont : font, color: opts.color || TEXT });
    const valText = value;
    page.drawText(valText, { x: rightAlignedX(valText, opts.bold ? boldFont : font, 10, amountColX), y: y - rowH + 8, size: 10, font: opts.bold ? boldFont : font, color: opts.color || TEXT });
    page.drawLine({ start: { x: MARGIN, y: y - rowH }, end: { x: PAGE_W - MARGIN, y: y - rowH }, thickness: 0.5, color: HAIRLINE });
    y -= rowH;
  }

  row("Gross Salary", `${payroll.currency} ${Number(payroll.grossAmount).toLocaleString()}`, { bold: true, shaded: true });
  for (const d of payroll.deductions || []) {
    row(d.label, `- ${payroll.currency} ${Number(d.amount).toLocaleString()}`, { color: rgb(0.72, 0.2, 0.24) });
  }

  y -= 16;
  const netH = 44;
  page.drawRectangle({ x: MARGIN, y: y - netH, width: maxWidth, height: netH, color: NAVY });
  page.drawRectangle({ x: MARGIN, y: y - netH, width: 5, height: netH, color: GOLD });
  page.drawText("NET PAY", { x: MARGIN + 20, y: y - netH / 2 - 5, size: 12, font: boldFont, color: WHITE_DIM });
  const netText = `${payroll.currency} ${Number(payroll.netAmount).toLocaleString()}`;
  page.drawText(netText, { x: rightAlignedX(netText, boldFont, 17, amountColX), y: y - netH / 2 - 6, size: 17, font: boldFont, color: GOLD });
  y -= netH + 20;

  page.drawText("This is a system-generated payslip and does not require a physical signature.", { x: MARGIN, y, size: 8.5, font, color: MUTED });

  drawFooter(page, font, 1, 1, `Ref: PAY-${payroll.id.replace(/^pay_/, "").toUpperCase()}`);
  return doc.save();
}
