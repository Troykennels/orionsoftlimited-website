import { useState, useEffect, useRef, useCallback } from "react";

// ─── Design tokens (self-contained) ──────────────────────────────────────────
const C = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828", cardHover: "#141E30",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(200,168,80,0.35)",
  white: "#FFFFFF", heading: "#F2F6FF", text: "#C8D0E0", textMuted: "#6B7A96",
  gold: "#C8A850", goldLight: "#E8C96A", goldDim: "rgba(200,168,80,0.12)", goldGlow: "rgba(200,168,80,0.22)",
  blue: "#4F8EF7", blueDim: "rgba(79,142,247,0.12)",
  mint: "#10B981", mintDim: "rgba(16,185,129,0.12)",
  purple: "#8B5CF6", purpleDim: "rgba(139,92,246,0.12)",
  amber: "#F59E0B", amberDim: "rgba(245,158,11,0.12)",
  rose: "#F43F5E", roseDim: "rgba(244,63,94,0.12)",
  cyan: "#06B6D4", cyanDim: "rgba(6,182,212,0.12)",
  success: "#10B981", danger: "#F43F5E",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, -apple-system, sans-serif";

// ─── Storage keys ────────────────────────────────────────────────────────────
const SK = {
  settings:     "orionsoft_settings_v1",
  homepage:     "orionsoft_homepage_v1",
  testimonials: "orionsoft_testimonials_v1",
  faqs:         "orionsoft_faqs_v1",
  blog:         "orionsoft_blog_v1",
  careers:      "orionsoft_careers_v1",
  clients:      "orionsoft_clients_v1",
  menus:        "orionsoft_menus_v1",
  team:         "orionsoft_team_v1",
  seo:          "orionsoft_seo_v1",
  announcements:"orionsoft_announce_v1",
  products:     "orionsoft_products_v1",
  portfolio:    "orionsoft_portfolio_v1",
  leads:        "orionsoft_leads_v1",
  analytics:    "orionsoft_analytics_v1",
  heartbeat:    "orionsoft_heartbeat_v1",
  audit:        "orionsoft_audit_v1",
  features:     "orionsoft_features_v1",
  newsletter:   "orionsoft_newsletter_v1",
  users:        "orionsoft_users_v1",
  media:        "orionsoft_media_v1",
  session:      "orionsoft_admin_session_v1",
  lockout:      "orionsoft_admin_lockout_v1",
  conversations:"orionsoft_conversations_v1",
};

// ─── Security Layer ──────────────────────────────────────────────────────────
async function hashStr(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

function getSession() {
  try {
    const raw = localStorage.getItem(SK.session);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() > s.expiresAt) { localStorage.removeItem(SK.session); return null; }
    return s;
  } catch { return null; }
}

function createSession(username, role = "superadmin") {
  const s = { id: Math.random().toString(36).slice(2), username, role, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL };
  localStorage.setItem(SK.session, JSON.stringify(s));
  return s;
}

function destroySession() { localStorage.removeItem(SK.session); }

function getLockout() {
  try { const r = localStorage.getItem(SK.lockout); return r ? JSON.parse(r) : null; } catch { return null; }
}

function setLockout(attempts) {
  localStorage.setItem(SK.lockout, JSON.stringify({ attempts, lastAt: Date.now() }));
}

function clearLockout() { localStorage.removeItem(SK.lockout); }

function isLockedOut() {
  const l = getLockout();
  if (!l || l.attempts < MAX_ATTEMPTS) return false;
  if (Date.now() - l.lastAt > LOCKOUT_MS) { clearLockout(); return false; }
  return true;
}

function remainingLockout() {
  const l = getLockout();
  if (!l) return 0;
  return Math.max(0, Math.ceil((LOCKOUT_MS - (Date.now() - l.lastAt)) / 60000));
}

// ─── Audit Logger ────────────────────────────────────────────────────────────
function auditLog(action, target, details = "") {
  try {
    const s = getSession();
    const entry = { id: Date.now() + Math.random(), ts: new Date().toISOString(), user: s?.username || "system", role: s?.role || "", action, target, details };
    const raw = localStorage.getItem(SK.audit);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift(entry);
    if (logs.length > 500) logs.length = 500;
    localStorage.setItem(SK.audit, JSON.stringify(logs));
  } catch { /* ignore audit failures */ }
}

// ─── Storage helpers ─────────────────────────────────────────────────────────
function lsSet(key, val, auditAction = "", auditTarget = "") {
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new Event("localstoreupdate"));
  if (auditAction) auditLog(auditAction, auditTarget || key);
}

function lsGet(key, fallback = null) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}

function uid() { return `i-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// Server sync — fetches live data from Upstash via /api/admin/data
// Merges server records into localStorage so admin sees ALL visitors' data
const ADMIN_KEY = import.meta.env.VITE_ADMIN_PASSWORD || "orionsoft2026";

async function fetchServerData(resource = "all") {
  try {
    const r = await fetch(`/api/admin/data?resource=${resource}`, {
      headers: { "x-admin-key": ADMIN_KEY },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function mergeById(serverArr = [], localArr = []) {
  const map = new Map();
  // Local first (has status updates, edits)
  localArr.forEach(item => { if (item.id || item.ref) map.set(item.id || item.ref, item); });
  // Server fills in items not in local (from other devices)
  serverArr.forEach(item => {
    const key = item.id || item.ref;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values()).sort((a, b) =>
    new Date(b.submittedAt || b.startedAt || 0) - new Date(a.submittedAt || a.startedAt || 0)
  );
}

// ─── Shared UI components ────────────────────────────────────────────────────
function Btn({ children, onClick, type = "button", variant = "primary", small = false, danger = false, disabled = false }) {
  const bg = danger ? C.roseDim : variant === "primary" ? C.gold : variant === "ghost" ? "transparent" : C.card;
  const color = danger ? C.rose : variant === "primary" ? "#060810" : C.text;
  const border = danger ? `1px solid ${C.rose}44` : variant === "ghost" ? `1px solid ${C.border}` : "none";
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: bg, color, border, borderRadius: 8,
      padding: small ? "7px 14px" : "10px 20px",
      fontSize: small ? 13 : 14, fontWeight: 600, fontFamily: font, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, transition: "all 0.2s",
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
      {children}
    </button>
  );
}

function Badge({ children, color = C.gold }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, padding: "3px 8px", borderRadius: 6, fontFamily: font, letterSpacing: "0.05em" }}>{children}</span>;
}

function SectionCard({ children, style = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px", marginBottom: 20, ...style }}>{children}</div>;
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 20, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{children}</h2>;
}

function Label({ children }) {
  return <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.textMuted, fontFamily: font, marginBottom: 6, letterSpacing: "0.04em" }}>{children}</label>;
}

function Input({ value, onChange, placeholder = "", type = "text", style = {} }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box", ...style }}
      onFocus={e => e.target.style.borderColor = C.gold}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  );
}

function Textarea({ value, onChange, placeholder = "", rows = 4, style = {} }) {
  return (
    <textarea
      value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontFamily: font, outline: "none", resize: "vertical", boxSizing: "border-box", ...style }}
      onFocus={e => e.target.style.borderColor = C.gold}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  );
}

function Select({ value, onChange, children, style = {} }) {
  return (
    <select
      value={value} onChange={onChange}
      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box", ...style }}
      onFocus={e => e.target.style.borderColor = C.gold}
      onBlur={e => e.target.style.borderColor = C.border}
    >
      {children}
    </select>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <div onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11, position: "relative", cursor: "pointer",
        background: value ? C.gold : C.surface, border: `1px solid ${value ? C.gold : C.border}`, transition: "all 0.2s",
      }}>
        <div style={{ position: "absolute", top: 2, left: value ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: value ? "#060810" : C.textMuted, transition: "left 0.2s" }} />
      </div>
      {label && <span style={{ fontSize: 14, color: C.text, fontFamily: font }}>{label}</span>}
    </label>
  );
}

function StatCard({ label, value, sub, color = C.gold, icon }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: C.textMuted, fontFamily: font, fontWeight: 500 }}>{label}</span>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: font, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, message }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm" width={380}>
      <p style={{ color: C.text, marginBottom: 22 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" small onClick={() => { onConfirm(); onClose(); }}>Delete</Btn>
      </div>
    </Modal>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
      <h2 style={{ color: C.heading, fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

function Table({ cols, rows, emptyMsg = "No items yet." }) {
  if (!rows.length) return <div style={{ color: C.textMuted, textAlign: "center", padding: "40px 0", fontSize: 14 }}>{emptyMsg}</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{ color: C.textMuted, fontSize: 12, fontWeight: 700, textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}33` }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding: "11px 12px", color: C.text, fontSize: 14, verticalAlign: "middle" }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sidebar nav structure ───────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "OVERVIEW",
    items: [
      { id: "dashboard",    label: "Dashboard",        icon: "📊" },
      { id: "analytics",    label: "Analytics",        icon: "📈" },
      { id: "live",         label: "Live Visitors",    icon: "🟢" },
    ],
  },
  {
    label: "COMMUNICATIONS",
    items: [
      { id: "leads",        label: "Contact Forms",    icon: "📬" },
      { id: "newsletter",   label: "Newsletter",       icon: "📰" },
      { id: "chat",         label: "AI Conversations", icon: "🤖" },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { id: "homepage",     label: "Homepage",         icon: "🏠" },
      { id: "announcements",label: "Announcements",    icon: "📢" },
      { id: "products",     label: "Products",         icon: "📦" },
      { id: "blog",         label: "Blog",             icon: "📝" },
      { id: "portfolio",    label: "Case Studies",     icon: "💼" },
      { id: "testimonials", label: "Testimonials",     icon: "⭐" },
      { id: "faqs",         label: "FAQs",             icon: "❓" },
      { id: "team",         label: "Team",             icon: "👥" },
      { id: "careers",      label: "Careers",          icon: "🎯" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { id: "seo",          label: "SEO",              icon: "🔍" },
      { id: "features",     label: "Feature Flags",    icon: "🚩" },
      { id: "clients",      label: "Clients",          icon: "🏢" },
      { id: "menus",        label: "Navigation",       icon: "🔗" },
      { id: "settings",     label: "Site Settings",    icon: "⚙️" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "users",        label: "Users & Roles",    icon: "👤" },
      { id: "audit",        label: "Audit Logs",       icon: "📋" },
      { id: "media",        label: "Media Library",    icon: "🖼️" },
      { id: "backups",      label: "Backups",          icon: "💾" },
    ],
  },
];

