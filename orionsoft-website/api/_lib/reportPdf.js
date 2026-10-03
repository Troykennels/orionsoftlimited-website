// Weekly report as a letterhead PDF, laid out in the same numbered sections
// as the form and the email so it reads the same wherever it is opened.
import { PDFDocument } from "pdf-lib";
import { getCompanySettings } from "./settings.js";
import {
  PAGE_W, PAGE_H, MARGIN, NAVY, GOLD, TEXT, MUTED, HAIRLINE, PANEL,
  drawPageChrome, drawFooter, makeCursor, embedAllFonts, wrapPlain, rightAlignedX,
} from "./pdf.js";

const W = PAGE_W - MARGIN * 2;
const BOTTOM = 70; // keep clear of the footer

// The standard PDF fonts only cover Windows-1252, so anything outside it
// (emoji, other scripts) would make pdf-lib throw. Swap it for "?".
const WIN1252_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const clean = v => String(v ?? "")
  .replace(/\t/g, "  ").replace(/₦\s?/g, "NGN ")
  .replace(/\p{Extended_Pictographic}|‍|️/gu, "")
  .replace(/[^\n\x20-\x7E\xA0-\xFF]/gu, ch => (WIN1252_EXTRA.has(ch) ? ch : "?"));
const money = v => `NGN ${(Number(v) || 0).toLocaleString("en-NG")}`;
const day = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

