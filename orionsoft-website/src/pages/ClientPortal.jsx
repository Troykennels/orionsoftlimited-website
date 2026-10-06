// Client portal (/client): clients sign in with an emailed link and see their
// payment plans and contracts (with what's due next and the pay link), their
// invoices, receipts, and support tickets.
import { useCallback, useEffect, useState } from "react";

const NAVY = "#0A2540", GOLD = "#C8A850", GOLD_DK = "#8A6A1F", INK = "#0E1726", MUTED = "#5B6778", LINE = "#E2E8F0";
const FONT = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const fmt = (n, c = "NGN") => `${c === "NGN" ? "₦" : `${c} `}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const input = { width: "100%", boxSizing: "border-box", border: "1px solid #CBD5E1", borderRadius: 10, padding: "11px 12px", fontSize: 15, fontFamily: FONT, color: INK, background: "#fff" };
const btn = (primary, disabled) => ({ background: disabled ? "#CBD5E1" : primary ? NAVY : "#fff", color: primary ? "#fff" : NAVY, border: `1px solid ${disabled ? "#CBD5E1" : NAVY}`, borderRadius: 10, padding: "11px 16px", fontWeight: 800, fontSize: 14.5, fontFamily: FONT, cursor: disabled ? "not-allowed" : "pointer", textDecoration: "none", display: "inline-block", textAlign: "center" });
const pill = (label, fg, bg) => <span style={{ background: bg, color: fg, fontWeight: 800, borderRadius: 20, padding: "2px 9px", fontSize: 12 }}>{label}</span>;
const STATUS = { paid: ["Paid", "#15803D", "#DCFCE7"], part_paid: ["Part-paid", "#B45309", "#FEF3C7"], partially_paid: ["Part-paid", "#B45309", "#FEF3C7"], overdue: ["Overdue", "#B91C1C", "#FEE2E2"], unpaid: ["Due", "#475569", "#F1F5F9"], sent: ["Due", "#475569", "#F1F5F9"], void: ["Cancelled", "#64748B", "#F1F5F9"] };
const pdfUrl = ref => `/api/client/portal?pdf=${encodeURIComponent(ref)}`;

async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || "Something went wrong"); e.status = r.status; throw e; }
  return j;
}

function Shell({ children, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${NAVY} 0, ${NAVY} 170px, #EEF2F7 170px)`, fontFamily: FONT, padding: "22px 16px 60px", boxSizing: "border-box", color: INK }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Orion<span style={{ color: GOLD }}>Soft</span> <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Client portal</span></div>
          {onLogout && <button type="button" onClick={onLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.35)", color: "#fff", borderRadius: 8, padding: "6px 12px", fontFamily: FONT, cursor: "pointer" }}>Sign out</button>}
        </div>
        {children}
        <p style={{ textAlign: "center", fontSize: 12, color: MUTED, marginTop: 18 }}>Orion Soft Limited · orionsoftlimited@gmail.com · 0816 957 7059</p>
      </div>
    </div>
  );
}
const Card = ({ children, style }) => <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 14px 40px rgba(10,37,64,0.10)", marginBottom: 16, ...style }}>{children}</div>;

function SignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({});
  async function send(e) {
    e.preventDefault();
    setState({ busy: true });
    try { const j = await api("/api/client/auth", { email }); setState({ done: j.message }); }
    catch (err) { setState({ err: err.message }); }
  }
  return (
    <Shell>
      <Card style={{ maxWidth: 460, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 6px", color: NAVY }}>Sign in</h1>
        <p style={{ color: MUTED, margin: "0 0 16px", lineHeight: 1.6 }}>Enter the email address we use for you. We'll email you a secure link; no password needed.</p>
        {state.done ? <p role="status" style={{ background: "#DCFCE7", color: "#15803D", borderRadius: 10, padding: 14, fontWeight: 700, lineHeight: 1.5, margin: 0 }}>{state.done}</p> : (
          <form onSubmit={send} style={{ display: "grid", gap: 12 }}>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" aria-label="Email address" autoComplete="email" style={input} />
            <button type="submit" disabled={state.busy} style={btn(true, state.busy)}>{state.busy ? "Sending…" : "Email me a sign-in link"}</button>
            {state.err && <p role="alert" style={{ color: "#B91C1C", margin: 0 }}>{state.err}</p>}
          </form>
        )}
      </Card>
    </Shell>
  );
}

function Tickets({ tickets, reload }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ subject: "", message: "", urgent: false });
  const [reply, setReply] = useState({});
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  async function create() {
    setBusy(true); setMsg("");
    try { await api("/api/client/portal", { action: "ticket", ...f }); setF({ subject: "", message: "", urgent: false }); setOpen(false); setMsg("Thanks, we've got your request and will reply by email."); reload(); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function send(t) {
    try { await api("/api/client/portal", { action: "reply", id: t.id, message: reply[t.id] }); setReply(r => ({ ...r, [t.id]: "" })); reload(); } catch (e) { setMsg(e.message); }
  }
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 17, margin: 0, color: NAVY }}>Support</h2>
        <button type="button" onClick={() => setOpen(o => !o)} style={btn(!open)}>{open ? "Cancel" : "Ask for help"}</button>
      </div>
      {open && (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input value={f.subject} onChange={e => setF(x => ({ ...x, subject: e.target.value }))} placeholder="What do you need help with?" aria-label="Subject" style={input} />
          <textarea value={f.message} onChange={e => setF(x => ({ ...x, message: e.target.value }))} rows={5} placeholder="Tell us what's happening. Include any error messages or screenshots links." aria-label="Message" style={{ ...input, resize: "vertical" }} />
          <label style={{ fontSize: 14, color: MUTED, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={f.urgent} onChange={e => setF(x => ({ ...x, urgent: e.target.checked }))} /> It's urgent (the system is down or we can't work)</label>
          <button type="button" disabled={busy || !f.subject.trim() || !f.message.trim()} onClick={create} style={btn(true, busy || !f.subject.trim() || !f.message.trim())}>{busy ? "Sending…" : "Send to support"}</button>
        </div>
      )}
      {msg && <p role="status" style={{ color: "#15803D", margin: "10px 0 0" }}>{msg}</p>}
      {tickets.length === 0 && !open && <p style={{ color: MUTED, margin: "10px 0 0" }}>No support requests yet.</p>}
      {tickets.map(t => (
        <div key={t.id} style={{ borderTop: `1px solid ${LINE}`, marginTop: 12, paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>{t.subject}</strong>
            {pill(t.status === "resolved" || t.status === "closed" ? "Resolved" : t.status === "in_progress" ? "In progress" : "Open", t.status === "resolved" || t.status === "closed" ? "#15803D" : "#B45309", t.status === "resolved" || t.status === "closed" ? "#DCFCE7" : "#FEF3C7")}
          </div>
          <div style={{ fontSize: 13.5, color: MUTED, whiteSpace: "pre-wrap", marginTop: 4 }}>{t.description}</div>
          {t.comments.map((c, i) => (
            <div key={i} style={{ marginTop: 8, padding: 10, borderRadius: 10, background: c.fromClient ? "#F8FAFC" : "#FFF8E6", fontSize: 14, whiteSpace: "pre-wrap" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: c.fromClient ? MUTED : GOLD_DK }}>{c.fromClient ? "You" : `${c.author} · Orion Soft`} · {day(c.at)}</div>{c.text}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input value={reply[t.id] || ""} onChange={e => setReply(r => ({ ...r, [t.id]: e.target.value }))} placeholder="Write a reply…" aria-label="Reply" style={{ ...input, flex: 1 }} />
            <button type="button" disabled={!String(reply[t.id] || "").trim()} onClick={() => send(t)} style={btn(true, !String(reply[t.id] || "").trim())}>Send</button>
          </div>
        </div>
      ))}
    </Card>
  );
}

export default function ClientPortal() {
  const [state, setState] = useState({ loading: true });
  const load = useCallback(() => api("/api/client/portal").then(d => setState({ d })).catch(e => setState(e.status === 401 ? { signIn: true } : { err: e.message })), []);

  useEffect(() => {
    document.title = "Client portal | Orion Soft";
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      api("/api/client/auth", { action: "verify", token })
        .then(() => { window.history.replaceState({}, "", "/client"); load(); })
        .catch(e => setState({ signIn: true, linkErr: e.message }));
    } else load();
  }, [load]);

  async function logout() { await api("/api/client/auth", { action: "logout" }).catch(() => {}); setState({ signIn: true }); }

  if (state.loading) return <Shell><Card>Loading…</Card></Shell>;
  if (state.signIn) return <>{state.linkErr && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: 10, textAlign: "center", fontFamily: FONT }}>{state.linkErr}</div>}<SignIn /></>;
  if (state.err) return <Shell><Card>{state.err}</Card></Shell>;
  const { d } = state;

  return (
    <Shell onLogout={logout}>
      <Card>
        <div style={{ fontSize: 13, color: MUTED }}>Welcome{d.client.name ? `, ${d.client.name.split(" ")[0]}` : ""}</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8 }}>
          <div><div style={{ fontSize: 12, fontWeight: 800, color: GOLD_DK, letterSpacing: "0.08em" }}>OUTSTANDING</div><div style={{ fontSize: 24, fontWeight: 800, color: d.summary.outstanding ? "#B45309" : "#15803D" }}>{fmt(d.summary.outstanding)}</div></div>
          <div><div style={{ fontSize: 12, fontWeight: 800, color: GOLD_DK, letterSpacing: "0.08em" }}>DOCUMENTS</div><div style={{ fontSize: 24, fontWeight: 800, color: NAVY }}>{d.summary.documents}</div></div>
          <div><div style={{ fontSize: 12, fontWeight: 800, color: GOLD_DK, letterSpacing: "0.08em" }}>OPEN REQUESTS</div><div style={{ fontSize: 24, fontWeight: 800, color: NAVY }}>{d.summary.openTickets}</div></div>
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: 17, margin: "0 0 10px", color: NAVY }}>Payment plans & contracts</h2>
        {d.documents.length === 0 && <p style={{ color: MUTED, margin: 0 }}>Nothing here yet.</p>}
        {d.documents.map(doc => (
          <div key={doc.id} style={{ borderTop: `1px solid ${LINE}`, padding: "12px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>{doc.title}</strong>
              <span style={{ fontSize: 13, color: MUTED }}>{doc.number}</span>
            </div>
            {doc.amount > 0 && <div style={{ fontSize: 14, marginTop: 4 }}>Paid <strong>{fmt(doc.paid, doc.currency)}</strong> of {fmt(doc.amount, doc.currency)} · Balance <strong style={{ color: doc.balance ? "#B45309" : "#15803D" }}>{fmt(doc.balance, doc.currency)}</strong></div>}
            {doc.next && <div style={{ fontSize: 14, marginTop: 4, color: doc.next.overdue ? "#B91C1C" : INK }}>{doc.next.overdue ? "Overdue" : "Next"}: {doc.next.title}, {fmt(doc.next.balance, doc.currency)}{doc.next.dueDate ? ` · due ${day(doc.next.dueDate)}` : ""}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {doc.payLink && doc.balance > 0 && <a href={doc.payLink} style={btn(true)}>Pay now</a>}
              {doc.hasPdf && <a href={pdfUrl(`contract:${doc.id}`)} target="_blank" rel="noreferrer" style={btn(false)}>View document</a>}
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h2 style={{ fontSize: 17, margin: "0 0 10px", color: NAVY }}>Invoices</h2>
        {d.invoices.length === 0 && <p style={{ color: MUTED, margin: 0 }}>No invoices yet.</p>}
        {d.invoices.map(i => {
          const [l, fg, bg] = STATUS[i.overdue ? "overdue" : i.status] || STATUS.sent;
          return (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderTop: `1px solid ${LINE}`, padding: "10px 0", flexWrap: "wrap" }}>
              <span><strong>{i.invoiceNumber}</strong> <span style={{ fontSize: 13, color: MUTED }}>{i.dueDate ? `due ${day(i.dueDate)}` : day(i.issueDate)}{i.contractNumber ? ` · ${i.contractNumber}` : ""}</span></span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>{fmt(i.total, i.currency)} {pill(l, fg, bg)} <a href={pdfUrl(`invoice:${i.id}`)} target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 700 }}>PDF</a></span>
            </div>
          );
        })}
      </Card>

      <Card>
        <h2 style={{ fontSize: 17, margin: "0 0 10px", color: NAVY }}>Receipts</h2>
        {d.receipts.length === 0 && <p style={{ color: MUTED, margin: 0 }}>No payments yet.</p>}
        {d.receipts.map(r => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: `1px solid ${LINE}`, padding: "10px 0", flexWrap: "wrap" }}>
            <span><strong>{r.receiptNumber}</strong> <span style={{ fontSize: 13, color: MUTED }}>{day(r.paidAt)} · {r.contractNumber}</span></span>
            <span>{fmt(r.amount, r.currency)} · <a href={pdfUrl(`receipt:${r.id}`)} target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 700 }}>Receipt PDF</a></span>
          </div>
        ))}
      </Card>

      <Tickets tickets={d.tickets} reload={load} />
    </Shell>
  );
}