// ─── Login Screen ────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const locked = isLockedOut();
  const minsLeft = remainingLockout();

  async function handleSubmit(e) {
    e.preventDefault();
    if (locked) return;
    setLoading(true);
    setErr("");

    const envPw = import.meta.env.VITE_ADMIN_PASSWORD || "orionsoft2026";
    let match = pw === envPw;

    // Also accept additional users created in localStorage
    if (!match) {
      const users = lsGet(SK.users, []);
      if (users.length) {
        const hash = await hashStr(pw);
        const u = users.find(x => x.active !== false && x.hash === hash);
        if (u) {
          clearLockout();
          const session = createSession(u.username, u.role || "editor");
          auditLog("login", "admin", `Successful login (${u.username})`);
          onLogin(session);
          setLoading(false);
          return;
        }
      }
    }

    if (match) {
      clearLockout();
      const session = createSession("admin", "superadmin");
      auditLog("login", "admin", "Successful login");
      onLogin(session);
    } else {
      const l = getLockout() || { attempts: 0, lastAt: Date.now() };
      l.attempts++;
      l.lastAt = Date.now();
      setLockout(l.attempts);
      const remaining = MAX_ATTEMPTS - l.attempts;
      setErr(remaining <= 0 ? `Too many attempts. Locked for ${LOCKOUT_MS / 60000} minutes.` : `Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: font }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(200,168,80,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>
      <form onSubmit={handleSubmit} style={{ position: "relative", width: "100%", maxWidth: 400, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 28, marginBottom: 14 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.heading, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Admin Portal</h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>Orion Soft Limited — Restricted Access</p>
        </div>

        {locked ? (
          <div style={{ background: C.roseDim, border: `1px solid ${C.rose}44`, borderRadius: 10, padding: "14px 18px", color: C.rose, fontSize: 14, textAlign: "center" }}>
            Account locked. Try again in {minsLeft} minute{minsLeft === 1 ? "" : "s"}.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <Label>Password</Label>
              <input
                type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter admin password"
                autoFocus autoComplete="current-password"
                style={{ width: "100%", background: C.surface, border: `1px solid ${err ? C.rose : C.border}`, color: C.text, borderRadius: 10, padding: "13px 16px", fontSize: 15, fontFamily: font, outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = err ? C.rose : C.border}
              />
            </div>
            {err && <div style={{ fontSize: 13, color: C.rose, marginBottom: 16, lineHeight: 1.5 }}>{err}</div>}
            <button type="submit" disabled={loading || !pw} style={{
              width: "100%", padding: "13px", background: C.gold, color: "#060810", border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 700, fontFamily: font, cursor: loading || !pw ? "not-allowed" : "pointer",
              opacity: loading || !pw ? 0.6 : 1, transition: "opacity 0.2s",
            }}>
              {loading ? "Verifying…" : "Sign In →"}
            </button>
          </>
        )}
        <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
          This portal is for authorised Orion Soft administrators only.<br />Unauthorised access attempts are logged.
        </p>
      </form>
    </div>
  );
}

// ─── Dashboard Overview ──────────────────────────────────────────────────────
function DashboardOverview() {
  const analytics = lsGet(SK.analytics, {});
  const leads = lsGet(SK.leads, []);
  const blog = lsGet(SK.blog, []);
  const team = lsGet(SK.team, []);
  const newsletter = lsGet(SK.newsletter, []);
  const audit = lsGet(SK.audit, []);

  const totalViews = Object.values(analytics.totals || {}).reduce((a, b) => a + b, 0);
  const today = new Date().toISOString().split("T")[0];
  const todayViews = Object.values(analytics.daily?.[today] || {}).reduce((a, b) => a + b, 0);
  const unreadLeads = leads.filter(l => !l.read && l.status !== undefined ? !l.read : (l.status === "New")).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Page Views"   value={totalViews.toLocaleString()}  sub="All time"              color={C.gold}   icon="📊" />
        <StatCard label="Views Today"        value={todayViews.toLocaleString()}  sub={today}                 color={C.blue}   icon="📈" />
        <StatCard label="Unread Leads"       value={unreadLeads}                  sub={`of ${leads.length}`} color={C.rose}   icon="📬" />
        <StatCard label="Blog Posts"         value={(blog.filter(b => b.published)).length} sub="Published"  color={C.mint}   icon="📝" />
        <StatCard label="Newsletter Subs"    value={newsletter.length}            sub="Total subscribers"     color={C.purple} icon="📰" />
        <StatCard label="Team Members"       value={team.filter(t => t.published !== false).length} sub="Active" color={C.cyan} icon="👥" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SectionCard>
          <SectionTitle>Recent Activity</SectionTitle>
          <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginBottom: 16 }}>Last admin actions</p>
          {audit.slice(0, 8).map((entry, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font, whiteSpace: "nowrap", marginTop: 1 }}>
                {new Date(entry.ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <div>
                <span style={{ fontSize: 13.5, color: C.text, fontFamily: font }}>
                  <strong style={{ color: C.gold }}>{entry.user}</strong> {entry.action}
                  {entry.target && entry.target !== "admin" && <> · <span style={{ color: C.textMuted }}>{entry.target}</span></>}
                </span>
                {entry.details && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{entry.details}</div>}
              </div>
            </div>
          ))}
          {audit.length === 0 && <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>No activity yet.</p>}
        </SectionCard>

        <SectionCard>
          <SectionTitle>Quick Links</SectionTitle>
          <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginBottom: 16 }}>Common tasks</p>
          {[
            { label: "Write a blog post",         icon: "📝", section: "blog" },
            { label: "Add a testimonial",          icon: "⭐", section: "testimonials" },
            { label: "Update homepage hero",       icon: "🏠", section: "homepage" },
            { label: "View contact form leads",    icon: "📬", section: "leads" },
            { label: "Manage products",            icon: "📦", section: "products" },
            { label: "Check newsletter list",      icon: "📰", section: "newsletter" },
            { label: "SEO settings",               icon: "🔍", section: "seo" },
            { label: "Feature flags",              icon: "🚩", section: "features" },
          ].map(q => (
            <div key={q.section} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15 }}>{q.icon}</span>
              <span style={{ fontSize: 14, color: C.text, fontFamily: font }}>{q.label}</span>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Analytics ───────────────────────────────────────────────────────────────
function AnalyticsSection() {
  const analytics = lsGet(SK.analytics, {});
  const daily = analytics.daily || {};
  const totals = analytics.totals || {};

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });

  const chartData = last14.map(date => ({
    date,
    views: Object.values(daily[date] || {}).reduce((a, b) => a + b, 0),
    label: new Date(date).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
  }));

  const maxViews = Math.max(...chartData.map(d => d.views), 1);
  const totalViews = Object.values(totals).reduce((a, b) => a + b, 0);

  const topPages = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([page, views]) => ({ page, views }));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Views"   value={totalViews.toLocaleString()} color={C.gold}   icon="👁️" />
        <StatCard label="Pages Tracked" value={Object.keys(totals).length}  color={C.blue}   icon="📄" />
        <StatCard label="Today"         value={Object.values(daily[new Date().toISOString().split("T")[0]] || {}).reduce((a, b) => a + b, 0)} color={C.mint} icon="📅" />
      </div>

      <SectionCard>
        <SectionTitle>Page Views — Last 14 Days</SectionTitle>
        <div style={{ marginTop: 20, height: 180, display: "flex", alignItems: "flex-end", gap: 4 }}>
          {chartData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }} title={`${d.date}: ${d.views} views`}>
              <span style={{ fontSize: 10, color: C.textMuted, fontFamily: font }}>{d.views > 0 ? d.views : ""}</span>
              <div style={{
                width: "100%", background: d.views > 0 ? C.gold : C.border,
                borderRadius: "4px 4px 0 0",
                height: `${Math.max((d.views / maxViews) * 120, d.views > 0 ? 4 : 2)}px`,
                transition: "height 0.3s", opacity: d.views > 0 ? 1 : 0.3,
              }} />
              <span style={{ fontSize: 9, color: C.textMuted, fontFamily: font, textAlign: "center", width: "100%", overflow: "hidden", whiteSpace: "nowrap" }}>{d.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard style={{ marginTop: 20 }}>
        <SectionTitle>Top Pages</SectionTitle>
        {topPages.length === 0 && <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font, marginTop: 12 }}>No data yet. Page views are tracked as visitors navigate the site.</p>}
        {topPages.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.textMuted, fontFamily: font, width: 20, textAlign: "right" }}>#{i + 1}</span>
            <span style={{ flex: 1, fontSize: 14, color: C.text, fontFamily: font, fontWeight: 500 }}>/{p.page}</span>
            <div style={{ width: 120, height: 6, background: C.surface, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(p.views / topPages[0].views) * 100}%`, background: C.gold, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 13, color: C.gold, fontFamily: font, fontWeight: 700, width: 50, textAlign: "right" }}>{p.views}</span>
          </div>
        ))}
      </SectionCard>

      <SectionCard style={{ marginTop: 20, background: C.goldDim, border: `1px solid ${C.gold}33` }}>
        <p style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: C.gold }}>Note:</strong> Analytics are tracked locally in the browser. Each visitor's page views accumulate per browser session. For cross-visitor analytics, integrate Google Analytics 4 by setting <code style={{ background: C.surface, padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>VITE_GA_MEASUREMENT_ID</code> in your Vercel environment variables.
        </p>
      </SectionCard>
    </div>
  );
}

