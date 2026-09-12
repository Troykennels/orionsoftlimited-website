import { useState } from "react";
import { C, font } from "./theme.js";

async function serverLogin(email, password) {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, portal: "staff" }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: json.error || `Login failed (${r.status})` };
  return { ok: true, user: json.user };
}

export default function StaffLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const result = await serverLogin(email.trim(), pw);
    if (result.ok) onLogin(result.user);
    else setErr(result.error);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: font }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(79,142,247,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>
      <form onSubmit={handleSubmit} style={{ position: "relative", width: "100%", maxWidth: 400, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 28, marginBottom: 14 }}>👋</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.heading, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Staff Portal</h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>Orion Soft Limited — Team Sign In</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@orionsoftlimited.com"
            autoFocus autoComplete="username"
            style={{ width: "100%", background: C.surface, border: `1px solid ${err ? C.rose : C.border}`, color: C.text, borderRadius: 10, padding: "13px 16px", fontSize: 15, fontFamily: font, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Password</label>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter your password"
            autoComplete="current-password"
            style={{ width: "100%", background: C.surface, border: `1px solid ${err ? C.rose : C.border}`, color: C.text, borderRadius: 10, padding: "13px 16px", fontSize: 15, fontFamily: font, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        {err && <div style={{ fontSize: 13, color: C.rose, marginBottom: 16, lineHeight: 1.5 }}>{err}</div>}
        <button type="submit" disabled={loading || !pw || !email} style={{
          width: "100%", padding: "13px", background: C.blue, color: "#fff", border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 700, fontFamily: font, cursor: loading || !pw || !email ? "not-allowed" : "pointer",
          opacity: loading || !pw || !email ? 0.6 : 1, transition: "opacity 0.2s",
        }}>
          {loading ? "Verifying…" : "Sign In →"}
        </button>
        <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
          Your account was created by an Orion Soft administrator.<br />Contact HR if you've forgotten your password.
        </p>
      </form>
    </div>
  );
}
