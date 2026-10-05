// Turn two-step sign-in on or off (authenticator app). Used on the admin's
// My Account page (portal="admin") and the staff profile (portal="staff").
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { C, font } from "./theme.js";
import { Btn, Input, SectionCard, SectionTitle, Badge, toast } from "./components.jsx";

async function call(body, portal) {
  const r = await fetch(`/api/auth/2fa?portal=${portal}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, portal }) } : undefined);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}

export default function TwoStepSetup({ portal = "staff" }) {
  const [state, setState] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [codes, setCodes] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => call(null, portal).then(setState).catch(() => setState({ enabled: false })), [portal]);
  useEffect(() => { load(); }, [load]);

  const run = async fn => { setBusy(true); try { await fn(); } catch (e) { toast(e.message, "err"); } finally { setBusy(false); } };
  const start = () => run(async () => { setSetup(await call({ action: "setup" }, portal)); setCode(""); });
  const enable = () => run(async () => { const j = await call({ action: "enable", code }, portal); setCodes(j.recoveryCodes); setSetup(null); load(); toast("Two-step sign-in is on"); });
  const disable = () => run(async () => { await call({ action: "disable", code, password: pw }, portal); setCode(""); setPw(""); load(); toast("Two-step sign-in is off"); });

  if (!state) return null;
  return (
    <SectionCard style={{ fontFamily: font }}>
      <SectionTitle sub="After your password, you'll also type a 6-digit code from an authenticator app on your phone (Google Authenticator, Microsoft Authenticator or Authy). Stops anyone who learns your password.">
        <ShieldCheck size={16} style={{ verticalAlign: -3, marginRight: 6 }} aria-hidden="true" />Two-step sign-in {state.enabled ? <Badge color={C.mint}>on</Badge> : <Badge color={C.amber}>off</Badge>}
      </SectionTitle>

      {codes && (
        <div style={{ background: C.surface, border: `1px solid ${C.gold}66`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.heading, marginBottom: 6 }}>Save these recovery codes now</div>
          <p style={{ fontSize: 12.5, color: C.text, margin: "0 0 8px" }}>Each one signs you in once if you lose your phone. They won't be shown again.</p>
          <code style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6, fontSize: 14, color: C.goldLight }}>{codes.map(c => <span key={c}>{c}</span>)}</code>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn small variant="ghost" onClick={() => navigator.clipboard?.writeText(codes.join("\n")).then(() => toast("Copied"))}>Copy</Btn>
            <Btn small onClick={() => setCodes(null)}>I've saved them</Btn>
          </div>
        </div>
      )}

      {!state.enabled && !setup && <Btn small onClick={start} disabled={busy}>Turn on two-step sign-in</Btn>}

      {setup && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <img src={setup.qr} alt="QR code to scan with your authenticator app" width={180} height={180} style={{ background: "#fff", borderRadius: 10, padding: 6 }} />
          <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            <ol style={{ margin: "0 0 10px", paddingLeft: 18 }}>
              <li>Open your authenticator app and tap <strong>+</strong> → <strong>Scan a QR code</strong>.</li>
              <li>On the same phone? Copy this key instead: <code style={{ color: C.goldLight, wordBreak: "break-all" }}>{setup.secret}</code></li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" aria-label="Code from the app" style={{ maxWidth: 140, letterSpacing: "0.2em" }} />
              <Btn small onClick={enable} disabled={busy || code.length !== 6}>Turn on</Btn>
              <Btn small variant="ghost" onClick={() => setSetup(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {state.enabled && (
        <div>
          <p style={{ fontSize: 12.5, color: C.textMuted, margin: "0 0 8px" }}>{state.recoveryLeft} recovery code{state.recoveryLeft === 1 ? "" : "s"} left. To turn it off, enter your password and a current code.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" aria-label="Password" autoComplete="current-password" style={{ maxWidth: 200 }} />
            <Input value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 11))} placeholder="Code" aria-label="Code" autoComplete="one-time-code" style={{ maxWidth: 140 }} />
            <Btn small variant="ghost" onClick={disable} disabled={busy || !pw || code.length < 6}>Turn off</Btn>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