// ─── Live Visitors ───────────────────────────────────────────────────────────
function LiveVisitorsSection() {
  const [hb, setHb] = useState(() => lsGet(SK.heartbeat, null));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      setHb(lsGet(SK.heartbeat, null));
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const isActive = hb && (now - hb.ts < 90000); // 90 seconds = active
  const secondsAgo = hb ? Math.round((now - hb.ts) / 1000) : null;

  return (
    <div>
      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: isActive ? C.success : C.textMuted, boxShadow: isActive ? `0 0 12px ${C.success}` : "none", animation: isActive ? "pulse 2s infinite" : "none" }} />
          <SectionTitle>{isActive ? "Live — Active visitor" : "No active visitors"}</SectionTitle>
        </div>

        {hb ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div style={{ background: C.surface, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>CURRENT PAGE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.heading, fontFamily: font }}>/{hb.page || "home"}</div>
            </div>
            <div style={{ background: C.surface, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>LAST SEEN</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isActive ? C.success : C.textMuted, fontFamily: font }}>
                {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.round(secondsAgo / 60)}m ago`}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>No heartbeat data yet. Visitors will appear here as they navigate the website.</p>
        )}

        <div style={{ marginTop: 20, background: C.goldDim, border: `1px solid ${C.gold}33`, borderRadius: 10, padding: "14px 18px" }}>
          <p style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: C.gold }}>How this works:</strong> The website sends a heartbeat every 20 seconds while a tab is open. Live Visitors shows whether the current browser session (your own or a shared device) is active. For multi-visitor real-time tracking, integrate a backend service or Tawk.to's visitor monitoring API.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Leads (Contact Forms) ───────────────────────────────────────────────────
const LEAD_TYPE_META = {
  demo:        { label: "Demo Booking",   color: C.gold,   icon: "🎯" },
  contact:     { label: "General Contact",color: C.accent, icon: "✉️"  },
  quote:       { label: "Quote Request",  color: C.mint,   icon: "💰" },
  support:     { label: "Support Ticket", color: C.purple, icon: "🛠️" },
  partnership: { label: "Partnership",    color: C.amber,  icon: "🤝" },
  career:      { label: "Career",         color: C.rose,   icon: "🚀" },
  newsletter:  { label: "Newsletter",     color: C.cyan,   icon: "📬" },
};

const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "closed"];
const STATUS_COLORS = { new: C.rose, contacted: C.amber, qualified: C.blue, converted: C.mint, closed: C.textMuted };

function LeadsSection() {
  const [leads, setLeads] = useState(() => lsGet(SK.leads, []));
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const reload = useCallback(() => setLeads(lsGet(SK.leads, [])), []);
  useEffect(() => { window.addEventListener("localstoreupdate", reload); return () => window.removeEventListener("localstoreupdate", reload); }, [reload]);

  const syncFromServer = useCallback(async () => {
    setSyncing(true);
    const data = await fetchServerData("leads");
    setSyncing(false);
    if (data?.leads?.length) {
      const merged = mergeById(data.leads, lsGet(SK.leads, []));
      setLeads(merged);
      lsSet(SK.leads, merged);
      setLastSync(new Date().toLocaleTimeString("en-NG"));
    }
  }, []);

  // Auto-sync on mount
  useEffect(() => { syncFromServer(); }, [syncFromServer]);

  const norm = (l) => ({
    ...l,
    name: l.name || l.contactName || "Anonymous",
    email: l.email || "",
    phone: l.phone || "",
    company: l.company || l.hospitalName || "",
    message: l.message || l.description || l.projectDesc || "",
    status: l.status || "new",
    type: l.type || "contact",
    ref: l.ref || l.id?.slice(0, 12) || "—",
    submittedAt: l.submittedAt || l.createdAt || "",
    read: l.read !== undefined ? l.read : (l.status && l.status !== "new" && l.status !== "New"),
  });

  const all = leads.map(norm);
  const typeCounts = LEAD_STATUSES.reduce((a, s) => ({ ...a, [s]: all.filter(l => l.status === s).length }), {});
  const newCount = all.filter(l => !l.read || l.status === "new").length;

  let filtered = all;
  if (typeFilter !== "all") filtered = filtered.filter(l => l.type === typeFilter);
  if (statusFilter !== "all") filtered = filtered.filter(l => l.status === statusFilter);

  function markRead(id) {
    const updated = leads.map(l => l.id === id ? { ...l, read: true } : l);
    setLeads(updated); lsSet(SK.leads, updated);
  }

  function updateStatus(id, status) {
    const updated = leads.map(l => l.id === id ? { ...l, status, read: true, updatedAt: new Date().toISOString() } : l);
    setLeads(updated); lsSet(SK.leads, updated);
    auditLog("update_status", "lead", `Lead ${id} → ${status}`);
    if (selected?.id === id) setSelected(prev => norm(updated.find(l => l.id === id) || prev));
  }

  function deleteLead(id) {
    if (!confirm("Delete this submission?")) return;
    const updated = leads.filter(l => l.id !== id);
    setLeads(updated); lsSet(SK.leads, updated);
    auditLog("delete", "lead", `Lead ID ${id}`);
    if (selected?.id === id) setSelected(null);
  }

  function exportCSV() {
    const headers = ["Ref", "Type", "Status", "Name", "Email", "Phone", "Company", "Product/Role", "Priority", "Message", "Date"];
    const rows = all.map(l => [
      l.ref, l.type, l.status, l.name, l.email, l.phone || "", l.company || "",
      l.product || l.role || l.interestedService || "", l.priority || "",
      (l.message || "").replace(/"/g, "'"), l.submittedAt ? new Date(l.submittedAt).toLocaleDateString("en-NG") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    auditLog("export", "leads", `Exported ${all.length} leads`);
  }

  return (
    <div>
      {/* Header + sync */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.heading, fontFamily: font }}>Leads</span>
          {lastSync && <span style={{ fontSize: 11, color: C.mint, fontFamily: font, marginLeft: 10 }}>✓ Synced {lastSync}</span>}
        </div>
        <button type="button" onClick={syncFromServer} disabled={syncing} style={{
          background: C.card, border: `1px solid ${C.border}`, color: syncing ? C.textMuted : C.gold,
          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: font, cursor: syncing ? "wait" : "pointer",
        }}>{syncing ? "⟳ Syncing…" : "⟳ Sync from server"}</button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="Total Leads" value={all.length} color={C.accent} icon="📋" />
        <StatCard label="New / Unread" value={newCount} color={C.rose} icon="🔔" />
        <StatCard label="Converted" value={typeCounts.converted || 0} color={C.mint} icon="✅" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {[["all", "All Types"], ...Object.entries(LEAD_TYPE_META).map(([id, m]) => [id, m.icon + " " + m.label.split(" ")[0]])].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTypeFilter(id)} style={{
            padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: font, cursor: "pointer", border: "none",
            background: typeFilter === id ? C.gold : C.card, color: typeFilter === id ? "#060810" : C.textMuted,
          }}>{label}{id !== "all" ? ` (${all.filter(l => l.type === id).length})` : ""}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {["all", ...LEAD_STATUSES].map(s => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)} style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: font, cursor: "pointer", border: "none",
            background: statusFilter === s ? (STATUS_COLORS[s] || C.accent) : C.surface,
            color: statusFilter === s ? (s === "new" ? "#fff" : "#05070A") : C.textMuted,
          }}>{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
        <div style={{ marginLeft: "auto" }}><Btn variant="ghost" small onClick={exportCSV}>Export CSV</Btn></div>
      </div>

      {/* List + Detail */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20 }}>
        <div>
          {filtered.length === 0 && <SectionCard><p style={{ color: C.textMuted, fontSize: 14, fontFamily: font }}>No submissions match the current filters.</p></SectionCard>}
          {filtered.map((lead, i) => {
            const meta = LEAD_TYPE_META[lead.type] || LEAD_TYPE_META.contact;
            const isSelected = selected?.id === lead.id;
            return (
              <div key={lead.id || i} onClick={() => { setSelected(lead); markRead(lead.id); }}
                style={{ background: isSelected ? C.goldDim : C.card, border: `1px solid ${isSelected ? C.gold + "44" : C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all 0.18s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.heading, fontFamily: font }}>{lead.name}</span>
                    {(!lead.read || lead.status === "new") && <Badge color={C.rose}>New</Badge>}
                    <span style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30`, borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700, fontFamily: font }}>{meta.icon} {meta.label}</span>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); deleteLead(lead.id); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font }}>{lead.email}{lead.company ? ` · ${lead.company}` : ""}</div>
                {(lead.product || lead.role || lead.interestedService) && <div style={{ fontSize: 12, color: C.text, fontFamily: font, marginTop: 3 }}>{lead.product || lead.role || lead.interestedService}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                  <span style={{ background: `${STATUS_COLORS[lead.status] || C.textMuted}18`, color: STATUS_COLORS[lead.status] || C.textMuted, borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700, fontFamily: font }}>
                    {lead.status}
                  </span>
                  <span style={{ fontSize: 11, color: C.textMuted, fontFamily: font }}>
                    {lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (() => {
          const meta = LEAD_TYPE_META[selected.type] || LEAD_TYPE_META.contact;
          const detail = [
            ["Ref", selected.ref], ["Email", selected.email], ["Phone", selected.phone],
            ["Company", selected.company], ["Product / Interest", selected.product || selected.interestedService],
            ["Role Applied", selected.role], ["Partnership Type", selected.partnerType],
            ["Issue Type", selected.issueType], ["Priority", selected.priority],
            ["Preferred Date", selected.preferredDate], ["Preferred Time", selected.preferredTime],
            ["Organisation Size", selected.orgSize], ["Budget", selected.budget],
            ["CV Link", selected.cvLink], ["Website", selected.website || selected.cvLink],
            ["Topics", Array.isArray(selected.topics) ? selected.topics.join(", ") : selected.topics],
            ["Date", selected.submittedAt ? new Date(selected.submittedAt).toLocaleString("en-NG") : ""],
          ].filter(([, v]) => v);
          return (
            <SectionCard style={{ position: "sticky", top: 20, maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
                    <span style={{ color: meta.color, fontFamily: font, fontSize: 12, fontWeight: 800 }}>{meta.label.toUpperCase()}</span>
                  </div>
                  <h3 style={{ color: C.heading, fontFamily: font, fontSize: 18, fontWeight: 700, margin: 0 }}>{selected.name}</h3>
                </div>
                <button type="button" onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 20 }}>×</button>
              </div>

              {/* Status changer */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.08em", marginBottom: 8 }}>STATUS</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {LEAD_STATUSES.map(s => (
                    <button key={s} type="button" onClick={() => updateStatus(selected.id, s)} style={{ padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: font, cursor: "pointer", border: "none", background: selected.status === s ? (STATUS_COLORS[s] || C.accent) : C.surface, color: selected.status === s ? (s === "new" ? "#fff" : "#05070A") : C.textMuted }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              {detail.map(([k, v]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.06em", marginBottom: 3 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize: 13, color: C.text, fontFamily: font, wordBreak: "break-word" }}>{v}</div>
                </div>
              ))}

              {/* Message */}
              {selected.message && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.06em", marginBottom: 6 }}>MESSAGE</div>
                  <div style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.7, background: C.surface, borderRadius: 10, padding: "12px 14px", whiteSpace: "pre-wrap" }}>{selected.message}</div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`mailto:${selected.email}?subject=Re: ${selected.type === "demo" ? "Demo Request" : selected.type === "quote" ? "Quote Request" : selected.type === "support" ? "Support Ticket" : "Your Enquiry"}`}
                  style={{ flex: 1, display: "block", minWidth: 120, padding: "11px", background: C.gold, color: "#060810", borderRadius: 10, textAlign: "center", textDecoration: "none", fontSize: 13, fontWeight: 700, fontFamily: font }}>
                  Reply by Email →
                </a>
                {selected.phone && (
                  <a href={`https://wa.me/234${selected.phone.replace(/^0/, "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${selected.name}, this is Orion Soft following up on your ${selected.type} submission. `)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ padding: "11px 16px", background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.25)", color: "#25D366", borderRadius: 10, textDecoration: "none", fontSize: 13, fontWeight: 700, fontFamily: font }}>
                    WhatsApp
                  </a>
                )}
                <button type="button" onClick={() => deleteLead(selected.id)} style={{ padding: "11px 14px", background: C.roseDim, border: `1px solid ${C.rose}44`, color: C.rose, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>Delete</button>
              </div>
            </SectionCard>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Newsletter ──────────────────────────────────────────────────────────────
function NewsletterSection() {
  const [subs, setSubs] = useState(() => lsGet(SK.newsletter, []));
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const reload = useCallback(() => setSubs(lsGet(SK.newsletter, [])), []);
  useEffect(() => { window.addEventListener("localstoreupdate", reload); return () => window.removeEventListener("localstoreupdate", reload); }, [reload]);

  function addSub() {
    if (!email || !email.includes("@")) { setMsg("Enter a valid email."); return; }
    if (subs.find(s => s.email === email)) { setMsg("Already subscribed."); return; }
    const updated = [...subs, { id: Date.now(), email, source: "admin", subscribedAt: new Date().toISOString(), active: true }];
    setSubs(updated);
    lsSet(SK.newsletter, updated);
    auditLog("add_subscriber", "newsletter", email);
    setEmail("");
    setMsg("Added.");
    setTimeout(() => setMsg(""), 3000);
  }

  function toggleSub(id) {
    const updated = subs.map(s => s.id === id ? { ...s, active: !s.active } : s);
    setSubs(updated);
    lsSet(SK.newsletter, updated);
    auditLog("toggle_subscriber", "newsletter", `ID ${id}`);
  }

  function deleteSub(id) {
    if (!confirm("Remove subscriber?")) return;
    const updated = subs.filter(s => s.id !== id);
    setSubs(updated);
    lsSet(SK.newsletter, updated);
    auditLog("delete_subscriber", "newsletter", `ID ${id}`);
  }

  function exportCSV() {
    const rows = [["Email", "Source", "Subscribed", "Active"], ...subs.map(s => [s.email, s.source || "", s.subscribedAt || "", s.active ? "Yes" : "No"])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `newsletter-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const active = subs.filter(s => s.active).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Subscribers" value={subs.length}  color={C.purple} icon="📰" />
        <StatCard label="Active"             value={active}       color={C.mint}   icon="✅" />
        <StatCard label="Unsubscribed"       value={subs.length - active} color={C.rose} icon="❌" />
      </div>

      <SectionCard>
        <SectionTitle>Add Subscriber</SectionTitle>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="subscriber@email.com" type="email" />
          </div>
          <Btn onClick={addSub}>Add</Btn>
        </div>
        {msg && <p style={{ fontSize: 13, color: C.mint, fontFamily: font, marginTop: 8 }}>{msg}</p>}
      </SectionCard>

      <SectionCard style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Subscribers ({subs.length})</SectionTitle>
          <Btn variant="ghost" small onClick={exportCSV}>Export CSV</Btn>
        </div>
        {subs.length === 0 && <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>No subscribers yet. Add a newsletter signup form to your website pages.</p>}
        {subs.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: C.text, fontFamily: font, fontWeight: 500 }}>{s.email}</div>
              <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 2 }}>
                {s.source || "website"} · {s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString("en-NG") : ""}
              </div>
            </div>
            <Badge color={s.active ? C.mint : C.rose}>{s.active ? "Active" : "Unsubscribed"}</Badge>
            <button type="button" onClick={() => toggleSub(s.id)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, fontFamily: font }}>
              {s.active ? "Unsub" : "Resub"}
            </button>
            <button type="button" onClick={() => deleteSub(s.id)} style={{ background: "none", border: "none", color: C.rose, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>×</button>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Chat ────────────────────────────────────────────────────────────────────
function ChatSection() {
  const settings = lsGet(SK.settings, {});
  const tawkProp = import.meta.env.VITE_TAWK_PROPERTY_ID || settings.tawkPropertyId || "";
  const tawkWidget = import.meta.env.VITE_TAWK_WIDGET_ID || settings.tawkWidgetId || "";

  return (
    <div>
      <SectionCard>
        <SectionTitle>Live Chat via Tawk.to</SectionTitle>
        <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font, lineHeight: 1.7, marginTop: 8, marginBottom: 20 }}>
          The website uses Tawk.to for live chat. Chat conversations, visitor monitoring, and transcripts are managed directly in the Tawk.to dashboard.
        </p>
        {tawkProp ? (
          <a href={`https://dashboard.tawk.to/#/dashboard`} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", padding: "12px 24px", background: C.gold, color: "#060810", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 700, fontFamily: font }}>
            Open Tawk.to Dashboard →
          </a>
        ) : (
          <div style={{ background: C.amberDim, border: `1px solid ${C.amber}44`, borderRadius: 10, padding: "14px 18px" }}>
            <p style={{ fontSize: 13, color: C.amber, fontFamily: font, lineHeight: 1.7, margin: 0 }}>
              <strong>Not configured.</strong> Set <code>VITE_TAWK_PROPERTY_ID</code> and <code>VITE_TAWK_WIDGET_ID</code> in your Vercel environment variables to activate live chat.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard style={{ marginTop: 20 }}>
        <SectionTitle>Tawk.to Configuration</SectionTitle>
        <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginBottom: 16 }}>
          You can also set these in Site Settings. Environment variables take priority.
        </p>
        <div style={{ marginBottom: 14 }}>
          <Label>Property ID (VITE_TAWK_PROPERTY_ID)</Label>
          <Input value={tawkProp} onChange={() => {}} placeholder="e.g. 5b1234abcdef0000..." style={{ opacity: tawkProp ? 1 : 0.5 }} />
        </div>
        <div>
          <Label>Widget ID (VITE_TAWK_WIDGET_ID)</Label>
          <Input value={tawkWidget} onChange={() => {}} placeholder="e.g. default" style={{ opacity: tawkWidget ? 1 : 0.5 }} />
        </div>
        <p style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 12, lineHeight: 1.6 }}>
          These values are read from Vercel environment variables. To change them, update in your Vercel project settings and redeploy.
        </p>
      </SectionCard>
    </div>
  );
}