export async function renderWeeklyReportPdf(report, employee) {
  const r = report;
  const company = await getCompanySettings();
  const doc = await PDFDocument.create();
  doc.setTitle(`Weekly report - ${employee?.fullName || "Staff"} - ${r.weekStart}`);
  doc.setAuthor(company.companyName);
  const fonts = await embedAllFonts(doc);
  const { regular: font, bold } = fonts;

  const first = doc.addPage([PAGE_W, PAGE_H]);
  const cursor = makeCursor(doc, fonts, drawPageChrome(first, font, bold, { withHeader: true }, company), company);

  const text = (str, { size = 10, f = font, color = TEXT, x = MARGIN, width = W, gap = 14 } = {}) => {
    for (const line of wrapPlain(clean(str), f, size, width)) {
      cursor.ensure(BOTTOM);
      cursor.page.drawText(line, { x, y: cursor.y, size, font: f, color });
      cursor.y -= gap;
    }
  };
  const heading = title => {
    cursor.ensure(BOTTOM + 60);
    cursor.y -= 10;
    cursor.page.drawText(clean(title).toUpperCase(), { x: MARGIN, y: cursor.y, size: 9, font: bold, color: GOLD });
    cursor.page.drawLine({ start: { x: MARGIN, y: cursor.y - 6 }, end: { x: PAGE_W - MARGIN, y: cursor.y - 6 }, thickness: 1, color: HAIRLINE });
    cursor.y -= 22;
  };
  // Figures in a 4-column grid of small panels.
  const figures = items => {
    const cols = 4, gap = 8, cw = (W - gap * (cols - 1)) / cols, ch = 38;
    for (let i = 0; i < items.length; i += cols) {
      cursor.ensure(BOTTOM + ch);
      items.slice(i, i + cols).forEach(([label, value], j) => {
        const x = MARGIN + j * (cw + gap);
        cursor.page.drawRectangle({ x, y: cursor.y - ch + 10, width: cw, height: ch, color: PANEL });
        cursor.page.drawText(clean(label), { x: x + 8, y: cursor.y - 3, size: 7.5, font, color: MUTED });
        cursor.page.drawText(clean(value), { x: x + 8, y: cursor.y - 19, size: 11.5, font: bold, color: NAVY });
      });
      cursor.y -= ch + gap;
    }
    cursor.y -= 4;
  };
  // A repeating row (prospect, sale, follow-up) as a title line plus details.
  const entries = (rows, titleKey, badgeKey, fields) => {
    rows.forEach((row, i) => {
      cursor.ensure(BOTTOM + 40);
      const title = clean(row?.[titleKey] || "-");
      cursor.page.drawText(title.slice(0, 80), { x: MARGIN, y: cursor.y, size: 10.5, font: bold, color: TEXT });
      if (badgeKey && row?.[badgeKey]) {
        const b = clean(row[badgeKey]);
        cursor.page.drawText(b, { x: rightAlignedX(b, bold, 8.5, PAGE_W - MARGIN), y: cursor.y, size: 8.5, font: bold, color: NAVY });
      }
      cursor.y -= 14;
      const details = fields.map(([k, label, kind]) => {
        const v = row?.[k];
        if (v === "" || v == null) return null;
        return `${label}: ${kind === "money" ? money(v) : kind === "date" ? day(v) : v}`;
      }).filter(Boolean);
      if (details.length) text(details.join("   |   "), { size: 9, color: MUTED, x: MARGIN + 10, width: W - 10, gap: 12.5 });
      if (i < rows.length - 1) {
        cursor.page.drawLine({ start: { x: MARGIN, y: cursor.y + 4 }, end: { x: PAGE_W - MARGIN, y: cursor.y + 4 }, thickness: 0.5, color: HAIRLINE });
        cursor.y -= 8;
      }
    });
    cursor.y -= 4;
  };

  // ── Title + details panel ──
  cursor.page.drawText("WEEKLY REPORT", { x: MARGIN, y: cursor.y, size: 18, font: bold, color: NAVY });
  const status = (r.status === "submitted" ? "AWAITING REVIEW" : String(r.status || "").toUpperCase());
  cursor.page.drawText(status, { x: rightAlignedX(status, bold, 10, PAGE_W - MARGIN), y: cursor.y + 3, size: 10, font: bold, color: GOLD });
  cursor.y -= 26;
  const meta = [["Staff", employee?.fullName], ["Week", `${day(r.weekStart)} to ${day(r.weekEnd)}`], ["Territory", r.territory], ["Reporting manager", r.reportingManager], ["Product focus", r.productFocus], ["Submitted", day(r.submittedAt)]].filter(([, v]) => v);
  const rowsN = Math.ceil(meta.length / 2), panelH = 16 + rowsN * 28;
  cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - panelH + 10, width: W, height: panelH, color: PANEL, borderColor: HAIRLINE, borderWidth: 1 });
  meta.forEach(([k, v], i) => {
    const x = MARGIN + 14 + (i % 2) * (W / 2), y = cursor.y - 6 - Math.floor(i / 2) * 28;
    cursor.page.drawText(k.toUpperCase(), { x, y, size: 7, font, color: MUTED });
    cursor.page.drawText(clean(v).slice(0, 48), { x, y: y - 12, size: 10, font: bold, color: TEXT });
  });
  cursor.y -= panelH + 8;

  // ── Sections ──
  heading("1. Weekly summary");
  text(r.summary || "-", { size: 10, gap: 14.5 });
  cursor.y -= 8;
  const t = r.totals || {};
  figures([["Prospects contacted", t.prospectsContacted || 0], ["Physical visits", t.physicalVisits || 0], ["Meetings held", t.meetingsHeld || 0], ["Product demos", t.productDemos || 0], ["Proposals sent", t.proposalsSent || 0], ["New leads", t.newLeadsGenerated || 0], ["Sales closed", t.salesClosed || 0], ["Sales value", money(t.salesValue)]]);

  if (r.prospects?.length) {
    heading(`2. Prospect & customer activity (${r.prospects.length})`);
    entries(r.prospects, "organisation", "status", [["contactPerson", "Contact"], ["contactDate", "Date", "date"], ["productInterest", "Interest"], ["nextAction", "Next action"]]);
  }
  if (r.sales?.length) {
    heading(`3. Sales & revenue (${r.sales.length})`);
    entries(r.sales, "customer", "paymentStatus", [["productPlan", "Product/plan"], ["saleValue", "Value", "money"], ["onboardingStatus", "Onboarding"], ["expectedCommission", "Commission", "money"]]);
  }
  if (r.followUps?.length) {
    heading(`4. Follow-ups for next week (${r.followUps.length})`);
    entries(r.followUps, "prospect", null, [["reason", "Reason"], ["plannedDate", "Planned", "date"], ["expectedOutcome", "Expected outcome"]]);
  }
  const intel = [["Challenges", r.challenges], ["Objections from prospects", r.objections], ["Support needed", r.supportNeeded], ["Competitors encountered", r.competitors], ["Competitor pricing/features", r.competitorPricing], ["Market trends", r.marketTrends], ["Other information", r.otherInfo]].filter(([, v]) => v);
  if (intel.length) {
    heading("5. Challenges & market intelligence");
    for (const [label, v] of intel) {
      cursor.ensure(BOTTOM + 30);
      text(label, { size: 9.5, f: bold, color: NAVY, gap: 13 });
      text(v, { size: 10, gap: 14 });
      cursor.y -= 6;
    }
  }
  heading("6. Next week's plan");
  const p = r.nextWeekPlan || {};
  figures([["Organisations to visit", p.organisationsToVisit || 0], ["Prospects to follow up", p.prospectsToFollowUp || 0], ["Meetings planned", p.meetingsPlanned || 0], ["Demos planned", p.demosPlanned || 0], ["Expected proposals", p.expectedProposals || 0], ["Expected sales", money(p.expectedSales)]]);
  const targets = (r.keyTargets || []).filter(Boolean);
  if (targets.length) {
    text("Key targets", { size: 9.5, f: bold, color: NAVY, gap: 13 });
    targets.forEach((tg, i) => text(`${i + 1}.  ${tg}`, { size: 10, gap: 14, x: MARGIN + 6, width: W - 6 }));
  }

  // ── Review + declaration ──
  if (r.reviewedAt) {
    heading("Review");
    text(`${String(r.status).charAt(0).toUpperCase()}${String(r.status).slice(1)} by ${r.reviewedByName || "a manager"} on ${day(r.reviewedAt)}.`, { size: 10, f: bold });
    if (r.reviewNotes) text(r.reviewNotes, { size: 10, gap: 14 });
  }
  cursor.y -= 10;
  text(`${employee?.fullName || "The employee"} confirmed this report is accurate and reflects the activities carried out during the reporting period.`, { size: 8.5, color: MUTED, gap: 12 });

  const ref = `Ref: RPT-${String(r.weekStart || "").replace(/-/g, "")}-${String(r.id || "").slice(-5).toUpperCase()}`;
  cursor.pages.forEach((pg, i) => drawFooter(pg, font, i + 1, cursor.pages.length, ref, company));
  return doc.save();
}

export function reportPdfName(report, employee) {
  const who = String(employee?.fullName || "staff").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `Weekly-report-${who}-${report.weekStart}.pdf`;
}
