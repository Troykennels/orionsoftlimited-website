// Staff Office hub: the single bootstrap call the office loads on sign-in,
// plus presence, notifications, colleague profiles, org chart, handbook
// acknowledgements and the points leaderboard.
import { get, set } from "../store.js";
import { listRecords } from "../_lib/records.js";
import {
  officeContext, officeCard, ensureSlugs, listNotifications, markNotificationsRead,
  leaderboard, listActivity,
} from "../_lib/office.js";
import { PERMISSIONS, managerChain, directReports, subordinates, canApproveFor } from "../_lib/roles.js";
import { runAutomations, lagosDate, toLagos } from "../_lib/automations.js";

export const OFFICE_CONFIG_KEY = "orionsoft:office:config";
export const DEFAULT_OFFICE_CONFIG = {
  welcome: "Welcome to the Orion Soft virtual office. This is where we work, collaborate and celebrate together.",
  managementWhatsapp: "2348169577059",
  // Attendance & field verification
  workStart: "09:00",
  graceMinutes: 15,
  spotChecks: true,
  spotWindowMinutes: 20,
  whatsappGroupLink: "",
  quickLinks: [
    { label: "Company website", url: "https://orionsoftlimited.com" },
    { label: "Company email", url: "https://mail.google.com" },
    { label: "Google Drive", url: "https://drive.google.com" },
    { label: "Jitsi meeting room", url: "https://meet.jit.si/OrionSoftOffice" },
  ],
  resources: [
    { id: "res_handbook", title: "Staff Handbook: how we work", category: "Policies", url: "", body: "Core hours are 9:00 to 17:00 WAT. Set your status when you start and finish work, post a daily standup, file your weekly report every Friday, and request leave through the office at least 5 working days ahead.", requiresAck: true },
    { id: "res_social", title: "Social media & advocacy guidelines", category: "Policies", url: "", body: "Share freely about our products, wins and culture. Never share client data, pricing agreements or internal documents. When in doubt, use an approved share kit.", requiresAck: true },
  ],
};

const PRESENCE = ["available", "meeting", "field", "focus", "break", "away", "leave", "offline"];
const PRIVATE_FIELDS = ["passwordHash"];