// ─── Reusable CRUD section ───────────────────────────────────────────────────
function CrudSection({ title, sk, defaultItem, fields, renderItem, defaultList = [] }) {
  const [items, setItems] = useState(() => lsGet(sk, defaultList));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...defaultItem });
  const [msg, setMsg] = useState("");

  const reload = useCallback(() => setItems(lsGet(sk, defaultList)), [sk]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.addEventListener("localstoreupdate", reload); return () => window.removeEventListener("localstoreupdate", reload); }, [reload]);

  function save() {
    let updated;
    if (editing !== null) {
      updated = items.map((it, i) => i === editing ? { ...form } : it);
    } else {
      updated = [...items, { ...form, id: form.id || uid() }];
    }
    setItems(updated);
    lsSet(sk, updated, editing !== null ? "update" : "create", title);
    setEditing(null);
    setForm({ ...defaultItem });
    setMsg("Saved.");
    setTimeout(() => setMsg(""), 2000);
  }

  function del(i) {
    if (!confirm("Delete this item?")) return;
    const updated = items.filter((_, idx) => idx !== i);
    setItems(updated);
    lsSet(sk, updated, "delete", title);
  }

  function edit(i) {
    setEditing(i);
    setForm({ ...items[i] });
  }

  return (
    <div>
      <SectionCard>
        <SectionTitle>{editing !== null ? `Edit ${title}` : `Add ${title}`}</SectionTitle>
        <div style={{ marginTop: 16 }}>
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <Label>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={f.rows || 3} />
              ) : f.type === "select" ? (
                <Select value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : f.type === "toggle" ? (
                <Toggle value={!!form[f.key]} onChange={v => setForm(p => ({ ...p, [f.key]: v }))} label={f.toggleLabel} />
              ) : (
                <Input value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} type={f.type || "text"} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn onClick={save}>{editing !== null ? "Update" : "Save"}</Btn>
          {editing !== null && <Btn variant="ghost" onClick={() => { setEditing(null); setForm({ ...defaultItem }); }}>Cancel</Btn>}
        </div>
        {msg && <p style={{ fontSize: 13, color: C.mint, fontFamily: font, marginTop: 8 }}>{msg}</p>}
      </SectionCard>

      <div style={{ marginTop: 20 }}>
        {items.map((item, i) => (
          <div key={item.id || i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
            <div style={{ flex: 1 }}>{renderItem(item)}</div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Btn small variant="ghost" onClick={() => edit(i)}>Edit</Btn>
              <Btn small danger onClick={() => del(i)}>Delete</Btn>
            </div>
          </div>
        ))}
        {items.length === 0 && <SectionCard><p style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>No {title.toLowerCase()}s yet.</p></SectionCard>}
      </div>
    </div>
  );
}

// ─── Products ────────────────────────────────────────────────────────────────
const ALL_INDUSTRY_OPTIONS = ["Healthcare","Education","Financial Services","Faith Organisations","Logistics & Fleet","Manufacturing & Retail","Government & NGOs"];
const ALL_SOLUTION_OPTIONS  = ["Go Paperless","Process Automation","Data & Reporting","Compliance & Audit","Enterprise Integration","Training & Adoption"];

function ProductsSection() {
  return (
    <CrudSection
      title="Product"
      sk={SK.products}
      defaultItem={{
        id: "", name: "", tag: "", tagline: "", desc: "", color: "#C8A850",
        status: "live", published: true, featured: false, order: 99, soon: false, hasPage: false,
        industries: [], solutions: [], modules: "", features: "",
      }}
      fields={[
        { key: "id",       label: "ID / URL Slug",   placeholder: "e.g. hrcore (used in URL — no spaces)", hint: "Leave blank to auto-generate. Must be unique." },
        { key: "name",     label: "Product Name",     placeholder: "e.g. HRCore" },
        { key: "tag",      label: "Short Tag",        placeholder: "e.g. Human Resources" },
        { key: "tagline",  label: "Tagline",          placeholder: "One-line pitch shown on product page" },
        { key: "desc",     label: "Description",      type: "textarea", rows: 3, placeholder: "Short product description" },
        { key: "color",    label: "Accent Color (hex)", placeholder: "#C8A850" },
        { key: "order",    label: "Display Order",    type: "number", placeholder: "1–99 (lower = appears first)" },
        { key: "status",   label: "Status",           type: "select", options: [{ value: "live", label: "Live" }, { value: "beta", label: "Beta" }, { value: "soon", label: "Coming Soon" }] },
        { key: "industries", label: "Industries (comma-separated)", placeholder: "Healthcare, Education, Financial Services…", hint: `Options: ${ALL_INDUSTRY_OPTIONS.join(", ")}` },
        { key: "solutions",  label: "Solutions (comma-separated)",  placeholder: "Go Paperless, Data & Reporting…",            hint: `Options: ${ALL_SOLUTION_OPTIONS.join(", ")}` },
        { key: "modules",    label: "Key Modules (comma-separated or one per line)", type: "textarea", rows: 3, placeholder: "Patient Records, Billing, Pharmacy…" },
        { key: "features",   label: "Features (one per line)",                       type: "textarea", rows: 4, placeholder: "Real-time dashboard\nRole-based access…" },
        { key: "soon",      label: "Coming Soon",    type: "toggle", toggleLabel: "Mark as Coming Soon" },
        { key: "featured",  label: "Featured",       type: "toggle", toggleLabel: "Feature on homepage" },
        { key: "hasPage",   label: "Has Dedicated Page", type: "toggle", toggleLabel: "Has a built-in product page (don't change for existing 9 products)" },
        { key: "published", label: "Published",      type: "toggle", toggleLabel: "Visible on website" },
      ]}
      renderItem={p => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color || C.gold, flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{p.name}</span>
            {p.id && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: font }}>/{p.id}</span>}
            <Badge color={p.status === "live" ? C.mint : p.status === "beta" ? C.amber : C.textMuted}>{p.status || "live"}</Badge>
            <Badge color={p.published ? C.mint : C.textMuted}>{p.published ? "Published" : "Draft"}</Badge>
            {p.featured && <Badge color={C.gold}>Featured</Badge>}
            {p.soon && <Badge color={C.purple}>Soon</Badge>}
          </div>
          {p.tag && <div style={{ fontSize: 11, color: C.gold, fontFamily: font, letterSpacing: "0.05em", marginBottom: 2 }}>{p.tag}</div>}
          {(p.industries?.length > 0 || (typeof p.industries === "string" && p.industries)) && (
            <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 3 }}>
              Industries: {Array.isArray(p.industries) ? p.industries.join(", ") : p.industries}
            </div>
          )}
          {p.desc && <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 4 }}>{String(p.desc).slice(0, 120)}{String(p.desc).length > 120 ? "…" : ""}</div>}
        </div>
      )}
    />
  );
}

// ─── Blog ────────────────────────────────────────────────────────────────────
function BlogSection() {
  return (
    <CrudSection
      title="Blog Post"
      sk={SK.blog}
      defaultList={[]}
      defaultItem={{ title: "", slug: "", excerpt: "", content: "", author: "Orion Soft", category: "", published: false, createdAt: new Date().toISOString() }}
      fields={[
        { key: "title", label: "Title", placeholder: "Post title" },
        { key: "slug", label: "Slug", placeholder: "url-friendly-slug" },
        { key: "category", label: "Category", placeholder: "e.g. Technology, Healthcare" },
        { key: "author", label: "Author", placeholder: "Author name" },
        { key: "excerpt", label: "Excerpt", type: "textarea", rows: 2, placeholder: "Short summary shown in lists" },
        { key: "content", label: "Content (Markdown)", type: "textarea", rows: 8, placeholder: "Full post content..." },
        { key: "published", label: "Published", type: "toggle", toggleLabel: "Published" },
      ]}
      renderItem={p => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{p.title}</span>
            <Badge color={p.published ? C.mint : C.textMuted}>{p.published ? "Published" : "Draft"}</Badge>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{p.category} · {p.author}</div>
          {p.excerpt && <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 4 }}>{p.excerpt}</div>}
        </div>
      )}
    />
  );
}

// ─── Portfolio / Case Studies ────────────────────────────────────────────────
function PortfolioSection() {
  return (
    <CrudSection
      title="Case Study"
      sk={SK.portfolio}
      defaultItem={{ clientName: "", title: "", projectTitle: "", desc: "", description: "", industry: "Healthcare", link: "", published: true }}
      fields={[
        { key: "clientName", label: "Client Name", placeholder: "e.g. St. Mary's Hospital" },
        { key: "projectTitle", label: "Project Title", placeholder: "e.g. Hospital Management System" },
        { key: "description", label: "Description", type: "textarea", placeholder: "What was built and the outcomes." },
        { key: "industry", label: "Industry", type: "select", options: ["Healthcare", "Education", "Retail", "Logistics", "Finance", "Government", "Technology", "Other"].map(i => ({ value: i, label: i })) },
        { key: "link", label: "Link (optional)", placeholder: "https://..." },
        { key: "published", label: "Published", type: "toggle", toggleLabel: "Published" },
      ]}
      renderItem={p => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{p.projectTitle || p.title || "Untitled"}</span>
            <Badge color={C.blue}>{p.industry}</Badge>
            <Badge color={p.published !== false ? C.mint : C.textMuted}>{p.published !== false ? "Published" : "Hidden"}</Badge>
          </div>
          {p.clientName && <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{p.clientName}</div>}
          {(p.description || p.desc) && <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 4 }}>{p.description || p.desc}</div>}
        </div>
      )}
    />
  );
}

