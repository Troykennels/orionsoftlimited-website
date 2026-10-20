import { useEffect, useEffectEvent, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Circle, Download } from 'lucide-react';
import { C } from '../theme.js';
import { api } from '../api.js';
import { Btn, SectionCard } from '../components.jsx';
import { useOffice } from '../office.js';
import { OfficeCall, recordCall } from '../call-engine.js';

function EnlargedVideo({stream,name,onClose}) {
  const video=useRef(null),close=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement,player=video.current;
    close.current.focus();player.srcObject=stream;
    void player.play().catch(()=>{});
    const key=event=>{
      if(event.key==='Escape'){event.preventDefault();onClose();}
      // There is one dialog control; keep keyboard focus in the enlarged view.
      if(event.key==='Tab'){event.preventDefault();close.current?.focus();}
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);player.srcObject=null;previous?.focus();};
  },[stream,onClose]);
  return createPortal(<div role="dialog" aria-modal="true" aria-label={`${name} enlarged video`} style={{position:'fixed',inset:0,zIndex:10000,background:'#050a12',display:'flex',flexDirection:'column',padding:'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,color:'#fff',paddingBottom:12}}><strong>{name}</strong><button ref={close} onClick={onClose} style={{background:'#1e293b',color:'#fff',border:'1px solid #64748b',borderRadius:8,padding:'12px 16px',cursor:'pointer'}}>Close enlarged video</button></div><video ref={video} autoPlay playsInline muted style={{width:'100%',flex:1,minHeight:0,objectFit:'contain'}} /></div>,document.body);
}
// Keep speech independent of video decoding: an empty or stalled video track
// must never prevent the other person's microphone from playing.
function Tile({ stream, name, muted, state, resumeAudio }) {
  const ref = useRef(null), audio = useRef(null);
  const [blocked, setBlocked] = useState(false),[enlarged,setEnlarged]=useState(false);
  const closeEnlarged=useCallback(()=>setEnlarged(false),[]);
  useEffect(() => {
    const video = ref.current, speaker = audio.current;
    video.srcObject = stream || null;
    if (stream) void video.play().catch(() => {});
    const attachAudio = () => {
      if (speaker && stream?.getAudioTracks().length) {
        speaker.srcObject = new MediaStream(stream.getAudioTracks());
        void speaker.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
      }
    };
    attachAudio();stream?.addEventListener('addtrack',attachAudio);
    return () => { stream?.removeEventListener('addtrack',attachAudio);video.srcObject = null; if (speaker) speaker.srcObject = null; };
  }, [stream]);
  async function enableSound() {
    try { await Promise.all([resumeAudio(), audio.current.play()]); setBlocked(false); }
    catch { setBlocked(true); }
  }
  return <div className="so-call-tile"><video ref={ref} autoPlay playsInline muted data-call-name={name} />{!muted && <audio ref={audio} autoPlay playsInline data-call-audio={name} />}{blocked && <Btn small variant="blue" onClick={enableSound} style={{ position: 'absolute', top: 66, left: 12, minHeight:44 }}>Enable sound</Btn>}<Btn small variant="blue" icon={Maximize2} onClick={()=>setEnlarged(true)} disabled={!stream?.getVideoTracks().length} title={`Enlarge video: ${name}`} style={{position:'absolute',top:12,right:12,minHeight:44}}>Enlarge video</Btn><span>{name}{state && ` · ${state}`}</span>{enlarged&&<EnlargedVideo stream={stream} name={name} onClose={closeEnlarged}/>}</div>;
}
export default function CallRoom({ meeting, onClose }) {
  const { me } = useOffice();
  const host = me.id === meeting.hostId;
  const [video, setVideo] = useState(true), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [room, setRoom] = useState(null), [joined, setJoined] = useState(false), [mic, setMic] = useState(true), [sharing, setSharing] = useState(false), [recording, setRecording] = useState(false), [download, setDownload] = useState(null);
  const [screenSupported, setScreenSupported] = useState(() => typeof navigator.mediaDevices?.getDisplayMedia === 'function');
  const [preview, setPreview] = useState(null), [sessionId, setSessionId] = useState('');
  const [relayState,setRelayState]=useState('connecting'),[relayError,setRelayError]=useState('');
  const [networkError,setNetworkError]=useState('');
  const [audioBlocked,setAudioBlocked]=useState(false),[micProblem,setMicProblem]=useState(false),[shareBusy,setShareBusy]=useState(false),[expandedRoom,setExpandedRoom]=useState(false);
  const sound=useRef(null),remoteStreams=useRef({}),repairingAudio=useRef(false);
  const [streams, setStreams] = useState({}), [states, setStates] = useState({}), [config, setConfig] = useState(null);
  const call = useRef(null), local = useRef(null), screen = useRef(null), recorder = useRef(null), recordingUrl = useRef(null);
  const grid = useRef(null), stopped = useRef(false), pendingDownload = useRef(null);
  useEffect(() => { let cancelled = false; api(`/api/staff/calls?meetingId=${meeting.id}&action=config`,{signal:AbortSignal.timeout(10000)}).then(j => { if (!cancelled) setConfig(j); }).catch(e => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; }; }, [meeting.id]);
  const stopRecording = () => { recorder.current?.stop(); recorder.current = null; setRecording(false); if (call.current) call.current.send({ action: 'record', recording: false }).catch(() => {}); };
  function cleanup() { if (pendingDownload.current && !pendingDownload.current.saved) { const a = document.createElement('a'); a.href = pendingDownload.current.url; a.download = pendingDownload.current.name; a.click(); pendingDownload.current.saved = true; } stopped.current = true; recorder.current?.stop(); recorder.current = null; call.current?.close(); call.current = null; local.current?.getTracks().forEach(t => t.stop()); screen.current?.getTracks().forEach(t => t.stop()); remoteStreams.current={};if(sound.current){void sound.current.close();sound.current=null;}if(navigator.audioSession){try{navigator.audioSession.type='auto';}catch{/* optional browser API */}} }
  useEffect(() => {
    const before = e => { if (call.current || pendingDownload.current && !pendingDownload.current.saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', before);
    return () => { window.removeEventListener('beforeunload', before); cleanup(); if (recordingUrl.current) { const url = recordingUrl.current; setTimeout(() => URL.revokeObjectURL(url),60000); } };
  }, []);
  async function resumeAudio() {
    if (sound.current && sound.current.state !== 'running') {
      let timer;
      try { await Promise.race([sound.current.resume(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Audio is still paused by your phone. Keep this tab open and try Restore audio.')),2500);})]); }
      finally { clearTimeout(timer); }
    }
    const blocked = !!sound.current && sound.current.state !== 'running';
    setAudioBlocked(blocked);
    if (blocked) throw Error('Tap Enable meeting audio to allow sound.');
  }
  async function enableAudio(repairMicrophone=false) {
    // Start all playback operations within the same user gesture, before awaits.
    const tasks = [resumeAudio(), ...[...(grid.current?.querySelectorAll('audio')||[])].filter(a => a.srcObject).map(a => a.play())];
    const results = await Promise.allSettled(tasks);
    setAudioBlocked(results.some(result => result.status === 'rejected'));
    const track=local.current?.getAudioTracks()[0];
    if(!repairingAudio.current&&call.current&&(repairMicrophone||!track||track.muted||track.readyState!=='live')){
      const repairingCall=call.current;repairingAudio.current=true;
      try{
        const fresh=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
        const next=fresh.getAudioTracks()[0];next.enabled=track?.enabled!==false;
        if(call.current!==repairingCall){next.stop();return;}
        await repairingCall.replaceAudio(next);setMicProblem(false);setError('');
      }catch(e){setError(`Microphone recovery failed: ${e.message}`);}finally{repairingAudio.current=false;}
    }
  }
  const restoreAudio=useEffectEvent(()=>{void enableAudio().catch(()=>setAudioBlocked(true));});
  useEffect(() => {
    const restore = () => { if (sound.current && document.visibilityState === 'visible') restoreAudio(); };
    const check=setInterval(()=>{const track=local.current?.getAudioTracks()[0];setMicProblem(!!track&&(track.muted||track.readyState!=='live'));},2000);
    document.addEventListener('visibilitychange',restore);
    window.addEventListener('pageshow',restore);
    return () => { clearInterval(check);document.removeEventListener('visibilitychange',restore); window.removeEventListener('pageshow',restore); };
  }, []);
  useEffect(()=>{
    if(!expandedRoom)return;
    const restore=event=>{if(event.key==='Escape'&&!event.defaultPrevented)setExpandedRoom(false);};
    window.addEventListener('keydown',restore);
    return()=>window.removeEventListener('keydown',restore);
  },[expandedRoom]);
  async function join() {
    if (busy) return; setBusy(true); setError(''); stopped.current = false;
    try {
      if(navigator.audioSession){try{navigator.audioSession.type='play-and-record';}catch{/* optional browser API */}}
      if(config?.officeRelay){const Audio=window.AudioContext||window.webkitAudioContext;sound.current=new Audio();sound.current.onstatechange=()=>{if(sound.current)setAudioBlocked(sound.current.state!=='running');};void resumeAudio().catch(()=>setAudioBlocked(true));setRelayState('connecting');setRelayError('');}
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw Error('Calls need HTTPS and a current browser with microphone access.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } } : false });
      if (stopped.current) { stream.getTracks().forEach(t => t.stop()); return; }
      local.current = stream;void resumeAudio().catch(()=>setAudioBlocked(true));
      const j = await api('/api/staff/calls', { method: 'POST', body: { action: 'join', meetingId: meeting.id, consent },signal:AbortSignal.timeout(10000) });
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
      else { const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } } }); const t = stream.getVideoTracks()[0]; await call.current.replaceVideo(t); local.current.addTrack(t); setVideo(true); }
    } catch (e) { setError(e.message); }
  }
  async function share() {
    if(shareBusy)return;
    setShareBusy(true);
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
      if(['NotSupportedError','TypeError'].includes(e.name))setScreenSupported(false);
      setError(e.name === 'NotSupportedError'||e.name === 'TypeError' ? 'This browser cannot broadcast its screen. You can view shared screens here; use desktop Chrome or Edge to present.' : e.name === 'NotAllowedError' ? 'Screen sharing was cancelled or blocked by your browser. Select a screen and allow sharing. If your phone cannot share its screen, join from desktop Chrome or Edge.' : e.name === 'InvalidStateError' ? 'Keep this meeting tab active, then tap Share screen again.' : e.message);
    }finally{setShareBusy(false);}
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
  return <SectionCard style={{ marginBottom: 20,...(expandedRoom?{position:'fixed',inset:8,zIndex:5000,overflowY:'auto',marginBottom:0}: {}) }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h2 style={{ color: C.heading, margin: 0 }}>Orion Meet</h2><p style={{ color: C.textMuted }}>{meeting.title} · Private staff room · Up to 6 participants</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Btn small variant="ghost" icon={expandedRoom?Minimize2:Maximize2} onClick={()=>setExpandedRoom(value=>!value)}>{expandedRoom?'Restore meeting':'Expand meeting'}</Btn><Btn small variant="ghost" onClick={() => { if (!joined || confirm('Leave this call?')) { cleanup(); onClose(); } }}>Close room</Btn></div></div>
    {error && <p role="alert" style={{ color: C.rose }}>{error}</p>}
    {joined&&audioBlocked&&<p role="status" style={{color:C.text}}><Btn small variant="blue" onClick={() => void enableAudio()}>Enable meeting audio</Btn> Your browser paused meeting sound. Tap to resume.</p>}
    {joined&&micProblem&&<p role="status" style={{color:C.rose}}>Your phone has paused the microphone. Keep the meeting open and tap Restore audio.</p>}
    {networkError&&<p role="status" style={{color:C.textMuted}}>{networkError}</p>}
    {config && !config.relayConfigured && !config.officeRelay && <p role="status" style={{ color: C.text, background: C.amberDim, padding: 12, borderRadius: 8 }}>Limited network coverage: {config.relayUnavailable ? 'the call relay is temporarily unavailable' : 'the call relay is not configured'}. Calls may fail on some mobile or office networks.</p>}
    {joined&&Object.values(states).some(state=>state!=='Direct connection')&&config?.officeRelay&&relayState!=='ready'&&<p role="status" style={{color:C.textMuted}}>Office connection: {relayState}. {relayError}</p>}
    {!joined ? <div><p style={{ color: C.text }}>Join directly here. Your microphone and camera start only after you choose Join.</p><label style={{ display: 'block', marginBottom: 12, color: C.text }}><input type="checkbox" checked={video} onChange={e => setVideo(e.target.checked)} /> Use camera (untick for voice only)</label><label style={{ display: 'block', marginBottom: 16, color: C.text }}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree that the host may record this call. Everyone sees when recording is active.</label><Btn icon={video ? Video : Mic} onClick={join} disabled={busy || !config}>{busy ? 'Joining…' : video ? 'Join video call' : 'Join voice call'}</Btn></div> : <>
      <p role="status" style={{ color: room?.recording ? C.rose : C.textMuted }}>{room?.recording ? '● Recording is active. The host saves a copy on their device.' : `${room?.participants.length || 1} participant(s). Media is shared only with people in this room.`}</p>
      {room?.participants.length===1&&<p style={{color:C.textMuted}}>Waiting for another person to join this meeting. They should open this same meeting from Meetings or their call invitation.</p>}
      <div ref={grid} className="so-call-grid"><Tile stream={preview} name={`${me.fullName} (you)`} muted />{(room?.participants || []).filter(p => p.id !== sessionId).map(p => <Tile key={p.id} stream={streams[p.id]} name={p.name} state={states[p.id] || 'Connecting'} resumeAudio={resumeAudio} />)}</div>
      <div className="so-call-controls"><Btn small variant="ghost" icon={mic ? Mic : MicOff} onClick={() => { const enabled = !mic; local.current.getAudioTracks().forEach(t => { t.enabled = enabled; }); setMic(enabled); }}>{mic ? 'Mute' : 'Unmute'}</Btn><Btn small variant="ghost" icon={video ? Video : VideoOff} onClick={toggleVideo} disabled={sharing}>{video ? 'Camera off' : 'Camera on'}</Btn><Btn small variant="ghost" icon={Monitor} onClick={share} disabled={!screenSupported||shareBusy} title={screenSupported ? "Share a tab, window or screen" : "This browser cannot broadcast its screen"}>{shareBusy ? 'Choose screen…' : sharing ? 'Stop sharing' : 'Share screen'}</Btn>{host && <Btn small variant="ghost" icon={Circle} onClick={record} disabled={!recording && (!window.MediaRecorder || !room?.participants.every(p => p.consent))}>{recording ? 'Stop recording' : 'Record'}</Btn>}<Btn small variant="ghost" onClick={() => void enableAudio(true)}>Restore audio</Btn><Btn small danger icon={PhoneOff} onClick={() => leave()}>Leave</Btn>{host && <Btn small danger onClick={() => leave(true)}>End for everyone</Btn>}</div>
      {!screenSupported && <p role="status" style={{ color: C.textMuted, fontSize: 13 }}>This browser does not support broadcasting your screen. You can watch another participant’s shared screen here. To share your own, use a supported desktop browser such as Chrome or Edge.</p>}
      {host && <p style={{ color: C.textMuted, fontSize: 12 }}>Recording requires everyone’s agreement. Save the download before closing. Recordings stop at 30 minutes or 256 MB.</p>}
    </>}
    {download && <a href={download.url} download={download.name} onClick={() => { if (pendingDownload.current) pendingDownload.current.saved = true; }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.blue, marginTop: 14 }}><Download size={16} />Download meeting recording</a>}
  </SectionCard>;
}
