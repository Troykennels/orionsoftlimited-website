// Scheduled office automations. server.js runs runAutomations() every few
// minutes on Railway; api/staff/office.js also calls it lazily on page load,
// so everything still happens on hosts without a long-running process.
// Every job is idempotent: daily jobs are keyed by the Lagos calendar date,
// per-item reminders set a flag on the record, so repeated runs are harmless.
import { get, set } from "../store.js";
import { listRecords, putRecord } from "./records.js";
import { notify, systemPost, addAchievement } from "./office.js";

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // WAT, UTC+1, no DST

export function lagosNow() { return new Date(Date.now() + LAGOS_OFFSET_MS); }
export function lagosDate(d = lagosNow()) { return d.toISOString().slice(0, 10); }
// A stored UTC timestamp expressed as Lagos wall-clock "YYYY-MM-DDTHH:mm".
export function toLagos(iso) { const t = Date.parse(iso); return t ? new Date(t + LAGOS_OFFSET_MS).toISOString().slice(0, 16) : ""; }

async function once(key, fn) {
  if (await get(key)) return false;
  await set(key, new Date().toISOString());
  await fn();
  return true;
}

function yearsBetween(from, today) {
  return parseInt(today.slice(0, 4), 10) - parseInt(from.slice(0, 4), 10);
}

