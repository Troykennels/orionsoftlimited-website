// Working hours: a company default (Admin → Staff Office → Settings) that a
// person's own schedule can override (Admin → Employees → edit). Everything
// is Lagos wall-clock time; days use JS numbering (0 = Sunday … 6 = Saturday).
import { toLagos } from "./automations.js";

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function cleanTime(v, fallback) {
  return HHMM.test(String(v || "")) ? String(v) : fallback;
}

export function cleanDays(v, fallback = DEFAULT_WORK_DAYS) {
  if (!Array.isArray(v)) return fallback;
  const days = [...new Set(v.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return days.length ? days : fallback;
}

// A person's override, or null when they follow the company hours.
export function cleanPersonalSchedule(s) {
  if (!s || typeof s !== "object" || (!s.start && !s.end && !Array.isArray(s.days))) return null;
  return { start: cleanTime(s.start, "09:00"), end: cleanTime(s.end, "17:00"), days: cleanDays(s.days) };
}

export function scheduleFor(employee, cfg = {}) {
  const own = employee?.workSchedule || null;
  return {
    start: cleanTime(own?.start, cleanTime(cfg.workStart, "09:00")),
    end: cleanTime(own?.end, cleanTime(cfg.workEnd, "17:00")),
    days: cleanDays(own?.days, cleanDays(cfg.workDays)),
    grace: Number(cfg.graceMinutes ?? 15) || 0,
    personal: !!own,
  };
}

const toMin = hhmm => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
const lagosMinutes = iso => toMin(toLagos(iso).slice(11, 16));
const lagosWeekday = iso => new Date(`${toLagos(iso).slice(0, 10)}T12:00:00Z`).getUTCDay();

export function isWorkDay(schedule, isoOrDate) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? new Date(`${isoOrDate}T12:00:00Z`).getUTCDay() : lagosWeekday(isoOrDate);
  return schedule.days.includes(day);
}

// Within working hours right now (or at `iso`)?
export function isWorkingTime(schedule, iso = new Date().toISOString()) {
  if (!isWorkDay(schedule, iso)) return false;
  const m = lagosMinutes(iso);
  return m >= toMin(schedule.start) && m < toMin(schedule.end);
}

// Minutes late against the start time plus grace.
export function lateMinutes(clockInIso, schedule) {
  if (!isWorkDay(schedule, clockInIso)) return 0;
  const late = lagosMinutes(clockInIso) - (toMin(schedule.start) + schedule.grace);
  return late > 0 ? late : 0;
}

// Minutes left before the finish time (0 if on time or not a work day).
export function earlyMinutes(clockOutIso, schedule) {
  if (!isWorkDay(schedule, clockOutIso)) return 0;
  const early = toMin(schedule.end) - lagosMinutes(clockOutIso);
  return early > 0 ? early : 0;
}

// Minutes worked past the finish time (or all of it on a day off).
export function overtimeMinutes(clockInIso, clockOutIso, schedule) {
  const worked = Math.max(0, Math.round((Date.parse(clockOutIso) - Date.parse(clockInIso)) / 60000));
  if (!isWorkDay(schedule, clockInIso)) return worked;
  const after = lagosMinutes(clockOutIso) - toMin(schedule.end);
  return Math.max(0, Math.min(worked, after));
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function describeSchedule(s) {
  return `${s.days.map(d => DAY_NAMES[d]).join(", ")} · ${s.start}–${s.end}`;
}
