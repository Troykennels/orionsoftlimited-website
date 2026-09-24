import { useCallback, useEffect, useState } from "react";
import { Palmtree } from "lucide-react";
import { C } from "../theme.js";
import { api, fmtDate } from "../api.js";
import { Btn, Badge, SectionCard, SectionTitle, Input, Textarea, Select, EmptyState, PageHeader, Grid, Field, Progress, toast } from "../components.jsx";
import { useOffice } from "../office.js";

const LABEL = { annual: "Annual", sick: "Sick", casual: "Casual", maternity: "Maternity", paternity: "Paternity", study: "Study / exam", compassionate: "Compassionate", unpaid: "Unpaid", other: "Other" };

export default function Leave() {
  const { me, directory, office, reload } = useOffice();
  const [data, setData] = useState({ leave: [], balance: null, types: Object.keys(LABEL) });
  const [form, setForm] = useState({ type: "annual", startDate: "", endDate: "", reason: "", handoverTo: "" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api("/api/staff/leave").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!form.startDate || !form.endDate) { toast("Pick your start and end dates", "err"); return; }
    setBusy(true);
    try {
      await api("/api/staff/leave", { method: "POST", body: form });
      toast(`Request sent to ${office.lineManager?.fullName || "your approver"}`);
      setForm({ type: "annual", startDate: "", endDate: "", reason: "", handoverTo: "" });
      load(); reload();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  const b = data.balance;
  return (
    <div>
      <PageHeader title="Leave" sub={`Requests go to ${office.lineManager ? office.lineManager.fullName : "HR"} for approval. You'll be notified the moment they decide.`} />
      {b && (
        <SectionCard style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <div><div style={{ fontSize: 12, color: C.textMuted }}>Annual leave {new Date().getFullYear()}</div><div style={{ fontSize: 26, fontWeight: 800, color: C.mint }}>{b.remaining} days left</div></div>
            <div style={{ fontSize: 13, color: C.text }}>{b.used} of {b.allowance} working days used</div>
          </div>
          <Progress value={(b.used / Math.max(1, b.allowance)) * 100} color={C.blue} />
        </SectionCard>
      )}
      <div className="so-two">
        <SectionCard>
          <SectionTitle>Your requests</SectionTitle>
          {data.leave.length === 0 && <EmptyState icon={Palmtree}>No leave requests yet.</EmptyState>}
          {data.leave.map(l => (
            <div key={l.id} style={{ padding: "12px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{LABEL[l.type] || l.type} · {fmtDate(l.startDate)} – {fmtDate(l.endDate)}{l.days ? ` · ${l.days}d` : ""}</div>
                <Badge color={l.status === "approved" ? C.mint : l.status === "rejected" ? C.rose : C.amber}>{l.status}</Badge>
              </div>
              {l.decisionNotes && <div style={{ fontSize: 12.5, color: C.text, marginTop: 6 }}><strong>{l.decidedByName || "Approver"}:</strong> {l.decisionNotes}</div>}
            </div>
          ))}
        </SectionCard>
        <SectionCard>
          <SectionTitle>Request leave</SectionTitle>
          <Field label="Type" style={{ marginBottom: 10 }}><Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{data.types.map(t => <option key={t} value={t}>{LABEL[t] || t}</option>)}</Select></Field>
          <Grid min={130} style={{ marginBottom: 10 }}>
            <Field label="First day"><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></Field>
            <Field label="Last day"><Input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></Field>
          </Grid>
          <Field label="Who covers your work? (optional)" style={{ marginBottom: 10 }}>
            <Select value={form.handoverTo} onChange={e => setForm(f => ({ ...f, handoverTo: e.target.value }))}><option value="">No one / not needed</option>{directory.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}</Select>
          </Field>
          <Field label="Reason (optional)" style={{ marginBottom: 12 }}><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ minHeight: 70 }} /></Field>
          <Btn onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send request"}</Btn>
        </SectionCard>
      </div>
    </div>
  );
}
