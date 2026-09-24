// Public staff profiles on the website: /people (directory) and
// /people/:slug (one person). Only staff who switched on "public profile" in
// the Staff Office appear, showing only what they chose to publish.
import { useEffect, useState } from "react";
import { ExternalLink, Trophy, MapPin, Mail, CalendarDays, Share2 } from "lucide-react";
import { C, font, SOCIAL_META } from "../staff/theme.js";
import "../staff/staff.css";

const initials = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
const fmt = d => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

function Avatar({ src, name, size }) {
  const s = { width: size, height: size, borderRadius: "50%", flexShrink: 0, objectFit: "cover", border: `3px solid ${C.bg}`, background: C.goldDim, color: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 800, fontFamily: font };
  return src ? <img src={src} alt={name} style={s} /> : <div style={s} aria-label={name}>{initials(name)}</div>;
}

function Socials({ socials }) {
  const list = Object.entries(socials || {});
  if (!list.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {list.map(([k, url]) => (
        <a key={k} href={url} target="_blank" rel="noreferrer noopener me" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, border: `1px solid ${C.border}`, background: C.card, color: SOCIAL_META[k]?.color || C.text, fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: font }}>
          {SOCIAL_META[k]?.label || k} <ExternalLink size={12} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function useMeta(title, description) {
  useEffect(() => {
    if (!title) return undefined;
    const prev = document.title;
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content");
    if (meta && description) meta.setAttribute("content", description.slice(0, 160));
    return () => { document.title = prev; if (meta && prevDesc) meta.setAttribute("content", prevDesc); };
  }, [title, description]);
}

export function PeopleGrid({ setCurrentPage, limit }) {
  const [people, setPeople] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/people").then(r => r.ok ? r.json() : { people: [] }).then(j => { if (!cancelled) setPeople(j.people || []); }).catch(() => { if (!cancelled) setPeople([]); });
    return () => { cancelled = true; };
  }, []);
  if (!people) return <div style={{ color: C.textMuted, textAlign: "center", padding: 30, fontFamily: font }}>Loading…</div>;
  if (!people.length) return <div style={{ color: C.textMuted, textAlign: "center", padding: 30, fontFamily: font }}>Our people's profiles are coming soon.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))", gap: 20 }}>
      {people.slice(0, limit || people.length).map(p => (
        <button key={p.slug} type="button" onClick={() => setCurrentPage("person", p.slug)} className="people-card"
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, textAlign: "center", cursor: "pointer", fontFamily: font, transition: "transform 0.2s, border-color 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = C.borderHover; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = C.border; }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Avatar src={p.avatarDataUrl} name={p.fullName} size={84} /></div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.heading }}>{p.fullName}</div>
          <div style={{ fontSize: 13, color: C.gold, fontWeight: 700, marginTop: 4 }}>{p.title}</div>
          {p.headline && <div style={{ fontSize: 13, color: C.text, marginTop: 10, lineHeight: 1.55 }}>{p.headline}</div>}
        </button>
      ))}
    </div>
  );
}

export function PeoplePage({ setCurrentPage }) {
  useMeta("Our People | Orion Soft Limited", "Meet the people building enterprise software for African organisations at Orion Soft Limited.");
  return (
    <section style={{ background: C.bg, padding: "120px clamp(16px, 4vw, 40px) 90px", minHeight: "70vh" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: C.gold, letterSpacing: "0.12em", fontFamily: font }}>OUR PEOPLE</div>
          <h1 style={{ fontSize: "clamp(30px, 4.5vw, 48px)", fontWeight: 800, color: C.heading, margin: "10px 0 12px", letterSpacing: "-0.03em", fontFamily: font }}>The team behind Orion Soft</h1>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, maxWidth: 620, margin: "0 auto" }}>Engineers, business developers and partners building software that helps Nigerian hospitals, schools and businesses run better.</p>
        </div>
        <PeopleGrid setCurrentPage={setCurrentPage} />
      </div>
    </section>
  );
}

