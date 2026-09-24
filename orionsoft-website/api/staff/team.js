// Team & HR desk. Managers see their reporting line; HR / executives
// ("hr.records" or "org.approve") see the whole company. Full HR records
// (personal, emergency contact, bank) are only returned with "hr.records".
import { listRecords } from "../_lib/records.js";
import { officeContext, officeCard, leaderboard } from "../_lib/office.js";
import { subordinates } from "../_lib/roles.js";
import { lagosDate } from "../_lib/automations.js";

function stripPrivate(e) { const r = { ...e }; delete r.passwordHash; return r; }

function workingDays(start, end) {
  let n = 0;
  for (let t = Date.parse(start); t <= Date.parse(end); t += 86400000) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
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
  if (!companyWide && !ctx.can("team.view")) return res.status(403).json({ error: "The team desk is for managers and HR" });

  const scope = companyWide ? active.filter(e => e.id !== me.id) : subordinates(me, employees, catalog).filter(e => e.status === "active");
  const today = lagosDate();
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
