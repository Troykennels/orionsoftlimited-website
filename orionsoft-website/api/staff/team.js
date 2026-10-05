// Team & HR desk. Managers see their reporting line; HR / executives
// ("hr.records" or "org.approve") see the whole company. Full HR records
// (personal, emergency contact, bank) are only returned with "hr.records".
import { listRecords } from "../_lib/records.js";
import { withoutSecrets } from "../_lib/auth.js";
import { officeContext, officeCard, leaderboard } from "../_lib/office.js";
import { subordinates } from "../_lib/roles.js";
import { lagosDate, toLagos } from "../_lib/automations.js";
import { getSites } from "../_lib/fieldIntel.js";
import { scheduleFor, isWorkDay, describeSchedule } from "../_lib/workHours.js";
import { get } from "../store.js";
import { OFFICE_CONFIG_KEY } from "./office.js";
import { comparePlan } from "../_lib/visitPlans.js";

const stripPrivate = withoutSecrets;

function workingDays(start, end) {
  let n = 0;
  for (let t = Date.parse(start); t <= Date.parse(end); t += 86400000) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const noPhoto = ({ photoDataUrl, ...v }) => ({ ...v, hasPhoto: !!photoDataUrl || !!v.hasPhoto, confirmation: { ...(v.confirmation || {}), token: undefined } });

// What the team is doing in the field: the same data the admin's Attendance &
// Field page shows, limited to the people this person may see.
async function fieldView(scope, query, today, catalog) {
  const from = DATE.test(query.from || "") ? query.from : today;
  const to = DATE.test(query.to || "") ? query.to : today;
  const ids = new Set(scope.map(e => e.id));
  const name = id => scope.find(e => e.id === id)?.fullName || "Former staff";
  const [attendance, visits, spots, leave, sites, cfg, plans] = await Promise.all([
    listRecords("attendance"), listRecords("visits"), listRecords("spotchecks"), listRecords("leave"), getSites(), get(OFFICE_CONFIG_KEY), listRecords("visitplans"),
  ]);
  const onLeave = new Set(leave.filter(l => l.status === "approved" && l.startDate <= today && l.endDate >= today).map(l => l.employeeId));
  const day = iso => toLagos(iso).slice(0, 10);
  const inRange = d => d >= from && d <= to;
  const rows = attendance.filter(a => ids.has(a.employeeId) && inRange(a.date))
    .sort((a, b) => b.date.localeCompare(a.date) || name(a.employeeId).localeCompare(name(b.employeeId)))
    .map(a => ({ ...a, employeeName: name(a.employeeId) }));
  const visitList = visits.filter(v => ids.has(v.employeeId) && inRange(day(v.checkIn.at)))
    .sort((a, b) => b.checkIn.at.localeCompare(a.checkIn.at)).map(v => ({ ...noPhoto(v), employeeName: name(v.employeeId) }));
  const spotList = spots.filter(s => ids.has(s.employeeId) && inRange(day(s.issuedAt)))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .map(s => ({ ...s, employeeName: name(s.employeeId), response: s.response ? { ...s.response, photoDataUrl: undefined } : null }));

  // Right now: where each person is and what they last did today.
  const now = scope.map(e => {
    const schedule = scheduleFor(e, cfg || {});
    const att = attendance.find(a => a.employeeId === e.id && a.date === today) || null;
    const todays = visits.filter(v => v.employeeId === e.id && day(v.checkIn.at) === today).sort((a, b) => a.checkIn.at.localeCompare(b.checkIn.at));
    const openVisit = todays.find(v => !v.checkOut?.at) || null;
    const timeline = [
      ...(att?.events || []).map(ev => ({ at: ev.at, kind: ev.type, geo: ev.geo || null, text: { clock_in: `Clocked in (${String(ev.mode || att.mode || "").replace("_", " ")})`, resume: "Resumed work", clock_out: "Clocked out", auto_close: "Day closed automatically" }[ev.type] || ev.type })),
      ...todays.flatMap(v => [
        { at: v.checkIn.at, kind: "visit_in", geo: v.checkIn.geo || null, visitId: v.id, text: `Checked in at ${v.organisation}${v.purpose ? ` · ${v.purpose}` : ""}`, trust: v.trust, level: v.level },
        v.checkOut?.at && { at: v.checkOut.at, kind: "visit_out", geo: v.checkOut.geo || null, visitId: v.id, text: `Left ${v.organisation} after ${v.durationMin} min${v.outcome ? ` · ${v.outcome}` : ""}` },
      ].filter(Boolean)),
      ...spots.filter(s => s.employeeId === e.id && day(s.issuedAt) === today).flatMap(s => [
        { at: s.issuedAt, kind: "spot_sent", spotId: s.id, text: `Location check sent (${s.reason})` },
        s.response?.at && { at: s.response.at, kind: "spot_answer", geo: s.response.geo || null, spotId: s.id, text: s.flags?.length ? `Answered location check: ${s.flags.map(f => f.label).join(" · ")}` : "Answered location check ✓", flagged: !!s.flags?.length },
        s.status === "missed" && { at: s.dueAt, kind: "spot_missed", spotId: s.id, text: "Missed the location check", flagged: true },
      ].filter(Boolean)),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const lastGeo = [...timeline].reverse().find(t => t.geo) || null;
    const status = onLeave.has(e.id) ? "leave"
      : openVisit ? "visit"
      : att?.clockIn && !att.clockOut ? "in"
      : att?.clockOut ? "out"
      : isWorkDay(schedule, today) ? "not_in" : "day_off";
    return {
      ...officeCard(e, catalog), status, schedule: { ...schedule, label: describeSchedule(schedule) },
      attendance: att ? { clockIn: att.clockIn, clockOut: att.clockOut, mode: att.mode, minutes: att.minutes, lateMinutes: att.lateMinutes || 0, earlyMinutes: att.earlyMinutes || 0, standup: att.standup?.today || "" } : null,
      openVisit: openVisit ? { id: openVisit.id, organisation: openVisit.organisation, since: openVisit.checkIn.at, trust: openVisit.trust, level: openVisit.level } : null,
      lastSeen: lastGeo ? { at: lastGeo.at, geo: lastGeo.geo, text: lastGeo.text } : null,
      plan: comparePlan(plans.find(p => p.employeeId === e.id && p.date === today), todays),
      timeline,
    };
  });
  return { ok: true, today, from, to, now, rows, visits: visitList, spotchecks: spotList, sites: Object.values(sites) };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, active, catalog } = ctx;
  const companyWide = ctx.can("hr.records") || ctx.can("org.approve");
  const scope = companyWide ? active.filter(e => e.id !== me.id) : subordinates(me, employees, catalog).filter(e => e.status === "active");
  // Anyone with people reporting to them gets the desk, whatever their role.
  if (!companyWide && !ctx.can("team.view") && !scope.length) return res.status(403).json({ error: "The team desk is for managers and HR" });
  const today = lagosDate();

  if (req.query.view === "field") return res.json(await fieldView(scope, req.query, today, catalog));
  const year = today.slice(0, 4);
  const [tasks, goals, leave, attendance, board] = await Promise.all([
    listRecords("tasks"), listRecords("goals"), listRecords("leave"), listRecords("attendance"), leaderboard("month"),
  ]);

  const people = scope.map(e => {
    const myGoals = goals.filter(g => g.ownerId === e.id && g.status === "active");
    const annualUsed = leave.filter(l => l.employeeId === e.id && l.status === "approved" && l.type === "annual" && l.startDate.startsWith(year))
      .reduce((n, l) => n + workingDays(l.startDate, l.endDate), 0);
    return {
      ...officeCard(e, catalog),
      hr: ctx.can("hr.records") ? stripPrivate(e) : null,
      openTasks: tasks.filter(t => t.assigneeId === e.id && t.status !== "done").length,
      overdueTasks: tasks.filter(t => t.assigneeId === e.id && t.status !== "done" && t.dueDate && t.dueDate < today).length,
      goalCount: myGoals.length,
      goalProgress: myGoals.length ? Math.round(myGoals.reduce((n, g) => n + (g.progress || 0), 0) / myGoals.length) : null,
      onLeaveToday: leave.some(l => l.employeeId === e.id && l.status === "approved" && l.startDate <= today && l.endDate >= today),
      attendanceToday: attendance.find(a => a.employeeId === e.id && a.date === today) || null,
      leaveUsed: annualUsed, leaveAllowance: Number(e.leaveAllowance) || 20,
      points: board.find(b => b.id === e.id)?.points || 0,
      deviceCheck: e.deviceCheck ? { at: e.deviceCheck.at, ready: e.deviceCheck.ready, location: e.deviceCheck.location, camera: e.deviceCheck.camera } : null,
    };
  });

  // Upcoming birthdays & anniversaries in the next 30 days (HR planning).
  const upcoming = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.parse(today) + i * 86400000).toISOString().slice(0, 10);
    for (const e of scope) {
      if (e.dateOfBirth && e.dateOfBirth.slice(5) === d.slice(5)) upcoming.push({ date: d, employeeId: e.id, kind: "birthday" });
      if (e.startDate && e.startDate.slice(5) === d.slice(5) && e.startDate.slice(0, 4) < d.slice(0, 4)) upcoming.push({ date: d, employeeId: e.id, kind: "anniversary", years: parseInt(d.slice(0, 4), 10) - parseInt(e.startDate.slice(0, 4), 10) });
    }
  }

  return res.json({
    ok: true, companyWide, hrRecords: ctx.can("hr.records"), people, upcoming,
    summary: {
      headcount: people.length,
      clockedIn: people.filter(p => p.attendanceToday?.clockIn && !p.attendanceToday?.clockOut).length,
      standups: people.filter(p => p.attendanceToday?.standup).length,
      onLeave: people.filter(p => p.onLeaveToday).length,
      overdueTasks: people.reduce((n, p) => n + p.overdueTasks, 0),
      byDepartment: Object.entries(people.reduce((m, p) => ({ ...m, [p.department || "Unassigned"]: (m[p.department || "Unassigned"] || 0) + 1 }), {})).map(([name, count]) => ({ name, count })),
    },
  });
}
