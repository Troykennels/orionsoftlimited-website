import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { get, del, setExpiring, claim, storeBackend, _internal } from '../store.js';
import { getRecord } from './records.js';

const path = '/api/staff/call-media';
const ticketKey = ticket => `orionsoft:call-ticket:${ticket}`;
const channel = meetingId => `orionsoft:call-media:${meetingId}`;
export function boundedJpeg(bytes){
  if(bytes.length<12||bytes[0]!==255||bytes[1]!==216)return false;
  for(let pos=2;pos+9<bytes.length;){
    if(bytes[pos]!==255)return false;
    const marker=bytes[pos+1],length=bytes.readUInt16BE(pos+2);
    if(length<2||pos+2+length>bytes.length)return false;
    if([192,193,194].includes(marker)){const height=bytes.readUInt16BE(pos+5),width=bytes.readUInt16BE(pos+7);return width>0&&height>0&&width<=640&&height<=360;}
    pos+=length+2;
  }return false;
}
export function officeRelayConfig() {
  if (process.env.CALL_OFFICE_RELAY_READY !== 'true') return null;
  const raw = process.env.CALL_OFFICE_RELAY_URL || `wss://${process.env.RAILWAY_PUBLIC_DOMAIN || 'orionsoftlimited-website-production.up.railway.app'}${path}`;
  try { const url = new URL(raw); if (url.protocol === 'wss:' || url.protocol === 'ws:' && ['127.0.0.1','localhost'].includes(url.hostname)) return { url: url.href }; } catch { /* configuration unavailable */ }
  return null;
}
export async function issueRelayTicket(meetingId, sessionId, userId) {
  const config = officeRelayConfig(); if (!config) return null;
  const ticket = randomUUID(); await setExpiring(ticketKey(ticket), { meetingId, sessionId, userId }, 45);
  return { ticket, url: config.url };
}
async function validMember(identity) {
  const [room, meeting, employee] = await Promise.all([get(`orionsoft:call:${identity.meetingId}`), getRecord('meetings',identity.meetingId), getRecord('employees',identity.userId)]);
  return !!(room && !room.ended && meeting?.status === 'scheduled' && meeting.roomMode === 'internal' && employee?.status === 'active'
    && (meeting.everyone || meeting.hostId === identity.userId || meeting.attendeeIds?.includes(identity.userId))
    && room.participants?.some(p => p.id === identity.sessionId && p.userId === identity.userId && Date.now()-p.seenAt<45000));
}

