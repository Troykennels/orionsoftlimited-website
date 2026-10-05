// Visit plans ("beat plans"): the client stops a field person intends to make
// on a day, set by them or their manager, compared with the visits they
// actually checked in to. Matching is by organisation name.
import { normOrg } from "./fieldIntel.js";

export const planId = (employeeId, date) => `vp_${employeeId}_${date}`;

export function cleanStops(stops) {
  return (Array.isArray(stops) ? stops : []).filter(s => String(s?.organisation || "").trim()).slice(0, 25).map((s, i) => ({
    id: String(s.id || `stop${i}_${Date.now().toString(36)}`).slice(0, 40),
    organisation: String(s.organisation).trim().slice(0, 160),
    purpose: String(s.purpose || "").slice(0, 200),
    time: /^\d{2}:\d{2}$/.test(s.time || "") ? s.time : "",
    address: String(s.address || "").slice(0, 200),
  }));
}

// Planned vs actual for one person's day. `visits` = that person's visits on
// that date. Pending stops become "missed" once the day is over.
export function comparePlan(plan, visits, { dayOver = false } = {}) {
  const used = new Set();
  const stops = (plan?.stops || []).map(s => {
    const v = visits.find(x => !used.has(x.id) && normOrg(x.organisation) === normOrg(s.organisation));
    if (v) used.add(v.id);
    return { ...s, status: v ? "visited" : dayOver ? "missed" : "pending", visitId: v?.id || null, at: v?.checkIn?.at || null, durationMin: v?.durationMin ?? null };
  });
  const unplanned = visits.filter(v => !used.has(v.id)).map(v => ({ visitId: v.id, organisation: v.organisation, at: v.checkIn.at }));
  const visited = stops.filter(s => s.status === "visited").length;
  return { stops, unplanned, visited, planned: stops.length, pct: stops.length ? Math.round((visited / stops.length) * 100) : null };
}
