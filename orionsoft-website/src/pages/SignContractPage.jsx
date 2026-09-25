import { useState, useEffect, useRef } from "react";
import { BRAND } from "../lib/brand.js";
import { parseRichText } from "../lib/richtext.js";

// Lets the recipient draw their own signature at signing time (rather than
// relying only on a typed name), matching the same canvas pattern used for
// internal signatories in the admin panel.
function SignaturePad({ onChange, borderColor }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function pos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }
  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = pos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = pos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#0A2540";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasDrawn(true);
  }
  function end() {
    drawing.current = false;
    if (hasDrawn) onChange(canvasRef.current.toDataURL("image/png"));
  }
  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef} width={360} height={130}
        style={{ background: "#fff", borderRadius: 10, border: `1px solid ${borderColor}`, touchAction: "none", cursor: "crosshair", width: "100%", maxWidth: 360, display: "block" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      {hasDrawn && (
        <button type="button" onClick={clear} style={{ marginTop: 8, background: "none", border: "none", color: "#6B7A96", fontSize: 12.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
          Clear and redraw
        </button>
      )}
    </div>
  );
}

function RichText({ text }) {
  const paragraphs = parseRichText(text);
  return (
    <>
      {paragraphs.map((para, pi) => (
        <p key={pi} style={{ margin: pi === 0 ? "0 0 12px" : "12px 0" }}>
          {para.lines.map((runs, li) => (
            <span key={li}>
              {li > 0 && <br />}
              {runs.map((run, ri) => {
                let node = run.text;
                if (run.bold) node = <strong key={ri}>{node}</strong>;
                if (run.italic) node = <em key={ri}>{node}</em>;
                return <span key={ri}>{node}</span>;
              })}
            </span>
          ))}
        </p>
      ))}
    </>
  );
}

const C = {
  bg: "#060810", card: "#0F1828", border: "rgba(255,255,255,0.08)",
  heading: "#F2F6FF", text: "#C8D0E0", muted: "#6B7A96",
  gold: BRAND.gold, mint: "#10B981", rose: "#F43F5E",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";

function getParams() {
  const parts = window.location.pathname.split("/").filter(Boolean); // ["sign", ":contractId"]
  const contractId = parts[1] || "";
  const token = new URLSearchParams(window.location.search).get("token") || "";
  return { contractId, token };
}

export default function SignContractPage() {
  const { contractId, token } = getParams();
  const [contract, setContract] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signedByName, setSignedByName] = useState("");
  const [consent, setConsent] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (!contractId || !token) { setError("This signing link is missing required information."); setLoading(false); return; }
    fetch(`/api/contracts/sign?contractId=${encodeURIComponent(contractId)}&token=${encodeURIComponent(token)}`)
      .then(r => r.json().then(json => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) { setError(json.error || "This signing link is invalid or has expired."); return; }
        setContract(json.contract);
        if (json.contract.status !== "sent") setDone(json.contract.status === "signed" || json.contract.status === "active" || json.contract.status === "completed");
      })
      .catch(() => setError("Could not load this document. Please try again."))
      .finally(() => setLoading(false));
  }, [contractId, token]);

  async function payNow() {
    setPaying(true);
    setPayError("");
    try {
      const r = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, token }),
      });
      const json = await r.json();
      if (!r.ok) { setPayError(json.error || "Could not start payment."); return; }
      window.location.href = json.authorizationUrl;
    } catch {
      setPayError("Network error — please try again.");
    } finally {
      setPaying(false);
    }
  }

  async function submit() {
    if (!signedByName.trim() || !consent || !signatureImage) return;
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, token, signedByName: signedByName.trim(), consent, signatureImageDataUrl: signatureImage }),
      });
      const json = await r.json();
      if (!r.ok) { setError(json.error || "Could not sign this document."); return; }
      setContract(c => ({ ...c, status: json.contract.status, pdfKey: json.contract.signedPdfKey || c.pdfKey }));
      setDone(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", justifyContent: "center", padding: "48px 20px" }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.heading }}>Orion<span style={{ color: C.gold }}>Soft</span></div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Document Signing</div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
          {loading && <p style={{ color: C.muted, fontSize: 14 }}>Loading document…</p>}

          {!loading && error && !contract && (
            <p style={{ color: C.rose, fontSize: 14, lineHeight: 1.6 }}>{error}</p>
          )}

          {!loading && contract && !done && (
            <>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.heading, marginTop: 0 }}>{contract.title}</h1>
              <div style={{ color: C.text, fontSize: 13.5, lineHeight: 1.8, background: "#0B1120", border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginTop: 12, marginBottom: 22, maxHeight: 360, overflowY: "auto" }}>
                <RichText text={contract.bodyFilled} />
              </div>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Type your full name to sign</label>
              <input
                value={signedByName} onChange={e => setSignedByName(e.target.value)} placeholder="Full name"
                style={{ width: "100%", background: "#0B1120", border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "12px 14px", fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box", marginBottom: 20 }}
              />

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Draw your signature</label>
              <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>Use your mouse or finger to sign in the box below. This is what appears on the document.</p>
              <SignaturePad onChange={setSignatureImage} borderColor={C.border} />

              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: C.text, margin: "20px 0", lineHeight: 1.6 }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
                I have read and agree to the terms of this document, and understand that my typed name and drawn signature above constitute my electronic signature.
              </label>

              {error && <p style={{ color: C.rose, fontSize: 13, marginBottom: 14 }}>{error}</p>}

              <button
                type="button" onClick={submit} disabled={submitting || !signedByName.trim() || !consent || !signatureImage}
                style={{
                  width: "100%", padding: "13px", background: C.gold, color: "#060810", border: "none", borderRadius: 10,
                  fontSize: 15, fontWeight: 700, fontFamily: font,
                  cursor: submitting || !signedByName.trim() || !consent || !signatureImage ? "not-allowed" : "pointer",
                  opacity: submitting || !signedByName.trim() || !consent || !signatureImage ? 0.6 : 1,
                }}
              >
                {submitting ? "Signing…" : "Sign Document"}
              </button>
            </>
          )}

          {!loading && done && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: C.heading }}>Document signed</h1>
              <p style={{ color: C.muted, fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>
                Thank you — this document has been signed and a copy has been sent to Orion Soft Limited.
              </p>
              {contract?.pdfKey && (
                <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                  <a
                    href={`/api/files/download?key=${encodeURIComponent(contract.pdfKey)}&contractId=${encodeURIComponent(contractId)}&token=${encodeURIComponent(token)}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: C.gold, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}
                  >
                    View document →
                  </a>
                  <a
                    href={`/api/files/download?key=${encodeURIComponent(contract.pdfKey)}&contractId=${encodeURIComponent(contractId)}&token=${encodeURIComponent(token)}&download=1`}
                    style={{ color: C.gold, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}
                  >
                    Download PDF →
                  </a>
                </div>
              )}
              {contract?.amount > 0 && (
                <div style={{ marginTop: 24 }}>
                  <button
                    type="button" onClick={payNow} disabled={paying}
                    style={{ padding: "12px 28px", background: C.gold, color: "#060810", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: font, cursor: paying ? "not-allowed" : "pointer", opacity: paying ? 0.6 : 1 }}
                  >
                    {paying ? "Redirecting…" : `Pay ${contract.currency} ${Number(contract.amount).toLocaleString()} now →`}
                  </button>
                  {payError && <p style={{ color: C.rose, fontSize: 12.5, marginTop: 10 }}>{payError}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