// ─── Testimonials ────────────────────────────────────────────────────────────
function TestimonialsSection() {
  return (
    <CrudSection
      title="Testimonial"
      sk={SK.testimonials}
      defaultItem={{ quote: "", name: "", role: "", company: "", rating: 5, featured: false }}
      fields={[
        { key: "name", label: "Name", placeholder: "e.g. Dr. Amara Osei" },
        { key: "role", label: "Role", placeholder: "e.g. Medical Director" },
        { key: "company", label: "Company", placeholder: "e.g. Greenfield Hospital" },
        { key: "quote", label: "Testimonial", type: "textarea", placeholder: "Their exact words..." },
        { key: "rating", label: "Rating (1–5)", type: "number", placeholder: "5" },
        { key: "featured", label: "Featured", type: "toggle", toggleLabel: "Show on Homepage" },
      ]}
      renderItem={p => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{p.name}</span>
            <span style={{ color: C.amber, fontSize: 13 }}>{"★".repeat(Number(p.rating) || 5)}</span>
            {p.featured && <Badge color={C.mint}>Featured</Badge>}
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{p.role}{p.company ? ` · ${p.company}` : ""}</div>
          {p.quote && <div style={{ fontSize: 13, color: C.text, fontFamily: font, marginTop: 4, fontStyle: "italic" }}>“{p.quote}”</div>}
        </div>
      )}
    />
  );
}

// ─── FAQs ────────────────────────────────────────────────────────────────────
function FAQsSection() {
  return (
    <CrudSection
      title="FAQ"
      sk={SK.faqs}
      defaultItem={{ question: "", answer: "", category: "General", order: 0, published: true }}
      fields={[
        { key: "question", label: "Question", placeholder: "e.g. How long does implementation take?" },
        { key: "answer", label: "Answer", type: "textarea", placeholder: "Your answer..." },
        { key: "category", label: "Category", type: "select", options: ["General", "CareCore HMS", "Pricing", "Support", "Technical"].map(c => ({ value: c, label: c })) },
        { key: "order", label: "Display Order", type: "number", placeholder: "0" },
        { key: "published", label: "Published", type: "toggle", toggleLabel: "Published" },
      ]}
      renderItem={p => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{p.question}</span>
            <Badge color={p.published ? C.mint : C.textMuted}>{p.published ? "Published" : "Draft"}</Badge>
          </div>
          <div style={{ fontSize: 12, color: C.gold, fontFamily: font }}>{p.category}</div>
          {p.answer && <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 4 }}>{p.answer}</div>}
        </div>
      )}
    />
  );
}

// ─── Team ────────────────────────────────────────────────────────────────────
function TeamSection() {
  return (
    <CrudSection
      title="Team Member"
      sk={SK.team}
      defaultItem={{ name: "", role: "", bio: "", photoUrl: "", linkedin: "", order: 0, published: true }}
      fields={[
        { key: "name", label: "Full Name", placeholder: "e.g. Mathew Famojuro" },
        { key: "role", label: "Role / Title", placeholder: "e.g. Lead Engineer" },
        { key: "bio", label: "Bio", type: "textarea", placeholder: "Short biography..." },
        { key: "photoUrl", label: "Photo URL", placeholder: "https://... (optional)" },
        { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/..." },
        { key: "order", label: "Display Order", type: "number", placeholder: "0" },
        { key: "published", label: "Visible", type: "toggle", toggleLabel: "Visible" },
      ]}
      renderItem={p => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {p.photoUrl && <img src={p.photoUrl} alt={p.name} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{p.name}</span>
              <Badge color={p.published !== false ? C.mint : C.textMuted}>{p.published !== false ? "Visible" : "Hidden"}</Badge>
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{p.role}</div>
          </div>
        </div>
      )}
    />
  );
}

// ─── Careers ─────────────────────────────────────────────────────────────────
function CareersSection() {
  return (
    <CrudSection
      title="Job Posting"
      sk={SK.careers}
      defaultList={[]}
      defaultItem={{ title: "", type: "Full-time", location: "", department: "", desc: "", requirements: "", salary: "", published: true }}
      fields={[
        { key: "title", label: "Job Title", placeholder: "e.g. Senior Backend Engineer" },
        { key: "department", label: "Department", placeholder: "e.g. Engineering" },
        { key: "location", label: "Location", placeholder: "e.g. Lagos / Remote" },
        { key: "type", label: "Type", type: "select", options: ["Full-time", "Part-time", "Contract", "Internship"].map(t => ({ value: t, label: t })) },
        { key: "salary", label: "Salary Range", placeholder: "e.g. ₦400k – 700k / month" },
        { key: "desc", label: "Job Description", type: "textarea", rows: 4, placeholder: "Role responsibilities..." },
        { key: "requirements", label: "Requirements", type: "textarea", rows: 4, placeholder: "Skills and qualifications..." },
        { key: "published", label: "Accepting Applications", type: "toggle", toggleLabel: "Published / Active" },
      ]}
      renderItem={p => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{p.title}</span>
            <Badge color={C.blue}>{p.type}</Badge>
            <Badge color={p.published !== false ? C.mint : C.textMuted}>{p.published !== false ? "Active" : "Closed"}</Badge>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{[p.department, p.location, p.salary].filter(Boolean).join(" · ")}</div>
        </div>
      )}
    />
  );
}

// ─── Clients ─────────────────────────────────────────────────────────────────
function ClientsSection() {
  return (
    <CrudSection
      title="Client"
      sk={SK.clients}
      defaultList={[]}
      defaultItem={{ name: "", logoUrl: "", industry: "", website: "", featured: false, published: true }}
      fields={[
        { key: "name", label: "Client Name", placeholder: "e.g. Faith General Hospital" },
        { key: "logoUrl", label: "Logo URL", placeholder: "https://... (optional)" },
        { key: "industry", label: "Industry", placeholder: "e.g. Healthcare, Education" },
        { key: "website", label: "Website", placeholder: "https://..." },
        { key: "featured", label: "Featured", type: "toggle", toggleLabel: "Featured on Homepage" },
        { key: "published", label: "Visible", type: "toggle", toggleLabel: "Visible" },
      ]}
      renderItem={p => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {p.logoUrl && <img src={p.logoUrl} alt={p.name} style={{ width: 40, height: 28, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{p.name}</span>
              {p.featured && <Badge color={C.gold}>Featured</Badge>}
              <Badge color={p.published !== false ? C.mint : C.textMuted}>{p.published !== false ? "Visible" : "Hidden"}</Badge>
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{p.industry}</div>
          </div>
        </div>
      )}
    />
  );
}

// ─── Announcements ───────────────────────────────────────────────────────────
function AnnouncementsSection() {
  const [form, setForm] = useState(() => lsGet(SK.announcements, { active: false, text: "", type: "info", link: "", linkText: "", dismissible: true }));
  const [saved, setSaved] = useState(false);

  function save() {
    lsSet(SK.announcements, form, "save", "Announcements");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <SectionCard style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Announcement Bar</SectionTitle>
          {saved && <Badge color={C.mint}>Saved ✓</Badge>}
        </div>
        <div style={{ marginBottom: 16 }}>
          <Toggle value={!!form.active} onChange={v => setForm(s => ({ ...s, active: v }))} label="Show announcement bar" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Message</Label>
          <Textarea value={form.text || ""} onChange={e => setForm(s => ({ ...s, text: e.target.value }))} rows={2} placeholder="e.g. We're accepting new clients for Q3 2026." />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Type</Label>
          <Select value={form.type || "info"} onChange={e => setForm(s => ({ ...s, type: e.target.value }))}>
            <option value="info">Info (blue)</option>
            <option value="warning">Warning (gold)</option>
            <option value="success">Success (green)</option>
          </Select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Link URL (optional)</Label>
          <Input value={form.link || ""} onChange={e => setForm(s => ({ ...s, link: e.target.value }))} placeholder="https://..." />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Label>Link Text (optional)</Label>
          <Input value={form.linkText || ""} onChange={e => setForm(s => ({ ...s, linkText: e.target.value }))} placeholder="e.g. Learn more →" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Toggle value={form.dismissible !== false} onChange={v => setForm(s => ({ ...s, dismissible: v }))} label="Allow users to dismiss" />
        </div>
        <Btn onClick={save}>Save</Btn>
      </SectionCard>
    </div>
  );
}

// ─── Homepage Editor ─────────────────────────────────────────────────────────
const DEFAULT_HP = {
  hero: { badge: "", words: [], subheadline: "", ctaPrimary: "", ctaSecondary: "", trustItems: [] },
  stats: [],
  whyUs: [],
  cta: { tag: "", headline: "", subtext: "", primaryText: "", secondaryText: "" },
};

function HomepageSection() {
  const [data, setData] = useState(() => lsGet(SK.homepage, DEFAULT_HP) || DEFAULT_HP);
  const [tab, setTab] = useState("hero");
  const [saved, setSaved] = useState(false);

  function save() { lsSet(SK.homepage, data, "save", "Homepage"); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  const upd = (section, key, val) => setData(d => ({ ...d, [section]: { ...d[section], [key]: val } }));
  const updList = (section, val) => setData(d => ({ ...d, [section]: val }));

  const TABS = [{ id: "hero", label: "Hero" }, { id: "stats", label: "Stats" }, { id: "whyus", label: "Why Us" }, { id: "cta", label: "CTA" }];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button type="button" key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? C.goldDim : C.card, border: `1px solid ${tab === t.id ? C.gold : C.border}`,
            color: tab === t.id ? C.gold : C.text, borderRadius: 8, padding: "8px 18px",
            fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "hero" && (
        <SectionCard style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: 14 }}><Label>Badge text</Label><Input value={data.hero?.badge || ""} onChange={e => upd("hero", "badge", e.target.value)} placeholder="e.g. Now Available" /></div>
          <div style={{ marginBottom: 14 }}><Label>Hero words (comma separated)</Label><Input value={(data.hero?.words || []).join(", ")} onChange={e => upd("hero", "words", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Hospitals, Clinics, Operations" /></div>
          <div style={{ marginBottom: 14 }}><Label>Subheadline</Label><Textarea value={data.hero?.subheadline || ""} onChange={e => upd("hero", "subheadline", e.target.value)} rows={2} placeholder="Supporting hero text..." /></div>
          <div style={{ marginBottom: 14 }}><Label>Primary CTA</Label><Input value={data.hero?.ctaPrimary || ""} onChange={e => upd("hero", "ctaPrimary", e.target.value)} placeholder="e.g. Start Your Project →" /></div>
          <div style={{ marginBottom: 14 }}><Label>Secondary CTA</Label><Input value={data.hero?.ctaSecondary || ""} onChange={e => upd("hero", "ctaSecondary", e.target.value)} placeholder="e.g. See CareCore HMS" /></div>
          <div><Label>Trust items (comma separated)</Label><Input value={(data.hero?.trustItems || []).join(", ")} onChange={e => upd("hero", "trustItems", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Free consultation, No commitment, 24h response" /></div>
        </SectionCard>
      )}

      {tab === "stats" && (
        <SectionCard style={{ maxWidth: 680 }}>
          <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font, marginBottom: 14 }}>Enter stats as JSON array: <code style={{ background: C.surface, padding: "2px 6px", borderRadius: 4 }}>{`[{"value":"12+","label":"Clients"}]`}</code></p>
          <Textarea rows={8} value={JSON.stringify(data.stats || [], null, 2)} onChange={e => { try { updList("stats", JSON.parse(e.target.value)); } catch { /* invalid JSON */ } }} />
        </SectionCard>
      )}

      {tab === "whyus" && (
        <SectionCard style={{ maxWidth: 680 }}>
          <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font, marginBottom: 14 }}>Enter items as JSON array: <code style={{ background: C.surface, padding: "2px 6px", borderRadius: 4 }}>{`[{"title":"Fast","desc":"We ship quickly."}]`}</code></p>
          <Textarea rows={8} value={JSON.stringify(data.whyUs || [], null, 2)} onChange={e => { try { updList("whyUs", JSON.parse(e.target.value)); } catch { /* invalid JSON */ } }} />
        </SectionCard>
      )}

      {tab === "cta" && (
        <SectionCard style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: 14 }}><Label>CTA Tag</Label><Input value={data.cta?.tag || ""} onChange={e => upd("cta", "tag", e.target.value)} placeholder="e.g. READY WHEN YOU ARE" /></div>
          <div style={{ marginBottom: 14 }}><Label>CTA Headline</Label><Input value={data.cta?.headline || ""} onChange={e => upd("cta", "headline", e.target.value)} placeholder="e.g. Ship software your team will actually use." /></div>
          <div style={{ marginBottom: 14 }}><Label>CTA Subtext</Label><Textarea value={data.cta?.subtext || ""} onChange={e => upd("cta", "subtext", e.target.value)} rows={3} placeholder="Supporting paragraph..." /></div>
          <div style={{ marginBottom: 14 }}><Label>Primary Button Text</Label><Input value={data.cta?.primaryText || ""} onChange={e => upd("cta", "primaryText", e.target.value)} placeholder="e.g. Start Your Project →" /></div>
          <div><Label>Secondary Button Text</Label><Input value={data.cta?.secondaryText || ""} onChange={e => upd("cta", "secondaryText", e.target.value)} placeholder="e.g. See CareCore HMS" /></div>
        </SectionCard>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Btn onClick={save}>Save Homepage</Btn>
        {saved && <Badge color={C.mint}>Saved ✓</Badge>}
      </div>
    </div>
  );
}

