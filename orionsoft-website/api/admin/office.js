// Admin controls for the Staff Office: roles & permissions, office settings
// (welcome, quick links, handbook), feed moderation & announcements, share
// kits, and social advocacy analytics.
import { get, set } from "../store.js";
import { listRecords, readIndex, getRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { getRoleCatalog, saveRole, deleteRole, PERMISSIONS, BUILTIN_ROLES } from "../_lib/roles.js";
import { notify, systemPost, cleanUrl, leaderboard, waNumber, cleanAudience, audienceIds } from "../_lib/office.js";
import { sendAnnouncementEmail } from "../_lib/emailTemplates.js";
import { OFFICE_CONFIG_KEY, DEFAULT_OFFICE_CONFIG } from "../staff/office.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const [catalog, config, employees, kits, socialposts, board] = await Promise.all([
      getRoleCatalog(), get(OFFICE_CONFIG_KEY), listRecords("employees"), listRecords("sharekits"), listRecords("socialposts"), leaderboard("month"),
    ]);
    const ids = (await readIndex("posts")).slice(0, 150);
    const posts = await getRecords("posts", ids);
    const active = employees.filter(e => e.status === "active");
    const cfg = { ...DEFAULT_OFFICE_CONFIG, ...(config || {}) };
    const acks = await Promise.all(active.map(async e => ({ id: e.id, acks: (await get(`orionsoft:office:acks:${e.id}`)) || [] })));
    return res.json({
      ok: true,
      roles: catalog, builtinRoleIds: BUILTIN_ROLES.map(r => r.id), permissions: PERMISSIONS,
      config: cfg,
      acknowledgements: cfg.resources.map(r => ({ resourceId: r.id, done: acks.filter(a => a.acks.includes(r.id)).map(a => a.id), total: active.length })),
      people: active.map(e => ({ id: e.id, fullName: e.fullName, title: e.title, department: e.department, staffRole: e.staffRole, managerId: e.managerId || null, avatarDataUrl: e.avatarDataUrl || "", presence: e.presence || null, publicProfile: !!e.publicProfile, slug: e.slug })),
      posts,
      kits: kits.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      advocacy: active.map(e => ({
        id: e.id,
        socialPosts: socialposts.filter(p => p.employeeId === e.id).length,
        engagement: socialposts.filter(p => p.employeeId === e.id).reduce((n, p) => n + (p.metrics?.likes || 0) + (p.metrics?.comments || 0) + (p.metrics?.shares || 0), 0),
        reach: socialposts.filter(p => p.employeeId === e.id).reduce((n, p) => n + (p.metrics?.views || 0), 0),
        kitShares: kits.reduce((n, k) => n + ((k.shares || {})[e.id] || 0), 0),
        feedShares: posts.filter(p => p.authorId === e.id).reduce((n, p) => n + Object.values(p.socialShares || {}).reduce((a, b) => a + b, 0), 0),
        points: board.find(b => b.id === e.id)?.points || 0,
      })).sort((a, b) => b.points - a.points),
    });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const active = (await listRecords("employees")).filter(e => e.status === "active");

    if (b.action === "save-role") {
      try {
        const role = await saveRole(b.role || {});
        await logAudit(session, "save_role", `role ${role.id}`, `${role.label}: ${role.permissions.join(", ") || "no extra permissions"}`);
        return res.json({ ok: true, role, roles: await getRoleCatalog() });
      } catch (err) { return res.status(400).json({ error: err.message }); }
    }
    if (b.action === "delete-role") {
      const inUse = active.filter(e => e.staffRole === b.id).length;
      const builtin = BUILTIN_ROLES.some(r => r.id === b.id);
      if (!builtin && inUse) return res.status(400).json({ error: `${inUse} employee(s) still have this role. Reassign them first.` });
      await deleteRole(b.id);
      await logAudit(session, builtin ? "reset_role" : "delete_role", `role ${b.id}`);
      return res.json({ ok: true, roles: await getRoleCatalog() });
    }

    if (b.action === "save-config") {
      const c = b.config || {};
      const cfg = {
        welcome: String(c.welcome || "").slice(0, 600),
        managementWhatsapp: waNumber(c.managementWhatsapp),
        workStart: /^\d{2}:\d{2}$/.test(String(c.workStart || "")) ? c.workStart : "09:00",
        graceMinutes: Math.min(120, Math.max(0, parseInt(c.graceMinutes, 10) || 0)),
        spotChecks: c.spotChecks !== false,
        spotWindowMinutes: Math.min(60, Math.max(10, parseInt(c.spotWindowMinutes, 10) || 20)),
        whatsappGroupLink: /^https:\/\/chat\.whatsapp\.com\//.test(String(c.whatsappGroupLink || "")) ? String(c.whatsappGroupLink).slice(0, 200) : "",
        quickLinks: (c.quickLinks || []).filter(l => l?.label && cleanUrl(l.url)).slice(0, 30).map(l => ({ label: String(l.label).slice(0, 60), url: cleanUrl(l.url) })),
        resources: (c.resources || []).filter(r => r?.title).slice(0, 60).map(r => ({
          id: r.id || newId("res"), title: String(r.title).slice(0, 140), category: String(r.category || "General").slice(0, 60),
          url: cleanUrl(r.url), body: String(r.body || "").slice(0, 8000), requiresAck: !!r.requiresAck,
        })),
      };
      await set(OFFICE_CONFIG_KEY, cfg);
      await logAudit(session, "update_office_config", "staff office");
      return res.json({ ok: true, config: cfg });
    }

    if (b.action === "announce") {
      const text = String(b.text || "").trim();
      if (!text) return res.status(400).json({ error: "Announcement text is required" });
      const post = await systemPost({ type: "announcement", authorId: "admin", text, pinned: b.pinned !== false, meta: { by: session.name || "Management" } });
      post.automated = false;
      post.audience = cleanAudience(b.audience);
      post.acks = [];
      post.link = cleanUrl(b.link);
      if (b.imageDataUrl && /^data:image\/(png|jpe?g|webp);base64,/.test(b.imageDataUrl) && b.imageDataUrl.length < 1_200_000) post.imageDataUrl = b.imageDataUrl;
      // Public announcements can be shared by any staff member to their socials.
      post.visibility = b.visibility === "public" ? "public" : "company";
      await putRecord("posts", post.id, post);
      const targets = audienceIds(post.audience, active);
      await notify(targets, { type: "announcement", title: "📣 New announcement from management", body: text, link: `feed:${post.id}` });
      let emailed = 0;
      if (b.sendEmail) {
        for (const e of active.filter(x => targets.includes(x.id))) {
          try { await sendAnnouncementEmail(e, text, "Orion Soft Management"); emailed++; } catch { /* best-effort */ }
        }
      }
      await logAudit(session, "office_announcement", `post ${post.id}`, `${post.audience.type}${post.audience.values.length ? `: ${post.audience.values.join(", ")}` : ""} · ${text.slice(0, 60)}`);
      return res.json({ ok: true, post, reached: targets.length, emailed });
    }

    if (b.action === "pin") {
      const post = await getRecord("posts", b.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      post.pinned = !post.pinned;
      await putRecord("posts", post.id, post);
      return res.json({ ok: true, post });
    }

    if (b.action === "create-kit") {
      if (!String(b.title || "").trim() || !String(b.caption || "").trim()) return res.status(400).json({ error: "Title and caption are required" });
      if (b.imageDataUrl && !/^data:image\/(png|jpe?g|webp);base64,/.test(b.imageDataUrl)) return res.status(400).json({ error: "Invalid image" });
      const id = newId("kit");
      const kit = {
        id, title: String(b.title).slice(0, 120), caption: String(b.caption).slice(0, 2000), link: cleanUrl(b.link),
        hashtags: String(b.hashtags || "").slice(0, 200), imageDataUrl: b.imageDataUrl || "", shares: {}, platformShares: {},
        createdBy: session.name || "Management", createdById: "admin", createdAt: new Date().toISOString(), archived: false,
      };
      await putRecord("sharekits", id, kit);
      await notify(active.map(e => e.id), { type: "sharekit", title: "New share kit ready to post 📣", body: kit.title, link: "social" });
      await logAudit(session, "create_sharekit", `kit ${id}`, kit.title);
      return res.json({ ok: true, kit });
    }
    if (b.action === "archive-kit") {
      const kit = await getRecord("sharekits", b.id);
      if (!kit) return res.status(404).json({ error: "Not found" });
      kit.archived = !kit.archived;
      await putRecord("sharekits", kit.id, kit);
      return res.json({ ok: true, kit });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  if (req.method === "DELETE") {
    const entity = req.query.type === "kit" ? "sharekits" : "posts";
    await deleteRecord(entity, req.query.id);
    await logAudit(session, `delete_${entity}`, `${entity} ${req.query.id}`);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
