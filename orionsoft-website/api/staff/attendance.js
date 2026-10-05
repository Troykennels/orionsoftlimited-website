// Virtual attendance: clock in/out (GPS + device stamped, sets presence),
// daily standups that post to the department channel automatically, and a
// team board for leads. Location is captured only at these moments, never
// continuously, and staff see everything recorded about them.
import { push, get, set, ltrim } from "../store.js";
import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { officeContext, notify, award, slugify } from "../_lib/office.js";
import { managerChain, subordinates, fieldWatchers } from "../_lib/roles.js";
import { lagosDate, toLagos } from "../_lib/automations.js";
import { cleanGeo, requestMeta } from "../_lib/fieldIntel.js";
import { scheduleFor, lateMinutes, earlyMinutes, overtimeMinutes } from "../_lib/workHours.js";
import { OFFICE_CONFIG_KEY, DEFAULT_OFFICE_CONFIG } from "./office.js";

const MODES = ["remote", "field", "client_site", "hybrid"];
const MODE_LABEL = { remote: "remote", field: "field work", client_site: "a client site", hybrid: "hybrid" };
const hm = min => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, active, catalog } = ctx;
  const today = lagosDate();
  const recId = (empId, date) => `att_${empId}_${date}`;

  if (req.method === "GET") {
    const all = await listRecords("attendance");
    const mine = all.filter(a => a.employeeId === me.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 45);
    let board = null;
    if (ctx.can("team.view") || ctx.can("hr.records")) {
      const scope = ctx.can("hr.records") || ctx.can("org.approve") ? active : subordinates(me, employees, catalog).filter(e => e.status === "active");
      board = scope.map(e => ({ employeeId: e.id, record: all.find(a => a.employeeId === e.id && a.date === (req.query.date || today)) || null }));
    }
    return res.json({ ok: true, today, todayRecord: mine.find(a => a.date === today) || null, history: mine, board, locationConsentAt: me.locationConsentAt || null });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const meta = { ...requestMeta(req), deviceId: String(b.deviceId || "").slice(0, 64) };
    const geo = cleanGeo(b.geo);

    // Result of the in-app "Check my phone" test, so admin/managers can see
    // who is ready for GPS/camera verification before sending a check.
    if (b.action === "device-check") {
      const ok = v => (v === "ok" ? "ok" : String(v || "unknown").slice(0, 30));
      const fresh = await getRecord("employees", me.id);
      fresh.deviceCheck = {
        at: new Date().toISOString(), location: ok(b.location), accuracy: Number.isFinite(Number(b.accuracy)) ? Math.round(b.accuracy) : null,
        camera: ok(b.camera), notifications: ok(b.notifications), ua: meta.ua,
        ready: b.location === "ok" && b.camera === "ok",
      };
      await putRecord("employees", fresh.id, fresh);
      return res.json({ ok: true, deviceCheck: fresh.deviceCheck });
    }

    // Every location attempt from the phone (success or failure, with the
    // browser's raw error), so managers can see exactly why a phone fails.
    if (b.action === "geo-diag") {
      const s = (v, n = 60) => String(v ?? "").slice(0, n);
      const entry = {
        at: new Date().toISOString(), ok: !!b.ok, kind: s(b.kind, 30), code: Number(b.code) || 0, message: s(b.message, 120),
        perm: s(b.perm, 20), accuracy: Number.isFinite(Number(b.accuracy)) ? Math.round(b.accuracy) : null,
        ms: Math.round(Number(b.ms) || 0), where: s(b.where, 30), ua: meta.ua,
      };
      const fresh = await getRecord("employees", me.id);
      fresh.geoDiag = [entry, ...(fresh.geoDiag || [])].slice(0, 10);
      await putRecord("employees", fresh.id, fresh);
      return res.json({ ok: true });
    }

    if (b.action === "consent") {
      const fresh = await getRecord("employees", me.id);
      fresh.locationConsentAt = new Date().toISOString();
      await putRecord("employees", fresh.id, fresh);
      return res.json({ ok: true, locationConsentAt: fresh.locationConsentAt });
    }

    // Sent later from a phone that was offline: use when it really happened
    // (no more than 24 hours ago, never in the future), and say so.
    const captured = Date.parse(b.capturedAt || "");
    const offline = captured && captured < Date.now() - 60000 && captured > Date.now() - 24 * 3600000;
    const at = offline ? new Date(captured).toISOString() : new Date().toISOString();
    const day = offline ? toLagos(at).slice(0, 10) : today;
    const id = recId(me.id, day);
    const rec = (await getRecord("attendance", id)) || { id, employeeId: me.id, date: day, clockIn: null, clockOut: null, minutes: 0, mode: "remote", standup: null, eod: "", events: [] };
    rec.events = rec.events || [];
    const fresh = await getRecord("employees", me.id);
    const cfg = { ...DEFAULT_OFFICE_CONFIG, ...((await get(OFFICE_CONFIG_KEY)) || {}) };
    const schedule = scheduleFor(fresh, cfg);

    // Location found after a no-signal clock-in (see lateLocation.jsx).
    if (b.action === "attach-geo") {
      if (!rec.clockIn) return res.status(400).json({ error: "You haven't clocked in today" });
      if (rec.clockInGeo) return res.json({ ok: true, todayRecord: rec });
      const lateSec = Math.round((Date.now() - Date.parse(rec.clockIn)) / 1000);
      if (lateSec > 15 * 60) return res.status(400).json({ error: "Too late to add a location to this clock-in" });
      const late = cleanGeo(b.geo);
      if (!late) return res.status(400).json({ error: "Invalid location" });
      rec.clockInGeo = late; rec.clockInGeoLateSec = lateSec;
      const ev = rec.events.find(e => e.type === "clock_in" && !e.geo);
      if (ev) { ev.geo = late; ev.geoLateSec = lateSec; }
      await putRecord("attendance", id, rec);
      return res.json({ ok: true, todayRecord: rec });
    }

    if (b.action === "clock-in") {
      if (rec.clockIn && !rec.clockOut) return res.status(400).json({ error: "You're already clocked in" });
      const now = at;
      const first = !rec.clockIn;
      rec.clockIn = rec.clockIn || now;
      rec.clockOut = null;
      rec.mode = MODES.includes(b.mode) ? b.mode : "remote";
      rec.resumedAt = now;
      rec.earlyMinutes = 0; // back at work: no longer "left early"
      if (first) {
        rec.clockInGeo = geo; rec.clockInIp = meta.ip; rec.clockInUa = meta.ua;
        rec.lateMinutes = lateMinutes(now, schedule);
        rec.schedule = { start: schedule.start, end: schedule.end };
      }
      rec.events.push({ type: first ? "clock_in" : "resume", at: now, offline: !!offline, geo, ip: meta.ip, ua: meta.ua, deviceId: meta.deviceId, mode: rec.mode });
      fresh.presence = { status: rec.mode === "field" || rec.mode === "client_site" ? "field" : "available", note: "", at: now };
      if (first) {
        const mgr = managerChain(me, employees, catalog)[0];
        const late = rec.lateMinutes >= 30;
        const watchers = cfg.alertClockIns ? fieldWatchers(me, employees, catalog) : late && mgr ? [mgr.id] : [];
        await notify(watchers, {
          type: "attendance",
          title: late ? `${me.fullName} clocked in ${hm(rec.lateMinutes)} late` : `${me.fullName} clocked in (${MODE_LABEL[rec.mode]})`,
          body: [toLagos(now).slice(11, 16), geo ? `GPS ±${Math.round(geo.accuracy || 0)}m` : "no GPS"].join(" · "),
          link: "team:field", actorId: me.id,
        });
      }
    } else if (b.action === "clock-out") {
      if (!rec.clockIn || rec.clockOut) return res.status(400).json({ error: "You're not clocked in" });
      rec.clockOut = at;
      rec.minutes = (rec.minutes || 0) + Math.round((Date.parse(rec.clockOut) - Date.parse(rec.resumedAt || rec.clockIn)) / 60000);
      rec.eod = String(b.eod || "").slice(0, 1500);
      rec.clockOutGeo = geo; rec.clockOutIp = meta.ip;
      rec.earlyMinutes = earlyMinutes(rec.clockOut, schedule);
      rec.overtimeMinutes = overtimeMinutes(rec.clockIn, rec.clockOut, schedule);
      rec.events.push({ type: "clock_out", at: rec.clockOut, offline: !!offline, geo, ip: meta.ip, ua: meta.ua, deviceId: meta.deviceId });
      fresh.presence = { status: "offline", note: "", at: new Date().toISOString() };
      const mgr = managerChain(me, employees, catalog)[0];
      const early = rec.earlyMinutes >= 30;
      const watchers = cfg.alertClockIns ? fieldWatchers(me, employees, catalog) : early && mgr ? [mgr.id] : [];
      await notify(watchers, {
        type: "attendance",
        title: early ? `${me.fullName} clocked out ${hm(rec.earlyMinutes)} early` : `${me.fullName} clocked out`,
        body: [`${hm(rec.minutes)} worked`, rec.eod].filter(Boolean).join(" · "),
        link: "team:field", actorId: me.id,
      });
    } else if (b.action === "standup") {
      const standup = { yesterday: String(b.yesterday || "").slice(0, 1000), today: String(b.today || "").slice(0, 1000), blockers: String(b.blockers || "").slice(0, 600), at: new Date().toISOString() };
      if (!standup.today) return res.status(400).json({ error: "Say what you're working on today" });
      const first = !rec.standup;
      rec.standup = standup;
      if (first) await award(me.id, "standup");
      // Automation: post into the department channel (or #general).
      const channel = me.department ? `dept_${slugify(me.department)}` : "general";
      const text = `🗓️ Daily standup\n• Yesterday: ${standup.yesterday || "-"}\n• Today: ${standup.today}\n• Blockers: ${standup.blockers || "None"}`;
      const msg = { id: `msg_${Date.now().toString(36)}`, channelId: channel, authorId: me.id, text, at: new Date().toISOString() };
      await push(`orionsoft:chat:${channel}`, msg);
      await ltrim(`orionsoft:chat:${channel}`, 1000);
      const last = (await get("orionsoft:chat:last")) || {};
      last[channel] = { at: msg.at, by: me.id, preview: `${me.fullName.split(" ")[0]}: daily standup` };
      await set("orionsoft:chat:last", last);
      if (standup.blockers) {
        const mgr = managerChain(me, employees, catalog)[0];
        if (mgr) await notify([mgr.id], { type: "blocker", title: `${me.fullName} is blocked`, body: standup.blockers, link: `messages:${channel}`, actorId: me.id });
      }
    } else {
      return res.status(400).json({ error: "Unknown action" });
    }
    if (offline) rec.offlineSync = true;
    await putRecord("attendance", id, rec);
    await putRecord("employees", fresh.id, fresh);
    return res.json({ ok: true, record: rec, presence: fresh.presence });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
