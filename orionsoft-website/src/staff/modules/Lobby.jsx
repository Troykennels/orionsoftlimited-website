import { useCallback, useEffect, useRef, useState } from "react";
import {
  PenSquare, Award, Share2, Palmtree, ClipboardList, CalendarPlus, Video, ListChecks, CheckCheck,
  Trophy, Link2, MessageSquare, Sun, Coffee, LogOut, Cake, BookOpen, Users,
} from "lucide-react";
import { C, font, PRESENCE } from "../theme.js";
import { api, timeAgo, firstName, waLink, fmtDate } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, SectionTitle, StatCard, Textarea, Select, EmptyState, Modal, Field, RichText, toast } from "../components.jsx";
import { useOffice } from "../office.js";
import { getDeviceId, getLocation, techDetail } from "../geo.js";
import { useConsent } from "./FieldVisits.jsx";
import DeviceHelp from "../DeviceHelp.jsx";
import PhoneCheck from "../PhoneCheck.jsx";

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function hoursWorked(rec) {
  if (!rec?.clockIn) return 0;
  let mins = rec.minutes || 0;
  if (!rec.clockOut) mins += Math.round((Date.now() - Date.parse(rec.resumedAt || rec.clockIn)) / 60000);
  return mins;
}

function DayFlow({ onChanged }) {
  const [att, setAtt] = useState(null);
  const [mode, setMode] = useState("remote");
  const [standupOpen, setStandupOpen] = useState(false);
  const [su, setSu] = useState({ yesterday: "", today: "", blockers: "" });
  const [eodOpen, setEodOpen] = useState(false);
  const [eod, setEod] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/api/staff/attendance").then(setAtt).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const { ensure, modal } = useConsent();
  const [locMsg, setLocMsg] = useState("");
  const [locAcc, setLocAcc] = useState(null);
  const locControl = useRef({});
  const [locFail, setLocFail] = useState(null); // { kind, body, okMsg }

  async function act(body, okMsg, { skipLocation = false } = {}) {
    const locate = body.action === "clock-in" || body.action === "clock-out";
    if (locate && !skipLocation && !(await ensure())) return false;
    setBusy(true);
    try {
      let extra = {};
      if (locate) {
        extra = { geo: null, deviceId: getDeviceId() };
        if (!skipLocation) {
          setLocMsg("Getting your location…"); setLocAcc(null);
          locControl.current = {};
          // Clock-in only needs to know roughly where the day starts, so a
          // Wi-Fi-grade fix (±100m) is taken at once rather than waiting for GPS.
          const loc = await getLocation({ where: "clock-in/out", goodEnough: 100, settleMs: 3000, maxWait: 12000, control: locControl.current,
            onProgress: g => { setLocAcc(Math.round(g.accuracy)); setLocMsg(`Getting your location… ±${Math.round(g.accuracy)}m`); } });
          setLocMsg(""); setLocAcc(null);
          if (!loc.geo) { setLocFail({ kind: loc.kind, detail: techDetail(loc), body, okMsg }); return false; }
          extra.geo = loc.geo;
        }
      }
      setLocFail(null);
      await api("/api/staff/attendance", { method: "POST", body: { ...body, ...extra } });
      toast(okMsg);
      await load(); onChanged();
      return true;
    } catch (e) { toast(e.message, "err"); return false; } finally { setBusy(false); }
  }

  const rec = att?.todayRecord;
  const clockedIn = rec?.clockIn && !rec?.clockOut;
  const mins = hoursWorked(rec);

  return (
    <div style={{ background: "rgba(6,8,16,0.55)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", borderRadius: 14, padding: 16, minWidth: 260 }}>
      {modal}
      {locFail && (
        <Modal title={locFail.body.action === "clock-in" ? "Clock in: location needed" : "Clock out: location needed"} onClose={() => setLocFail(null)} width={520}>
          <DeviceHelp kind={locFail.kind} detail={locFail.detail}
            onRetry={() => { const f = locFail; setLocFail(null); act(f.body, f.okMsg).then(ok => ok && f.body.action === "clock-in" && !rec?.standup && setStandupOpen(true)); }}
            onSkip={() => { const f = locFail; setLocFail(null); act(f.body, f.okMsg, { skipLocation: true }); }}
            skipLabel={`${locFail.body.action === "clock-in" ? "Clock in" : "Clock out"} without location (flagged)`} />
        </Modal>
      )}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: C.gold, marginBottom: 8 }}>MY DAY</div>
      {locMsg && <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 13, marginBottom: 8 }}><span className="so-pulse" style={{ width: 9, height: 9, borderRadius: "50%", background: C.blue }} />{locMsg}{locAcc != null && <button type="button" onClick={() => locControl.current.accept?.()} style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.gold}88`, color: C.gold, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Use this</button>}</div>}
      {!att && <div style={{ color: C.textMuted, fontSize: 13 }}>Loading…</div>}
      {att && !clockedIn && (
        <>
          <div style={{ color: "#fff", fontSize: 14, marginBottom: 10 }}>{rec?.clockOut ? `Signed off after ${Math.floor(mins / 60)}h ${mins % 60}m. Great work today!` : "Ready to start? Clock in to let the team know you're at your desk."}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Select value={mode} onChange={e => setMode(e.target.value)} style={{ width: "auto", padding: "8px 10px", fontSize: 13 }} aria-label="Work mode">
              <option value="remote">Working remotely</option>
              <option value="field">On field visits</option>
              <option value="client_site">At a client site</option>
              <option value="hybrid">Hybrid</option>
            </Select>
            <Btn small icon={Sun} disabled={busy} onClick={() => act({ action: "clock-in", mode }, "You're clocked in. Have a great day!").then(ok => ok && !rec?.standup && setStandupOpen(true))}>{rec?.clockOut ? "Clock back in" : "Start my day"}</Btn>
          </div>
        </>
      )}
      {att && clockedIn && (
        <>
          <div style={{ color: "#fff", fontSize: 14, marginBottom: 4 }}>You're in · since {new Date(rec.clockIn).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}{rec.lateMinutes > 0 ? <span style={{ color: C.amber }}> · {rec.lateMinutes >= 60 ? `${Math.floor(rec.lateMinutes / 60)}h ${rec.lateMinutes % 60}m` : `${rec.lateMinutes} min`} late</span> : null}{rec.clockInGeo ? " · 📍" : ""}</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12.5, marginBottom: 10 }}>{Math.floor(mins / 60)}h {mins % 60}m today · {rec.standup ? "standup posted ✓" : "standup not posted yet"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!rec.standup && <Btn small icon={Coffee} onClick={() => setStandupOpen(true)}>Post standup</Btn>}
            <Btn small variant="ghost" icon={LogOut} onClick={() => setEodOpen(true)}>Clock out</Btn>
          </div>
        </>
      )}

      {standupOpen && (
        <Modal title="Daily standup" onClose={() => setStandupOpen(false)}>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 0 }}>Posted automatically to your team channel. Blockers alert your line manager.</p>
          <Field label="What did you get done yesterday?" style={{ marginBottom: 12 }}><Textarea value={su.yesterday} onChange={e => setSu(s => ({ ...s, yesterday: e.target.value }))} style={{ minHeight: 60 }} /></Field>
          <Field label="What are you working on today?" style={{ marginBottom: 12 }}><Textarea value={su.today} onChange={e => setSu(s => ({ ...s, today: e.target.value }))} style={{ minHeight: 60 }} /></Field>
          <Field label="Anything blocking you? (optional)" style={{ marginBottom: 14 }}><Textarea value={su.blockers} onChange={e => setSu(s => ({ ...s, blockers: e.target.value }))} style={{ minHeight: 50 }} /></Field>
          <Btn disabled={busy || !su.today.trim()} onClick={async () => { if (await act({ action: "standup", ...su }, "Standup posted to your team channel")) setStandupOpen(false); }}>Post standup</Btn>
        </Modal>
      )}
      {eodOpen && (
        <Modal title="Wrap up your day" onClose={() => setEodOpen(false)}>
          <Field label="End-of-day note (optional): what did you finish?" style={{ marginBottom: 14 }}><Textarea value={eod} onChange={e => setEod(e.target.value)} /></Field>
          <Btn disabled={busy} onClick={async () => { if (await act({ action: "clock-out", eod }, "Clocked out. Rest well!")) setEodOpen(false); }}>Clock out</Btn>
        </Modal>
      )}
    </div>
  );
}

function ReachManagement() {
  const { office, directory, me, openPerson, navigate } = useOffice();
  const mgmt = directory.filter(p => p.id !== me.id && p.level <= 3).sort((a, b) => a.level - b.level).slice(0, 6);
  const line = office.lineManager;
  const people = line && !mgmt.some(m => m.id === line.id) ? [line, ...mgmt] : mgmt;
  async function dm(id) {
    try { const j = await api("/api/staff/messages", { method: "POST", body: { action: "open-dm", partnerId: id } }); navigate("messages", j.id); }
    catch (e) { toast(e.message, "err"); }
  }
  return (
    <SectionCard>
      <SectionTitle sub="Message in the office, or on WhatsApp when you're on the move.">Reach management</SectionTitle>
      {people.length === 0 && <EmptyState>No managers set up yet.</EmptyState>}
      {people.map(p => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          <button type="button" onClick={() => openPerson(p.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><Avatar src={p.avatarDataUrl} name={p.fullName} size={34} presence={p.presence?.status} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.fullName}{line?.id === p.id ? <span style={{ color: C.gold, fontWeight: 600 }}> · your manager</span> : null}</div>
            <div style={{ fontSize: 11.5, color: C.textMuted }}>{p.roleLabel}</div>
          </div>
          <button type="button" onClick={() => dm(p.id)} title="Message in the office" aria-label={`Message ${p.fullName}`} style={{ background: C.blueDim, color: C.blue, border: "none", borderRadius: 8, padding: 7, cursor: "pointer", display: "flex" }}><MessageSquare size={15} /></button>
          {p.whatsapp && <a href={waLink(p.whatsapp, `Hi ${firstName(p.fullName)}, it's ${firstName(me.fullName)} from Orion Soft. `)} target="_blank" rel="noreferrer" title="WhatsApp" aria-label={`WhatsApp ${p.fullName}`} style={{ background: "rgba(37,211,102,0.14)", color: "#25D366", borderRadius: 8, padding: "6px 9px", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>WA</a>}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {office.config.managementWhatsapp && <a href={waLink(office.config.managementWhatsapp, `Hello Orion Soft management, this is ${me.fullName}. `)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" style={{ color: "#25D366", borderColor: "#25D36655" }}>Management WhatsApp line</Btn></a>}
        {office.config.whatsappGroupLink && <a href={office.config.whatsappGroupLink} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" style={{ color: "#25D366", borderColor: "#25D36655" }}>Team WhatsApp group</Btn></a>}
      </div>
    </SectionCard>
  );
}

