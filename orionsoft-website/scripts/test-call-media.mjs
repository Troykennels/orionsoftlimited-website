import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OfficeRelay } from '../src/staff/office-relay.js';
import { OfficeCall } from '../src/staff/call-engine.js';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const camera={kind:'video',id:'camera'},screen={kind:'video',id:'screen'},microphone={kind:'audio',id:'mic'};
const stream={getVideoTracks:()=>[camera],getAudioTracks:()=>[microphone]};
test('sharing source is retained for new participants and camera restoration',async()=>{
  const call=new OfficeCall('fixture','a',stream,[],{});
  await call.replaceVideo(screen);assert.equal(call.outgoingTrack('video'),screen);assert.equal(call.outgoingTrack('audio'),microphone);
  await call.replaceVideo(camera);assert.equal(call.outgoingTrack('video'),camera);
});
test('failed screen replacement restores all existing senders',async()=>{
  const call=new OfficeCall('fixture','a',stream,[],{});const tracks=[camera,camera];
  for(let i=0;i<2;i++)call.peers.set(String(i),{pc:{getTransceivers:()=>[{receiver:{track:{kind:'video'}},sender:{replaceTrack:async track=>{if(i===1&&track===screen)throw Error('encoding limit');tracks[i]=track;}}}]}});
  await assert.rejects(call.replaceVideo(screen),/could not send the shared screen/);
  assert.deepEqual(tracks,[camera,camera]);assert.equal(call.outgoingTrack('video'),camera);
});
test('simultaneous ICE messages queue and retry a busy room instead of disappearing',async()=>{
  const previous=globalThis.fetch,seen=[];let active=0,maximum=0;
  globalThis.fetch=async(_url,options)=>{active++;maximum=Math.max(maximum,active);seen.push(JSON.parse(options.body).data.candidate);await new Promise(resolve=>setTimeout(resolve,5));active--;return seen.length===1?{ok:false,status:409,json:async()=>({error:'The room is updating. Please try again.'})}:{ok:true,json:async()=>({ok:true})};};
  try{const call=new OfficeCall('fixture','a',stream,[],{});await Promise.all(['first','second'].map(candidate=>call.send({action:'signal',type:'candidate',data:{candidate}})));assert.equal(maximum,1);assert.deepEqual(seen,['first','first','second']);}finally{globalThis.fetch=previous;}
});
test('compatibility audio resamples speech correctly and stops publishing when unused',async()=>{
  let Processor;const buffers=[];
  class Base{constructor(){this.port={postMessage:buffer=>buffers.push(buffer)};}}
  runInNewContext(await readFile(new URL('../public/office-audio-worklet.js',import.meta.url),'utf8'),{AudioWorkletProcessor:Base,sampleRate:48000,registerProcessor:(_name,value)=>{Processor=value;}});
  const processor=new Processor();processor.port.onmessage({data:{enabled:true}});
  for(let i=0;i<375;i++)processor.process([[new Float32Array(128).fill(0.25)]]);
  assert.equal(buffers.length,25);assert.equal(buffers.reduce((n,b)=>n+b.byteLength/2,0),16000);assert.equal(new Int16Array(buffers[0])[0],8192);
  processor.port.onmessage({data:{enabled:false}});for(let i=0;i<375;i++)processor.process([[new Float32Array(128)]]);assert.equal(buffers.length,25);
});

test('a connected camera without incoming speech does not disable fallback audio',async()=>{
  const call=new OfficeCall('fixture','a',stream,[],{});
  const peer={pc:{connectionState:'connected',getStats:async()=>new Map([['audio',{type:'inbound-rtp',kind:'audio',packetsReceived:20}],['video',{type:'inbound-rtp',kind:'video',framesDecoded:10}]])},stream:{getVideoTracks:()=>[{readyState:'live',muted:false}]}};
  assert.equal(call.directReady(peer),false);
  await call.inspectMedia(peer);assert.equal(call.directReady(peer),true);
  peer.audioReceivedAt=Date.now()-7000;assert.equal(call.directReady(peer),false);
  peer.pc.getStats=async()=>new Map([['new',{type:'inbound-rtp',kind:'audio',packetsReceived:1}]]);
  await call.inspectMedia(peer);assert.equal(call.directReady(peer),true,'Source counter resets must recover');
});
test('slow uplink drops pictures before speech and caps image traffic',()=>{
  const previous=globalThis.WebSocket;globalThis.WebSocket={OPEN:1};
  try{
    const relay=new OfficeRelay({},null,{}),sent=[];relay.watchers=1;relay.socket={readyState:1,bufferedAmount:20000,send:packet=>sent.push(packet[0])};
    assert.equal(relay.send(1,new Uint8Array(30000)),false);
    assert.equal(relay.send(2,new Uint8Array(1280)),true);
    relay.socket.bufferedAmount=0;
    assert.equal(relay.send(1,new Uint8Array(50000)),true);
    assert.equal(relay.send(1,new Uint8Array(50000)),false);
    assert.deepEqual(sent,[2,1]);
  }finally{globalThis.WebSocket=previous;}
});
