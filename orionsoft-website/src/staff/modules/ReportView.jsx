import { Download } from "lucide-react";
import { C, font } from "../theme.js";
import { fmtDate, naira } from "../api.js";
import { Badge } from "../components.jsx";

// The full weekly report laid out section by section, the same order as the
// form, so a reviewer reads it the way it was written. Empty sections are skipped.
const TOTALS = [["prospectsContacted", "Prospects contacted"], ["physicalVisits", "Physical visits"], ["meetingsHeld", "Meetings held"], ["productDemos", "Product demos"], ["proposalsSent", "Proposals sent"], ["newLeadsGenerated", "New leads"], ["salesClosed", "Sales closed"], ["salesValue", "Sales value", true]];
const PLAN = [["organisationsToVisit", "Organisations to visit"], ["prospectsToFollowUp", "Prospects to follow up"], ["meetingsPlanned", "Meetings planned"], ["demosPlanned", "Demos planned"], ["expectedProposals", "Expected proposals"], ["expectedSales", "Expected sales", true]];

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.gold, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>{title}</div>
      {children}
    </div>
  );
}

function Text({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: C.heading, marginBottom: 3 }}>{label}</div>}
      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function Stats({ items, values }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
      {items.map(([k, label, money]) => (
        <div key={k} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: C.textMuted }}>{label}</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.heading, marginTop: 2 }}>{money ? naira(values?.[k]) : (values?.[k] || 0)}</div>
        </div>
      ))}
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{columns.map(c => <th key={c.key} style={{ textAlign: "left", fontSize: 11, color: C.textMuted, fontWeight: 700, padding: "6px 8px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map(c => {
                const v = row?.[c.key];
                const shown = v === "" || v == null ? "—" : c.money ? naira(v) : c.date ? fmtDate(v) : c.badge ? <Badge color={C.blue}>{v}</Badge> : String(v);
                return <td key={c.key} style={{ padding: "8px", borderBottom: `1px solid ${C.border}`, color: C.text, verticalAlign: "top", minWidth: 90 }}>{shown}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportView({ report: r }) {
  const targets = (r.keyTargets || []).filter(Boolean);
  const meta = [["Week", `${fmtDate(r.weekStart)} to ${fmtDate(r.weekEnd)}`], ["Territory", r.territory], ["Reporting manager", r.reportingManager], ["Product focus", r.productFocus], ["Submitted", r.submittedAt && fmtDate(r.submittedAt)]].filter(([, v]) => v);
  return (
    <div style={{ fontFamily: font }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 20px", fontSize: 12.5, color: C.textMuted }}>
        {meta.map(([k, v]) => <span key={k}><strong style={{ color: C.heading }}>{k}:</strong> {v}</span>)}
        <a href={`/api/staff/reports?pdf=${encodeURIComponent(r.id)}&download=1`} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: C.gold, fontWeight: 700, textDecoration: "none", border: `1px solid ${C.gold}`, borderRadius: 8, padding: "5px 12px" }}>
          <Download size={14} /> Download PDF
        </a>
      </div>

      <Section title="1. Weekly summary">
        <Text value={r.summary} />
        <Stats items={TOTALS} values={r.totals} />
      </Section>

      {r.prospects?.length > 0 && (
        <Section title={`2. Prospect & customer activity (${r.prospects.length})`}>
          <Table rows={r.prospects} columns={[{ key: "organisation", label: "Organisation" }, { key: "contactPerson", label: "Contact" }, { key: "contactDate", label: "Date", date: true }, { key: "productInterest", label: "Interest" }, { key: "status", label: "Status", badge: true }, { key: "nextAction", label: "Next action" }]} />
        </Section>
      )}

      {r.sales?.length > 0 && (
        <Section title={`3. Sales & revenue (${r.sales.length})`}>
          <Table rows={r.sales} columns={[{ key: "customer", label: "Customer" }, { key: "productPlan", label: "Product/plan" }, { key: "saleValue", label: "Value", money: true }, { key: "paymentStatus", label: "Payment" }, { key: "onboardingStatus", label: "Onboarding" }, { key: "expectedCommission", label: "Commission", money: true }]} />
        </Section>
      )}

      {r.followUps?.length > 0 && (
        <Section title={`4. Follow-ups for next week (${r.followUps.length})`}>
          <Table rows={r.followUps} columns={[{ key: "prospect", label: "Prospect" }, { key: "reason", label: "Reason" }, { key: "plannedDate", label: "Planned", date: true }, { key: "expectedOutcome", label: "Expected outcome" }]} />
        </Section>
      )}

      {(r.challenges || r.objections || r.supportNeeded || r.competitors || r.competitorPricing || r.marketTrends || r.otherInfo) && (
        <Section title="5. Challenges & market intelligence">
          <Text label="Challenges" value={r.challenges} />
          <Text label="Objections from prospects" value={r.objections} />
          <Text label="Support needed" value={r.supportNeeded} />
          <Text label="Competitors encountered" value={r.competitors} />
          <Text label="Competitor pricing/features" value={r.competitorPricing} />
          <Text label="Market trends" value={r.marketTrends} />
          <Text label="Other information" value={r.otherInfo} />
        </Section>
      )}

      <Section title="6. Next week's plan">
        <Stats items={PLAN} values={r.nextWeekPlan} />
        {targets.length > 0 && (
          <ol style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 13.5, color: C.text, lineHeight: 1.7 }}>
            {targets.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        )}
      </Section>
    </div>
  );
}
