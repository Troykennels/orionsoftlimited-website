// Scheduled office automations. server.js runs runAutomations() every few
// minutes on Railway; api/staff/office.js also calls it lazily on page load,
// so everything still happens on hosts without a long-running process.
// Every job is idempotent: daily jobs are keyed by the Lagos calendar date,
// per-item reminders set a flag on the record, so repeated runs are harmless.
import { get, set, claim } from "../store.js";
import { listRecords, putRecord } from "./records.js";
import { notify, systemPost, addAchievement } from "./office.js";
import { migrateInlinePhotos } from "./photos.js";

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

  // 7am email digest on working days, for anyone with something waiting.
  try { await dailyDigests(today, active, employees, tasks, meetings, leave, reports); } catch (err) { console.error("[digest]", err.message); }

  // Probation ending and documents expiring: 30 days, 7 days, and on the day.
  {
    const { getRoleCatalog, can, managerChain } = await import("./roles.js");
    const catalog = await getRoleCatalog();
    const hr = active.filter(e => e.staffRole === "owner" || can(e, "hr.records", catalog)).map(e => e.id);
    const daysTo = d => Math.round((Date.parse(d) - Date.parse(today)) / 86400000);
    const when = n => (n === 0 ? "today" : n < 0 ? `${-n} days ago` : `in ${n} days`);
    for (const e of active) {
      const mgr = managerChain(e, employees, catalog)[0];
      if (e.probationEndDate && [30, 7, 0].includes(daysTo(e.probationEndDate))) {
        const n = daysTo(e.probationEndDate);
        await notify([...hr, mgr?.id].filter(id => id && id !== e.id), { type: "reminder", title: `${e.fullName}'s probation ends ${when(n)}`, body: "Confirm, extend or end it, and record the review.", link: "team" });
      }
      for (const d of e.documents || []) {
        if (!d.expiresOn) continue;
        const n = daysTo(d.expiresOn);
        if (![30, 7, 0, -1].includes(n)) continue;
        const title = n < 0 ? `${e.fullName}'s ${d.name} has expired` : `${e.fullName}'s ${d.name} expires ${when(n)}`;
        await notify(hr.filter(id => id !== e.id), { type: "reminder", title, body: d.number ? `No. ${d.number}` : "", link: "team" });
        await notify([e.id], { type: "reminder", title: n < 0 ? `Your ${d.name} has expired` : `Your ${d.name} expires ${when(n)}`, body: "Please renew it and send HR a copy.", link: "profile" });
      }
    }
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

// Vercel has sometimes skipped a push, leaving the website on old code while
// this API (Railway) runs the new one. Compare the two; if the website is
// behind 15+ minutes after this server started, trigger a redeploy through
// VERCEL_DEPLOY_HOOK (when set) and email the admin. Once per commit.
const SERVER_STARTED = Date.now();
async function deployCheck() {
  const mine = process.env.RAILWAY_GIT_COMMIT_SHA || "";
  if (!mine || Date.now() - SERVER_STARTED < 15 * 60 * 1000) return;
  const site = (process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "");
  const r = await fetch(`${site}/version.json`, { cache: "no-store" }).catch(() => null);
  const live = r && r.ok ? (await r.json().catch(() => ({}))).commit || "" : "";
  if (!live || live === mine) return;
  if (!(await claim(`orionsoft:deploycheck:${mine}`, 12 * 3600))) return;
  let redeployed = false;
  if (process.env.VERCEL_DEPLOY_HOOK) {
    redeployed = !!(await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: "POST" }).then(x => x.ok).catch(() => false));
  }
  const { sendEmail, brandedShell } = await import("./mailer.js");
  await sendEmail(process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com", redeployed ? "Website redeploy started automatically" : "Action needed: the website didn't update", brandedShell(`
    <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">${redeployed ? "The website missed an update, so a redeploy was started" : "The website missed an update"}</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">The server is running version <code>${mine.slice(0, 7)}</code> but the website is still on <code>${live.slice(0, 7)}</code>.</p>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">${redeployed ? "Vercel is rebuilding it now; it's usually live within 2 minutes. Nothing for you to do." : "Open Vercel → orionsoftlimited-website → Deployments, and click Redeploy on the latest one. To have this fixed automatically next time, create a Deploy Hook in Vercel (Settings → Git → Deploy Hooks) and add its URL on Railway as VERCEL_DEPLOY_HOOK."}</p>`, { title: "Deploy check" }), { kind: "deploy_check" });
}

