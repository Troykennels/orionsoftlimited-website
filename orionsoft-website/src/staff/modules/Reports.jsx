import { useCallback, useEffect, useState } from "react";
import { C, font } from "../theme.js";
import { api, fmtDate, naira } from "../api.js";
import { Btn, Badge, SectionCard, SectionTitle, Label, Input, Textarea, Select, EmptyState, PageHeader, Grid, Field, toast } from "../components.jsx";
import { useOffice } from "../office.js";

const PRODUCTS = ["CareCore", "SchoolCore", "ComplianceCore", "InventoryCore", "FinanceCore", "HRCore", "ChurchCore", "FleetCore", "TeleHealth", "General / Other"];

// Monday..Friday of the current week, as YYYY-MM-DD.
function thisWeek() {
  const d = new Date(); const day = d.getDay() || 7;
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return [iso(mon), iso(fri)];
}

function emptyForm(managerName) {
  const [s, e] = thisWeek();
  return {
    weekStart: s, weekEnd: e, territory: "", reportingManager: managerName || "", productFocus: PRODUCTS[0], summary: "",
    totals: { prospectsContacted: "", physicalVisits: "", meetingsHeld: "", productDemos: "", proposalsSent: "", newLeadsGenerated: "", salesClosed: "", salesValue: "" },
    challenges: "", objections: "", supportNeeded: "", competitors: "", competitorPricing: "", marketTrends: "", otherInfo: "",
    nextWeekPlan: { organisationsToVisit: "", prospectsToFollowUp: "", meetingsPlanned: "", demosPlanned: "", expectedProposals: "", expectedSales: "" },
    keyTargets: ["", "", ""], declarationConfirmed: false,
  };
}

// Editable table for the report's repeating sections (prospects, sales, follow-ups).
function RowsEditor({ columns, rows, setRows }) {
  const update = (i, key, value) => setRows(rows.map((row, idx) => idx === i ? { ...row, [key]: value } : row));
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead><tr>{columns.map(c => <th key={c.key} style={{ textAlign: "left", fontSize: 11, color: C.textMuted, padding: "4px 6px", whiteSpace: "nowrap" }}>{c.label}</th>)}<th /></tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "3px 4px" }}>
                  {c.type === "select"
                    ? <Select value={row[c.key] || ""} onChange={e => update(i, c.key, e.target.value)} style={{ minWidth: 130 }}><option value="" />{c.options.map(o => <option key={o}>{o}</option>)}</Select>
                    : <Input type={c.type || "text"} value={row[c.key] || ""} onChange={e => update(i, c.key, e.target.value)} style={{ minWidth: c.type === "date" ? 140 : 120 }} />}
                </td>
              ))}
              <td><button type="button" aria-label="Remove row" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: C.rose, cursor: "pointer", fontSize: 16 }}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Btn small variant="ghost" onClick={() => setRows([...rows, Object.fromEntries(columns.map(c => [c.key, ""]))])}>+ Add row</Btn>
    </div>
  );
}

const num = v => (v === "" || v == null ? 0 : Number(v) || 0);

