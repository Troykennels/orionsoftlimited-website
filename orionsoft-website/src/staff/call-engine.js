import { api } from './api.js';
import { OfficeRelay } from './office-relay.js';

// Native WebRTC media; the authenticated API exchanges descriptions only.
export class OfficeCall {
  constructor(meetingId, sessionId, stream, iceServers, events, options = {}) {
    Object.assign(this, { meetingId, sessionId, stream, iceServers, events });
    this.peers = new Map(); this.cursor = 0; this.closed = false;
    this.lastConfigRefresh = Date.now();
    this.videoTrack = stream.getVideoTracks()[0] || null;
    if(options.officeRelay && options.audioContext){
      this.relay=new OfficeRelay(this,options.audioContext,{
        status:status=>events.relayState?.(status),error:message=>events.relayError?.(message),
        media:id=>this.updateChoice(id),
      });
      void this.relay.start();
    }
  }
  directReady(peer){
    // An ICE connection and a live video track do not prove that speech arrived.
    const now=Date.now(),video=peer.stream.getVideoTracks().some(t=>t.readyState==='live'&&!t.muted);
    return peer.pc.connectionState==='connected'&&now-(peer.audioReceivedAt||0)<6000&&(!video||now-(peer.videoReceivedAt||0)<6000);
  }
  async inspectMedia(peer){
    try{
      const stats=await peer.pc.getStats();
      stats.forEach(stat=>{
        if(stat.type!=='inbound-rtp')return;
        const kind=stat.kind||stat.mediaType;if(!['audio','video'].includes(kind))return;
        const count=kind==='audio'?stat.packetsReceived:stat.framesDecoded;
        peer.mediaCounts||=new Map();const key=stat.id||`${kind}:${stat.ssrc||''}`,previous=peer.mediaCounts.get(key)||0;
        // A new SSRC or a counter reset after source replacement is fresh media.
        if(count>0&&count!==previous)peer[kind+'ReceivedAt']=Date.now();
        peer.mediaCounts.set(key,count||0);
      });
    }catch{/* Browser statistics may be temporarily unavailable during negotiation. */}
  }
  updateChoice(id){
    const peer=this.peers.get(id);if(!peer||this.closed)return;
    const direct=this.directReady(peer),backup=this.relay?.remotes.get(id);
    const fresh=backup?.received&&Date.now()-Math.max(backup.audioSeenAt,backup.videoSeenAt)<5000;
    const stream=direct?peer.stream:fresh?backup.stream:null;
    if(stream&&peer.chosen!==stream){peer.chosen=stream;this.events.stream(id,stream);}
    if(!stream&&peer.chosen){peer.chosen=null;this.events.stream(id,null);}
    this.events.connection(id,stream?(direct?'Direct connection':'Office compatibility connection'):Date.now()-peer.createdAt>12000?'No media received - check connection or rejoin':'Connecting');
    this.relay?.watch([...this.peers].filter(([,p])=>!this.directReady(p)).map(([key])=>key));
  }
  outgoingTrack(kind) { return kind === 'video' ? this.videoTrack : this.stream.getAudioTracks()[0] || null; }
  send(body) {
    const task=async()=>{
      for(let attempt=0;attempt<6;attempt++){
        if(this.closed&&body.action==='signal')return {ok:false};
        try{return await api('/api/staff/calls',{method:'POST',keepalive:body.action==='leave',signal:AbortSignal.timeout(8000),body:{meetingId:this.meetingId,sessionId:this.sessionId,...body}});}
        catch(e){if(attempt===5||!(e.status===503||e.status===409&&/room is updating/i.test(e.message)||!e.status))throw e;await new Promise(resolve=>setTimeout(resolve,80*2**attempt+Math.random()*80));}
      }
    };
    if(body.action!=='signal')return task();
    const result=(this.signalQueue||Promise.resolve()).then(task);this.signalQueue=result.catch(()=>{});return result;
  }
  peer(id) {
    if (this.peers.has(id)) return this.peers.get(id);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const remote = new MediaStream();
    const peer = { pc, stream: remote, pending: [], restarted: false, createdAt: Date.now() };
    this.peers.set(id, peer);
    // Only the offerer creates transceivers. The answerer binds its tracks to
    // those established by the incoming offer; precreating them can silently
    // negotiate one-way media on Unified Plan implementations.
    if (this.sessionId < id) for (const kind of ['audio','video']) pc.addTransceiver(this.outgoingTrack(kind) || kind, { direction: 'sendrecv', streams: [this.stream] });
    pc.onicecandidate = event => { if (event.candidate) this.send({ action: 'signal', to: id, type: 'candidate', data: event.candidate.toJSON() }).catch(() => {}); };
    pc.ontrack = event => {
      const attach = () => { if (!remote.getTracks().includes(event.track)) remote.addTrack(event.track); this.updateChoice(id); };
      // An empty negotiated video receiver must not stall audio-only playback.
      if (event.track.kind === 'video' && event.track.muted) event.track.onunmute = attach;
      else attach();
    };
    pc.onconnectionstatechange = async () => {
      this.updateChoice(id);
      if (pc.connectionState === 'failed' && this.sessionId < id && !peer.restarted && !this.closed) {
        peer.restarted = true;
        try { await pc.setLocalDescription(await pc.createOffer({ iceRestart: true })); await this.send({ action: 'signal', to: id, type: 'offer', data: pc.localDescription.toJSON() }); }
        catch { this.events.error('Connection recovery failed. Leave and rejoin the call.'); }
      }
    };
    return peer;
  }
  async poll() {
    if (this.closed) return;
    try {
      const room = await api(`/api/staff/calls?meetingId=${encodeURIComponent(this.meetingId)}&sessionId=${this.sessionId}&after=${this.cursor}`,{signal:AbortSignal.timeout(8000)});
      if (this.closed) return;
      this.events.room(room);
      if (Date.now() - this.lastConfigRefresh > 15 * 60000) {
        const config = await api(`/api/staff/calls?meetingId=${encodeURIComponent(this.meetingId)}&action=config`);
        this.iceServers = config.iceServers; this.lastConfigRefresh = Date.now();
        for (const { pc } of this.peers.values()) pc.setConfiguration({ iceServers: this.iceServers });
        this.events.config?.(config);
      }
      for (const [id, peer] of this.peers) if (!room.participants.some(p => p.id === id)) { peer.pc.close(); this.peers.delete(id); this.relay?.remove(id);this.events.stream(id, null); }
      for (const p of room.participants) if (p.id !== this.sessionId && !this.peers.has(p.id)) {
        const { pc } = this.peer(p.id);
        if (this.sessionId < p.id) { await pc.setLocalDescription(await pc.createOffer()); await this.send({ action: 'signal', to: p.id, type: 'offer', data: pc.localDescription.toJSON() }); }
      }
      for (const signal of room.signals) {
        if (!room.participants.some(p => p.id === signal.from)) continue;
        const peer = this.peer(signal.from), pc = peer.pc;
        if (signal.type === 'candidate') {
          if (pc.remoteDescription) await pc.addIceCandidate(signal.data); else peer.pending.push(signal.data);
        } else {
          await pc.setRemoteDescription(signal.data);
          for (const candidate of peer.pending.splice(0)) await pc.addIceCandidate(candidate);
          if (signal.type === 'offer') {
            for (const transceiver of pc.getTransceivers()) {
              transceiver.direction = 'sendrecv';
              await transceiver.sender.replaceTrack(this.outgoingTrack(transceiver.receiver.track.kind));
            }
            await pc.setLocalDescription(await pc.createAnswer()); await this.send({ action: 'signal', to: signal.from, type: 'answer', data: pc.localDescription.toJSON() });
          }
        }
        this.cursor = Math.max(this.cursor, signal.seq);
      }
      this.cursor = Math.max(this.cursor, room.cursor);
      await Promise.all([...this.peers.values()].map(peer=>this.inspectMedia(peer)));
      for(const id of this.peers.keys())this.updateChoice(id);
      this.failures=0;this.events.networkError?.('');
      this.events.synced();
    } catch (e) {
      if (!this.closed) {
        if([401,403,404,410].includes(e.status)){this.events.error(e.message);this.events.ended();return;}
        this.failures=(this.failures||0)+1;
        if(e.status!==409||this.failures>=3)this.events.networkError?.('Office connection interrupted. Retrying automatically…');
      }
    }
    if (!this.closed) this.timer = setTimeout(() => this.poll(), 1500);
  }
  async replaceAudio(track) {
    const previous=this.outgoingTrack('audio');
    const senders=[...this.peers.values()].map(({pc})=>pc.getTransceivers().find(t=>t.receiver.track.kind==='audio')?.sender).filter(Boolean);
    const results=await Promise.allSettled(senders.map(sender=>sender.replaceTrack(track)));
    if(results.some(result=>result.status==='rejected')){
      await Promise.allSettled(senders.map(sender=>sender.replaceTrack(previous)));
      track.stop();throw Error('Could not restore the microphone. Leave and rejoin the call.');
    }
    this.stream.getAudioTracks().forEach(old=>this.stream.removeTrack(old));this.stream.addTrack(track);
    this.relay?.replaceMicrophone();previous?.stop();
  }
  async replaceVideo(track) {
    const previous = this.videoTrack;
    this.videoTrack = track;
    const senders = [...this.peers.values()].map(({ pc }) => pc.getTransceivers().find(t => t.receiver.track.kind === 'video')?.sender).filter(Boolean);
    const results = await Promise.allSettled(senders.map(sender => sender.replaceTrack(track)));
    if (results.some(result => result.status === 'rejected')) {
      this.videoTrack = previous;
      await Promise.allSettled(senders.map(sender => sender.replaceTrack(previous)));
      throw Error('Your browser could not send the shared screen. Try sharing a browser tab in current desktop Chrome or Edge.');
    }
  }
  close() {
    this.closed = true; clearTimeout(this.timer);
    this.relay?.close();
    for (const { pc } of this.peers.values()) pc.close(); this.peers.clear();
    this.send({ action: 'leave' }).catch(() => {});
  }
}

