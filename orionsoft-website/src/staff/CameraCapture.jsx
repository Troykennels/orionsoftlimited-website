import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { C, font } from "./theme.js";
import { Btn } from "./components.jsx";
import { finishPhoto, classifyCameraError } from "./geo.js";
import DeviceHelp from "./DeviceHelp.jsx";

// Live camera capture. The camera only opens when the person taps (one
// permission prompt at a time, which Android handles far more reliably). The
// photo comes from the live stream, not the gallery, and is stamped with
// time + GPS. A gallery upload remains possible, but is labelled and scores lower.
export default function CameraCapture({ onCapture, name, geo, selfie = false }) {
  const video = useRef(null);
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [facing, setFacing] = useState(selfie ? "user" : "environment");
  const [errKind, setErrKind] = useState(null);
  const [shot, setShot] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let active = true, s = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } }, audio: false });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s); setErrKind(null);
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      } catch (e) {
        if (active) { setErrKind(await classifyCameraError(e)); setOpen(false); }
      }
    })();
    return () => { active = false; s?.getTracks().forEach(t => t.stop()); };
  }, [open, facing, attempt]);

  function capture() {
    if (!video.current?.videoWidth) return;
    const out = finishPhoto(video.current, { name, geo });
    setShot(out.dataUrl);
    stream?.getTracks().forEach(t => t.stop());
    setOpen(false);
    onCapture({ ...out, source: "camera" });
  }
  function upload(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const img = new Image();
    img.onload = () => { const out = finishPhoto(img, { name, geo }); setShot(out.dataUrl); onCapture({ ...out, source: "upload" }); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(f);
  }
  const uploadLink = (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.textMuted, cursor: "pointer", padding: "8px 4px" }}>
      <Upload size={14} /> Upload instead
      <input type="file" accept="image/*" hidden onChange={upload} />
    </label>
  );

  if (shot) return (
    <div>
      <img src={shot} alt="Captured" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}` }} />
      <Btn small variant="ghost" icon={RefreshCw} onClick={() => { setShot(null); onCapture(null); setErrKind(null); setOpen(true); setAttempt(n => n + 1); }} style={{ marginTop: 8 }}>Retake</Btn>
    </div>
  );
  if (errKind) return (
    <div>
      <DeviceHelp kind={errKind} onRetry={() => { setErrKind(null); setOpen(true); setAttempt(n => n + 1); }} />
      {uploadLink}
    </div>
  );
  if (!open) return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontFamily: font }}>
      <Btn icon={Camera} onClick={() => setOpen(true)}>{selfie ? "Open camera (selfie)" : "Open camera"}</Btn>
      {uploadLink}
    </div>
  );
  return (
    <div style={{ fontFamily: font }}>
      <video ref={video} playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000", aspectRatio: "4 / 3", objectFit: "cover" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Btn icon={Camera} onClick={capture}>Take photo</Btn>
        <Btn variant="ghost" icon={RefreshCw} onClick={() => setFacing(f => (f === "user" ? "environment" : "user"))}>Switch camera</Btn>
        {uploadLink}
      </div>
    </div>
  );
}