// Payment reminders for every item with a due date: 3 days before, on the
// day, then 1, 7 and 14 days overdue. One email per contract per day, listing
// what's due, with the same payment link (and their account number).
async function paymentReminders(today) {
  const [contracts, payments] = await Promise.all([listRecords("contracts"), listRecords("payments")]);
  const { normaliseContract, paymentSummary, money, payLink, ensurePayCode } = await import("./contracts.js");
  const { sendEmail, brandedShell } = await import("./mailer.js");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const days = d => Math.round((Date.parse(d) - Date.parse(today)) / 86400000);
  const long = d => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  for (const raw of contracts) {
    const c = normaliseContract(raw);
    const live = c.kind === "plan" ? !["cancelled", "completed"].includes(c.status) : ["signed", "active"].includes(c.status) || (raw.payBeforeSigning && c.status === "sent");
    if (!live || !(c.amount > 0) || !c.client.email || raw.remindersOff) continue;
    const sum = paymentSummary(c, payments.filter(p => p.contractId === c.id));
    const due = sum.schedule.filter(m => m.balance > 0 && m.dueDate && [3, 0, -1, -7, -14].includes(days(m.dueDate)));
    if (!due.length) continue;
    if (!raw.payCode) { await ensurePayCode(raw); await putRecord("contracts", raw.id, raw); }
    const overdue = due.some(m => days(m.dueDate) < 0);
    const rows = due.map(m => `<tr><td style="padding:6px 0;">${esc(m.title)}</td><td style="padding:6px 0;text-align:right;"><strong>${money(m.balance, c.currency)}</strong><br><span style="font-size:12px;color:${days(m.dueDate) < 0 ? "#B91C1C" : "#6B7A96"};">${days(m.dueDate) < 0 ? `was due ${long(m.dueDate)}` : days(m.dueDate) === 0 ? "due today" : `due ${long(m.dueDate)}`}</span></td></tr>`).join("");
    const html = brandedShell(`
      <h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">${overdue ? "Payment overdue" : "Payment reminder"}</h2>
      <p style="color:#3A4556;font-size:14px;line-height:1.7;">Dear ${esc(c.client.name)}, this is a friendly reminder about ${esc(c.title)} (${c.number}):</p>
      <table role="presentation" style="background:#F4F6FA;border-radius:10px;padding:10px 16px;width:100%;font-size:14px;color:#3A4556;">${rows}</table>
      ${raw.dva ? `<p style="color:#3A4556;font-size:14px;line-height:1.7;">Transfer to your account for this plan: <strong>${esc(raw.dva.accountNumber)}</strong> · ${esc(raw.dva.bankName)} · ${esc(raw.dva.accountName)}. It's matched automatically.</p>` : ""}
      <p style="margin:18px 0;"><a href="${payLink(raw)}" style="background:#C8A850;color:#060810;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Pay now</a></p>
      <p style="color:#6B7A96;font-size:12.5px;line-height:1.6;">Balance on this ${c.kind === "plan" ? "plan" : "contract"}: ${money(sum.balance, c.currency)}. If you've already paid, thank you; please ignore this email.</p>`, { title: overdue ? "Payment overdue" : "Payment reminder" });
    await sendEmail(c.client.email, `${overdue ? "Overdue" : "Reminder"}: ${due.map(m => m.title).join(", ")} (${c.number})`, html, { kind: "payment_reminder" });
  }
}

async function planSummaries(today) {
  const [plans, visits, employees, { getRoleCatalog, fieldWatchers }, { comparePlan }] = await Promise.all([
    listRecords("visitplans"), listRecords("visits"), listRecords("employees"), import("./roles.js"), import("./visitPlans.js"),
  ]);
  const catalog = await getRoleCatalog();
  for (const p of plans.filter(x => x.date === today && x.stops?.length)) {
    const emp = employees.find(e => e.id === p.employeeId && e.status === "active");
    if (!emp) continue;
    const c = comparePlan(p, visits.filter(v => v.employeeId === emp.id && toLagos(v.checkIn.at).slice(0, 10) === today), { dayOver: true });
    const missed = c.stops.filter(s => s.status === "missed").map(s => s.organisation);
    await notify(fieldWatchers(emp, employees, catalog), {
      type: "field",
      title: `${emp.fullName} visited ${c.visited} of ${c.planned} planned clients today${missed.length ? "" : " ✅"}`,
      body: [missed.length && `Missed: ${missed.join(", ")}`, c.unplanned.length && `Unplanned: ${c.unplanned.map(u => u.organisation).join(", ")}`].filter(Boolean).join(" · "),
      link: "team:field",
    });
  }
}

async function dailyDigests(today, active, employees, tasks, meetings, leave, reports) {
  const { OFFICE_CONFIG_KEY } = await import("../staff/office.js");
  const cfg = (await get(OFFICE_CONFIG_KEY)) || {};
  if (cfg.dailyDigest === false) return;
  const { scheduleFor, isWorkDay } = await import("./workHours.js");
  const { getRoleCatalog, canApproveFor, canReviewReport } = await import("./roles.js");
  const { listNotifications } = await import("./office.js");
  const { sendDailyDigest } = await import("./emailTemplates.js");
  const catalog = await getRoleCatalog();
  const byId = new Map(employees.map(e => [e.id, e]));
  for (const e of active.filter(x => x.email)) {
    if (!isWorkDay(scheduleFor(e, cfg), today)) continue;
    const mine = meetings.filter(m => m.status !== "cancelled" && toLagos(m.startsAt).slice(0, 10) === today && (m.hostId === e.id || (m.attendeeIds || []).includes(e.id)))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(m => `${toLagos(m.startsAt).slice(11, 16)} ${m.title}`);
    const overdue = tasks.filter(t => t.assigneeId === e.id && t.status !== "done" && t.dueDate && t.dueDate < today).map(t => `${t.title} (due ${t.dueDate})`);
    const approvals = leave.filter(l => l.status === "pending" && canApproveFor(e, byId.get(l.employeeId), employees, catalog)).length
      + reports.filter(r => r.status === "submitted" && canReviewReport(e, r, byId.get(r.employeeId), employees, catalog)).length;
    const unread = (await listNotifications(e.id, 30)).items.filter(n => !n.read && Date.parse(n.at) > Date.now() - 36 * 3600000).map(n => n.title);
    if (!mine.length && !overdue.length && !approvals && !unread.length) continue;
    await sendDailyDigest(e, { meetings: mine, overdue, approvals, unread });
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
    const [employees, { getRoleCatalog, fieldWatchers }] = await Promise.all([listRecords("employees"), import("./roles.js")]);
    const emp = employees.find(e => e.id === s.employeeId);
    const watchers = emp ? fieldWatchers(emp, employees, await getRoleCatalog()) : [];
    await notify(watchers, { type: "field", title: `⚠ ${emp?.fullName || "A staff member"} missed a location check`, body: "No response before the deadline.", link: "team:field" });
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
  const { scheduleFor, isWorkingTime } = await import("./workHours.js");
  for (const a of attendance.filter(x => x.date === today && x.clockIn && !x.clockOut && ["field", "client_site", "hybrid"].includes(x.mode))) {
    const emp = employees.find(e => e.id === a.employeeId && e.status === "active");
    if (emp && isWorkingTime(scheduleFor(emp, cfg)) && !spots.some(s => s.employeeId === emp.id && s.issuedAt.slice(0, 10) === new Date().toISOString().slice(0, 10))) await issueSpotCheck(emp);
  }
}

// Not clocked in an hour after their start time (on a working day, not on
// leave): nudge the person and tell their line manager, once per day.
async function missingClockIns(now) {
  const today = lagosDate(now);
  const { OFFICE_CONFIG_KEY, DEFAULT_OFFICE_CONFIG } = await import("../staff/office.js");
  const { scheduleFor, isWorkDay } = await import("./workHours.js");
  const { getRoleCatalog, managerChain } = await import("./roles.js");
  const cfg = { ...DEFAULT_OFFICE_CONFIG, ...((await get(OFFICE_CONFIG_KEY)) || {}) };
  const [employees, attendance, leave, catalog] = await Promise.all([listRecords("employees"), listRecords("attendance"), listRecords("leave"), getRoleCatalog()]);
  const minuteNow = now.getUTCHours() * 60 + now.getUTCMinutes(); // `now` is already Lagos time
  for (const e of employees.filter(x => x.status === "active" && x.staffRole !== "owner")) {
    const s = scheduleFor(e, cfg);
    const [h, m] = s.start.split(":").map(Number);
    if (!isWorkDay(s, today) || minuteNow < h * 60 + m + s.grace + 45) continue;
    if (attendance.some(a => a.employeeId === e.id && a.date === today && a.clockIn)) continue;
    if (leave.some(l => l.employeeId === e.id && l.status === "approved" && l.startDate <= today && l.endDate >= today)) continue;
    await once(`orionsoft:automation:noclockin:${today}:${e.id}`, async () => {
      await notify([e.id], { type: "attendance", title: "You haven't clocked in today", body: `Your day started at ${s.start}. Clock in from the Staff Office home page.`, link: "home" });
      const mgr = managerChain(e, employees, catalog)[0];
      if (mgr) await notify([mgr.id], { type: "attendance", title: `${e.fullName} hasn't clocked in yet`, body: `Expected from ${s.start}.`, link: "team:field" });
    });
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
    await once("orionsoft:migration:photos-v1", migrateInlinePhotos);
    // Daily jobs wait until 07:00 Lagos time so greetings land in the morning.
    if (now.getUTCHours() >= 7) await once(`orionsoft:automation:daily:${today}`, () => dailyJobs(today));
    await meetingReminders();
    await spotChecks(now);
    try { if (await claim("orionsoft:automation:noclockin:tick", 900)) await missingClockIns(now); } catch (err) { console.error("[noclockin]", err.message); }
    // Nightly backup by email (after 02:00 Lagos), once a day.
    if (now.getUTCHours() >= 2) {
      try {
        await once(`orionsoft:automation:backup:${today}`, async () => {
          const { emailBackup } = await import("./backup.js");
          const r = await emailBackup();
          await set("orionsoft:backup:last", { at: new Date().toISOString(), ok: r.ok, bytes: r.bytes, records: r.total });
        });
      } catch (err) { console.error("[backup]", err.message); }
    }
    // 08:00 Lagos: bill subscriptions whose renewal is coming up.
    if (now.getUTCHours() >= 8) {
      try { await once(`orionsoft:automation:renewals:${today}`, async () => { const { renewDue } = await import("./subscriptions.js"); await renewDue(today); }); }
      catch (err) { console.error("[renewals]", err.message); }
    }
    // 09:00 Lagos: remind clients of payments due in 3 days, today, or overdue.
    if (now.getUTCHours() >= 9) {
      try { await once(`orionsoft:automation:payreminders:${today}`, () => paymentReminders(today)); }
      catch (err) { console.error("[payreminders]", err.message); }
    }
    // 10:00 Lagos: ask clients who have finished paying for a Google review.
    if (now.getUTCHours() >= 10) {
      try { await once(`orionsoft:automation:reviews:${today}`, async () => { const { reviewRequests } = await import("./visibility.js"); await reviewRequests(today); }); }
      catch (err) { console.error("[reviews]", err.message); }
    }
    // Hourly: after a new release, submit the site to search engines (IndexNow).
    try { if (await claim("orionsoft:automation:indexnow:tick", 3600)) { const { indexNowOnRelease } = await import("./visibility.js"); await indexNowOnRelease(); } }
    catch (err) { console.error("[indexnow]", err.message); }
    // 19:00 Lagos: planned client visits that didn't happen today.
    if (now.getUTCHours() >= 19) {
      try { await once(`orionsoft:automation:plans:${today}`, () => planSummaries(today)); }
      catch (err) { console.error("[plans]", err.message); }
    }
    // Every 30 min: did the website (Vercel) deploy the same commit as this API?
    try { if (await claim("orionsoft:automation:deploycheck:tick", 1800)) await deployCheck(); }
    catch (err) { console.error("[deploycheck]", err.message); }
    // Data retention: monthly, strip old GPS points and photos.
    try {
      await once(`orionsoft:automation:retention:${today.slice(0, 7)}`, async () => {
        const { OFFICE_CONFIG_KEY } = await import("../staff/office.js");
        const months = Number((await get(OFFICE_CONFIG_KEY))?.retentionMonths) || 24;
        const { purgeOldLocationData } = await import("./photos.js");
        const n = await purgeOldLocationData(months);
        if (n) console.log(`[retention] cleared location data on ${n} records older than ${months} months`);
      });
    } catch (err) { console.error("[retention]", err.message); }
    await once(`orionsoft:automation:autoclose:${today}`, () => forgottenClockOuts(today));
    // Newsletter: email new blog posts to subscribers and send queued batches.
    try { const { newsletterJobs } = await import("./newsletter.js"); await newsletterJobs(); }
    catch (err) { console.error("[newsletter]", err.message); }
  } catch (err) {
    console.error("[automations]", err.message);
  } finally { running = false; }
}
