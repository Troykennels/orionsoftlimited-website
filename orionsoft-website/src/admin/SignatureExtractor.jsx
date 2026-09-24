import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, RotateCw, Crop, Check, Maximize } from "lucide-react";
import { C, font } from "../staff/theme.js";
import { Btn } from "../staff/components.jsx";
import { extractSignature, toStorableDataUrl } from "./signatureExtract.js";

const MAX_SIDE = 2200;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file couldn't be read as an image. Try a JPG, PNG or PDF."));
    img.src = src;
  });
}

function canvasFrom(source, rotate = 0) {
  const sw = source.width, sh = source.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const w = Math.round(sw * scale), h = Math.round(sh * scale);
  const c = document.createElement("canvas");
  const quarter = rotate % 180 !== 0;
  c.width = quarter ? h : w; c.height = quarter ? w : h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  return c;
}

async function renderPdfPage(file, pageNo) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(Math.min(Math.max(1, pageNo), pdf.numPages));
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(3, MAX_SIDE / Math.max(viewport.width, viewport.height));
  const vp = page.getViewport({ scale });
  const c = document.createElement("canvas");
  c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
  return { canvas: c, pages: pdf.numPages };
}

export default function SignatureExtractor({ onChange }) {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState(null); // canvas of the (rotated) page
  const [rotate, setRotate] = useState(0);
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [sel, setSel] = useState(null); // selection in source-pixel coords
  // Extraction only runs on an explicit area: a dragged box, or "Whole image"
  // for photos that are already just the signature. Running on a full letter
  // would just return the letter's text.
  const [whole, setWhole] = useState(false);
  const [working, setWorking] = useState(false);
  const [opts, setOpts] = useState({ sensitivity: 0.5, minSpeck: 1, removeLines: true, ink: "navy" });
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(false);
  const stageRef = useRef(null);
  const drag = useRef(null);
  const rawImage = useRef(null);

  // (Re)build the working canvas whenever the file, PDF page or rotation changes.
  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    (async () => {
      setBusy(true); setErr("");
      try {
        let base;
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          const { canvas, pages } = await renderPdfPage(file, pdfPage);
          base = canvas; if (!cancelled) setPdfPages(pages);
        } else {
          if (!rawImage.current || rawImage.current.file !== file) {
            const url = URL.createObjectURL(file);
            try { rawImage.current = { file, img: await loadImage(url) }; } finally { URL.revokeObjectURL(url); }
          }
          base = rawImage.current.img;
        }
        if (cancelled) return;
        setSource(canvasFrom(base, rotate));
        setSel(null); setWhole(false); setResult(null); setUsed(false); onChange(null);
      } catch (e) { if (!cancelled) setErr(e.message || "Couldn't read that file."); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [file, pdfPage, rotate, onChange]);

  const hasArea = !!(sel && sel.w > 8 && sel.h > 8) || whole;
  const run = useCallback(() => {
    if (!source) return;
    const r = sel && sel.w > 8 && sel.h > 8 ? sel : whole ? { x: 0, y: 0, w: source.width, h: source.height } : null;
    if (!r) return;
    const crop = source.getContext("2d").getImageData(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
    const out = extractSignature(crop, opts);
    if (!out) { setResult(null); setErr("No signature ink found in that area. Drag a box around the signature, or raise the sensitivity."); return; }
    setErr("");
    setResult(toStorableDataUrl(out.canvas));
    setUsed(false); onChange(null);
  }, [source, sel, whole, opts, onChange]);

  // Re-extract live as the selection or settings change. The previous result
  // is cleared first so a stale image can never be picked.
  useEffect(() => {
    if (!source || !hasArea || drag.current) return undefined;
    setResult(null); setUsed(false); onChange(null); setWorking(true);
    const t = setTimeout(() => { run(); setWorking(false); }, 150);
    return () => clearTimeout(t);
  }, [source, sel, whole, opts, run, hasArea, onChange]);

  function toSource(e) {
    const rect = stageRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x: Math.min(source.width, Math.max(0, ((p.clientX - rect.left) / rect.width) * source.width)),
      y: Math.min(source.height, Math.max(0, ((p.clientY - rect.top) / rect.height) * source.height)),
    };
  }
  function down(e) { if (!source) return; e.preventDefault(); drag.current = toSource(e); setWhole(false); setSel({ ...drag.current, w: 0, h: 0 }); }
  function move(e) {
    if (!drag.current) return;
    e.preventDefault();
    const p = toSource(e), s = drag.current;
    setSel({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  }
  function up() {
    if (!drag.current) return;
    drag.current = null;
    window.getSelection?.().removeAllRanges();
    setSel(s => (s ? { ...s } : s)); // re-run extraction now the drag has finished
  }

  const box = sel && source ? { left: `${(sel.x / source.width) * 100}%`, top: `${(sel.y / source.height) * 100}%`, width: `${(sel.w / source.width) * 100}%`, height: `${(sel.h / source.height) * 100}%` } : null;

  return (
    <div style={{ fontFamily: font }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, border: `1px dashed ${C.borderStrong}`, borderRadius: 12, padding: 14, cursor: "pointer", color: C.text, fontSize: 13.5, background: C.surface }}>
        <Upload size={18} color={C.gold} />
        <span><strong style={{ color: C.heading }}>{file ? file.name : "Upload the signed paper"}</strong><br /><span style={{ color: C.textMuted, fontSize: 12 }}>Photo, scan (JPG/PNG) or PDF. A phone photo is fine; shadows are handled.</span></span>
        <input type="file" accept="image/*,application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { rawImage.current = null; setFile(f); setPdfPage(1); setRotate(0); } }} />
      </label>

      {source && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "12px 0 8px" }}>
            <span style={{ fontSize: 12.5, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Crop size={14} /> Drag a box around the signature</span>
            <div style={{ flex: 1 }} />
            {pdfPages > 1 && (
              <select value={pdfPage} onChange={e => setPdfPage(Number(e.target.value))} aria-label="PDF page" style={{ background: C.surface, color: C.text, border: `1px solid ${C.borderStrong}`, borderRadius: 8, padding: "6px 8px", fontFamily: font }}>
                {Array.from({ length: pdfPages }, (_, i) => <option key={i} value={i + 1}>Page {i + 1}</option>)}
              </select>
            )}
            <Btn small variant={whole ? "primary" : "ghost"} icon={Maximize} onClick={() => { setSel(null); setWhole(true); }} title="Use when the photo is already just the signature">Whole image</Btn>
            <Btn small variant="ghost" icon={RotateCw} onClick={() => setRotate(r => (r + 90) % 360)}>Rotate</Btn>
          </div>
          {/* The stage shrink-wraps the image, so pointer maths maps 1:1 onto
              the whole page even when a tall scan is scaled down to fit. */}
          <div style={{ textAlign: "center", background: C.surface, borderRadius: 10, padding: 6 }}>
          <div ref={stageRef} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onTouchStart={down} onTouchMove={move} onTouchEnd={up}
            style={{ position: "relative", display: "inline-block", maxWidth: "100%", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, cursor: "crosshair", touchAction: "none", userSelect: "none", background: "#fff", verticalAlign: "top" }}>
            <img src={source.toDataURL("image/jpeg", 0.85)} alt="Uploaded document" draggable={false} style={{ maxWidth: "100%", maxHeight: 520, display: "block" }} />
            {box && <div style={{ position: "absolute", ...box, border: `2px solid ${C.gold}`, background: "rgba(200,168,80,0.12)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />}
          </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 700 }}>Ink sensitivity
              <input type="range" min="0" max="1" step="0.05" value={opts.sensitivity} onChange={e => setOpts(o => ({ ...o, sensitivity: Number(e.target.value) }))} style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 700 }}>Remove specks
              <input type="range" min="0" max="6" step="0.5" value={opts.minSpeck} onChange={e => setOpts(o => ({ ...o, minSpeck: Number(e.target.value) }))} style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 700 }}>Ink colour
              <select value={opts.ink} onChange={e => setOpts(o => ({ ...o, ink: e.target.value }))} style={{ width: "100%", background: C.surface, color: C.text, border: `1px solid ${C.borderStrong}`, borderRadius: 8, padding: "6px 8px", marginTop: 4, fontFamily: font }}>
                <option value="navy">Navy</option><option value="black">Black</option><option value="blue">Blue</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text }}>
              <input type="checkbox" checked={opts.removeLines} onChange={e => setOpts(o => ({ ...o, removeLines: e.target.checked }))} /> Remove the printed signature line
            </label>
          </div>
        </>
      )}

      {busy && <p style={{ fontSize: 13, color: C.textMuted }}>Reading file…</p>}
      {source && !hasArea && !busy && <p style={{ fontSize: 13, color: C.gold, margin: "10px 0 0" }}>Drag a box around the signature on the page above (or click Whole image if the photo is only the signature).</p>}
      {working && <p style={{ fontSize: 13, color: C.textMuted, margin: "10px 0 0" }}>Extracting signature…</p>}
      {err && <p role="alert" style={{ fontSize: 13, color: C.rose }}>{err}</p>}

      {result && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, letterSpacing: "0.06em", marginBottom: 8 }}>EXTRACTED SIGNATURE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, padding: 12, background: "repeating-conic-gradient(#e8ebf0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 110 }}>
              <img src={result} alt="Extracted signature (transparent)" style={{ maxWidth: "100%", maxHeight: 120 }} />
            </div>
            <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 18px", background: "#fff", color: "#212934", fontFamily: "Georgia, serif" }}>
              <div style={{ fontSize: 12 }}>Yours sincerely,</div>
              <img src={result} alt="" style={{ maxWidth: 200, maxHeight: 64, display: "block", margin: "6px 0 -4px" }} />
              <div style={{ borderTop: "1px solid #999", width: 200, paddingTop: 4, fontSize: 11, fontWeight: 700 }}>Preview on a letter</div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Btn small icon={Check} onClick={() => { onChange(result); setUsed(true); }}>{used ? "Signature selected ✓" : "Use this signature"}</Btn>
            <span style={{ fontSize: 12, color: C.textMuted }}>Not clean enough? Tighten the box, adjust sensitivity, or remove more specks.</span>
          </div>
        </div>
      )}
    </div>
  );
}
