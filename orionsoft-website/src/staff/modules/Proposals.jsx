// Proposals: build a quote from the price list, send it as a PDF with an
// online "accept" link; acceptance creates the payment plan automatically.
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Trash2, Send, Copy, Eye, Tag } from "lucide-react";
import { C, font } from "../theme.js";
import { api, copyText } from "../api.js";
import { Btn, Badge, Input, Select, Textarea, Field, Grid, Modal, PageHeader, SectionCard, EmptyState, toast } from "../components.jsx";
import { useOffice } from "../office.js";

const STATUS = { draft: ["Draft", C.textMuted], sent: ["Sent", C.blue], viewed: ["Opened by client", C.amber], accepted: ["Accepted", C.mint], declined: ["Declined", C.rose], expired: ["Expired", C.rose] };
const RECUR = { once: "One-off", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };
const SPLIT_LABEL = { full: "Full payment on acceptance", "50/50": "50% now, 50% in 30 days", "40/40/20": "40 / 40 / 20 over 60 days", "30/30/30/10": "30 / 30 / 30 / 10 over 90 days", custom: "Custom" };
const money = (n, c = "NGN") => `${c === "NGN" ? "₦" : `${c} `}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function calc(f) {
  const subtotal = r2(f.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0));
  const discount = r2(subtotal * (Number(f.discountPct) || 0) / 100);
  const vat = r2((subtotal - discount) * (Number(f.vatPct) || 0) / 100);
  return { subtotal, discount, vat, total: r2(subtotal - discount + vat) };
}

const blankItem = () => ({ name: "", description: "", qty: 1, unitPrice: "", recurring: "once" });

function PriceList({ items: initial, onClose, onSaved }) {
  const [items, setItems] = useState(initial.length ? initial : [blankItem()]);
  const set = (i, k, v) => setItems(x => x.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  async function save() {
    try { const j = await api("/api/staff/proposals", { method: "POST", body: { action: "pricelist", items } }); toast("Price list saved"); onSaved(j.priceList); onClose(); }
    catch (e) { toast(e.message, "err"); }
  }
  return (
    <Modal title="Price list" onClose={onClose} width={860}>
      <p style={{ fontSize: 13, color: C.textMuted, marginTop: 0 }}>Products and services the team can add to proposals with one click. Prices can still be changed on each proposal.</p>
      {items.map((it, i) => (
        <div key={it.id || i} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,2fr) 120px 120px auto", gap: 6, marginBottom: 6 }}>
          <Input value={it.name} onChange={e => set(i, "name", e.target.value)} placeholder="e.g. CareCore licence (per site)" aria-label="Name" />
          <Input value={it.description || ""} onChange={e => set(i, "description", e.target.value)} placeholder="Short description" aria-label="Description" />
          <Input type="number" value={it.unitPrice} onChange={e => set(i, "unitPrice", e.target.value)} placeholder="Price ₦" aria-label="Price" />
          <Select value={it.recurring || "once"} onChange={e => set(i, "recurring", e.target.value)} aria-label="Billing">{Object.entries(RECUR).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Btn small danger icon={Trash2} onClick={() => setItems(x => x.filter((_, j) => j !== i))} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Btn small variant="ghost" icon={Plus} onClick={() => setItems(x => [...x, blankItem()])}>Add item</Btn>
        <Btn small onClick={save}>Save price list</Btn>
      </div>
    </Modal>
  );
}

function Editor({ initial, priceList, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    id: initial.id || "", dealId: initial.dealId || "", title: initial.title || "", client: { name: "", organisation: "", email: "", phone: "", address: "", ...(initial.client || {}) },
    items: initial.items?.length ? initial.items.map(i => ({ ...i })) : [blankItem()], discountPct: initial.discountPct || 0, vatPct: initial.vatPct ?? 0,
    currency: initial.currency || "NGN", split: initial.split || "50/50", customSplit: initial.customSplit?.length ? initial.customSplit : [{ title: "Deposit", percent: 50, dueDays: 0 }, { title: "Balance", percent: 50, dueDays: 30 }],
    validUntil: initial.validUntil || "", intro: initial.intro || "", terms: initial.terms || "", paymentNote: initial.paymentNote || "",
  }));
  const [busy, setBusy] = useState(false);
  const t = calc(f);
  const setC = (k, v) => setF(x => ({ ...x, client: { ...x.client, [k]: v } }));
  const setI = (i, k, v) => setF(x => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  const addFromList = id => { const p = priceList.find(x => x.id === id); if (p) setF(x => ({ ...x, items: [...x.items.filter(i => i.name.trim()), { name: p.name, description: p.description, qty: 1, unitPrice: p.unitPrice, recurring: p.recurring }] })); };
  async function save(andSend) {
    setBusy(true);
    try {
      const j = await api("/api/staff/proposals", { method: "POST", body: f });
      if (andSend) {
        const s = await api("/api/staff/proposals", { method: "POST", body: { action: "send", id: j.proposal.id } });
        toast(s.emailSent ? `Proposal ${s.proposal.number} emailed to ${s.proposal.client.email}` : "Saved, but the email couldn't be sent. Copy the link and send it yourself.");
      } else toast(`Saved ${j.proposal.number}`);
      onSaved(); onClose();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  return (
    <Modal title={f.id ? "Edit proposal" : "New proposal"} onClose={onClose} width={900}>
      <Grid min={200} style={{ marginBottom: 10 }}>
        <Field label="Client contact name"><Input value={f.client.name} onChange={e => setC("name", e.target.value)} /></Field>
        <Field label="Organisation"><Input value={f.client.organisation} onChange={e => setC("organisation", e.target.value)} /></Field>
        <Field label="Email *"><Input type="email" value={f.client.email} onChange={e => setC("email", e.target.value)} /></Field>
        <Field label="Phone"><Input value={f.client.phone} onChange={e => setC("phone", e.target.value)} /></Field>
      </Grid>
      <Field label="Proposal title" style={{ marginBottom: 10 }}><Input value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="e.g. CareCore Hospital Management System for Lekki Medical Centre" /></Field>
      <Field label="Overview (optional)" style={{ marginBottom: 14 }}><Textarea value={f.intro} onChange={e => setF(x => ({ ...x, intro: e.target.value }))} placeholder="What the client needs and what we'll deliver. Plain text is fine; **bold** and - bullet lists work." style={{ minHeight: 80 }} /></Field>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <strong style={{ color: C.heading, fontSize: 14 }}>Items</strong>
        {priceList.length > 0 && <Select value="" onChange={e => addFromList(e.target.value)} style={{ maxWidth: 320 }} aria-label="Add from price list"><option value="">+ Add from price list…</option>{priceList.map(p => <option key={p.id} value={p.id}>{p.name} · {money(p.unitPrice)}{p.recurring !== "once" ? ` ${RECUR[p.recurring].toLowerCase()}` : ""}</option>)}</Select>}
      </div>
      {f.items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) minmax(0,2fr) 70px 120px 115px auto", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <Input value={it.name} onChange={e => setI(i, "name", e.target.value)} placeholder="Item" aria-label="Item" />
          <Input value={it.description || ""} onChange={e => setI(i, "description", e.target.value)} placeholder="Description" aria-label="Description" />
          <Input type="number" min="1" value={it.qty} onChange={e => setI(i, "qty", e.target.value)} aria-label="Quantity" />
          <Input type="number" value={it.unitPrice} onChange={e => setI(i, "unitPrice", e.target.value)} placeholder="Unit price" aria-label="Unit price" />
          <Select value={it.recurring} onChange={e => setI(i, "recurring", e.target.value)} aria-label="Billing">{Object.entries(RECUR).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Btn small danger icon={Trash2} onClick={() => setF(x => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} />
        </div>
      ))}
      <Btn small variant="ghost" icon={Plus} onClick={() => setF(x => ({ ...x, items: [...x.items, blankItem()] }))}>Add item</Btn>
      <p style={{ fontSize: 12, color: C.textMuted, margin: "6px 0 12px" }}>Monthly/yearly items are paid with the first payment, then renew automatically.</p>

      <Grid min={170} style={{ marginBottom: 10 }}>
        <Field label="Discount %"><Input type="number" min="0" max="100" value={f.discountPct} onChange={e => setF(x => ({ ...x, discountPct: e.target.value }))} /></Field>
        <Field label="VAT %"><Select value={String(f.vatPct)} onChange={e => setF(x => ({ ...x, vatPct: Number(e.target.value) }))}><option value="0">No VAT</option><option value="7.5">7.5% VAT</option></Select></Field>
        <Field label="Payment"><Select value={f.split} onChange={e => setF(x => ({ ...x, split: e.target.value }))}>{Object.entries(SPLIT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="Valid until"><Input type="date" value={f.validUntil} onChange={e => setF(x => ({ ...x, validUntil: e.target.value }))} /></Field>
      </Grid>
      {f.split === "custom" && (
        <div style={{ marginBottom: 10 }}>
          {f.customSplit.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 90px 150px auto", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <Input value={p.title} onChange={e => setF(x => ({ ...x, customSplit: x.customSplit.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)) }))} aria-label="Payment name" />
              <Input type="number" value={p.percent} onChange={e => setF(x => ({ ...x, customSplit: x.customSplit.map((y, j) => (j === i ? { ...y, percent: Number(e.target.value) } : y)) }))} aria-label="Percent" />
              <Input type="number" value={p.dueDays} onChange={e => setF(x => ({ ...x, customSplit: x.customSplit.map((y, j) => (j === i ? { ...y, dueDays: Number(e.target.value) } : y)) }))} aria-label="Days after acceptance" title="Days after acceptance" />
              <Btn small danger icon={Trash2} onClick={() => setF(x => ({ ...x, customSplit: x.customSplit.filter((_, j) => j !== i) }))} />
            </div>
          ))}
          <Btn small variant="ghost" icon={Plus} onClick={() => setF(x => ({ ...x, customSplit: [...x.customSplit, { title: "Payment", percent: 0, dueDays: 30 }] }))}>Add payment</Btn>
          <span style={{ fontSize: 12.5, color: Math.abs(f.customSplit.reduce((s, p) => s + Number(p.percent || 0), 0) - 100) < 0.01 ? C.mint : C.rose, marginLeft: 10 }}>Total {f.customSplit.reduce((s, p) => s + Number(p.percent || 0), 0)}% (must be 100%) · days count from acceptance</span>
        </div>
      )}
      <Field label="Terms (optional)" style={{ marginBottom: 12 }}><Textarea value={f.terms} onChange={e => setF(x => ({ ...x, terms: e.target.value }))} placeholder="e.g. Includes 3 months of free support. Hardware not included." style={{ minHeight: 60 }} /></Field>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, fontSize: 13.5, color: C.text, marginBottom: 12 }}>
        Subtotal {money(t.subtotal, f.currency)}{t.discount ? ` · discount −${money(t.discount, f.currency)}` : ""}{t.vat ? ` · VAT ${money(t.vat, f.currency)}` : ""} · <strong style={{ color: C.heading, fontSize: 15 }}>Total {money(t.total, f.currency)}</strong>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn onClick={() => save(true)} icon={Send} disabled={busy || !f.client.email || !(t.total > 0)}>{busy ? "Working…" : "Save & send to client"}</Btn>
        <Btn variant="ghost" onClick={() => save(false)} disabled={busy}>Save draft</Btn>
      </div>
    </Modal>
  );
}

export default function Proposals({ param }) {
  const { navigate } = useOffice();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const load = useCallback(() => api("/api/staff/proposals").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);

  // Opened from a deal: start a proposal for it.
  const [handled, setHandled] = useState("");
  if (param && param !== handled && param.startsWith("deal-")) {
    setHandled(param);
    const dealId = param.slice(5);
    api("/api/staff/pipeline").then(j => {
      const d = (j.deals || []).find(x => x.id === dealId);
      setEditing({ dealId, title: d ? `Proposal for ${d.organisation}` : "", client: d ? { name: d.contactPerson, organisation: d.organisation, email: d.contactEmail, phone: d.contactPhone } : {} });
    }).catch(() => setEditing({ dealId }));
  }

  const stats = useMemo(() => {
    const list = data?.proposals || [];
    const open = list.filter(p => ["sent", "viewed"].includes(p.status));
    return { open: open.length, openValue: open.reduce((s, p) => s + p.totals.total, 0), accepted: list.filter(p => p.status === "accepted").length };
  }, [data]);

  async function act(p, action, msg) {
    try { await api("/api/staff/proposals", { method: "POST", body: { action, id: p.id } }); toast(msg); load(); } catch (e) { toast(e.message, "err"); }
  }
  if (!data) return <EmptyState>Loading…</EmptyState>;
  return (
    <div>
      <PageHeader title="Proposals" sub="Quote from the price list, send a PDF with an online accept link. When the client accepts, their payment plan is created and sent automatically."
        action={<div style={{ display: "flex", gap: 8 }}>
          {data.canEditPrices && <Btn variant="ghost" icon={Tag} onClick={() => setPriceOpen(true)}>Price list</Btn>}
          <Btn icon={Plus} onClick={() => setEditing({})}>New proposal</Btn>
        </div>} />
      <Grid min={180} style={{ marginBottom: 16 }}>
        <SectionCard style={{ padding: 14 }}><div style={{ fontSize: 12, color: C.textMuted }}>Waiting for the client</div><div style={{ fontSize: 22, fontWeight: 800, color: C.blue }}>{stats.open} · {money(stats.openValue)}</div></SectionCard>
        <SectionCard style={{ padding: 14 }}><div style={{ fontSize: 12, color: C.textMuted }}>Accepted</div><div style={{ fontSize: 22, fontWeight: 800, color: C.mint }}>{stats.accepted}</div></SectionCard>
      </Grid>
      <SectionCard>
        {data.proposals.length === 0 && <EmptyState icon={FileText}>No proposals yet. Start one from a deal in the pipeline, or with New proposal.</EmptyState>}
        {data.proposals.map(p => {
          const [label, color] = STATUS[p.status] || STATUS.draft;
          return (
            <div key={p.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontFamily: font }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{p.number} · {p.client.organisation || p.client.name}</div>
                <div style={{ fontSize: 12.5, color: C.textMuted }}>{p.title} · {money(p.totals.total, p.currency)}{p.acceptedBy ? ` · accepted by ${p.acceptedBy.name}${p.contractNumber ? `, plan ${p.contractNumber}` : ""}` : ""}</div>
              </div>
              <Badge color={color}>{label}</Badge>
              <a href={`/api/staff/proposals?pdf=${p.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" icon={Eye}>PDF</Btn></a>
              {!["accepted", "declined"].includes(p.status) && <Btn small variant="ghost" onClick={() => setEditing(p)}>Edit</Btn>}
              {p.status === "draft" && <Btn small icon={Send} onClick={() => act(p, "send", `Proposal ${p.number} sent`)}>Send</Btn>}
              {["sent", "viewed", "expired"].includes(p.status) && <Btn small variant="ghost" icon={Send} onClick={() => act(p, "send", "Sent again")}>Resend</Btn>}
              {p.link && <Btn small variant="ghost" icon={Copy} onClick={() => copyText(p.link).then(ok => toast(ok ? "Link copied. Paste it in WhatsApp or email." : p.link))}>Link</Btn>}
              <Btn small variant="ghost" onClick={() => act(p, "duplicate", "Copied to a new draft")}>Duplicate</Btn>
              {p.status === "draft" && <Btn small danger icon={Trash2} onClick={() => confirm(`Delete draft ${p.number}?`) && act(p, "delete", "Draft deleted")} />}
            </div>
          );
        })}
      </SectionCard>
      {editing && <Editor initial={editing} priceList={data.priceList} onClose={() => { setEditing(null); if (param) navigate("proposals"); }} onSaved={load} />}
      {priceOpen && <PriceList items={data.priceList} onClose={() => setPriceOpen(false)} onSaved={pl => setData(d => ({ ...d, priceList: pl }))} />}
    </div>
  );
}
