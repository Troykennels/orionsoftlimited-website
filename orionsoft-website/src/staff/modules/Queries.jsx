// Staff queries: answer queries issued to you; managers and HR issue and
// close queries for people in their reporting line. The card, issue form and
// close dialog are shared with the admin dashboard (src/admin/QueriesAdmin.jsx).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileWarning, Plus } from "lucide-react";
import { C } from "../theme.js";
import { api, fmtDate, fmtDateTime } from "../api.js";
import { Badge, Btn, SectionCard, Field, Input, Textarea, Select, Modal, EmptyState, PageHeader, Tabs, Grid, toast } from "../components.jsx";
import { useOffice } from "../office.js";
import { STATUS, lagosToday, inDays, isOverdue, postQuery as post, issueAsStaff, askWithdraw } from "../queries.js";

const block = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginTop: 12 };
const heading = { fontSize: 11.5, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", marginBottom: 6 };
const prose = { fontSize: 13.5, color: C.text, lineHeight: 1.65, whiteSpace: "pre-wrap", margin: 0 };

// One query, as a letter: what it's about, the staff member's response, the outcome.
// `showPerson` for manager/admin lists; `children` for the actions underneath.
export function QueryCard({ q, categories, outcomes, showPerson, highlight, children }) {
  const st = STATUS[q.status] || STATUS.open;
  const ref = useRef(null);
  useEffect(() => { if (highlight) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [highlight]);
  return (
    <SectionCard style={{ marginBottom: 14, ...(highlight ? { borderColor: C.gold } : {}) }}>
      <div ref={ref} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          {showPerson && <div style={{ fontSize: 12.5, fontWeight: 800, color: C.gold, marginBottom: 2 }}>{q.employeeName}</div>}
          <div style={{ fontSize: 16, fontWeight: 800, color: C.heading }}>{q.subject}</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>
            Issued {fmtDate(q.createdAt)} by {q.issuedBy?.name}{q.issuedBy?.title ? ` (${q.issuedBy.title})` : ""} · respond by {fmtDate(q.respondBy)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Badge color={C.purple}>{categories?.[q.category] || q.category}</Badge>
          <Badge color={st.color}>{st.label}</Badge>
          {isOverdue(q) && <Badge color={C.rose}>Overdue</Badge>}
        </div>
      </div>
      <div style={block}><p style={prose}>{q.details}</p></div>
      {q.response && (
        <div style={{ ...block, borderColor: `${C.blue}55` }}>
          <div style={heading}>RESPONSE · {fmtDateTime(q.response.at).toUpperCase()}{q.response.late ? " · AFTER THE DEADLINE" : ""}</div>
          <p style={prose}>{q.response.text}</p>
        </div>
      )}
      {q.outcome && (
        <div style={{ ...block, borderColor: `${C.mint}55` }}>
          <div style={heading}>OUTCOME · {q.outcome.byName?.toUpperCase()} · {fmtDate(q.outcome.at).toUpperCase()}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.heading }}>{outcomes?.[q.outcome.decision] || q.outcome.decision}</div>
          {q.outcome.beforeResponse && <div style={{ fontSize: 12.5, color: C.rose, marginTop: 4 }}>Closed without a response from {q.employeeName}.</div>}
          {q.outcome.note && <p style={{ ...prose, marginTop: 6 }}>{q.outcome.note}</p>}
        </div>
      )}
      {q.withdrawn && (
        <div style={block}>
          <div style={heading}>WITHDRAWN · {q.withdrawn.byName?.toUpperCase()} · {fmtDate(q.withdrawn.at).toUpperCase()}</div>
          <p style={prose}>{q.withdrawn.reason || "No reason given."}</p>
        </div>
      )}
      {children && <div style={{ marginTop: 12 }}>{children}</div>}
    </SectionCard>
  );
}

// Issue a new query. `submit(body)` does the request; `people` is who may be queried.
export function IssueQueryModal({ people, categories, preset = {}, submit, onClose, onDone, extraFields }) {
  const [form, setForm] = useState({ employeeId: "", category: "performance", subject: "", details: "", respondBy: inDays(3), ...preset });
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  async function send() {
    if (!form.employeeId) return toast("Choose who the query is for", "err");
    if (!form.subject.trim() || !form.details.trim()) return toast("Add a subject and the details", "err");
    const who = people.find(p => p.id === form.employeeId)?.fullName || "this person";
    if (!confirm(`Issue this query to ${who}? They'll be notified and asked to respond in writing by ${fmtDate(form.respondBy)}.`)) return;
    setBusy(true);
    try { await submit(form); toast("Query issued"); onDone?.(); onClose(); }
    catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  }
  return (
    <Modal title="Issue a query" onClose={onClose} width={620}>
      <div style={{ display: "grid", gap: 12 }}>
        <Grid min={220} gap={12}>
          <Field label="Staff member">
            <Select value={form.employeeId} onChange={set("employeeId")}>
              <option value="">Choose…</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </Select>
          </Field>
          <Field label="Reason">
            <Select value={form.category} onChange={set("category")}>
              {Object.entries(categories || {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </Grid>
        <Field label="Subject"><Input value={form.subject} onChange={set("subject")} maxLength={160} placeholder="e.g. Repeated lateness in September" /></Field>
        <Field label="Details">
          <Textarea rows={7} value={form.details} onChange={set("details")} maxLength={5000}
            placeholder="State the facts (dates, what was expected, what happened) and ask them to explain in writing." />
        </Field>
        <Grid min={200} gap={12}>
          <Field label="Respond by"><Input type="date" value={form.respondBy} min={lagosToday()} onChange={set("respondBy")} /></Field>
          {extraFields?.(form, setForm)}
        </Grid>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={send} disabled={busy}>{busy ? "Sending…" : "Issue query"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// Close a query with an outcome (or withdraw it).
export function CloseQueryModal({ q, outcomes, submit, onClose, onDone }) {
  const [decision, setDecision] = useState(q.status === "responded" ? "no_action" : "warning");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try { await submit({ id: q.id, decision, note }); toast("Query closed"); onDone?.(); onClose(); }
    catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  }
  return (
    <Modal title={`Close query: ${q.employeeName}`} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        {q.status === "open" && <p style={{ fontSize: 13, color: C.amber, margin: 0 }}>{q.employeeName} hasn't responded yet. Closing now records that no response was given.</p>}
        <Field label="Outcome">
          <Select value={decision} onChange={e => setDecision(e.target.value)}>
            {Object.entries(outcomes || {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Note to the staff member (optional)"><Textarea rows={4} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} placeholder="e.g. Your explanation is accepted. Please make sure it doesn't happen again." /></Field>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={send} disabled={busy}>Close query</Btn>
        </div>
      </div>
    </Modal>
  );
}

// Used from Performance: issue a query without opening the Queries page.
export function StaffIssueQuery({ preset, onClose, onDone }) {
  const { directory } = useOffice();
  const [meta, setMeta] = useState(null);
  useEffect(() => { api("/api/staff/queries").then(setMeta).catch(e => { toast(e.message, "err"); onClose(); }); }, [onClose]);
  if (!meta) return null;
  const people = directory.filter(p => meta.canQueryIds.includes(p.id));
  return <IssueQueryModal people={people} categories={meta.categories} preset={preset} submit={issueAsStaff} onClose={onClose} onDone={onDone} />;
}

function Respond({ q, onDone }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (text.trim().length < 10) return toast("Write your response first", "err");
    if (!confirm("Submit your response? You can't change it afterwards.")) return;
    setBusy(true);
    try { await post({ action: "respond", id: q.id, text }); toast("Response submitted"); onDone(); }
    catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <Textarea rows={6} value={text} onChange={e => setText(e.target.value)} maxLength={5000} placeholder="Your written response: explain what happened and anything you'd like on record." />
      <div><Btn onClick={send} disabled={busy}>{busy ? "Submitting…" : "Submit response"}</Btn></div>
    </div>
  );
}

export default function Queries({ param }) {
  const { directory } = useOffice();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("mine");
  const [filter, setFilter] = useState("active");
  const [issuing, setIssuing] = useState(false);
  const [closing, setClosing] = useState(null);

  const load = useCallback(() => api("/api/staff/queries").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);
  // Opened from a notification ("queries:<id>"): show the tab that holds it.
  const [opened, setOpened] = useState(null);
  if (data && param && opened !== param) {
    setOpened(param);
    if (data.team.some(q => q.id === param)) { setTab("team"); setFilter("all"); } else setTab("mine");
  }

  const manager = !!data && (data.canQueryIds.length > 0 || data.team.length > 0);
  const people = useMemo(() => data ? directory.filter(p => data.canQueryIds.includes(p.id)) : [], [data, directory]);
  if (!data) return <EmptyState>Loading…</EmptyState>;

  const toAnswer = data.mine.filter(q => q.status === "open").length;
  const toDecide = data.team.filter(q => q.status === "responded").length;
  const team = data.team.filter(q => filter === "all" || (filter === "active" ? q.status === "open" || q.status === "responded" : q.status === filter));
  const closeAsStaff = body => post({ action: "close", ...body });
  const withdrawAsStaff = body => post({ action: "withdraw", ...body });

  return (
    <div>
      <PageHeader title="Queries"
        sub={manager ? "Formal queries to staff who aren't meeting expectations. They answer in writing; you close each one with an outcome." : "Formal queries from your manager or HR. Respond in writing by the date shown."}
        action={manager && people.length > 0 ? <Btn icon={Plus} onClick={() => setIssuing(true)}>Issue a query</Btn> : null} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: "mine", label: "Issued to me", count: toAnswer },
        ...(manager ? [{ id: "team", label: data.companyWide ? "Company" : "My team", count: toDecide }] : []),
      ]} />

      {tab === "mine" && (data.mine.length === 0
        ? <EmptyState icon={FileWarning}>No queries have been issued to you.</EmptyState>
        : data.mine.map(q => (
          <QueryCard key={q.id} q={q} categories={data.categories} outcomes={data.outcomes} highlight={param === q.id}>
            {q.status === "open" && <Respond q={q} onDone={load} />}
          </QueryCard>
        )))}

      {tab === "team" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 220 }} aria-label="Show">
              <option value="active">Open &amp; responded</option>
              <option value="open">Awaiting response</option>
              <option value="responded">Responded: needs your decision</option>
              <option value="closed">Closed</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="all">All</option>
            </Select>
            <span style={{ fontSize: 12.5, color: C.textMuted }}>{team.length} {team.length === 1 ? "query" : "queries"}</span>
          </div>
          {team.length === 0 && <EmptyState icon={FileWarning}>No queries to show.</EmptyState>}
          {team.map(q => (
            <QueryCard key={q.id} q={q} categories={data.categories} outcomes={data.outcomes} showPerson highlight={param === q.id}>
              {(q.status === "open" || q.status === "responded") && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn small onClick={() => setClosing(q)}>{q.status === "responded" ? "Review & close" : "Close without response"}</Btn>
                  <Btn small variant="ghost" onClick={() => askWithdraw(q, withdrawAsStaff, load)}>Withdraw</Btn>
                </div>
              )}
            </QueryCard>
          ))}
        </>
      )}

      {issuing && <IssueQueryModal people={people} categories={data.categories} submit={issueAsStaff} onClose={() => setIssuing(false)} onDone={() => { load(); setTab("team"); }} />}
      {closing && <CloseQueryModal q={closing} outcomes={data.outcomes} submit={closeAsStaff} onClose={() => setClosing(null)} onDone={load} />}
    </div>
  );
}
