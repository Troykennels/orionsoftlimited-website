// Public page opened by scanning a staff ID card's QR code. Shows whether the
// card is genuine and the holder is current, authorised staff.
import { useEffect, useState } from "react";

const NAVY = "#0A2540", GOLD = "#C8A850";
const FONT = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const code = decodeURIComponent(window.location.pathname.split("/").filter(Boolean)[2] || "");
const day = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—");

const STATE = {
  active:   { title: "Verified: current staff member", color: "#15803D", bg: "#DCFCE7", icon: "✓" },
  pending:  { title: "Not yet authorised", color: "#B45309", bg: "#FEF3C7", icon: "!", note: "This card has not been signed and authorised by Orion Soft yet, so it is not valid for identification." },
  expired:  { title: "Card expired", color: "#B91C1C", bg: "#FEE2E2", icon: "✕", note: "This card has passed its expiry date. Ask the holder for their current card." },
  inactive: { title: "Not a current staff member", color: "#B91C1C", bg: "#FEE2E2", icon: "✕", note: "This person is not currently active at Orion Soft. Do not accept this card as identification." },
};

export default function VerifyStaff() {
  const [s, setS] = useState({ loading: true });
  useEffect(() => {
    document.title = "Verify staff card | Orion Soft Limited";
    const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex"; document.head.appendChild(m);
    fetch(`/api/public/verify-staff?code=${encodeURIComponent(code)}`).then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => setS(ok ? { r: j } : { error: j.error || "This card could not be verified." }))
      .catch(() => setS({ error: "Couldn't check the card. Check your connection and try again." }));
  }, []);
  const checkedAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const r = s.r, st = r ? STATE[r.state] || STATE.inactive : null;

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${NAVY} 0, ${NAVY} 200px, #EEF2F7 200px)`, fontFamily: FONT, padding: "28px 16px 60px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Orion<span style={{ color: GOLD }}>Soft</span></div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: "#C9D6E8", marginBottom: 20 }}>STAFF CARD VERIFICATION</div>
        <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 20px 50px rgba(10,37,64,0.18)", color: "#0E1726" }}>
          {s.loading && <p style={{ margin: 0, color: "#5B6778" }}>Checking the card…</p>}
          {s.error && (
            <div role="alert">
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FEE2E2", color: "#B91C1C", borderRadius: 12, padding: "12px 14px", fontWeight: 800 }}>✕ Not a valid Orion Soft staff card</div>
              <p style={{ color: "#4B5563", lineHeight: 1.6, marginBottom: 0 }}>{s.error} Do not accept it as identification. To confirm someone's employment, contact Orion Soft directly.</p>
            </div>
          )}
          {r && (
            <>
              <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, background: st.bg, color: st.color, borderRadius: 12, padding: "12px 14px", fontWeight: 800, fontSize: 15 }}>
                <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: "50%", background: st.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{st.icon}</span>
                {st.title}
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", margin: "20px 0" }}>
                {r.avatarDataUrl
                  ? <img src={r.avatarDataUrl} alt={`Photo of ${r.fullName}`} style={{ width: 84, height: 100, objectFit: "cover", borderRadius: 10, border: `2px solid ${GOLD}` }} />
                  : <div style={{ width: 84, height: 100, borderRadius: 10, background: NAVY, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800 }}>{r.fullName.split(/\s+/).map(w => w[0]).slice(0, 2).join("")}</div>}
                <div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: NAVY }}>{r.fullName}</div>
                  <div style={{ fontSize: 14, color: "#8A6A1F", fontWeight: 700, marginTop: 2 }}>{r.title}</div>
                  {r.department && <div style={{ fontSize: 13.5, color: "#5B6778" }}>{r.department}</div>}
                </div>
              </div>
              <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0, fontSize: 14 }}>
                <dt style={{ color: "#5B6778" }}>Staff number</dt><dd style={{ margin: 0, fontWeight: 700 }}>{r.employeeNumber}</dd>
                <dt style={{ color: "#5B6778" }}>Company</dt><dd style={{ margin: 0, fontWeight: 700 }}>{r.companyName}</dd>
                <dt style={{ color: "#5B6778" }}>Valid until</dt><dd style={{ margin: 0, fontWeight: 700 }}>{day(r.expiresAt)}</dd>
                {r.authorizedAt && <><dt style={{ color: "#5B6778" }}>Authorised</dt><dd style={{ margin: 0, fontWeight: 700 }}>{day(r.authorizedAt)}</dd></>}
              </dl>
              {st.note && <p style={{ color: "#4B5563", lineHeight: 1.6, marginBottom: 0 }}>{st.note}</p>}
              <p style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 0, marginTop: 16 }}>Check that the photo matches the person holding the card. Checked {checkedAt}.</p>
            </>
          )}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#6B7280", marginTop: 18 }}>Orion Soft Limited · orionsoftlimited.com</p>
      </div>
    </div>
  );
}
