import { useCallback, useEffect, useState } from "react";
import { Receipt, Upload } from "lucide-react";
import { C } from "../theme.js";
import { api, fmtDate, naira } from "../api.js";
import { Badge, Btn, SectionCard, SectionTitle, Input, Textarea, Select, Field, EmptyState, PageHeader, Grid, toast } from "../components.jsx";
import { resizeImageToDataUrl } from "../imageUtils.js";

const STATUS = { pending: C.amber, approved: C.blue, rejected: C.rose, reimbursed: C.mint };

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Couldn't read that file"));
    r.readAsDataURL(file);
  });
}

export default function Expenses() {
  const [data, setData] = useState({ expenses: [], categories: [] });
  const [f, setF] = useState({ amount: "", category: "Travel", description: "", expenseDate: new Date().toISOString().slice(0, 10), receiptDataUrl: "", receiptName: "" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api("/api/staff/expenses").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);

  async function onReceipt(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = file.type === "application/pdf" ? await readFile(file) : await resizeImageToDataUrl(file, 1600, 0.8);
      if (dataUrl.length > 2_000_000) throw new Error("That file is too large. Keep receipts under 1.5MB.");
      setF(x => ({ ...x, receiptDataUrl: dataUrl, receiptName: file.name }));
    } catch (ex) { toast(ex.message, "err"); }
  }
  async function submit() {
    setBusy(true);
    try {
      await api("/api/staff/expenses", { method: "POST", body: f });
      toast("Claim submitted for approval");
      setF(x => ({ ...x, amount: "", description: "", receiptDataUrl: "", receiptName: "" }));
      load();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  const pending = data.expenses.filter(x => x.status === "pending").reduce((n, x) => n + x.amount, 0);
  const owed = data.expenses.filter(x => x.status === "approved").reduce((n, x) => n + x.amount, 0);

  return (
    <div>
      <PageHeader title="Expense Claims" sub="Spent your own money on company work? Claim it back here. Finance approves, admin reimburses." />
      <Grid min={180} style={{ marginBottom: 18 }}>
        <SectionCard><div style={{ fontSize: 12, color: C.textMuted }}>Awaiting approval</div><div style={{ fontSize: 22, fontWeight: 800, color: C.amber }}>{naira(pending)}</div></SectionCard>
        <SectionCard><div style={{ fontSize: 12, color: C.textMuted }}>Approved, to be paid</div><div style={{ fontSize: 22, fontWeight: 800, color: C.blue }}>{naira(owed)}</div></SectionCard>
      </Grid>
      <div className="so-two">
        <SectionCard>
          <SectionTitle>Your claims</SectionTitle>
          {data.expenses.length === 0 && <EmptyState icon={Receipt}>No claims yet.</EmptyState>}
          {data.expenses.map(x => (
            <div key={x.id} style={{ padding: "11px 0", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{naira(x.amount)} · {x.category}</div>
                <div style={{ fontSize: 12.5, color: C.textMuted }}>{fmtDate(x.expenseDate)}{x.description ? ` · ${x.description}` : ""}</div>
                {x.decisionNotes && <div style={{ fontSize: 12.5, color: C.text, marginTop: 3 }}>{x.decidedBy}: {x.decisionNotes}</div>}
              </div>
              <Badge color={STATUS[x.status] || C.textMuted}>{x.status}</Badge>
            </div>
          ))}
        </SectionCard>
        <SectionCard>
          <SectionTitle>New claim</SectionTitle>
          <Field label="Amount (₦)" style={{ marginBottom: 10 }}><Input type="number" min="0" value={f.amount} onChange={e => setF(x => ({ ...x, amount: e.target.value }))} /></Field>
          <Field label="Category" style={{ marginBottom: 10 }}><Select value={f.category} onChange={e => setF(x => ({ ...x, category: e.target.value }))}>{(data.categories.length ? data.categories : ["Travel", "Other"]).map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Date spent" style={{ marginBottom: 10 }}><Input type="date" value={f.expenseDate} onChange={e => setF(x => ({ ...x, expenseDate: e.target.value }))} /></Field>
          <Field label="What was it for?" style={{ marginBottom: 10 }}><Textarea value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} style={{ minHeight: 60 }} placeholder="e.g. Uber to Lagos General for the CareCore demo" /></Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, border: `1px dashed ${C.borderStrong}`, borderRadius: 10, padding: 12, cursor: "pointer", color: C.text, fontSize: 13, marginBottom: 12 }}>
            <Upload size={16} /> {f.receiptName || "Attach receipt (photo or PDF)"}
            <input type="file" accept="image/*,application/pdf" hidden onChange={onReceipt} />
          </label>
          <Btn onClick={submit} disabled={busy || !(Number(f.amount) > 0)}>Submit claim</Btn>
        </SectionCard>
      </div>
    </div>
  );
}
