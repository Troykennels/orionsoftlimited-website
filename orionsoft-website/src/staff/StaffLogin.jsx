import { useEffect, useRef, useState } from "react";
import { C, font } from "./theme.js";
import { api } from "./api.js";
import { InAppBanner } from "./DeviceHelp.jsx";

// Loads Google Identity Services once and resolves with window.google.
let gisPromise = null;
export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true;
      s.onload = () => resolve(window.google);
      s.onerror = () => { gisPromise = null; reject(new Error("Couldn't load Google sign-in")); };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

let clientIdPromise = null;
export function getGoogleClientId() {
  if (!clientIdPromise) clientIdPromise = api("/api/auth/config").then(j => j.googleClientId || "").catch(() => "");
  return clientIdPromise;
}

export default function StaffLogin({ onLogin, notice }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState(notice || "");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleBtn = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clientId = await getGoogleClientId();
      if (!clientId || cancelled) return;
      try {
        const google = await loadGoogleIdentity();
        if (cancelled) return;
        google.accounts.id.initialize({
          client_id: clientId,
          // Returning staff who've used Google here before are signed straight
          // in, without clicking or typing a password.
          auto_select: true,
          cancel_on_tap_outside: false,
          itp_support: true,
          use_fedcm_for_prompt: true,
          callback: async ({ credential }) => {
            setLoading(true); setErr("");
            try {
              const r = await api("/api/auth/google", { method: "POST", body: { credential } });
              onLogin(r.user);
            } catch (e) {
              setErr(e.message);
              google.accounts.id.disableAutoSelect();
            } finally { setLoading(false); }
          },
        });
        if (googleBtn.current) {
          google.accounts.id.renderButton(googleBtn.current, { theme: "filled_black", size: "large", text: "continue_with", shape: "pill", width: 320, logo_alignment: "left" });
        }
        google.accounts.id.prompt();
        setGoogleReady(true);
      } catch { /* Google unavailable: password sign-in still works */ }
    })();
    return () => { cancelled = true; };
  }, [onLogin]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const r = await api("/api/auth/login", { method: "POST", body: { email: email.trim(), password: pw, portal: "staff", remember } });
      onLogin(r.user);
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  }

  const inputStyle = { width: "100%", background: C.surface, border: `1px solid ${err ? C.rose : C.borderStrong}`, color: C.text, borderRadius: 10, padding: "13px 16px", fontSize: 15, fontFamily: font, outline: "none", boxSizing: "border-box" };

  return (
    <div className="so-login" style={{ fontFamily: font }}>
      <LoginArt />
      <div className="so-login-form">
      <form onSubmit={handleSubmit} style={{ position: "relative", width: "100%", maxWidth: 410 }}>
        <InAppBanner />
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>STAFF OFFICE</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.heading, letterSpacing: "-0.03em", margin: "8px 0 0" }}>{greeting()}, welcome back.</h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>Your team, your tasks and your wins, all in one place. Sign in to start your day.</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", minHeight: googleReady ? 44 : 0 }}>
          <div ref={googleBtn} />
        </div>
        {googleReady && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: C.textMuted, fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} /> or use your password <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="so-email" style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Work email</label>
          <input id="so-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@orionsoftlimited.com" autoComplete="username" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="so-pw" style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Password</label>
          <input id="so-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter your password" autoComplete="current-password" style={inputStyle} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text, marginBottom: 18, cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          Keep me signed in on this device for 30 days
        </label>
        {err && <div role="alert" style={{ fontSize: 13, color: C.rose, marginBottom: 14, lineHeight: 1.5 }}>{err}</div>}
        <button type="submit" disabled={loading || !pw || !email} style={{
          width: "100%", padding: 13, background: C.gold, color: "#060810", border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 800, fontFamily: font, cursor: loading || !pw || !email ? "not-allowed" : "pointer",
          opacity: loading || !pw || !email ? 0.6 : 1,
        }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
          Your account is created by Orion Soft HR. Google sign-in works with your work email,
          or with any Google account you've linked from your profile.
        </p>
      </form>
      </div>
    </div>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function LagosClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  return (
    <div>
      <div style={{ fontSize: 44, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {now.toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6 }}>
        {now.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" })} · Lagos
      </div>
    </div>
  );
}

function LoginArt() {
  const points = [
    ["Office feed", "Celebrate wins, give kudos, share progress"],
    ["Messages & meetings", "Team channels and one-click video rooms"],
    ["Goals & advocacy", "Track progress and grow your social reach"],
  ];
  return (
    <div className="so-login-art" style={{ backgroundImage: "url(/assets/cloud-infrastructure-team.jpg)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(6,8,16,0.55) 0%, rgba(10,37,64,0.72) 55%, rgba(6,8,16,0.94) 100%)" }} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "34px 40px", gap: 30 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Orion<span style={{ color: C.gold }}>Soft</span></div>
        <div>
          <LagosClock />
          <div className="so-login-points" style={{ marginTop: 34, display: "grid", gap: 12, maxWidth: 420 }}>
            {points.map(([t, d]) => (
              <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(6,8,16,0.45)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 14px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, marginTop: 6, flexShrink: 0 }} />
                <div><div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{t}</div><div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12.5, marginTop: 2 }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
