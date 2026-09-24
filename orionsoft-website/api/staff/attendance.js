// Virtual attendance: clock in/out (sets presence), daily standups that post
// to the department channel automatically, and a team board for leads.
import { push, get, set, ltrim } from "../store.js";
import { listRecords, getRecord, putRecord } from "../_lib/records.js";
import { officeContext, notify, award, slugify } from "../_lib/office.js";
import { managerChain, subordinates } from "../_lib/roles.js";
import { lagosDate } from "../_lib/automations.js";

const MODES = ["remote", "field", "client_site", "hybrid"];

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
    return res.json({ ok: true, today, todayRecord: mine.find(a => a.date === today) || null, history: mine, board });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const id = recId(me.id, today);
    const rec = (await getRecord("attendance", id)) || { id, employeeId: me.id, date: today, clockIn: null, clockOut: null, minutes: 0, mode: "remote", standup: null, eod: "" };
    const fresh = await getRecord("employees", me.id);

    if (b.action === "clock-in") {
      if (rec.clockIn && !rec.clockOut) return res.status(400).json({ error: "You're already clocked in" });
      rec.clockIn = rec.clockIn || new Date().toISOString();
      rec.clockOut = null;
      rec.mode = MODES.includes(b.mode) ? b.mode : "remote";
      rec.resumedAt = new Date().toISOString();
      fresh.presence = { status: rec.mode === "field" || rec.mode === "client_site" ? "field" : "available", note: "", at: new Date().toISOString() };
    } else if (b.action === "clock-out") {
      if (!rec.clockIn || rec.clockOut) return res.status(400).json({ error: "You're not clocked in" });
      rec.clockOut = new Date().toISOString();
      rec.minutes = (rec.minutes || 0) + Math.round((Date.parse(rec.clockOut) - Date.parse(rec.resumedAt || rec.clockIn)) / 60000);
      rec.eod = String(b.eod || "").slice(0, 1500);
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