export default function Reports() {
  const { office, reload } = useOffice();
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState(() => emptyForm(office.lineManager?.fullName));
  const [prospects, setProspects] = useState([]);
  const [sales, setSales] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(true);

  const load = useCallback(() => api("/api/staff/reports").then(j => { setReports(j.reports); if (j.reports.some(r => r.weekStart === thisWeek()[0])) setShowForm(false); }).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setTotal = (k, v) => setForm(f => ({ ...f, totals: { ...f.totals, [k]: v } }));
  const setPlan = (k, v) => setForm(f => ({ ...f, nextWeekPlan: { ...f.nextWeekPlan, [k]: v } }));

  async function submit() {
    if (!form.summary.trim()) { toast("Add a summary of the week's main activities", "err"); return; }
    if (!form.declarationConfirmed) { toast("Please confirm the declaration at the bottom", "err"); return; }
    setSubmitting(true);
    try {
      await api("/api/staff/reports", { method: "POST", body: {
        ...form,
        totals: Object.fromEntries(Object.entries(form.totals).map(([k, v]) => [k, num(v)])),
        nextWeekPlan: Object.fromEntries(Object.entries(form.nextWeekPlan).map(([k, v]) => [k, num(v)])),
        prospects, sales, followUps,
      } });
      toast("Report submitted. Your manager has been notified.");
      setForm(emptyForm(office.lineManager?.fullName)); setProspects([]); setSales([]); setFollowUps([]);
      load(); reload();
    } catch (e) { toast(e.message, "err"); } finally { setSubmitting(false); }
  }

  return (
    <div>
      <PageHeader title="Weekly Reports" sub="Due every Friday. Only the summary and declaration are required; fill in what applies to your week." action={!showForm && <Btn onClick={() => setShowForm(true)}>New report</Btn>} />
      {showForm && (
        <SectionCard style={{ marginBottom: 20 }}>
          <SectionTitle>Weekly Sales & Business Development Report</SectionTitle>
          <Grid min={170} style={{ marginBottom: 14 }}>
            <Field label="Week start"><Input type="date" value={form.weekStart} onChange={set("weekStart")} /></Field>
            <Field label="Week end"><Input type="date" value={form.weekEnd} onChange={set("weekEnd")} /></Field>
            <Field label="Territory / location"><Input value={form.territory} onChange={set("territory")} /></Field>
            <Field label="Reporting manager"><Input value={form.reportingManager} onChange={set("reportingManager")} /></Field>
            <Field label="Product focus"><Select value={form.productFocus} onChange={set("productFocus")}>{PRODUCTS.map(p => <option key={p}>{p}</option>)}</Select></Field>
          </Grid>
          <Label>1. Weekly summary: main activities this week *</Label>
          <Textarea value={form.summary} onChange={set("summary")} />
          <Grid min={150} style={{ marginTop: 14, marginBottom: 20 }}>
            {[["prospectsContacted", "Prospects contacted"], ["physicalVisits", "Physical visits"], ["meetingsHeld", "Meetings held"], ["productDemos", "Product demos"], ["proposalsSent", "Proposals/quotes sent"], ["newLeadsGenerated", "New leads"], ["salesClosed", "Sales closed"], ["salesValue", "Sales value (₦)"]].map(([k, l]) => (
              <Field key={k} label={l}><Input type="number" min="0" value={form.totals[k]} onChange={e => setTotal(k, e.target.value)} /></Field>
            ))}
          </Grid>
          <SectionTitle>2. Prospect & customer activity</SectionTitle>
          <RowsEditor rows={prospects} setRows={setProspects} columns={[
            { key: "organisation", label: "Organisation" }, { key: "contactPerson", label: "Contact person" },
            { key: "contactDate", label: "Contact date", type: "date" }, { key: "productInterest", label: "Product/interest" },
            { key: "status", label: "Status", type: "select", options: ["New Lead", "Contacted", "Meeting Scheduled", "Demo Completed", "Proposal Sent", "Negotiation", "Awaiting Decision", "Won", "Lost"] },
            { key: "nextAction", label: "Next action" },
          ]} />
          <div style={{ height: 16 }} />
          <SectionTitle>3. Sales & revenue</SectionTitle>
          <RowsEditor rows={sales} setRows={setSales} columns={[
            { key: "customer", label: "Customer" }, { key: "productPlan", label: "Product/plan" }, { key: "saleValue", label: "Value (₦)", type: "number" },
            { key: "paymentStatus", label: "Payment status" }, { key: "onboardingStatus", label: "Onboarding" }, { key: "expectedCommission", label: "Commission (₦)", type: "number" },
          ]} />
          <div style={{ height: 16 }} />
          <SectionTitle>4. Follow-ups for next week</SectionTitle>
          <RowsEditor rows={followUps} setRows={setFollowUps} columns={[
            { key: "prospect", label: "Prospect" }, { key: "reason", label: "Reason" }, { key: "plannedDate", label: "Planned date", type: "date" }, { key: "expectedOutcome", label: "Expected outcome" },
          ]} />
          <div style={{ height: 16 }} />
          <SectionTitle>5. Challenges & market intelligence</SectionTitle>
          <Grid min={220} style={{ marginBottom: 18 }}>
            <Field label="Challenges this week"><Textarea value={form.challenges} onChange={set("challenges")} /></Field>
            <Field label="Objections from prospects"><Textarea value={form.objections} onChange={set("objections")} /></Field>
            <Field label="Support needed"><Textarea value={form.supportNeeded} onChange={set("supportNeeded")} /></Field>
            <Field label="Competitors encountered"><Textarea value={form.competitors} onChange={set("competitors")} /></Field>
            <Field label="Competitor pricing/features"><Textarea value={form.competitorPricing} onChange={set("competitorPricing")} /></Field>
            <Field label="Market trends / other info"><Textarea value={form.marketTrends} onChange={set("marketTrends")} /></Field>
          </Grid>
          <SectionTitle>6. Next week's plan</SectionTitle>
          <Grid min={150} style={{ marginBottom: 12 }}>
            {[["organisationsToVisit", "Organisations to visit"], ["prospectsToFollowUp", "Prospects to follow up"], ["meetingsPlanned", "Meetings planned"], ["demosPlanned", "Demos planned"], ["expectedProposals", "Expected proposals"], ["expectedSales", "Expected sales (₦)"]].map(([k, l]) => (
              <Field key={k} label={l}><Input type="number" min="0" value={form.nextWeekPlan[k]} onChange={e => setPlan(k, e.target.value)} /></Field>
            ))}
          </Grid>
          <Label>Key targets for next week</Label>
          {form.keyTargets.map((t, i) => <Input key={i} value={t} onChange={e => setForm(f => ({ ...f, keyTargets: f.keyTargets.map((x, j) => j === i ? e.target.value : x) }))} placeholder={`Target ${i + 1}`} style={{ marginBottom: 8 }} />)}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.text, cursor: "pointer", margin: "14px 0", padding: 12, background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: font }}>
            <input type="checkbox" checked={form.declarationConfirmed} onChange={e => setForm(f => ({ ...f, declarationConfirmed: e.target.checked }))} style={{ marginTop: 2 }} />
            I confirm this report is accurate and reflects the activities carried out during the reporting period.
          </label>
          <Btn onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit report"}</Btn>
        </SectionCard>
      )}

      <SectionCard>
        <SectionTitle>Your reports</SectionTitle>
        {reports.length === 0 && <EmptyState>No reports submitted yet.</EmptyState>}
        {reports.map(r => (
          <div key={r.id} style={{ padding: "12px 0", borderTop: `1px solid ${C.border}` }}>
            <button type="button" onClick={() => setExpanded(e => e === r.id ? null : r.id)} aria-expanded={expanded === r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: font }}>
              <div>
                <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{fmtDate(r.weekStart)} – {fmtDate(r.weekEnd)}{r.productFocus ? ` · ${r.productFocus}` : ""}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{r.summary?.slice(0, 90)}{r.summary?.length > 90 ? "…" : ""}</div>
              </div>
              <Badge color={r.status === "approved" ? C.mint : r.status === "rejected" ? C.rose : C.amber}>{r.status === "submitted" ? "awaiting review" : r.status}</Badge>
            </button>
            {expanded === r.id && (
              <div style={{ marginTop: 8, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
                Prospects {r.totals?.prospectsContacted || 0} · Meetings {r.totals?.meetingsHeld || 0} · Demos {r.totals?.productDemos || 0} · Sales {r.totals?.salesClosed || 0} ({naira(r.totals?.salesValue)})
              </div>
            )}
            {r.reviewNotes && <div style={{ fontSize: 12.5, color: C.text, marginTop: 6 }}><strong>{r.reviewedByName || "Reviewer"}:</strong> {r.reviewNotes}</div>}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
