// Field visits & spot checks: verifiable proof of field work.
//  - Check in at a client: live GPS + live camera photo (watermarked and
//    fingerprinted in the browser), device + IP, scored for trust.
//  - The client confirms the visit via a link (email or WhatsApp): third-party
//    proof that also teaches the system where that client actually is.
//  - Spot checks: at a random time, field staff must confirm location + photo
//    within 20 minutes. Managers can also request one on demand.
import { randomBytes } from "node:crypto";
import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { officeContext, notify, award, logActivity } from "../_lib/office.js";
import { managerChain, subordinates, canApproveFor } from "../_lib/roles.js";
import { lagosDate } from "../_lib/automations.js";
import { cleanGeo, requestMeta, scoreVisit, getSites, normOrg, haversineMeters } from "../_lib/fieldIntel.js";
import { sendVisitConfirmation, notifySpotCheck } from "../_lib/emailTemplates.js";

const BASE = process.env.APP_BASE_URL || "https://orionsoftlimited.com";
export const SPOT_WINDOW_MIN = 20;

function validPhoto(d) {
  return !d || (typeof d === "string" && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(d) && d.length < 900_000);
}
function stripPhoto(v) { const { photoDataUrl, ...rest } = v; return { ...rest, hasPhoto: !!photoDataUrl, confirmation: { ...(v.confirmation || {}), token: undefined } }; }
export const confirmUrl = token => `${BASE}/confirm-visit/${token}`;

