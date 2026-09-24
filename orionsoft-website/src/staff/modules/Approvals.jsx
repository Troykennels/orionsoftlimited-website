import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { C } from "../theme.js";
import { api, fmtDate, naira, timeAgo } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, Input, EmptyState, PageHeader, Tabs, toast } from "../components.jsx";
import { useOffice } from "../office.js";

function Row({ who, title, sub, children, extra }) {
  const { person, openPerson } = useOffice();
  const p = person(who);
  return (
    <SectionCard style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <button type="button" onClick={() => openPerson(p.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><Avatar src={p.avatarDataUrl} name={p.fullName} size={38} /></button>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.heading }}>{p.fullName} <span style={{ fontWeight: 500, color: C.textMuted, fontSize: 12.5 }}>· {p.roleLabel}</span></div>
          <div style={{ fontSize: 13.5, color: C.text, marginTop: 3 }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3, whiteSpace: "pre-wrap" }}>{sub}</div>}
          {extra}
        </div>
      </div>
      {children}
    </SectionCard>
  );
}

function Decide({ onDecide, approveLabel = "Approve" }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(ok) { setBusy(true); await onDecide(ok, notes); setBusy(false); }
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note to them (optional)" style={{ maxWidth: 320 }} />
      <Btn small icon={Check} disabled={busy} onClick={() => go(true)}>{approveLabel}</Btn>
      <Btn small danger icon={X} disabled={busy} onClick={() => go(false)}>Decline</Btn>
    </div>
  );
}

export default function Approvals() {
  const { can, reload } = useOffice();
  const [tab, setTab] = useState(can("team.approve") || can("org.approve") ? "leave" : "expenses");
  const [leave, setLeave] = useState([]);
  const [reports, setReports] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      if (can("team.approve") || can("org.approve")) {
        const [l, r] = await Promise.all([api("/api/staff/leave?scope=team"), api("/api/staff/reports?scope=team")]);
        setLeave(l.leave); setReports(r.reports);
      }
      if (can("finance.approve")) setExpenses((await api("/api/staff/expenses")).toApprove);
    } catch (e) { toast(e.message, "err"); }
  }, [can]);
  useEffect(() => { load(); }, [load]);

  async function decide(path, body, msg) {
    try { await api(path, { method: "PATCH", body }); toast(msg); load(); reload(); } catch (e) { toast(e.message, "err"); }
  }

  const pendingLeave = leave.filter(l => l.status === "pending");
  const pendingReports = reports.filter(r => r.status === "submitted");
  const tabs = [
    ...(can("team.approve") || can("org.approve") ? [{ id: "leave", label: "Leave", count: pendingLeave.length }, { id: "reports", label: "Weekly reports", count: pendingReports.length }] : []),
    ...(can("finance.approve") ? [{ id: "expenses", label: "Expense claims", count: expenses.length }] : []),
    ...(can("team.approve") || can("org.approve") ? [{ id: "history", label: "Decided" }] : []),
  ];

  return (
    <div>
      <PageHeader title="Approvals" sub={can("org.approve") ? "Requests from across the company." : "Requests from people who report to you."} />
      <Tabs active={tab} onChange={setTab} tabs={tabs} />

      {tab === "leave" && (pendingLeave.length === 0 ? <EmptyState>No leave requests waiting. 🎉</EmptyState> : pendingLeave.map(l => (
        <Row key={l.id} who={l.employeeId} title={<><Badge color={C.amber}>{l.type}</Badge> {fmtDate(l.startDate)} to {fmtDate(l.endDate)} · <strong>{l.days || "?"} working day{l.days === 1 ? "" : "s"}</strong></>} sub={l.reason}>
          <Decide onDecide={(ok, notes) => decide("/api/staff/leave", { id: l.id, status: ok ? "approved" : "rejected", decisionNotes: notes }, ok ? "Leave approved" : "Leave declined")} />
        </Row>
      )))}

      {tab === "reports" && (pendingReports.length === 0 ? <EmptyState>No reports waiting for review.</EmptyState> : pendingReports.map(r => (
        <Row key={r.id} who={r.employeeId} title={<>Week {fmtDate(r.weekStart)} to {fmtDate(r.weekEnd)}{r.productFocus ? ` · ${r.productFocus}` : ""}</>} sub={r.summary}
          extra={<>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12.5, color: C.textMuted, marginTop: 8 }}>
              <span>Prospects {r.totals?.prospectsContacted || 0}</span><span>Visits {r.totals?.physicalVisits || 0}</span><span>Meetings {r.totals?.meetingsHeld || 0}</span><span>Demos {r.totals?.productDemos || 0}</span><span>Sales {r.totals?.salesClosed || 0} ({naira(r.totals?.salesValue)})</span>
            </div>
            <Btn small variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)} style={{ marginTop: 8 }}>{open === r.id ? "Hide details" : "Full report"}</Btn>
            {open === r.id && (
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, marginTop: 8 }}>
                {r.prospects?.length > 0 && <div><strong>Prospects:</strong> {r.prospects.map(p => `${p.organisation} (${p.status || "—"})`).join(", ")}</div>}
                {r.sales?.length > 0 && <div><strong>Sales:</strong> {r.sales.map(s => `${s.customer} ${naira(s.saleValue)}`).join(", ")}</div>}
                {r.challenges && <div><strong>Challenges:</strong> {r.challenges}</div>}
                {r.supportNeeded && <div><strong>Support needed:</strong> {r.supportNeeded}</div>}
                {r.keyTargets?.length > 0 && <div><strong>Next week:</strong> {r.keyTargets.join(" · ")}</div>}
              </div>
            )}
          </>}>
          <Decide onDecide={(ok, notes) => decide("/api/staff/reports", { id: r.id, status: ok ? "approved" : "rejected", reviewNotes: notes }, ok ? "Report approved" : "Report sent back")} />
        </Row>
      )))}

      {tab === "expenses" && (expenses.length === 0 ? <EmptyState>No expense claims waiting.</EmptyState> : expenses.map(x => (
        <Row key={x.id} who={x.employeeId} title={<><strong style={{ color: C.gold }}>{naira(x.amount)}</strong> · {x.category} · {fmtDate(x.expenseDate)}</>} sub={x.description}
          extra={x.receiptDataUrl ? <a href={x.receiptDataUrl} target="_blank" rel="noreferrer" download={`receipt-${x.id}`} style={{ fontSize: 12.5, color: C.blue, display: "inline-block", marginTop: 6 }}>View receipt</a> : <div style={{ fontSize: 12, color: C.amber, marginTop: 6 }}>No receipt attached</div>}>
          <Decide onDecide={(ok, notes) => decide("/api/staff/expenses", { id: x.id, action: ok ? "approve" : "reject", decisionNotes: notes }, ok ? "Claim approved. Admin will reimburse it." : "Claim declined")} />
        </Row>
      )))}

      {tab === "history" && [...leave, ...reports].filter(x => x.status !== "pending" && x.status !== "submitted").sort((a, b) => (b.decidedAt || b.reviewedAt || "").localeCompare(a.decidedAt || a.reviewedAt || "")).slice(0, 40).map(x => (
        <Row key={x.id} who={x.employeeId} title={x.type ? `${x.type} leave · ${fmtDate(x.startDate)} to ${fmtDate(x.endDate)}` : `Weekly report · ${fmtDate(x.weekStart)}`} sub={`${x.status} by ${x.decidedByName || x.reviewedByName || "a manager"} · ${timeAgo(x.decidedAt || x.reviewedAt)}`} />
      ))}
    </div>
  );
}
