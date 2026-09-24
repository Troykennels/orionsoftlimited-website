// Performance scorecards. Every number is derived from recorded, verifiable
// activity (clock-ins, GPS-verified visits, client confirmations, spot checks,
// tasks, goals, reports, deals) rather than self-reported claims, and every
// score ships with the evidence and integrity flags behind it.
import { permissionsOf, roleOf } from "./roles.js";

const inRange = (d, from, to) => d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));

function workdays(from, to, startDate, leaveDays) {
  let n = 0;
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86400000) {
    const d = new Date(t), iso = d.toISOString().slice(0, 10), wd = d.getUTCDay();
    if (wd === 0 || wd === 6 || (startDate && iso < startDate) || leaveDays.has(iso)) continue;
    n++;
  }
  return n;
}
function fridays(from, to) {
  let n = 0;
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86400000) if (new Date(t).getUTCDay() === 5) n++;
  return n;
}

export const WEIGHTS = { attendance: 25, field: 25, output: 20, reporting: 15, sales: 10, engagement: 5 };

export function computeScorecards(data, from, to, today) {
  const { employees, catalog, attendance, visits, spotchecks, reports, tasks, goals, deals, posts, leave } = data;
  const end = to > today ? today : to;
  return employees.filter(e => e.status === "active" && e.staffRole !== "owner").map(e => {
    const perms = permissionsOf(e, catalog);
    const flags = [];
    const flag = (severity, text) => flags.push({ severity, text });

    // ── Attendance ──
    const leaveDays = new Set();
    for (const l of leave.filter(x => x.employeeId === e.id && x.status === "approved")) {
      for (let t = Date.parse(`${l.startDate}T12:00:00Z`); t <= Date.parse(`${l.endDate}T12:00:00Z`); t += 86400000) leaveDays.add(new Date(t).toISOString().slice(0, 10));
    }
    const expectedDays = workdays(from, end, e.startDate, leaveDays);
    const att = attendance.filter(a => a.employeeId === e.id && inRange(a.date, from, end) && a.clockIn);
    const lateDays = att.filter(a => a.lateMinutes > 0);
    const hours = att.filter(a => !a.forgotClockOut).map(a => (a.minutes || 0) / 60);
    const located = att.filter(a => a.clockInGeo).length;
    const standups = att.filter(a => a.standup).length;
    const forgot = att.filter(a => a.forgotClockOut).length;
    const attendanceMetrics = {
      expectedDays, daysPresent: att.length, attendanceRate: pct(Math.min(att.length, expectedDays), expectedDays),
      lateDays: lateDays.length, avgLateMin: lateDays.length ? Math.round(lateDays.reduce((n, a) => n + a.lateMinutes, 0) / lateDays.length) : 0,
      avgHours: hours.length ? +(hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(1) : 0,
      locationShared: pct(located, att.length), standups, forgotClockOut: forgot,
    };
    const attendanceScore = expectedDays ? clamp(
      0.6 * (attendanceMetrics.attendanceRate || 0) +
      0.25 * (att.length ? 100 - (lateDays.length / att.length) * 100 : 0) +
      0.15 * (att.length ? (standups / att.length) * 100 : 0)
    ) : null;
    if (expectedDays >= 3 && (attendanceMetrics.attendanceRate || 0) < 60) flag("high", `Clocked in on only ${att.length} of ${expectedDays} working days.`);
    if (att.length >= 3 && lateDays.length / att.length > 0.4) flag("warn", `Late on ${lateDays.length} of ${att.length} days (avg ${attendanceMetrics.avgLateMin} min).`);
    if (att.length >= 3 && (attendanceMetrics.locationShared || 0) < 50) flag("warn", `Location withheld on ${att.length - located} of ${att.length} clock-ins.`);
    if (forgot >= 2) flag("warn", `Forgot to clock out ${forgot} times.`);

    // ── Field work ──
    const myVisits = visits.filter(v => v.employeeId === e.id && inRange(v.checkIn.at, from, end));
    const fieldDays = att.filter(a => ["field", "client_site"].includes(a.mode)).length;
    const isField = perms.has("pipeline") || perms.has("liaison") || fieldDays > 0 || myVisits.length > 0;
    const confirmed = myVisits.filter(v => v.confirmation?.status === "confirmed" && !v.confirmation.selfConfirmed && !v.confirmation.sameNetwork);
    const disputed = myVisits.filter(v => v.confirmation?.status === "disputed");
    const selfConf = myVisits.filter(v => v.confirmation?.selfConfirmed);
    const suspicious = myVisits.filter(v => v.level === "suspicious");
    const spots = spotchecks.filter(s => s.employeeId === e.id && inRange(s.issuedAt, from, end));
    const spotsOnTime = spots.filter(s => s.status === "answered" && !(s.flags || []).some(f => f.code === "NOT_AT_VISIT" || f.code === "FAKE_GPS_PATTERN"));
    const spotsMissed = spots.filter(s => s.status === "missed");
    const fieldMetrics = {
      visits: myVisits.length, confirmed: confirmed.length, disputed: disputed.length, selfConfirmed: selfConf.length, suspicious: suspicious.length,
      avgTrust: myVisits.length ? Math.round(myVisits.reduce((n, v) => n + (v.trust || 0), 0) / myVisits.length) : null,
      confirmationRate: pct(confirmed.length, myVisits.length), fieldDays,
      spotChecks: spots.length, spotOnTime: spotsOnTime.length, spotMissed: spotsMissed.length,
      visitsWithoutPhoto: myVisits.filter(v => !v.photoHash).length,
    };
    let fieldScore = null;
    if (isField) {
      if (!myVisits.length) fieldScore = fieldDays ? 15 : 35;
      else {
        const spotPart = spots.length ? (spotsOnTime.length / spots.length) * 100 : null;
        fieldScore = spotPart == null
          ? 0.7 * fieldMetrics.avgTrust + 0.3 * (fieldMetrics.confirmationRate || 0)
          : 0.55 * fieldMetrics.avgTrust + 0.25 * (fieldMetrics.confirmationRate || 0) + 0.2 * spotPart;
        fieldScore = clamp(fieldScore - disputed.length * 15 - selfConf.length * 20);
      }
      if (fieldDays >= 2 && !myVisits.length) flag("high", `${fieldDays} field day(s) recorded but no client visits checked in.`);
      if (disputed.length) flag("high", `${disputed.length} visit(s) disputed by the client.`);
      if (selfConf.length) flag("high", `${selfConf.length} visit confirmation(s) made from a Staff Office device (self-confirmed).`);
      if (suspicious.length) flag("warn", `${suspicious.length} check-in(s) scored as suspicious.`);
      if (spotsMissed.length) flag("warn", `Missed ${spotsMissed.length} of ${spots.length} location check(s).`);
      const reused = myVisits.filter(v => (v.flags || []).some(f => f.code === "REUSED_PHOTO")).length;
      if (reused) flag("high", `${reused} visit photo(s) reused from earlier visits.`);
      const fake = myVisits.filter(v => (v.flags || []).some(f => f.code === "FAKE_GPS_PATTERN" || f.code === "IMPOSSIBLE_TRAVEL")).length;
      if (fake) flag("high", `${fake} check-in(s) show signs of fake GPS or impossible travel.`);
    }

    // ── Reporting honesty ──
    const expectedReports = fridays(from, end);
    const myReports = reports.filter(r => r.employeeId === e.id && inRange(r.weekEnd || r.weekStart, from, to));
    const claimedVisits = myReports.reduce((n, r) => n + (Number(r.totals?.physicalVisits) || 0), 0);
    const recordedInReportedWeeks = myReports.reduce((n, r) => n + visits.filter(v => v.employeeId === e.id && inRange(v.checkIn.at, r.weekStart, r.weekEnd)).length, 0);
    const claimGap = Math.max(0, claimedVisits - recordedInReportedWeeks);
    const reportingMetrics = { expected: expectedReports, submitted: myReports.length, approved: myReports.filter(r => r.status === "approved").length, rejected: myReports.filter(r => r.status === "rejected").length, claimedVisits, recordedVisits: recordedInReportedWeeks, claimGap };
    let reportingScore = expectedReports ? clamp(Math.min(100, (myReports.length / expectedReports) * 100) - reportingMetrics.rejected * 10) : null;
    if (isField && claimGap >= 3 && claimedVisits > recordedInReportedWeeks * 1.5) {
      reportingScore = reportingScore == null ? null : clamp(reportingScore - Math.min(50, claimGap * 8));
      flag("high", `Weekly reports claim ${claimedVisits} physical visits, but only ${recordedInReportedWeeks} were checked in with GPS.`);
    }
    if (expectedReports >= 2 && myReports.length < expectedReports) flag("warn", `Submitted ${myReports.length} of ${expectedReports} weekly reports.`);

    // ── Output: tasks & goals ──
    const myTasks = tasks.filter(t => t.assigneeId === e.id);
    const doneInRange = myTasks.filter(t => t.status === "done" && inRange(t.completedAt || t.updatedAt, from, to));
    const onTime = doneInRange.filter(t => !t.dueDate || (t.completedAt || t.updatedAt).slice(0, 10) <= t.dueDate);
    const overdueOpen = myTasks.filter(t => t.status !== "done" && t.dueDate && t.dueDate < today);
    const myGoals = goals.filter(g => g.ownerId === e.id && g.status !== "archived");
    const goalsAvg = myGoals.length ? Math.round(myGoals.reduce((n, g) => n + (g.progress || 0), 0) / myGoals.length) : null;
    const outputMetrics = { tasksDone: doneInRange.length, onTimeRate: pct(onTime.length, doneInRange.length), overdueOpen: overdueOpen.length, goals: myGoals.length, goalsAvg, goalsCompleted: myGoals.filter(g => g.status === "completed" && inRange(g.completedAt, from, to)).length };
    const outputParts = [outputMetrics.onTimeRate, goalsAvg].filter(v => v != null);
    let outputScore = outputParts.length ? clamp(outputParts.reduce((a, b) => a + b, 0) / outputParts.length - overdueOpen.length * 5) : (overdueOpen.length ? clamp(50 - overdueOpen.length * 10) : null);
    if (overdueOpen.length >= 3) flag("warn", `${overdueOpen.length} overdue tasks.`);

    // ── Sales activity (pipeline roles) ──
    let salesScore = null, salesMetrics = null;
    if (perms.has("pipeline")) {
      const mine = deals.filter(d => d.ownerId === e.id);
      const created = mine.filter(d => inRange(d.createdAt, from, to)).length;
      const moves = mine.reduce((n, d) => n + (d.timeline || []).filter(t => t.kind === "stage" && inRange(t.at, from, to)).length, 0);
      const won = mine.filter(d => d.stage === "won" && inRange(d.wonAt, from, to));
      salesMetrics = { created, stageMoves: moves, won: won.length, wonValue: won.reduce((n, d) => n + (Number(d.value) || 0), 0), openPipeline: mine.filter(d => !["won", "lost"].includes(d.stage)).reduce((n, d) => n + (Number(d.value) || 0), 0) };
      salesScore = clamp(created * 10 + moves * 6 + won.length * 30);
    }

    // ── Engagement ──
    const myPosts = posts.filter(p => p.authorId === e.id && inRange(p.createdAt, from, to));
    const kudos = posts.filter(p => p.type === "kudos" && p.kudosTo === e.id && inRange(p.createdAt, from, to)).length;
    const engagementMetrics = { posts: myPosts.length, kudosReceived: kudos, standups };
    const engagementScore = clamp(myPosts.length * 8 + kudos * 12 + standups * 3);

    const parts = { attendance: attendanceScore, field: fieldScore, output: outputScore, reporting: reportingScore, sales: salesScore, engagement: engagementScore };
    let wsum = 0, total = 0;
    for (const [k, v] of Object.entries(parts)) if (v != null) { wsum += WEIGHTS[k]; total += v * WEIGHTS[k]; }
    let overall = wsum ? Math.round(total / wsum) : 0;
    // Serious integrity problems cap the grade regardless of volume.
    const high = flags.filter(f => f.severity === "high").length;
    if (high >= 2) overall = Math.min(overall, 49); else if (high === 1) overall = Math.min(overall, 69);
    const grade = overall >= 85 ? "A" : overall >= 70 ? "B" : overall >= 55 ? "C" : overall >= 40 ? "D" : "E";

    return {
      employeeId: e.id, fullName: e.fullName, title: e.title, department: e.department || "", role: roleOf(e, catalog).label,
      avatarDataUrl: e.avatarDataUrl || "", managerId: e.managerId || null, isField,
      overall, grade, scores: parts, integrity: high ? "concern" : flags.length ? "review" : "clean", flags,
      metrics: { attendance: attendanceMetrics, field: fieldMetrics, reporting: reportingMetrics, output: outputMetrics, sales: salesMetrics, engagement: engagementMetrics },
    };
  }).sort((a, b) => b.overall - a.overall);
}

export async function loadPerformanceData(listRecords, getRoleCatalog) {
  const [employees, catalog, attendance, visits, spotchecks, reports, tasks, goals, deals, posts, leave] = await Promise.all([
    listRecords("employees"), getRoleCatalog(), listRecords("attendance"), listRecords("visits"), listRecords("spotchecks"),
    listRecords("reports"), listRecords("tasks"), listRecords("goals"), listRecords("deals"), listRecords("posts"), listRecords("leave"),
  ]);
  return { employees, catalog, attendance, visits, spotchecks, reports, tasks, goals, deals, posts, leave };
}