// ─── SEO ─────────────────────────────────────────────────────────────────────
const SEO_PAGES = ["home", "products", "services", "work", "contact", "careers"];
const DEFAULT_SEO = {
  home:     { title: "Orion Soft Limited — Software that Works", desc: "Healthcare technology and custom software.", keywords: "hospital management system, custom software Nigeria", ogImage: "", robots: "index, follow" },
};

function SEOSection() {
  const [page, setPage] = useState("home");
  const [data, setData] = useState(() => lsGet(SK.seo, DEFAULT_SEO) || DEFAULT_SEO);
  const [saved, setSaved] = useState(false);

  function save() { lsSet(SK.seo, data, "save", "SEO"); setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const cur = data[page] || { title: "", desc: "", keywords: "", ogImage: "", robots: "index, follow" };
  const upd = (key, val) => setData(d => ({ ...d, [page]: { ...cur, [key]: val } }));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {SEO_PAGES.map(p => (
          <button type="button" key={p} onClick={() => setPage(p)} style={{
            background: page === p ? C.goldDim : C.card, border: page === p ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
            color: page === p ? C.gold : C.text, borderRadius: 8, padding: "7px 14px",
            cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, textTransform: "capitalize",
          }}>{p}</button>
        ))}
      </div>
      <SectionCard>
        <div style={{ marginBottom: 6 }}><Label>Page Title (&lt; 60 chars)</Label><Input value={cur.title || ""} onChange={e => upd("title", e.target.value)} placeholder="Page Title — Brand" /></div>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginBottom: 14 }}>{(cur.title || "").length}/60</div>
        <div style={{ marginBottom: 6 }}><Label>Meta Description (&lt; 155 chars)</Label><Textarea value={cur.desc || ""} onChange={e => upd("desc", e.target.value)} rows={3} placeholder="Short description for search engines" /></div>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginBottom: 14 }}>{(cur.desc || "").length}/155</div>
        <div style={{ marginBottom: 14 }}><Label>Keywords (comma-separated)</Label><Input value={cur.keywords || ""} onChange={e => upd("keywords", e.target.value)} placeholder="keyword1, keyword2" /></div>
        <div style={{ marginBottom: 14 }}><Label>OG Image URL</Label><Input value={cur.ogImage || ""} onChange={e => upd("ogImage", e.target.value)} placeholder="https://..." /></div>
        <div style={{ marginBottom: 4 }}><Label>Robots</Label>
          <Select value={cur.robots || "index, follow"} onChange={e => upd("robots", e.target.value)}>
            <option value="index, follow">index, follow</option>
            <option value="noindex, follow">noindex, follow</option>
            <option value="noindex, nofollow">noindex, nofollow</option>
          </Select>
        </div>
      </SectionCard>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Btn onClick={save}>Save SEO</Btn>
        {saved && <Badge color={C.mint}>Saved ✓</Badge>}
      </div>
    </div>
  );
}

// ─── Feature Flags ───────────────────────────────────────────────────────────
const DEFAULT_FEATURES = {
  blog: true,
  team: true,
  announcements: true,
  chat: true,
  careers: true,
  resources: true,
  pricing: true,
  newsletter_footer: false,
  maintenance_mode: false,
};

const FEATURE_LABELS = {
  blog:              { label: "Blog",                   desc: "Show Blog page and navigation link" },
  team:              { label: "Team Page",              desc: "Show Team page and footer link" },
  announcements:     { label: "Announcement Bar",       desc: "Show the announcement banner at the top of the site" },
  chat:              { label: "Live Chat Widget",       desc: "Show the Tawk.to live chat button" },
  careers:           { label: "Careers Page",           desc: "Show Careers page and navigation link" },
  resources:         { label: "Resources Page",         desc: "Show Resources page in navigation" },
  pricing:           { label: "Pricing Page",           desc: "Show Pricing page in navigation" },
  newsletter_footer: { label: "Newsletter Signup",      desc: "Show newsletter signup form in the website footer" },
  maintenance_mode:  { label: "Maintenance Mode",       desc: "⚠️ Show a maintenance notice on the public site to all visitors" },
};

function FeatureFlagsSection() {
  const [flags, setFlags] = useState(() => ({ ...DEFAULT_FEATURES, ...lsGet(SK.features, {}) }));
  const [saved, setSaved] = useState(false);

  function toggle(key) {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    lsSet(SK.features, updated, "toggle_feature", key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <SectionTitle>Feature Flags</SectionTitle>
          {saved && <Badge color={C.mint}>Saved ✓</Badge>}
        </div>
        <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font, marginBottom: 24, lineHeight: 1.7 }}>
          Toggle website features on or off. Changes take effect immediately across all browser sessions.
        </p>

        {flags.maintenance_mode && (
          <div style={{ background: C.roseDim, border: `1px solid ${C.rose}44`, borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: C.rose, fontFamily: font, margin: 0, fontWeight: 600 }}>
              ⚠️ Maintenance mode is ON. The public site shows a maintenance notice to all visitors.
            </p>
          </div>
        )}

        {Object.entries(FEATURE_LABELS).map(([key, meta]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: C.heading, fontFamily: font }}>{meta.label}</div>
              <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 3 }}>{meta.desc}</div>
            </div>
            <Toggle value={!!flags[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Navigation / Menus ──────────────────────────────────────────────────────
const DEFAULT_NAV_ITEMS = [
  { id: "n1", label: "Products",  page: "products",  active: true, order: 1 },
  { id: "n2", label: "Services",  page: "services",  active: true, order: 2 },
  { id: "n3", label: "Work",      page: "work",      active: true, order: 3 },
  { id: "n4", label: "Careers",   page: "careers",   active: true, order: 4 },
];

function MenusSection() {
  const [items, setItems] = useState(() => (lsGet(SK.menus, { main: DEFAULT_NAV_ITEMS }) || {}).main || DEFAULT_NAV_ITEMS);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: "", page: "", active: true, order: 1 });
  const [msg, setMsg] = useState("");

  function save(list) { setItems(list); lsSet(SK.menus, { main: list }, "save", "Navigation"); }

  function submit() {
    if (!form.label?.trim() || !form.page?.trim()) { setMsg("Label and page key required."); return; }
    let updated;
    if (editing !== null) updated = items.map((it, i) => i === editing ? { ...form } : it);
    else updated = [...items, { ...form, id: uid() }];
    save(updated);
    setEditing(null); setForm({ label: "", page: "", active: true, order: items.length + 1 }); setMsg("");
  }

  function del(i) { if (!confirm("Delete this nav link?")) return; save(items.filter((_, idx) => idx !== i)); }
  function edit(i) { setEditing(i); setForm({ ...items[i] }); }

  return (
    <div>
      <p style={{ color: C.textMuted, fontSize: 13, fontFamily: font, marginBottom: 16 }}>Manage the main navigation links. Stored as <code>{`{ main: [...] }`}</code>.</p>
      <SectionCard>
        <SectionTitle>{editing !== null ? "Edit Nav Link" : "Add Nav Link"}</SectionTitle>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><Label>Label</Label><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Products" /></div>
          <div><Label>Page Key</Label><Input value={form.page} onChange={e => setForm(f => ({ ...f, page: e.target.value }))} placeholder="e.g. products, work, blog" /></div>
        </div>
        <div style={{ marginTop: 12, marginBottom: 12 }}><Label>Order</Label><Input type="number" value={form.order || ""} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) || 0 }))} placeholder="1" /></div>
        <div style={{ marginBottom: 14 }}><Toggle value={!!form.active} onChange={v => setForm(f => ({ ...f, active: v }))} label="Visible" /></div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={submit}>{editing !== null ? "Update" : "Add"}</Btn>
          {editing !== null && <Btn variant="ghost" onClick={() => { setEditing(null); setForm({ label: "", page: "", active: true, order: items.length + 1 }); }}>Cancel</Btn>}
          <Btn variant="ghost" small onClick={() => save([])}>Reset to Default</Btn>
        </div>
        {msg && <p style={{ fontSize: 13, color: C.rose, fontFamily: font, marginTop: 8 }}>{msg}</p>}
      </SectionCard>

      <div style={{ marginTop: 20 }}>
        {[...items].sort((a, b) => (a.order || 0) - (b.order || 0)).map((item) => {
          const idx = items.indexOf(item);
          return (
            <div key={item.id || idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{item.label}</span>
                  <Badge color={item.active ? C.mint : C.textMuted}>{item.active ? "Visible" : "Hidden"}</Badge>
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 2 }}>page: {item.page} · order {item.order}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small variant="ghost" onClick={() => edit(idx)}>Edit</Btn>
                <Btn small danger onClick={() => del(idx)}>Delete</Btn>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <SectionCard><p style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>No custom nav items. Default navigation is active.</p></SectionCard>}
      </div>
    </div>
  );
}

// ─── Site Settings ───────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  companyName: "Orion Soft Limited", tagline: "Software that Works as Hard as You Do.",
  email: "orionsoftlimited@gmail.com", phone: "08169577059", rc: "9535128",
  address: "Nigeria", linkedin: "", twitter: "", github: "",
  ctaHeadline: "Build something exceptional.", ctaSubtext: "Ready to get started?",
};

function SettingsSection() {
  const [form, setForm] = useState(() => ({ ...DEFAULT_SETTINGS, ...(lsGet(SK.settings, {}) || {}) }));
  const [saved, setSaved] = useState(false);

  function save() { lsSet(SK.settings, form, "save", "Site Settings"); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  const f = (key) => ({ value: form[key] || "", onChange: e => setForm(s => ({ ...s, [key]: e.target.value })) });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SectionCard>
          <SectionTitle>Company Info</SectionTitle>
          <div style={{ marginTop: 14 }}>
            {[["companyName", "Company Name"], ["tagline", "Tagline"], ["email", "Email"], ["phone", "Phone"], ["rc", "RC Number"], ["address", "Address"]].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 14 }}><Label>{l}</Label><Input {...f(k)} placeholder={l} /></div>
            ))}
          </div>
        </SectionCard>
        <div>
          <SectionCard>
            <SectionTitle>Social Links</SectionTitle>
            <div style={{ marginTop: 14 }}>
              {[["linkedin", "LinkedIn URL"], ["twitter", "Twitter/X URL"], ["github", "GitHub URL"]].map(([k, l]) => (
                <div key={k} style={{ marginBottom: 14 }}><Label>{l}</Label><Input {...f(k)} placeholder="https://..." /></div>
              ))}
            </div>
          </SectionCard>
          <SectionCard>
            <SectionTitle>CTA Section</SectionTitle>
            <div style={{ marginTop: 14 }}>
              <div style={{ marginBottom: 14 }}><Label>CTA Headline</Label><Input {...f("ctaHeadline")} placeholder="Main call to action" /></div>
              <div><Label>CTA Subtext</Label><Input {...f("ctaSubtext")} placeholder="Supporting text" /></div>
            </div>
          </SectionCard>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Btn onClick={save}>Save Settings</Btn>
        {saved && <Badge color={C.mint}>Saved ✓</Badge>}
      </div>
    </div>
  );
}