function stripPrivate(e) {
  const rest = { ...e };
  for (const k of PRIVATE_FIELDS) delete rest[k];
  return rest;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, active, catalog } = ctx;

  if (req.method === "GET") {
    const view = req.query.view || "bootstrap";

    if (view === "bootstrap") {
      runAutomations().catch(() => {}); // lazy trigger; idempotent
      await ensureSlugs(employees);
      const today = lagosDate();
      const [config, notif, board, tasks, meetings, leave, reports, acks, expenses, spots] = await Promise.all([
        get(OFFICE_CONFIG_KEY), listNotifications(me.id, 30), leaderboard("month"),
        listRecords("tasks"), listRecords("meetings"), listRecords("leave"), listRecords("reports"),
        get(`orionsoft:office:acks:${me.id}`), listRecords("expenses"), listRecords("spotchecks"),
      ]);
      const cfg = { ...DEFAULT_OFFICE_CONFIG, ...(config || {}) };
      const canApprove = target => canApproveFor(me, target, employees, catalog);
      const byId = new Map(employees.map(e => [e.id, e]));
      const approvals = {
        leave: leave.filter(l => l.status === "pending" && canApprove(byId.get(l.employeeId))).length,
        reports: reports.filter(r => r.status === "submitted" && canApprove(byId.get(r.employeeId))).length,
        expenses: ctx.can("finance.approve") ? expenses.filter(x => x.status === "pending" && x.employeeId !== me.id).length : 0,
      };
      const lineManager = managerChain(me, employees, catalog)[0] || null;
      return res.json({
        ok: true,
        me: { ...stripPrivate(me), permissions: [...ctx.perms], role: catalog.find(r => r.id === me.staffRole) || null, viaAdmin: !!ctx.session.viaAdmin, googleLinked: !!me.googleSub },
        lineManager: lineManager ? officeCard(lineManager, catalog) : null,
        directReports: directReports(me, active, catalog).map(e => e.id),
        directory: active.map(e => officeCard(e, catalog)),
        roles: catalog, permissionLabels: PERMISSIONS,
        config: cfg, acknowledged: acks || [],
        notifications: notif,
        leaderboard: board.slice(0, 10),
        myOpenTasks: tasks.filter(t => t.assigneeId === me.id && t.status !== "done").length,
        todaysMeetings: meetings.filter(m => toLagos(m.startsAt).slice(0, 10) === today && m.status !== "cancelled"
          && (m.hostId === me.id || (m.attendeeIds || []).includes(me.id))).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
        approvals,
        pendingSpotChecks: spots.filter(s => s.employeeId === me.id && s.status === "pending" && Date.parse(s.dueAt) > Date.now()).map(s => ({ id: s.id, dueAt: s.dueAt })),
        today,
      });
    }

    if (view === "notifications") {
      return res.json({ ok: true, ...(await listNotifications(me.id, 100)) });
    }

    if (view === "leaderboard") {
      const period = req.query.period === "all" ? "all" : "month";
      return res.json({ ok: true, leaderboard: await leaderboard(period) });
    }

    // A colleague's profile. Everyone sees the office card, bio, progress and
    // activity. HR (hr.records) and people above them in the reporting line
    // also see the full HR record.
    if (view === "person") {
      const person = employees.find(e => e.id === req.query.id || e.slug === req.query.id);
      if (!person) return res.status(404).json({ error: "Person not found" });
      const [activity, goals, board, posts] = await Promise.all([
        listActivity(person.id, 30), listRecords("goals"), leaderboard("all"), listRecords("posts"),
      ]);
      const seesHr = person.id === me.id || ctx.can("hr.records") || subordinates(me, employees, catalog).some(e => e.id === person.id);
      const theirPosts = posts.filter(p => p.authorId === person.id);
      return res.json({
        ok: true,
        person: officeCard(person, catalog),
        hr: seesHr ? stripPrivate(person) : null,
        achievements: person.achievements || [],
        manager: (() => { const m = managerChain(person, employees, catalog)[0]; return m ? officeCard(m, catalog) : null; })(),
        reports: directReports(person, active, catalog).map(e => officeCard(e, catalog)),
        goals: goals.filter(g => g.ownerId === person.id && g.visibility !== "private").sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
        activity,
        stats: {
          points: board.find(b => b.id === person.id)?.points || 0,
          posts: theirPosts.length,
          kudos: posts.filter(p => p.type === "kudos" && p.kudosTo === person.id).length,
          reactions: theirPosts.reduce((n, p) => n + Object.keys(p.reactions || {}).length, 0),
          socialShares: theirPosts.reduce((n, p) => n + Object.values(p.socialShares || {}).reduce((a, b) => a + b, 0), 0),
        },
      });
    }

    return res.status(400).json({ error: "Unknown view" });
  }

  if (req.method === "PATCH") {
    const { presence, note } = req.body || {};
    if (!PRESENCE.includes(presence)) return res.status(400).json({ error: "Invalid status" });
    const { getRecord, putRecord } = await import("../_lib/records.js");
    const fresh = await getRecord("employees", me.id);
    fresh.presence = { status: presence, note: String(note || "").slice(0, 80), at: new Date().toISOString() };
    await putRecord("employees", fresh.id, fresh);
    return res.json({ ok: true, presence: fresh.presence });
  }

  if (req.method === "POST") {
    const { action, resourceId } = req.body || {};
    if (action === "notifications-read") {
      await markNotificationsRead(me.id);
      return res.json({ ok: true });
    }
    if (action === "acknowledge" && resourceId) {
      const key = `orionsoft:office:acks:${me.id}`;
      const acks = (await get(key)) || [];
      if (!acks.includes(resourceId)) await set(key, [...acks, resourceId]);
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: "Unknown action" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