// An authenticated compatibility transport over the website's existing TLS
// hosting. Packets are transient: no recording, packet bodies or tickets logged.
export function attachOfficeRelay(server, options = {}) {
  const origins = new Set(options.allowedOrigins || ['https://www.orionsoftlimited.com','https://orionsoftlimited.com','https://orionsoftlimited-website.vercel.app',...(process.env.CALL_OFFICE_RELAY_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean)]);
  const wss = new WebSocketServer({ noServer:true, maxPayload:100*1024, perMessageDeflate:false, handleProtocols:protocols=>protocols.has('orion-meet')?'orion-meet':false });
  const rooms = new Map();
  const redis = storeBackend()==='redis' ? _internal.redis() : null;
  const subscriber = redis?.duplicate(); subscriber?.on('error',()=>{});
  function send(ws, body) { if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(body)); }
  function publish(meetingId, packet) {
    if(redis) redis.publish(channel(meetingId),packet).catch(()=>{}); else dispatch(meetingId,packet);
  }
  function dispatch(meetingId,packet) {
    const group=rooms.get(meetingId);if(!group)return;
    if(packet[0]===0){
      try { const update=JSON.parse(packet.subarray(1).toString());
        if(update.type==='watch') {
          for(const ws of group.values())ws.watchers.set(update.from,{ids:update.ids,at:Date.now()});
        }
      }catch{ /* invalid internal control */ }
      return;
    }
    const from=packet.subarray(1,37).toString();
    for(const ws of group.values()) if(ws.identity.sessionId!==from && ws.watching.has(from) && ws.readyState===WebSocket.OPEN && ws.bufferedAmount<128*1024) ws.send(packet,{binary:true});
  }
  subscriber?.on('messageBuffer',(name,packet)=>dispatch(name.toString().slice('orionsoft:call-media:'.length),packet));
  function announce(ws, ids) {
    const packet=Buffer.concat([Buffer.from([0]),Buffer.from(JSON.stringify({type:'watch',from:ws.identity.sessionId,ids}))]);
    publish(ws.identity.meetingId,packet);
  }
  async function upgrade(req,socket,head) {
    if(new URL(req.url,'http://localhost').pathname!==path){socket.destroy();return;}
    const reject=()=>{if(!socket.destroyed){socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}};
    socket.on('error',()=>{});
    try {
      if(!origins.has(req.headers.origin))return reject();
      const protocols=String(req.headers['sec-websocket-protocol']||'').split(',').map(s=>s.trim());
      const ticket=protocols[1];if(protocols[0]!=='orion-meet'||! /^[a-f0-9-]{36}$/.test(ticket||''))return reject();
      const identity=await get(ticketKey(ticket));
      if(!identity||!await validMember(identity)||!await claim(`orionsoft:call-ticket-used:${ticket}`,60))return reject();
      await del(ticketKey(ticket));if(socket.destroyed)return;
      wss.handleUpgrade(req,socket,head,ws=>{ws.identity=identity;wss.emit('connection',ws,req);});
    }catch{reject();}
  }
  server.on('upgrade',upgrade);
  wss.on('connection',ws=>{
    const {meetingId,sessionId}=ws.identity;
    let group=rooms.get(meetingId);if(!group){group=new Map();rooms.set(meetingId,group);subscriber?.subscribe(channel(meetingId)).catch(()=>{});}
    group.get(sessionId)?.close(4001,'Reconnected');group.set(sessionId,ws);
    ws.watching=new Set();ws.watchers=new Map();ws.alive=true;ws.windowAt=Date.now();ws.bytes=0;ws.messages=0;
    send(ws,{type:'ready'});
    ws.on('pong',()=>{ws.alive=true;});ws.on('error',()=>{});
    ws.on('message',(data,binary)=>{
      const now=Date.now();if(now-ws.windowAt>=1000){ws.windowAt=now;ws.bytes=0;ws.messages=0;}
      ws.bytes+=data.length;ws.messages++;
      if(ws.bytes>280*1024||ws.messages>80){ws.close(4008,'Media rate exceeded');return;}
      if(!binary){
        try{const body=JSON.parse(data.toString());if(body.type!=='watch'||!Array.isArray(body.ids)||body.ids.length>5)return;
          ws.watching=new Set(body.ids.filter(id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id)&&id!==sessionId));announce(ws,[...ws.watching]);
        }catch{ws.close(4002,'Invalid control');}return;
      }
      if(data[0]!==1&&data[0]!==2)return;
      if(data[0]===2&&(data.length!==1281))return;
      if(data[0]===1&&!boundedJpeg(data.subarray(1)))return;
      const packet=Buffer.concat([data.subarray(0,1),Buffer.from(sessionId),data.subarray(1)]);
      publish(meetingId,packet);
    });
    ws.on('close',()=>{
      announce(ws,[]);
      if(group.get(sessionId)===ws)group.delete(sessionId);
      if(!group.size){rooms.delete(meetingId);subscriber?.unsubscribe(channel(meetingId)).catch(()=>{});}
    });
  });
  const watchersTimer=setInterval(()=>{
    for(const group of rooms.values())for(const ws of group.values()){
      let count=0;for(const [id,value]of ws.watchers){if(Date.now()-value.at>12000)ws.watchers.delete(id);else if(value.ids.includes(ws.identity.sessionId))count++;}
      send(ws,{type:'watchers',count});announce(ws,[...ws.watching]);
    }
  },2000);
  const heartbeat=setInterval(async()=>{
    for(const group of rooms.values())for(const ws of group.values()){
      if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();
      try{if(!await validMember(ws.identity))ws.close(4003,'Meeting access ended');}catch{ws.close(1013,'Office temporarily unavailable');}
    }
  },15000);
  watchersTimer.unref?.();heartbeat.unref?.();process.env.CALL_OFFICE_RELAY_READY='true';
  return async()=>{
    server.removeListener('upgrade',upgrade);clearInterval(watchersTimer);clearInterval(heartbeat);
    for(const group of rooms.values())for(const ws of group.values())ws.terminate();
    await new Promise(resolve=>wss.close(resolve));await subscriber?.quit();
  };
}
