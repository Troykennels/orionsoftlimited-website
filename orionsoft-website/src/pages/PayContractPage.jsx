// Client payment page (/p/<code>, or the older /pay/contract/<id>?token=…).
// One permanent link per payment plan or contract: it always shows what's due
// next, the client's own account number to transfer into, every item with its
// status, and their receipts. Pay online or by transfer.
import { useEffect, useState } from "react";

const NAVY = "#0A2540", GOLD = "#C8A850", GOLD_DK = "#8A6A1F", INK = "#0E1726", MUTED = "#5B6778", LINE = "#E2E8F0";
const FONT = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const parts = window.location.pathname.split("/").filter(Boolean);
const code = parts[0] === "p" ? decodeURIComponent(parts[1] || "").toUpperCase() : "";
const contractId = code ? "" : decodeURIComponent(parts[2] || "");
const token = new URLSearchParams(window.location.search).get("token") || "";
const auth = code ? `code=${encodeURIComponent(code)}` : `contractId=${encodeURIComponent(contractId)}&token=${encodeURIComponent(token)}`;
const fmt = (n, c = "NGN") => `${c === "NGN" ? "₦" : `${c} `}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const fileUrl = (key, download) => `/api/files/download?key=${encodeURIComponent(key)}&${auth}${download ? "&download=1" : ""}`;
const STATUS = { paid: ["Paid", "#15803D", "#DCFCE7"], part_paid: ["Part-paid", "#B45309", "#FEF3C7"], overdue: ["Overdue", "#B91C1C", "#FEE2E2"], unpaid: ["Due", "#475569", "#F1F5F9"] };

const input = { width: "100%", boxSizing: "border-box", border: `1px solid #CBD5E1`, borderRadius: 10, padding: "11px 12px", fontSize: 15, fontFamily: FONT, color: INK, background: "#fff" };
const button = (primary, disabled) => ({ background: disabled ? "#CBD5E1" : primary ? NAVY : "#fff", color: primary ? "#fff" : NAVY, border: `1px solid ${disabled ? "#CBD5E1" : NAVY}`, borderRadius: 10, padding: "12px 18px", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: disabled ? "not-allowed" : "pointer" });

async function fetchPayPage() {
  try {
    const r = await fetch(`/api/contracts/pay?${auth}`);
    const j = await r.json();
    return r.ok ? { data: j } : { error: j.error || "This payment link isn't valid." };
  } catch { return { error: "Couldn't load the payment page. Check your connection and try again." }; }
}

