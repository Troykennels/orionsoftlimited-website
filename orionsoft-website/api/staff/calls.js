import { randomUUID, createHmac } from 'node:crypto';
import { requireStaff } from '../_lib/auth.js';
import { getRecord } from '../_lib/records.js';
import { get, setExpiring, acquireLease, releaseLease, incrTtl } from '../store.js';

const alive = p => Date.now() - p.seenAt < 45000;
const key = id => `orionsoft:call:${id}`;
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
export function callIceConfig(userId) {
  const urls = String(process.env.CALL_TURN_URLS || '').split(',').map(s => s.trim()).filter(s => /^turns?:[^\s]+$/i.test(s));
  const iceServers = [{ urls: ['stun:stun.cloudflare.com:3478'] }];
  let relayConfigured = false;
  if (urls.length && process.env.CALL_TURN_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + 3600}:${userId}`;
    iceServers.push({ urls, username, credential: createHmac('sha1', process.env.CALL_TURN_SECRET).update(username).digest('base64') });
    relayConfigured = true;
  } else if (urls.length && process.env.CALL_TURN_USERNAME && process.env.CALL_TURN_PASSWORD) {
    iceServers.push({ urls, username: process.env.CALL_TURN_USERNAME, credential: process.env.CALL_TURN_PASSWORD });
    relayConfigured = true;
  }
  return { iceServers, relayConfigured, maxParticipants: 6 };
}
export async function resolvedIceConfig(userId) {
  const base = callIceConfig(userId);
  if (base.relayConfigured || !process.env.CALL_CLOUDFLARE_TURN_KEY_ID || !process.env.CALL_CLOUDFLARE_TURN_API_TOKEN) return base;
  const cacheKey = `orionsoft:call-relay:${userId}`;
  const cached = await get(cacheKey);
  if (cached && cached.keyId === process.env.CALL_CLOUDFLARE_TURN_KEY_ID) return cached.config;
  try {
    const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(process.env.CALL_CLOUDFLARE_TURN_KEY_ID)}/credentials/generate-ice-servers`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.CALL_CLOUDFLARE_TURN_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 3600 }), signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw Error('Relay unavailable');
    const data = await response.json();
    const iceServers = (Array.isArray(data.iceServers) ? data.iceServers : []).map(server => ({
      urls: (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(url => typeof url === 'string' && /^(stun|turn|turns):/.test(url) && !/:53(?:\?|$)/.test(url)),
      ...(typeof server.username === 'string' && typeof server.credential === 'string' ? { username: server.username, credential: server.credential } : {}),
    })).filter(server => server.urls.length);
    if (!iceServers.some(server => server.username && server.urls.some(url => /^turns?:/.test(url)))) throw Error('Relay unavailable');
    const config = { iceServers, relayConfigured: true, maxParticipants: 6 };
    await setExpiring(cacheKey, { keyId: process.env.CALL_CLOUDFLARE_TURN_KEY_ID, config }, 900);
    return config;
  } catch { return { ...base, relayUnavailable: true }; }
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const auth = await requireStaff(req, res); if (!auth) return;
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const b = req.method === 'GET' ? req.query : req.body || {};
  const meeting = await getRecord('meetings', b.meetingId);
  const me = auth.employee;
  if (!meeting || !(meeting.hostId === me.id || meeting.everyone || (meeting.attendeeIds || []).includes(me.id))) return res.status(404).json({ error: 'Meeting not found' });
  if (meeting.status !== 'scheduled' || meeting.roomMode !== 'internal') return res.status(409).json({ error: 'This meeting room is not open.' });
  if (req.method === 'GET' && b.action === 'config') return res.json({ ok: true, ...await resolvedIceConfig(me.id) });
  if ((await incrTtl(`orionsoft:call-rate:${me.id}`, 60)) > 300) return res.status(429).json({ error: 'Too many call updates. Please wait a minute.' });
  const lock = `${key(meeting.id)}:lock`, owner = randomUUID();
  if (!await acquireLease(lock, owner, 10)) return res.status(409).json({ error: 'The room is updating. Please try again.' });
  try {
    let room = await get(key(meeting.id)) || { participants: [], signals: [], seq: 0, recording: false, ended: false };
    room.participants = room.participants.filter(alive);
    room.signals = room.signals.filter(s => Date.now() - s.at < 90000);
    if (!room.participants.some(p => p.userId === meeting.hostId)) room.recording = false;
    const mine = () => room.participants.find(p => p.id === b.sessionId && p.userId === me.id);
    if (req.method === 'POST') {
      if (b.action === 'join') {
        if (room.ended) { if (meeting.hostId !== me.id) fail(409, 'The host ended this call.'); room = { participants: [], signals: [], seq: 0, recording: false, ended: false }; }
        if (room.recording) fail(409, 'Recording is in progress. Ask the host to stop recording before joining.');
        if (room.participants.some(p => p.userId === me.id)) fail(409, 'You already joined this room in another tab. Leave that call first or wait 45 seconds.');
        if (room.participants.length >= 6) fail(409, 'This room supports six participants.');
        const p = { id: randomUUID(), userId: me.id, name: me.fullName, seenAt: Date.now(), consent: b.consent === true };
        room.participants.push(p);
        await setExpiring(key(meeting.id), room, 7200);
        return res.json({ ok: true, sessionId: p.id, ...await resolvedIceConfig(me.id) });
      }
      const p = mine(); if (!p || room.ended) fail(410, 'You have left this call. Join again.');
      p.seenAt = Date.now();
      if (b.action === 'leave') { room.participants = room.participants.filter(x => x.id !== p.id); if (me.id === meeting.hostId) room.recording = false; }
      else if (b.action === 'end') { if (me.id !== meeting.hostId) fail(403, 'Only the host can end the call.'); room.ended = true; room.recording = false; room.participants = []; room.signals = []; }
      else if (b.action === 'record') {
        if (me.id !== meeting.hostId) fail(403, 'Only the host can record.');
        if (b.recording && !room.participants.every(x => x.consent)) fail(409, 'Every participant must agree to recording before joining.');
        room.recording = b.recording === true;
      } else if (b.action === 'signal') {
        if (!room.participants.some(x => x.id === b.to && x.id !== p.id)) fail(404, 'Participant left the call.');
        if (!['offer','answer','candidate'].includes(b.type) || !b.data || JSON.stringify(b.data).length > 24000) fail(400, 'Invalid call signal.');
        if (b.type !== 'candidate' && (b.data.type !== b.type || typeof b.data.sdp !== 'string')) fail(400, 'Invalid call description.');
        room.signals.push({ seq: ++room.seq, from: p.id, to: b.to, type: b.type, data: b.data, at: Date.now() });
        room.signals = room.signals.slice(-600);
      } else fail(400, 'Unknown call action.');
    } else {
      const p = mine(); if (!p || room.ended) fail(410, 'The call ended or your connection timed out. Join again.');
      p.seenAt = Date.now();
    }
    await setExpiring(key(meeting.id), room, 7200);
    const { sessionId } = b;
    return res.json({ ok: true, participants: room.participants.map(p => ({ id: p.id, userId: p.userId, name: p.name, consent: p.consent })), signals: room.signals.filter(s => s.to === sessionId && s.seq > (Number(b.after) || 0)), cursor: room.seq, recording: room.recording, ended: room.ended });
  } catch (e) { if (e.status) return res.status(e.status).json({ error: e.message }); throw e; }
  finally { await releaseLease(lock, owner); }
}
