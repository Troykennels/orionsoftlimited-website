import { useCallback, useEffect, useState } from "react";
import { Plus, Send, Phone, Mail } from "lucide-react";
import { C, font } from "../theme.js";
import { api, fmtDate } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, Input, Textarea, Select, Modal, Field, EmptyState, PageHeader, Grid, StatCard, toast } from "../components.jsx";
import { useOffice } from "../office.js";

const REL = { new: ["New", C.textMuted], engaged: ["Engaged", C.blue], strong: ["Strong", C.mint], at_risk: ["At risk", C.rose], dormant: ["Dormant", C.amber] };
const MOU = { none: "No MoU", drafting: "MoU in draft", signed: "MoU signed" };

function StakeholderForm({ meta, onClose, onSaved }) {
  const [f, setF] = useState({ organisation: "", category: meta.categories[0], contactPerson: "", contactRole: "", phone: "", email: "", relationship: "new", mouStatus: "none", interest: "", nextFollowUp: "", nextAction: "" });
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  async function save() { try { await api("/api/staff/liaison", { method: "POST", body: f }); toast("Stakeholder added"); onSaved(); } catch (e) { toast(e.message, "err"); } }
  return (
    <Modal title="Add a stakeholder" onClose={onClose} width={640}>
      <Field label="Organisation" style={{ marginBottom: 12 }}><Input value={f.organisation} onChange={set("organisation")} autoFocus placeholder="e.g. Lagos State Ministry of Health" /></Field>
      <Grid min={170} style={{ marginBottom: 12 }}>
        <Field label="Category"><Select value={f.category} onChange={set("category")}>{meta.categories.map(c => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Relationship"><Select value={f.relationship} onChange={set("relationship")}>{meta.relationship.map(r => <option key={r} value={r}>{REL[r]?.[0] || r}</option>)}</Select></Field>
        <Field label="MoU status"><Select value={f.mouStatus} onChange={set("mouStatus")}>{Object.entries(MOU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Contact person"><Input value={f.contactPerson} onChange={set("contactPerson")} /></Field>
        <Field label="Their role"><Input value={f.contactRole} onChange={set("contactRole")} placeholder="Director, PS, CEO…" /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Email"><Input value={f.email} onChange={set("email")} /></Field>
        <Field label="Next follow-up"><Input type="date" value={f.nextFollowUp} onChange={set("nextFollowUp")} /></Field>
      </Grid>
      <Field label="Their interest / what we want from the relationship" style={{ marginBottom: 12 }}><Textarea value={f.interest} onChange={set("interest")} style={{ minHeight: 60 }} /></Field>
      <Field label="Next action" style={{ marginBottom: 14 }}><Input value={f.nextAction} onChange={set("nextAction")} /></Field>
      <Btn onClick={save} disabled={!f.organisation.trim()}>Add stakeholder</Btn>
    </Modal>
  );
}

function StakeholderDetail({ item, meta, onClose, onChanged }) {
  const { person } = useOffice();
  const [s, setS] = useState(item);
  const [eng, setEng] = useState({ type: "meeting", date: new Date().toISOString().slice(0, 10), summary: "", outcome: "", nextFollowUp: item.nextFollowUp || "", nextAction: item.nextAction || "", relationship: item.relationship });
  async function logEngagement() {
    try { const j = await api("/api/staff/liaison", { method: "POST", body: { action: "engagement", id: s.id, ...eng } }); setS(j.stakeholder); setEng(x => ({ ...x, summary: "", outcome: "" })); toast("Engagement logged"); onChanged(); } catch (e) { toast(e.message, "err"); }
  }
  async function patch(body) { try { const j = await api("/api/staff/liaison", { method: "PATCH", body: { id: s.id, ...body } }); setS(j.stakeholder); onChanged(); } catch (e) { toast(e.message, "err"); } }
  const [rl, rc] = REL[s.relationship] || REL.new;
  return (
    <Modal title={s.organisation} onClose={onClose} width={700}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge color={C.purple}>{s.category}</Badge><Badge color={rc}>{rl}</Badge><Badge color={s.mouStatus === "signed" ? C.mint : C.textMuted}>{MOU[s.mouStatus]}</Badge>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: C.text, marginBottom: 10 }}>
        {s.contactPerson && <span>👤 {s.contactPerson}{s.contactRole ? ` (${s.contactRole})` : ""}</span>}
        {s.phone && <a href={`tel:${s.phone}`} style={{ color: C.blue, display: "flex", gap: 4, alignItems: "center" }}><Phone size={13} /> {s.phone}</a>}
        {s.email && <a href={`mailto:${s.email}`} style={{ color: C.blue, display: "flex", gap: 4, alignItems: "center" }}><Mail size={13} /> {s.email}</a>}
      </div>
      {s.interest && <p style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>{s.interest}</p>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {Object.entries(MOU).map(([k, v]) => <Btn key={k} small variant={s.mouStatus === k ? "primary" : "ghost"} onClick={() => patch({ mouStatus: k })}>{v}</Btn>)}
      </div>

      <SectionCard style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, marginBottom: 10 }}>LOG AN ENGAGEMENT</div>
        <Grid min={140} style={{ marginBottom: 8 }}>
          <Field label="Type"><Select value={eng.type} onChange={e => setEng(x => ({ ...x, type: e.target.value }))}>{meta.engagementTypes.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={eng.date} onChange={e => setEng(x => ({ ...x, date: e.target.value }))} /></Field>
          <Field label="Relationship now"><Select value={eng.relationship} onChange={e => setEng(x => ({ ...x, relationship: e.target.value }))}>{meta.relationship.map(r => <option key={r} value={r}>{REL[r]?.[0] || r}</option>)}</Select></Field>
          <Field label="Next follow-up"><Input type="date" value={eng.nextFollowUp} onChange={e => setEng(x => ({ ...x, nextFollowUp: e.target.value }))} /></Field>
        </Grid>
        <Field label="What happened?" style={{ marginBottom: 8 }}><Textarea value={eng.summary} onChange={e => setEng(x => ({ ...x, summary: e.target.value }))} style={{ minHeight: 60 }} /></Field>
        <Grid min={200} style={{ marginBottom: 10 }}>
          <Field label="Outcome"><Input value={eng.outcome} onChange={e => setEng(x => ({ ...x, outcome: e.target.value }))} /></Field>
          <Field label="Next action"><Input value={eng.nextAction} onChange={e => setEng(x => ({ ...x, nextAction: e.target.value }))} /></Field>
        </Grid>
        <Btn icon={Send} onClick={logEngagement} disabled={!eng.summary.trim()}>Log engagement</Btn>
      </SectionCard>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>ENGAGEMENT HISTORY</div>
      {(s.engagements || []).length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>No engagements logged yet.</div>}
      {(s.engagements || []).map(e => (
        <div key={e.id} style={{ padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12.5, color: C.textMuted }}><Badge color={C.blue}>{e.type}</Badge> {fmtDate(e.at)} · {person(e.by).fullName}</div>
          <div style={{ fontSize: 13.5, color: C.text, marginTop: 4 }}>{e.summary}</div>
          {e.outcome && <div style={{ fontSize: 12.5, color: C.mint, marginTop: 2 }}>→ {e.outcome}</div>}
        </div>
      ))}
    </Modal>
  );
}

export default function Liaison({ param }) {
  const { person, navigate } = useOffice();
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const load = useCallback(() => api("/api/staff/liaison").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <EmptyState>Loading…</EmptyState>;

  const today = new Date().toISOString().slice(0, 10);
  const items = data.stakeholders.filter(s => (!cat || s.category === cat) && (!q || `${s.organisation} ${s.contactPerson}`.toLowerCase().includes(q.toLowerCase())));
  const open = param ? data.stakeholders.find(s => s.id === param) : null;

  return (
    <div>
      <PageHeader title="Liaison Register" sub="Government, regulator, partner and association relationships in one place, with every engagement on record." action={<Btn icon={Plus} onClick={() => setCreating(true)}>Add stakeholder</Btn>} />
      <Grid min={160} style={{ marginBottom: 18 }}>
        <StatCard label="Stakeholders" value={data.stakeholders.length} color={C.blue} />
        <StatCard label="Strong relationships" value={data.stakeholders.filter(s => s.relationship === "strong").length} color={C.mint} />
        <StatCard label="At risk" value={data.stakeholders.filter(s => s.relationship === "at_risk").length} color={C.rose} />
        <StatCard label="MoUs signed" value={data.stakeholders.filter(s => s.mouStatus === "signed").length} color={C.gold} />
        <StatCard label="Follow-ups due" value={data.stakeholders.filter(s => s.nextFollowUp && s.nextFollowUp <= today).length} color={C.amber} />
      </Grid>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search organisations or contacts…" style={{ maxWidth: 320 }} />
        <Select value={cat} onChange={e => setCat(e.target.value)} style={{ maxWidth: 260 }}><option value="">All categories</option>{data.categories.map(c => <option key={c}>{c}</option>)}</Select>
      </div>
      {items.length === 0 && <EmptyState>No stakeholders yet. Add the first organisation you're building a relationship with.</EmptyState>}
      <Grid min={300}>
        {items.map(s => {
          const [rl, rc] = REL[s.relationship] || REL.new;
          const due = s.nextFollowUp && s.nextFollowUp <= today;
          return (
            <SectionCard key={s.id} className="so-lift" style={{ cursor: "pointer", padding: 16, borderColor: due ? `${C.amber}77` : undefined }}>
              <div onClick={() => navigate("liaison", s.id)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && navigate("liaison", s.id)} style={{ fontFamily: font }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.heading }}>{s.organisation}</div>
                  <Badge color={rc}>{rl}</Badge>
                </div>
                <div style={{ fontSize: 12.5, color: C.purple, marginTop: 4 }}>{s.category}</div>
                {s.contactPerson && <div style={{ fontSize: 12.5, color: C.text, marginTop: 6 }}>{s.contactPerson}{s.contactRole ? ` · ${s.contactRole}` : ""}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted, marginTop: 8, flexWrap: "wrap" }}>
                  <Avatar src={person(s.ownerId).avatarDataUrl} name={person(s.ownerId).fullName} size={18} />
                  {s.lastEngagement ? `Last contact ${fmtDate(s.lastEngagement)}` : "No contact yet"}
                  {s.nextFollowUp && <span style={{ color: due ? C.amber : C.textMuted, fontWeight: due ? 700 : 500 }}>· next {fmtDate(s.nextFollowUp)}</span>}
                </div>
              </div>
            </SectionCard>
          );
        })}
      </Grid>
      {creating && <StakeholderForm meta={data} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {open && <StakeholderDetail key={open.id} item={open} meta={data} onClose={() => navigate("liaison")} onChanged={load} />}
    </div>
  );
}
