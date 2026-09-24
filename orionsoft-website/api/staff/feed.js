// Office feed: the company's internal social wall. Posts, reactions, comments,
// reshares, kudos, announcements, and tracking of shares out to social media.
import { readIndex, getRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { officeContext, notify, mentionedIds, award, logActivity, addAchievement, cleanUrl, cleanAudience, inAudience, audienceIds } from "../_lib/office.js";
import { sendAnnouncementEmail } from "../_lib/emailTemplates.js";

const TYPES = ["update", "win", "progress", "kudos", "announcement", "question", "reshare"];
export const REACTIONS = ["like", "celebrate", "support", "insightful", "love"];
const SHARE_PLATFORMS = ["linkedin", "x", "facebook", "whatsapp", "telegram", "email", "copy", "instagram", "tiktok"];

function validImage(d) {
  return !d || (typeof d === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(d) && d.length < 1_200_000);
}

async function withOriginals(posts) {
  const ids = [...new Set(posts.map(p => p.reshareOf).filter(Boolean))];
  if (!ids.length) return posts;
  const originals = await getRecords("posts", ids);
  const byId = new Map(originals.map(o => [o.id, o]));
  return posts.map(p => p.reshareOf ? { ...p, original: byId.get(p.reshareOf) || null } : p);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, active } = ctx;

  if (req.method === "GET") {
    if (req.query.view === "my-announcements") {
      // Announcements aimed at me that I haven't acknowledged yet (Lobby box).
      const recent = await getRecords("posts", (await readIndex("posts")).slice(0, 300));
      const mine = recent.filter(p => p.type === "announcement" && p.authorId !== me.id && inAudience(p, me) && !(p.acks || []).includes(me.id));
      return res.json({ ok: true, posts: mine.slice(0, 10) });
    }
    if (req.query.id) {
      const post = await getRecord("posts", req.query.id);
      if (!post || !(post.authorId === me.id || ctx.can("moderate") || inAudience(post, me))) return res.status(404).json({ error: "Post not found" });
      return res.json({ ok: true, post: (await withOriginals([post]))[0] });
    }
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const filter = req.query.filter || "all";
    const author = req.query.author || "";
    const ids = await readIndex("posts");
    // Filtering needs the records, so read a generous window when filtered.
    const windowIds = filter === "all" && !author ? ids.slice(offset, offset + limit) : ids.slice(0, 400);
    // Targeted announcements only reach their audience (authors and
    // moderators always see what they posted).
    const canSee = p => p.authorId === me.id || ctx.can("moderate") || inAudience(p, me);
    let posts = (await getRecords("posts", windowIds)).filter(canSee);
    if (author) posts = posts.filter(p => p.authorId === author || p.kudosTo === author);
    if (filter === "wins") posts = posts.filter(p => p.type === "win" || p.type === "celebration" || p.meta?.kind === "deal_won" || p.meta?.kind === "goal_completed");
    if (filter === "kudos") posts = posts.filter(p => p.type === "kudos");
    if (filter === "announcements") posts = posts.filter(p => p.type === "announcement");
    if (filter === "for-me") posts = posts.filter(p => p.type === "announcement" && p.audience && p.audience.type !== "all" && inAudience(p, me));
    if (filter === "mine") posts = posts.filter(p => p.authorId === me.id);
    if (filter !== "all" || author) posts = posts.slice(offset, offset + limit);
    const pinned = offset === 0 && filter === "all" && !author ? (await getRecords("posts", ids.slice(0, 400))).filter(p => p.pinned && canSee(p)) : [];
    const pinnedIds = new Set(pinned.map(p => p.id));
    const list = [...pinned, ...posts.filter(p => !pinnedIds.has(p.id))];
    return res.json({ ok: true, posts: await withOriginals(list), hasMore: ids.length > offset + limit, nextOffset: offset + limit });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const action = body.action || "create";

    if (action === "create") {
      const type = TYPES.includes(body.type) ? body.type : "update";
      const text = String(body.text || "").trim().slice(0, 3000);
      if (type === "announcement" && !ctx.can("announce")) return res.status(403).json({ error: "Your role can't post company announcements" });
      if (!validImage(body.imageDataUrl)) return res.status(400).json({ error: "Image must be PNG/JPEG/WebP under ~900KB" });
      let reshareOf = null;
      if (type === "reshare") {
        const original = await getRecord("posts", body.reshareOf);
        if (!original) return res.status(404).json({ error: "Original post not found" });
        reshareOf = original.reshareOf || original.id;
        const root = original.reshareOf ? await getRecord("posts", original.reshareOf) : original;
        if (root) {
          root.reshares = (root.reshares || 0) + 1;
          await putRecord("posts", root.id, root);
          await notify([root.authorId], { type: "reshare", title: `${me.fullName} reshared your post`, body: text || root.text, link: `feed:${root.id}`, actorId: me.id });
          await award(root.authorId, "reshare");
        }
      } else if (!text && !body.imageDataUrl && !body.link) {
        return res.status(400).json({ error: "Write something, or add a link or image" });
      }
      let kudosTo = null;
      if (type === "kudos") {
        kudosTo = active.find(e => e.id === body.kudosTo)?.id;
        if (!kudosTo || kudosTo === me.id) return res.status(400).json({ error: "Pick a colleague to give kudos to" });
      }
      const id = newId("post");
      const post = {
        id, authorId: me.id, type, text, link: cleanUrl(body.link), imageDataUrl: body.imageDataUrl || "",
        kudosTo, kudosBadge: type === "kudos" ? String(body.kudosBadge || "Team Player").slice(0, 40) : "",
        reshareOf, reactions: {}, comments: [], reshares: 0, socialShares: {},
        pinned: type === "announcement", visibility: body.visibility === "public" ? "public" : "company",
        audience: type === "announcement" ? cleanAudience(body.audience) : { type: "all", values: [] }, acks: [],
        automated: false, meta: body.goalId ? { goalId: body.goalId } : {}, createdAt: new Date().toISOString(),
      };
      await putRecord("posts", id, post);
      await award(me.id, "post");

      if (type === "announcement") {
        const targets = audienceIds(post.audience, active);
        await notify(targets, { type: "announcement", title: `📣 ${me.fullName}: new announcement`, body: text, link: `feed:${id}`, actorId: me.id });
        if (body.sendEmail) {
          for (const e of active.filter(x => targets.includes(x.id) && x.id !== me.id)) {
            try { await sendAnnouncementEmail(e, text, me.fullName); } catch { /* best-effort */ }
          }
        }
      }
      if (type === "kudos") {
        await notify([kudosTo], { type: "kudos", title: `${me.fullName} gave you kudos: ${post.kudosBadge} 🙌`, body: text, link: `feed:${id}`, actorId: me.id });
        await award(kudosTo, "kudos_received");
        await award(me.id, "kudos_given");
        await logActivity(kudosTo, "kudos", `Received "${post.kudosBadge}" kudos from ${me.fullName}`);
        await addAchievement(kudosTo, `Kudos from ${me.fullName}: ${post.kudosBadge}`, "kudos");
      }
      if (type === "win") {
        await logActivity(me.id, "win", text.slice(0, 140));
        if (post.visibility === "public") await addAchievement(me.id, text.slice(0, 140), "win");
      }
      const mentions = mentionedIds(text, active).filter(x => x !== kudosTo);
      await notify(mentions, { type: "mention", title: `${me.fullName} mentioned you`, body: text, link: `feed:${id}`, actorId: me.id });
      return res.json({ ok: true, post });
    }

    const post = await getRecord("posts", body.id);
    if (!post || !(post.authorId === me.id || ctx.can("moderate") || inAudience(post, me))) return res.status(404).json({ error: "Post not found" });

    if (action === "react") {
      const reaction = REACTIONS.includes(body.reaction) ? body.reaction : "like";
      const reactions = { ...(post.reactions || {}) };
      const had = reactions[me.id];
      if (had === reaction) delete reactions[me.id]; else reactions[me.id] = reaction;
      post.reactions = reactions;
      await putRecord("posts", post.id, post);
      if (!had && reactions[me.id] && post.authorId !== me.id) {
        await award(post.authorId, "like_received");
        await notify([post.authorId], { type: "reaction", title: `${me.fullName} reacted ${reaction} to your post`, body: post.text, link: `feed:${post.id}`, actorId: me.id });
      }
      return res.json({ ok: true, post });
    }

    if (action === "comment") {
      const text = String(body.text || "").trim().slice(0, 1500);
      if (!text) return res.status(400).json({ error: "Comment can't be empty" });
      const comment = { id: newId("cmt"), authorId: me.id, text, at: new Date().toISOString(), likes: [], parentId: body.parentId || null };
      post.comments = [...(post.comments || []), comment];
      await putRecord("posts", post.id, post);
      await award(me.id, "comment");
      // Notify the author, earlier commenters in the thread, and anyone @mentioned.
      const thread = new Set([post.authorId, ...(post.comments || []).map(c => c.authorId)]);
      if (post.kudosTo) thread.add(post.kudosTo);
      const mentions = mentionedIds(text, active);
      await notify([...thread].filter(id => !mentions.includes(id)), { type: "comment", title: `${me.fullName} commented on a post`, body: text, link: `feed:${post.id}`, actorId: me.id });
      await notify(mentions, { type: "mention", title: `${me.fullName} mentioned you in a comment`, body: text, link: `feed:${post.id}`, actorId: me.id });
      return res.json({ ok: true, post });
    }

    if (action === "like-comment") {
      post.comments = (post.comments || []).map(c => c.id !== body.commentId ? c : {
        ...c, likes: (c.likes || []).includes(me.id) ? c.likes.filter(x => x !== me.id) : [...(c.likes || []), me.id],
      });
      await putRecord("posts", post.id, post);
      return res.json({ ok: true, post });
    }

    if (action === "delete-comment") {
      const c = (post.comments || []).find(x => x.id === body.commentId);
      if (!c) return res.status(404).json({ error: "Comment not found" });
      if (c.authorId !== me.id && !ctx.can("moderate")) return res.status(403).json({ error: "You can only delete your own comments" });
      post.comments = post.comments.filter(x => x.id !== body.commentId && x.parentId !== body.commentId);
      await putRecord("posts", post.id, post);
      return res.json({ ok: true, post });
    }

    // Staff shared this post out to a social network (tracked for the advocacy
    // leaderboard). Sharing externally requires the post to be public.
    if (action === "share") {
      const platform = SHARE_PLATFORMS.includes(body.platform) ? body.platform : "copy";
      if (post.visibility !== "public") {
        if (post.authorId !== me.id) return res.status(403).json({ error: "Only the author can make this post public for sharing" });
        post.visibility = "public";
      }
      post.socialShares = { ...(post.socialShares || {}), [platform]: ((post.socialShares || {})[platform] || 0) + 1 };
      await putRecord("posts", post.id, post);
      await award(me.id, "social_share");
      await logActivity(me.id, "share", `Shared a post to ${platform}`);
      return res.json({ ok: true, post });
    }

    if (action === "ack") {
      if (!inAudience(post, me)) return res.status(403).json({ error: "This announcement isn't addressed to you" });
      if (!(post.acks || []).includes(me.id)) {
        post.acks = [...(post.acks || []), me.id];
        await putRecord("posts", post.id, post);
      }
      return res.json({ ok: true, post });
    }

    if (action === "pin") {
      if (!ctx.can("moderate") && !ctx.can("announce")) return res.status(403).json({ error: "Your role can't pin posts" });
      post.pinned = !post.pinned;
      await putRecord("posts", post.id, post);
      return res.json({ ok: true, post });
    }

    if (action === "visibility") {
      if (post.authorId !== me.id) return res.status(403).json({ error: "Only the author can change visibility" });
      post.visibility = post.visibility === "public" ? "company" : "public";
      await putRecord("posts", post.id, post);
      return res.json({ ok: true, post });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  if (req.method === "PATCH") {
    const { id, text } = req.body || {};
    const post = await getRecord("posts", id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.authorId !== me.id) return res.status(403).json({ error: "You can only edit your own posts" });
    post.text = String(text || "").slice(0, 3000);
    post.editedAt = new Date().toISOString();
    await putRecord("posts", id, post);
    return res.json({ ok: true, post });
  }

  if (req.method === "DELETE") {
    const post = await getRecord("posts", req.query.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.authorId !== me.id && !ctx.can("moderate")) return res.status(403).json({ error: "You can only delete your own posts" });
    await deleteRecord("posts", post.id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
