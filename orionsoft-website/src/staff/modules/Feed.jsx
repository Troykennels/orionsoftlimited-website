import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon, Link2, Globe, Lock, MessageCircle, Repeat2, Share2, Pin, Trash2, Pencil, Heart, X as XIcon, Send,
} from "lucide-react";
import { C, font } from "../theme.js";
import { api, timeAgo, shareUrl, SHARE_TARGETS, copyText } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, Textarea, Input, Select, EmptyState, Modal, RichText, Tabs, PageHeader, toast } from "../components.jsx";
import { resizeImageToDataUrl } from "../imageUtils.js";
import { useOffice } from "../office.js";

const TYPES = [
  { id: "update", label: "Update", emoji: "💬" },
  { id: "win", label: "Win", emoji: "🏆" },
  { id: "progress", label: "Progress", emoji: "📈" },
  { id: "question", label: "Question", emoji: "❓" },
  { id: "kudos", label: "Kudos", emoji: "🙌" },
  { id: "announcement", label: "Announcement", emoji: "📣", perm: "announce" },
];
const REACTIONS = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "celebrate", emoji: "🎉", label: "Celebrate" },
  { id: "support", emoji: "🤝", label: "Support" },
  { id: "insightful", emoji: "💡", label: "Insightful" },
  { id: "love", emoji: "❤️", label: "Love" },
];
const BADGES = ["Team Player", "Problem Solver", "Customer Hero", "Above & Beyond", "Great Teamwork", "Innovator", "Mentor", "Sales Star"];
const TYPE_BADGE = { win: ["🏆 Win", C.gold], progress: ["📈 Progress", C.blue], kudos: ["🙌 Kudos", C.purple], announcement: ["📣 Announcement", C.amber], question: ["❓ Question", C.cyan], celebration: ["🎉 Celebration", C.rose], reshare: ["🔁 Reshare", C.textMuted] };

