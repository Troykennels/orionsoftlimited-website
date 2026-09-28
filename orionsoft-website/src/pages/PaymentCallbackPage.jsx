import { useState, useEffect } from "react";

import { BRAND } from "../lib/brand.js";
const C = {
  bg: "#060810", card: "#0F1828", border: "rgba(255,255,255,0.08)",
  heading: "#F2F6FF", muted: "#6B7A96", gold: BRAND.gold, mint: "#10B981", rose: "#F43F5E",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";

export default function PaymentCallbackPage() {
  const hasReference = !!new URLSearchParams(window.location.search).get("reference");
  const [status, setStatus] = useState(hasReference ? "checking" : "error");
  const [error, setError] = useState(hasReference ? "" : "Missing payment reference.");
  const [receipt, setReceipt] = useState("");
  const q = new URLSearchParams(window.location.search);
  const backLink = q.get("contract") && q.get("token") ? `/pay/contract/${encodeURIComponent(q.get("contract"))}?token=${encodeURIComponent(q.get("token"))}` : "";

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) return;
    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then(r => r.json().then(json => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) { setStatus("error"); setError(json.error || "Could not verify payment."); return; }
        setStatus(json.status === "success" ? "success" : json.status === "amount_mismatch" ? "mismatch" : json.status === "failed" || json.status === "abandoned" ? "failed" : "pending");
        setReceipt(json.payment?.receiptNumber || "");
      })
      .catch(() => { setStatus("error"); setError("Network error verifying payment."); });
  }, []);

  const icon = status === "success" ? "✅" : status === "pending" ? "⏳" : status === "checking" ? "…" : "⚠️";
  const title = status === "success" ? "Payment successful"
    : status === "pending" ? "Payment pending"
    : status === "failed" ? "Payment not completed"
    : status === "mismatch" ? "We need to check this payment"
    : status === "error" ? "Something went wrong"
    : "Verifying your payment…";
  const message = status === "success" ? `Thank you. Your payment has been confirmed${receipt ? ` (receipt ${receipt})` : ""} and the receipt has been emailed to you.`
    : status === "failed" ? "The payment wasn't completed and you haven't been charged. You can try again from the payment page."
    : status === "mismatch" ? "The amount charged doesn't match what was requested. We'll review it and contact you. Please don't pay again."
    : status === "pending" ? "We haven't received confirmation yet. This can take a minute — refresh shortly, or check your email for a receipt."
    : status === "error" ? error
    : "Please wait while we confirm your payment with Paystack.";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 440, width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: C.heading, margin: "0 0 10px" }}>{title}</h1>
        <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.7 }}>{message}</p>
        {backLink && status !== "checking" && (
          <a href={backLink} style={{ display: "inline-block", marginTop: 14, padding: "11px 22px", background: C.gold, color: "#060810", borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
            {status === "success" ? "View payments and receipts" : "Back to payment page"}
          </a>
        )}
      </div>
    </div>
  );
}
