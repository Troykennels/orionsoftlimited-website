import { useCallback, useEffect, useState } from "react";
import { Plus, Rocket, ExternalLink, Copy, TrendingUp, Megaphone, Trash2 } from "lucide-react";
import { C, font, SOCIAL_META } from "../theme.js";
import { api, timeAgo, fmtDate, SHARE_TARGETS, copyText } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, SectionTitle, Input, Textarea, Select, Modal, Field, EmptyState, PageHeader, Tabs, Grid, toast } from "../components.jsx";
import { resizeImageToDataUrl } from "../imageUtils.js";
import { useOffice } from "../office.js";
import { SocialLinks } from "./PersonDrawer.jsx";

const METRICS = [["likes", "Likes"], ["comments", "Comments"], ["shares", "Shares/reposts"], ["views", "Views/impressions"], ["clicks", "Link clicks"]];

// Tiny inline sparkline for follower growth.
function Growth({ points, color }) {
  if (points.length < 2) return <div style={{ fontSize: 12, color: C.textMuted }}>Add another update later to see growth.</div>;
  const w = 220, h = 48, vals = points.map(p => p.followers);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i / (points.length - 1)) * w},${h - ((p.followers - min) / span) * (h - 6) - 3}`).join(" ");
  const delta = vals[vals.length - 1] - vals[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Follower growth"><path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></svg>
      <span style={{ fontSize: 13, fontWeight: 800, color: delta >= 0 ? C.mint : C.rose }}>{delta >= 0 ? "+" : ""}{delta.toLocaleString()} since {fmtDate(points[0].date)}</span>
    </div>
  );
}

function LogPost({ platforms, onClose, onSaved }) {
  const [f, setF] = useState({ platform: "linkedin", url: "", caption: "", postedAt: new Date().toISOString().slice(0, 10), metrics: {}, boost: true });
  async function save() {
    try { await api("/api/staff/social", { method: "POST", body: { action: "log", ...f } }); toast(f.boost ? "Logged. The team has been asked to boost it 🚀" : "Social post logged"); onSaved(); }
    catch (e) { toast(e.message, "err"); }
  }
  return (
    <Modal title="Log a social media post" onClose={onClose} width={560}>
      <p style={{ fontSize: 13, color: C.textMuted, marginTop: 0 }}>Posted about Orion Soft, a product, a client win or your work? Log it to track your reach and earn advocacy points.</p>
      <Grid min={160} style={{ marginBottom: 12 }}>
        <Field label="Platform"><Select value={f.platform} onChange={e => setF(x => ({ ...x, platform: e.target.value }))}>{platforms.map(p => <option key={p} value={p}>{SOCIAL_META[p]?.label || p}</option>)}</Select></Field>
        <Field label="Posted on"><Input type="date" value={f.postedAt} onChange={e => setF(x => ({ ...x, postedAt: e.target.value }))} /></Field>
      </Grid>
      <Field label="Link to your post" style={{ marginBottom: 12 }}><Input value={f.url} onChange={e => setF(x => ({ ...x, url: e.target.value }))} placeholder="https://www.linkedin.com/posts/…" /></Field>
      <Field label="What was it about?" style={{ marginBottom: 12 }}><Textarea value={f.caption} onChange={e => setF(x => ({ ...x, caption: e.target.value }))} style={{ minHeight: 60 }} /></Field>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>ENGAGEMENT SO FAR (update it any time)</div>
      <Grid min={110} style={{ marginBottom: 12 }}>
        {METRICS.map(([k, l]) => <Field key={k} label={l}><Input type="number" min="0" value={f.metrics[k] || ""} onChange={e => setF(x => ({ ...x, metrics: { ...x.metrics, [k]: e.target.value } }))} /></Field>)}
      </Grid>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.text, marginBottom: 14 }}><input type="checkbox" checked={f.boost} onChange={e => setF(x => ({ ...x, boost: e.target.checked }))} /> 🚀 Ask colleagues to like, comment and reshare it</label>
      <Btn onClick={save} disabled={!f.url && !f.caption}>Log post</Btn>
    </Modal>
  );
}

function Metrics({ post, onClose, onSaved }) {
  const [m, setM] = useState(post.metrics || {});
  async function save() {
    try { await api("/api/staff/social", { method: "POST", body: { action: "metrics", id: post.id, metrics: m } }); toast("Engagement updated"); onSaved(); } catch (e) { toast(e.message, "err"); }
  }
  return (
    <Modal title="Update engagement" onClose={onClose} width={480}>
      <Grid min={120} style={{ marginBottom: 14 }}>{METRICS.map(([k, l]) => <Field key={k} label={l}><Input type="number" min="0" value={m[k] ?? ""} onChange={e => setM(x => ({ ...x, [k]: e.target.value }))} /></Field>)}</Grid>
      <Btn onClick={save}>Save</Btn>
    </Modal>
  );
}

function NewKit({ onClose, onSaved }) {
  const [f, setF] = useState({ title: "", caption: "", link: "", hashtags: "", imageDataUrl: "" });
  async function save() {
    try { await api("/api/staff/social", { method: "POST", body: { action: "create-kit", ...f } }); toast("Share kit published to all staff"); onSaved(); } catch (e) { toast(e.message, "err"); }
  }
  return (
    <Modal title="Publish a share kit" onClose={onClose} width={560}>
      <Field label="Title" style={{ marginBottom: 10 }}><Input value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="e.g. CareCore is live at Lagos General" /></Field>
      <Field label="Suggested caption" style={{ marginBottom: 10 }}><Textarea value={f.caption} onChange={e => setF(x => ({ ...x, caption: e.target.value }))} /></Field>
      <Grid min={180} style={{ marginBottom: 10 }}>
        <Field label="Link"><Input value={f.link} onChange={e => setF(x => ({ ...x, link: e.target.value }))} placeholder="https://orionsoftlimited.com/…" /></Field>
        <Field label="Hashtags"><Input value={f.hashtags} onChange={e => setF(x => ({ ...x, hashtags: e.target.value }))} placeholder="#HealthTech #Nigeria" /></Field>
      </Grid>
      <Field label="Image (optional)" style={{ marginBottom: 14 }}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        try { const d = await resizeImageToDataUrl(file, 1200, 0.82); setF(x => ({ ...x, imageDataUrl: d })); } catch (er) { toast(er.message, "err"); }
      }} style={{ color: C.text }} /></Field>
      <Btn onClick={save} disabled={!f.title.trim() || !f.caption.trim()}>Publish to all staff</Btn>
    </Modal>
  );
}

export default function Social({ param }) {
  const { me, person, openPerson, can, reload } = useOffice();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("kits");
  const [logging, setLogging] = useState(param === "log");
  const [editing, setEditing] = useState(null);
  const [newKit, setNewKit] = useState(false);
  const [followerForm, setFollowerForm] = useState({ platform: "linkedin", followers: "" });

  const load = useCallback(() => api("/api/staff/social").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);

  async function shareKit(kit, target) {
    const text = `${kit.caption}${kit.hashtags ? `\n\n${kit.hashtags}` : ""}`;
    const url = kit.link || "https://orionsoftlimited.com";
    try {
      await api("/api/staff/social", { method: "POST", body: { action: "kit-share", id: kit.id, platform: target?.id || "copy" } });
      if (target) window.open(target.build(url, text), "_blank", "noopener,noreferrer");
      else { await copyText(`${text}\n${url}`); toast("Caption & link copied. Paste into Instagram, TikTok or anywhere."); }
      load(); reload();
    } catch (e) { toast(e.message, "err"); }
  }
  async function engaged(p) {
    try { await api("/api/staff/social", { method: "POST", body: { action: "engaged", id: p.id } }); } catch { /* still open it */ }
    if (p.url) window.open(p.url, "_blank", "noopener,noreferrer");
    load();
  }
  async function saveFollowers() {
    try { await api("/api/staff/social", { method: "POST", body: { action: "followers", ...followerForm } }); toast("Follower count saved"); setFollowerForm(f => ({ ...f, followers: "" })); load(); } catch (e) { toast(e.message, "err"); }
  }

  if (!data) return <EmptyState>Loading…</EmptyState>;
  const mine = data.standings.find(s => s.id === me.id) || {};
  const rank = data.standings.findIndex(s => s.id === me.id) + 1;
  const byPlatform = data.followers.reduce((m, s) => ({ ...m, [s.platform]: [...(m[s.platform] || []), s] }), {});

  return (
    <div>
      <PageHeader title="Social & Advocacy" sub="Grow your professional presence and amplify Orion Soft. Every post, share and boost earns points."
        action={<>{can("sharekits") && <Btn variant="ghost" icon={Megaphone} onClick={() => setNewKit(true)}>New share kit</Btn>}<Btn icon={Plus} onClick={() => setLogging(true)}>Log a social post</Btn></>} />

      <Grid min={160} style={{ marginBottom: 18 }}>
        {[["Advocacy rank", rank ? `#${rank}` : "—", C.gold], ["Posts logged", mine.posts || 0, C.blue], ["Kit shares", mine.kitShares || 0, C.purple], ["Engagement", (mine.engagement || 0).toLocaleString(), C.mint], ["Reach (views)", (mine.reach || 0).toLocaleString(), C.cyan], ["Boosts given", mine.boostsHelped || 0, C.amber]].map(([l, v, c]) => (
          <SectionCard key={l} style={{ padding: 14 }}><div style={{ fontSize: 12, color: C.textMuted }}>{l}</div><div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div></SectionCard>
        ))}
      </Grid>

      <Tabs active={tab} onChange={setTab} tabs={[
        { id: "kits", label: "📣 Share kits", count: data.kits.filter(k => !k.mySharesCount).length },
        { id: "boosts", label: "🚀 Boost colleagues", count: data.boosts.filter(b => !(b.engagedBy || []).includes(me.id)).length },
        { id: "mine", label: "My social posts" },
        { id: "growth", label: "My accounts & growth" },
        { id: "board", label: "🏆 Leaderboard" },
      ]} />

      {tab === "kits" && (data.kits.length === 0 ? <EmptyState>No share kits yet. Marketing will publish ready-to-post content here.</EmptyState> : (
        <Grid min={320}>
          {data.kits.map(k => (
            <SectionCard key={k.id} style={{ padding: 0, overflow: "hidden" }}>
              {k.imageDataUrl && <img src={k.imageDataUrl} alt="" style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }} />}
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.heading }}>{k.title}</div>
                  {k.mySharesCount > 0 && <Badge color={C.mint}>Shared ✓</Badge>}
                </div>
                <p style={{ fontSize: 13.5, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{k.caption}</p>
                {k.hashtags && <div style={{ fontSize: 12.5, color: C.blue, marginBottom: 8 }}>{k.hashtags}</div>}
                <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 10 }}>By {k.createdBy} · {timeAgo(k.createdAt)} · shared {k.totalShares}×</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SHARE_TARGETS.slice(0, 4).map(t => <Btn key={t.id} small variant="ghost" onClick={() => shareKit(k, t)}>{t.label}</Btn>)}
                  <Btn small variant="blue" icon={Copy} onClick={() => shareKit(k, null)}>Copy</Btn>
                  {(k.createdById === me.id || can("moderate")) && <Btn small danger icon={Trash2} onClick={async () => { if (confirm("Delete this share kit?")) { await api(`/api/staff/social?type=kit&id=${k.id}`, { method: "DELETE" }).catch(e => toast(e.message, "err")); load(); } }} />}
                </div>
              </div>
            </SectionCard>
          ))}
        </Grid>
      ))}

      {tab === "boosts" && (data.boosts.length === 0 ? <EmptyState icon={Rocket}>No boost requests right now.</EmptyState> : data.boosts.map(b => {
        const p = person(b.employeeId), done = (b.engagedBy || []).includes(me.id);
        return (
          <SectionCard key={b.id} style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Avatar src={p.avatarDataUrl} name={p.fullName} size={38} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13.5, color: C.heading, fontWeight: 700 }}>{p.fullName} posted on {SOCIAL_META[b.platform]?.label || b.platform}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted }}>{b.caption || b.url} · {timeAgo(b.createdAt)} · {(b.engagedBy || []).length} colleague{(b.engagedBy || []).length === 1 ? "" : "s"} engaged</div>
            </div>
            {done ? <Badge color={C.mint}>You engaged ✓</Badge> : <Btn small icon={Rocket} onClick={() => engaged(b)}>Like, comment & reshare</Btn>}
          </SectionCard>
        );
      }))}

      {tab === "mine" && (data.activity.length === 0 ? <EmptyState>No posts logged yet. Log your first one to start tracking your reach.</EmptyState> : data.activity.map(p => (
        <SectionCard key={p.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge color={SOCIAL_META[p.platform]?.color}>{SOCIAL_META[p.platform]?.label || p.platform}</Badge>
              <span style={{ fontSize: 12.5, color: C.textMuted }}>{fmtDate(p.postedAt)}</span>
              {p.boost && <Badge color={C.amber}>🚀 {(p.engagedBy || []).length} boosts</Badge>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" icon={ExternalLink}>Open</Btn></a>}
              <Btn small variant="ghost" icon={TrendingUp} onClick={() => setEditing(p)}>Update stats</Btn>
              <Btn small danger icon={Trash2} onClick={async () => { if (confirm("Remove this log?")) { await api(`/api/staff/social?id=${p.id}`, { method: "DELETE" }).catch(e => toast(e.message, "err")); load(); } }} />
            </div>
          </div>
          {p.caption && <p style={{ fontSize: 13.5, color: C.text, margin: "8px 0" }}>{p.caption}</p>}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: C.textMuted }}>
            {METRICS.map(([k, l]) => <span key={k}><strong style={{ color: C.heading }}>{(p.metrics?.[k] || 0).toLocaleString()}</strong> {l.toLowerCase()}</span>)}
          </div>
        </SectionCard>
      )))}

      {tab === "growth" && (
        <div className="so-stack" style={{ gap: 14 }}>
          <SectionCard>
            <SectionTitle sub="Linked accounts show on your profile and public page. Edit them in My Profile.">My social accounts</SectionTitle>
            {Object.keys(me.socials || {}).length ? <SocialLinks socials={me.socials} /> : <EmptyState>No accounts linked yet. Add them in My Profile.</EmptyState>}
          </SectionCard>
          <SectionCard>
            <SectionTitle sub="Record your follower count from time to time to chart your growth.">Follower growth</SectionTitle>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <Select value={followerForm.platform} onChange={e => setFollowerForm(f => ({ ...f, platform: e.target.value }))} style={{ width: "auto" }}>{data.platforms.map(p => <option key={p} value={p}>{SOCIAL_META[p]?.label || p}</option>)}</Select>
              <Input type="number" min="0" value={followerForm.followers} onChange={e => setFollowerForm(f => ({ ...f, followers: e.target.value }))} placeholder="Current followers" style={{ width: 180 }} />
              <Btn onClick={saveFollowers} disabled={followerForm.followers === ""}>Save</Btn>
            </div>
            {Object.keys(byPlatform).length === 0 && <EmptyState>No follower data yet.</EmptyState>}
            {Object.entries(byPlatform).map(([platform, pts]) => (
              <div key={platform} style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong style={{ color: SOCIAL_META[platform]?.color || C.heading, fontSize: 13.5 }}>{SOCIAL_META[platform]?.label || platform}</strong>
                  <span style={{ fontSize: 13, color: C.heading, fontWeight: 800 }}>{pts[pts.length - 1].followers.toLocaleString()} followers</span>
                </div>
                <Growth points={pts} color={SOCIAL_META[platform]?.color || C.gold} />
              </div>
            ))}
          </SectionCard>
        </div>
      )}

      {tab === "board" && (
        <SectionCard>
          <SectionTitle sub="Score = posts × 8 + kit shares × 5 + boosts given × 2 + engagement ÷ 10">Advocacy leaderboard</SectionTitle>
          {data.standings.map((s, i) => {
            const p = person(s.id);
            return (
              <button key={s.id} type="button" onClick={() => openPerson(s.id)} className="so-row" style={{ display: "grid", gridTemplateColumns: "34px 1fr repeat(3, minmax(60px, auto))", gap: 10, alignItems: "center", width: "100%", padding: "9px 6px", border: "none", borderBottom: `1px solid ${C.border}`, background: s.id === me.id ? C.goldDim : "none", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
                <span style={{ fontWeight: 800, color: i < 3 ? C.gold : C.textMuted }}>{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><Avatar src={p.avatarDataUrl} name={p.fullName} size={28} /><span style={{ fontSize: 13.5, color: C.heading, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.fullName}</span></span>
                <span style={{ fontSize: 12, color: C.textMuted, textAlign: "right" }}>{s.posts} posts</span>
                <span className="so-hide-sm" style={{ fontSize: 12, color: C.textMuted, textAlign: "right" }}>{s.kitShares} shares</span>
                <span style={{ fontSize: 14, color: C.mint, fontWeight: 800, textAlign: "right" }}>{s.score}</span>
              </button>
            );
          })}
        </SectionCard>
      )}

      {logging && <LogPost platforms={data.platforms} onClose={() => setLogging(false)} onSaved={() => { setLogging(false); load(); reload(); }} />}
      {editing && <Metrics post={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {newKit && <NewKit onClose={() => setNewKit(false)} onSaved={() => { setNewKit(false); load(); }} />}
    </div>
  );
}
