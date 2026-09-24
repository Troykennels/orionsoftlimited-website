// Public staff profiles for the website (/people and /people/:slug). Only
// employees who switched on "public profile" appear, and only with the
// fields they chose to publish. No auth. Nothing private ever leaves here.
import { listRecords } from "../_lib/records.js";
import { publicCard } from "../_lib/office.js";
import { getRoleCatalog } from "../_lib/roles.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "public, max-age=60");

  const [employees, catalog] = await Promise.all([listRecords("employees"), getRoleCatalog()]);
  const published = employees.filter(e => e.status === "active" && e.publicProfile && e.slug);
  // Public text shows colleagues' names, never internal @slug handles.
  const names = new Map(employees.map(e => [e.slug, e.fullName]));
  const resolve = t => String(t || "").replace(/@([a-z0-9][a-z0-9-]*)/gi, (m, s) => names.get(s.toLowerCase()) || m);

  if (req.query.slug) {
    const e = published.find(x => x.slug === String(req.query.slug).toLowerCase());
    if (!e) return res.status(404).json({ error: "Profile not found" });
    const [posts, goals] = await Promise.all([listRecords("posts"), listRecords("goals")]);
    const publicPosts = posts
      .filter(p => p.visibility === "public" && (p.authorId === e.id || p.kudosTo === e.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)
      .map(p => ({
        id: p.id, type: p.type, text: resolve(p.text), link: p.link, imageDataUrl: p.imageDataUrl, createdAt: p.createdAt,
        kudosBadge: p.kudosBadge || "", fromColleague: p.kudosTo === e.id && p.authorId !== e.id ? (employees.find(x => x.id === p.authorId)?.fullName || "") : "",
        reactions: Object.keys(p.reactions || {}).length, comments: (p.comments || []).length,
      }));
    const publicGoals = goals.filter(g => g.ownerId === e.id && g.visibility === "public")
      .map(g => ({ id: g.id, title: g.title, category: g.category, progress: g.progress, status: g.status, dueDate: g.dueDate }));
    const person = publicCard(e, catalog);
    person.achievements = person.achievements.map(a => ({ ...a, text: resolve(a.text) }));
    return res.json({ ok: true, person, posts: publicPosts, goals: publicGoals });
  }

  const people = published.map(e => publicCard(e, catalog))
    .sort((a, b) => (catalog.find(r => r.label === a.roleLabel)?.level || 9) - (catalog.find(r => r.label === b.roleLabel)?.level || 9) || a.fullName.localeCompare(b.fullName))
    .map(p => ({ ...p, achievements: undefined, bio: p.bio.slice(0, 220) }));
  return res.json({ ok: true, people });
}