export function PersonPage({ slug, setCurrentPage }) {
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const focusPost = new URLSearchParams(window.location.search).get("post");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/people?slug=${encodeURIComponent(slug)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(j => { if (!cancelled) setData(j); })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [slug]);
  useEffect(() => {
    if (!data || !focusPost) return;
    setTimeout(() => document.getElementById(`post-${focusPost}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  }, [data, focusPost]);

  const p = data?.person;
  useMeta(p ? `${p.fullName} · ${p.title} | Orion Soft` : null, p?.headline || p?.bio);

  if (missing) return (
    <section style={{ background: C.bg, padding: "160px 20px 100px", textAlign: "center", fontFamily: font, minHeight: "60vh" }}>
      <h1 style={{ color: C.heading, fontSize: 28 }}>Profile not found</h1>
      <p style={{ color: C.textMuted }}>This person may have made their profile private.</p>
      <button type="button" onClick={() => setCurrentPage("people")} style={{ marginTop: 14, background: C.gold, color: "#060810", border: "none", borderRadius: 10, padding: "12px 22px", fontWeight: 800, cursor: "pointer", fontFamily: font }}>Meet our people</button>
    </section>
  );
  if (!p) return <div style={{ background: C.bg, minHeight: "70vh" }} />;

  const shareLink = `${window.location.origin}/api/public/share?person=${encodeURIComponent(p.slug)}`;
  const shareText = `${p.fullName}, ${p.title} at Orion Soft`;
  const shares = [
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`],
    ["X", `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`],
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareLink}`)}`],
  ];
  const label = { win: "🏆 Win", progress: "📈 Progress", kudos: "🙌 Kudos", announcement: "📣 News", update: "Update", celebration: "🎉 Celebration" };

  return (
    <div style={{ background: C.bg, fontFamily: font }}>
      <section style={{ position: "relative", padding: "120px clamp(16px, 4vw, 40px) 0", background: "linear-gradient(180deg, rgba(10,37,64,0.85), rgba(6,8,16,1) 85%), url(/assets/cloud-infrastructure-team.jpg) center 35% / cover" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", paddingBottom: 30 }}>
          <Avatar src={p.avatarDataUrl} name={p.fullName} size={132} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.gold, letterSpacing: "0.12em" }}>ORION SOFT · {p.department ? p.department.toUpperCase() : "TEAM"}</div>
            <h1 style={{ fontSize: "clamp(30px, 4.6vw, 46px)", fontWeight: 800, color: "#fff", margin: "8px 0 6px", letterSpacing: "-0.03em" }}>{p.fullName}</h1>
            <div style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{p.title}</div>
            {p.headline && <div style={{ fontSize: 15.5, color: "rgba(255,255,255,0.75)", marginTop: 8, lineHeight: 1.5, maxWidth: 620 }}>{p.headline}</div>}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>
              {p.location && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={14} /> {p.location}</span>}
              {p.startYear && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><CalendarDays size={14} /> At Orion Soft since {p.startYear}</span>}
              {p.email && <a href={`mailto:${p.email}`} style={{ display: "flex", alignItems: "center", gap: 5, color: "inherit" }}><Mail size={14} /> {p.email}</a>}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "10px clamp(16px, 4vw, 40px) 90px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 22, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 20, gridColumn: "span 1" }}>
            <Card title="About">
              <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>{p.bio || `${p.fullName} is part of the Orion Soft team.`}</p>
              {p.skills?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>{p.skills.map(s => <span key={s} style={{ fontSize: 12.5, fontWeight: 700, color: C.blue, background: C.blueDim, borderRadius: 999, padding: "4px 11px" }}>{s}</span>)}</div>}
            </Card>
            {data.posts.length > 0 && (
              <Card title="Highlights">
                {data.posts.map(post => (
                  <div key={post.id} id={`post-${post.id}`} style={{ padding: "14px 0", borderTop: `1px solid ${C.border}`, outline: post.id === focusPost ? `2px solid ${C.gold}` : "none", borderRadius: post.id === focusPost ? 10 : 0, paddingLeft: post.id === focusPost ? 12 : 0, paddingRight: post.id === focusPost ? 12 : 0 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}><strong style={{ color: C.gold }}>{label[post.type] || "Update"}</strong> · {fmt(post.createdAt)}{post.fromColleague ? ` · from ${post.fromColleague}` : ""}{post.kudosBadge ? ` · ${post.kudosBadge}` : ""}</div>
                    <div style={{ fontSize: 14.5, color: C.heading, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{post.text}</div>
                    {post.imageDataUrl && <img src={post.imageDataUrl} alt="" loading="lazy" style={{ width: "100%", borderRadius: 12, marginTop: 10, maxHeight: 380, objectFit: "cover" }} />}
                    {post.link && <a href={post.link} target="_blank" rel="noreferrer noopener" style={{ display: "inline-block", marginTop: 8, color: C.blue, fontSize: 13.5, wordBreak: "break-all" }}>{post.link}</a>}
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{post.reactions} reaction{post.reactions === 1 ? "" : "s"} · {post.comments} comment{post.comments === 1 ? "" : "s"} from the team</div>
                  </div>
                ))}
              </Card>
            )}
          </div>
          <div className="so-stack" style={{ gap: 20 }}>
            <Card title="Connect"><Socials socials={p.socials} />{!Object.keys(p.socials || {}).length && <p style={{ color: C.textMuted, fontSize: 13.5, margin: 0 }}>No social links shared.</p>}</Card>
            {data.goals.length > 0 && (
              <Card title="Working towards">
                {data.goals.map(g => (
                  <div key={g.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, color: C.heading, fontWeight: 700, marginBottom: 6 }}><span>{g.title}</span><span style={{ color: g.progress >= 100 ? C.mint : C.gold }}>{g.progress}%</span></div>
                    <div style={{ height: 8, background: C.surface, borderRadius: 8, overflow: "hidden" }}><div style={{ width: `${Math.min(100, g.progress)}%`, height: "100%", background: g.progress >= 100 ? C.mint : C.gold }} /></div>
                  </div>
                ))}
              </Card>
            )}
            {p.achievements?.length > 0 && (
              <Card title="Achievements">
                {p.achievements.map((a, i) => <div key={i} style={{ display: "flex", gap: 10, fontSize: 14, color: C.text, padding: "7px 0", lineHeight: 1.5 }}><Trophy size={16} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{a.text}<span style={{ color: C.textMuted, fontSize: 12 }}> · {fmt(a.at)}</span></span></div>)}
              </Card>
            )}
            <Card title="Share this profile">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {shares.map(([n, href]) => <a key={n} href={href} target="_blank" rel="noreferrer noopener" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, color: C.heading, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}><Share2 size={13} /> {n}</a>)}
              </div>
            </Card>
            <Card title="Work with Orion Soft">
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginTop: 0 }}>Talk to our team about hospital, school, finance, HR or compliance software.</p>
              <button type="button" onClick={() => setCurrentPage("contact")} style={{ background: C.gold, color: "#060810", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 800, cursor: "pointer", fontFamily: font, fontSize: 14 }}>Contact us →</button>
              <button type="button" onClick={() => setCurrentPage("people")} style={{ marginLeft: 8, background: "none", color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 18px", fontWeight: 700, cursor: "pointer", fontFamily: font, fontSize: 14 }}>Meet the team</button>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, color: C.textMuted, letterSpacing: "0.1em", margin: "0 0 14px", textTransform: "uppercase", fontFamily: font }}>{title}</h2>
      {children}
    </div>
  );
}
