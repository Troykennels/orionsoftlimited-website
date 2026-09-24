// Admin: attendance timesheets (clock-in/out times, GPS, device, lateness),
// field visits with evidence, spot checks, and performance scorecards.
import { listRecords, getRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { getRoleCatalog } from "../_lib/roles.js";
import { computeScorecards, loadPerformanceData, WEIGHTS } from "../_lib/performance.js";
import { lagosDate } from "../_lib/automations.js";
import { getSites } from "../_lib/fieldIntel.js";
import { issueSpotCheck } from "../staff/visits.js";
import { logAudit } from "../_lib/audit.js";

const monthStart = today => `${today.slice(0, 8)}01`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;
  const today = lagosDate();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query?.from || "") ? req.query.from : monthStart(today);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query?.to || "") ? req.query.to : today;

  if (req.method === "GET") {
    const view = req.query.view || "performance";

    if (view === "performance") {
      const data = await loadPerformanceData(listRecords, getRoleCatalog);
      return res.json({ ok: true, from, to, weights: WEIGHTS, scorecards: computeScorecards(data, from, to, today) });
    }

    if (view === "attendance") {
      const [attendance, employees] = await Promise.all([listRecords("attendance"), listRecords("employees")]);
      const name = id => employees.find(e => e.id === id)?.fullName || "Former staff";
      const rows = attendance
        .filter(a => a.date >= from && a.date <= to && (!req.query.employeeId || a.employeeId === req.query.employeeId))
        .sort((a, b) => b.date.localeCompare(a.date) || name(a.employeeId).localeCompare(name(b.employeeId)))
        .map(a => ({ ...a, employeeName: name(a.employeeId) }));
      // Who hasn't clocked in today (active staff, weekday).
      const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
      const leave = await listRecords("leave");
      const onLeave = new Set(leave.filter(l => l.status === "approved" && l.startDate <= today && l.endDate >= today).map(l => l.employeeId));
      const absentToday = weekday === 0 || weekday === 6 ? [] : employees
        .filter(e => e.status === "active" && e.staffRole !== "owner" && !onLeave.has(e.id) && !attendance.some(a => a.employeeId === e.id && a.date === today && a.clockIn))
        .map(e => ({ id: e.id, fullName: e.fullName }));
      return res.json({ ok: true, from, to, today, rows, absentToday, onLeaveToday: [...onLeave].map(id => ({ id, fullName: name(id) })) });
    }

    if (view === "visits") {
      if (req.query.id) {
        const v = await getRecord("visits", req.query.id);
        if (!v) return res.status(404).json({ error: "Visit not found" });
        return res.json({ ok: true, visit: { ...v, confirmation: { ...v.confirmation, token: undefined } } });
      }
      const [visits, employees, sites] = await Promise.all([listRecords("visits"), listRecords("employees"), getSites()]);
      const name = id => employees.find(e => e.id === id)?.fullName || "Former staff";
      const list = visits.filter(v => v.checkIn.at.slice(0, 10) >= from && v.checkIn.at.slice(0, 10) <= to && (!req.query.employeeId || v.employeeId === req.query.employeeId))
        .sort((a, b) => b.checkIn.at.localeCompare(a.checkIn.at))
        .map(({ photoDataUrl, ...v }) => ({ ...v, hasPhoto: !!photoDataUrl, employeeName: name(v.employeeId), confirmation: { ...v.confirmation, token: undefined } }));
      return res.json({ ok: true, from, to, visits: list, sites: Object.values(sites) });
    }

    if (view === "spotchecks") {
      const [spots, employees] = await Promise.all([listRecords("spotchecks"), listRecords("employees")]);
      const name = id => employees.find(e => e.id === id)?.fullName || "Former staff";
      if (req.query.id) {
        const s = spots.find(x => x.id === req.query.id);
        return s ? res.json({ ok: true, spotcheck: { ...s, employeeName: name(s.employeeId) } }) : res.status(404).json({ error: "Not found" });
      }
      return res.json({ ok: true, spotchecks: spots.filter(s => s.issuedAt.slice(0, 10) >= from && s.issuedAt.slice(0, 10) <= to).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).map(s => ({ ...s, employeeName: name(s.employeeId), response: s.response ? { ...s.response, photoDataUrl: undefined, hasPhoto: !!s.response.photoDataUrl } : null })) });
    }

    return res.status(400).json({ error: "Unknown view" });
  }

  if (req.method === "POST") {
    const { action, employeeId } = req.body || {};
    if (action === "spot-request") {
      const emp = await getRecord("employees", employeeId);
      if (!emp || emp.status !== "active") return res.status(404).json({ error: "Employee not found" });
      const s = await issueSpotCheck(emp, `Requested by ${session.name || "management"}`, session.sub);
      await logAudit(session, "spot_check_request", `employee ${emp.id}`, emp.fullName);
      return res.json({ ok: true, spotcheck: s });
    }
    return res.status(400).json({ error: "Unknown action" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