// ─── Users & Roles ───────────────────────────────────────────────────────────
const ROLE_PERMS = {
  superadmin: "Full access — all sections, system settings, user management",
  editor:     "Content only — blog, products, testimonials, FAQs, team, careers",
  viewer:     "Read-only — can view analytics and leads but cannot edit anything",
};

function UsersSection({ session }) {
  const [users, setUsers] = useState(() => lsGet(SK.users, []));
  const [form, setForm] = useState({ username: "", password: "", role: "editor" });
  const [msg, setMsg] = useState("");

  const isSuperAdmin = session.role === "superadmin";

  async function addUser() {
    if (!form.username || !form.password) { setMsg("All fields required."); return; }
    if (users.find(u => u.username === form.username)) { setMsg("Username already exists."); return; }
    const hash = await hashStr(form.password);
    const newUser = { id: Date.now(), username: form.username, hash, role: form.role, createdAt: new Date().toISOString(), active: true };
    const updated = [...users, newUser];
    setUsers(updated);
    lsSet(SK.users, updated, "create_user", form.username);
    setForm({ username: "", password: "", role: "editor" });
    setMsg("User added.");
    setTimeout(() => setMsg(""), 3000);
  }

  function deleteUser(id) {
    if (!isSuperAdmin) return;
    const u = users.find(u => u.id === id);
    if (u?.username === "admin") { setMsg("Cannot delete the primary admin."); return; }
    if (!confirm(`Delete user "${u?.username}"?`)) return;
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    lsSet(SK.users, updated, "delete_user", u?.username);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Users"  value={users.length + 1} sub="Including primary admin" color={C.blue}   icon="👤" />
        <StatCard label="Active"       value={users.filter(u => u.active).length + 1}          color={C.mint}   icon="✅" />
        <StatCard label="Your Role"    value={session.role}                                     color={C.gold}   icon="🔑" />
      </div>

      <SectionCard>
        <SectionTitle>Role Permissions</SectionTitle>
        <div style={{ marginTop: 14 }}>
          {Object.entries(ROLE_PERMS).map(([role, desc]) => (
            <div key={role} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <Badge color={role === "superadmin" ? C.gold : role === "editor" ? C.blue : C.textMuted}>{role}</Badge>
              <span style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {isSuperAdmin && (
        <SectionCard style={{ marginTop: 20 }}>
          <SectionTitle>Add Admin User</SectionTitle>
          <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginBottom: 16 }}>Additional users can log in with their own credentials.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. content_editor" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 characters" />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Label>Role</Label>
            <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="superadmin">Super Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <Btn onClick={addUser}>Add User</Btn>
          {msg && <p style={{ fontSize: 13, color: C.mint, fontFamily: font, marginTop: 8 }}>{msg}</p>}
        </SectionCard>
      )}

      <SectionCard style={{ marginTop: 20 }}>
        <SectionTitle>Admin Users</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.heading, fontFamily: font }}>admin</div>
            <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 2 }}>Primary · via VITE_ADMIN_PASSWORD</div>
          </div>
          <Badge color={C.gold}>superadmin</Badge>
        </div>
        {users.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.heading, fontFamily: font }}>{u.username}</div>
              <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 2 }}>Created {new Date(u.createdAt).toLocaleDateString("en-NG")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Badge color={u.role === "superadmin" ? C.gold : u.role === "editor" ? C.blue : C.textMuted}>{u.role}</Badge>
              {isSuperAdmin && (
                <button type="button" onClick={() => deleteUser(u.id)} style={{ background: "none", border: "none", color: C.rose, cursor: "pointer", fontSize: 16 }}>×</button>
              )}
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard style={{ marginTop: 20, background: C.amberDim, border: `1px solid ${C.amber}44` }}>
        <p style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: C.amber }}>Security note:</strong> Passwords for additional users are stored as SHA-256 hashes in the browser's localStorage. This is suitable for a single-device admin setup. For multi-person access from different devices, a backend authentication system is required.
        </p>
      </SectionCard>
    </div>
  );
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────
function AuditSection() {
  const [logs, setLogs] = useState(() => lsGet(SK.audit, []));
  const [filter, setFilter] = useState("");

  function clearLogs() {
    if (!confirm("Clear all audit logs? This cannot be undone.")) return;
    setLogs([]);
    lsSet(SK.audit, []);
  }

  function exportLogs() {
    const rows = [["Timestamp", "User", "Role", "Action", "Target", "Details"], ...logs.map(l => [l.ts, l.user, l.role, l.action, l.target, l.details || ""])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `audit-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const filtered = filter ? logs.filter(l => l.action?.includes(filter) || l.target?.includes(filter) || l.user?.includes(filter)) : logs;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by action, target, or user…" />
        </div>
        <Btn variant="ghost" small onClick={exportLogs}>Export CSV</Btn>
        <Btn small danger onClick={clearLogs}>Clear All</Btn>
      </div>

      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <SectionTitle>Audit Logs ({filtered.length})</SectionTitle>
          <span style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>Last 500 entries</span>
        </div>
        {filtered.length === 0 && <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>No log entries yet.</p>}
        <div style={{ maxHeight: 600, overflowY: "auto" }}>
          {filtered.map((entry, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", minWidth: 140 }}>
                {new Date(entry.ts).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              <Badge color={entry.role === "superadmin" ? C.gold : C.blue}>{entry.user}</Badge>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13.5, color: C.text, fontFamily: font }}>
                  <strong style={{ color: C.heading }}>{entry.action?.replace(/_/g, " ")}</strong>
                  {entry.target && entry.target !== "admin" && <span style={{ color: C.textMuted }}> · {entry.target}</span>}
                </span>
                {entry.details && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{entry.details}</div>}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Media Library ───────────────────────────────────────────────────────────
function MediaSection() {
  const [media, setMedia] = useState(() => lsGet(SK.media, []));
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  function addUrl() {
    if (!url) return;
    const entry = { id: Date.now(), url, label: label || url.split("/").pop(), type: "url", addedAt: new Date().toISOString() };
    const updated = [...media, entry];
    setMedia(updated);
    lsSet(SK.media, updated, "add_media", label || url);
    setUrl(""); setLabel(""); setMsg("Added.");
    setTimeout(() => setMsg(""), 2000);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setMsg("File too large. Max 500 KB for base64 storage. Host larger images externally."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const entry = { id: Date.now(), url: ev.target.result, label: file.name, type: "base64", size: file.size, addedAt: new Date().toISOString() };
      const updated = [...media, entry];
      setMedia(updated);
      lsSet(SK.media, updated, "upload_media", file.name);
      setMsg("Uploaded.");
      setTimeout(() => setMsg(""), 2000);
    };
    reader.readAsDataURL(file);
  }

  function deleteMedia(id) {
    const updated = media.filter(m => m.id !== id);
    setMedia(updated);
    lsSet(SK.media, updated, "delete_media", `ID ${id}`);
  }

  function copyUrl(u) {
    navigator.clipboard.writeText(u).then(() => { setMsg("Copied!"); setTimeout(() => setMsg(""), 2000); });
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <SectionCard>
          <SectionTitle>Add by URL</SectionTitle>
          <div style={{ marginTop: 14 }}>
            <Label>Image URL</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div style={{ marginTop: 12 }}>
            <Label>Label (optional)</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. CareCore dashboard screenshot" />
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={addUrl}>Add URL</Btn></div>
        </SectionCard>

        <SectionCard>
          <SectionTitle>Upload Small Image</SectionTitle>
          <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 1.6, marginTop: 8, marginBottom: 16 }}>
            Max 500 KB. Stored as base64 in localStorage. For production images, use Cloudinary, Vercel Blob, or upload directly to <code style={{ fontSize: 11 }}>/public/assets/</code> in the repo.
          </p>
          <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} style={{ display: "none" }} />
          <Btn onClick={() => fileRef.current?.click()}>Choose File</Btn>
        </SectionCard>
      </div>
      {msg && <p style={{ fontSize: 13, color: C.mint, fontFamily: font, marginBottom: 16 }}>{msg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {media.map(m => (
          <div key={m.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ height: 120, background: C.surface, overflow: "hidden" }}>
              <img src={m.url} alt={m.label} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: 12.5, color: C.text, fontFamily: font, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => copyUrl(m.url)} style={{ flex: 1, padding: "6px", background: C.goldDim, border: `1px solid ${C.gold}33`, color: C.gold, borderRadius: 6, fontSize: 11.5, fontWeight: 600, fontFamily: font, cursor: "pointer" }}>Copy URL</button>
                <button type="button" onClick={() => deleteMedia(m.id)} style={{ padding: "6px 10px", background: C.roseDim, border: `1px solid ${C.rose}33`, color: C.rose, borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}>×</button>
              </div>
            </div>
          </div>
        ))}
        {media.length === 0 && (
          <div style={{ gridColumn: "1/-1" }}>
            <SectionCard>
              <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>No media yet. Add images by URL or upload small files above.</p>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Backups ─────────────────────────────────────────────────────────────────
function BackupsSection() {
  const [status, setStatus] = useState("");

  const BACKUP_KEYS = Object.entries(SK).filter(([k]) => !["session", "lockout"].includes(k));

  function exportAll() {
    const data = {};
    BACKUP_KEYS.forEach(([, key]) => {
      try { data[key] = JSON.parse(localStorage.getItem(key) || "null"); } catch { /* skip unreadable key */ }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orionsoft-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    auditLog("export", "backup", "Full backup downloaded");
    setStatus("Backup downloaded.");
    setTimeout(() => setStatus(""), 3000);
  }

  function importAll(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([key, val]) => { if (val !== null) localStorage.setItem(key, JSON.stringify(val)); });
        window.dispatchEvent(new Event("localstoreupdate"));
        auditLog("import", "backup", "Backup restored");
        setStatus("Backup restored! Refresh the page to see changes.");
        setTimeout(() => setStatus(""), 5000);
      } catch { setStatus("Invalid backup file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function clearKey(label, key) {
    if (!confirm(`Clear all ${label} data? This cannot be undone.`)) return;
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("localstoreupdate"));
    auditLog("clear", label, `Cleared ${key}`);
    setStatus(`Cleared ${label}.`);
    setTimeout(() => setStatus(""), 3000);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <SectionCard>
          <SectionTitle>Export Backup</SectionTitle>
          <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font, marginBottom: 20 }}>Download all website data (products, blog, portfolio, settings, etc.) as a JSON file.</p>
          <Btn onClick={exportAll}>⬇ Download Backup</Btn>
        </SectionCard>
        <SectionCard>
          <SectionTitle>Restore Backup</SectionTitle>
          <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font, marginBottom: 20 }}>Upload a previously exported backup file. This will overwrite current data.</p>
          <label style={{ display: "inline-block", background: C.amberDim, color: C.amber, border: `1px solid ${C.amber}33`, borderRadius: 8, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: font }}>
            ⬆ Restore from File <input type="file" accept=".json" onChange={importAll} style={{ display: "none" }} />
          </label>
        </SectionCard>
      </div>

      {status && <div style={{ background: C.mintDim, border: `1px solid ${C.mint}44`, borderRadius: 10, padding: "12px 18px", color: C.mint, marginBottom: 20, fontSize: 14, fontFamily: font }}>{status}</div>}

      <SectionCard>
        <SectionTitle>Data Management</SectionTitle>
        <p style={{ color: C.textMuted, fontSize: 13, fontFamily: font, marginBottom: 16 }}>Reset individual data stores. Use with caution — this cannot be undone without a backup.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {BACKUP_KEYS.map(([label, key]) => (
            <Btn key={key} small danger onClick={() => clearKey(label, key)}>Clear {label}</Btn>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── AI Conversations (Ori chatbot) ──────────────────────────────────────────
// ─── AI Conversations (Ori chatbot) ──────────────────────────────────────────
function ConversationsSection() {
  const [convs, setConvs] = useState(() => lsGet(SK.conversations, []));
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    const handler = () => setConvs(lsGet(SK.conversations, []));
    window.addEventListener("localstoreupdate", handler);
    return () => window.removeEventListener("localstoreupdate", handler);
  }, []);

  const syncFromServer = useCallback(async () => {
    setSyncing(true);
    const data = await fetchServerData("conversations");
    setSyncing(false);
    if (data?.conversations?.length) {
      const merged = mergeById(data.conversations, lsGet(SK.conversations, []));
      setConvs(merged);
      lsSet(SK.conversations, merged);
      setLastSync(new Date().toLocaleTimeString("en-NG"));
    }
  }, []);

  useEffect(() => { syncFromServer(); }, [syncFromServer]);

  const filtered = filter === "leads" ? convs.filter(c => c.lead)
    : filter === "escalated" ? convs.filter(c => c.escalated)
    : convs;

  function deleteConv(id) {
    const updated = convs.filter(c => c.id !== id);
    setConvs(updated);
    lsSet(SK.conversations, updated);
    if (selected?.id === id) setSelected(null);
  }

  function exportCSV() {
    const rows = [
      ["Started", "Status", "Name", "Email", "Phone", "Org", "Messages", "Demo Slot", "Escalated"],
      ...convs.map(c => [
        c.startedAt ? new Date(c.startedAt).toLocaleString("en-NG") : "",
        c.status || "active",
        c.lead?.name || "", c.lead?.email || "", c.lead?.phone || "", c.lead?.org || "",
        (c.messages || []).length,
        c.lead?.demoSlot || "",
        c.escalated ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `conversations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const leadsCount = convs.filter(c => c.lead).length;
  const escalatedCount = convs.filter(c => c.escalated).length;

  return (
    <div>
      <SectionHeader title="AI Conversations" action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {lastSync && <span style={{ fontSize: 11, color: C.mint, fontFamily: font }}>✓ {lastSync}</span>}
          <button type="button" onClick={syncFromServer} disabled={syncing} style={{
            background: C.card, border: `1px solid ${C.border}`, color: syncing ? C.textMuted : C.gold,
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: font, cursor: syncing ? "wait" : "pointer",
          }}>{syncing ? "⟳ Syncing…" : "⟳ Sync"}</button>
          <Btn variant="ghost" small onClick={exportCSV}>Export CSV</Btn>
        </div>
      } />

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Total Conversations" value={convs.length}    color={C.accent} icon="💬" />
        <StatCard label="With Lead Data"       value={leadsCount}      color={C.amber}  icon="🎯" />
        <StatCard label="Escalated"            value={escalatedCount}  color={C.rose}   icon="🚨" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["all", `All (${convs.length})`], ["leads", `Leads (${leadsCount})`], ["escalated", `Escalated (${escalatedCount})`]].map(([f, l]) => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer", border: "none",
            background: filter === f ? C.amber : C.card, color: filter === f ? C.bg : C.textMuted,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20 }}>
        <div>
          {filtered.length === 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
              <p style={{ color: C.textMuted, fontSize: 14, fontFamily: font, margin: 0 }}>No conversations yet. The Ori AI assistant will log conversations here.</p>
            </div>
          )}
          {filtered.map((conv, i) => {
            const lastMsg = (conv.messages || []).filter(m => m.role === "user").pop();
            const isSelected = selected?.id === conv.id;
            return (
              <div key={conv.id || i} onClick={() => setSelected(conv)}
                style={{ background: isSelected ? C.amberDim : C.card, border: `1px solid ${isSelected ? C.amber + "44" : C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 10, cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {conv.lead?.name
                      ? <span style={{ fontSize: 14.5, fontWeight: 700, color: C.heading, fontFamily: font }}>{conv.lead.name}</span>
                      : <span style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>Anonymous visitor</span>
                    }
                    {conv.escalated && <Badge color={C.rose}>Escalated</Badge>}
                    {conv.lead && !conv.escalated && <Badge color={C.amber}>Lead</Badge>}
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); deleteConv(conv.id); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
                {conv.lead?.email && <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font }}>{conv.lead.email} {conv.lead.org ? `· ${conv.lead.org}` : ""}</div>}
                {lastMsg && <div style={{ fontSize: 13, color: C.text, fontFamily: font, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{lastMsg.content}"</div>}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font }}>
                    {conv.startedAt ? new Date(conv.startedAt).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                  <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font }}>{(conv.messages || []).length} messages</span>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, position: "sticky", top: 20, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ color: C.heading, fontSize: 18, fontWeight: 700, margin: 0 }}>{selected.lead?.name || "Conversation"}</h3>
              <button type="button" onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 20 }}>×</button>
            </div>

            {selected.lead && (
              <div style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, fontFamily: font, letterSpacing: "0.08em", marginBottom: 10 }}>LEAD DETAILS</div>
                {[["Name", selected.lead.name], ["Email", selected.lead.email], ["Phone", selected.lead.phone], ["Organisation", selected.lead.org], ["Demo Slot", selected.lead.demoSlot], ["Product Interest", selected.lead.demoProduct]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font, minWidth: 100 }}>{k}</span>
                    <span style={{ fontSize: 12.5, color: C.text, fontFamily: font, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                {selected.lead?.email && (
                  <a href={`mailto:${selected.lead.email}?subject=Following up on your Orion Soft enquiry`}
                    style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: C.amber, color: C.bg, borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700, fontFamily: font }}>
                    Reply by Email →
                  </a>
                )}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: font, letterSpacing: "0.08em", marginBottom: 10 }}>CONVERSATION</div>
            {(selected.messages || []).map((msg, i) => (
              <div key={i} style={{
                marginBottom: 10, padding: "10px 14px", borderRadius: 10,
                background: msg.role === "user" ? C.amberDim : C.surface,
                border: `1px solid ${msg.role === "user" ? C.amber + "33" : C.border}`,
              }}>
                <div style={{ fontSize: 11, color: msg.role === "user" ? C.amber : C.textMuted, fontFamily: font, fontWeight: 600, marginBottom: 4 }}>
                  {msg.role === "user" ? "VISITOR" : "ORI (AI)"}
                  {msg.ts && <span style={{ fontWeight: 400, marginLeft: 8 }}>{new Date(msg.ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
                <div style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginTop: 20 }}>
        <h3 style={{ color: C.heading, fontSize: 16, fontWeight: 700, margin: 0 }}>Legacy Tawk.to (Deprecated)</h3>
        <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 8, lineHeight: 1.6 }}>
          The site now uses the built-in Ori AI assistant. If you previously used Tawk.to, remove the VITE_TAWK_PROPERTY_ID and VITE_TAWK_WIDGET_ID environment variables from Vercel to disable it.
        </p>
      </div>
    </div>
  );
}

// ─── Section router ──────────────────────────────────────────────────────────
function DashboardContent({ active, session }) {
  switch (active) {
    case "dashboard":     return <DashboardOverview />;
    case "analytics":     return <AnalyticsSection />;
    case "live":          return <LiveVisitorsSection />;
    case "leads":         return <LeadsSection />;
    case "newsletter":    return <NewsletterSection />;
    case "chat":          return <ConversationsSection />;
    case "homepage":      return <HomepageSection />;
    case "announcements": return <AnnouncementsSection />;
    case "products":      return <ProductsSection />;
    case "blog":          return <BlogSection />;
    case "portfolio":     return <PortfolioSection />;
    case "testimonials":  return <TestimonialsSection />;
    case "faqs":          return <FAQsSection />;
    case "team":          return <TeamSection />;
    case "careers":       return <CareersSection />;
    case "seo":           return <SEOSection />;
    case "features":      return <FeatureFlagsSection />;
    case "clients":       return <ClientsSection />;
    case "menus":         return <MenusSection />;
    case "settings":      return <SettingsSection />;
    case "users":         return <UsersSection session={session} />;
    case "audit":         return <AuditSection />;
    case "media":         return <MediaSection />;
    case "backups":       return <BackupsSection />;
    default:              return <DashboardOverview />;
  }
}

// ─── Main Dashboard Shell ────────────────────────────────────────────────────
export default function AdminDashboard({ setCurrentPage }) {
  const [session, setSession] = useState(getSession);
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const t = setInterval(() => { if (!getSession()) setSession(null); }, 60000);
    return () => clearInterval(t);
  }, []);

  if (!session) {
    return <AdminLogin onLogin={(s) => setSession(s)} />;
  }

  function logout() {
    auditLog("logout", "admin", "Manual logout");
    destroySession();
    setSession(null);
  }

  const navigate = (id) => { setActive(id); window.scrollTo({ top: 0 }); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: C.bg, fontFamily: font }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64, minHeight: "100vh", background: C.surface,
        borderRight: `1px solid ${C.border}`, flexShrink: 0,
        transition: "width 0.25s", overflow: "hidden", position: "sticky", top: 0, maxHeight: "100vh", overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: sidebarOpen ? "20px 20px 16px" : "20px 12px 16px", borderBottom: `1px solid ${C.border}` }}>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.heading, letterSpacing: "-0.02em" }}>Orion<span style={{ color: C.gold }}>Soft</span></div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Admin Portal</div>
            </div>
          )}
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, fontSize: 16 }} title={sidebarOpen ? "Collapse" : "Expand"}>
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>

        <div style={{ flex: 1 }}>
          {NAV_GROUPS.map(g => (
            <div key={g.label} style={{ padding: sidebarOpen ? "16px 12px 8px" : "16px 8px 8px" }}>
              {sidebarOpen && <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", padding: "0 8px 8px" }}>{g.label}</div>}
              {g.items.map(item => {
                const isActive = active === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => navigate(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: sidebarOpen ? "10px 12px" : "10px 8px",
                    background: isActive ? C.goldDim : "none", border: isActive ? `1px solid ${C.gold}22` : "1px solid transparent",
                    borderRadius: 10, cursor: "pointer", color: isActive ? C.gold : C.textMuted, fontFamily: font,
                    fontSize: 14, fontWeight: isActive ? 600 : 400, marginBottom: 2, textAlign: "left",
                    transition: "all 0.15s", justifyContent: sidebarOpen ? "flex-start" : "center",
                  }}
                  title={!sidebarOpen ? item.label : ""}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.text; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMuted; } }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ position: "sticky", bottom: 0, padding: sidebarOpen ? "16px 20px" : "16px 8px", borderTop: `1px solid ${C.border}`, background: C.surface }}>
          {sidebarOpen && (
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
              <span style={{ color: C.text, fontWeight: 600 }}>{session.username}</span>
              {" · "}{session.role}
            </div>
          )}
          <button type="button" onClick={logout} style={{
            width: "100%", padding: "9px 12px", background: C.roseDim, border: `1px solid ${C.rose}33`, color: C.rose,
            borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span>🚪</span>{sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "32px clamp(20px, 3vw, 40px)", overflowX: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.heading, margin: 0, letterSpacing: "-0.02em" }}>
              {NAV_GROUPS.flatMap(g => g.items).find(i => i.id === active)?.label || "Dashboard"}
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0", fontFamily: font }}>
              Orion Soft Admin · {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button type="button" onClick={() => setCurrentPage("home")} style={{
            background: "none", border: `1px solid ${C.border}`, color: C.textMuted, padding: "9px 16px",
            borderRadius: 8, fontSize: 13, fontFamily: font, cursor: "pointer", fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.text; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; }}>
            ← Back to website
          </button>
        </div>

        <DashboardContent active={active} session={session} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
}
