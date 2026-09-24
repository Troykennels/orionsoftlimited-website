// Shared building blocks for the Staff Office: profile slugs, public profile
// cards, in-app notifications, @mentions, gamification points, activity
// timelines and system-generated feed posts. Used by every api/staff/* route
// and by api/_lib/automations.js.
import { push, list, get, set, ltrim, hincrby, hgetall } from "../store.js";
import { listRecords, putRecord, newId, getRecord } from "./records.js";
import { requireStaff } from "./auth.js";
import { getRoleCatalog, permissionsOf, roleOf } from "./roles.js";

export const SOCIAL_PLATFORMS = ["linkedin", "x", "facebook", "instagram", "tiktok", "github", "youtube", "website"];

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function slugify(name) {
  return String(name || "staff").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40) || "staff";
}

// Gives every employee a unique, stable slug (used for @mentions and public
// profile URLs). Persists only the records that were missing one.
export async function ensureSlugs(employees) {
  const taken = new Set(employees.filter(e => e.slug).map(e => e.slug));
  for (const e of employees) {
    if (e.slug) continue;
    const base = slugify(e.fullName);
    let slug = base, n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    taken.add(slug);
    e.slug = slug;
    await putRecord("employees", e.id, e);
  }
  return employees;
}

export function cleanUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s.slice(0, 300);
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return `https://${s}`.slice(0, 300);
  return "";
}

export function cleanSocials(input) {
  const out = {};
  for (const p of SOCIAL_PLATFORMS) {
    const v = cleanUrl(input?.[p]);
    if (v) out[p] = v;
  }
  return out;
}

// Normalises a phone number to WhatsApp's international digits format.
// Nigerian local numbers (080..., 81...) become 23480..., 23481....
export function waNumber(raw) {
  let d = String(raw || "").replace(/[^\d]/g, "");
  if (!d) return "";
  if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1);
  else if (d.length === 10 && /^[789]/.test(d)) d = "234" + d;
  return d.length >= 10 && d.length <= 15 ? d : "";
}

// What colleagues see in the office directory. Deliberately excludes salary,
// bank, emergency contact, DOB year and address. Those stay HR/admin-only.
export function officeCard(e, catalog) {
  const role = roleOf(e, catalog);
  return {
    id: e.id, slug: e.slug, fullName: e.fullName, title: e.title, department: e.department || "",
    staffRole: role.id, roleLabel: role.label, level: role.level, managerId: e.managerId || null,
    avatarDataUrl: e.avatarDataUrl || "", bio: e.bio || "", headline: e.headline || "",
    skills: e.skills || [], socials: e.socials || {}, email: e.email, phone: e.showPhone ? (e.phone || "") : "",
    location: e.location || "", startDate: e.startDate || "", whatsapp: waNumber(e.whatsapp),
    birthday: e.dateOfBirth ? e.dateOfBirth.slice(5) : "",
    presence: e.presence || { status: "offline" }, publicProfile: !!e.publicProfile, status: e.status,
  };
}

// What the whole internet sees on /people/:slug. Only fields the person has
// chosen to publish, and only when their public profile is switched on.
export function publicCard(e, catalog) {
  const role = roleOf(e, catalog);
  const vis = e.publicFields || {};
  return {
    slug: e.slug, fullName: e.fullName, title: e.title, department: e.department || "", roleLabel: role.label,
    avatarDataUrl: e.avatarDataUrl || "", headline: e.headline || "", bio: e.bio || "",
    skills: e.skills || [], socials: e.socials || {}, location: vis.location ? (e.location || "") : "",
    email: vis.email ? e.email : "", startYear: vis.tenure && e.startDate ? e.startDate.slice(0, 4) : "",
    achievements: (e.achievements || []).slice(0, 12),
  };
}

// Loads everything a staff route typically needs in one go.
export async function officeContext(req, res) {
  const auth = await requireStaff(req, res);
  if (!auth) return null;
  const [employees, catalog] = await Promise.all([listRecords("employees"), getRoleCatalog()]);
  const me = employees.find(e => e.id === auth.employee.id) || auth.employee;
  const perms = permissionsOf(me, catalog);
  return { session: auth.session, me, employees, active: employees.filter(e => e.status === "active"), catalog, perms, can: p => perms.has(p) };
}

// ─── Notifications ───────────────────────────────────────────────────────────
const notifKey = id => `orionsoft:notif:${id}`;
const notifReadKey = id => `orionsoft:notif:${id}:readAt`;

export async function notify(userIds, { type, title, body = "", link = "", actorId = "" }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  await Promise.all(ids.filter(id => id !== actorId).map(async id => {
    try {
      await push(notifKey(id), { id: newId("ntf"), type, title, body: String(body).slice(0, 240), link, actorId, at: new Date().toISOString() });
      await ltrim(notifKey(id), 200);
    } catch { /* notifications are best-effort */ }
  }));
}