export default function PayContractPage() {
  const [s, setS] = useState({ loading: true });
  const [choice, setChoice] = useState(""); // milestone id | "other" | "balance"
  const [other, setOther] = useState("");
  const [mode, setMode] = useState(""); // "" | "bank"
  const [bank, setBank] = useState({ bankReference: "", payerName: "", transferDate: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  function apply(res) {
    if (res.error) { setS({ error: res.error }); return; }
    const j = res.data;
    setS({ d: j });
    document.title = `Pay ${j.contract.number} | ${j.company.name}`;
    const firstDue = j.summary.schedule.find(m => m.balance > 0);
    setChoice(c => c || (firstDue ? firstDue.id : "balance"));
  }
  const load = () => fetchPayPage().then(apply);
  useEffect(() => { fetchPayPage().then(apply); }, []);

  if (s.loading) return <Shell><p style={{ color: MUTED }}>Loading…</p></Shell>;
  if (s.error) return <Shell><h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Payment link</h1><p style={{ color: MUTED, lineHeight: 1.6 }}>{s.error}</p></Shell>;
  const { contract: c, summary: sum, payOnline, bankDetails, company, next, dva, link } = s.d;
  const docWord = c.kind === "plan" ? "payment plan" : "contract";
  const overdue = next?.payStatus === "overdue";
  const cur = c.currency;
  const milestone = sum.schedule.find(m => m.id === choice);
  const amount = choice === "other" ? Number(other) || 0 : choice === "balance" ? sum.balance : milestone ? milestone.balance : 0;
  const pct = sum.total ? Math.min(100, Math.round((sum.paid / sum.total) * 100)) : 0;

  async function post(body) {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const r = await fetch("/api/contracts/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId, token, code, amount, milestoneId: milestone ? milestone.id : null, ...body }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      return j;
    } catch (e) { setErr(e.message); return null; } finally { setBusy(false); }
  }
  async function payOnlineNow() {
    const j = await post({ action: "paystack" });
    if (j?.authorizationUrl) window.location.href = j.authorizationUrl;
  }
  async function reportTransfer() {
    const j = await post({ action: "bank_notice", ...bank });
    if (j) { setMsg(j.message); setMode(""); load(); }
  }
  const copy = t => { try { navigator.clipboard.writeText(t).then(() => setMsg("Copied.")); } catch { /* not allowed */ } };

  return (
    <Shell>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: GOLD_DK }}>PAYMENT · {c.number}</div>
      <h1 style={{ fontSize: 22, margin: "6px 0 4px", color: NAVY, lineHeight: 1.25 }}>{c.title}</h1>
      <p style={{ color: MUTED, margin: 0 }}>For {c.organisation || c.clientName}{c.pdfKey && <> · <a href={fileUrl(c.pdfKey)} target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 700 }}>View {docWord}</a></>}</p>

      {next && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: overdue ? "#FEF2F2" : "#FFF8E6", border: `1.5px solid ${overdue ? "#FCA5A5" : "#F1D48B"}` }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", color: overdue ? "#B91C1C" : GOLD_DK }}>{overdue ? "OVERDUE" : "NEXT PAYMENT"}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <strong style={{ fontSize: 17, color: INK }}>{next.title}</strong>
            <strong style={{ fontSize: 22, color: NAVY, fontVariantNumeric: "tabular-nums" }}>{fmt(next.balance, c.currency)}</strong>
          </div>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>{next.dueDate ? `Due ${day(next.dueDate)}` : next.trigger || "Due now"}</div>
        </div>
      )}

      {dva && sum.balance > 0 && (
        <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: NAVY, color: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", color: GOLD }}>YOUR ACCOUNT NUMBER FOR THIS PLAN</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}>{dva.accountNumber}</span>
            <button type="button" onClick={() => copy(dva.accountNumber)} style={{ background: GOLD, color: NAVY, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>Copy</button>
          </div>
          <div style={{ fontSize: 14.5, marginTop: 2 }}>{dva.bankName} · {dva.accountName}</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", margin: "8px 0 0", lineHeight: 1.5 }}>Transfer from any bank app, whenever each payment is due. It's matched to your next item automatically and your receipt is emailed to you; no need to tell us.</p>
        </div>
      )}

      <div style={{ margin: "18px 0", padding: 16, borderRadius: 14, background: "#F8FAFC", border: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 14 }}>
          <span>Paid <strong>{fmt(sum.paid, cur)}</strong> of {fmt(sum.total, cur)}</span>
          <span>Balance <strong style={{ color: sum.balance ? "#B45309" : "#15803D" }}>{fmt(sum.balance, cur)}</strong></span>
        </div>
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, background: LINE, borderRadius: 8, marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, #15803D)` }} />
        </div>
      </div>

      {sum.balance <= 0 ? (
        <div role="status" style={{ background: "#DCFCE7", color: "#15803D", borderRadius: 12, padding: 16, fontWeight: 800 }}>This {docWord} is fully paid. Thank you.</div>
      ) : (
        <>
          <h2 style={{ fontSize: 16, margin: "0 0 10px", color: INK }}>What are you paying for?</h2>
          <div role="radiogroup" style={{ display: "grid", gap: 8 }}>
            {sum.schedule.map(m => {
              const [label, fg, bg] = STATUS[m.payStatus];
              const disabled = m.balance <= 0;
              return (
                <label key={m.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 12, border: `1.5px solid ${choice === m.id ? NAVY : LINE}`, background: disabled ? "#F8FAFC" : "#fff", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1 }}>
                  <input type="radio" name="pay-choice" checked={choice === m.id} disabled={disabled} onChange={() => setChoice(m.id)} style={{ marginTop: 3, accentColor: NAVY }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ color: INK }}>{m.title}</strong>
                      <strong style={{ color: INK, fontVariantNumeric: "tabular-nums" }}>{fmt(m.balance > 0 ? m.balance : m.amount, cur)}</strong>
                    </span>
                    {m.description && <span style={{ display: "block", fontSize: 13.5, color: MUTED, marginTop: 2 }}>{m.description}</span>}
                    <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, fontSize: 12.5, color: MUTED, flexWrap: "wrap" }}>
                      <span style={{ background: bg, color: fg, fontWeight: 800, borderRadius: 20, padding: "2px 9px" }}>{label}</span>
                      {m.dueDate ? `Due ${day(m.dueDate)}` : m.trigger}
                      {m.payStatus === "part_paid" && ` · ${fmt(m.paid, cur)} paid of ${fmt(m.amount, cur)}`}
                    </span>
                  </span>
                </label>
              );
            })}
            {sum.schedule.length === 0 && (
              <label style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, border: `1.5px solid ${choice === "balance" ? NAVY : LINE}`, cursor: "pointer" }}>
                <input type="radio" name="pay-choice" checked={choice === "balance"} onChange={() => setChoice("balance")} style={{ accentColor: NAVY }} />
                <span style={{ flex: 1 }}><strong>Full balance</strong> <span style={{ float: "right", fontWeight: 800 }}>{fmt(sum.balance, cur)}</span></span>
              </label>
            )}
            {c.allowPartial && (
              <label style={{ display: "grid", gap: 8, padding: 14, borderRadius: 12, border: `1.5px solid ${choice === "other" ? NAVY : LINE}`, cursor: "pointer" }}>
                <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input type="radio" name="pay-choice" checked={choice === "other"} onChange={() => setChoice("other")} style={{ accentColor: NAVY }} />
                  <strong>Another amount</strong><span style={{ color: MUTED, fontSize: 13.5 }}>(up to {fmt(sum.balance, cur)})</span>
                </span>
                {choice === "other" && <input type="number" min="100" max={sum.balance} step="0.01" inputMode="decimal" value={other} onChange={e => setOther(e.target.value)} placeholder="Amount" aria-label="Amount to pay" style={input} />}
              </label>
            )}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            {payOnline && <button type="button" disabled={busy || !(amount > 0)} onClick={payOnlineNow} style={button(true, busy || !(amount > 0))}>{busy ? "Starting payment…" : `Pay ${amount > 0 ? fmt(amount, cur) : ""} online`}</button>}
            <button type="button" disabled={!(amount > 0)} onClick={() => setMode(m => (m === "bank" ? "" : "bank"))} style={button(!payOnline, !(amount > 0))}>{payOnline ? "Pay by bank transfer instead" : `Pay ${amount > 0 ? fmt(amount, cur) : ""} by bank transfer`}</button>
          </div>

          {mode === "bank" && (
            <div style={{ marginTop: 14, padding: 16, borderRadius: 14, border: `1px solid ${LINE}`, background: "#F8FAFC", display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: GOLD_DK, marginBottom: 6 }}>PAY TO</div>
                {bankDetails
                  ? <pre style={{ margin: 0, fontFamily: FONT, fontSize: 14.5, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{bankDetails}</pre>
                  : <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>Contact {company.email} or {company.phone} for our bank details.</p>}
                <p style={{ margin: "8px 0 0", fontSize: 14 }}>Amount: <strong>{fmt(amount, cur)}</strong> · Reference: <strong>{c.number}</strong> <button type="button" onClick={() => copy(c.number)} style={{ border: "none", background: "none", color: NAVY, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Copy</button></p>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>After paying, tell us so we can confirm it:</div>
              <input value={bank.bankReference} onChange={e => setBank(b => ({ ...b, bankReference: e.target.value }))} placeholder="Transfer reference / session ID" aria-label="Transfer reference" style={input} />
              <input value={bank.payerName} onChange={e => setBank(b => ({ ...b, payerName: e.target.value }))} placeholder="Name on the paying account" aria-label="Name on the paying account" style={input} />
              <input type="date" value={bank.transferDate} onChange={e => setBank(b => ({ ...b, transferDate: e.target.value }))} aria-label="Date of transfer" style={input} />
              <button type="button" disabled={busy} onClick={reportTransfer} style={button(true, busy)}>{busy ? "Sending…" : "I've made this transfer"}</button>
            </div>
          )}
        </>
      )}
      {err && <p role="alert" style={{ color: "#B91C1C", fontSize: 14, marginTop: 12 }}>{err}</p>}
      {link && sum.balance > 0 && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#F8FAFC", border: `1px solid ${LINE}`, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>
          Keep this page: the same link works for every payment until the {docWord} is complete.{" "}
          <button type="button" onClick={() => copy(link)} style={{ border: "none", background: "none", color: NAVY, fontWeight: 800, cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: FONT }}>Copy link</button>
        </div>
      )}
      {msg && <p role="status" style={{ color: "#15803D", fontSize: 14, marginTop: 12 }}>{msg}</p>}

      {(sum.receipts.length > 0 || sum.pending.length > 0) && (
        <div style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 15, margin: "0 0 8px", color: INK }}>Payments</h2>
          {sum.receipts.map(r => (
            <div key={r.receiptNumber} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${LINE}`, flexWrap: "wrap" }}>
              <span>{r.receiptNumber} · {day(r.paidAt)}{r.pdfKey && <> · <a href={fileUrl(r.pdfKey, true)} style={{ color: NAVY, fontWeight: 700 }}>Receipt PDF</a></>}</span>
              <strong>{fmt(r.amount, cur)}</strong>
            </div>
          ))}
          {sum.pending.map((p, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${LINE}`, color: MUTED }}><span>Bank transfer awaiting confirmation · {day(p.createdAt)}</span><span>{fmt(p.amount, cur)}</span></div>)}
          <p style={{ fontSize: 12.5, color: MUTED }}>Receipts are emailed to you as each payment is confirmed.</p>
        </div>
      )}
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
