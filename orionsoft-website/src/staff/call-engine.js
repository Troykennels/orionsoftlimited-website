import { api } from './api.js';

// Native WebRTC media; the authenticated API exchanges descriptions only.
export class OfficeCall {
  constructor(meetingId, sessionId, stream, iceServers, events) {
    Object.assign(this, { meetingId, sessionId, stream, iceServers, events });
    this.peers = new Map(); this.cursor = 0; this.closed = false;
    this.lastConfigRefresh = Date.now();
  }
  async send(body) { return api('/api/staff/calls', { method: 'POST', body: { meetingId: this.meetingId, sessionId: this.sessionId, ...body } }); }
  peer(id) {
    if (this.peers.has(id)) return this.peers.get(id);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const remote = new MediaStream();
    const peer = { pc, stream: remote, pending: [], restarted: false };
    this.peers.set(id, peer);
    // Only the offerer creates transceivers. The answerer binds its tracks to
    // those established by the incoming offer; precreating them can silently
    // negotiate one-way media on Unified Plan implementations.
    if (this.sessionId < id) for (const kind of ['audio','video']) pc.addTransceiver(this.stream.getTracks().find(t => t.kind === kind) || kind, { direction: 'sendrecv', streams: [this.stream] });
    pc.onicecandidate = event => { if (event.candidate) this.send({ action: 'signal', to: id, type: 'candidate', data: event.candidate.toJSON() }).catch(() => {}); };
    pc.ontrack = event => {
      const attach = () => { if (!remote.getTracks().includes(event.track)) remote.addTrack(event.track); this.events.stream(id, remote); };
      // An empty negotiated video receiver must not stall audio-only playback.
      if (event.track.kind === 'video' && event.track.muted) event.track.onunmute = attach;
      else attach();
    };
    pc.onconnectionstatechange = async () => {
      this.events.connection(id, pc.connectionState);
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
      const room = await api(`/api/staff/calls?meetingId=${encodeURIComponent(this.meetingId)}&sessionId=${this.sessionId}&after=${this.cursor}`);
      if (this.closed) return;
      this.events.room(room);
      if (Date.now() - this.lastConfigRefresh > 15 * 60000) {
        const config = await api(`/api/staff/calls?meetingId=${encodeURIComponent(this.meetingId)}&action=config`);
        this.iceServers = config.iceServers; this.lastConfigRefresh = Date.now();
        for (const { pc } of this.peers.values()) pc.setConfiguration({ iceServers: this.iceServers });
        this.events.config?.(config);
      }
      for (const [id, peer] of this.peers) if (!room.participants.some(p => p.id === id)) { peer.pc.close(); this.peers.delete(id); this.events.stream(id, null); }
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
              await transceiver.sender.replaceTrack(this.stream.getTracks().find(t => t.kind === transceiver.receiver.track.kind) || null);
            }
            await pc.setLocalDescription(await pc.createAnswer()); await this.send({ action: 'signal', to: signal.from, type: 'answer', data: pc.localDescription.toJSON() });
          }
        }
        this.cursor = Math.max(this.cursor, signal.seq);
      }
      this.cursor = Math.max(this.cursor, room.cursor);
      this.events.synced();
    } catch (e) {
      if (!this.closed) { this.events.error(e.message); if ([401,403,404,410].includes(e.status)) { this.events.ended(); return; } }
    }
    if (!this.closed) this.timer = setTimeout(() => this.poll(), 1500);
  }
  async replaceVideo(track) {
    await Promise.all([...this.peers.values()].map(({ pc }) => pc.getTransceivers().find(t => t.receiver.track.kind === 'video')?.sender.replaceTrack(track)));
  }
  close() {
    this.closed = true; clearTimeout(this.timer);
    for (const { pc } of this.peers.values()) pc.close(); this.peers.clear();
    this.send({ action: 'leave' }).catch(() => {});
  }
}

export function recordCall(tiles, streams, onSaved, onError) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw Error('Recording is not supported in this browser. Use current Chrome or Edge.');
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d'), audio = new AudioContext(), destination = audio.createMediaStreamDestination();
  const nodes = streams.filter(s => s.getAudioTracks().length).map(s => { const node = audio.createMediaStreamSource(s); node.connect(destination); return node; });
  const output = canvas.captureStream(20); for (const track of destination.stream.getAudioTracks()) output.addTrack(track);
  const type = ['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
  if (!type) { audio.close(); output.getTracks().forEach(t => t.stop()); throw Error('This browser cannot encode a recording.'); }
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
  function cleanup() { clearInterval(timer); clearTimeout(maximum); nodes.forEach(n => n.disconnect()); output.getTracks().forEach(t => t.stop()); void audio.close(); }
  recorder.ondataavailable = e => { if (e.data.size) { chunks.push(e.data); size += e.data.size; if (size > 256*1024*1024) stop(); } };
  recorder.onerror = () => { cleanup(); onError('Recording stopped unexpectedly.'); };
  recorder.onstop = () => { cleanup(); if (chunks.length) onSaved(new Blob(chunks, { type })); };
  void audio.resume(); recorder.start(1000);
  return { stop };
}
