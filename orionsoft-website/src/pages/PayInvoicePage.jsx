// Client page for paying an invoice (/pay/invoice/<code>). One permanent link
// per invoice: it shows the total, what's been paid and the balance, and takes
// the full balance or any part of it. Every payment lands on this invoice, so
// the client comes back to the same link to pay the rest.
import { useEffect, useState } from "react";

const NAVY = "#0A2540", GOLD = "#C8A850", GOLD_DK = "#8A6A1F", INK = "#0E1726", MUTED = "#5B6778", LINE = "#E2E8F0";
const FONT = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const code = decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[2] || "").toUpperCase();
const reference = new URLSearchParams(window.location.search).get("reference") || "";
const fmt = (n, c = "NGN") => `${c === "NGN" ? "₦" : `${c} `}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const input = { width: "100%", boxSizing: "border-box", border: "1px solid #CBD5E1", borderRadius: 10, padding: "11px 12px", fontSize: 15, fontFamily: FONT, color: INK, background: "#fff" };
const button = disabled => ({ width: "100%", background: disabled ? "#CBD5E1" : NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "13px 18px", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: disabled ? "not-allowed" : "pointer" });

async function fetchInvoice(ref) {
  try {
    const r = await fetch(`/api/public/invoice-pay?code=${encodeURIComponent(code)}${ref ? `&reference=${encodeURIComponent(ref)}` : ""}`);
    const j = await r.json();
    return r.ok ? { data: j } : { error: j.error || "This payment link isn't valid." };
  } catch { return { error: "Couldn't load the invoice. Check your connection and try again." }; }
}

export default function PayInvoicePage() {
  const [s, setS] = useState({ loading: true });
  const [part, setPart] = useState(false);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function apply(res) {
    if (res.error) { setS({ error: res.error }); return; }
    setS({ d: res.data });
    setEmail(e => e || res.data.invoice.email);
    document.title = `Pay invoice ${res.data.invoice.invoiceNumber} | ${res.data.invoice.company.name}`;
  }
  useEffect(() => { fetchInvoice(reference).then(apply); }, []);

  if (s.loading) return <Shell><p style={{ color: MUTED }}>Loading…</p></Shell>;
  if (s.error) return <Shell><h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Payment link</h1><p style={{ color: MUTED, lineHeight: 1.6 }}>{s.error}</p></Shell>;
  const { invoice: inv, payment } = s.d;
  const cur = inv.currency;
  const pct = inv.total ? Math.min(100, Math.round((inv.amountPaid / inv.total) * 100)) : 0;

  async function pay() {
    setErr(""); setBusy(true);
    try {
      const value = part ? Number(amount) : undefined;
      if (part && !(value > 0)) throw new Error("Enter the amount you want to pay now");
      const r = await fetch("/api/public/invoice-pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, amount: value, email }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      window.location.href = j.authorizationUrl;
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Shell>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: GOLD_DK }}>INVOICE · {inv.invoiceNumber}</div>
      <h1 style={{ fontSize: 22, margin: "6px 0 4px", color: NAVY, lineHeight: 1.25 }}>{inv.clientName}</h1>
      <p style={{ color: MUTED, margin: 0 }}>Issued {day(inv.issueDate)}{inv.dueDate ? ` · due ${day(inv.dueDate)}` : ""}</p>

      {payment?.status === "success" && <div role="status" style={{ marginTop: 16, background: "#DCFCE7", color: "#15803D", borderRadius: 12, padding: 14, lineHeight: 1.5 }}>
        <strong>Payment received, thank you.</strong> {fmt(payment.amount, cur)} has been added to this invoice. {inv.balance > 0 ? `The balance is now ${fmt(inv.balance, cur)}; you can pay it here whenever you're ready, all at once or in parts.` : "The invoice is now fully paid."} Your receipt and the updated invoice are on their way to your email.
      </div>}
      {payment && ["pending", "failed"].includes(payment.status) && <div role="status" style={{ marginTop: 16, background: "#FEF3C7", color: "#92400E", borderRadius: 12, padding: 14, lineHeight: 1.5 }}>
        {payment.status === "failed" ? "That payment didn't go through. You can try again below." : "We're still confirming your payment. You don't need to pay again; we'll email your receipt as soon as it's confirmed."}
      </div>}
      {payment?.status === "review" && <div role="status" style={{ marginTop: 16, background: "#E0F2FE", color: "#075985", borderRadius: 12, padding: 14 }}>We've received your payment and our accounts team will confirm it with you shortly.</div>}

      <div style={{ marginTop: 16, border: `1px solid ${LINE}`, borderRadius: 12 }}>
        {inv.items.map((it, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 14px", fontSize: 14, borderTop: i ? `1px solid ${LINE}` : "none" }}><span>{it.description}{Number(it.qty) !== 1 ? ` × ${it.qty}` : ""}</span><span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmt(it.amount, cur)}</span></div>)}
      </div>

      <div style={{ margin: "16px 0", padding: 16, borderRadius: 14, background: "#F8FAFC", border: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 14 }}>
          <span>Paid <strong>{fmt(inv.amountPaid, cur)}</strong> of {fmt(inv.total, cur)}</span>
          <span>Balance <strong style={{ color: inv.balance ? "#B45309" : "#15803D" }}>{fmt(inv.balance, cur)}</strong></span>
        </div>
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, background: LINE, borderRadius: 8, marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, #15803D)` }} />
        </div>
      </div>

      {inv.payable ? <>
        <h2 style={{ fontSize: 16, margin: "0 0 10px", color: INK }}>How much would you like to pay?</h2>
        <div role="radiogroup" style={{ display: "grid", gap: 8 }}>
          {[[false, `The full balance (${fmt(inv.balance, cur)})`], [true, "Part now, the rest later"]].map(([value, label]) => (
            <label key={label} style={{ display: "flex", gap: 10, alignItems: "center", padding: 13, borderRadius: 12, border: `1.5px solid ${part === value ? NAVY : LINE}`, cursor: "pointer", fontSize: 15 }}>
              <input type="radio" name="howmuch" checked={part === value} onChange={() => setPart(value)} style={{ accentColor: NAVY }} /> {label}
            </label>
          ))}
        </div>
        {part && <label style={{ display: "block", marginTop: 12, fontSize: 14, color: MUTED }}>Amount to pay now ({cur})
          <input type="number" inputMode="decimal" min={inv.minimumPayment} max={inv.balance} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`${inv.minimumPayment.toLocaleString()} to ${inv.balance.toLocaleString()}`} style={{ ...input, marginTop: 6 }} />
        </label>}
        <label style={{ display: "block", marginTop: 12, fontSize: 14, color: MUTED }}>Email for your receipt
          <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...input, marginTop: 6 }} />
        </label>
        {err && <p role="alert" style={{ color: "#B91C1C", fontSize: 14, margin: "12px 0 0" }}>{err}</p>}
        <div style={{ marginTop: 14 }}>
          <button type="button" disabled={busy || !inv.payOnline} onClick={pay} style={button(busy || !inv.payOnline)}>{busy ? "Opening secure checkout…" : part ? "Pay this amount" : "Pay full balance"}</button>
        </div>
        {!inv.payOnline && <p style={{ fontSize: 13.5, color: "#92400E" }}>Online payment isn't available right now. Please pay by bank transfer using the details below.</p>}
        <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>Card, bank transfer or USSD, processed securely by Paystack. Each payment is added to this invoice straight away. Keep this link to pay the rest.</p>
      </> : inv.reason && <div role="status" style={{ background: inv.balance <= 0 ? "#DCFCE7" : "#F1F5F9", color: inv.balance <= 0 ? "#15803D" : INK, borderRadius: 12, padding: 16, fontWeight: 700 }}>{inv.reason}</div>}

      {inv.payable && inv.bankDetails && <div style={{ marginTop: 18, padding: 14, borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 14, lineHeight: 1.6 }}>
        <strong>Or pay by bank transfer</strong>
        <div style={{ whiteSpace: "pre-line", color: MUTED }}>{inv.bankDetails}</div>
        <div>Reference: <strong>{inv.invoiceNumber}</strong></div>
      </div>}

      {inv.payments.length > 0 && <div style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 8px", color: INK }}>Payments received</h2>
        {inv.payments.map((p, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${LINE}` }}><span>{day(p.paidAt)}</span><strong>{fmt(p.amount, cur)}</strong></div>)}
      </div>}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${NAVY} 0, ${NAVY} 190px, #EEF2F7 190px)`, fontFamily: FONT, padding: "26px 16px 60px", boxSizing: "border-box", color: INK }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 18 }}>Orion<span style={{ color: GOLD }}>Soft</span></div>
        <div style={{ background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 20px 50px rgba(10,37,64,0.16)" }}>{children}</div>
        <p style={{ textAlign: "center", fontSize: 12, color: MUTED, marginTop: 16 }}>Secure payment · Orion Soft Limited</p>
      </div>
    </div>
  );
}
