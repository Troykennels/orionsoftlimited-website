import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OfficeCall } from '../src/staff/call-engine.js';
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
