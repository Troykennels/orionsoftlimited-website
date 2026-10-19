import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import WebSocket from 'ws';
process.env.NODE_ENV='test';
for(const key of Object.keys(process.env))if(/REDIS|UPSTASH|KV_REST|DATA_DIR|GMAIL|BREVO|SMTP|VAPID/.test(key))delete process.env[key];
const store=await import('../api/store.js');assert.equal(store.storeBackend(),'mem');
const {putRecord}=await import('../api/_lib/records.js');
const {attachOfficeRelay,issueRelayTicket,boundedJpeg}=await import('../api/_lib/call-relay.js');
const server=createServer((req,res)=>{res.writeHead(404);res.end();});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;process.env.CALL_OFFICE_RELAY_URL=origin.replace('http:','ws:')+'/api/staff/call-media';
const closeRelay=attachOfficeRelay(server,{allowedOrigins:[origin]});
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
for(const [i,userId]of ['a','b','c'].entries())await putRecord('employees',userId,{id:userId,status:'active',fullName:userId});
await putRecord('meetings','relay-fixture',{id:'relay-fixture',status:'scheduled',roomMode:'internal',hostId:'a',attendeeIds:['b']});
await putRecord('meetings','other-fixture',{id:'other-fixture',status:'scheduled',roomMode:'internal',hostId:'c',attendeeIds:[]});
await store.setExpiring('orionsoft:call:relay-fixture',{participants:['a','b'].map((userId,i)=>({id:ids[i],userId,seenAt:Date.now()})),ended:false},60);
await store.setExpiring('orionsoft:call:other-fixture',{participants:[{id:ids[2],userId:'c',seenAt:Date.now()}],ended:false},60);
function connect(ticket,from=origin){return new Promise((resolve,reject)=>{const ws=new WebSocket(process.env.CALL_OFFICE_RELAY_URL,['orion-meet',ticket],{origin:from});ws.once('open',()=>resolve(ws));ws.once('error',reject);});}
function packet(ws){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',onMessage);reject(Error('No media packet received'));},2000);function onMessage(data,binary){if(binary){clearTimeout(timer);ws.off('message',onMessage);resolve(data);}}ws.on('message',onMessage);});}
test('office relay authenticates one-use tickets, scopes rooms and attributes packets',async()=>{
  const sockets=[];
  try{
    await assert.rejects(connect('00000000-0000-4000-8000-000000000000'),/401/);
    const a=await issueRelayTicket('relay-fixture',ids[0],'a');await assert.rejects(connect(a.ticket,'https://untrusted.invalid'),/401/);
    const wa=await connect(a.ticket);sockets.push(wa);await assert.rejects(connect(a.ticket),/401/);
    const wb=await connect((await issueRelayTicket('relay-fixture',ids[1],'b')).ticket);sockets.push(wb);
    const wc=await connect((await issueRelayTicket('other-fixture',ids[2],'c')).ticket);sockets.push(wc);
    wb.send(JSON.stringify({type:'watch',ids:[ids[0]]}));wc.send(JSON.stringify({type:'watch',ids:[ids[0]]}));
    await new Promise(resolve=>setTimeout(resolve,30));let otherMedia=0;wc.on('message',(_data,binary)=>{if(binary)otherMedia++;});
    const received=packet(wb);const jpeg=Buffer.from([1,255,216,255,192,0,17,8,0,1,0,1,3,1,17,0,2,17,0,3,17,0,255,217]);wa.send(jpeg);
    const oversized=Buffer.from(jpeg.subarray(1));oversized.writeUInt16BE(30000,7);assert.equal(boundedJpeg(oversized),false);
    const result=await received;assert.equal(result.subarray(1,37).toString(),ids[0]);assert.deepEqual(result.subarray(37),jpeg.subarray(1));
    await new Promise(resolve=>setTimeout(resolve,60));assert.equal(otherMedia,0);
    await putRecord('employees','b',{id:'b',status:'suspended'});const suspended=await issueRelayTicket('relay-fixture',ids[1],'b');await assert.rejects(connect(suspended.ticket),/401/);
    await store.setExpiring('orionsoft:call:relay-fixture',{participants:[],ended:true},30);const ended=await issueRelayTicket('relay-fixture',ids[0],'a');await assert.rejects(connect(ended.ticket),/401/);
  }finally{for(const ws of sockets)ws.terminate();await closeRelay();await new Promise(resolve=>server.close(resolve));}
});
