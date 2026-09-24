import { useEffect, useState } from "react";
import { MessageSquare, Award, CalendarPlus, ExternalLink, Trophy } from "lucide-react";
import { C, font, PRESENCE, SOCIAL_META } from "../theme.js";
import { api, timeAgo, fmtDate, profileUrl, waLink, firstName } from "../api.js";
import { Avatar, Badge, Btn, Modal, Progress, EmptyState, toast } from "../components.jsx";
import { useOffice } from "../office.js";

function Stat({ label, value }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.heading }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export function SocialLinks({ socials = {}, size = 12.5 }) {
  const entries = Object.entries(socials).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {entries.map(([k, url]) => (
        <a key={k} href={url} target="_blank" rel="noreferrer noopener" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: size, fontWeight: 700, textDecoration: "none", color: SOCIAL_META[k]?.color || C.text, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 10px" }}>
          {SOCIAL_META[k]?.label || k} <ExternalLink size={11} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

export default function PersonDrawer({ id, onClose }) {
  const { me, navigate, openPerson, directory } = useOffice();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api(`/api/staff/office?view=person&id=${encodeURIComponent(id)}`)
      .then(j => { if (!cancelled) setData(j); })
      .catch(e => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [id]);

  async function message() {
    try {
      const j = await api("/api/staff/messages", { method: "POST", body: { action: "open-dm", partnerId: id } });
      onClose(); navigate("messages", j.id);
    } catch (e) { toast(e.message, "err"); }
  }

  const p = data?.person;
  const isMe = p?.id === me.id;
  const presence = PRESENCE[p?.presence?.status] || PRESENCE.offline;

  return (
    <Modal onClose={onClose} title={p ? p.fullName : "Profile"} width={720}>
      {err && <EmptyState>{err}</EmptyState>}
      {!data && !err && <EmptyState>Loading profile…</EmptyState>}
      {p && (
        <div style={{ fontFamily: font }}>
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ height: 86, background: "linear-gradient(120deg, #0A2540 0%, #16345c 50%, #3b2f12 100%)" }} />
            <div style={{ padding: "0 18px 16px", display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ border: `3px solid ${C.card}`, borderRadius: "50%", marginTop: -38 }}><Avatar src={p.avatarDataUrl} name={p.fullName} size={76} presence={p.presence?.status} /></div>
              <div style={{ flex: 1, minWidth: 200, paddingTop: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.heading }}>{p.fullName}</div>
                <div style={{ fontSize: 13, color: C.text }}>{p.title}{p.department ? ` · ${p.department}` : ""}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <Badge color={C.gold}>{p.roleLabel}</Badge>
                  <Badge color={presence.color}>{presence.label}{p.presence?.note ? ` · ${p.presence.note}` : ""}</Badge>
                </div>
              </div>
            </div>
            {p.headline && <div style={{ padding: "0 18px 14px", fontSize: 14, color: C.heading, fontWeight: 600 }}>{p.headline}</div>}
          </div>

          {!isMe && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <Btn small icon={MessageSquare} onClick={message}>Message</Btn>
              {p.whatsapp && <a href={waLink(p.whatsapp, `Hi ${firstName(p.fullName)}, it's ${firstName(me.fullName)} from Orion Soft. `)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" style={{ color: "#25D366", borderColor: "#25D36655" }}>WhatsApp</Btn></a>}
              <Btn small variant="blue" icon={Award} onClick={() => { onClose(); navigate("feed", `kudos-${p.id}`); }}>Give kudos</Btn>
              <Btn small variant="ghost" icon={CalendarPlus} onClick={() => { onClose(); navigate("meetings", `with-${p.id}`); }}>Book a meeting</Btn>
              {p.publicProfile && <a href={profileUrl(p.slug)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" icon={ExternalLink}>Public page</Btn></a>}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 16 }}>
            <Stat label="Points (all time)" value={data.stats.points} />
            <Stat label="Posts" value={data.stats.posts} />
            <Stat label="Kudos received" value={data.stats.kudos} />
            <Stat label="Reactions earned" value={data.stats.reactions} />
            <Stat label="Social shares" value={data.stats.socialShares} />
          </div>

          <h3 style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.06em", margin: "0 0 8px" }}>ABOUT</h3>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{p.bio || "No bio yet."}</p>
          {p.skills?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{p.skills.map(s => <Badge key={s} color={C.blue}>{s}</Badge>)}</div>}
          <SocialLinks socials={p.socials} />
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>✉ {p.email}</span>
            {p.phone && <span>☎ {p.phone}</span>}
            {p.location && <span>📍 {p.location}</span>}
            {p.startDate && <span>Joined {fmtDate(p.startDate)}</span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 18 }}>
            <div>
              <h3 style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.06em", margin: "0 0 8px" }}>REPORTING LINE</h3>
              {data.manager ? (
                <button type="button" onClick={() => openPerson(data.manager.id)} className="so-row" style={{ display: "flex", gap: 8, alignItems: "center", background: "none", border: "none", padding: 4, cursor: "pointer", fontFamily: font, textAlign: "left" }}>
                  <Avatar src={data.manager.avatarDataUrl} name={data.manager.fullName} size={28} />
                  <span style={{ fontSize: 13, color: C.text }}>Reports to <strong style={{ color: C.heading }}>{data.manager.fullName}</strong></span>
                </button>
              ) : <div style={{ fontSize: 13, color: C.textMuted }}>Top of the organisation</div>}
              {data.reports.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{data.reports.length} direct report{data.reports.length === 1 ? "" : "s"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.reports.map(r => <button key={r.id} type="button" title={r.fullName} onClick={() => openPerson(r.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><Avatar src={r.avatarDataUrl} name={r.fullName} size={30} presence={r.presence?.status} /></button>)}
                  </div>
                </div>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.06em", margin: "0 0 8px" }}>ACHIEVEMENTS</h3>
              {data.achievements.length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>No achievements yet.</div>}
              {data.achievements.slice(0, 6).map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: C.text, marginBottom: 6 }}>
                  <Trophy size={14} color={C.gold} style={{ marginTop: 3, flexShrink: 0 }} aria-hidden="true" /> <span>{a.text.replace(/@([a-z0-9-]+)/gi, (m, slug) => directory.find(d => d.slug === slug.toLowerCase())?.fullName || m)} <span style={{ color: C.textMuted, fontSize: 11.5 }}>· {timeAgo(a.at)}</span></span>
                </div>
              ))}
            </div>
          </div>

          <h3 style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.06em", margin: "18px 0 8px" }}>GOALS & PROGRESS</h3>
          {data.goals.length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>No shared goals.</div>}
          {data.goals.slice(0, 6).map(g => (
            <div key={g.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5, gap: 10 }}>
                <span style={{ color: C.heading, fontWeight: 700 }}>{g.title}</span>
                <span style={{ color: g.progress >= 100 ? C.mint : C.gold, fontWeight: 800 }}>{g.progress}%</span>
              </div>
              <Progress value={g.progress} />
            </div>
          ))}

          <h3 style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.06em", margin: "18px 0 8px" }}>RECENT ACTIVITY</h3>
          {data.activity.length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>Nothing yet.</div>}
          {data.activity.slice(0, 10).map(a => (
            <div key={a.id} style={{ fontSize: 13, color: C.text, padding: "6px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>{a.text}</span><span style={{ color: C.textMuted, fontSize: 11.5, whiteSpace: "nowrap" }}>{timeAgo(a.at)}</span>
            </div>
          ))}

          {data.hr && !isMe && (
            <div style={{ marginTop: 18, background: C.surface, border: `1px solid ${C.amber}44`, borderRadius: 12, padding: 14 }}>
              <h3 style={{ fontSize: 13, color: C.amber, letterSpacing: "0.06em", margin: "0 0 10px" }}>HR RECORD · visible to HR and line management only</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8, fontSize: 13 }}>
                {[["Phone", data.hr.phone], ["Date of birth", data.hr.dateOfBirth], ["Gender", data.hr.gender], ["Address", data.hr.address],
                  ["Emergency contact", [data.hr.emergencyContactName, data.hr.emergencyContactRelationship, data.hr.emergencyContactPhone].filter(Boolean).join(" · ")],
                  ["Start date", data.hr.startDate], ["Leave allowance", `${data.hr.leaveAllowance || 20} days`], ["Status", data.hr.status]].map(([k, v]) => (
                  <div key={k}><div style={{ color: C.textMuted, fontSize: 11.5 }}>{k}</div><div style={{ color: C.heading }}>{v || "—"}</div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