// Who an announcement goes to: everyone, departments, roles or named people.
export function AudiencePicker({ value, onChange, directory, roles }) {
  const departments = [...new Set(directory.map(p => p.department).filter(Boolean))].sort();
  const options = value.type === "departments" ? departments.map(d => [d, d])
    : value.type === "roles" ? roles.map(r => [r.id, r.label])
    : value.type === "people" ? directory.map(p => [p.id, `${p.fullName} · ${p.roleLabel}`]) : [];
  const toggle = v => onChange({ ...value, values: value.values.includes(v) ? value.values.filter(x => x !== v) : [...value.values, v] });
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted }}>Send to:</span>
        {[["all", "Everyone"], ["departments", "Departments"], ["roles", "Roles"], ["people", "Specific people"]].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={value.type === id} onClick={() => onChange({ type: id, values: [] })} style={{ background: value.type === id ? C.goldDim : "none", color: value.type === id ? C.goldLight : C.textMuted, border: `1px solid ${value.type === id ? C.gold + "66" : C.border}`, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font }}>{label}</button>
        ))}
      </div>
      {options.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, maxHeight: 130, overflowY: "auto" }}>
          {options.map(([v, label]) => (
            <label key={v} style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 12.5, color: value.values.includes(v) ? C.heading : C.textMuted, background: value.values.includes(v) ? C.blueDim : "none", border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>
              <input type="checkbox" checked={value.values.includes(v)} onChange={() => toggle(v)} style={{ margin: 0 }} /> {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function audienceLabel(a, roles) {
  if (!a || a.type === "all") return "Everyone";
  if (a.type === "roles") return a.values.map(v => roles.find(r => r.id === v)?.label || v).join(", ");
  if (a.type === "people") return `${a.values.length} ${a.values.length === 1 ? "person" : "people"}`;
  return a.values.join(", ");
}

function audienceSize(a, directory) {
  if (!a || a.type === "all") return directory.length;
  return directory.filter(p => a.type === "departments" ? a.values.includes(p.department) : a.type === "roles" ? a.values.includes(p.staffRole) : a.values.includes(p.id)).length;
}

// Textarea with @mention suggestions that insert @slug tokens.
function MentionTextarea({ value, onChange, placeholder, directory, style, inputRef, onSubmit }) {
  const [query, setQuery] = useState(null);
  const ref = useRef(null);
  const el = inputRef || ref;
  function handle(e) {
    onChange(e.target.value);
    const upto = e.target.value.slice(0, e.target.selectionStart);
    const m = upto.match(/@([a-z0-9-]*)$/i);
    setQuery(m ? m[1].toLowerCase() : null);
  }
  function pick(p) {
    const pos = el.current.selectionStart;
    const before = value.slice(0, pos).replace(/@([a-z0-9-]*)$/i, `@${p.slug} `);
    onChange(before + value.slice(pos));
    setQuery(null);
    setTimeout(() => { el.current.focus(); el.current.selectionStart = el.current.selectionEnd = before.length; }, 0);
  }
  const matches = query !== null ? directory.filter(p => p.slug?.includes(query) || p.fullName.toLowerCase().includes(query)).slice(0, 6) : [];
  return (
    <div style={{ position: "relative" }}>
      <Textarea ref={el} value={value} onChange={handle} placeholder={placeholder} style={style}
        onKeyDown={e => { if (onSubmit && e.key === "Enter" && !e.shiftKey && !matches.length) { e.preventDefault(); onSubmit(); } }} />
      {matches.length > 0 && (
        <div style={{ position: "absolute", left: 8, right: 8, top: "100%", zIndex: 20, background: C.card, border: `1px solid ${C.borderStrong}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>
          {matches.map(p => (
            <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); pick(p); }} className="so-row" style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", background: "none", border: "none", padding: "7px 10px", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
              <Avatar src={p.avatarDataUrl} name={p.fullName} size={24} />
              <span style={{ fontSize: 13, color: C.heading, fontWeight: 700 }}>{p.fullName}</span>
              <span style={{ fontSize: 11.5, color: C.textMuted }}>{p.roleLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ initialType = "update", initialKudosTo = "", onPosted, autoFocus }) {
  const { me, directory, can, roles } = useOffice();
  const [type, setType] = useState(initialType);
  const [audience, setAudience] = useState({ type: "all", values: [] });
  const [sendEmail, setSendEmail] = useState(false);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [image, setImage] = useState("");
  const [visibility, setVisibility] = useState("company");
  const [kudosTo, setKudosTo] = useState(initialKudosTo);
  const [badge, setBadge] = useState(BADGES[0]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => { if (autoFocus) setTimeout(() => textRef.current?.focus(), 50); }, [autoFocus]);

  async function onImage(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    try { setImage(await resizeImageToDataUrl(f, 1280, 0.8)); } catch (ex) { toast(ex.message, "err"); }
  }

  async function submit() {
    if (type === "kudos" && !kudosTo) { toast("Pick who you're giving kudos to", "err"); return; }
    setBusy(true);
    try {
      await api("/api/staff/feed", { method: "POST", body: { type, text, link: showLink ? link : "", imageDataUrl: image, visibility, kudosTo, kudosBadge: badge, audience, sendEmail } });
      setAudience({ type: "all", values: [] }); setSendEmail(false);
      setText(""); setLink(""); setImage(""); setShowLink(false); setKudosTo("");
      toast(type === "kudos" ? "Kudos sent! 🙌" : "Posted to the office feed");
      onPosted();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  const placeholders = { update: "Share an update with the team… use @ to mention someone", win: "What did you win? Closed a deal, shipped a feature, delighted a client…", progress: "How is your work progressing?", question: "Ask the team anything…", kudos: "Say thanks. What did they do that made a difference?", announcement: "Company announcement (pinned and sent to everyone)" };

  return (
    <SectionCard style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {TYPES.filter(t => !t.perm || can(t.perm)).map(t => (
          <button key={t.id} type="button" onClick={() => setType(t.id)} aria-pressed={type === t.id} style={{ background: type === t.id ? C.goldDim : C.surface, color: type === t.id ? C.goldLight : C.textMuted, border: `1px solid ${type === t.id ? C.gold + "66" : C.border}`, borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: font }}>{t.emoji} {t.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Avatar src={me.avatarDataUrl} name={me.fullName} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {type === "kudos" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 8 }}>
              <Select value={kudosTo} onChange={e => setKudosTo(e.target.value)} aria-label="Give kudos to">
                <option value="">Give kudos to…</option>
                {directory.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </Select>
              <Select value={badge} onChange={e => setBadge(e.target.value)} aria-label="Kudos badge">{BADGES.map(b => <option key={b}>{b}</option>)}</Select>
            </div>
          )}
          {type === "announcement" && (
            <>
              <AudiencePicker value={audience} onChange={setAudience} directory={directory} roles={roles} />
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: C.text, marginBottom: 8 }}><input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} /> Also email it to them</label>
            </>
          )}
          <MentionTextarea inputRef={textRef} value={text} onChange={setText} directory={directory} placeholder={placeholders[type]} style={{ minHeight: 84 }} />
          {showLink && <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" style={{ marginTop: 8 }} aria-label="Link" />}
          {image && (
            <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
              <img src={image} alt="Attachment preview" style={{ maxHeight: 180, borderRadius: 10, border: `1px solid ${C.border}` }} />
              <button type="button" onClick={() => setImage("")} aria-label="Remove image" style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: 24, height: 24, cursor: "pointer" }}>×</button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => fileRef.current?.click()} title="Add image" aria-label="Add image" style={iconBtn}><ImageIcon size={17} /></button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onImage} />
            <button type="button" onClick={() => setShowLink(s => !s)} title="Add link" aria-label="Add link" style={iconBtn}><Link2 size={17} /></button>
            <button type="button" onClick={() => setVisibility(v => v === "public" ? "company" : "public")} title="Who can see this" style={{ ...iconBtn, gap: 5, fontSize: 12, fontWeight: 700, color: visibility === "public" ? C.mint : C.textMuted }}>
              {visibility === "public" ? <Globe size={15} /> : <Lock size={15} />}{visibility === "public" ? "Public on my profile" : "Company only"}
            </button>
            <div style={{ flex: 1 }} />
            <Btn onClick={submit} disabled={busy || (!text.trim() && !image && type !== "kudos")} icon={Send}>{type === "kudos" ? "Send kudos" : "Post"}</Btn>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
const iconBtn = { background: "none", border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", fontFamily: font };

function ShareMenu({ post, onClose, onShared }) {
  const { me, person } = useOffice();
  const author = person(post.authorId);
  const mine = post.authorId === me.id;
  const slug = post.kudosTo === me.id ? me.slug : (mine ? me.slug : author.slug || "");
  const canShare = post.visibility === "public" || mine;
  const url = shareUrl(slug, post.id);
  async function go(target) {
    try {
      const j = await api("/api/staff/feed", { method: "POST", body: { action: "share", id: post.id, platform: target?.id || "copy" } });
      onShared(j.post);
      if (target) window.open(target.build(url, post.text || ""), "_blank", "noopener,noreferrer");
      else { await copyText(url); toast("Link copied"); }
      onClose();
    } catch (e) { toast(e.message, "err"); }
  }
  return (
    <Modal title="Share to your social networks" onClose={onClose} width={440}>
      {!canShare ? <EmptyState>Only the author can publish this post for sharing. Ask {author.fullName} to share it, or reshare it inside the office.</EmptyState> : (
        <>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 0, lineHeight: 1.6 }}>
            {post.visibility === "public" ? "This post is public on your profile." : "Sharing will make this post public on your profile page so people can open the link."} Each share earns you advocacy points.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SHARE_TARGETS.map(t => <Btn key={t.id} variant="ghost" onClick={() => go(t)}>{t.label}</Btn>)}
            <Btn variant="blue" onClick={() => go(null)}>Copy link</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

function PostCard({ post: initial, onDeleted, highlight }) {
  const { me, person, directory, openPerson, can, roles } = useOffice();
  const [post, setPost] = useState(initial);
  const [showComments, setShowComments] = useState(highlight || (initial.comments || []).length > 0 && (initial.comments || []).length <= 2);
  const [comment, setComment] = useState("");
  const [picker, setPicker] = useState(false);
  const [share, setShare] = useState(false);
  const [reshare, setReshare] = useState(false);
  const [reshareText, setReshareText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(initial.text);
  const ref = useRef(null);

  useEffect(() => { if (highlight) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [highlight]);

  const author = person(post.authorId);
  const mine = post.authorId === me.id;
  const myReaction = post.reactions?.[me.id];
  const reactionCounts = REACTIONS.map(r => ({ ...r, n: Object.values(post.reactions || {}).filter(x => x === r.id).length })).filter(r => r.n);
  const totalReactions = Object.keys(post.reactions || {}).length;
  const totalShares = Object.values(post.socialShares || {}).reduce((a, b) => a + b, 0);

  async function act(body) {
    try { const j = await api("/api/staff/feed", { method: "POST", body: { id: post.id, ...body } }); setPost(p => ({ ...j.post, original: p.original })); return true; }
    catch (e) { toast(e.message, "err"); return false; }
  }
  async function sendComment() {
    if (!comment.trim()) return;
    if (await act({ action: "comment", text: comment })) { setComment(""); setShowComments(true); }
  }
  async function doReshare() {
    try { await api("/api/staff/feed", { method: "POST", body: { type: "reshare", reshareOf: post.id, text: reshareText } }); toast("Reshared to the office feed"); setReshare(false); setReshareText(""); }
    catch (e) { toast(e.message, "err"); }
  }
  async function remove() {
    if (!confirm("Delete this post?")) return;
    try { await api(`/api/staff/feed?id=${encodeURIComponent(post.id)}`, { method: "DELETE" }); onDeleted(post.id); } catch (e) { toast(e.message, "err"); }
  }
  async function saveEdit() {
    try { const j = await api("/api/staff/feed", { method: "PATCH", body: { id: post.id, text: editText } }); setPost(p => ({ ...j.post, original: p.original })); setEditing(false); } catch (e) { toast(e.message, "err"); }
  }

  const [label, color] = TYPE_BADGE[post.type] || [];
  const kudosPerson = post.kudosTo ? person(post.kudosTo) : null;
  const original = post.original;

  return (
    <div ref={ref} className="so-card" style={{ border: `1px solid ${highlight ? C.gold : post.pinned ? C.gold + "55" : C.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <button type="button" onClick={() => author.slug && openPerson(author.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <Avatar src={author.avatarDataUrl} name={author.fullName} size={42} presence={author.presence?.status} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => author.slug && openPerson(author.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.heading, fontWeight: 800, fontSize: 14, fontFamily: font }}>{author.fullName}</button>
            {label && <Badge color={color}>{label}</Badge>}
            {post.pinned && <Badge color={C.gold}><Pin size={11} /> Pinned</Badge>}
            {post.visibility === "public" && <Badge color={C.mint}><Globe size={11} /> Public</Badge>}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{author.roleLabel || author.title}{author.roleLabel ? " · " : ""}{timeAgo(post.createdAt)}{post.editedAt ? " · edited" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {(can("moderate") || can("announce")) && <button type="button" onClick={() => act({ action: "pin" })} title={post.pinned ? "Unpin" : "Pin"} aria-label="Pin post" style={ghostIcon}><Pin size={15} /></button>}
          {mine && post.type !== "reshare" && <button type="button" onClick={() => setEditing(e => !e)} title="Edit" aria-label="Edit post" style={ghostIcon}><Pencil size={15} /></button>}
          {mine && <button type="button" onClick={() => act({ action: "visibility" })} title={post.visibility === "public" ? "Make company-only" : "Make public"} aria-label="Change visibility" style={ghostIcon}>{post.visibility === "public" ? <Lock size={15} /> : <Globe size={15} />}</button>}
          {(mine || can("moderate")) && <button type="button" onClick={remove} title="Delete" aria-label="Delete post" style={{ ...ghostIcon, color: C.rose }}><Trash2 size={15} /></button>}
        </div>
      </div>

      {kudosPerson && (
        <div style={{ margin: "12px 0 4px", display: "flex", alignItems: "center", gap: 10, background: `linear-gradient(90deg, ${C.purpleDim}, transparent)`, border: `1px solid ${C.purple}44`, borderRadius: 12, padding: "10px 12px" }}>
          <span style={{ fontSize: 22 }}>🙌</span>
          <Avatar src={kudosPerson.avatarDataUrl} name={kudosPerson.fullName} size={30} />
          <div style={{ fontSize: 13, color: C.text }}>Kudos to <button type="button" onClick={() => openPerson(kudosPerson.id)} style={{ background: "none", border: "none", padding: 0, color: C.heading, fontWeight: 800, cursor: "pointer", fontFamily: font, fontSize: 13 }}>{kudosPerson.fullName}</button> · <strong style={{ color: C.purple }}>{post.kudosBadge}</strong></div>
        </div>
      )}

      {editing ? (
        <div style={{ marginTop: 12 }}>
          <Textarea value={editText} onChange={e => setEditText(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Btn small onClick={saveEdit}>Save</Btn><Btn small variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn></div>
        </div>
      ) : post.text ? <RichText text={post.text} directory={directory} onMention={openPerson} style={{ fontSize: 14.5, color: C.text, marginTop: 12 }} /> : null}

      {post.type === "announcement" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10, fontSize: 12.5, color: C.textMuted }}>
          <span>📨 To: <strong style={{ color: C.text }}>{audienceLabel(post.audience, roles)}</strong></span>
          {(mine || can("moderate") || post.authorId === "admin") && <span>· Read by {(post.acks || []).length} of {audienceSize(post.audience, directory)}</span>}
          {!mine && !(post.acks || []).includes(me.id) && <Btn small variant="blue" onClick={() => act({ action: "ack" }).then(ok => ok && toast("Marked as read"))}>✓ Mark as read</Btn>}
          {!mine && (post.acks || []).includes(me.id) && <span style={{ color: C.mint, fontWeight: 700 }}>✓ You've read this</span>}
        </div>
      )}
      {post.link && <a href={post.link} target="_blank" rel="noreferrer noopener" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.blue, fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}><Link2 size={14} /> {post.link.replace(/^https?:\/\//, "").slice(0, 80)}</a>}
      {post.imageDataUrl && <img src={post.imageDataUrl} alt="" style={{ width: "100%", maxHeight: 460, objectFit: "cover", borderRadius: 12, marginTop: 12, border: `1px solid ${C.border}` }} />}

      {post.type === "reshare" && (
        original ? (
          <div style={{ marginTop: 12, border: `1px solid ${C.borderStrong}`, borderRadius: 12, padding: 14, background: C.surface }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Avatar src={person(original.authorId).avatarDataUrl} name={person(original.authorId).fullName} size={26} />
              <strong style={{ fontSize: 13, color: C.heading }}>{person(original.authorId).fullName}</strong>
              <span style={{ fontSize: 12, color: C.textMuted }}>{timeAgo(original.createdAt)}</span>
            </div>
            <RichText text={original.text} directory={directory} onMention={openPerson} style={{ fontSize: 13.5, color: C.text }} />
            {original.imageDataUrl && <img src={original.imageDataUrl} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 10, marginTop: 8 }} />}
          </div>
        ) : <div style={{ marginTop: 10, fontSize: 12.5, color: C.textMuted, fontStyle: "italic" }}>The original post was removed.</div>
      )}

      {(totalReactions > 0 || (post.comments || []).length > 0 || post.reshares > 0 || totalShares > 0) && (
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12.5, color: C.textMuted, flexWrap: "wrap" }}>
          {totalReactions > 0 && <span>{reactionCounts.map(r => r.emoji).join("")} {totalReactions}</span>}
          {(post.comments || []).length > 0 && <button type="button" onClick={() => setShowComments(s => !s)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 0, fontFamily: font, fontSize: 12.5 }}>{post.comments.length} comment{post.comments.length === 1 ? "" : "s"}</button>}
          {post.reshares > 0 && <span>{post.reshares} reshare{post.reshares === 1 ? "" : "s"}</span>}
          {totalShares > 0 && <span>Shared to social {totalShares}×</span>}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}`, position: "relative", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }} onMouseLeave={() => setPicker(false)}>
          <button type="button" onClick={() => act({ action: "react", reaction: myReaction || "like" })} onMouseEnter={() => setPicker(true)} onFocus={() => setPicker(true)} style={{ ...actionBtn, color: myReaction ? C.gold : C.textMuted }}>
            {myReaction ? REACTIONS.find(r => r.id === myReaction)?.emoji : <Heart size={16} />} {myReaction ? REACTIONS.find(r => r.id === myReaction)?.label : "React"}
          </button>
          {picker && (
            <div style={{ position: "absolute", bottom: "100%", left: 0, display: "flex", gap: 2, background: C.raised, border: `1px solid ${C.borderStrong}`, borderRadius: 999, padding: 4, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 10 }}>
              {REACTIONS.map(r => <button key={r.id} type="button" title={r.label} aria-label={r.label} onClick={() => { setPicker(false); act({ action: "react", reaction: r.id }); }} style={{ background: myReaction === r.id ? C.goldDim : "none", border: "none", fontSize: 20, cursor: "pointer", borderRadius: "50%", width: 36, height: 36 }}>{r.emoji}</button>)}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setShowComments(true)} style={actionBtn}><MessageCircle size={16} /> Comment</button>
        {post.type !== "reshare" && <button type="button" onClick={() => setReshare(true)} style={actionBtn}><Repeat2 size={16} /> Reshare</button>}
        <button type="button" onClick={() => setShare(true)} style={actionBtn}><Share2 size={16} /> Share</button>
      </div>

      {showComments && (
        <div style={{ marginTop: 10 }}>
          {(post.comments || []).map(c => {
            const a = person(c.authorId);
            const liked = (c.likes || []).includes(me.id);
            return (
              <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Avatar src={a.avatarDataUrl} name={a.fullName} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 12px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.heading }}>{a.fullName} <span style={{ fontWeight: 500, color: C.textMuted }}>· {timeAgo(c.at)}</span></div>
                    <RichText text={c.text} directory={directory} onMention={openPerson} style={{ fontSize: 13.5, color: C.text, marginTop: 2 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 3, paddingLeft: 6 }}>
                    <button type="button" onClick={() => act({ action: "like-comment", commentId: c.id })} style={{ ...tinyBtn, color: liked ? C.gold : C.textMuted }}>{liked ? "Liked" : "Like"}{(c.likes || []).length ? ` · ${c.likes.length}` : ""}</button>
                    {(c.authorId === me.id || can("moderate")) && <button type="button" onClick={() => act({ action: "delete-comment", commentId: c.id })} style={{ ...tinyBtn, color: C.rose }}>Delete</button>}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Avatar src={me.avatarDataUrl} name={me.fullName} size={30} />
            <div style={{ flex: 1 }}><MentionTextarea value={comment} onChange={setComment} directory={directory} placeholder="Write a comment… (Enter to send)" style={{ minHeight: 42, padding: "8px 12px" }} onSubmit={sendComment} /></div>
            <Btn small onClick={sendComment} disabled={!comment.trim()} icon={Send}>Send</Btn>
          </div>
        </div>
      )}

      {share && <ShareMenu post={post} onClose={() => setShare(false)} onShared={p => setPost(prev => ({ ...p, original: prev.original }))} />}
      {reshare && (
        <Modal title="Reshare to the office feed" onClose={() => setReshare(false)} width={500}>
          <Textarea value={reshareText} onChange={e => setReshareText(e.target.value)} placeholder="Add your thoughts (optional)" />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}><Btn icon={Repeat2} onClick={doReshare}>Reshare</Btn><Btn variant="ghost" onClick={() => setReshare(false)}>Cancel</Btn></div>
        </Modal>
      )}
    </div>
  );
}
const ghostIcon = { background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 6, borderRadius: 7, display: "flex" };
const actionBtn = { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: "7px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: font };
const tinyBtn = { background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11.5, fontWeight: 700, fontFamily: font };

export default function Feed({ param }) {
  const { navigate } = useOffice();
  const [filter, setFilter] = useState("all");
  const [posts, setPosts] = useState([]);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [version, setVersion] = useState(0);

  const focusId = param && param.startsWith("post_") ? param : null;
  const composeType = param === "kudos" || param?.startsWith("kudos-") ? "kudos" : "update";
  const kudosTo = param?.startsWith("kudos-") ? param.slice(6) : "";

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const j = await api(`/api/staff/feed?filter=${filter}&offset=${offset}&limit=15`);
      setPosts(prev => offset ? [...prev, ...j.posts.filter(p => !prev.some(x => x.id === p.id))] : j.posts);
      setHasMore(j.hasMore);
      setNextOffset(j.nextOffset);
    } catch (e) { toast(e.message, "err"); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(0); }, [load, version]);
  useEffect(() => {
    if (!focusId) return;
    api(`/api/staff/feed?id=${encodeURIComponent(focusId)}`).then(j => setFocused(j.post)).catch(() => setFocused(null));
  }, [focusId]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <PageHeader title="Office Feed" sub="Share wins and progress, celebrate teammates, and keep everyone in the loop." />
      <Composer key={param || "c"} initialType={composeType} initialKudosTo={kudosTo} autoFocus={param === "compose" || composeType === "kudos"} onPosted={() => { setVersion(v => v + 1); if (param) navigate("feed"); }} />
      {focused && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.08em" }}>FROM YOUR NOTIFICATION</span>
            <button type="button" onClick={() => { setFocused(null); navigate("feed"); }} aria-label="Dismiss" style={ghostIcon}><XIcon size={15} /></button>
          </div>
          <PostCard post={focused} highlight onDeleted={() => setFocused(null)} />
        </div>
      )}
      <Tabs active={filter} onChange={setFilter} tabs={[{ id: "all", label: "Everything" }, { id: "wins", label: "🏆 Wins" }, { id: "kudos", label: "🙌 Kudos" }, { id: "announcements", label: "📣 Announcements" }, { id: "for-me", label: "📨 For me" }, { id: "mine", label: "My posts" }]} />
      {!loading && posts.length === 0 && <EmptyState>Nothing here yet. Start the conversation!</EmptyState>}
      {posts.filter(p => p.id !== focused?.id).map(p => <PostCard key={p.id} post={p} onDeleted={id => setPosts(list => list.filter(x => x.id !== id))} />)}
      {loading && <EmptyState>Loading…</EmptyState>}
      {!loading && hasMore && <div style={{ textAlign: "center" }}><Btn variant="ghost" onClick={() => load(nextOffset)}>Load more</Btn></div>}
    </div>
  );
}
