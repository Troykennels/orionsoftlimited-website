// Client-side visit confirmation (no login): the client a staff member says
// they visited opens /confirm-visit/:token and answers "Yes, they visited" or
// "No". Confirmations from the staff member's own device/network are flagged.
import { listRecords, putRecord, getRecord } from "../_lib/records.js";
import { notify, award, addAchievement } from "../_lib/office.js";
import { managerChain, getRoleCatalog } from "../_lib/roles.js";
import { requestMeta, learnSite, cleanGeo } from "../_lib/fieldIntel.js";
import { rescoreVisit } from "../staff/visits.js";

const rate = new Map();
function limited(ip) {
  const now = Date.now(), e = rate.get(ip) || { n: 0, t: now };
  if (now - e.t > 3600000) { rate.set(ip, { n: 1, t: now }); return false; }
  e.n++; rate.set(ip, e);
  return e.n > 30;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const meta = requestMeta(req);
  if (limited(meta.ip)) return res.status(429).json({ error: "Too many requests" });

  const token = String((req.method === "GET" ? req.query.t : req.body?.t) || "");
  if (token.length < 16) return res.status(400).json({ error: "Invalid link" });
  const visits = await listRecords("visits");
  const visit = visits.find(v => v.confirmation?.token === token);
  if (!visit) return res.status(404).json({ error: "This confirmation link is not valid" });
  const staff = await getRecord("employees", visit.employeeId);

  const summary = {
    staffName: staff?.fullName || "An Orion Soft staff member", staffTitle: staff?.title || "", staffPhoto: staff?.avatarDataUrl || "",
    organisation: visit.organisation, at: visit.checkIn.at, purpose: visit.purpose,
    status: visit.confirmation.status, answeredAt: visit.confirmation.at || null,
  };
  if (req.method === "GET") return res.json({ ok: true, visit: summary });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (visit.confirmation.status !== "pending") return res.status(409).json({ error: "This visit has already been answered. Thank you." });

  const { answer, name, rating, comment } = req.body || {};
  if (!["yes", "no"].includes(answer)) return res.status(400).json({ error: "Please choose yes or no" });

  // Was this "client" actually the staff member?
  //  - Definitive: the confirming browser carries a Staff Office device id
  //    (set on every phone that has used the office on this site).
  //  - Weaker: same internet connection the staff member usually clocks in
  //    from. The visit's own IP is excluded, since staff and client often
  //    share the client's Wi-Fi during a genuine visit.
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const att = (await listRecords("attendance")).filter(a => a.employeeId === visit.employeeId && a.date >= since);
  const deviceId = String(req.body?.deviceId || "");
  const staffDevices = new Set([visit.checkIn.deviceId, ...att.flatMap(a => (a.events || []).map(e => e.deviceId))].filter(Boolean));
  const anyStaffDevice = deviceId && (await listRecords("attendance")).some(a => (a.events || []).some(e => e.deviceId === deviceId));
  const selfConfirmed = !!deviceId && (staffDevices.has(deviceId) || anyStaffDevice);
  const clockInIps = new Set(att.flatMap(a => (a.events || []).filter(e => e.type === "clock_in" || e.type === "resume").map(e => e.ip)).filter(ip => ip && ip !== visit.checkIn.ip));
  const sameNetwork = !selfConfirmed && clockInIps.has(meta.ip);

  visit.confirmation = {
    ...visit.confirmation, status: answer === "yes" ? "confirmed" : "disputed", at: new Date().toISOString(),
    name: String(name || "").slice(0, 100), rating: Math.min(5, Math.max(0, parseInt(rating, 10) || 0)) || null,
    comment: String(comment || "").slice(0, 600), ip: meta.ip, ua: meta.ua, deviceId: deviceId.slice(0, 64), selfConfirmed, sameNetwork,
    // Optional: the client's phone location, as an independent record of
    // where the meeting happened (only kept for a "yes").
    geo: answer === "yes" ? cleanGeo(req.body?.geo) : null,
  };
  const scored = await rescoreVisit(visit);
  await putRecord("visits", visit.id, scored);

  const [employees, catalog] = await Promise.all([listRecords("employees"), getRoleCatalog()]);
  const mgr = staff ? managerChain(staff, employees, catalog)[0] : null;
  if (answer === "yes" && !selfConfirmed && !sameNetwork) {
    const clientSoon = Date.parse(scored.confirmation.at) - Date.parse(visit.checkIn.at) <= 3 * 3600000;
    await learnSite(visit.organisation, visit.checkIn.geo || (clientSoon ? scored.confirmation.geo : null), visit.id);
    await award(visit.employeeId, "visit_confirmed");
    if (scored.confirmation.rating >= 5) await addAchievement(visit.employeeId, `5★ client rating from ${visit.organisation}`, "client");
    await notify([visit.employeeId], { type: "field", title: `✅ ${visit.organisation} confirmed your visit`, body: scored.confirmation.comment, link: "visits" });
  } else if (answer === "yes" && sameNetwork) {
    await notify([mgr?.id].filter(Boolean), { type: "field", title: `Check this: ${visit.organisation} confirmed ${staff?.fullName}'s visit from their usual clock-in connection`, link: "team" });
  } else {
    const why = selfConfirmed ? "was 'confirmed' from a Staff Office device" : "was DISPUTED by the client";
    await notify([visit.employeeId, mgr?.id].filter(Boolean), { type: "field", title: `⚠ Visit to ${visit.organisation} ${why}`, body: scored.confirmation.comment, link: "team" });
  }
  return res.json({ ok: true, visit: { ...summary, status: scored.confirmation.status } });
}
