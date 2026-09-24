import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { C, font } from "./theme.js";
import { Btn } from "./components.jsx";
import { finishPhoto } from "./geo.js";

// Live camera capture. The photo is taken from the camera stream (not the
// gallery) and stamped with time + GPS. A gallery upload is still possible
// when the camera can't be used, but it's labelled and scores lower.
export default function CameraCapture({ onCapture, name, geo, selfie = false }) {
  const video = useRef(null);
  const [stream, setStream] = useState(null);
  const [facing, setFacing] = useState(selfie ? "user" : "environment");
  const [err, setErr] = useState("");
  const [shot, setShot] = useState(null);
  const [attempt, setAttempt] = useState(0); // bump to reopen the camera (retake)

  useEffect(() => {
    let active = true, s = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } }, audio: false });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s); setErr("");
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      } catch { if (active) setErr("Camera unavailable. Allow camera access, or upload a photo instead (it will be marked as not live)."); }
    })();
    return () => { active = false; s?.getTracks().forEach(t => t.stop()); };
  }, [facing, attempt]);

  function capture() {
    if (!video.current?.videoWidth) return;
    const out = finishPhoto(video.current, { name, geo });
    setShot(out.dataUrl);
    stream?.getTracks().forEach(t => t.stop());
    onCapture({ ...out, source: "camera" });
  }
  function upload(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const img = new Image();
    img.onload = () => { const out = finishPhoto(img, { name, geo }); setShot(out.dataUrl); onCapture({ ...out, source: "upload" }); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(f);
  }

  if (shot) return (
    <div>
      <img src={shot} alt="Captured" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}` }} />
      <Btn small variant="ghost" icon={RefreshCw} onClick={() => { setShot(null); onCapture(null); setErr(""); setAttempt(n => n + 1); }} style={{ marginTop: 8 }}>Retake</Btn>
    </div>
  );
  return (
    <div style={{ fontFamily: font }}>
      {!err && <video ref={video} playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000", aspectRatio: "4 / 3", objectFit: "cover" }} />}
      {err && <div style={{ fontSize: 13, color: C.amber, background: C.amberDim, borderRadius: 10, padding: 12 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {!err && <Btn icon={Camera} onClick={capture}>Take photo</Btn>}
        {!err && <Btn variant="ghost" icon={RefreshCw} onClick={() => setFacing(f => (f === "user" ? "environment" : "user"))}>Switch camera</Btn>}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.textMuted, cursor: "pointer", padding: "8px 4px" }}>
          <Upload size={14} /> Upload instead
          <input type="file" accept="image/*" hidden onChange={upload} />
        </label>
      </div>
    </div>
  );
}
