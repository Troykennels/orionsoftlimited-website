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

// Field verification: one unannounced spot check per weekday for staff who
// are clocked in on field work, at a random time between 10:30 and 15:30
// Lagos (the time is chosen fresh each day and never shown to staff).
async function spotChecks(now) {
  const today = lagosDate(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const { get: kget, set: kset } = await import("../store.js");
  const { OFFICE_CONFIG_KEY, DEFAULT_OFFICE_CONFIG } = await import("../staff/office.js");
  const cfg = { ...DEFAULT_OFFICE_CONFIG, ...((await kget(OFFICE_CONFIG_KEY)) || {}) };
  const spots = await listRecords("spotchecks");

  // Close anything past its deadline and tell the manager.
  for (const s of spots.filter(x => x.status === "pending" && Date.parse(x.dueAt) < Date.now())) {
    s.status = "missed";
    await putRecord("spotchecks", s.id, s);
    const [employees, { getRoleCatalog, managerChain }] = await Promise.all([listRecords("employees"), import("./roles.js")]);
    const emp = employees.find(e => e.id === s.employeeId);
    const mgr = emp ? managerChain(emp, employees, await getRoleCatalog())[0] : null;
    await notify([mgr?.id].filter(Boolean), { type: "field", title: `${emp?.fullName || "A staff member"} missed a location check`, body: "No response within the 20-minute window.", link: "team" });
  }

  if (!cfg.spotChecks || weekday === 0 || weekday === 6) return;
  const planKey = `orionsoft:spot:plan:${today}`;
  let plan = await kget(planKey);
  if (!plan) {
    plan = { minute: 630 + Math.floor(Math.random() * 300), done: false }; // 10:30–15:30
    await kset(planKey, plan);
  }
  const minuteNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (plan.done || minuteNow < plan.minute) return;
  plan.done = true;
  await kset(planKey, plan);
  const [employees, attendance] = await Promise.all([listRecords("employees"), listRecords("attendance")]);
  const { issueSpotCheck } = await import("../staff/visits.js");
  for (const a of attendance.filter(x => x.date === today && x.clockIn && !x.clockOut && ["field", "client_site", "hybrid"].includes(x.mode))) {
    const emp = employees.find(e => e.id === a.employeeId && e.status === "active");
    if (emp && !spots.some(s => s.employeeId === emp.id && s.issuedAt.slice(0, 10) === new Date().toISOString().slice(0, 10))) await issueSpotCheck(emp);
  }
}

// Anyone still clocked in from a previous day forgot to clock out: close the
// record at their last activity (no free hours) and flag it.
async function forgottenClockOuts(today) {
  for (const a of (await listRecords("attendance")).filter(x => x.date < today && x.clockIn && !x.clockOut)) {
    a.clockOut = a.resumedAt || a.clockIn;
    a.forgotClockOut = true;
    a.events = [...(a.events || []), { type: "auto_close", at: new Date().toISOString() }];
    await putRecord("attendance", a.id, a);
    await notify([a.employeeId], { type: "attendance", title: `You didn't clock out on ${a.date}`, body: "Hours after your last activity weren't counted. Remember to clock out at the end of the day.", link: "home" });
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
    await spotChecks(now);
    await once(`orionsoft:automation:autoclose:${today}`, () => forgottenClockOuts(today));
  } catch (err) {
    console.error("[automations]", err.message);
  } finally { running = false; }
}
