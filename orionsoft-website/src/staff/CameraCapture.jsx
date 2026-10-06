import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload, Aperture } from "lucide-react";
import { C, font } from "./theme.js";
import { Btn } from "./components.jsx";
import { finishPhoto, classifyCameraError } from "./geo.js";
import DeviceHelp from "./DeviceHelp.jsx";

// Live camera capture, stamped with time + GPS. Two ways to take the photo:
//  - "Phone camera (best quality)": the phone's own camera app (the same
//    processing as any iPhone/Samsung photo). Accepted as live when the
//    photo was taken in the last few minutes.
//  - "Open camera": an in-page viewfinder at the camera's full resolution,
//    with continuous focus; on Android it takes a real still photo from the
//    sensor (not a video frame).
// A gallery upload remains possible, but is labelled and scores lower.

const FRESH_MS = 5 * 60 * 1000;

// When the photo was taken, from the JPEG's EXIF data (null if unknown).
async function exifTakenAt(file) {
  try {
    const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (buf.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while (off + 4 < buf.byteLength) {
      const marker = buf.getUint16(off), len = buf.getUint16(off + 2);
      if (marker === 0xFFE1 && buf.getUint32(off + 4) === 0x45786966) { // "Exif"
        const tiff = off + 10, le = buf.getUint16(tiff) === 0x4949;
        const u16 = p => buf.getUint16(p, le), u32 = p => buf.getUint32(p, le);
        const readStr = (p, n) => { let s = ""; for (let i = 0; i < n - 1; i++) s += String.fromCharCode(buf.getUint8(p + i)); return s; };
        const findTag = (ifd, tag) => { const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === tag) return e; } return null; };
        const ifd0 = tiff + u32(tiff + 4);
        const exifPtr = findTag(ifd0, 0x8769);
        const e = exifPtr && findTag(tiff + u32(exifPtr + 8), 0x9003); // DateTimeOriginal
        const any = e || findTag(ifd0, 0x0132); // DateTime
        if (!any) return null;
        const m = readStr(tiff + u32(any + 8), 20).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : null; // phone local time
      }
      off += 2 + len;
    }
  } catch { /* unreadable: treat as unknown */ }
  return null;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function CameraCapture({ onCapture, name, geo, selfie = false }) {
  const video = useRef(null);
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [facing, setFacing] = useState(selfie ? "user" : "environment");
  const [errKind, setErrKind] = useState(null);
  const [shot, setShot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let active = true, s = null;
    (async () => {
      try {
        // Ask for the sensor's full resolution; the phone gives the best it has.
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 4096 }, height: { ideal: 3072 } }, audio: false });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        const track = s.getVideoTracks()[0];
        // Keep focus, exposure and white balance adjusting continuously where supported.
        try { await track.applyConstraints({ advanced: [{ focusMode: "continuous" }, { exposureMode: "continuous" }, { whiteBalanceMode: "continuous" }] }); } catch { /* not supported */ }
        setStream(s); setErrKind(null);
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      } catch (e) {
        if (active) { setErrKind(await classifyCameraError(e)); setOpen(false); }
      }
    })();
    return () => { active = false; s?.getTracks().forEach(t => t.stop()); };
  }, [open, facing, attempt]);

  function done(out, source) {
    setShot(out.dataUrl);
    setNote(`${out.width} × ${out.height}`);
    onCapture({ ...out, source });
  }

  async function capture() {
    if (!video.current?.videoWidth) return;
    setBusy(true);
    try {
      const track = stream?.getVideoTracks()[0];
      let source = video.current;
      // A real still photo from the sensor where the browser supports it (Android Chrome).
      if (track && typeof window.ImageCapture === "function") {
        try {
          const ic = new window.ImageCapture(track);
          const caps = await ic.getPhotoCapabilities().catch(() => null);
          const settings = caps?.imageWidth?.max ? { imageWidth: caps.imageWidth.max, imageHeight: caps.imageHeight.max } : {};
          const blob = await ic.takePhoto(settings);
          source = await createImageBitmap(blob);
        } catch { /* fall back to the viewfinder frame */ }
      }
      const out = finishPhoto(source, { name, geo });
      stream?.getTracks().forEach(t => t.stop());
      setOpen(false);
      done(out, "camera");
    } finally { setBusy(false); }
  }

  // The phone's own camera app (capture attribute) or a file from the gallery.
  async function fromFile(e, viaCameraApp) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const taken = await exifTakenAt(f);
      const age = Date.now() - (taken ?? f.lastModified ?? 0);
      const fresh = viaCameraApp && age >= -FRESH_MS && age <= FRESH_MS;
      const img = await loadImage(f);
      const out = finishPhoto(img, { name, geo });
      URL.revokeObjectURL(img.src);
      done(out, fresh ? "camera" : "upload");
      if (viaCameraApp && !fresh) setNote(n => `${n} · not taken just now, so it counts as an upload`);
    } catch { setNote("That photo couldn't be read. Try again."); }
    finally { setBusy(false); }
  }

  const phoneCamera = (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.gold, color: "#060810", borderRadius: 10, padding: "10px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: font }}>
      <Aperture size={16} /> Phone camera (best quality)
      <input type="file" accept="image/*" capture={selfie ? "user" : "environment"} hidden onChange={e => fromFile(e, true)} />
    </label>
  );
  const uploadLink = (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.textMuted, cursor: "pointer", padding: "8px 4px" }}>
      <Upload size={14} /> Upload instead
      <input type="file" accept="image/*" hidden onChange={e => fromFile(e, false)} />
    </label>
  );

  if (busy && !open) return <div style={{ color: C.textMuted, fontSize: 13.5, padding: 10, fontFamily: font }}>Processing photo…</div>;
  if (shot) return (
    <div>
      <img src={shot} alt="Captured" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}` }} />
      {note && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{note}</div>}
      <Btn small variant="ghost" icon={RefreshCw} onClick={() => { setShot(null); setNote(""); onCapture(null); setErrKind(null); }} style={{ marginTop: 8 }}>Retake</Btn>
    </div>
  );
  if (errKind) return (
    <div>
      <DeviceHelp kind={errKind} onRetry={() => { setErrKind(null); setOpen(true); setAttempt(n => n + 1); }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>{phoneCamera}{uploadLink}</div>
    </div>
  );
  if (!open) return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontFamily: font }}>
      {phoneCamera}
      <Btn variant="ghost" icon={Camera} onClick={() => setOpen(true)}>{selfie ? "In-app camera (selfie)" : "In-app camera"}</Btn>
      {uploadLink}
    </div>
  );
  return (
    <div style={{ fontFamily: font }}>
      <video ref={video} playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000", aspectRatio: "4 / 3", objectFit: "cover" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Btn icon={Camera} onClick={capture} disabled={busy}>{busy ? "Taking photo…" : "Take photo"}</Btn>
        <Btn variant="ghost" icon={RefreshCw} onClick={() => setFacing(f => (f === "user" ? "environment" : "user"))}>Switch camera</Btn>
        {uploadLink}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Hold steady for a second so the camera can focus.</div>
    </div>
  );
}
