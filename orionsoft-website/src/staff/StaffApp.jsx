import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import {
  Home, Newspaper, MessagesSquare, CalendarClock, ListChecks, Target, Share2, TrendingUp, Handshake,
  Users, CheckCheck, ClipboardList, Palmtree, Receipt, Wallet, Network, BookOpen, UserCircle, Bell,
  Menu, LogOut, Search, Building2, MapPin, Gauge,
} from "lucide-react";
import { C, font, PRESENCE } from "./theme.js";
import { api, timeAgo } from "./api.js";
import { Avatar, IconBtn, Toaster, toast } from "./components.jsx";
import { OfficeContext } from "./office.js";
import StaffLogin, { loadGoogleIdentity } from "./StaffLogin.jsx";
import PersonDrawer from "./modules/PersonDrawer.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./staff.css";

const Lobby = lazy(() => import("./modules/Lobby.jsx"));
const Feed = lazy(() => import("./modules/Feed.jsx"));
const Messages = lazy(() => import("./modules/Messages.jsx"));
const Meetings = lazy(() => import("./modules/Meetings.jsx"));
const Tasks = lazy(() => import("./modules/Tasks.jsx"));
const Goals = lazy(() => import("./modules/Goals.jsx"));
const Social = lazy(() => import("./modules/Social.jsx"));
const Pipeline = lazy(() => import("./modules/Pipeline.jsx"));
const Liaison = lazy(() => import("./modules/Liaison.jsx"));
const TeamDesk = lazy(() => import("./modules/TeamDesk.jsx"));
const Approvals = lazy(() => import("./modules/Approvals.jsx"));
const People = lazy(() => import("./modules/People.jsx"));
const Handbook = lazy(() => import("./modules/Handbook.jsx"));
const Expenses = lazy(() => import("./modules/Expenses.jsx"));
const Reports = lazy(() => import("./modules/Reports.jsx"));
const Leave = lazy(() => import("./modules/Leave.jsx"));
const Payslips = lazy(() => import("./modules/Payslips.jsx"));
const Profile = lazy(() => import("./modules/Profile.jsx"));
const FieldVisits = lazy(() => import("./modules/FieldVisits.jsx"));
const Performance = lazy(() => import("./modules/Performance.jsx"));

// Navigation, filtered by what the signed-in person's role allows.
function buildNav(can, counts) {
  const approver = can("team.approve") || can("org.approve") || can("finance.approve");
  const approvalsCount = (counts.approvals?.leave || 0) + (counts.approvals?.reports || 0) + (counts.approvals?.expenses || 0);
  return [
    { group: "WORKSPACE", items: [
      { id: "home", label: "Lobby", icon: Home },
      { id: "feed", label: "Office Feed", icon: Newspaper },
      { id: "messages", label: "Messages", icon: MessagesSquare, badge: counts.messages },
      { id: "meetings", label: "Meetings", icon: CalendarClock, badge: counts.meetingsToday },
      { id: "tasks", label: "Tasks", icon: ListChecks, badge: counts.tasks },
      { id: "goals", label: "Goals & Progress", icon: Target },
      { id: "social", label: "Social & Advocacy", icon: Share2 },
      { id: "visits", label: "Field Visits", icon: MapPin, badge: counts.spotChecks },
      { id: "performance", label: "Performance", icon: Gauge },
    ] },
    { group: "MY ROLE", items: [
      (can("pipeline") || can("pipeline.all")) && { id: "pipeline", label: "BD Pipeline", icon: TrendingUp },
      (can("liaison") || can("liaison.all")) && { id: "liaison", label: "Liaison Register", icon: Handshake },
      (can("team.view") || can("hr.records") || can("org.approve")) && { id: "team", label: can("hr.records") ? "HR Desk" : "Team Desk", icon: Users },
      approver && { id: "approvals", label: "Approvals", icon: CheckCheck, badge: approvalsCount },
    ].filter(Boolean) },
    { group: "HR & ME", items: [
      { id: "reports", label: "Weekly Reports", icon: ClipboardList },
      { id: "leave", label: "Leave", icon: Palmtree },
      { id: "expenses", label: "Expense Claims", icon: Receipt },
      { id: "payslips", label: "Payslips", icon: Wallet },
    ] },
    { group: "COMPANY", items: [
      { id: "people", label: "People & Org Chart", icon: Network },
      { id: "handbook", label: "Handbook & Links", icon: BookOpen },
      { id: "profile", label: "My Profile", icon: UserCircle },
    ] },
  ].filter(g => g.items.length);
}

