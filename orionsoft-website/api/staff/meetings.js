// Meetings: scheduling with an auto-generated video room, RSVPs, minutes, and
// action items that become assigned tasks automatically.
import { createHash, randomUUID } from 'node:crypto';
import { acquireLease, releaseLease } from '../store.js';
import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { officeContext, notify, cleanUrl, awardDaily } from "../_lib/office.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, active } = ctx;
  const involved = m => m.hostId === me.id || (m.attendeeIds || []).includes(me.id) || m.everyone;

  if (req.method === "GET") {
    const all = await listRecords("meetings");
    const mine = all.filter(involved).sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));
    return res.json({ ok: true, meetings: mine });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const start = Date.parse(b.startsAt);
    if (!String(b.title || "").trim() || !start) return res.status(400).json({ error: "Title and a start time are required" });
    if (b.roomMode === "custom" && !cleanUrl(b.link)) return res.status(400).json({ error: "Enter a valid meeting link." });
    const everyone = !!b.everyone;
    const attendeeIds = everyone ? active.map(e => e.id).filter(id => id !== me.id)
      : [...new Set((Array.isArray(b.attendeeIds) ? b.attendeeIds : []).filter(id => id !== me.id && active.some(e => e.id === id)))];
    const id = newId("mtg");
    const meeting = {
      id, title: String(b.title).slice(0, 140), agenda: String(b.agenda || "").slice(0, 3000),
      startsAt: new Date(start).toISOString(), durationMin: Math.min(480, Math.max(10, parseInt(b.durationMin, 10) || 30)),
      roomMode: b.roomMode === "custom" || cleanUrl(b.link) ? "custom" : b.link === "none" || b.roomMode === "none" ? "none" : "internal",
      link: b.link === "none" ? "" : cleanUrl(b.link), location: String(b.location || "").slice(0, 140),
      hostId: me.id, attendeeIds, everyone, rsvps: { [me.id]: "yes" }, notes: "", actionItems: [],
      status: "scheduled", reminded: false, createdAt: new Date().toISOString(),
    };
    await putRecord("meetings", id, meeting);
    await awardDaily(me.id, "meeting_hosted", 3);
    const when = new Date(start).toLocaleString("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    await notify(attendeeIds, { type: b.instant ? "call" : "meeting", title: b.instant ? `${me.fullName} is calling: ${meeting.title}` : `${me.fullName} invited you: ${meeting.title}`, body: b.instant ? "Open the call inside your Staff Office." : when, link: b.instant ? `meetings:join-${id}` : `meetings:${id}`, actorId: me.id });
    return res.json({ ok: true, meeting });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const lock = `orionsoft:meeting-edit:${b.id}`, token = randomUUID();
    if (!await acquireLease(lock, token, 20)) return res.status(409).json({ error: "This meeting is being saved. Please try again." });
    try {
    const m = await getRecord("meetings", b.id);
    if (!m || !involved(m)) return res.status(404).json({ error: "Meeting not found" });

    const operation = typeof b.operationId === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(b.operationId) ? `${me.id}:${b.operationId}` : null;
    if (operation && (m.appliedOperations || []).includes(operation)) return res.json({ ok: true, meeting: m });
    if (b.rsvp && m.status !== 'scheduled') return res.status(409).json({ error: 'This meeting is closed.' });
    if (b.rsvp) {
      if (!["yes", "no", "maybe"].includes(b.rsvp)) return res.status(400).json({ error: "Invalid RSVP" });
      m.rsvps = { ...(m.rsvps || {}), [me.id]: b.rsvp };
      await putRecord("meetings", m.id, m);
      if (m.hostId !== me.id) await notify([m.hostId], { type: "meeting", title: `${me.fullName} replied ${b.rsvp} to ${m.title}`, link: `meetings:${m.id}`, actorId: me.id });
      return res.json({ ok: true, meeting: m });
    }

    if (m.hostId !== me.id) return res.status(403).json({ error: "Only the host can edit this meeting" });
    if (b.status === "cancelled") {
      m.status = "cancelled";
      await putRecord("meetings", m.id, m);
      await notify(m.attendeeIds, { type: "meeting", title: `Cancelled: ${m.title}`, link: "meetings", actorId: me.id });
      return res.json({ ok: true, meeting: m });
    }
    if (b.notes !== undefined) m.notes = String(b.notes).slice(0, 6000);
    // Minutes: action items with an owner become real tasks on their board.
    if (Array.isArray(b.actionItems)) {
      const created = [];
      for (const item of b.actionItems) {
        if (!item?.text || item.taskId) continue;
        const assigneeId = active.some(e => e.id === item.assigneeId) ? item.assigneeId : me.id;
        const tid = operation ? `task_${createHash('sha256').update(`${m.id}:${operation}:${created.length}`).digest('hex').slice(0,28)}` : newId("task");
        const existing = await getRecord('tasks',tid);
        if (!existing) {
        await putRecord("tasks", tid, {
          id: tid, title: String(item.text).slice(0, 160), description: `Action item from meeting "${m.title}"`,
          project: "Meeting actions", assigneeId, priority: "medium", status: "todo", dueDate: item.dueDate || null,
          createdAt: new Date().toISOString(), createdBy: me.id, createdByEmployee: me.id, updatedAt: new Date().toISOString(), comments: [],
        });
        }
        created.push({ ...item, assigneeId, taskId: tid });
        await notify([assigneeId], { type: "task", title: `New action item from ${m.title}`, body: item.text, link: `tasks:${tid}`, actorId: me.id });
      }
      m.actionItems = [...(m.actionItems || []), ...created];
    }
    if (b.done) m.status = "done";
    if (operation) m.appliedOperations = [...(m.appliedOperations || []), operation].slice(-50);
    await putRecord("meetings", m.id, m);
    return res.json({ ok: true, meeting: m });
    } finally { await releaseLease(lock, token); }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
