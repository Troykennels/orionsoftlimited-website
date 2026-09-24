import { useCallback, useEffect, useState } from "react";
import { Plus, Phone, Mail, Send } from "lucide-react";
import { C } from "../theme.js";
import { api, timeAgo, fmtDate, naira } from "../api.js";
import { Avatar, Badge, Btn, Input, Textarea, Select, Modal, Field, EmptyState, PageHeader, Grid, StatCard, toast } from "../components.jsx";
import { useOffice } from "../office.js";

const PRODUCTS = ["CareCore", "SchoolCore", "ComplianceCore", "InventoryCore", "FinanceCore", "HRCore", "ChurchCore", "FleetCore", "TeleHealth", "Custom software", "Other"];
const STAGE_COLOR = { lead: C.textMuted, contacted: C.cyan, meeting: C.blue, demo: C.purple, proposal: C.amber, negotiation: C.gold, won: C.mint, lost: C.rose };

function DealForm({ stages, onClose, onSaved }) {
  const [f, setF] = useState({ organisation: "", contactPerson: "", contactPhone: "", contactEmail: "", product: PRODUCTS[0], value: "", stage: "lead", source: "", nextFollowUp: "", nextAction: "" });
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  async function save() {
    try { await api("/api/staff/pipeline", { method: "POST", body: f }); toast("Opportunity added"); onSaved(); } catch (e) { toast(e.message, "err"); }
  }
  return (
    <Modal title="New opportunity" onClose={onClose} width={620}>
      <Field label="Organisation" style={{ marginBottom: 12 }}><Input value={f.organisation} onChange={set("organisation")} autoFocus placeholder="e.g. St. Nicholas Hospital" /></Field>
      <Grid min={170} style={{ marginBottom: 12 }}>
        <Field label="Contact person"><Input value={f.contactPerson} onChange={set("contactPerson")} /></Field>
        <Field label="Phone"><Input value={f.contactPhone} onChange={set("contactPhone")} /></Field>
        <Field label="Email"><Input value={f.contactEmail} onChange={set("contactEmail")} /></Field>
        <Field label="Product"><Select value={f.product} onChange={set("product")}>{PRODUCTS.map(p => <option key={p}>{p}</option>)}</Select></Field>
        <Field label="Estimated value (₦)"><Input type="number" value={f.value} onChange={set("value")} /></Field>
        <Field label="Stage"><Select value={f.stage} onChange={set("stage")}>{stages.filter(s => s.id !== "won" && s.id !== "lost").map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></Field>
        <Field label="Source"><Input value={f.source} onChange={set("source")} placeholder="Referral, walk-in, event…" /></Field>
        <Field label="Next follow-up"><Input type="date" value={f.nextFollowUp} onChange={set("nextFollowUp")} /></Field>
      </Grid>
      <Field label="Next action" style={{ marginBottom: 14 }}><Input value={f.nextAction} onChange={set("nextAction")} placeholder="e.g. Send proposal to the CMD" /></Field>
      <Btn onClick={save} disabled={!f.organisation.trim()}>Add to pipeline</Btn>
    </Modal>
  );
}

function DealDetail({ deal: initial, stages, onClose, onChanged }) {
  const { person, me } = useOffice();
  const [d, setD] = useState(initial);
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState({ value: initial.value, nextFollowUp: initial.nextFollowUp || "", nextAction: initial.nextAction || "", lostReason: initial.lostReason || "" });
  async function patch(body, msg) {
    try { const j = await api("/api/staff/pipeline", { method: "PATCH", body: { id: d.id, ...body } }); setD(j.deal); onChanged(); if (msg) toast(msg); } catch (e) { toast(e.message, "err"); }
  }
  async function addNote(kind = "note") {
    try { const j = await api("/api/staff/pipeline", { method: "POST", body: { action: "note", id: d.id, text: note, kind } }); setD(j.deal); setNote(""); } catch (e) { toast(e.message, "err"); }
  }
  const owner = person(d.ownerId);
  return (
    <Modal title={d.organisation} onClose={onClose} width={680}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <Badge color={STAGE_COLOR[d.stage]}>{stages.find(s => s.id === d.stage)?.label}</Badge>
        {d.product && <Badge color={C.purple}>{d.product}</Badge>}
        <Badge color={C.gold}>{naira(d.value)}</Badge>
        <span style={{ fontSize: 12.5, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Avatar src={owner.avatarDataUrl} name={owner.fullName} size={20} /> {d.ownerId === me.id ? "Your deal" : owner.fullName}</span>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: C.text, marginBottom: 14 }}>
        {d.contactPerson && <span>👤 {d.contactPerson}</span>}
        {d.contactPhone && <a href={`tel:${d.contactPhone}`} style={{ color: C.blue, display: "flex", gap: 4, alignItems: "center" }}><Phone size={13} /> {d.contactPhone}</a>}
        {d.contactEmail && <a href={`mailto:${d.contactEmail}`} style={{ color: C.blue, display: "flex", gap: 4, alignItems: "center" }}><Mail size={13} /> {d.contactEmail}</a>}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>MOVE STAGE</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {stages.map(s => <Btn key={s.id} small variant={d.stage === s.id ? "primary" : "ghost"} onClick={() => patch({ stage: s.id }, s.id === "won" ? "🎉 Deal won! Celebrated on the office feed." : `Moved to ${s.label}`)}>{s.label}</Btn>)}
      </div>
      <Grid min={170} style={{ marginBottom: 10 }}>
        <Field label="Value (₦)"><Input type="number" value={edit.value} onChange={e => setEdit(x => ({ ...x, value: e.target.value }))} /></Field>
        <Field label="Next follow-up"><Input type="date" value={edit.nextFollowUp} onChange={e => setEdit(x => ({ ...x, nextFollowUp: e.target.value }))} /></Field>
      </Grid>
      <Field label="Next action" style={{ marginBottom: 10 }}><Input value={edit.nextAction} onChange={e => setEdit(x => ({ ...x, nextAction: e.target.value }))} /></Field>
      {d.stage === "lost" && <Field label="Why was it lost?" style={{ marginBottom: 10 }}><Input value={edit.lostReason} onChange={e => setEdit(x => ({ ...x, lostReason: e.target.value }))} /></Field>}
      <Btn small onClick={() => patch(edit, "Deal updated")}>Save details</Btn>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, margin: "18px 0 6px" }}>ACTIVITY</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Log a call, visit, email or note…" style={{ minHeight: 44 }} />
        <Btn icon={Send} onClick={() => addNote()} disabled={!note.trim()}>Log</Btn>
      </div>
      {(d.timeline || []).map((t, i) => (
        <div key={i} style={{ fontSize: 13, color: C.text, padding: "7px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span><strong style={{ color: t.kind === "stage" ? C.gold : C.heading }}>{person(t.by).fullName}:</strong> {t.text}</span>
          <span style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>{timeAgo(t.at)}</span>
        </div>
      ))}
    </Modal>
  );
}

export default function Pipeline({ param }) {
  const { me, person, navigate } = useOffice();
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [drag, setDrag] = useState(null);
  const load = useCallback(() => api("/api/staff/pipeline").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <EmptyState>Loading…</EmptyState>;

  const deals = data.deals.filter(d => !mineOnly || d.ownerId === me.id);
  const open = param ? data.deals.find(d => d.id === param) : null;
  const today = new Date().toISOString().slice(0, 10);

  async function move(id, stage) {
    try { await api("/api/staff/pipeline", { method: "PATCH", body: { id, stage } }); if (stage === "won") toast("🎉 Deal won! Celebrated on the office feed."); load(); } catch (e) { toast(e.message, "err"); }
  }

  return (
    <div>
      <PageHeader title="Business Development Pipeline" sub="Track every opportunity from first contact to signed deal. Follow-up reminders arrive on the due date."
        action={<><Btn variant="ghost" onClick={() => setMineOnly(m => !m)}>{mineOnly ? "Show team deals" : "Only my deals"}</Btn><Btn icon={Plus} onClick={() => setCreating(true)}>New opportunity</Btn></>} />
      <Grid min={170} style={{ marginBottom: 18 }}>
        <StatCard label="Open opportunities" value={data.summary.openCount} color={C.blue} />
        <StatCard label="Pipeline value" value={naira(data.summary.openValue)} color={C.gold} />
        <StatCard label="Weighted forecast" value={naira(data.summary.weighted)} sub="Value × stage probability" color={C.purple} />
        <StatCard label="Won this month" value={naira(data.summary.wonThisMonth)} color={C.mint} />
        <StatCard label="Win rate" value={`${data.summary.winRate}%`} color={C.cyan} />
      </Grid>
      <div className="so-pipeline">
        {data.stages.map(s => {
          const items = deals.filter(d => d.stage === s.id);
          const total = items.reduce((n, d) => n + (Number(d.value) || 0), 0);
          return (
            <div key={s.id} onDragOver={e => e.preventDefault()} onDrop={() => { if (drag) move(drag, s.id); setDrag(null); }}
              style={{ background: "rgba(11,17,32,0.7)", border: `1px solid ${C.border}`, borderTop: `3px solid ${STAGE_COLOR[s.id]}`, borderRadius: 14, padding: 10, minHeight: 260 }}>
              <div style={{ padding: "2px 4px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: 13, color: C.heading }}>{s.label}</strong><span style={{ fontSize: 12, color: C.textMuted }}>{items.length}</span></div>
                <div style={{ fontSize: 11.5, color: C.textMuted }}>{naira(total)} · {s.probability}%</div>
              </div>
              {items.map(d => {
                const due = d.nextFollowUp && d.nextFollowUp <= today && !["won", "lost"].includes(d.stage);
                return (
                  <div key={d.id} draggable onDragStart={() => setDrag(d.id)} onClick={() => navigate("pipeline", d.id)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && navigate("pipeline", d.id)}
                    className="so-card so-lift" style={{ border: `1px solid ${due ? C.amber + "88" : C.border}`, borderRadius: 10, padding: 10, marginBottom: 8, cursor: "grab" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading }}>{d.organisation}</div>
                    <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginTop: 3 }}>{naira(d.value)}{d.product ? <span style={{ color: C.textMuted, fontWeight: 500 }}> · {d.product}</span> : null}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      {d.ownerId !== me.id && <Avatar src={person(d.ownerId).avatarDataUrl} name={person(d.ownerId).fullName} size={18} />}
                      {d.nextFollowUp && !["won", "lost"].includes(d.stage) && <span style={{ fontSize: 11.5, color: due ? C.amber : C.textMuted, fontWeight: due ? 700 : 500 }}>{due ? "Follow up now · " : "Follow up "}{fmtDate(d.nextFollowUp)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {creating && <DealForm stages={data.stages} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {open && <DealDetail key={open.id} deal={open} stages={data.stages} onClose={() => navigate("pipeline")} onChanged={load} />}
    </div>
  );
}