export async function listNotifications(userId, limit = 60) {
  const [items, readAt] = await Promise.all([list(notifKey(userId), limit), get(notifReadKey(userId))]);
  const cutoff = readAt ? new Date(readAt).getTime() : 0;
  return { items: items.map(n => ({ ...n, read: new Date(n.at).getTime() <= cutoff })), unread: items.filter(n => new Date(n.at).getTime() > cutoff).length };
}

export async function markNotificationsRead(userId) {
  await set(notifReadKey(userId), new Date().toISOString());
}

// ─── Mentions ────────────────────────────────────────────────────────────────
export function mentionedIds(text, employees) {
  const slugs = new Set([...String(text || "").matchAll(/@([a-z0-9][a-z0-9-]*)/gi)].map(m => m[1].toLowerCase()));
  return employees.filter(e => e.slug && slugs.has(e.slug)).map(e => e.id);
}

// ─── Points & leaderboard ────────────────────────────────────────────────────
export const POINTS = {
  post: 5, comment: 2, like_received: 1, kudos_received: 10, kudos_given: 2, reshare: 3,
  social_share: 5, social_activity: 8, goal_checkin: 3, goal_completed: 25, report: 10,
  standup: 3, deal_won: 30, task_done: 4, meeting_hosted: 3,
};

function monthKey(d = new Date()) { return d.toISOString().slice(0, 7); }

export async function award(employeeId, reason, n = POINTS[reason] || 0) {
  if (!employeeId || !n) return;
  try {
    await Promise.all([
      hincrby("orionsoft:office:points", employeeId, n),
      hincrby(`orionsoft:office:points:${monthKey()}`, employeeId, n),
    ]);
  } catch { /* best-effort */ }
}

export async function leaderboard(period = "month") {
  const key = period === "all" ? "orionsoft:office:points" : `orionsoft:office:points:${monthKey()}`;
  const hash = await hgetall(key);
  return Object.entries(hash).map(([id, pts]) => ({ id, points: parseInt(pts, 10) || 0 })).sort((a, b) => b.points - a.points);
}

// ─── Activity timeline (drives "progress" on profiles) ──────────────────────
export async function logActivity(employeeId, type, text, extra = {}) {
  if (!employeeId) return;
  try {
    await push(`orionsoft:activity:${employeeId}`, { id: newId("act"), type, text: String(text).slice(0, 200), at: new Date().toISOString(), ...extra });
    await ltrim(`orionsoft:activity:${employeeId}`, 150);
  } catch { /* best-effort */ }
}

export async function listActivity(employeeId, limit = 40) {
  return list(`orionsoft:activity:${employeeId}`, limit);
}

// Records a milestone on the employee's profile (shown publicly if they opt in).
export async function addAchievement(employeeId, text, kind = "milestone") {
  const e = await getRecord("employees", employeeId);
  if (!e) return;
  e.achievements = [{ text: String(text).slice(0, 140), kind, at: new Date().toISOString() }, ...(e.achievements || [])].slice(0, 30);
  await putRecord("employees", e.id, e);
}

// ─── Announcement audiences ─────────────────────────────────────────────────
// audience: { type: "all" } | { type: "departments"|"roles"|"people", values: [...] }
export function cleanAudience(a) {
  const type = ["all", "departments", "roles", "people"].includes(a?.type) ? a.type : "all";
  const values = type === "all" ? [] : (Array.isArray(a?.values) ? a.values : []).map(String).filter(Boolean).slice(0, 200);
  return type !== "all" && !values.length ? { type: "all", values: [] } : { type, values };
}

export function inAudience(post, employee) {
  const a = post?.audience;
  if (!a || a.type === "all") return true;
  if (a.type === "departments") return a.values.includes(employee.department || "");
  if (a.type === "roles") return a.values.includes(employee.staffRole || "staff");
  if (a.type === "people") return a.values.includes(employee.id);
  return true;
}

export function audienceIds(audience, employees) {
  return employees.filter(e => e.status === "active" && inAudience({ audience }, e)).map(e => e.id);
}

// ─── Feed posts created by the system (automations) ─────────────────────────
export async function systemPost({ type = "system", text, authorId = "system", kudosTo = null, pinned = false, meta = {} }) {
  const id = newId("post");
  const post = {
    id, authorId, type, text: String(text).slice(0, 3000), link: "", imageDataUrl: "", kudosTo,
    reshareOf: null, reactions: {}, comments: [], reshares: 0, socialShares: {},
    pinned, visibility: "company", automated: true, meta, createdAt: new Date().toISOString(),
  };
  await putRecord("posts", id, post);
  return post;
}
