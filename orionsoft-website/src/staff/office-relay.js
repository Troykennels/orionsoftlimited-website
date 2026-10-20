// Compatibility media over authenticated WSS on Orion's existing API hosting.
// Small JPEG frames and speech PCM avoid UDP/NAT dependencies. WebRTC remains
// preferred whenever direct media actually arrives. No media is stored here.
export class OfficeRelay {
  constructor(call,audioContext,events){this.call=call;this.audio=audioContext;this.events=events;this.remotes=new Map();this.closed=false;this.watching=[];this.watchers=0;this.backoff=1000;this.videoRate=160000;this.videoCredit=64000;this.creditAt=Date.now();}
  async start(){
    if(this.closed)return;
    try{
      if(!this.audio?.audioWorklet)throw Error('Your browser needs AudioWorklet support for the office connection. Use a current browser.');
      if(!this.source){
        await this.audio.audioWorklet.addModule('/office-audio-worklet.js');
        if(this.closed)return;
        this.source=this.audio.createMediaStreamSource(this.call.stream);
        this.node=new AudioWorkletNode(this.audio,'orion-call-audio');
        this.node.port.onmessage=event=>this.send(2,new Uint8Array(event.data));
        this.source.connect(this.node);this.node.connect(this.audio.destination);
        this.preview=document.createElement('video');this.preview.muted=true;this.preview.playsInline=true;
        this.canvas=document.createElement('canvas');this.canvas.width=640;this.canvas.height=360;this.context=this.canvas.getContext('2d');
        this.frameTimer=setInterval(()=>void this.videoFrame(),100);
      }
      const ticket=await this.call.send({action:'relay-ticket'});if(this.closed)return;
      this.socket=new WebSocket(ticket.url,['orion-meet',ticket.ticket]);this.socket.binaryType='arraybuffer';
      this.connectTimer=setTimeout(()=>{if(this.socket?.readyState===WebSocket.CONNECTING){this.events.error('Media connection timed out. Retrying automatically.');this.socket.close();}},10000);
      this.socket.onopen=()=>{clearTimeout(this.connectTimer);this.backoff=1000;this.events.status('ready');this.watch(this.watching,true);};
      this.socket.onmessage=event=>{if(typeof event.data==='string'){try{const message=JSON.parse(event.data);if(message.type==='watchers'){const count=Math.max(0,Number(message.count)||0);if(Boolean(count)!==Boolean(this.watchers))this.node.port.postMessage({enabled:count>0});this.watchers=count;}}catch{/* malformed control */}return;}void this.receive(new Uint8Array(event.data));};
      this.socket.onerror=()=>this.events.status('reconnecting');
      this.socket.onclose=event=>{clearTimeout(this.connectTimer);if(event.code===4008)this.videoRate=Math.max(48000,this.videoRate*0.65);if(event.code===4003)this.events.status('unavailable');this.events.error(event.code===4008?'Connection is congested. Reducing video traffic and reconnecting.':event.code===4003?'Meeting access ended. Leave and rejoin the room.':this.closed?'':'Media connection interrupted. Retrying automatically.');this.watchers=0;this.node?.port.postMessage({enabled:false});if(!this.closed&&event.code!==4003){this.events.status('reconnecting');this.timer=setTimeout(()=>this.start(),this.backoff);this.backoff=Math.min(10000,this.backoff*2);}};
    }catch(e){if(!this.closed){this.events.status('unavailable');this.events.error(e.message);this.timer=setTimeout(()=>this.start(),5000);}}
  }
  replaceMicrophone(){
    if(!this.node)return;
    this.source?.disconnect();this.source=this.audio.createMediaStreamSource(new MediaStream(this.call.stream.getAudioTracks()));this.source.connect(this.node);
  }
  watch(ids,force=false){
    const next=[...ids].sort();if(!force&&JSON.stringify(next)===JSON.stringify(this.watching))return;
    this.watching=next;if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type:'watch',ids:next}));
  }
  send(kind,bytes){
    if(this.closed||!this.watchers||this.socket?.readyState!==WebSocket.OPEN)return false;
    // Never queue pictures ahead of speech on a slow uplink. Bound video to
    // 160 KB/s, below the server ceiling including 32 KB/s microphone audio.
    if(kind===1){
      const now=Date.now();this.videoCredit=Math.min(64000,this.videoCredit+(now-this.creditAt)*this.videoRate/1000);this.creditAt=now;
      if(this.socket.bufferedAmount>16*1024||bytes.length>this.videoCredit)return false;
      this.videoCredit-=bytes.length;
    }else if(this.socket.bufferedAmount>64*1024)return false;
    const packet=new Uint8Array(1+bytes.length);packet[0]=kind;packet.set(bytes,1);this.socket.send(packet);return true;
  }
  async videoFrame(){
    if(!this.watchers||this.encoding||this.closed)return;
    const track=this.call.outgoingTrack('video');
    const blank=!track||!track.enabled||track.readyState!=='live';
    if(blank&&Date.now()-(this.lastBlank||0)<1000)return;
    if(!blank&&this.track!==track){this.track=track;this.preview.srcObject=new MediaStream([track]);await this.preview.play().catch(()=>{});}
    if(this.closed||!blank&&this.preview.readyState<2)return;
    this.context.fillStyle='#0b1120';this.context.fillRect(0,0,640,360);
    if(!blank){const scale=Math.min(640/this.preview.videoWidth,360/this.preview.videoHeight),w=this.preview.videoWidth*scale,h=this.preview.videoHeight*scale;this.context.drawImage(this.preview,(640-w)/2,(360-h)/2,w,h);}else this.lastBlank=Date.now();this.encoding=true;
    try{const blob=await new Promise(resolve=>this.canvas.toBlob(resolve,'image/jpeg',0.75));if(blob&&blob.size<95*1024)this.send(1,new Uint8Array(await blob.arrayBuffer()));}finally{this.encoding=false;}
  }
  remote(id){
    if(this.remotes.has(id))return this.remotes.get(id);
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#0b1120';ctx.fillRect(0,0,640,360);
    const stream=canvas.captureStream(10),destination=this.audio.createMediaStreamDestination();
    for(const track of destination.stream.getAudioTracks())stream.addTrack(track);
    const value={canvas,ctx,stream,destination,nextAudio:0,received:false,decoding:false,audioSeenAt:0,videoSeenAt:0,sources:new Set()};this.remotes.set(id,value);return value;
  }
  async receive(packet){
    if(this.closed||packet.length<38)return;
    const id=new TextDecoder().decode(packet.subarray(1,37));
    if(!this.call.peers.has(id))return;
    const value=this.remote(id),body=packet.subarray(37);
    if(packet[0]===2&&body.length===1280){
      const pcm=new DataView(body.buffer,body.byteOffset,body.byteLength),buffer=this.audio.createBuffer(1,640,16000),samples=buffer.getChannelData(0);
      for(let i=0;i<640;i++)samples[i]=pcm.getInt16(i*2,true)/32768;
      // A suspended mobile AudioContext must not accumulate seconds of stale
      // speech to play when unlocked. A 160 ms jitter buffer absorbs TCP bursts.
      if(this.audio.state!=='running')return;
      const now=this.audio.currentTime;
      if(value.nextAudio<now||value.nextAudio>now+0.6){
        for(const active of value.sources){try{active.stop();}catch{/* already ended */}}
        value.sources.clear();value.nextAudio=now+0.16;
      }
      const source=this.audio.createBufferSource();source.buffer=buffer;source.connect(value.destination);source.start(value.nextAudio);value.nextAudio+=buffer.duration;
      value.sources.add(source);source.onended=()=>{source.disconnect();value.sources.delete(source);};value.audioSeenAt=Date.now();
    }else if(packet[0]===1&&!value.decoding){
      value.decoding=true;
      try{
        const blob=new Blob([body],{type:'image/jpeg'});
        if(window.createImageBitmap){const image=await createImageBitmap(blob);if(!this.closed)value.ctx.drawImage(image,0,0,640,360);image.close();}
        else{const url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;await image.decode();if(!this.closed)value.ctx.drawImage(image,0,0,640,360);}finally{URL.revokeObjectURL(url);}}
        value.videoSeenAt=Date.now();
      }catch{/* discard a damaged frame */}finally{value.decoding=false;}
    }else return;
    value.received=true;this.events.media(id,value.stream);
  }
  remove(id){const value=this.remotes.get(id);if(!value)return;for(const source of value.sources){try{source.stop();}catch{/* already stopped */}source.disconnect();}value.destination.disconnect();value.stream.getTracks().forEach(t=>t.stop());this.remotes.delete(id);}
  close(){this.closed=true;clearTimeout(this.timer);clearTimeout(this.connectTimer);clearInterval(this.frameTimer);this.socket?.close();this.source?.disconnect();this.node?.disconnect();if(this.node)this.node.port.onmessage=null;if(this.preview)this.preview.srcObject=null;for(const id of this.remotes.keys())this.remove(id);}
}
