// Admin: Staff Queries. Every query in the company (issued here or by
// managers/HR in the Staff Office), with responses, outcomes and overdue ones.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import { C, font } from "../staff/theme.js";
import { Btn, SectionCard, SectionTitle, Input, Select, EmptyState, StatCard, Field, Toaster, toast } from "../staff/components.jsx";
import { QueryCard, IssueQueryModal, CloseQueryModal } from "../staff/modules/Queries.jsx";
import { askWithdraw, isOverdue, STATUS } from "../staff/queries.js";
import "../staff/staff.css";

async function call(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}
const issueAsAdmin = form => call("/api/admin/queries", { method: "POST", body: form });

// Who it's signed by on the letter (defaults to the admin's name / "Management").
const signerFields = (form, setForm) => (
  <>
    <Field label="Signed by (optional)"><Input value={form.issuerName || ""} onChange={e => setForm(f => ({ ...f, issuerName: e.target.value }))} placeholder="Your name" /></Field>
    <Field label="Title (optional)"><Input value={form.issuerTitle || ""} onChange={e => setForm(f => ({ ...f, issuerTitle: e.target.value }))} placeholder="Management" /></Field>
  </>
);

function useActiveEmployees() {
  const [list, setList] = useState([]);
  useEffect(() => { call("/api/admin/employees").then(j => setList((j.employees || []).filter(e => e.status === "active").sort((a, b) => a.fullName.localeCompare(b.fullName)))).catch(() => {}); }, []);
  return list;
}

// Used from the admin Performance page to query someone from their scorecard.
export function AdminIssueQuery({ preset, onClose }) {
  const people = useActiveEmployees();
  const [categories, setCategories] = useState(null);
  useEffect(() => { call("/api/admin/queries").then(j => setCategories(j.categories)).catch(e => toast(e.message, "err")); }, []);
  if (!categories || !people.length) return null;
  return <IssueQueryModal people={people} categories={categories} preset={preset} submit={issueAsAdmin} onClose={onClose} extraFields={signerFields} />;
}

export function QueriesSection() {
  const people = useActiveEmployees();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [closing, setClosing] = useState(null);

  const load = useCallback(() => call("/api/admin/queries").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => (data?.queries || []).filter(x =>
    (status === "all" || (status === "active" ? x.status === "open" || x.status === "responded" : status === "overdue" ? isOverdue(x) : x.status === status))
    && (!q || `${x.employeeName} ${x.subject} ${x.issuedBy?.name}`.toLowerCase().includes(q.toLowerCase()))), [data, status, q]);

  if (!data) return <div><Toaster /><EmptyState>Loading queries…</EmptyState></div>;
  const all = data.queries;
  const close = body => call("/api/admin/queries", { method: "PATCH", body: { action: "close", ...body } });
  const withdraw = body => call("/api/admin/queries", { method: "PATCH", body: { action: "withdraw", ...body } });
  async function remove(x) {
    if (!confirm(`Delete the query "${x.subject}" to ${x.employeeName} permanently? It will no longer be on their record.`)) return;
    try { await call(`/api/admin/queries?id=${encodeURIComponent(x.id)}`, { method: "DELETE" }); toast("Query deleted"); load(); }
    catch (e) { toast(e.message, "err"); }
  }
  function exportCsv() {
    const rows = [["Issued", "Staff member", "Reason", "Subject", "Issued by", "Respond by", "Status", "Responded", "Outcome", "Outcome note"],
      ...all.map(x => [x.createdAt.slice(0, 10), x.employeeName, data.categories[x.category] || x.category, x.subject, x.issuedBy?.name, x.respondBy, STATUS[x.status]?.label, x.response?.at?.slice(0, 10) || "", x.outcome ? data.outcomes[x.outcome.decision] : "", x.outcome?.note || ""])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, "'")}"`).join(",")).join("\n")], { type: "text/csv" }));
    a.download = "staff-queries.csv"; a.click();
  }

  return (
    <div style={{ fontFamily: font }}>
      <Toaster />
      <SectionTitle sub="Formal written queries to staff who aren't meeting expectations. Managers and HR can also issue them from the Staff Office; all of them show here."
        action={<div style={{ display: "flex", gap: 8 }}><Btn small variant="ghost" icon={Download} onClick={exportCsv} disabled={!all.length}>Export CSV</Btn><Btn small icon={Plus} onClick={() => setIssuing(true)}>Issue a query</Btn></div>}>Staff Queries</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="Awaiting response" value={all.filter(x => x.status === "open").length} color={C.amber} onClick={() => setStatus("open")} />
        <StatCard label="Overdue" value={all.filter(isOverdue).length} color={C.rose} onClick={() => setStatus("overdue")} />
        <StatCard label="Responded: to decide" value={all.filter(x => x.status === "responded").length} color={C.blue} onClick={() => setStatus("responded")} />
        <StatCard label="Closed" value={all.filter(x => x.status === "closed").length} color={C.mint} onClick={() => setStatus("closed")} />
      </div>
      <SectionCard style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, subject or issuer…" style={{ maxWidth: 320 }} />
          <Select value={status} onChange={e => setStatus(e.target.value)} style={{ maxWidth: 220 }} aria-label="Status">
            <option value="active">Open &amp; responded</option>
            <option value="open">Awaiting response</option>
            <option value="overdue">Overdue</option>
            <option value="responded">Responded: to decide</option>
            <option value="closed">Closed</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="all">All</option>
          </Select>
          <span style={{ fontSize: 12.5, color: C.textMuted }}>{list.length} {list.length === 1 ? "query" : "queries"}</span>
        </div>
      </SectionCard>
      {list.length === 0 && <SectionCard><EmptyState>{all.length ? "No queries match." : "No queries have been issued yet."}</EmptyState></SectionCard>}
      {list.map(x => (
        <QueryCard key={x.id} q={x} categories={data.categories} outcomes={data.outcomes} showPerson>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(x.status === "open" || x.status === "responded") && <>
              <Btn small onClick={() => setClosing(x)}>{x.status === "responded" ? "Review & close" : "Close without response"}</Btn>
              <Btn small variant="ghost" onClick={() => askWithdraw(x, withdraw, load)}>Withdraw</Btn>
            </>}
            <Btn small danger onClick={() => remove(x)}>Delete</Btn>
          </div>
        </QueryCard>
      ))}
      {issuing && <IssueQueryModal people={people} categories={data.categories} submit={issueAsAdmin} onClose={() => setIssuing(false)} onDone={load} extraFields={signerFields} />}
      {closing && <CloseQueryModal q={closing} outcomes={data.outcomes} submit={close} onClose={() => setClosing(null)} onDone={load} />}
    </div>
  );
}
