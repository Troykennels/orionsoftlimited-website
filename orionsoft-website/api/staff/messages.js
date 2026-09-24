// Team messaging: company channels, automatic department channels, custom
// channels, and 1:1 direct messages. Clients poll (no websockets needed on
// either Railway or Vercel); unread state is a per-person read cursor.
import { push, list, get, set, ltrim } from "../store.js";
import { listRecords, putRecord, newId } from "../_lib/records.js";
import { officeContext, notify, mentionedIds, slugify } from "../_lib/office.js";

const BUILTIN = [
  { id: "general", name: "general", topic: "Company-wide conversation" },
  { id: "wins", name: "wins", topic: "Share wins, deals and good news" },
  { id: "watercooler", name: "watercooler", topic: "Off-topic chat, like the office kitchen" },
  { id: "help", name: "help", topic: "Ask anything: tools, processes, how-to" },
];
const chatKey = id => `orionsoft:chat:${id}`;
const lastKey = "orionsoft:chat:last";
const readKey = id => `orionsoft:chat:read:${id}`;
const dmsKey = id => `orionsoft:chat:dms:${id}`;

// Employee ids contain "_", so DM ids use "--" as the separator.
export function dmId(a, b) { return `dm--${[a, b].sort().join("--")}`; }
function dmMembers(id) { return id.startsWith("dm--") ? id.slice(4).split("--") : []; }

function channelsFor(me, employees, custom) {
  const depts = [...new Set(employees.filter(e => e.status === "active" && e.department).map(e => e.department))];
  const deptChannels = depts.map(d => ({ id: `dept_${slugify(d)}`, name: slugify(d), topic: `${d} team channel`, department: d }));
  const visibleDept = deptChannels.filter(c => c.department === me.department || ["owner", "md", "coo"].includes(me.staffRole));
  const customVisible = custom.filter(c => !c.archived && (!c.private || (c.memberIds || []).includes(me.id)));
  return [...BUILTIN, ...visibleDept, ...customVisible];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees, active } = ctx;
  const custom = await listRecords("channels");
  const channels = channelsFor(me, employees, custom);

  function canAccess(channelId) {
    if (channelId.startsWith("dm--")) {
      const members = dmMembers(channelId);
      return members.length === 2 && members.includes(me.id);
    }
    return channels.some(c => c.id === channelId);
  }

  if (req.method === "GET") {
    if (req.query.channel) {
      const id = req.query.channel;
      if (!canAccess(id)) return res.status(403).json({ error: "You don't have access to this conversation" });
      const msgs = (await list(chatKey(id), 150)).reverse();
      const since = req.query.since;
      const reads = (await get(readKey(me.id))) || {};
      reads[id] = new Date().toISOString();
      await set(readKey(me.id), reads);
      return res.json({ ok: true, messages: since ? msgs.filter(m => m.at > since) : msgs });
    }
    const [last, reads, dmPartners] = await Promise.all([get(lastKey), get(readKey(me.id)), get(dmsKey(me.id))]);
    const lastMap = last || {}, readMap = reads || {};
    const unread = id => !!lastMap[id] && lastMap[id].by !== me.id && (!readMap[id] || lastMap[id].at > readMap[id]);
    const dms = (dmPartners || []).filter(pid => active.some(e => e.id === pid)).map(pid => {
      const id = dmId(me.id, pid);
      return { id, partnerId: pid, lastAt: lastMap[id]?.at || "", preview: lastMap[id]?.preview || "", unread: unread(id) };
    }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    return res.json({
      ok: true,
      channels: channels.map(c => ({ ...c, lastAt: lastMap[c.id]?.at || "", preview: lastMap[c.id]?.preview || "", unread: unread(c.id) })),
      dms,
      unreadTotal: channels.filter(c => unread(c.id)).length + dms.filter(d => d.unread).length,
    });
  }

  if (req.method === "POST") {
    const b = req.body || {};

    if (b.action === "create-channel") {
      const name = slugify(b.name).slice(0, 30);
      if (!name) return res.status(400).json({ error: "Channel name is required" });
      if (channels.some(c => c.name === name)) return res.status(409).json({ error: "A channel with that name already exists" });
      const id = `ch_${newId("c").slice(2)}`;
      const channel = { id, name, topic: String(b.topic || "").slice(0, 140), private: !!b.private, memberIds: b.private ? [...new Set([me.id, ...(b.memberIds || [])])] : [], createdBy: me.id, createdAt: new Date().toISOString() };
      await putRecord("channels", id, channel);
      return res.json({ ok: true, channel });
    }

    if (b.action === "open-dm") {
      const partner = active.find(e => e.id === b.partnerId);
      if (!partner || partner.id === me.id) return res.status(400).json({ error: "Pick a colleague" });
      for (const [a, c] of [[me.id, partner.id], [partner.id, me.id]]) {
        const cur = (await get(dmsKey(a))) || [];
        if (!cur.includes(c)) await set(dmsKey(a), [c, ...cur]);
      }
      return res.json({ ok: true, id: dmId(me.id, partner.id) });
    }

    // Send a message.
    const id = b.channel;
    const text = String(b.text || "").trim().slice(0, 4000);
    if (!id || !text) return res.status(400).json({ error: "channel and text are required" });
    if (!canAccess(id)) return res.status(403).json({ error: "You don't have access to this conversation" });
    const msg = { id: newId("msg"), channelId: id, authorId: me.id, text, at: new Date().toISOString() };
    await push(chatKey(id), msg);
    await ltrim(chatKey(id), 1000);
    const last = (await get(lastKey)) || {};
    last[id] = { at: msg.at, by: me.id, preview: `${me.fullName.split(" ")[0]}: ${text.slice(0, 60)}` };
    await set(lastKey, last);

    if (id.startsWith("dm--")) {
      const partnerId = dmMembers(id).find(x => x !== me.id);
      for (const [a, c] of [[me.id, partnerId], [partnerId, me.id]]) {
        const cur = (await get(dmsKey(a))) || [];
        if (!cur.includes(c)) await set(dmsKey(a), [c, ...cur]);
      }
      await notify([partnerId], { type: "message", title: `New message from ${me.fullName}`, body: text, link: `messages:${id}`, actorId: me.id });
    } else {
      const mentions = mentionedIds(text, active);
      const channel = channels.find(c => c.id === id);
      await notify(mentions, { type: "mention", title: `${me.fullName} mentioned you in #${channel?.name || id}`, body: text, link: `messages:${id}`, actorId: me.id });
    }
    return res.json({ ok: true, message: msg });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