// Everything needed to (re)score a visit fairly.
export async function rescoreVisit(visit) {
  const [visits, attendance, sites] = await Promise.all([listRecords("visits"), listRecords("attendance"), getSites()]);
  const day = visit.checkIn.at.slice(0, 10);
  const att = attendance.find(a => a.employeeId === visit.employeeId && a.date === day);
  const priorEvents = [
    ...(att?.events || []).filter(e => e.geo).map(e => ({ at: e.at, geo: e.geo, kind: e.type.replace("_", " ") })),
    ...visits.filter(v => v.employeeId === visit.employeeId && v.id !== visit.id && v.checkIn.at.slice(0, 10) === day)
      .flatMap(v => [{ at: v.checkIn.at, geo: v.checkIn.geo, kind: `visit to ${v.organisation}` }, v.checkOut?.at ? { at: v.checkOut.at, geo: v.checkOut.geo, kind: `leaving ${v.organisation}` } : null].filter(Boolean)),
  ];
  const site = sites[normOrg(visit.organisation)];
  // Clock-in spots from the previous 45 days (not the visit day) = home base.
  const since = new Date(Date.parse(visit.checkIn.at) - 45 * 86400000).toISOString().slice(0, 10);
  const homeClockIns = attendance.filter(a => a.employeeId === visit.employeeId && a.clockInGeo && a.date >= since && a.date !== day).map(a => ({ date: a.date, geo: a.clockInGeo }));
  const scored = scoreVisit(visit, {
    priorEvents, site: site && site.visitId !== visit.id ? site : null,
    homeClockIns,
    otherPhotoHashes: visits.filter(v => v.photoHash && v.id !== visit.id).map(v => ({ hash: v.photoHash, visitId: v.id, employeeId: v.employeeId })),
  });
  return { ...visit, trust: scored.trust, flags: scored.flags, level: scored.level, distanceFromSite: site && visit.checkIn.geo ? haversineMeters(site, visit.checkIn.geo) : null };
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
  const companyWide = ctx.can("org.approve") || ctx.can("hr.records");
  const team = new Set(subordinates(me, employees, catalog).map(e => e.id));
  const canSee = empId => empId === me.id || companyWide || team.has(empId);

  if (req.method === "GET") {
    if (req.query.id) {
      const v = await getRecord("visits", req.query.id);
      if (!v || !canSee(v.employeeId)) return res.status(404).json({ error: "Visit not found" });
      return res.json({ ok: true, visit: { ...v, confirmation: { ...(v.confirmation || {}), token: v.employeeId === me.id ? v.confirmation?.token : undefined }, confirmUrl: v.employeeId === me.id && v.confirmation?.token ? confirmUrl(v.confirmation.token) : undefined } });
    }
    const [visits, spots] = await Promise.all([listRecords("visits"), listRecords("spotchecks")]);
    const scope = req.query.scope === "team" ? (e => e !== me.id && canSee(e)) : (e => e === me.id);
    const from = req.query.from || "0000", to = req.query.to || "9999";
    const list = visits.filter(v => scope(v.employeeId) && v.checkIn.at.slice(0, 10) >= from && v.checkIn.at.slice(0, 10) <= to)
      .sort((a, b) => b.checkIn.at.localeCompare(a.checkIn.at)).slice(0, 300).map(stripPhoto);
    const myActive = visits.find(v => v.employeeId === me.id && !v.checkOut?.at);
    return res.json({
      ok: true, visits: list,
      active: myActive ? { ...stripPhoto(myActive), confirmUrl: myActive.confirmation?.token ? confirmUrl(myActive.confirmation.token) : null } : null,
      pendingSpotChecks: spots.filter(s => s.employeeId === me.id && s.status === "pending" && Date.parse(s.dueAt) > Date.now()),
      spotChecks: spots.filter(s => scope(s.employeeId)).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 100).map(s => ({ ...s, response: s.response ? { ...s.response, photoDataUrl: undefined, hasPhoto: !!s.response.photoDataUrl } : null })),
    });
  }

  const b = req.body || {};
  const meta = requestMeta(req);
  const now = new Date().toISOString();

  if (b.action === "check-in") {
    const organisation = String(b.organisation || "").trim().slice(0, 160);
    if (!organisation) return res.status(400).json({ error: "Which organisation are you visiting?" });
    if (!validPhoto(b.photoDataUrl)) return res.status(400).json({ error: "Photo must be a JPEG/PNG under ~650KB" });
    const visits = await listRecords("visits");
    const open = visits.find(v => v.employeeId === me.id && !v.checkOut?.at);
    if (open) return res.status(400).json({ error: `You're still checked in at ${open.organisation}. Check out first.` });
    const id = newId("vis");
    let visit = {
      id, employeeId: me.id, organisation,
      dealId: b.dealId || null, stakeholderId: b.stakeholderId || null,
      purpose: String(b.purpose || "").slice(0, 300),
      contactName: String(b.contactName || "").slice(0, 100), contactPhone: String(b.contactPhone || "").slice(0, 40), contactEmail: String(b.contactEmail || "").slice(0, 120),
      checkIn: { at: now, geo: cleanGeo(b.geo), ip: meta.ip, ua: meta.ua, deviceId: String(b.deviceId || "").slice(0, 64), geoError: b.geo ? null : String(b.geoError || "Location not shared").slice(0, 120) },
      checkOut: null, durationMin: null,
      photoDataUrl: b.photoDataUrl || "", photoHash: /^[0-9a-f]{16}$/.test(b.photoHash || "") ? b.photoHash : null,
      photoSource: b.photoSource === "camera" ? "camera" : b.photoDataUrl ? "upload" : null,
      notes: String(b.notes || "").slice(0, 1500), outcome: "", nextStep: "",
      confirmation: { token: randomBytes(18).toString("base64url"), status: "pending", requestedAt: now },
      createdAt: now,
    };
    visit = await rescoreVisit(visit);
    await putRecord("visits", id, visit);
    await award(me.id, "field_visit");
    await logActivity(me.id, "visit", `Checked in at ${organisation}`);
    if (visit.dealId) {
      const deal = await getRecord("deals", visit.dealId);
      if (deal && (deal.ownerId === me.id || canSee(deal.ownerId))) {
        deal.timeline = [{ at: now, by: me.id, text: `Field visit checked in (trust ${visit.trust}%)`, kind: "visit" }, ...(deal.timeline || [])];
        await putRecord("deals", deal.id, deal);
      }
    }
    if (visit.contactEmail) {
      try { await sendVisitConfirmation(visit, me, confirmUrl(visit.confirmation.token)); visit.confirmation.channel = "email"; await putRecord("visits", id, visit); } catch { /* best-effort */ }
    }
    if (visit.level === "suspicious") {
      const mgr = managerChain(me, employees, catalog)[0];
      if (mgr) await notify([mgr.id], { type: "field", title: `⚠ Suspicious check-in: ${me.fullName} at ${organisation}`, body: visit.flags.filter(f => f.penalty < 0).map(f => f.label).join(" "), link: "team", actorId: me.id });
    }
    return res.json({ ok: true, visit: stripPhoto(visit), confirmUrl: confirmUrl(visit.confirmation.token) });
  }

  if (b.action === "check-out") {
    const v = await getRecord("visits", b.id);
    if (!v || v.employeeId !== me.id) return res.status(404).json({ error: "Visit not found" });
    if (v.checkOut?.at) return res.status(400).json({ error: "Already checked out" });
    v.checkOut = { at: now, geo: cleanGeo(b.geo), ip: meta.ip };
    v.durationMin = Math.round((Date.parse(now) - Date.parse(v.checkIn.at)) / 60000);
    v.outcome = String(b.outcome || "").slice(0, 1000);
    v.nextStep = String(b.nextStep || "").slice(0, 300);
    const scored = await rescoreVisit(v);
    await putRecord("visits", v.id, scored);
    return res.json({ ok: true, visit: stripPhoto(scored) });
  }

  if (b.action === "resend-confirmation") {
    const v = await getRecord("visits", b.id);
    if (!v || v.employeeId !== me.id) return res.status(404).json({ error: "Visit not found" });
    if (!v.contactEmail) return res.status(400).json({ error: "No client email on this visit. Share the link on WhatsApp instead." });
    try { await sendVisitConfirmation(v, me, confirmUrl(v.confirmation.token)); } catch { return res.status(502).json({ error: "Couldn't send the email" }); }
    return res.json({ ok: true });
  }

  if (b.action === "spot-respond") {
    const s = await getRecord("spotchecks", b.id);
    if (!s || s.employeeId !== me.id) return res.status(404).json({ error: "Location check not found" });
    if (s.status !== "pending") return res.status(400).json({ error: "This location check is already closed" });
    if (!validPhoto(b.photoDataUrl)) return res.status(400).json({ error: "Invalid photo" });
    const late = Date.parse(now) > Date.parse(s.dueAt);
    const geo = cleanGeo(b.geo);
    s.status = late ? "late" : "answered";
    s.response = { at: now, geo, ip: meta.ip, ua: meta.ua, photoDataUrl: b.photoDataUrl || "", photoHash: b.photoHash || null, photoSource: b.photoSource === "camera" ? "camera" : "upload" };
    // Compare against where they claimed to be (latest visit check-in today).
    const today = lagosDate();
    const lastVisit = (await listRecords("visits")).filter(v => v.employeeId === me.id && v.checkIn.at.slice(0, 10) === today && v.checkIn.geo).sort((a, b2) => b2.checkIn.at.localeCompare(a.checkIn.at))[0];
    s.flags = [];
    if (!geo) s.flags.push({ code: "NO_GPS", label: "No location shared" });
    if (geo && geo.accuracy != null && geo.accuracy <= 1) s.flags.push({ code: "FAKE_GPS_PATTERN", label: "Accuracy pattern typical of GPS spoofing" });
    if (late) s.flags.push({ code: "LATE", label: `Answered ${Math.round((Date.parse(now) - Date.parse(s.dueAt)) / 60000)} min after the deadline` });
    if (s.response.photoSource !== "camera") s.flags.push({ code: "GALLERY_PHOTO", label: "Photo not taken live" });
    if (lastVisit && geo) {
      s.distanceFromLastVisit = haversineMeters(lastVisit.checkIn.geo, geo);
      s.lastVisitOrganisation = lastVisit.organisation;
      if (!lastVisit.checkOut?.at && s.distanceFromLastVisit > 700) s.flags.push({ code: "NOT_AT_VISIT", label: `${(s.distanceFromLastVisit / 1000).toFixed(1)}km from ${lastVisit.organisation}, where they are checked in` });
    }
    await putRecord("spotchecks", s.id, s);
    if (s.flags.length) {
      const mgr = managerChain(me, employees, catalog)[0];
      if (mgr) await notify([mgr.id], { type: "field", title: `Location check flagged for ${me.fullName}`, body: s.flags.map(f => f.label).join(" · "), link: "team", actorId: me.id });
    }
    return res.json({ ok: true, spotcheck: { ...s, response: { ...s.response, photoDataUrl: undefined } } });
  }

  // A manager asks someone in their reporting line to confirm location now.
  if (b.action === "spot-request") {
    const target = active.find(e => e.id === b.employeeId);
    if (!target || !canApproveFor(me, target, employees, catalog)) return res.status(403).json({ error: "You can only request location checks for people in your reporting line" });
    const s = await issueSpotCheck(target, `Requested by ${me.fullName}`, me.id);
    return res.json({ ok: true, spotcheck: s });
  }

  return res.status(400).json({ error: "Unknown action" });
}

export async function issueSpotCheck(employee, reason = "Random daily check", requestedBy = null) {
  const now = Date.now();
  const { get } = await import("../store.js");
  const { OFFICE_CONFIG_KEY } = await import("./office.js");
  const windowMin = Math.min(60, Math.max(10, Number((await get(OFFICE_CONFIG_KEY))?.spotWindowMinutes) || SPOT_WINDOW_MIN));
  const s = {
    id: newId("spot"), employeeId: employee.id, issuedAt: new Date(now).toISOString(), dueAt: new Date(now + windowMin * 60000).toISOString(),
    status: "pending", reason, requestedBy, response: null, flags: [],
  };
  await putRecord("spotchecks", s.id, s);
  await notify([employee.id], { type: "spotcheck", title: `📍 Location check: respond within ${windowMin} minutes`, body: "Tap to open the Staff Office and confirm where you are.", link: "visits" });
  try { await notifySpotCheck(employee, s); } catch { /* best-effort */ }
  return s;
}