export default function Lobby() {
  const { office, me, directory, navigate, openPerson, person, can, reload, openLink } = useOffice();
  const [tasks, setTasks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [phoneReady, setPhoneReady] = useState(() => { try { return !!localStorage.getItem("so_phone_ready"); } catch { return true; } });
  const [anns, setAnns] = useState([]);

  useEffect(() => {
    api("/api/staff/feed?view=my-announcements").then(j => setAnns(j.posts)).catch(() => {});
    api("/api/staff/tasks").then(j => setTasks(j.tasks.filter(t => t.assigneeId === me.id && t.status !== "done"))).catch(() => {});
    api("/api/staff/feed?limit=5").then(j => setPosts(j.posts)).catch(() => {});
  }, [me.id]);

  const rankIdx = office.leaderboard.findIndex(b => b.id === me.id);
  const myPoints = office.leaderboard[rankIdx]?.points || 0;
  const approvals = office.approvals.leave + office.approvals.reports + office.approvals.expenses;
  const inNow = directory.filter(p => ["available", "meeting", "field", "focus"].includes(p.presence?.status) && p.id !== me.id);
  const today = office.today.slice(5);
  const upcoming = directory.filter(p => p.birthday).map(p => {
    const d = new Date(`${office.today.slice(0, 4)}-${p.birthday}T12:00:00`);
    if (p.birthday < today) d.setFullYear(d.getFullYear() + 1);
    return { p, d, days: Math.round((d - new Date(`${office.today}T12:00:00`)) / 86400000) };
  }).filter(x => x.days <= 30).sort((a, b) => a.days - b.days).slice(0, 5);
  const pendingAck = office.config.resources.filter(r => r.requiresAck && !office.acknowledged.includes(r.id));

  const quick = [
    { label: "New post", icon: PenSquare, go: () => navigate("feed", "compose") },
    { label: "Give kudos", icon: Award, go: () => navigate("feed", "kudos") },
    { label: "Log social post", icon: Share2, go: () => navigate("social", "log") },
    { label: "Book a meeting", icon: CalendarPlus, go: () => navigate("meetings", "new") },
    { label: "Weekly report", icon: ClipboardList, go: () => navigate("reports") },
    { label: "Request leave", icon: Palmtree, go: () => navigate("leave") },
  ];

  return (
    <div>
      <section style={{ position: "relative", borderRadius: 20, overflow: "hidden", marginBottom: 20, border: `1px solid ${C.border}`, background: "#0A2540 url(/assets/developer-code-workstation.jpg) center 35% / cover no-repeat" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(6,8,16,0.95) 0%, rgba(10,37,64,0.85) 50%, rgba(6,8,16,0.55) 100%)" }} />
        <div style={{ position: "relative", padding: "28px 26px", display: "flex", gap: 22, justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>{new Date().toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</div>
            <h1 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, color: "#fff", margin: "8px 0 6px", letterSpacing: "-0.03em" }}>{greeting()}, {firstName(me.fullName)} 👋</h1>
            <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>{office.config.welcome}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Badge color={C.gold}>{me.role?.label || "Staff"}</Badge>
              {me.department && <Badge color={C.blue}>{me.department}</Badge>}
              {rankIdx >= 0 && <Badge color={C.mint}>#{rankIdx + 1} this month · {myPoints} pts</Badge>}
            </div>
          </div>
          <DayFlow onChanged={reload} />
        </div>
      </section>

      {!phoneReady && <PhoneCheck compact onReady={() => { try { localStorage.setItem("so_phone_ready", "1"); } catch { /* ignore */ } setTimeout(() => setPhoneReady(true), 1500); }} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        {quick.map(q => (
          <button key={q.label} type="button" onClick={q.go} className="so-card so-lift" style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", color: C.heading, fontFamily: font, fontSize: 13.5, fontWeight: 700, textAlign: "left" }}>
            <span style={{ background: C.goldDim, color: C.gold, borderRadius: 9, padding: 7, display: "flex" }}><q.icon size={16} aria-hidden="true" /></span>{q.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Open tasks" value={office.myOpenTasks} color={C.blue} icon={ListChecks} onClick={() => navigate("tasks")} />
        <StatCard label="Meetings today" value={office.todaysMeetings.length} color={C.purple} icon={Video} onClick={() => navigate("meetings")} />
        {(can("team.approve") || can("org.approve") || can("finance.approve")) && <StatCard label="Awaiting your approval" value={approvals} color={C.amber} icon={CheckCheck} onClick={() => navigate("approvals")} />}
        <StatCard label="My points this month" value={myPoints} sub={rankIdx >= 0 ? `Rank #${rankIdx + 1} in the company` : "Post, share and hit goals to earn points"} color={C.mint} icon={Trophy} onClick={() => navigate("social")} />
      </div>

      <div className="so-two">
        <div className="so-stack" style={{ gap: 16 }}>
          {anns.length > 0 && (
            <SectionCard style={{ borderColor: `${C.gold}66`, background: `linear-gradient(135deg, rgba(200,168,80,0.10), rgba(15,24,40,0.95))` }}>
              <SectionTitle sub="Sent to you by management. Mark each one as read once you've seen it.">📣 Announcements for you</SectionTitle>
              {anns.map(a => (
                <div key={a.id} style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}><strong style={{ color: C.gold }}>{person(a.authorId).fullName}</strong> · {timeAgo(a.createdAt)}</div>
                  <RichText text={a.text} directory={directory} onMention={openPerson} style={{ fontSize: 14, color: C.heading }} />
                  {a.imageDataUrl && <img src={a.imageDataUrl} alt="" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, marginTop: 8 }} />}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <Btn small variant="blue" onClick={async () => { try { await api("/api/staff/feed", { method: "POST", body: { action: "ack", id: a.id } }); setAnns(list => list.filter(x => x.id !== a.id)); toast("Marked as read"); } catch (e) { toast(e.message, "err"); } }}>✓ Mark as read</Btn>
                    <Btn small variant="ghost" onClick={() => openLink(`feed:${a.id}`)}>{a.visibility === "public" ? "Comment or share" : "Open & comment"}</Btn>
                  </div>
                </div>
              ))}
            </SectionCard>
          )}

          {pendingAck.length > 0 && (
            <SectionCard style={{ borderColor: `${C.amber}55` }}>
              <SectionTitle action={<Btn small onClick={() => navigate("handbook")}>Read now</Btn>}>📘 {pendingAck.length} polic{pendingAck.length === 1 ? "y needs" : "ies need"} your acknowledgement</SectionTitle>
              <div style={{ fontSize: 13, color: C.textMuted }}>{pendingAck.map(r => r.title).join(" · ")}</div>
            </SectionCard>
          )}

          <SectionCard>
            <SectionTitle action={<Btn small variant="ghost" onClick={() => navigate("meetings")}>All meetings</Btn>}>Today's agenda</SectionTitle>
            {office.todaysMeetings.length === 0 && <EmptyState>No meetings today. A good day for deep work.</EmptyState>}
            {office.todaysMeetings.map(m => (
              <div key={m.id} className="so-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, minWidth: 52 }}>{new Date(m.startsAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{m.durationMin} min · hosted by {person(m.hostId).fullName}</div>
                </div>
                {m.link && <a href={m.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small icon={Video}>Join</Btn></a>}
              </div>
            ))}
          </SectionCard>

          <SectionCard>
            <SectionTitle action={<Btn small variant="ghost" onClick={() => navigate("tasks")}>Task board</Btn>}>My tasks</SectionTitle>
            {tasks.length === 0 && <EmptyState>Nothing on your plate. Nice!</EmptyState>}
            {tasks.slice(0, 6).map(t => (
              <button key={t.id} type="button" onClick={() => navigate("tasks", t.id)} className="so-row" style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "9px 6px", border: "none", borderBottom: `1px solid ${C.border}`, background: "none", cursor: "pointer", textAlign: "left", fontFamily: font }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: { urgent: C.rose, high: C.amber, medium: C.blue, low: C.textMuted }[t.priority] || C.blue, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5, color: C.heading, fontWeight: 600 }}>{t.title}</span>
                {t.dueDate && <span style={{ fontSize: 12, color: t.dueDate < office.today ? C.rose : C.textMuted }}>{t.dueDate < office.today ? "Overdue · " : ""}{fmtDate(t.dueDate)}</span>}
              </button>
            ))}
          </SectionCard>

          <SectionCard>
            <SectionTitle action={<Btn small variant="ghost" onClick={() => navigate("feed")}>Open feed</Btn>}>Latest in the office</SectionTitle>
            {posts.length === 0 && <EmptyState>The feed is quiet. Be the first to post today!</EmptyState>}
            {posts.slice(0, 4).map(p => (
              <button key={p.id} type="button" onClick={() => openLink(`feed:${p.id}`)} className="so-row" style={{ display: "flex", width: "100%", gap: 10, padding: "10px 6px", border: "none", borderBottom: `1px solid ${C.border}`, background: "none", cursor: "pointer", textAlign: "left", fontFamily: font }}>
                <Avatar src={person(p.authorId).avatarDataUrl} name={person(p.authorId).fullName} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: C.textMuted }}><strong style={{ color: C.heading }}>{person(p.authorId).fullName}</strong> · {timeAgo(p.createdAt)} {p.pinned && <Badge color={C.gold}>Pinned</Badge>}</div>
                  <RichText text={(p.text || "").slice(0, 180) + ((p.text || "").length > 180 ? "…" : "")} directory={directory} style={{ fontSize: 13.5, color: C.text, marginTop: 2 }} />
                </div>
              </button>
            ))}
          </SectionCard>
        </div>

        <div className="so-stack" style={{ gap: 16 }}>
          <ReachManagement />

          <SectionCard>
            <SectionTitle action={<Btn small variant="ghost" icon={Users} onClick={() => navigate("people")}>Everyone</Btn>}>In the office now</SectionTitle>
            {inNow.length === 0 && <EmptyState>No one else is clocked in yet.</EmptyState>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {inNow.slice(0, 18).map(p => (
                <button key={p.id} type="button" title={`${p.fullName} · ${PRESENCE[p.presence.status]?.label}`} onClick={() => openPerson(p.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  <Avatar src={p.avatarDataUrl} name={p.fullName} size={38} presence={p.presence.status} />
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionTitle action={<Btn small variant="ghost" onClick={() => navigate("social")}>Details</Btn>}>🏆 Leaderboard · this month</SectionTitle>
            {office.leaderboard.length === 0 && <EmptyState>Post, give kudos and hit goals to get on the board.</EmptyState>}
            {office.leaderboard.slice(0, 5).map((b, i) => (
              <button key={b.id} type="button" onClick={() => openPerson(b.id)} className="so-row" style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "7px 4px", background: b.id === me.id ? C.goldDim : "none", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: font }}>
                <span style={{ width: 20, fontWeight: 800, color: i < 3 ? C.gold : C.textMuted, fontSize: 13 }}>{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                <Avatar src={person(b.id).avatarDataUrl} name={person(b.id).fullName} size={26} />
                <span style={{ flex: 1, textAlign: "left", fontSize: 13, color: C.heading, fontWeight: 600 }}>{person(b.id).fullName}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.mint }}>{b.points}</span>
              </button>
            ))}
          </SectionCard>

          {upcoming.length > 0 && (
            <SectionCard>
              <SectionTitle>Celebrations</SectionTitle>
              {upcoming.map(({ p, days }) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <Cake size={16} color={C.rose} aria-hidden="true" />
                  <span style={{ flex: 1, fontSize: 13, color: C.text }}><strong style={{ color: C.heading }}>{p.fullName}</strong>'s birthday</span>
                  <span style={{ fontSize: 12, color: days === 0 ? C.gold : C.textMuted, fontWeight: 700 }}>{days === 0 ? "Today 🎉" : days === 1 ? "Tomorrow" : `in ${days} days`}</span>
                </div>
              ))}
            </SectionCard>
          )}

          <SectionCard>
            <SectionTitle action={<Btn small variant="ghost" icon={BookOpen} onClick={() => navigate("handbook")}>Handbook</Btn>}>Quick links</SectionTitle>
            {office.config.quickLinks.map(l => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="so-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", textDecoration: "none", color: C.text, fontSize: 13.5, borderRadius: 8 }}>
                <Link2 size={14} color={C.gold} aria-hidden="true" /> {l.label}
              </a>
            ))}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
