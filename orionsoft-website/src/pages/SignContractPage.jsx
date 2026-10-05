import { useState, useEffect, useRef, useCallback } from "react";
import { BRAND } from "../lib/brand.js";
import { richTextToSafeHtml } from "../lib/richtext.js";

// The recipient signs by drawing (mouse, finger or stylus) or by typing their
// name. The canvas is sized to its on-screen width and the device pixel ratio,
// so strokes land exactly under the pointer on any screen.
function SignaturePad({ onChange, borderColor }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const inked = useRef(false);
  const last = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width === Math.round(w * dpr) && canvas.height === Math.round(h * dpr)) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "#0A2540"; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    // Resizing wipes the canvas, so the signature must be drawn again.
    if (inked.current) { inked.current = false; setHasDrawn(false); onChange(null); }
  }, [onChange]);

  useEffect(() => {
    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [setup]);

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function down(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath(); ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = "#0A2540"; ctx.fill();
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const p = pos(e), ctx = canvasRef.current.getContext("2d");
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
    if (!inked.current) { inked.current = true; setHasDrawn(true); }
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    if (inked.current) onChange(exportTrimmed(canvasRef.current));
  }
  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    inked.current = false; setHasDrawn(false); onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef} aria-label="Signature box: draw your signature"
        style={{ background: "#fff", borderRadius: 10, border: `1px solid ${borderColor}`, touchAction: "none", cursor: "crosshair", width: "100%", height: 150, display: "block" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#6B7A96" }}>
        <span>{hasDrawn ? "Signature captured" : "Sign inside the white box"}</span>
        {hasDrawn && <button type="button" onClick={clear} style={{ background: "none", border: "none", color: "#9AA8C0", fontSize: 12.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>Clear and redraw</button>}
      </div>
    </div>
  );
}

// Crops to the ink (plus a margin) so the signature fills its space on the PDF.
function exportTrimmed(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    if (data[(y * width + x) * 4 + 3] > 20) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) return null;
  const pad = 12;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(width, maxX + pad); maxY = Math.min(height, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX; out.height = maxY - minY;
  out.getContext("2d").drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

// Decoded by shared/richDoc.js: headings, alignment, lists, bold/italic/underline.
// The HTML is built from escaped text and our own tags only, so it's safe.
function RichText({ text }) {
  const html = richTextToSafeHtml(text);
  if (!html) return null;
  return <div className="rich-doc" dangerouslySetInnerHTML={{ __html: html }} />;
}

const C = {
  bg: "#060810", card: "#0F1828", inset: "#0B1120", border: "rgba(255,255,255,0.08)",
  heading: "#F2F6FF", text: "#C8D0E0", muted: "#8190AB",
  gold: BRAND.gold, mint: "#10B981", rose: "#F43F5E",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";
const money = (n, cur) => `${cur === "NGN" ? "₦" : `${cur} `}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
const label = { display: "block", fontSize: 12.5, fontWeight: 700, color: C.muted, marginBottom: 6 };
const field = { width: "100%", background: C.inset, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: font, outline: "none", boxSizing: "border-box" };
const section = { fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: C.gold, margin: "22px 0 8px" };

function getParams() {
  const parts = window.location.pathname.split("/").filter(Boolean); // ["sign", ":contractId"]
  return { contractId: decodeURIComponent(parts[1] || ""), token: new URLSearchParams(window.location.search).get("token") || "" };
}

export default function SignContractPage() {
  const { contractId, token } = getParams();
  const [contract, setContract] = useState(null);
  const [payLink, setPayLink] = useState("");
  const linkOk = !!(contractId && token);
  const [error, setError] = useState(linkOk ? "" : "This signing link is missing required information.");
  const [loading, setLoading] = useState(linkOk);
  const [signedByName, setSignedByName] = useState("");
  const [signedByTitle, setSignedByTitle] = useState("");
  const [method, setMethod] = useState("draw");
  const [consent, setConsent] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!linkOk) return;
    fetch(`/api/contracts/sign?contractId=${encodeURIComponent(contractId)}&token=${encodeURIComponent(token)}`)
      .then(r => r.json().then(json => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) { setError(json.error || "This signing link is invalid or has expired."); return; }
        setContract(json.contract);
        setPayLink(json.payLink || "");
        document.title = `Sign ${json.contract.number || "document"} | Orion Soft`;
        setDone(["signed", "active", "completed"].includes(json.contract.status));
      })
      .catch(() => setError("Could not load this document. Please try again."))
      .finally(() => setLoading(false));
  }, [contractId, token, linkOk]);

  const name = signedByName.trim();
  const ready = name.length >= 2 && consent && (method === "type" || !!signatureImage) && !submitting;

  async function submit() {
    if (!ready) return;
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, token, signedByName: name, signedByTitle: signedByTitle.trim(), consent, signatureImageDataUrl: method === "draw" ? signatureImage : null }),
      });
      const json = await r.json();
      if (!r.ok) { setError(json.error || "Could not sign this document."); return; }
      setContract(c => ({ ...c, status: json.contract.status, pdfKey: json.contract.signedPdfKey || c.pdfKey, signedByName: name }));
      setPayLink(json.payLink || "");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const fileUrl = download => `/api/files/download?key=${encodeURIComponent(contract.pdfKey)}&contractId=${encodeURIComponent(contractId)}&token=${encodeURIComponent(token)}${download ? "&download=1" : ""}`;
  const docWord = String(contract?.docLabel || "document").toLowerCase();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", justifyContent: "center", padding: "40px 16px", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 680 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.heading }}>Orion<span style={{ color: C.gold }}>Soft</span></div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Secure document signing</div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "clamp(18px, 5vw, 32px)" }}>
          {loading && <p style={{ color: C.muted, fontSize: 14 }}>Loading document…</p>}

          {!loading && error && !contract && <p role="alert" style={{ color: C.rose, fontSize: 14, lineHeight: 1.6 }}>{error}</p>}

          {!loading && contract && !done && (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>{String(contract.docLabel || "Document").toUpperCase()}{contract.number ? ` · ${contract.number}` : ""}</div>
              <h1 style={{ fontSize: 21, fontWeight: 800, color: C.heading, margin: "6px 0 4px", lineHeight: 1.3 }}>{contract.title}</h1>
              <p style={{ color: C.muted, fontSize: 13.5, margin: 0 }}>
                Between Orion Soft Limited and {contract.organisation || contract.recipientName}
                {contract.effectiveDate ? ` · effective ${day(contract.effectiveDate)}` : ""}
              </p>
              {contract.status === "cancelled" && <p role="alert" style={{ color: C.rose, fontSize: 14, marginTop: 14 }}>This document has been withdrawn and can no longer be signed. Please contact us.</p>}

              {(contract.amount > 0 || contract.scope || contract.deliverables?.length > 0) && (
                <div style={{ background: C.inset, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginTop: 18, color: C.text, fontSize: 14, lineHeight: 1.6 }}>
                  {contract.scope && <><div style={{ ...section, marginTop: 0 }}>SCOPE</div><div style={{ whiteSpace: "pre-wrap" }}>{contract.scope}</div></>}
                  {contract.deliverables?.length > 0 && (
                    <><div style={section}>DELIVERABLES</div><ul style={{ margin: 0, paddingLeft: 20 }}>{contract.deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul></>
                  )}
                  {contract.amount > 0 && (
                    <>
                      <div style={{ ...section, ...(contract.scope || contract.deliverables?.length ? {} : { marginTop: 0 }) }}>FEES AND PAYMENT</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: C.heading, fontSize: 15 }}><span>Total value</span><span>{money(contract.amount, contract.currency)}</span></div>
                      {contract.schedule?.map(m => (
                        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: `1px solid ${C.border}`, marginTop: 6 }}>
                          <span>{m.title}<span style={{ display: "block", color: C.muted, fontSize: 12.5 }}>{m.dueDate ? `Due ${day(m.dueDate)}` : m.trigger}</span></span>
                          <span style={{ whiteSpace: "nowrap" }}>{money(m.amount, contract.currency)}</span>
                        </div>
                      ))}
                      <p style={{ margin: "8px 0 0", fontSize: 12.5, color: C.muted }}>After you sign, you'll get a secure link to pay online or by bank transfer.</p>
                    </>
                  )}
                </div>
              )}

              <div style={section}>TERMS AND CONDITIONS</div>
              <div style={{ color: C.text, fontSize: 13.5, lineHeight: 1.8, background: C.inset, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, maxHeight: 380, overflowY: "auto" }} tabIndex={0} aria-label="Terms and conditions">
                <RichText text={contract.bodyFilled} />
              </div>
              {contract.pdfKey && (
                <p style={{ fontSize: 13, margin: "10px 0 0" }}>
                  <a href={fileUrl(false)} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 700, textDecoration: "none" }}>Read the full {docWord} (PDF) →</a>
                </p>
              )}

              {contract.status !== "cancelled" && (
                <>
                  <div style={{ ...section, marginTop: 28 }}>SIGN</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label htmlFor="sig-name" style={label}>Full name</label>
                      <input id="sig-name" autoComplete="name" value={signedByName} onChange={e => setSignedByName(e.target.value)} placeholder="Your full legal name" style={field} />
                    </div>
                    <div>
                      <label htmlFor="sig-title" style={label}>Title / role <span style={{ fontWeight: 500 }}>(optional)</span></label>
                      <input id="sig-title" autoComplete="organization-title" value={signedByTitle} onChange={e => setSignedByTitle(e.target.value)} placeholder="e.g. Managing Director" style={field} />
                    </div>
                  </div>

                  <div role="tablist" aria-label="How to sign" style={{ display: "inline-flex", background: C.inset, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, marginBottom: 12 }}>
                    {[["draw", "Draw signature"], ["type", "Type signature"]].map(([k, t]) => (
                      <button key={k} type="button" role="tab" aria-selected={method === k} onClick={() => setMethod(k)}
                        style={{ border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer", background: method === k ? C.gold : "transparent", color: method === k ? "#060810" : C.text }}>{t}</button>
                    ))}
                  </div>
                  {method === "draw" ? (
                    <SignaturePad onChange={setSignatureImage} borderColor={C.border} />
                  ) : (
                    <div aria-live="polite" style={{ background: "#fff", borderRadius: 10, height: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", overflow: "hidden" }}>
                      <span style={{ fontFamily: "'Brush Script MT', 'Segoe Script', 'Snell Roundhand', cursive", fontStyle: "italic", fontSize: "clamp(28px, 7vw, 44px)", color: "#0A2540", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || "Your name"}</span>
                    </div>
                  )}

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.text, margin: "20px 0", lineHeight: 1.6, cursor: "pointer" }}>
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, accentColor: C.gold, flexShrink: 0 }} />
                    <span>I have read and agree to this {docWord}, I am authorised to sign it{contract.organisation ? ` for ${contract.organisation}` : ""}, and I agree that my {method === "draw" ? "drawn" : "typed"} signature is my legally binding electronic signature.</span>
                  </label>

                  {error && <p role="alert" style={{ color: C.rose, fontSize: 13, marginBottom: 14 }}>{error}</p>}

                  <button type="button" onClick={submit} disabled={!ready}
                    style={{ width: "100%", padding: 14, background: C.gold, color: "#060810", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, fontFamily: font, cursor: ready ? "pointer" : "not-allowed", opacity: ready ? 1 : 0.55 }}>
                    {submitting ? "Signing…" : `Sign ${docWord}`}
                  </button>
                  {!ready && !submitting && (
                    <p style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 8 }}>
                      {name.length < 2 ? "Enter your full name" : method === "draw" && !signatureImage ? "Draw your signature" : !consent ? "Tick the box to agree" : ""}
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {!loading && contract && done && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.14)", color: C.mint, display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 28, fontWeight: 800 }} aria-hidden="true">✓</div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: C.heading, margin: 0 }}>{contract.title}</h1>
              <p style={{ color: C.muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                Signed{contract.signedByName ? ` by ${contract.signedByName}` : ""}. A copy has been sent to Orion Soft Limited{payLink ? ", and your payment link has been emailed to you" : ""}.
              </p>
              {payLink && (
                <a href={payLink} style={{ display: "inline-block", marginTop: 18, padding: "13px 26px", background: C.gold, color: "#060810", borderRadius: 10, fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
                  Continue to payment →
                </a>
              )}
              {contract.pdfKey && (
                <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
                  <a href={fileUrl(false)} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>View signed {docWord} →</a>
                  <a href={fileUrl(true)} style={{ color: C.gold, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>Download PDF →</a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
