import { useState, useEffect } from "react";

const C = {
  bg: "#060810", card: "#0F1828", border: "rgba(255,255,255,0.08)",
  heading: "#F2F6FF", muted: "#6B7A96", gold: "#C8A850", mint: "#10B981", rose: "#F43F5E",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";

export default function PaymentCallbackPage() {
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) { setStatus("error"); setError("Missing payment reference."); return; }
    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then(r => r.json().then(json => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) { setStatus("error"); setError(json.error || "Could not verify payment."); return; }
        setStatus(json.status === "success" ? "success" : "pending");
      })
      .catch(() => { setStatus("error"); setError("Network error verifying payment."); });
  }, []);

  const icon = status === "success" ? "✅" : status === "pending" ? "⏳" : status === "error" ? "⚠️" : "…";
  const title = status === "success" ? "Payment successful"
    : status === "pending" ? "Payment pending"
    : status === "error" ? "Something went wrong"
    : "Verifying your payment…";
  const message = status === "success" ? "Thank you — your payment has been confirmed. A receipt has been sent to your email."
    : status === "pending" ? "We haven't received confirmation yet. This can take a minute — refresh shortly, or check your email for a receipt."
    : status === "error" ? error
    : "Please wait while we confirm your payment with Paystack.";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 440, width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: C.heading, margin: "0 0 10px" }}>{title}</h1>
        <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.7 }}>{message}</p>
      </div>
    </div>
  );
}
