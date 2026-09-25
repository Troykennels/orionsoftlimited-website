// Public page a client opens to confirm (or deny) that an Orion Soft staff
// member visited them. No login. The browser's Staff Office device id (only
// present on staff phones) is sent so self-confirmations can be detected.
import { useEffect, useState } from "react";
import { C, font } from "../staff/theme.js";
import "../staff/staff.css";

const token = decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[1] || "");
function staffDeviceId() { try { return localStorage.getItem("so_device_id") || ""; } catch { return ""; } }

export default function VisitConfirm() {
  const [state, setState] = useState({ loading: true });
  const [answer, setAnswer] = useState("");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [where, setWhere] = useState({ s: "idle" }); // client's optional location

  // Optional: the client's phone records where the meeting is happening,
  // which verifies the visit even when the staff phone had no signal.
  function shareLocation() {
    if (!navigator.geolocation) { setWhere({ s: "err", msg: "This browser can't share location. You can still submit." }); return; }
    setWhere({ s: "busy" });
    navigator.geolocation.getCurrentPosition(
      p => setWhere({ s: "ok", geo: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: new Date(p.timestamp || Date.now()).toISOString() } }),
      () => setWhere({ s: "err", msg: "Location wasn't shared. That's fine, you can still submit." }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 },
    );
  }

  useEffect(() => {
    document.title = "Confirm a visit | Orion Soft Limited";
    fetch(`/api/public/visit-confirm?t=${encodeURIComponent(token)}`).then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => setState(ok ? { visit: j.visit } : { error: j.error || "This link is not valid." }))
      .catch(() => setState({ error: "Couldn't load this page. Check your connection and try again." }));
  }, []);

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch("/api/public/visit-confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, answer, name, rating, comment, deviceId: staffDeviceId(), geo: answer === "yes" ? where.geo || null : null }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't save your answer");
      setState({ visit: j.visit, done: true });
    } catch (e) { setState(s => ({ ...s, formError: e.message })); } finally { setBusy(false); }
  }

  const v = state.visit;
  const when = v ? new Date(v.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
  const input = { width: "100%", boxSizing: "border-box", background: "#fff", border: "1px solid #d6dbe4", borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: font, color: "#111827" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0A2540 0%, #0A2540 220px, #F4F6FA 220px)", fontFamily: font, padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 22 }}>Orion<span style={{ color: C.gold }}>Soft</span></div>
        <div style={{ background: "#fff", borderRadius: 18, padding: 26, boxShadow: "0 20px 50px rgba(10,37,64,0.18)", color: "#1f2937" }}>
          {state.loading && <p>Loading…</p>}
          {state.error && <><h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Link not valid</h1><p style={{ color: "#4b5563" }}>{state.error}</p></>}
          {v && state.done && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44 }}>{v.status === "confirmed" ? "✅" : "🙏"}</div>
              <h1 style={{ fontSize: 22, margin: "8px 0" }}>Thank you!</h1>
              <p style={{ color: "#4b5563", lineHeight: 1.6 }}>{v.status === "confirmed" ? "Your confirmation helps us serve you better." : "Thank you for letting us know. Our management team will follow up."}</p>
            </div>
          )}
          {v && !state.done && v.status !== "pending" && (
            <div style={{ textAlign: "center" }}><h1 style={{ fontSize: 20 }}>Already answered</h1><p style={{ color: "#4b5563" }}>This visit was already {v.status === "confirmed" ? "confirmed" : "reported"}. Thank you.</p></div>
          )}
          {v && !state.done && v.status === "pending" && (
            <>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
                {v.staffPhoto ? <img src={v.staffPhoto} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#0A2540", color: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22 }}>{v.staffName[0]}</div>}
                <div><div style={{ fontWeight: 800, fontSize: 17 }}>{v.staffName}</div><div style={{ color: "#6b7280", fontSize: 13.5 }}>{v.staffTitle} · Orion Soft Limited</div></div>
              </div>
              <h1 style={{ fontSize: 21, margin: "0 0 8px", lineHeight: 1.3 }}>Did {v.staffName.split(" ")[0]} visit {v.organisation}?</h1>
              <p style={{ color: "#4b5563", margin: "0 0 18px", lineHeight: 1.6 }}>Recorded on {when}{v.purpose ? ` for: ${v.purpose}` : ""}.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[["yes", "Yes, they visited", "#10B981"], ["no", "No, they didn't", "#F43F5E"]].map(([k, l, col]) => (
                  <button key={k} type="button" onClick={() => setAnswer(k)} aria-pressed={answer === k} style={{ padding: "14px 10px", borderRadius: 12, border: `2px solid ${answer === k ? col : "#d6dbe4"}`, background: answer === k ? `${col}14` : "#fff", color: answer === k ? col : "#374151", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: font }}>{l}</button>
                ))}
              </div>
              {answer && (
                <>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Your name</label>
                  <input value={name} onChange={e => setName(e.target.value)} style={{ ...input, marginBottom: 12 }} />
                  {answer === "yes" && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>How was the visit?</div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)} style={{ fontSize: 28, background: "none", border: "none", cursor: "pointer", color: n <= rating ? "#F59E0B" : "#d1d5db", padding: 0 }}>★</button>)}</div>
                    </>
                  )}
                  {answer === "yes" && (
                    <div style={{ background: "#F4F6FA", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Are you with {v.staffName.split(" ")[0]} right now? (optional)</div>
                      <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 8, lineHeight: 1.5 }}>Sharing your location once confirms where the meeting took place. It's used only to verify this visit.</div>
                      {where.s === "ok" ? <div style={{ fontSize: 13.5, color: "#10B981", fontWeight: 700 }}>📍 Location added (±{Math.round(where.geo.accuracy)}m)</div>
                        : <button type="button" disabled={where.s === "busy"} onClick={shareLocation} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #0A2540", background: "#fff", color: "#0A2540", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: font }}>{where.s === "busy" ? "Finding location…" : "📍 Share my location"}</button>}
                      {where.s === "err" && <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 6 }}>{where.msg}</div>}
                    </div>
                  )}
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{answer === "yes" ? "Anything to add? (optional)" : "What happened? (optional)"}</label>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ ...input, marginBottom: 14, resize: "vertical" }} />
                  {state.formError && <p style={{ color: "#F43F5E", fontSize: 13.5 }}>{state.formError}</p>}
                  <button type="button" disabled={busy} onClick={submit} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "#0A2540", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: font, opacity: busy ? 0.6 : 1 }}>{busy ? "Sending…" : "Submit"}</button>
                </>
              )}
            </>
          )}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", marginTop: 18 }}>Orion Soft Limited · orionsoftlimited.com</p>
      </div>
    </div>
  );
}
