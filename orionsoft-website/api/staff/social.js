// Social media & employee advocacy.
//  - Social activity log: posts staff published on their own social accounts,
//    with engagement metrics they update over time ("progress on socials").
//  - Follower snapshots per platform, charted as growth on their profile.
//  - Share kits: approved company content (published by marketing/HR/admin)
//    that staff share to their networks in one click, tracked per person.
//  - Boost: ask colleagues to engage (like/comment/reshare) with a post,
//    with each engagement credited on the advocacy leaderboard.
import { get, set } from "../store.js";
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { officeContext, notify, award, logActivity, cleanUrl, SOCIAL_PLATFORMS, systemPost } from "../_lib/office.js";

const followersKey = id => `orionsoft:social:followers:${id}`;
const METRICS = ["likes", "comments", "shares", "views", "clicks"];

function cleanMetrics(m) {
  const out = {};
  for (const k of METRICS) out[k] = Math.max(0, parseInt(m?.[k], 10) || 0);
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, active } = ctx;

  if (req.method === "GET") {
    const [posts, kits] = await Promise.all([listRecords("socialposts"), listRecords("sharekits")]);
    const who = req.query.employeeId || me.id;
    const mine = posts.filter(p => p.employeeId === who).sort((a, b) => (b.postedAt || "").localeCompare(a.postedAt || ""));
    const followers = (await get(followersKey(who))) || [];
    // Advocacy standings: everyone can see the leaderboard.
    const standings = active.map(e => {
      const theirs = posts.filter(p => p.employeeId === e.id);
      const kitShares = kits.reduce((n, k) => n + ((k.shares || {})[e.id] || 0), 0);
      const engagement = theirs.reduce((n, p) => n + METRICS.slice(0, 3).reduce((a, m) => a + (p.metrics?.[m] || 0), 0), 0);
      const reach = theirs.reduce((n, p) => n + (p.metrics?.views || 0), 0);
      const boostsHelped = posts.reduce((n, p) => n + ((p.engagedBy || []).includes(e.id) ? 1 : 0), 0);
      return { id: e.id, posts: theirs.length, kitShares, engagement, reach, boostsHelped, score: theirs.length * 8 + kitShares * 5 + boostsHelped * 2 + Math.round(engagement / 10) };
    }).sort((a, b) => b.score - a.score);
    const boosts = posts.filter(p => p.boost && p.employeeId !== me.id).sort((a, b) => (b.postedAt || "").localeCompare(a.postedAt || "")).slice(0, 20);
    return res.json({
      ok: true, platforms: SOCIAL_PLATFORMS,
      activity: mine, followers,
      kits: kits.filter(k => !k.archived).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map(k => ({ ...k, mySharesCount: (k.shares || {})[me.id] || 0, totalShares: Object.values(k.shares || {}).reduce((a, b) => a + b, 0) })),
      standings, boosts,
    });
  }

  if (req.method === "POST") {
    const b = req.body || {};

    if (b.action === "log") {
      const url = cleanUrl(b.url);
      const platform = SOCIAL_PLATFORMS.includes(b.platform) ? b.platform : "linkedin";
      if (!url && !b.caption) return res.status(400).json({ error: "Add the post link or a short description" });
      const id = newId("sp");
      const post = {
        id, employeeId: me.id, platform, url, caption: String(b.caption || "").slice(0, 600),
        postedAt: b.postedAt || new Date().toISOString().slice(0, 10), metrics: cleanMetrics(b.metrics),
        metricsHistory: [], aboutCompany: b.aboutCompany !== false, boost: !!b.boost, engagedBy: [],
        createdAt: new Date().toISOString(),
      };
      await putRecord("socialposts", id, post);
      await award(me.id, "social_activity");
      await logActivity(me.id, "social", `Posted on ${platform}${post.caption ? `: ${post.caption.slice(0, 80)}` : ""}`, { url });
      if (post.boost) {
        const feedPost = await systemPost({ type: "update", authorId: me.id, text: `📣 I just posted on ${platform}! Please like, comment and reshare to help it reach more people.${post.caption ? `\n\n${post.caption}` : ""}`, meta: { kind: "social_boost", socialPostId: id } });
        feedPost.automated = false;
        feedPost.link = url;
        await putRecord("posts", feedPost.id, feedPost);
        await notify(active.map(e => e.id), { type: "boost", title: `${me.fullName} asks for a boost on ${platform}`, body: post.caption || url, link: "social", actorId: me.id });
      }
      return res.json({ ok: true, post });
    }

    if (b.action === "metrics") {
      const post = await getRecord("socialposts", b.id);
      if (!post || post.employeeId !== me.id) return res.status(404).json({ error: "Post not found" });
      post.metricsHistory = [{ at: new Date().toISOString(), ...post.metrics }, ...(post.metricsHistory || [])].slice(0, 30);
      post.metrics = cleanMetrics(b.metrics);
      await putRecord("socialposts", post.id, post);
      return res.json({ ok: true, post });
    }

    // A colleague engaged with a boosted post (opened it to like/comment/share).
    if (b.action === "engaged") {
      const post = await getRecord("socialposts", b.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      if (post.employeeId !== me.id && !(post.engagedBy || []).includes(me.id)) {
        post.engagedBy = [...(post.engagedBy || []), me.id];
        await putRecord("socialposts", post.id, post);
        await award(me.id, "reshare");
        await notify([post.employeeId], { type: "boost", title: `${me.fullName} engaged with your ${post.platform} post`, link: "social", actorId: me.id });
      }
      return res.json({ ok: true, post });
    }

    if (b.action === "followers") {
      const platform = SOCIAL_PLATFORMS.includes(b.platform) ? b.platform : null;
      const count = parseInt(b.followers, 10);
      if (!platform || !(count >= 0)) return res.status(400).json({ error: "Platform and a follower count are required" });
      const snaps = (await get(followersKey(me.id))) || [];
      const today = new Date().toISOString().slice(0, 10);
      const next = [...snaps.filter(s => !(s.platform === platform && s.date === today)), { platform, followers: count, date: today }]
        .sort((a, c) => a.date.localeCompare(c.date)).slice(-400);
      await set(followersKey(me.id), next);
      await logActivity(me.id, "social", `Updated ${platform} followers to ${count.toLocaleString()}`);
      return res.json({ ok: true, followers: next });
    }

    if (b.action === "kit-share") {
      const kit = await getRecord("sharekits", b.id);
      if (!kit) return res.status(404).json({ error: "Share kit not found" });
      kit.shares = { ...(kit.shares || {}), [me.id]: ((kit.shares || {})[me.id] || 0) + 1 };
      kit.platformShares = { ...(kit.platformShares || {}), [b.platform || "other"]: ((kit.platformShares || {})[b.platform || "other"] || 0) + 1 };
      await putRecord("sharekits", kit.id, kit);
      await award(me.id, "social_share");
      await logActivity(me.id, "share", `Shared "${kit.title}" to ${b.platform || "social media"}`);
      return res.json({ ok: true, kit });
    }

    if (b.action === "create-kit") {
      if (!ctx.can("sharekits")) return res.status(403).json({ error: "Your role can't publish share kits" });
      if (!String(b.title || "").trim() || !String(b.caption || "").trim()) return res.status(400).json({ error: "Title and caption are required" });
      if (b.imageDataUrl && !/^data:image\/(png|jpe?g|webp);base64,/.test(b.imageDataUrl)) return res.status(400).json({ error: "Invalid image" });
      const id = newId("kit");
      const kit = {
        id, title: String(b.title).slice(0, 120), caption: String(b.caption).slice(0, 2000), link: cleanUrl(b.link),
        hashtags: String(b.hashtags || "").slice(0, 200), imageDataUrl: b.imageDataUrl || "", shares: {}, platformShares: {},
        createdBy: me.fullName, createdById: me.id, createdAt: new Date().toISOString(), archived: false,
      };
      await putRecord("sharekits", id, kit);
      await notify(active.map(e => e.id), { type: "sharekit", title: "New share kit ready to post 📣", body: kit.title, link: "social", actorId: me.id });
      return res.json({ ok: true, kit });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  if (req.method === "DELETE") {
    if (req.query.type === "kit") {
      const kit = await getRecord("sharekits", req.query.id);
      if (!kit) return res.status(404).json({ error: "Not found" });
      if (kit.createdById !== me.id && !ctx.can("moderate")) return res.status(403).json({ error: "Not allowed" });
      await deleteRecord("sharekits", kit.id);
      return res.json({ ok: true });
    }
    const post = await getRecord("socialposts", req.query.id);
    if (!post || post.employeeId !== me.id) return res.status(404).json({ error: "Not found" });
    await deleteRecord("socialposts", post.id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
