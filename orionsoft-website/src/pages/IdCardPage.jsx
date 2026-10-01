// Staff ID card: front and back at real card size (CR80, 54 × 85.6 mm,
// portrait), for viewing and printing. /id-card shows the signed-in staff
// member's own card; /id-card?employee=<id> is the admin view, which can
// also sign the cards and reissue one.
import { useEffect, useMemo, useRef, useState } from "react";

const NAVY = "#0A2540", NAVY2 = "#0E3358", GOLD = "#C8A850", GOLD_LT = "#E8C96A", GOLD_DK = "#8A6A1F", INK = "#0E1726", MUTED = "#5B6778";
const FONT = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const W = 54, H = 85.6; // mm

const fmtMonth = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—");
const fmtDay = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const initials = n => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");

// Long names get a smaller size so they always fit on two lines at most.
function nameSize(name) {
  const n = String(name || "").length;
  return n <= 16 ? 10.6 : n <= 22 ? 9.4 : n <= 28 ? 8.4 : 7.4;
}

// Fine guilloche lines (like banknotes) that are hard to reproduce cleanly.
function Guilloche({ color, opacity, id }) {
  const paths = useMemo(() => {
    const out = [];
    for (let k = 0; k < 14; k++) {
      let d = "";
      for (let x = 0; x <= 54; x += 0.6) {
        const y = 6 + k * 6.2 + Math.sin((x / 54) * Math.PI * 4 + k * 0.7) * 2.2 + Math.sin((x / 54) * Math.PI * 9 + k) * 0.6;
        d += `${x === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
      }
      out.push(d);
    }
    return out;
  }, []);
  return (
    <svg aria-hidden="true" viewBox="0 0 54 85.6" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity }} id={id}>
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth="0.12" />)}
    </svg>
  );
}

function OrionMark({ size = 6, color = GOLD }) {
  return (
    <svg viewBox="0 0 64 64" style={{ width: `${size}mm`, height: `${size}mm`, flexShrink: 0 }} aria-hidden="true">
      <circle cx="32" cy="32" r="24" fill="none" stroke={color} strokeWidth="4" />
      <circle cx="32" cy="32" r="14" fill="none" stroke={color} strokeWidth="2.8" />
      <circle cx="32" cy="32" r="4.4" fill={color} />
    </svg>
  );
}

function useQr(text) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    if (!text) return undefined;
    import("qrcode").then(QR => QR.toDataURL(text, { errorCorrectionLevel: "M", margin: 0, width: 360, color: { dark: NAVY, light: "#FFFFFF" } }))
      .then(u => { if (live) setSrc(u); }).catch(() => {});
    return () => { live = false; };
  }, [text]);
  return src;
}

// Code 128 barcode of the staff number, drawn to an image so it keeps its
// exact printed size (the library sets its own pixel size on SVGs).
function Barcode({ value }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    if (!value) return undefined;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      const c = document.createElement("canvas");
      try {
        JsBarcode(c, value, { format: "CODE128", displayValue: false, margin: 0, height: 120, width: 4, lineColor: INK, background: "#FFFFFF" });
        if (live) setSrc(c.toDataURL("image/png"));
      } catch { /* not encodable */ }
    });
    return () => { live = false; };
  }, [value]);
  return src
    ? <img src={src} alt={`Barcode ${value}`} style={{ width: "36mm", height: "6.5mm", display: "block", margin: "0 auto", imageRendering: "pixelated" }} />
    : <div style={{ width: "36mm", height: "6.5mm", margin: "0 auto" }} />;
}

const face = { position: "relative", width: `${W}mm`, height: `${H}mm`, overflow: "hidden", borderRadius: "3.2mm", background: "#fff", fontFamily: FONT, color: INK, boxSizing: "border-box", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

export function IdCardFront({ data }) {
  const { employee: e, card, company } = data;
  const qr = useQr(card.verifyUrl);
  const size = nameSize(e.fullName);
  const inactive = e.status !== "active";
  return (
    <div className="idc-face" style={face} data-face="front">
      <Guilloche color={GOLD} opacity={0.22} id="g-front" />
      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "27mm", background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 70%, #123E68 100%)`, overflow: "hidden" }}>
        <Guilloche color="#FFFFFF" opacity={0.08} id="g-head" />
        <div style={{ position: "absolute", right: "-6mm", top: "-4mm", width: "22mm", height: "40mm", background: `linear-gradient(180deg, ${GOLD_LT}, ${GOLD})`, transform: "rotate(28deg)", opacity: 0.9 }} />
        <div style={{ position: "absolute", right: "-1mm", top: "-4mm", width: "3mm", height: "40mm", background: NAVY, transform: "rotate(28deg)", opacity: 0.55 }} />
        <div style={{ position: "absolute", left: "4mm", top: "4mm", display: "flex", alignItems: "center", gap: "1.6mm" }}>
          <OrionMark size={6.2} />
          <div>
            <div style={{ fontSize: "11pt", fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1, color: "#fff" }}>Orion<span style={{ color: GOLD_LT }}>Soft</span></div>
            <div style={{ fontSize: "4.3pt", fontWeight: 700, letterSpacing: "0.26em", color: GOLD_LT, marginTop: "0.8mm" }}>STAFF IDENTITY CARD</div>
          </div>
        </div>
      </div>
      {/* Photo */}
      <div style={{ position: "absolute", top: "13.5mm", left: "50%", transform: "translateX(-50%)", width: "25mm", height: "30mm", borderRadius: "3mm", padding: "0.7mm", background: `linear-gradient(135deg, ${GOLD_LT}, ${GOLD} 55%, ${GOLD_DK})`, boxShadow: "0 0.8mm 2.4mm rgba(10,37,64,0.28)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "2.4mm", overflow: "hidden", background: `linear-gradient(160deg, ${NAVY}, ${NAVY2})`, border: "0.5mm solid #fff", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {e.avatarDataUrl
            ? <img src={e.avatarDataUrl} alt={`Photo of ${e.fullName}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <span style={{ fontSize: "20pt", fontWeight: 800, color: GOLD_LT }}>{initials(e.fullName)}</span>}
        </div>
      </div>
      {/* Name + role */}
      <div style={{ position: "absolute", top: "46mm", left: "3mm", right: "3mm", textAlign: "center" }}>
        <div data-field="name" style={{ fontSize: `${size}pt`, fontWeight: 800, color: NAVY, lineHeight: 1.12, letterSpacing: "-0.01em", maxHeight: "9mm", overflow: "hidden", overflowWrap: "anywhere", textWrap: "balance" }}>{e.fullName}</div>
        <div style={{ fontSize: "5.6pt", fontWeight: 800, color: GOLD_DK, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "1.2mm", lineHeight: 1.2, maxHeight: "4.6mm", overflow: "hidden" }}>{e.title || "Staff"}</div>
        {e.department && <div style={{ fontSize: "5.4pt", color: MUTED, marginTop: "0.5mm" }}>{e.department}</div>}
      </div>
      {/* Details */}
      <div style={{ position: "absolute", top: "61.2mm", left: "4mm", right: "4mm", display: "flex", justifyContent: "space-between", gap: "2mm", borderTop: `0.2mm solid ${GOLD}66`, paddingTop: "1.4mm" }}>
        {[["STAFF NO.", e.employeeNumber], ["VALID UNTIL", fmtMonth(card.expiresAt)], ...(e.bloodGroup ? [["BLOOD", e.bloodGroup]] : [])].map(([k, v]) => (
          <div key={k} style={{ minWidth: 0 }}>
            <div style={{ fontSize: "3.9pt", fontWeight: 700, letterSpacing: "0.14em", color: MUTED }}>{k}</div>
            <div style={{ fontSize: "6.4pt", fontWeight: 800, color: NAVY, fontFamily: MONO, whiteSpace: "nowrap" }}>{v}</div>
          </div>
        ))}
      </div>
      {/* Holographic strip */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "16mm", height: "1.1mm", background: `linear-gradient(90deg, ${GOLD_DK}, ${GOLD_LT} 30%, #F6E7B4 50%, ${GOLD_LT} 70%, ${GOLD_DK})` }} />
      {/* Footer with QR */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "16mm", background: NAVY, display: "flex", alignItems: "center", gap: "2.6mm", padding: "0 4mm" }}>
        <div style={{ width: "12mm", height: "12mm", background: "#fff", borderRadius: "1.2mm", padding: "0.8mm", boxSizing: "border-box", flexShrink: 0 }}>
          {qr && <img src={qr} alt="Verification QR code" style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "5.6pt", fontWeight: 800, color: "#fff" }}>Scan to verify</div>
          <div style={{ fontSize: "4.4pt", color: "#C9D6E8", lineHeight: 1.35, marginTop: "0.4mm" }}>Confirms this card is genuine and the holder is current staff.</div>
          <div style={{ fontSize: "4pt", color: GOLD_LT, marginTop: "0.6mm", letterSpacing: "0.04em" }}>{(company.website || "orionsoftlimited.com").replace(/^https?:\/\//, "")}</div>
        </div>
      </div>
      {(inactive || !card.authorized) && (
        <div style={{ position: "absolute", top: "40mm", left: "-8mm", right: "-8mm", transform: "rotate(-24deg)", background: inactive ? "rgba(185,28,28,0.88)" : "rgba(180,83,9,0.86)", color: "#fff", textAlign: "center", fontSize: inactive ? "8pt" : "6pt", fontWeight: 900, letterSpacing: "0.18em", padding: "1mm 0" }}>{inactive ? "NOT ACTIVE" : "PENDING AUTHORISATION"}</div>
      )}
    </div>
  );
}

export function IdCardBack({ data }) {
  const { employee: e, card, company, signatory } = data;
  const label = { fontSize: "4.2pt", fontWeight: 800, letterSpacing: "0.16em", color: GOLD_DK, margin: "0 0 0.6mm" };
  const text = { fontSize: "5.1pt", lineHeight: 1.42, color: INK, margin: 0 };
  return (
    <div className="idc-face" style={face} data-face="back">
      <Guilloche color={NAVY} opacity={0.07} id="g-back" />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "9mm", background: `linear-gradient(90deg, ${NAVY}, ${NAVY2})`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4mm" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.2mm" }}>
          <OrionMark size={4} />
          <span style={{ fontSize: "7pt", fontWeight: 800, color: "#fff" }}>Orion<span style={{ color: GOLD_LT }}>Soft</span></span>
        </div>
        <span style={{ fontSize: "4.6pt", fontWeight: 700, color: GOLD_LT, letterSpacing: "0.12em", fontFamily: MONO }}>{e.employeeNumber}</span>
      </div>
      <div style={{ position: "absolute", top: "0mm", left: 0, right: 0, height: "9.8mm", borderBottom: `0.6mm solid ${GOLD}` }} />
      <div style={{ position: "absolute", top: "12mm", left: "4mm", right: "4mm", display: "grid", gap: "2.3mm" }}>
        <div>
          <p style={label}>PROPERTY OF {String(company.companyName || "Orion Soft Limited").toUpperCase()}</p>
          <p style={text}>This card identifies the holder as a member of staff. It must be worn visibly while on duty, shown on request and returned when employment ends. It is not transferable.</p>
        </div>
        <div>
          <p style={label}>IF FOUND, PLEASE RETURN TO</p>
          <p style={text}>{company.companyName}<br />{company.address}<br />{[company.phone, company.email].filter(Boolean).join(" · ")}</p>
        </div>
        <div>
          <p style={label}>IN AN EMERGENCY, CONTACT</p>
          <p style={text}>{e.emergencyContactName
            ? <>{e.emergencyContactName}{e.emergencyContactRelationship ? ` (${e.emergencyContactRelationship})` : ""}<br />{e.emergencyContactPhone}</>
            : <>{company.companyName} · {company.phone}</>}</p>
        </div>
        <div style={{ display: "flex", gap: "5mm" }}>
          {[["ISSUED", fmtDay(card.issuedAt)], ["EXPIRES", fmtDay(card.expiresAt)]].map(([k, v]) => (
            <div key={k}><p style={label}>{k}</p><p style={{ ...text, fontWeight: 700, fontFamily: MONO }}>{v}</p></div>
          ))}
        </div>
        <div>
          <div style={{ height: "8.5mm", display: "flex", alignItems: "flex-end" }}>
            {card.authorized && signatory?.signatureImageDataUrl
              ? <img src={signatory.signatureImageDataUrl} alt="Authorised signature" style={{ maxHeight: "8.5mm", maxWidth: "34mm", objectFit: "contain", display: "block" }} />
              : <span style={{ fontSize: "5pt", fontWeight: 800, color: "#B45309", letterSpacing: "0.08em" }}>AWAITING AUTHORISATION</span>}
          </div>
          {/* Signature only: the signer's name and title are never printed. */}
          <div style={{ borderTop: `0.2mm solid ${INK}`, width: "42mm", paddingTop: "0.6mm" }}>
            <p style={{ ...text, fontWeight: 700, fontSize: "5pt" }}>Authorised signatory</p>
            {card.authorized && <p style={{ ...text, fontSize: "4.4pt", color: MUTED }}>For {company.companyName || "Orion Soft Limited"} · {fmtDay(card.authorizedAt)}</p>}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: "4mm", right: "4mm", bottom: "3.2mm" }}>
        <Barcode value={e.employeeNumber} />
        <div style={{ textAlign: "center", fontSize: "4.4pt", color: MUTED, marginTop: "0.8mm", letterSpacing: "0.08em" }}>{e.employeeNumber} · Card v{card.version || 1}{company.rc ? ` · RC ${company.rc}` : ""}</div>
      </div>
    </div>
  );
}

// Compact signature pad: draws on a high-resolution canvas and returns a
// transparent PNG trimmed to the ink.
function SignaturePad({ onDone, onCancel }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [inked, setInked] = useState(false);
  const [name, setName] = useState(""); const [title, setTitle] = useState("");
  useEffect(() => {
    const c = ref.current, dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0A2540";
  }, []);
  const pt = ev => { const r = ref.current.getBoundingClientRect(); const p = ev.touches ? ev.touches[0] : ev; return [p.clientX - r.left, p.clientY - r.top]; };
  const down = ev => { ev.preventDefault(); drawing.current = true; const ctx = ref.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(...pt(ev)); };
  const move = ev => { if (!drawing.current) return; ev.preventDefault(); const ctx = ref.current.getContext("2d"); ctx.lineTo(...pt(ev)); ctx.stroke(); setInked(true); };
  const up = () => { drawing.current = false; };
  const clear = () => { const c = ref.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); setInked(false); };
  function trimmed() {
    const c = ref.current, ctx = c.getContext("2d");
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    const pad = 8, out = document.createElement("canvas");
    out.width = Math.max(1, x1 - x0 + pad * 2); out.height = Math.max(1, y1 - y0 + pad * 2);
    out.getContext("2d").drawImage(c, x0 - pad, y0 - pad, out.width, out.height, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <canvas ref={ref} aria-label="Draw your signature" style={{ width: "100%", maxWidth: 420, height: 150, background: "#fff", border: "1px dashed #94A3B8", borderRadius: 10, touchAction: "none", cursor: "crosshair" }}
        onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onTouchStart={down} onTouchMove={move} onTouchEnd={up} />
      <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>Only the signature is printed on cards. The name and title below just label it in your list of saved signatures.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" aria-label="Signatory name" style={inputStyle} />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Your title, e.g. Managing Director" aria-label="Signatory title" style={inputStyle} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={!inked || !name.trim()} onClick={() => onDone({ fullName: name.trim(), title: title.trim(), signatureImageDataUrl: trimmed() })} style={btn(true, !inked || !name.trim())}>Use this signature</button>
        <button type="button" onClick={clear} style={btn(false)}>Clear</button>
        <button type="button" onClick={onCancel} style={btn(false)}>Cancel</button>
      </div>
    </div>
  );
}
// Passport photo: upload (or take) a picture, then drag and zoom it to fit
// the card's photo frame (3:4). Saves a 600 × 800 JPEG.
const FW = 240, FH = 320;
function PassportEditor({ onSave, onCancel, busy, initialSrc = "" }) {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [err, setErr] = useState("");
  const [small, setSmall] = useState(false);
  const drag = useRef(null);
  const fileRef = useRef(null);
  const base = img ? Math.max(FW / img.naturalWidth, FH / img.naturalHeight) : 1;
  const s = base * zoom;
  const clamp = (o, sc = s) => img ? { x: Math.min(0, Math.max(FW - img.naturalWidth * sc, o.x)), y: Math.min(0, Math.max(FH - img.naturalHeight * sc, o.y)) } : o;

  // Loads a picture into the frame. `lenient`: the current profile photo is
  // accepted even when small (with a warning) rather than refused.
  function load(url, lenient = false) {
    setErr(""); setSmall(false);
    const i = new Image();
    i.onload = () => {
      const tooSmall = i.naturalWidth < 240 || i.naturalHeight < 300;
      if (tooSmall && !lenient) { setErr("This picture is too small to print sharply. Use a larger photo."); return; }
      setSmall(tooSmall);
      const b = Math.max(FW / i.naturalWidth, FH / i.naturalHeight);
      setImg(i); setZoom(1);
      setOff({ x: (FW - i.naturalWidth * b) / 2, y: (FH - i.naturalHeight * b) / 2 });
    };
    i.onerror = () => setErr("That picture couldn't be opened. Try a JPEG or PNG.");
    i.src = url;
  }
  function pick(file) {
    setErr("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) { setErr("Choose a photo (JPEG or PNG)."); return; }
    load(URL.createObjectURL(file));
  }
  useEffect(() => { if (initialSrc) load(initialSrc, true); }, [initialSrc]); // eslint-disable-line react-hooks/exhaustive-deps
  function setZoomKeepCentre(z) {
    const cx = FW / 2, cy = FH / 2, ns = base * z;
    setOff(o => clamp({ x: cx - ((cx - o.x) / s) * ns, y: cy - ((cy - o.y) / s) * ns }, ns));
    setZoom(z);
  }
  const down = e => { e.preventDefault(); const p = e.touches ? e.touches[0] : e; drag.current = { x: p.clientX, y: p.clientY, o: off }; };
  const move = e => {
    if (!drag.current) return;
    const p = e.touches ? e.touches[0] : e;
    setOff(clamp({ x: drag.current.o.x + p.clientX - drag.current.x, y: drag.current.o.y + p.clientY - drag.current.y }));
  };
  const up = () => { drag.current = null; };
  const sourceW = img ? Math.round(FW / s) : 0;
  const lowRes = img && sourceW < 300;

  function save() {
    const c = document.createElement("canvas"); c.width = 600; c.height = 800;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, 600, 800);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -off.x / s, -off.y / s, FW / s, FH / s, 0, 0, 600, 800);
    onSave(c.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="user" aria-label="Choose a passport photo" style={{ display: "none" }} onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {!img && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={btn(true)}>Choose or take a photo</button>
          <button type="button" onClick={onCancel} style={btn(false)}>Cancel</button>
        </div>
      )}
      {err && <p role="alert" style={{ color: "#B91C1C", fontSize: 13.5, margin: 0 }}>{err}</p>}
      {img && (
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div
            onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
            onTouchStart={down} onTouchMove={move} onTouchEnd={up}
            aria-label="Drag to position the photo"
            style={{ position: "relative", width: FW, height: FH, overflow: "hidden", borderRadius: 12, cursor: "grab", touchAction: "none", background: "#E5E7EB", boxShadow: `0 0 0 3px ${GOLD}`, flexShrink: 0 }}>
            <img src={img.src} alt="" draggable={false} style={{ position: "absolute", left: off.x, top: off.y, width: img.naturalWidth * s, height: img.naturalHeight * s, maxWidth: "none", userSelect: "none", pointerEvents: "none" }} />
            {/* Face guide: head in the oval, shoulders at the bottom */}
            <svg viewBox="0 0 240 320" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <defs><mask id="pp-mask"><rect width="240" height="320" fill="white" /><ellipse cx="120" cy="128" rx="62" ry="80" fill="black" /></mask></defs>
              <rect width="240" height="320" fill="rgba(10,37,64,0.35)" mask="url(#pp-mask)" />
              <ellipse cx="120" cy="128" rx="62" ry="80" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 5" />
              <path d="M30 320 C 40 250, 80 232, 120 232 C 160 232, 200 250, 210 320" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.8" />
            </svg>
          </div>
          <div style={{ flex: "1 1 220px", minWidth: 0, display: "grid", gap: 10 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>Zoom
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => setZoomKeepCentre(Number(e.target.value))} aria-label="Zoom" style={{ width: "100%", accentColor: NAVY, marginTop: 6 }} />
            </label>
            <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.55 }}>Drag the photo so your face fills the oval and your shoulders sit on the lower line.</p>
            {lowRes && <p style={{ fontSize: 13, color: "#B45309", margin: 0 }}>Zoomed in quite far: the printed photo may look soft. Zoom out a little or use a larger picture.</p>}
            {small && <p style={{ fontSize: 13, color: "#B45309", margin: 0 }}>This profile photo is quite small, so the printed card may look soft. A larger, plain-background photo prints best.</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={busy} onClick={save} style={btn(true, busy)}>{busy ? "Saving…" : "Save passport photo"}</button>
              <button type="button" onClick={() => fileRef.current?.click()} style={btn(false)}>Choose another</button>
              <button type="button" onClick={onCancel} style={btn(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { flex: "1 1 180px", minWidth: 0, padding: "9px 11px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 14, fontFamily: FONT, color: INK, background: "#fff" };
const btn = (primary, disabled) => ({ background: primary ? (disabled ? "#CBD5E1" : NAVY) : "#fff", color: primary ? "#fff" : NAVY, border: `1px solid ${primary ? (disabled ? "#CBD5E1" : NAVY) : "#CBD5E1"}`, borderRadius: 9, padding: "9px 16px", fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: disabled ? "not-allowed" : "pointer" });

const PRINT_CSS = {
  card: `@page { size: 54mm 85.6mm; margin: 0; }
    @media print { html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      .idc-screen-only { display: none !important; }
      .idc-page { padding: 0 !important; min-height: 0 !important; background: #fff !important; }
      .idc-scale { transform: none !important; box-shadow: none !important; }
      .idc-sheet { display: block !important; padding: 0 !important; gap: 0 !important; }
      .idc-slot { transform: none !important; width: 54mm !important; height: 85.6mm !important; margin: 0 !important; break-after: page; page-break-after: always; }
      .idc-slot:last-child { break-after: auto; page-break-after: auto; }
      .idc-face { border-radius: 0 !important; box-shadow: none !important; }
      .idc-mark { display: none !important; } }`,
  a4: `@page { size: A4; margin: 14mm; }
    @media print { html, body { margin: 0 !important; background: #fff !important; }
      .idc-screen-only { display: none !important; }
      .idc-page { padding: 0 !important; min-height: 0 !important; background: #fff !important; }
      .idc-scale { transform: none !important; box-shadow: none !important; }
      .idc-sheet { display: flex !important; gap: 14mm !important; padding: 6mm !important; justify-content: center; }
      .idc-slot { transform: none !important; width: 54mm !important; height: 85.6mm !important; margin: 0 !important; }
      .idc-face { box-shadow: none !important; }
      .idc-mark { display: block !important; } }`,
};

export default function IdCardPage() {
  const params = new URLSearchParams(window.location.search);
  const employeeId = params.get("employee");
  const isAdmin = !!employeeId;
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [signing, setSigning] = useState(false);
  const [signatories, setSignatories] = useState([]);
  const [chosenSig, setChosenSig] = useState("");
  const [editingPhoto, setEditingPhoto] = useState(false); // false | "upload" | "profile"
  const [scale, setScale] = useState(1.6);

  const url = isAdmin ? `/api/admin/id-cards?employeeId=${encodeURIComponent(employeeId)}` : "/api/staff/id-card";
  async function load() {
    try {
      const r = await fetch(url);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(r.status === 401 ? (isAdmin ? "Sign in to the admin dashboard first, then open the card again." : "Sign in to the Staff Office first, then open your card again.") : j.error || "Couldn't load the card."); return; }
      setData(j);
      document.title = `ID card · ${j.employee.fullName}`;
    } catch { setErr("Couldn't load the card. Check your connection."); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fetch("/api/admin/signatories").then(r => r.json()), fetch("/api/admin/settings").then(r => r.json())]).then(([sj, st]) => {
      const list = (sj.signatories || []).filter(s => s.signatureImageDataUrl);
      setSignatories(list);
      const pref = list.find(s => s.id === st.settings?.idCardSignatoryId) || list[0];
      if (pref) setChosenSig(c => c || pref.id);
    }).catch(() => {});
  }, [isAdmin]);
  // Fit the preview to the screen width.
  useEffect(() => {
    const fit = () => { const avail = Math.min(window.innerWidth - 32, 900); const mm = 3.7795; setScale(Math.max(0.9, Math.min(1.9, (avail - 24) / ((W * 2 + 10) * mm)))); };
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);

  function print(mode) {
    let s = document.getElementById("idc-print-style");
    if (!s) { s = document.createElement("style"); s.id = "idc-print-style"; document.head.appendChild(s); }
    s.textContent = PRINT_CSS[mode];
    // Let images (photo, QR, signature) finish before the print dialog.
    const imgs = [...document.querySelectorAll(".idc-face img")];
    Promise.all(imgs.map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })))).then(() => window.print());
  }
  async function reissue() {
    if (!window.confirm(`Reissue ${data.employee.fullName}'s card? The current card's QR code will stop verifying.`)) return;
    setBusy("reissue");
    try {
      const r = await fetch("/api/admin/id-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, action: "reissue" }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't reissue");
      setData(j); setNote(`New card issued (version ${j.card.version}). Print it and collect the old one.`);
    } catch (e) { setNote(e.message); } finally { setBusy(""); }
  }
  // Sign & authorise this card with a saved signature (remembered as the
  // default for the next card).
  async function authorize(signatoryId) {
    if (!signatoryId) { setNote("Choose a saved signature, or draw one with Sign now."); return; }
    setBusy("sign"); setNote("");
    try {
      const r = await fetch("/api/admin/id-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, action: "authorize", signatoryId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't authorise the card");
      fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idCardSignatoryId: signatoryId }) }).catch(() => {});
      setData(j); setNote(`Card signed and authorised. ${j.employee.fullName} has been notified and can now print it.`);
    } catch (e) { setNote(e.message); } finally { setBusy(""); }
  }
  async function savePhoto(body) {
    setBusy("photo"); setNote("");
    try {
      const r = await fetch(isAdmin ? "/api/admin/id-cards" : "/api/staff/id-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(isAdmin ? { employeeId } : {}), action: "photo", ...body }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't save the photo");
      setData(j); setEditingPhoto(false);
      setNote(j.needsResign || (isAdmin && data.card.authorized)
        ? "Passport photo saved. Because the photo changed, the card needs signing again before it can be printed."
        : "Passport photo saved.");
    } catch (e) { setNote(e.message); } finally { setBusy(""); }
  }
  async function saveDrawn(sig) {
    setBusy("sign");
    try {
      const r = await fetch("/api/admin/signatories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sig) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't save the signature");
      setSignatories(s => [...s, j.signatory]);
      setChosenSig(j.signatory.id);
      setSigning(false);
      await authorize(j.signatory.id);
    } catch (e) { setNote(e.message); setBusy(""); }
  }

  const page = { minHeight: "100vh", background: "#EEF2F7", fontFamily: FONT, color: INK, padding: "24px 16px 60px", boxSizing: "border-box" };
  if (err) return <div style={page}><div style={{ maxWidth: 520, margin: "60px auto", background: "#fff", borderRadius: 14, padding: 24, textAlign: "center" }}><h1 style={{ fontSize: 20, margin: "0 0 8px" }}>ID card</h1><p style={{ color: MUTED }}>{err}</p><a href={isAdmin ? "/admin" : "/staff"} style={{ color: NAVY, fontWeight: 700 }}>{isAdmin ? "Go to the admin" : "Go to the Staff Office"}</a></div></div>;
  if (!data) return <div style={page}><p style={{ textAlign: "center", color: MUTED, marginTop: 80 }}>Preparing the card…</p></div>;

  const cropMarks = (
    <>
      {["tl", "tr", "bl", "br"].map(c => (
        <span key={c} className="idc-mark" aria-hidden="true" style={{ display: "none", position: "absolute", width: "4mm", height: "4mm", ...(c[0] === "t" ? { top: "-5mm" } : { bottom: "-5mm" }), ...(c[1] === "l" ? { left: "-5mm", borderRight: "0.2mm solid #000" } : { right: "-5mm", borderLeft: "0.2mm solid #000" }), ...(c[0] === "t" ? { borderBottom: "0.2mm solid #000" } : { borderTop: "0.2mm solid #000" }) }} />
      ))}
    </>
  );
  const canPrint = data.card.authorized && data.employee.status === "active";
  // Signed & authorised: the staff member can't change the photo any more.
  // The admin still can, after confirming that it removes the signature.
  const photoLocked = !isAdmin && data.card.authorized;
  function startPhotoChange(mode) {
    if (isAdmin && data.card.authorized && !window.confirm("This card is signed and authorised. Changing the photo removes the signature, and the card must be signed again before it can be printed. Continue?")) return;
    setEditingPhoto(mode);
  }
  const slot = { position: "relative", width: `calc(${W}mm * ${scale})`, height: `calc(${H}mm * ${scale})` };
  const inner = { transform: `scale(${scale})`, transformOrigin: "top left", width: `${W}mm`, height: `${H}mm`, boxShadow: "0 12px 34px rgba(10,37,64,0.22)", borderRadius: "3.2mm" };
  return (
    <div className="idc-page" style={page}>
      <div className="idc-screen-only" style={{ maxWidth: 900, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: GOLD_DK }}>STAFF ID CARD</div>
          <h1 style={{ fontSize: 22, margin: "4px 0 0", color: NAVY }}>{data.employee.fullName}</h1>
          <div style={{ fontSize: 13.5, color: MUTED }}>{data.employee.employeeNumber} · valid until {fmtDay(data.card.expiresAt)}{data.employee.status !== "active" ? " · not active" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={!canPrint} title={canPrint ? "" : "The card must be authorised first"} onClick={() => print("card")} style={btn(true, !canPrint)}>Print card</button>
          <button type="button" disabled={!canPrint} onClick={() => print("a4")} style={btn(false, !canPrint)}>Print on A4 (with cut marks)</button>
          {isAdmin && <button type="button" disabled={!!busy} onClick={reissue} style={btn(false, !!busy)}>{busy === "reissue" ? "Reissuing…" : "Reissue card"}</button>}
        </div>
      </div>

      {note && <p className="idc-screen-only" role="status" style={{ maxWidth: 900, margin: "0 auto 14px", background: "#fff", borderLeft: `3px solid ${GOLD}`, padding: "10px 14px", borderRadius: 8, fontSize: 14 }}>{note}</p>}

      <div className="idc-sheet" style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="idc-slot" style={slot}>
          <div className="idc-scale" style={inner}><IdCardFront data={data} /></div>
          {cropMarks}
          <div className="idc-screen-only" style={{ position: "absolute", bottom: -24, left: 0, right: 0, textAlign: "center", fontSize: 12, color: MUTED, fontWeight: 700, letterSpacing: "0.1em" }}>FRONT</div>
        </div>
        <div className="idc-slot" style={slot}>
          <div className="idc-scale" style={inner}><IdCardBack data={data} /></div>
          {cropMarks}
          <div className="idc-screen-only" style={{ position: "absolute", bottom: -24, left: 0, right: 0, textAlign: "center", fontSize: 12, color: MUTED, fontWeight: 700, letterSpacing: "0.1em" }}>BACK</div>
        </div>
      </div>

      <div className="idc-screen-only" style={{ maxWidth: 900, margin: "48px auto 0", display: "grid", gap: 14 }}>
        <section style={{ background: "#fff", borderRadius: 14, padding: 18, border: data.employee.hasPassport ? "1px solid #E2E8F0" : "1px solid #F5C77A" }}>
          <h2 style={{ fontSize: 16, margin: "0 0 4px", color: NAVY }}>Passport photo</h2>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 0 12px", lineHeight: 1.6 }}>
            {data.employee.hasPassport
              ? <>A passport photo is on the card. {data.card.authorized && isAdmin ? "Changing it removes the signature and sends the card back for signing." : !data.card.authorized ? "You can change it until the card is signed and authorised." : ""}</>
              : <>{data.employee.hasProfilePhoto ? "The card is showing the profile photo for now. " : ""}A card can only be authorised with a proper passport photo: plain light background, face straight to the camera, head and shoulders, no caps or sunglasses, good light.</>}
          </p>
          {photoLocked && (
            <p role="status" style={{ fontSize: 13.5, color: "#15803D", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 12px", margin: 0 }}>
              🔒 Your card has been signed and authorised, so its photo is locked. If it needs to change, ask the admin.
            </p>
          )}
          {!photoLocked && data.employee.profilePhotoNewer && !editingPhoto && (
            <p role="status" style={{ fontSize: 13.5, color: "#B45309", background: "#FFF7E6", border: "1px solid #F5C77A", borderRadius: 10, padding: "10px 12px", margin: "0 0 12px" }}>
              {isAdmin ? "Their" : "Your"} profile photo was changed after this card photo was set. Use the new one below if it should be on the card.
            </p>
          )}
          {!photoLocked && !editingPhoto && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {data.employee.profilePhotoDataUrl && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, border: "1px solid #E2E8F0", borderRadius: 10, padding: "6px 10px 6px 6px" }}>
                  <img src={data.employee.profilePhotoDataUrl} alt="Current profile photo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                  <button type="button" disabled={!!busy} onClick={() => startPhotoChange("profile")} style={btn(!!data.employee.profilePhotoNewer || !data.employee.hasPassport, !!busy)}>Use {isAdmin ? "their" : "my"} current profile photo</button>
                </span>
              )}
              <button type="button" disabled={!!busy} onClick={() => startPhotoChange("upload")} style={btn(!data.employee.hasPassport && !data.employee.profilePhotoDataUrl, !!busy)}>{data.employee.hasPassport ? "Upload a different photo" : "Upload passport photo"}</button>
            </div>
          )}
          {!photoLocked && editingPhoto && (
            <PassportEditor busy={busy === "photo"} initialSrc={editingPhoto === "profile" ? data.employee.profilePhotoDataUrl : ""}
              onSave={dataUrl => savePhoto({ dataUrl, fromProfile: editingPhoto === "profile" })} onCancel={() => setEditingPhoto(false)} />
          )}
        </section>
        {!isAdmin && !data.card.authorized && (
          <section role="status" style={{ background: "#FFF7E6", border: "1px solid #F5C77A", borderRadius: 14, padding: 18, fontSize: 14, lineHeight: 1.6 }}>
            <strong>Your card is waiting to be authorised.</strong> The admin signs and authorises every staff ID card. You'll get a notification when yours is ready to print.
          </section>
        )}
        {isAdmin && (
          <section style={{ background: "#fff", borderRadius: 14, padding: 18, border: data.card.authorized ? "1px solid #BBF7D0" : "1px solid #F5C77A" }}>
            <h2 style={{ fontSize: 16, margin: "0 0 4px", color: NAVY }}>{data.card.authorized ? "Authorised" : "Sign & authorise this card"}</h2>
            <p style={{ fontSize: 13.5, color: MUTED, margin: "0 0 12px" }}>
              {data.card.authorized
                ? <>Signed by <strong style={{ color: INK }}>{data.signatory?.fullName || "—"}</strong> on {fmtDay(data.card.authorizedAt)}{data.card.authorizedBy ? ` (authorised by ${data.card.authorizedBy})` : ""}. To change the signature, sign again below.</>
                : <>Until it's authorised, the card shows <strong style={{ color: INK }}>Pending authorisation</strong>, can't be printed by the staff member, and its QR code doesn't verify.</>}
            </p>
            {data.employee.status !== "active" && <p style={{ fontSize: 13.5, color: "#B91C1C", margin: "0 0 12px" }}>This staff member isn't active, so the card can't be authorised.</p>}
            {data.employee.status === "active" && !data.employee.hasPassport && <p style={{ fontSize: 13.5, color: "#B45309", margin: "0 0 12px" }}>Add a passport photo above before signing.</p>}
            {!signing && data.employee.status === "active" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {signatories.length > 0 && (
                  <>
                    <select aria-label="Signature to sign with" value={chosenSig} disabled={!!busy} onChange={e => setChosenSig(e.target.value)} style={{ ...inputStyle, flex: "0 1 280px" }}>
                      {signatories.map(s => <option key={s.id} value={s.id}>{s.fullName}{s.title ? ` · ${s.title}` : ""}</option>)}
                    </select>
                    <button type="button" disabled={!!busy || !chosenSig || !data.employee.hasPassport} title={data.employee.hasPassport ? "" : "Add a passport photo first"} onClick={() => authorize(chosenSig)} style={btn(true, !!busy || !chosenSig || !data.employee.hasPassport)}>{busy === "sign" ? "Signing…" : data.card.authorized ? "Sign again" : "Sign & authorise"}</button>
                  </>
                )}
                <button type="button" onClick={() => setSigning(true)} style={btn(signatories.length === 0)}>{signatories.length ? "Draw a new signature" : "Sign now"}</button>
              </div>
            )}
            {signing && <SignaturePad onDone={saveDrawn} onCancel={() => setSigning(false)} />}
          </section>
        )}
        <section style={{ background: "#fff", borderRadius: 14, padding: 18, fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>
          <strong style={{ color: INK }}>Printing tips.</strong> Choose <em>Print card</em> for a card printer or to save a PDF: it prints the front and back as two card-sized pages. For a print shop, choose <em>Print on A4</em>: both sides print at real size with cut marks. In the print dialog, set scale to 100% and turn on background graphics. The QR code and barcode are scannable when printed at this size.
        </section>
      </div>
    </div>
  );
}