function parseRoute() {
  const parts = window.location.pathname.replace(/^\/staff\/?/, "").split("/").filter(Boolean);
  return { module: parts[0] || "home", param: parts[1] ? decodeURIComponent(parts[1]) : null };
}

function PresencePicker({ me, onChange }) {
  const [open, setOpen] = useState(false);
  const current = PRESENCE[me.presence?.status] || PRESENCE.offline;
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} style={{ display: "flex", alignItems: "center", gap: 7, background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 999, padding: "6px 12px", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: current.color }} />
        <span className="so-hide-sm">{current.label}</span>
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", right: 0, top: 40, background: C.card, border: `1px solid ${C.borderStrong}`, borderRadius: 12, padding: 6, width: 200, zIndex: 50, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
          {Object.entries(PRESENCE).filter(([k]) => k !== "leave").map(([k, v]) => (
            <button key={k} role="menuitem" type="button" onClick={() => { setOpen(false); onChange(k); }} className="so-nav-item" style={{ fontSize: 13 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: v.color }} /> {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsPanel({ data, onOpen, onClose, onReadAll }) {
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => document.removeEventListener("click", onDoc);
  }, [onClose]);
  return (
    <div ref={ref} role="dialog" aria-label="Notifications" style={{ position: "absolute", right: 0, top: 46, width: "min(380px, calc(100vw - 24px))", maxHeight: "70vh", overflowY: "auto", background: C.card, border: `1px solid ${C.borderStrong}`, borderRadius: 14, zIndex: 60, boxShadow: "0 20px 50px rgba(0,0,0,0.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.card }}>
        <strong style={{ color: C.heading, fontSize: 14 }}>Notifications</strong>
        <button type="button" onClick={onReadAll} style={{ background: "none", border: "none", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: font }}>Mark all read</button>
      </div>
      {(data?.items || []).length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>You're all caught up.</div>}
      {(data?.items || []).map(n => (
        <button key={n.id} type="button" onClick={() => onOpen(n)} className="so-row" style={{ display: "block", width: "100%", textAlign: "left", background: n.read ? "none" : "rgba(79,142,247,0.06)", border: "none", borderBottom: `1px solid ${C.border}`, padding: "11px 14px", cursor: "pointer", fontFamily: font }}>
          <div style={{ fontSize: 13, fontWeight: n.read ? 600 : 800, color: C.heading, lineHeight: 1.4 }}>{n.title}</div>
          {n.body && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{n.body}</div>}
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{timeAgo(n.at)}</div>
        </button>
      ))}
    </div>
  );
}

function PeopleSearch({ directory, onPick }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = q.trim() ? directory.filter(p => `${p.fullName} ${p.title} ${p.department} ${p.roleLabel}`.toLowerCase().includes(q.toLowerCase())).slice(0, 7) : [];
  return (
    <div className="so-hide-sm" style={{ position: "relative", flex: 1, maxWidth: 360 }}>
      <Search size={15} color={C.textMuted} style={{ position: "absolute", left: 11, top: 10 }} aria-hidden="true" />
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Find a colleague…" aria-label="Find a colleague"
        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px 8px 32px", color: C.text, fontSize: 13, fontFamily: font, outline: "none" }} />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: 40, left: 0, right: 0, background: C.card, border: `1px solid ${C.borderStrong}`, borderRadius: 12, overflow: "hidden", zIndex: 60 }}>
          {results.map(p => (
            <button key={p.id} type="button" onMouseDown={() => { onPick(p.id); setQ(""); }} className="so-row" style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", textAlign: "left", fontFamily: font }}>
              <Avatar src={p.avatarDataUrl} name={p.fullName} size={28} presence={p.presence?.status} />
              <div><div style={{ fontSize: 13, fontWeight: 700, color: C.heading }}>{p.fullName}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{p.roleLabel} · {p.department || "—"}</div></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StaffApp() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loginNotice, setLoginNotice] = useState("");
  const [office, setOffice] = useState(null);
  const [route, setRoute] = useState(parseRoute);
  const [navOpen, setNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(null);
  const [msgUnread, setMsgUnread] = useState(0);
  const [personId, setPersonId] = useState(null);

  // Session check. Only a STAFF session opens the office. An admin who is
  // signed in elsewhere sees the staff sign-in instead of a blank screen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const j = await api("/api/auth/me");
        if (cancelled) return;
        if (j.user?.role === "staff" || (j.user?.role === "admin" && j.ownerOffice)) setSession(j.user);
        else if (j.user?.role === "admin") setLoginNotice("You're signed in as the website admin. To enter as the owner, open the admin dashboard, go to Employees and click 'Enter Staff Office as Owner'. Or sign in below with a staff account.");
      } catch { /* not signed in */ } finally { if (!cancelled) setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadOffice = useCallback(async () => {
    try {
      const j = await api("/api/staff/office");
      setOffice(j);
      setNotifs(j.notifications);
    } catch (e) {
      if (e.status === 401) { setSession(null); setOffice(null); }
    }
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const first = setTimeout(loadOffice, 0);
    const t = setInterval(loadOffice, 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [session, loadOffice]);

  // Unread messages badge.
  useEffect(() => {
    if (!session) return undefined;
    async function poll() { try { const j = await api("/api/staff/messages"); setMsgUnread(j.unreadTotal || 0); } catch { /* transient */ } }
    const first = setTimeout(poll, 500);
    const t = setInterval(poll, 20_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [session]);

  useEffect(() => {
    function onPop() { setRoute(parseRoute()); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((module, param = null) => {
    const path = `/staff${module === "home" ? "" : `/${module}`}${param ? `/${encodeURIComponent(param)}` : ""}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setRoute({ module, param });
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  // Notification links look like "feed:post_123", "tasks", "messages:dm--a--b".
  const openLink = useCallback((link) => {
    if (!link) return;
    const [module, param] = link.split(/:(.+)/);
    navigate(module, param || null);
  }, [navigate]);

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    try { (await loadGoogleIdentity())?.accounts?.id?.disableAutoSelect(); } catch { /* ignore */ }
    setSession(null); setOffice(null);
  }

  async function setPresence(status) {
    try {
      await api("/api/staff/office", { method: "PATCH", body: { presence: status } });
      toast(`Status: ${PRESENCE[status].label}`);
      loadOffice();
    } catch (e) { toast(e.message, "err"); }
  }

  async function readAll() {
    await api("/api/staff/office", { method: "POST", body: { action: "notifications-read" } }).catch(() => {});
    setNotifs(n => n ? { ...n, unread: 0, items: n.items.map(i => ({ ...i, read: true })) } : n);
  }

  const ctx = useMemo(() => {
    if (!office) return null;
    const perms = new Set(office.me.permissions || []);
    const byId = new Map(office.directory.map(p => [p.id, p]));
    return {
      office, me: office.me, directory: office.directory, roles: office.roles,
      can: p => perms.has(p),
      person: id => byId.get(id) || (id === "system" || id === "admin" ? { id, fullName: id === "admin" ? "Orion Soft Management" : "Orion Office Bot", title: "", avatarDataUrl: "" } : { id, fullName: "Former colleague", title: "" }),
      navigate, openLink, openPerson: setPersonId, reload: loadOffice,
    };
  }, [office, navigate, openLink, loadOffice]);

  if (checking) return <div className="so-root" />;
  if (!session) return <StaffLogin notice={loginNotice} onLogin={u => { setLoginNotice(""); setSession(u); }} />;
  if (!ctx) return <div className="so-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: font }}>Opening the office…</div>;

  const counts = { messages: msgUnread, tasks: office.myOpenTasks, meetingsToday: office.todaysMeetings.length, approvals: office.approvals, spotChecks: (office.pendingSpotChecks || []).length };
  const nav = buildNav(ctx.can, counts);
  const allowed = new Set(nav.flatMap(g => g.items.map(i => i.id)));
  const mod = allowed.has(route.module) ? route.module : "home";
  const me = office.me;

  const MODULES = { visits: FieldVisits, performance: Performance, home: Lobby, feed: Feed, messages: Messages, meetings: Meetings, tasks: Tasks, goals: Goals, social: Social, pipeline: Pipeline, liaison: Liaison, team: TeamDesk, approvals: Approvals, people: People, handbook: Handbook, expenses: Expenses, reports: Reports, leave: Leave, payslips: Payslips, profile: Profile };
  const Active = MODULES[mod];

  return (
    <OfficeContext.Provider value={ctx}>
      <div className="so-root" style={{ fontFamily: font }}>
        <div className="so-shell">
          <div className={`so-scrim ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)} />
          <nav className={`so-side ${navOpen ? "open" : ""}`} aria-label="Staff Office">
            <button type="button" onClick={() => navigate("home")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: "4px 8px 10px", fontFamily: font }}>
              <Building2 size={22} color={C.gold} aria-hidden="true" />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.heading }}>Orion<span style={{ color: C.gold }}>Soft</span></div>
                <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700, letterSpacing: "0.08em" }}>STAFF OFFICE</div>
              </div>
            </button>
            {nav.map(g => (
              <div key={g.group}>
                <div className="so-nav-group">{g.group}</div>
                {g.items.map(item => (
                  <button key={item.id} type="button" className="so-nav-item" aria-current={mod === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>
                    <item.icon size={17} aria-hidden="true" />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge ? <span style={{ background: item.id === "approvals" ? C.amber : C.rose, color: "#060810", borderRadius: 10, fontSize: 10.5, fontWeight: 800, padding: "1px 7px" }}>{item.badge}</span> : null}
                  </button>
                ))}
              </div>
            ))}
            <div style={{ marginTop: 20, padding: "12px 10px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>Signed in as</div>
              <div style={{ fontSize: 13, color: C.heading, fontWeight: 700 }}>{me.fullName}</div>
              <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, marginTop: 2 }}>{me.role?.label || "Staff"}</div>
              <button type="button" onClick={logout} className="so-nav-item" style={{ marginTop: 10, padding: "6px 0", color: C.rose }}><LogOut size={15} aria-hidden="true" /> Sign out</button>
            </div>
          </nav>

          <div className="so-main">
            <header className="so-top">
              <span className="so-menu-btn"><IconBtn icon={Menu} label="Open menu" onClick={() => setNavOpen(true)} /></span>
              <PeopleSearch directory={office.directory} onPick={setPersonId} />
              <div style={{ flex: 1 }} />
              <PresencePicker me={me} onChange={setPresence} />
              <div style={{ position: "relative" }}>
                <IconBtn icon={Bell} label="Notifications" badge={notifs?.unread || 0} onClick={() => setNotifOpen(o => !o)} />
                {notifOpen && <NotificationsPanel data={notifs} onClose={() => setNotifOpen(false)} onReadAll={readAll} onOpen={n => { setNotifOpen(false); openLink(n.link); }} />}
              </div>
              <Avatar src={me.avatarDataUrl} name={me.fullName} size={34} presence={me.presence?.status} onClick={() => navigate("profile")} />
            </header>
            <main className="so-content">
              {(office.pendingSpotChecks || []).length > 0 && mod !== "visits" && (
                <button type="button" onClick={() => navigate("visits")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: C.amberDim, border: `1px solid ${C.amber}88`, color: C.heading, borderRadius: 12, padding: "12px 16px", marginBottom: 16, cursor: "pointer", fontFamily: font, fontSize: 14, fontWeight: 700, textAlign: "left" }}>
                  <MapPin size={18} color={C.amber} /> Location check requested. Tap here to confirm where you are before the timer runs out.
                </button>
              )}
              <Suspense fallback={<div style={{ color: C.textMuted, padding: 30 }}>Loading…</div>}>
                <ErrorBoundary resetKey={mod}><Active key={mod} param={route.param} /></ErrorBoundary>
              </Suspense>
            </main>
          </div>
        </div>
        {personId && <PersonDrawer id={personId} onClose={() => setPersonId(null)} />}
        <Toaster />
      </div>
    </OfficeContext.Provider>
  );
}