export function recordCall(tiles, streams, onSaved, onError) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw Error('Recording is not supported in this browser. Use current Chrome or Edge.');
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d'), audio = new AudioContext(), destination = audio.createMediaStreamDestination();
  const nodes = new Map(), readStreams=typeof streams==='function'?streams:()=>streams;
  function syncAudio(){
    const active=new Map(readStreams().filter(s=>s?.getAudioTracks().length).map(s=>[s.id+':'+s.getAudioTracks().map(t=>t.id).join(','),s]));
    for(const [id,node]of nodes)if(!active.has(id)){node.disconnect();nodes.delete(id);}
    for(const [id,stream]of active)if(!nodes.has(id)){const node=audio.createMediaStreamSource(stream);node.connect(destination);nodes.set(id,node);}
  }
  syncAudio();const audioTimer=setInterval(syncAudio,250);
  const output = canvas.captureStream(20); for (const track of destination.stream.getAudioTracks()) output.addTrack(track);
  const type = ['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
  if (!type) { clearInterval(audioTimer);for(const node of nodes.values())node.disconnect();audio.close(); output.getTracks().forEach(t => t.stop()); throw Error('This browser cannot encode a recording.'); }
  const recorder = new MediaRecorder(output, { mimeType: type, videoBitsPerSecond: 1600000 });
  const chunks = []; let size = 0;
  function draw() {
    ctx.fillStyle = '#0b1120'; ctx.fillRect(0,0,1280,720);
    const list = tiles(), cols = list.length > 1 ? 2 : 1, rows = Math.max(1, Math.ceil(list.length / cols)), w = 1280 / cols, h = 720 / rows;
    list.forEach(({ video, name }, i) => {
      const x = (i % cols) * w, y = Math.floor(i / cols) * h;
      if (video?.readyState >= 2 && video.videoWidth) { const ratio = Math.min(w / video.videoWidth, h / video.videoHeight); ctx.drawImage(video, x+(w-video.videoWidth*ratio)/2, y+(h-video.videoHeight*ratio)/2, video.videoWidth*ratio, video.videoHeight*ratio); }
      ctx.fillStyle = '#152740'; ctx.fillRect(x+8,y+h-38,w-16,30); ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText(name.slice(0,60),x+18,y+h-17,w-36);
    });
  }
  const timer = setInterval(draw, 50); draw();
  const stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };
  const maximum = setTimeout(stop, 30 * 60000);
  function cleanup() { clearInterval(timer);clearInterval(audioTimer); clearTimeout(maximum); nodes.forEach(n => n.disconnect()); output.getTracks().forEach(t => t.stop()); void audio.close(); }
  recorder.ondataavailable = e => { if (e.data.size) { chunks.push(e.data); size += e.data.size; if (size > 256*1024*1024) stop(); } };
  recorder.onerror = () => { cleanup(); onError('Recording stopped unexpectedly.'); };
  recorder.onstop = () => { cleanup(); if (chunks.length) onSaved(new Blob(chunks, { type })); };
  void audio.resume(); recorder.start(1000);
  return { stop };
}
