import { useState, useEffect, useCallback, useRef } from "react";
import { C, font } from "./theme.js";
import { Btn, Badge, SectionCard, SectionTitle, Label, Input, Textarea, Select, StatCard, EmptyState, Avatar } from "./components.jsx";
import { resizeImageToDataUrl } from "./imageUtils.js";
import StaffLogin from "./StaffLogin.jsx";

async function api(path, opts) {
  const r = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || `Request failed (${r.status})`);
  return json;
}

function TopBar({ user, employee, onLogout, active, setActive }) {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "reports", label: "Weekly Reports" },
    { id: "leave", label: "Leave" },
    ...(user.staffRole === "manager" ? [{ id: "team", label: "Team" }] : []),
    { id: "payslips", label: "Payslips" },
    { id: "profile", label: "Profile" },
  ];
  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <button type="button" onClick={() => setActive("profile")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
          <Avatar src={employee?.avatarDataUrl} name={user.name} size={34} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.heading }}>Orion<span style={{ color: C.blue }}>Staff</span></div>
            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{user.name} · {user.title || "Team member"}</div>
          </div>
        </button>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setActive(t.id)} style={{
              background: active === t.id ? C.blueDim : "transparent", color: active === t.id ? C.blue : C.textMuted,
              border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer",
            }}>{t.label}</button>
          ))}
          <Btn variant="ghost" small onClick={onLogout}>Sign out</Btn>
        </div>
      </div>
    </div>
  );
}

function HomeTab({ reports, leave }) {
  const pendingReview = reports.filter(r => r.status === "submitted").length;
  const pendingLeave = leave.filter(l => l.status === "pending").length;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Reports Submitted" value={reports.length} color={C.blue} icon="📝" />
        <StatCard label="Awaiting Review" value={pendingReview} color={C.amber} icon="⏳" />
        <StatCard label="Leave Requests" value={leave.length} color={C.mint} icon="🌴" />
        <StatCard label="Pending Approval" value={pendingLeave} color={C.amber} icon="⏳" />
      </div>
      <SectionCard>
        <SectionTitle>Welcome to your staff portal</SectionTitle>
        <p style={{ color: C.textMuted, fontFamily: font, fontSize: 13.5, lineHeight: 1.7, marginTop: 8 }}>
          Use the tabs above to submit your weekly report, request leave, and view your payslips once they're issued.
        </p>
      </SectionCard>
    </div>
  );
}

const PRODUCTS = ["CareCore", "SchoolCore", "ComplianceCore", "InventoryCore", "FinanceCore", "HRCore", "ChurchCore", "FleetCore", "TeleHealth", "General / Other"];

const EMPTY_REPORT_FORM = {
  weekStart: "", weekEnd: "", territory: "", reportingManager: "", productFocus: PRODUCTS[0], summary: "",
  totals: { prospectsContacted: "", physicalVisits: "", meetingsHeld: "", productDemos: "", proposalsSent: "", newLeadsGenerated: "", salesClosed: "", salesValue: "" },
  challenges: "", objections: "", supportNeeded: "",
  competitors: "", competitorPricing: "", marketTrends: "", otherInfo: "",
  nextWeekPlan: { organisationsToVisit: "", prospectsToFollowUp: "", meetingsPlanned: "", demosPlanned: "", expectedProposals: "", expectedSales: "" },
  keyTargets: ["", "", ""],
  declarationConfirmed: false,
};

// Generic editable table for the report's dynamic row sections (prospects, sales, follow-ups).
function RowsEditor({ columns, rows, setRows }) {
  function update(i, key, value) {
    setRows(rows.map((row, idx) => idx === i ? { ...row, [key]: value } : row));
  }
  function addRow() {
    setRows([...rows, Object.fromEntries(columns.map(c => [c.key, ""]))]);
  }
  function removeRow(i) {
    setRows(rows.filter((_, idx) => idx !== i));
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr>
            {columns.map(c => <th key={c.key} style={{ textAlign: "left", fontSize: 11, color: C.textMuted, padding: "4px 6px", whiteSpace: "nowrap" }}>{c.label}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "3px 6px" }}>
                  {c.type === "select" ? (
                    <Select value={row[c.key] || ""} onChange={e => update(i, c.key, e.target.value)} style={{ minWidth: 120 }}>
                      <option value=""></option>
                      {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  ) : (
                    <Input type={c.type || "text"} value={row[c.key] || ""} onChange={e => update(i, c.key, e.target.value)} style={{ minWidth: c.type === "date" ? 130 : 110 }} />
                  )}
                </td>
              ))}
              <td><button type="button" onClick={() => removeRow(i)} style={{ background: "none", border: "none", color: C.rose, cursor: "pointer", fontSize: 15 }}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Btn small variant="ghost" onClick={addRow}>+ Add row</Btn>
    </div>
  );
}

