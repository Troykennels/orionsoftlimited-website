// Client view of a proposal (/q/<code>): read it, download the PDF, accept
// online (typed name) or decline. Accepting goes straight to the payment page.
import { useEffect, useState } from "react";
import { richTextToSafeHtml } from "../lib/richtext.js";

const NAVY = "#0A2540", GOLD = "#C8A850", GOLD_DK = "#8A6A1F", INK = "#0E1726", MUTED = "#5B6778", LINE = "#E2E8F0";
const FONT = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const code = decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[1] || "").toUpperCase();
const fmt = (n, c = "NGN") => `${c === "NGN" ? "₦" : `${c} `}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
const input = { width: "100%", boxSizing: "border-box", border: "1px solid #CBD5E1", borderRadius: 10, padding: "11px 12px", fontSize: 15, fontFamily: FONT, color: INK };
const btn = (primary, disabled) => ({ background: disabled ? "#CBD5E1" : primary ? NAVY : "#fff", color: primary ? "#fff" : NAVY, border: `1px solid ${disabled ? "#CBD5E1" : NAVY}`, borderRadius: 10, padding: "12px 18px", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: disabled ? "not-allowed" : "pointer", textDecoration: "none", display: "inline-block", textAlign: "center" });

export default function QuotePage() {
  const [s, setS] = useState({ loading: true });
  const [f, setF] = useState({ name: "", title: "", agree: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetch(`/api/public/quote?code=${encodeURIComponent(code)}`).then(r => r.json().then(j => (r.ok ? setS({ d: j }) : setS({ error: j.error })))).catch(() => setS({ error: "Couldn't load the proposal. Check your connection." }));
  }, []);

  async function post(body) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/public/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, ...body }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      return j;
    } catch (e) { setErr(e.message); return null; } finally { setBusy(false); }
  }
  async function accept() {
    const j = await post({ action: "accept", ...f });
    if (j) setS(x => ({ d: { ...x.d, proposal: { ...x.d.proposal, status: "accepted", acceptedBy: { name: f.name, at: new Date().toISOString() }, payLink: j.payLink } } }));
  }
  async function decline() {
    const j = await post({ action: "decline", reason });
    if (j) setS(x => ({ d: { ...x.d, proposal: { ...x.d.proposal, status: "declined" } } }));
  }

  const shell = children => (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${NAVY} 0, ${NAVY} 190px, #EEF2F7 190px)`, fontFamily: FONT, padding: "24px 16px 60px", boxSizing: "border-box", color: INK }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16 }}>Orion<span style={{ color: GOLD }}>Soft</span></div>
        <div style={{ background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 20px 50px rgba(10,37,64,0.16)" }}>{children}</div>
        <p style={{ textAlign: "center", fontSize: 12, color: MUTED, marginTop: 16 }}>Orion Soft Limited · RC 9535128</p>
      </div>
    </div>
  );
  if (s.loading) return shell(<p style={{ color: MUTED }}>Loading…</p>);
  if (s.error) return shell(<p style={{ color: MUTED, lineHeight: 1.6 }}>{s.error}</p>);
  const { proposal: p, company } = s.d;
  const cur = p.currency;
  document.title = `${p.number}: ${p.title} | ${company.name}`;

  return shell(
    <>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: GOLD_DK }}>PROPOSAL · {p.number}</div>
      <h1 style={{ fontSize: 23, margin: "6px 0 4px", color: NAVY, lineHeight: 1.25 }}>{p.title}</h1>
      <p style={{ color: MUTED, margin: 0 }}>For {p.client.organisation || p.client.name}{p.preparedBy ? ` · prepared by ${p.preparedBy}` : ""}{p.validUntil ? ` · valid until ${day(p.validUntil)}` : ""} · <a href={`/api/public/quote?code=${encodeURIComponent(code)}&pdf=1`} target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 700 }}>Download PDF</a></p>

      {p.intro && <div style={{ marginTop: 16, fontSize: 15, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: richTextToSafeHtml(p.intro) }} />}

      <h2 style={{ fontSize: 16, color: NAVY, margin: "20px 0 8px" }}>What's included</h2>
      {p.items.map((it, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderTop: `1px solid ${LINE}`, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>{it.name}</strong>{it.qty > 1 ? ` × ${it.qty}` : ""}
            {(it.description || it.recurring !== "One-off") && <div style={{ fontSize: 13.5, color: MUTED }}>{[it.description, it.recurring !== "One-off" ? `Billed ${it.recurring}` : ""].filter(Boolean).join(" · ")}</div>}
          </div>
          <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(it.amount, cur)}</strong>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 10, fontSize: 14.5, display: "grid", gap: 4 }}>
        {(p.totals.discount > 0 || p.totals.vat > 0) && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{fmt(p.totals.subtotal, cur)}</span></div>}
        {p.totals.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#15803D" }}><span>Discount ({p.totals.discountPct}%)</span><span>−{fmt(p.totals.discount, cur)}</span></div>}
        {p.totals.vat > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>VAT ({p.totals.vatPct}%)</span><span>{fmt(p.totals.vat, cur)}</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, fontWeight: 800, color: NAVY, marginTop: 4 }}><span>Total</span><span>{fmt(p.totals.total, cur)}</span></div>
      </div>

      <h2 style={{ fontSize: 16, color: NAVY, margin: "20px 0 8px" }}>How you'll pay</h2>
      {p.schedule.map((x, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: `1px solid ${LINE}`, fontSize: 14.5 }}>
          <span><strong>{x.title}</strong> <span style={{ color: MUTED }}>({x.percent}%, {x.dueDays ? `${x.dueDays} days after acceptance` : "on acceptance"})</span></span>
          <strong>{fmt(x.amount, cur)}</strong>
        </div>
      ))}
      {p.recurring.length > 0 && <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>Then renews automatically: {p.recurring.map(r => `${r.name}, ${fmt(r.amount, cur)} ${r.interval}`).join("; ")}. You'll get the renewal invoice two weeks before each renewal.</p>}
      {p.terms && <><h2 style={{ fontSize: 16, color: NAVY, margin: "20px 0 8px" }}>Terms</h2><div style={{ fontSize: 14, lineHeight: 1.6, color: INK }} dangerouslySetInnerHTML={{ __html: richTextToSafeHtml(p.terms) }} /></>}

      <div style={{ marginTop: 22, padding: 18, borderRadius: 14, background: "#F8FAFC", border: `1px solid ${LINE}` }}>
        {p.status === "accepted" ? (
          <>
            <div style={{ color: "#15803D", fontWeight: 800, fontSize: 17 }}>✓ Accepted{p.acceptedBy ? ` by ${p.acceptedBy.name}` : ""}. Thank you!</div>
            <p style={{ color: MUTED, lineHeight: 1.6 }}>Your payment plan and receipts link have been emailed to you. You can pay the first instalment now.</p>
            {p.payLink && <a href={p.payLink} style={btn(true)}>Go to payment</a>}
          </>
        ) : p.status === "declined" ? (
          <div style={{ color: MUTED }}>You declined this proposal. If anything changes, reply to our email or call {company.phone}.</div>
        ) : p.status === "expired" ? (
          <div style={{ color: MUTED }}>This proposal has expired. Contact {company.email} for an updated one.</div>
        ) : (
          <>
            <h2 style={{ fontSize: 17, color: NAVY, margin: "0 0 10px" }}>Accept this proposal</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <input value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} placeholder="Your full name" aria-label="Your full name" autoComplete="name" style={input} />
              <input value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="Your role (optional), e.g. Medical Director" aria-label="Your role" style={input} />
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: INK, lineHeight: 1.5 }}>
                <input type="checkbox" checked={f.agree} onChange={e => setF(x => ({ ...x, agree: e.target.checked }))} style={{ marginTop: 3, width: 18, height: 18 }} />
                I accept this proposal on behalf of {p.client.organisation || "my organisation"}, including the total of {fmt(p.totals.total, cur)} and the payment schedule above.
              </label>
              <button type="button" disabled={busy || f.name.trim().length < 3 || !f.agree} onClick={accept} style={btn(true, busy || f.name.trim().length < 3 || !f.agree)}>{busy ? "Accepting…" : "Accept proposal"}</button>
              {!declining ? <button type="button" onClick={() => setDeclining(true)} style={{ background: "none", border: "none", color: MUTED, textDecoration: "underline", cursor: "pointer", fontFamily: FONT }}>Not right for you? Tell us why</button> : (
                <div style={{ display: "grid", gap: 8 }}>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="What would need to change? (optional)" aria-label="Reason" style={{ ...input, resize: "vertical" }} />
                  <button type="button" disabled={busy} onClick={decline} style={btn(false, busy)}>Decline proposal</button>
                </div>
              )}
            </div>
          </>
        )}
        {err && <p role="alert" style={{ color: "#B91C1C", marginBottom: 0 }}>{err}</p>}
      </div>
      <p style={{ fontSize: 13, color: MUTED, marginTop: 14 }}>Questions? Email {company.email} or call {company.phone}.</p>
    </>
  );
}
