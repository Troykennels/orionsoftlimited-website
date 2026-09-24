// Virtual attendance: clock in/out (GPS + device stamped, sets presence),
// daily standups that post to the department channel automatically, and a
// team board for leads. Location is captured only at these moments, never
// continuously, and staff see everything recorded about them.
import { push, get, set, ltrim } from "../store.js";
import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { officeContext, notify, award, slugify } from "../_lib/office.js";
import { managerChain, subordinates } from "../_lib/roles.js";
import { lagosDate, toLagos } from "../_lib/automations.js";
import { cleanGeo, requestMeta } from "../_lib/fieldIntel.js";
import { OFFICE_CONFIG_KEY, DEFAULT_OFFICE_CONFIG } from "./office.js";

const MODES = ["remote", "field", "client_site", "hybrid"];

// Minutes late against the company start time (+ grace), in Lagos time.
export function lateMinutes(clockInIso, workStart = "09:00", grace = 15) {
  const local = toLagos(clockInIso); // "YYYY-MM-DDTHH:mm"
  const [h, m] = local.slice(11, 16).split(":").map(Number);
  const [sh, sm] = String(workStart).split(":").map(Number);
  const late = (h * 60 + m) - (sh * 60 + (sm || 0) + Number(grace || 0));
  return late > 0 ? late : 0;
}

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

    if (b.action === "consent") {
      const fresh = await getRecord("employees", me.id);
      fresh.locationConsentAt = new Date().toISOString();
      await putRecord("employees", fresh.id, fresh);
      return res.json({ ok: true, locationConsentAt: fresh.locationConsentAt });
    }

    const id = recId(me.id, today);
    const rec = (await getRecord("attendance", id)) || { id, employeeId: me.id, date: today, clockIn: null, clockOut: null, minutes: 0, mode: "remote", standup: null, eod: "", events: [] };
    rec.events = rec.events || [];
    const fresh = await getRecord("employees", me.id);
    const cfg = { ...DEFAULT_OFFICE_CONFIG, ...((await get(OFFICE_CONFIG_KEY)) || {}) };

    if (b.action === "clock-in") {
      if (rec.clockIn && !rec.clockOut) return res.status(400).json({ error: "You're already clocked in" });
      const now = new Date().toISOString();
      const first = !rec.clockIn;
      rec.clockIn = rec.clockIn || now;
      rec.clockOut = null;
      rec.mode = MODES.includes(b.mode) ? b.mode : "remote";
      rec.resumedAt = now;
      if (first) {
        rec.clockInGeo = geo; rec.clockInIp = meta.ip; rec.clockInUa = meta.ua;
        rec.lateMinutes = lateMinutes(now, cfg.workStart, cfg.graceMinutes);
      }
      rec.events.push({ type: first ? "clock_in" : "resume", at: now, geo, ip: meta.ip, ua: meta.ua, deviceId: meta.deviceId, mode: rec.mode });
      fresh.presence = { status: rec.mode === "field" || rec.mode === "client_site" ? "field" : "available", note: "", at: now };
      if (first && rec.lateMinutes > 0) {
        const mgr = managerChain(me, employees, catalog)[0];
        if (mgr && rec.lateMinutes >= 30) await notify([mgr.id], { type: "attendance", title: `${me.fullName} clocked in ${rec.lateMinutes >= 60 ? `${Math.floor(rec.lateMinutes / 60)}h ${rec.lateMinutes % 60}m` : `${rec.lateMinutes} min`} late`, body: toLagos(now).slice(11, 16), link: "team", actorId: me.id });
      }
    } else if (b.action === "clock-out") {
      if (!rec.clockIn || rec.clockOut) return res.status(400).json({ error: "You're not clocked in" });
      rec.clockOut = new Date().toISOString();
      rec.minutes = (rec.minutes || 0) + Math.round((Date.parse(rec.clockOut) - Date.parse(rec.resumedAt || rec.clockIn)) / 60000);
      rec.eod = String(b.eod || "").slice(0, 1500);
      rec.clockOutGeo = geo; rec.clockOutIp = meta.ip;
      rec.events.push({ type: "clock_out", at: rec.clockOut, geo, ip: meta.ip, ua: meta.ua, deviceId: meta.deviceId });
      fresh.presence = { status: "offline", note: "", at: new Date().toISOString() };
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
    await putRecord("attendance", id, rec);
    await putRecord("employees", fresh.id, fresh);
    return res.json({ ok: true, record: rec, presence: fresh.presence });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