function num(v) { return v === "" || v == null ? 0 : Number(v) || 0; }

function ReportsTab({ reports, reload }) {
  const [form, setForm] = useState(EMPTY_REPORT_FORM);
  const [prospects, setProspects] = useState([]);
  const [sales, setSales] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(null);

  function setTotal(key, value) { setForm(f => ({ ...f, totals: { ...f.totals, [key]: value } })); }
  function setPlan(key, value) { setForm(f => ({ ...f, nextWeekPlan: { ...f.nextWeekPlan, [key]: value } })); }
  function setTarget(i, value) { setForm(f => ({ ...f, keyTargets: f.keyTargets.map((t, idx) => idx === i ? value : t) })); }

  async function submit() {
    setErr(""); setMsg("");
    if (!form.weekStart || !form.weekEnd) { setErr("Week start and end are required."); return; }
    if (!form.summary.trim()) { setErr("A summary of the week's main activities is required."); return; }
    if (!form.declarationConfirmed) { setErr("Please confirm the declaration at the bottom of the form before submitting."); return; }
    setSubmitting(true);
    try {
      await api("/api/staff/reports", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          totals: Object.fromEntries(Object.entries(form.totals).map(([k, v]) => [k, num(v)])),
          nextWeekPlan: Object.fromEntries(Object.entries(form.nextWeekPlan).map(([k, v]) => [k, num(v)])),
          prospects, sales, followUps,
        }),
      });
      setMsg("Report submitted.");
      setForm(EMPTY_REPORT_FORM);
      setProspects([]); setSales([]); setFollowUps([]);
      reload();
    } catch (e) {
      setErr(e.message);
    } finally { setSubmitting(false); }
  }

  return (
    <div>
      <SectionCard style={{ marginBottom: 20 }}>
        <SectionTitle>Weekly Sales & Business Development Report</SectionTitle>
        <p style={{ color: C.textMuted, fontSize: 12.5, marginTop: 6, marginBottom: 16 }}>Every field except the summary and declaration is optional — fill in what applies to your week.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><Label>Week start</Label><Input type="date" value={form.weekStart} onChange={e => setForm(f => ({ ...f, weekStart: e.target.value }))} /></div>
          <div><Label>Week end</Label><Input type="date" value={form.weekEnd} onChange={e => setForm(f => ({ ...f, weekEnd: e.target.value }))} /></div>
          <div><Label>Territory / Location</Label><Input value={form.territory} onChange={e => setForm(f => ({ ...f, territory: e.target.value }))} /></div>
          <div><Label>Reporting Manager</Label><Input value={form.reportingManager} onChange={e => setForm(f => ({ ...f, reportingManager: e.target.value }))} /></div>
          <div>
            <Label>Product / Software focus</Label>
            <Select value={form.productFocus} onChange={e => setForm(f => ({ ...f, productFocus: e.target.value }))}>
              {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
        </div>

        <Label>1. Weekly summary — main activities carried out this week</Label>
        <Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} style={{ minHeight: 90 }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14, marginBottom: 20 }}>
          {[
            ["prospectsContacted", "Prospects contacted"], ["physicalVisits", "Physical visits"],
            ["meetingsHeld", "Meetings held"], ["productDemos", "Product demos"],
            ["proposalsSent", "Proposals/quotes sent"], ["newLeadsGenerated", "New leads generated"],
            ["salesClosed", "Sales closed"], ["salesValue", "Value of sales (₦)"],
          ].map(([key, label]) => (
            <div key={key}><Label>{label}</Label><Input type="number" value={form.totals[key]} onChange={e => setTotal(key, e.target.value)} /></div>
          ))}
        </div>

        <SectionTitle>2. Prospect & customer activity</SectionTitle>
        <div style={{ marginTop: 10, marginBottom: 20 }}>
          <RowsEditor
            rows={prospects} setRows={setProspects}
            columns={[
              { key: "organisation", label: "Organisation" }, { key: "contactPerson", label: "Contact person" },
              { key: "contactDate", label: "Contact/visit date", type: "date" }, { key: "productInterest", label: "Product/interest" },
              { key: "status", label: "Status", type: "select", options: ["New Lead", "Contacted", "Meeting Scheduled", "Demo Completed", "Proposal Sent", "Negotiation", "Awaiting Decision", "Won", "Lost"] },
              { key: "nextAction", label: "Next action" },
            ]}
          />
        </div>

        <SectionTitle>3. Sales & revenue</SectionTitle>
        <div style={{ marginTop: 10, marginBottom: 20 }}>
          <RowsEditor
            rows={sales} setRows={setSales}
            columns={[
              { key: "customer", label: "Customer" }, { key: "productPlan", label: "Product/plan" },
              { key: "saleValue", label: "Sale value (₦)", type: "number" }, { key: "paymentStatus", label: "Payment status" },
              { key: "onboardingStatus", label: "Onboarding status" }, { key: "expectedCommission", label: "Commission (₦)", type: "number" },
            ]}
          />
        </div>

        <SectionTitle>4. Follow-up required next week</SectionTitle>
        <div style={{ marginTop: 10, marginBottom: 20 }}>
          <RowsEditor
            rows={followUps} setRows={setFollowUps}
            columns={[
              { key: "prospect", label: "Prospect" }, { key: "reason", label: "Reason for follow-up" },
              { key: "plannedDate", label: "Planned date", type: "date" }, { key: "expectedOutcome", label: "Expected outcome" },
            ]}
          />
        </div>

        <SectionTitle>5. Challenges / objections</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 10, marginBottom: 20 }}>
          <div><Label>Challenges this week</Label><Textarea value={form.challenges} onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))} /></div>
          <div><Label>Objections raised by prospects</Label><Textarea value={form.objections} onChange={e => setForm(f => ({ ...f, objections: e.target.value }))} /></div>
          <div><Label>Support needed from manager/company</Label><Textarea value={form.supportNeeded} onChange={e => setForm(f => ({ ...f, supportNeeded: e.target.value }))} /></div>
        </div>

        <SectionTitle>6. Competitor / market information</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10, marginBottom: 20 }}>
          <div><Label>Competitor(s) encountered</Label><Textarea value={form.competitors} onChange={e => setForm(f => ({ ...f, competitors: e.target.value }))} /></div>
          <div><Label>Competitor pricing/features noticed</Label><Textarea value={form.competitorPricing} onChange={e => setForm(f => ({ ...f, competitorPricing: e.target.value }))} /></div>
          <div><Label>Customer needs / market trends</Label><Textarea value={form.marketTrends} onChange={e => setForm(f => ({ ...f, marketTrends: e.target.value }))} /></div>
          <div><Label>Other useful information</Label><Textarea value={form.otherInfo} onChange={e => setForm(f => ({ ...f, otherInfo: e.target.value }))} /></div>
        </div>

        <SectionTitle>7. Next week's plan</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10, marginBottom: 14 }}>
          {[
            ["organisationsToVisit", "Organisations to visit"], ["prospectsToFollowUp", "Prospects to follow up"],
            ["meetingsPlanned", "Meetings planned"], ["demosPlanned", "Demonstrations planned"],
            ["expectedProposals", "Expected proposals"], ["expectedSales", "Expected sales (₦)"],
          ].map(([key, label]) => (
            <div key={key}><Label>{label}</Label><Input type="number" value={form.nextWeekPlan[key]} onChange={e => setPlan(key, e.target.value)} /></div>
          ))}
        </div>
        <Label>Key targets for next week</Label>
        {form.keyTargets.map((t, i) => (
          <Input key={i} value={t} onChange={e => setTarget(i, e.target.value)} placeholder={`Target ${i + 1}`} style={{ marginBottom: 8 }} />
        ))}

        <div style={{ marginTop: 20, marginBottom: 16, padding: 14, background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.text, cursor: "pointer" }}>
            <input type="checkbox" checked={form.declarationConfirmed} onChange={e => setForm(f => ({ ...f, declarationConfirmed: e.target.checked }))} style={{ marginTop: 2 }} />
            I confirm that the information provided in this report is accurate and represents the activities carried out during the reporting period.
          </label>
        </div>

        <Btn onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit report"}</Btn>
        {msg && <p style={{ color: C.mint, fontFamily: font, fontSize: 13, marginTop: 10 }}>{msg}</p>}
        {err && <p style={{ color: C.rose, fontFamily: font, fontSize: 13, marginTop: 10 }}>{err}</p>}
      </SectionCard>

      <SectionCard>
        <SectionTitle>Your reports</SectionTitle>
        {reports.length === 0 && <EmptyState>No reports submitted yet.</EmptyState>}
        {reports.map(r => (
          <div key={r.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(e => e === r.id ? null : r.id)}>
              <div>
                <div style={{ fontWeight: 700, color: C.heading, fontFamily: font, fontSize: 14 }}>{r.weekStart} – {r.weekEnd} {r.productFocus ? `· ${r.productFocus}` : ""}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{r.summary?.slice(0, 80)}{r.summary?.length > 80 ? "…" : ""}</div>
              </div>
              <Badge color={r.status === "approved" ? C.mint : r.status === "rejected" ? C.rose : C.amber}>{r.status}</Badge>
            </div>
            {expanded === r.id && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: C.text, lineHeight: 1.7 }}>
                <div>Prospects contacted: {r.totals?.prospectsContacted || 0} · Meetings: {r.totals?.meetingsHeld || 0} · Sales closed: {r.totals?.salesClosed || 0} ({r.currency || "₦"}{Number(r.totals?.salesValue || 0).toLocaleString()})</div>
                {r.prospects?.length > 0 && <div style={{ marginTop: 6 }}>{r.prospects.length} prospect{r.prospects.length === 1 ? "" : "s"} logged</div>}
                {r.sales?.length > 0 && <div>{r.sales.length} sale{r.sales.length === 1 ? "" : "s"} logged</div>}
              </div>
            )}
            {r.reviewNotes && <div style={{ fontSize: 12.5, color: C.text, fontFamily: font, marginTop: 6 }}>Reviewer: {r.reviewNotes}</div>}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function LeaveTab({ leave, reload }) {
  const [form, setForm] = useState({ type: "annual", startDate: "", endDate: "", reason: "" });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setErr(""); setMsg("");
    if (!form.startDate || !form.endDate) { setErr("Start and end dates are required."); return; }
    setSubmitting(true);
    try {
      await api("/api/staff/leave", { method: "POST", body: JSON.stringify(form) });
      setMsg("Leave request submitted.");
      setForm({ type: "annual", startDate: "", endDate: "", reason: "" });
      reload();
    } catch (e) { setErr(e.message); } finally { setSubmitting(false); }
  }

  return (
    <div>
      <SectionCard style={{ marginBottom: 20 }}>
        <SectionTitle>Request leave</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 16, marginBottom: 14 }}>
          <div><Label>Type</Label>
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="unpaid">Unpaid</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div><Label>Start date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
          <div><Label>End date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
        </div>
        <Label>Reason (optional)</Label>
        <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
        <div style={{ marginTop: 14 }}>
          <Btn onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</Btn>
        </div>
        {msg && <p style={{ color: C.mint, fontFamily: font, fontSize: 13, marginTop: 10 }}>{msg}</p>}
        {err && <p style={{ color: C.rose, fontFamily: font, fontSize: 13, marginTop: 10 }}>{err}</p>}
      </SectionCard>

      <SectionCard>
        <SectionTitle>Your leave requests</SectionTitle>
        {leave.length === 0 && <EmptyState>No leave requests yet.</EmptyState>}
        {leave.map(l => (
          <div key={l.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, color: C.heading, fontFamily: font, fontSize: 14, textTransform: "capitalize" }}>{l.type} · {l.startDate} – {l.endDate}</div>
              <Badge color={l.status === "approved" ? C.mint : l.status === "rejected" ? C.rose : C.amber}>{l.status}</Badge>
            </div>
            {l.decisionNotes && <div style={{ fontSize: 12.5, color: C.text, fontFamily: font, marginTop: 6 }}>{l.decisionNotes}</div>}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function TeamTab() {
  const [reports, setReports] = useState([]);
  const [leave, setLeave] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [tab, setTab] = useState("reports");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, l] = await Promise.all([
        api("/api/staff/reports?scope=team"),
        api("/api/staff/leave?scope=team"),
      ]);
      setReports(r.reports || []);
      setLeave(l.leave || []);
    } catch { /* best-effort */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decideReport(r, status) {
    await api("/api/staff/reports", { method: "PATCH", body: JSON.stringify({ id: r.id, status, reviewNotes: notes[r.id] || "" }) });
    load();
  }
  async function decideLeave(l, status) {
    await api("/api/staff/leave", { method: "PATCH", body: JSON.stringify({ id: l.id, status, decisionNotes: notes[l.id] || "" }) });
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Btn small variant={tab === "reports" ? "primary" : "ghost"} onClick={() => setTab("reports")}>Reports ({reports.filter(r => r.status === "submitted").length} pending)</Btn>
        <Btn small variant={tab === "leave" ? "primary" : "ghost"} onClick={() => setTab("leave")}>Leave ({leave.filter(l => l.status === "pending").length} pending)</Btn>
      </div>
      {loading && <EmptyState>Loading…</EmptyState>}
      {!loading && tab === "reports" && (
        <SectionCard>
          <SectionTitle>Team weekly reports</SectionTitle>
          {reports.length === 0 && <EmptyState>No reports from your department yet.</EmptyState>}
          {reports.map(r => (
            <div key={r.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{r.weekStart} – {r.weekEnd} {r.productFocus ? `· ${r.productFocus}` : ""}</div>
                <Badge color={r.status === "approved" ? C.mint : r.status === "rejected" ? C.rose : C.amber}>{r.status}</Badge>
              </div>
              <p style={{ margin: "8px 0", color: C.text, fontSize: 13, lineHeight: 1.6 }}>{r.summary}</p>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                Prospects: {r.totals?.prospectsContacted || 0} · Meetings: {r.totals?.meetingsHeld || 0} · Sales closed: {r.totals?.salesClosed || 0}
                {r.prospects?.length > 0 ? ` · ${r.prospects.length} prospect row(s)` : ""}{r.sales?.length > 0 ? ` · ${r.sales.length} sale row(s)` : ""}
              </div>
              {r.status === "submitted" && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                  <Input placeholder="Notes (optional)" value={notes[r.id] || ""} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} style={{ maxWidth: 260 }} />
                  <Btn small onClick={() => decideReport(r, "approved")}>Approve</Btn>
                  <Btn small danger onClick={() => decideReport(r, "rejected")}>Reject</Btn>
                </div>
              )}
            </div>
          ))}
        </SectionCard>
      )}
      {!loading && tab === "leave" && (
        <SectionCard>
          <SectionTitle>Team leave requests</SectionTitle>
          {leave.length === 0 && <EmptyState>No leave requests from your department yet.</EmptyState>}
          {leave.map(l => (
            <div key={l.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, color: C.heading, fontSize: 14, textTransform: "capitalize" }}>{l.type} · {l.startDate} – {l.endDate}</div>
                <Badge color={l.status === "approved" ? C.mint : l.status === "rejected" ? C.rose : C.amber}>{l.status}</Badge>
              </div>
              {l.reason && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>{l.reason}</div>}
              {l.status === "pending" && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                  <Input placeholder="Notes (optional)" value={notes[l.id] || ""} onChange={e => setNotes(n => ({ ...n, [l.id]: e.target.value }))} style={{ maxWidth: 260 }} />
                  <Btn small onClick={() => decideLeave(l, "approved")}>Approve</Btn>
                  <Btn small danger onClick={() => decideLeave(l, "rejected")}>Reject</Btn>
                </div>
              )}
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}

function PayslipsTab({ payslips, currentDraft }) {
  return (
    <SectionCard>
      {currentDraft && (
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          <SectionTitle>{currentDraft.period} — in progress</SectionTitle>
          <p style={{ fontSize: 12, color: C.textMuted, fontFamily: font, margin: "4px 0 14px" }}>
            Updates live as commissions are added through the month. Finalized once payroll issues your payslip.
          </p>
          <div style={{ fontSize: 13.5, color: C.text, fontFamily: font, lineHeight: 1.9 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Base salary</span>
              <span>{currentDraft.currency} {Number(currentDraft.baseSalary || 0).toLocaleString()}</span>
            </div>
            {(currentDraft.commissions || []).map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", color: C.mint }}>
                <span>{c.label}</span>
                <span>+{currentDraft.currency} {Number(c.amount).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: C.heading, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
              <span>Running total</span>
              <span>{currentDraft.currency} {Number(currentDraft.grossAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
      <SectionTitle>Your payslips</SectionTitle>
      {payslips.length === 0 && <EmptyState>No payslips issued yet.</EmptyState>}
      {payslips.map(p => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontWeight: 700, color: C.heading, fontFamily: font, fontSize: 14 }}>{p.period}</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 2 }}>Net: {p.currency} {Number(p.netAmount).toLocaleString()}</div>
          </div>
          {p.payslipPdfKey && <a href={`/api/files/download?key=${encodeURIComponent(p.payslipPdfKey)}`} target="_blank" rel="noreferrer" style={{ color: C.blue, fontFamily: font, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Download PDF →</a>}
        </div>
      ))}
    </SectionCard>
  );
}

function PasswordSection() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);

  async function submit() {
    setErr(""); setMsg("");
    if (!form.currentPassword || !form.newPassword) { setErr("Fill in both password fields."); return; }
    if (form.newPassword.length < 10) { setErr("New password must be at least 10 characters."); return; }
    if (form.newPassword !== form.confirmPassword) { setErr("New password and confirmation don't match."); return; }
    setSaving(true);
    try {
      await api("/api/staff/change-password", { method: "POST", body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) });
      setMsg("Password changed.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <SectionCard style={{ marginTop: 20 }}>
      <SectionTitle>Change password</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 16, marginBottom: 14 }}>
        <div><Label>Current password</Label><Input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} /></div>
        <div><Label>New password</Label><Input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} /></div>
        <div><Label>Confirm new password</Label><Input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} /></div>
      </div>
      <Btn onClick={submit} disabled={saving}>{saving ? "Saving…" : "Change password"}</Btn>
      {msg && <p style={{ color: C.mint, fontFamily: font, fontSize: 13, marginTop: 10 }}>{msg}</p>}
      {err && <p style={{ color: C.rose, fontFamily: font, fontSize: 13, marginTop: 10 }}>{err}</p>}
    </SectionCard>
  );
}

function ProfileTab({ employee, reload }) {
  const [form, setForm] = useState({
    phone: employee.phone || "", bankName: employee.bankName || "", bankAccountNumber: employee.bankAccountNumber || "", bankAccountName: employee.bankAccountName || "",
    dateOfBirth: employee.dateOfBirth || "", gender: employee.gender || "", address: employee.address || "", bio: employee.bio || "",
    emergencyContactName: employee.emergencyContactName || "", emergencyContactPhone: employee.emergencyContactPhone || "", emergencyContactRelationship: employee.emergencyContactRelationship || "",
  });
  const [avatarPreview, setAvatarPreview] = useState(employee.avatarDataUrl || "");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  async function onPhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true); setErr("");
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await api("/api/staff/profile", { method: "PATCH", body: JSON.stringify({ avatarDataUrl: dataUrl }) });
      setAvatarPreview(dataUrl);
      setMsg("Photo updated."); reload();
      setTimeout(() => setMsg(""), 2500);
    } catch (ex) {
      setErr(ex.message || "Could not upload that photo.");
    } finally { setUploadingPhoto(false); }
  }

  async function removePhoto() {
    await api("/api/staff/profile", { method: "PATCH", body: JSON.stringify({ avatarDataUrl: "" }) });
    setAvatarPreview(""); reload();
  }

  async function save() {
    setErr(""); setMsg("");
    setSaving(true);
    try {
      await api("/api/staff/profile", { method: "PATCH", body: JSON.stringify(form) });
      setMsg("Profile updated.");
      reload();
      setTimeout(() => setMsg(""), 2500);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div>
      <SectionCard>
        <SectionTitle>Your profile</SectionTitle>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, marginBottom: 22 }}>
          <Avatar src={avatarPreview} name={employee.fullName} size={72} />
          <div>
            <Btn small variant="ghost" disabled={uploadingPhoto} onClick={() => fileInputRef.current?.click()}>
              {uploadingPhoto ? "Uploading…" : "Change photo"}
            </Btn>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={onPhotoSelected} style={{ display: "none" }} />
            {avatarPreview && <Btn small variant="ghost" onClick={removePhoto} style={{ marginLeft: 8 }}>Remove</Btn>}
            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6 }}>PNG or JPEG, resized automatically.</div>
          </div>
        </div>

        <SectionTitle>Employment</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 16, marginBottom: 20 }}>
          <div><Label>Full name</Label><Input value={employee.fullName} disabled /></div>
          <div><Label>Email</Label><Input value={employee.email} disabled /></div>
          <div><Label>Title</Label><Input value={employee.title} disabled /></div>
          <div><Label>Department</Label><Input value={employee.department || "—"} disabled /></div>
          <div><Label>Start date</Label><Input value={employee.startDate || "—"} disabled /></div>
          <div><Label>Role</Label><Input value={employee.staffRole === "manager" ? "Manager" : "Staff"} disabled /></div>
        </div>

        <SectionTitle>Contact & personal information</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 16, marginBottom: 14 }}>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Date of birth</Label><Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} /></div>
          <div><Label>Gender</Label>
            <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Address</Label>
          <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <Label>Short bio</Label>
          <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="A couple of lines about you" />
        </div>

        <SectionTitle>Emergency contact</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 16, marginBottom: 20 }}>
          <div><Label>Name</Label><Input value={form.emergencyContactName} onChange={e => setForm(f => ({ ...f, emergencyContactName: e.target.value }))} /></div>
          <div><Label>Phone</Label><Input value={form.emergencyContactPhone} onChange={e => setForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} /></div>
          <div><Label>Relationship</Label><Input value={form.emergencyContactRelationship} onChange={e => setForm(f => ({ ...f, emergencyContactRelationship: e.target.value }))} /></div>
        </div>

        <SectionTitle>Bank details (for payroll)</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 16, marginBottom: 14 }}>
          <div><Label>Bank name</Label><Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} /></div>
          <div><Label>Account number</Label><Input value={form.bankAccountNumber} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))} /></div>
          <div><Label>Account name</Label><Input value={form.bankAccountName} onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))} /></div>
        </div>
        <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Btn>
        {msg && <p style={{ color: C.mint, fontFamily: font, fontSize: 13, marginTop: 10 }}>{msg}</p>}
        {err && <p style={{ color: C.rose, fontFamily: font, fontSize: 13, marginTop: 10 }}>{err}</p>}
      </SectionCard>

      <PasswordSection />
    </div>
  );
}