async function dailyJobs(today) {
  const [employees, tasks, goals, deals, liaisons, meetings, leave, reports] = await Promise.all([
    listRecords("employees"), listRecords("tasks"), listRecords("goals"), listRecords("deals"),
    listRecords("liaisons"), listRecords("meetings"), listRecords("leave"), listRecords("reports"),
  ]);
  const active = employees.filter(e => e.status === "active");
  const everyone = active.map(e => e.id);
  const mmdd = today.slice(5);

  // Birthdays & work anniversaries → celebratory feed post + notify everyone.
  for (const e of active) {
    if (e.dateOfBirth && e.dateOfBirth.slice(5) === mmdd) {
      const post = await systemPost({ type: "celebration", text: `🎂 Happy birthday, @${e.slug}! Wishing you a fantastic year ahead from everyone at Orion Soft.`, meta: { kind: "birthday", employeeId: e.id } });
      await notify(everyone, { type: "celebration", title: `It's ${e.fullName}'s birthday today 🎂`, body: "Drop a wish on the office feed.", link: `feed:${post.id}` });
    }
    if (e.startDate && e.startDate.slice(5) === mmdd && yearsBetween(e.startDate, today) >= 1) {
      const yrs = yearsBetween(e.startDate, today);
      const post = await systemPost({ type: "celebration", text: `🎉 @${e.slug} celebrates ${yrs} year${yrs === 1 ? "" : "s"} at Orion Soft today. Thank you for everything you do!`, meta: { kind: "anniversary", employeeId: e.id } });
      await addAchievement(e.id, `${yrs} year${yrs === 1 ? "" : "s"} at Orion Soft`, "anniversary");
      await notify(everyone, { type: "celebration", title: `${e.fullName}: ${yrs}-year work anniversary 🎉`, link: `feed:${post.id}` });
    }
  }

  // Friday: weekly report reminder for anyone who hasn't filed one this week.
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (weekday === 5) {
    const weekAgo = new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10);
    const filed = new Set(reports.filter(r => (r.weekEnd || "") >= weekAgo).map(r => r.employeeId));
    await notify(active.filter(e => !filed.has(e.id)).map(e => e.id), {
      type: "reminder", title: "Weekly report due today", body: "Submit your weekly report before you log off.", link: "reports",
    });
  }

  // Overdue tasks.
  for (const t of tasks) {
    if (t.assigneeId && t.status !== "done" && t.dueDate && t.dueDate < today) {
      await notify([t.assigneeId], { type: "task", title: `Overdue: ${t.title}`, body: `Was due ${t.dueDate}.`, link: `tasks:${t.id}` });
    }
  }

  // Goals due within 3 days and not finished.
  const soon = new Date(Date.parse(today) + 3 * 86400000).toISOString().slice(0, 10);
  for (const g of goals) {
    if (g.status === "active" && g.dueDate && g.dueDate >= today && g.dueDate <= soon && (g.progress || 0) < 100) {
      await notify([g.ownerId], { type: "goal", title: `Goal due ${g.dueDate === today ? "today" : "soon"}: ${g.title}`, body: `Currently at ${g.progress || 0}%.`, link: `goals:${g.id}` });
    }
  }

  // Deal & stakeholder follow-ups due today.
  for (const d of deals) {
    if (d.nextFollowUp === today && !["won", "lost"].includes(d.stage)) {
      await notify([d.ownerId], { type: "pipeline", title: `Follow up today: ${d.organisation}`, body: d.nextAction || "", link: `pipeline:${d.id}` });
    }
  }
  for (const l of liaisons) {
    if (l.nextFollowUp === today) {
      await notify([l.ownerId], { type: "liaison", title: `Stakeholder follow-up: ${l.organisation}`, body: l.nextAction || "", link: `liaison:${l.id}` });
    }
  }

  // Morning agenda: today's meetings.
  const todays = meetings.filter(m => toLagos(m.startsAt).slice(0, 10) === today && m.status !== "cancelled");
  const perPerson = new Map();
  for (const m of todays) for (const id of [m.hostId, ...(m.attendeeIds || [])]) {
    perPerson.set(id, [...(perPerson.get(id) || []), m]);
  }
  for (const [id, ms] of perPerson) {
    await notify([id], { type: "meeting", title: `You have ${ms.length} meeting${ms.length === 1 ? "" : "s"} today`, body: ms.map(m => `${toLagos(m.startsAt).slice(11, 16)} ${m.title}`).join(" · "), link: "meetings" });
  }

  // Approved leave starting today → presence switches to "on leave".
  for (const l of leave) {
    if (l.status === "approved" && l.startDate <= today && l.endDate >= today) {
      const e = active.find(x => x.id === l.employeeId);
      if (e && e.presence?.status !== "leave") {
        e.presence = { status: "leave", note: `On leave until ${l.endDate}`, at: new Date().toISOString(), auto: true };
        await putRecord("employees", e.id, e);
      }
    } else if (l.status === "approved" && l.endDate < today) {
      const e = active.find(x => x.id === l.employeeId);
      if (e && e.presence?.status === "leave" && e.presence.auto) {
        e.presence = { status: "offline", at: new Date().toISOString() };
        await putRecord("employees", e.id, e);
      }
    }
  }
}

// 15-minute meeting reminders (runs every tick, flag prevents repeats).
async function meetingReminders() {
  const meetings = await listRecords("meetings");
  const now = Date.now();
  for (const m of meetings) {
    if (m.reminded || m.status === "cancelled" || !m.startsAt) continue;
    const start = Date.parse(m.startsAt);
    if (start - now <= 15 * 60000 && start > now - 5 * 60000) {
      m.reminded = true;
      await putRecord("meetings", m.id, m);
      await notify([m.hostId, ...(m.attendeeIds || [])], { type: "meeting", title: `Starting soon: ${m.title}`, body: m.link ? `Join: ${m.link}` : (m.location || ""), link: `meetings:${m.id}` });
    }
  }
}

let running = false;
export async function runAutomations() {
  if (running) return;
  running = true;
  try {
    const now = lagosNow();
    const today = lagosDate(now);
    // Daily jobs wait until 07:00 Lagos time so greetings land in the morning.
    if (now.getUTCHours() >= 7) await once(`orionsoft:automation:daily:${today}`, () => dailyJobs(today));
    await meetingReminders();
  } catch (err) {
    console.error("[automations]", err.message);
  } finally { running = false; }
}
