import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Circle, Download } from 'lucide-react';
import { C } from '../theme.js';
import { api } from '../api.js';
import { Btn, SectionCard } from '../components.jsx';
import { useOffice } from '../office.js';
import { OfficeCall, recordCall } from '../call-engine.js';

function Tile({ stream, name, muted, state }) {
  const ref = useRef(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => { const video = ref.current; video.srcObject = stream || null; if (stream) video.play().catch(() => setBlocked(true)); return () => { video.srcObject = null; }; }, [stream]);
  return <div className="so-call-tile"><video ref={ref} autoPlay playsInline muted={muted} data-call-name={name} />{blocked && <button onClick={() => ref.current.play().then(() => setBlocked(false))} style={{ position: 'absolute', top: 16, left: 16 }}>Enable sound</button>}<span>{name}{state && ` · ${state}`}</span></div>;
}
export default function CallRoom({ meeting, onClose }) {
  const { me } = useOffice();
  const host = me.id === meeting.hostId;
  const [video, setVideo] = useState(true), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [room, setRoom] = useState(null), [joined, setJoined] = useState(false), [mic, setMic] = useState(true), [sharing, setSharing] = useState(false), [recording, setRecording] = useState(false), [download, setDownload] = useState(null);
  const [screenSupported] = useState(() => typeof navigator.mediaDevices?.getDisplayMedia === 'function');
  const [preview, setPreview] = useState(null), [sessionId, setSessionId] = useState('');
  const [relayState,setRelayState]=useState('connecting'),[relayError,setRelayError]=useState('');
  const [networkError,setNetworkError]=useState('');
  const sound=useRef(null),remoteStreams=useRef({});
  const [streams, setStreams] = useState({}), [states, setStates] = useState({}), [config, setConfig] = useState(null);
  const call = useRef(null), local = useRef(null), screen = useRef(null), recorder = useRef(null), recordingUrl = useRef(null);
  const grid = useRef(null), stopped = useRef(false), pendingDownload = useRef(null);
  useEffect(() => { let cancelled = false; api(`/api/staff/calls?meetingId=${meeting.id}&action=config`).then(j => { if (!cancelled) setConfig(j); }).catch(e => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; }; }, [meeting.id]);
  const stopRecording = () => { recorder.current?.stop(); recorder.current = null; setRecording(false); if (call.current) call.current.send({ action: 'record', recording: false }).catch(() => {}); };
  function cleanup() { if (pendingDownload.current && !pendingDownload.current.saved) { const a = document.createElement('a'); a.href = pendingDownload.current.url; a.download = pendingDownload.current.name; a.click(); pendingDownload.current.saved = true; } stopped.current = true; recorder.current?.stop(); recorder.current = null; call.current?.close(); call.current = null; local.current?.getTracks().forEach(t => t.stop()); screen.current?.getTracks().forEach(t => t.stop()); remoteStreams.current={};if(sound.current){void sound.current.close();sound.current=null;} }
  useEffect(() => {
    const before = e => { if (call.current || pendingDownload.current && !pendingDownload.current.saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', before);
    return () => { window.removeEventListener('beforeunload', before); cleanup(); if (recordingUrl.current) { const url = recordingUrl.current; setTimeout(() => URL.revokeObjectURL(url),60000); } };
  }, []);
  async function join() {
    if (busy) return; setBusy(true); setError(''); stopped.current = false;
    try {
      if(config?.officeRelay){const Audio=window.AudioContext||window.webkitAudioContext;sound.current=new Audio();void sound.current.resume().catch(()=>{});setRelayState('connecting');setRelayError('');}
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw Error('Calls need HTTPS and a current browser with microphone access.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: video ? { width: { ideal: 640 }, height: { ideal: 360 } } : false });
      if (stopped.current) { stream.getTracks().forEach(t => t.stop()); return; }
      local.current = stream;
      const j = await api('/api/staff/calls', { method: 'POST', body: { action: 'join', meetingId: meeting.id, consent } });
      if (stopped.current) { stream.getTracks().forEach(t => t.stop()); await api('/api/staff/calls', { method: 'POST', body: { action: 'leave', meetingId: meeting.id, sessionId: j.sessionId } }); return; }
      call.current = new OfficeCall(meeting.id, j.sessionId, stream, j.iceServers, {
        stream: (id, value) => {remoteStreams.current={...remoteStreams.current,[id]:value};setStreams(remoteStreams.current);}, connection: (id, value) => setStates(s => s[id]===value?s:({ ...s, [id]: value })),
        relayState:state=>{setRelayState(state);if(state==='ready')setRelayError('');},relayError:setRelayError,networkError:setNetworkError,
        room: value => { setRoom(value); if (!value.recording && recorder.current) stopRecording(); },
        config: setConfig, error: setError, synced: () => {}, ended: () => { cleanup(); setJoined(false); setError('The call ended or the connection expired.'); },
      },{officeRelay:j.officeRelay,audioContext:sound.current});
      setConfig(j); setSessionId(j.sessionId); setPreview(stream); setJoined(true); setMic(true); void call.current.poll();
    } catch (e) { local.current?.getTracks().forEach(t => t.stop());if(sound.current){void sound.current.close();sound.current=null;} setError(e.name === 'NotAllowedError' ? 'Microphone or camera permission was denied. Allow access in your browser, or choose voice only.' : e.message); }
    finally { setBusy(false); }
  }
  async function toggleVideo() {
    try {
      if (sharing) return;
      const track = local.current.getVideoTracks()[0];
      if (track) { track.enabled = !track.enabled; setVideo(track.enabled); }
      else { const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 } } }); const t = stream.getVideoTracks()[0]; await call.current.replaceVideo(t); local.current.addTrack(t); setVideo(true); }
    } catch (e) { setError(e.message); }
  }
  async function share() {
    try {
      setError('');
      if (screen.current) { screen.current.getTracks().forEach(t => t.stop()); screen.current = null; await call.current.replaceVideo(local.current.getVideoTracks()[0] || null); setPreview(local.current); setSharing(false); return; }
      if (!navigator.mediaDevices.getDisplayMedia) throw Error('Screen sharing is unavailable in this browser.');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, frameRate: { ideal: 15, max: 30 } }, audio: false }); screen.current = stream;
      if (!call.current || stopped.current) { stream.getTracks().forEach(t => t.stop()); screen.current = null; return; }
      await call.current.replaceVideo(stream.getVideoTracks()[0]); setPreview(stream); setSharing(true);
      stream.getVideoTracks()[0].onended = () => { screen.current = null; setPreview(local.current); setSharing(false); call.current?.replaceVideo(local.current?.getVideoTracks()[0] || null).catch(() => {}); };
    } catch (e) {
      screen.current?.getTracks().forEach(t => t.stop()); screen.current = null; setPreview(local.current); setSharing(false);
      setError(e.name === 'NotAllowedError' ? 'Screen sharing was cancelled or blocked by your browser. Select a screen and allow sharing. If your phone cannot share its screen, join from desktop Chrome or Edge.' : e.name === 'InvalidStateError' ? 'Keep this meeting tab active, then tap Share screen again.' : e.message);
    }
  }
  async function record() {
    if (recording) { stopRecording(); return; }
    try {
      setError(''); await call.current.send({ action: 'record', recording: true });
      recorder.current = recordCall(() => [...grid.current.querySelectorAll('video')].map(v => ({ video: v, name: v.dataset.callName })), () => [local.current, ...Object.values(remoteStreams.current).filter(Boolean)], blob => {
        if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
        const url = URL.createObjectURL(blob); recordingUrl.current = url;
        const name = `Orion-meeting-${new Date().toISOString().replace(/[:.]/g,'-')}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
        pendingDownload.current = { url, name, saved: false }; setDownload({ url, name }); setRecording(false); recorder.current = null;
        call.current?.send({ action: 'record', recording: false }).catch(() => {});
        // Leave and unmount still preserve the recording through a browser download.
        if (stopped.current) { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url),60000); }
      }, setError);
      setRecording(true);
    } catch (e) { setError(e.message); await call.current?.send({ action: 'record', recording: false }).catch(() => {}); }
  }
  async function leave(end = false) {
    if (end && !confirm('End this call for everyone?')) return;
    if (recording) stopRecording();
    if (end) { try { await call.current.send({ action: 'end' }); } catch (e) { setError(e.message); return; } }
    cleanup(); setJoined(false); setRoom(null); setStreams({}); setSharing(false); setVideo(true);
  }
  return <SectionCard style={{ marginBottom: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h2 style={{ color: C.heading, margin: 0 }}>Orion Meet</h2><p style={{ color: C.textMuted }}>{meeting.title} · Private staff room · Up to 6 participants</p></div><Btn small variant="ghost" onClick={() => { if (!joined || confirm('Leave this call?')) { cleanup(); onClose(); } }}>Close room</Btn></div>
    {error && <p role="alert" style={{ color: C.rose }}>{error}</p>}
    {networkError&&<p role="status" style={{color:C.textMuted}}>{networkError}</p>}
    {config && !config.relayConfigured && !config.officeRelay && <p role="status" style={{ color: C.text, background: C.amberDim, padding: 12, borderRadius: 8 }}>Limited network coverage: {config.relayUnavailable ? 'the call relay is temporarily unavailable' : 'the call relay is not configured'}. Calls may fail on some mobile or office networks.</p>}
    {joined&&config?.officeRelay&&relayState!=='ready'&&<p role="status" style={{color:C.textMuted}}>Office connection: {relayState}. {relayError}</p>}
    {!joined ? <div><p style={{ color: C.text }}>Join directly here. Your microphone and camera start only after you choose Join.</p><label style={{ display: 'block', marginBottom: 12, color: C.text }}><input type="checkbox" checked={video} onChange={e => setVideo(e.target.checked)} /> Use camera (untick for voice only)</label><label style={{ display: 'block', marginBottom: 16, color: C.text }}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree that the host may record this call. Everyone sees when recording is active.</label><Btn icon={video ? Video : Mic} onClick={join} disabled={busy || !config}>{busy ? 'Joining…' : video ? 'Join video call' : 'Join voice call'}</Btn></div> : <>
      <p role="status" style={{ color: room?.recording ? C.rose : C.textMuted }}>{room?.recording ? '● Recording is active. The host saves a copy on their device.' : `${room?.participants.length || 1} participant(s). Media is shared only with people in this room.`}</p>
      {room?.participants.length===1&&<p style={{color:C.textMuted}}>Waiting for another person to join this meeting. They should open this same meeting from Meetings or their call invitation.</p>}
      <div ref={grid} className="so-call-grid"><Tile stream={preview} name={`${me.fullName} (you)`} muted />{(room?.participants || []).filter(p => p.id !== sessionId).map(p => <Tile key={p.id} stream={streams[p.id]} name={p.name} state={states[p.id] || 'connecting'} />)}</div>
      <div className="so-call-controls"><Btn small variant="ghost" icon={mic ? Mic : MicOff} onClick={() => { const enabled = !mic; local.current.getAudioTracks().forEach(t => { t.enabled = enabled; }); setMic(enabled); }}>{mic ? 'Mute' : 'Unmute'}</Btn><Btn small variant="ghost" icon={video ? Video : VideoOff} onClick={toggleVideo} disabled={sharing}>{video ? 'Camera off' : 'Camera on'}</Btn><Btn small variant="ghost" icon={Monitor} onClick={share} disabled={!screenSupported} title={screenSupported ? "Share a tab, window or screen" : "This browser cannot broadcast its screen"}>{sharing ? 'Stop sharing' : 'Share screen'}</Btn>{host && <Btn small variant="ghost" icon={Circle} onClick={record} disabled={!recording && (!window.MediaRecorder || !room?.participants.every(p => p.consent))}>{recording ? 'Stop recording' : 'Record'}</Btn>}<Btn small danger icon={PhoneOff} onClick={() => leave()}>Leave</Btn>{host && <Btn small danger onClick={() => leave(true)}>End for everyone</Btn>}</div>
      {!screenSupported && <p role="status" style={{ color: C.textMuted, fontSize: 13 }}>This browser does not support broadcasting your screen. You can watch another participant?s shared screen here. To share your own, use a supported desktop browser such as Chrome or Edge.</p>}
      {host && <p style={{ color: C.textMuted, fontSize: 12 }}>Recording requires everyone’s agreement. Save the download before closing. Recordings stop at 30 minutes or 256 MB.</p>}
    </>}
    {download && <a href={download.url} download={download.name} onClick={() => { if (pendingDownload.current) pendingDownload.current.saved = true; }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.blue, marginTop: 14 }}><Download size={16} />Download meeting recording</a>}
  </SectionCard>;
}