export default function StaffApp() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState("home");
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [leave, setLeave] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [currentDraft, setCurrentDraft] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, reportsRes, leaveRes] = await Promise.all([
        api("/api/staff/profile"),
        api("/api/staff/reports"),
        api("/api/staff/leave"),
      ]);
      setEmployee(profileRes.employee);
      setReports(reportsRes.reports || []);
      setLeave(leaveRes.leave || []);
      try {
        const payslipsRes = await api("/api/staff/payslips");
        setPayslips(payslipsRes.payslips || []);
        setCurrentDraft(payslipsRes.currentDraft || null);
      } catch { setPayslips([]); setCurrentDraft(null); }
    } catch { /* not logged in or transient error — handled by session check */ }
  }, []);

  // Lets a newly-added commission show up on its own, without the employee
  // needing to log out/in or manually refresh to see it.
  useEffect(() => {
    if (!session) return;
    const t = setInterval(async () => {
      try {
        const payslipsRes = await api("/api/staff/payslips");
        setPayslips(payslipsRes.payslips || []);
        setCurrentDraft(payslipsRes.currentDraft || null);
      } catch { /* transient — next tick will retry */ }
    }, 20000);
    return () => clearInterval(t);
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me");
        if (r.ok) {
          const json = await r.json();
          if (!cancelled) setSession(json.user);
        }
      } finally { if (!cancelled) setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (session) loadAll(); }, [session, loadAll]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
  }

  if (checking) return <div style={{ minHeight: "100vh", background: C.bg }} />;
  if (!session) return <StaffLogin onLogin={setSession} />;
  if (!employee) return <div style={{ minHeight: "100vh", background: C.bg }} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <TopBar user={session} employee={employee} onLogout={logout} active={active} setActive={setActive} />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>
        {active === "home" && <HomeTab reports={reports} leave={leave} />}
        {active === "reports" && <ReportsTab reports={reports} reload={loadAll} />}
        {active === "leave" && <LeaveTab leave={leave} reload={loadAll} />}
        {active === "team" && session.staffRole === "manager" && <TeamTab />}
        {active === "payslips" && <PayslipsTab payslips={payslips} currentDraft={currentDraft} />}
        {active === "profile" && <ProfileTab employee={employee} reload={loadAll} />}
      </div>
    </div>
  );
}
