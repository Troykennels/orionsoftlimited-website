import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, TrendingUp, Radio, Bell, Calendar, Inbox, Newspaper, Bot,
  Home, Megaphone, Package, Wrench, FileText, Briefcase, Star, HelpCircle,
  Users, Target, CalendarDays, Search, Flag, Building2, Link2, Settings,
  UserCog, ClipboardList, Palmtree, Wallet, File, PenTool, FileSignature,
  Mail, Activity, ShieldCheck, ClipboardCheck, Image, Database, LogOut,
  ChevronLeft, ChevronRight, UserPlus,
} from "lucide-react";
import { parseRichText } from "../lib/richtext.js";

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
  media:        "orionsoft_media_v1",
  conversations:"orionsoft_conversations_v1",
  services:     "orionsoft_services_v1",
  events:       "orionsoft_events_v1",
};

// ─── Auth (server-verified session, see api/_lib/auth.js) ───────────────────
async function fetchSession() {
  try {
    const r = await fetch("/api/auth/me");
    if (!r.ok) return null;
    const json = await r.json();
    return json.user || null;
  } catch { return null; }
}

async function serverLogin(email, password) {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, portal: "admin" }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: json.error || `Login failed (${r.status})` };
  return { ok: true, user: json.user };
}

async function serverLogout() {
  try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
}

// ─── Audit Logger (client-side, for CMS content edits only — real admin/staff
// account activity is now audited server-side in orionsoft:admin:audit) ─────
let _currentAuditUser = null;
function setCurrentAuditUser(user) { _currentAuditUser = user; }

function auditLog(action, target, details = "") {
  try {
    const entry = { id: Date.now() + Math.random(), ts: new Date().toISOString(), user: _currentAuditUser?.name || "system", role: _currentAuditUser?.role || "", action, target, details };
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

// Server sync fetches live data from Upstash via /api/admin/data
// Merges server records into localStorage so admin sees ALL visitors' data
// Auth is via the httpOnly session cookie (sent automatically, same-origin) —
// no shared secret is sent from the client anymore.
async function fetchServerData(resource = "all") {
  try {
    const r = await fetch(`/api/admin/data?resource=${resource}`);
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
      { id: "dashboard",    label: "Dashboard",        icon: LayoutDashboard },
      { id: "analytics",    label: "Analytics",        icon: TrendingUp },
      { id: "live",         label: "Live Visitors",    icon: Radio },
      { id: "activities",   label: "Recent Activity",  icon: Bell },
      { id: "calendar",     label: "Calendar",         icon: Calendar },
    ],
  },
  {
    label: "COMMUNICATIONS",
    items: [
      { id: "leads",        label: "Contact Forms",    icon: Inbox },
      { id: "newsletter",   label: "Newsletter",       icon: Newspaper },
      { id: "chat",         label: "AI Conversations", icon: Bot },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { id: "homepage",     label: "Homepage",         icon: Home },
      { id: "announcements",label: "Announcements",    icon: Megaphone },
      { id: "products",     label: "Products",         icon: Package },
      { id: "services",     label: "Services",         icon: Wrench },
      { id: "blog",         label: "Blog",             icon: FileText },
      { id: "portfolio",    label: "Case Studies",     icon: Briefcase },
      { id: "testimonials", label: "Testimonials",     icon: Star },
      { id: "faqs",         label: "FAQs",             icon: HelpCircle },
      { id: "team",         label: "Team",             icon: Users },
      { id: "events",       label: "Events",           icon: CalendarDays },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { id: "seo",          label: "SEO",              icon: Search },
      { id: "features",     label: "Feature Flags",    icon: Flag },
      { id: "clients",      label: "Clients",          icon: Building2 },
      { id: "menus",        label: "Navigation",       icon: Link2 },
      { id: "settings",     label: "Site Settings",    icon: Settings },
    ],
  },
  {
    label: "STAFF & HR",
    items: [
      { id: "employees",     label: "Employees",        icon: UserCog },
      { id: "weekly-reports",label: "Weekly Reports",   icon: ClipboardList },
      { id: "leave-requests",label: "Leave Requests",   icon: Palmtree },
      { id: "payroll",       label: "Payroll",          icon: Wallet },
    ],
  },
  {
    label: "DOCUMENTS",
    items: [
      { id: "templates",    label: "Templates",         icon: File },
      { id: "signatories",  label: "Signatories",       icon: PenTool },
      { id: "contracts",    label: "Contracts",         icon: FileSignature },
      { id: "email-log",    label: "Email Log",         icon: Mail },
    ],
  },
  {
    label: "RECRUITMENT",
    items: [
      { id: "careers",      label: "Careers",          icon: Target },
      { id: "applicants",   label: "Applicants",       icon: UserPlus },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "health",       label: "System Health",    icon: Activity },
      { id: "users",        label: "Users & Roles",    icon: ShieldCheck },
      { id: "audit",        label: "Audit Logs",       icon: ClipboardCheck },
      { id: "media",        label: "Media Library",    icon: Image },
      { id: "backups",      label: "Backups",          icon: Database },
    ],
  },
];

// ─── Login Screen ────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const result = await serverLogin(email.trim(), pw);
    if (result.ok) {
      auditLog("login", "admin", `Successful login (${result.user.email})`);
      onLogin(result.user);
    } else {
      setErr(result.error);
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
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>Orion Soft Limited Restricted Access</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Label>Email</Label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@orionsoftlimited.com"
            autoFocus autoComplete="username"
            style={{ width: "100%", background: C.surface, border: `1px solid ${err ? C.rose : C.border}`, color: C.text, borderRadius: 10, padding: "13px 16px", fontSize: 15, fontFamily: font, outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = C.gold}
            onBlur={e => e.target.style.borderColor = err ? C.rose : C.border}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <Label>Password</Label>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter admin password"
            autoComplete="current-password"
            style={{ width: "100%", background: C.surface, border: `1px solid ${err ? C.rose : C.border}`, color: C.text, borderRadius: 10, padding: "13px 16px", fontSize: 15, fontFamily: font, outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = C.gold}
            onBlur={e => e.target.style.borderColor = err ? C.rose : C.border}
          />
        </div>
        {err && <div style={{ fontSize: 13, color: C.rose, marginBottom: 16, lineHeight: 1.5 }}>{err}</div>}
        <button type="submit" disabled={loading || !pw || !email} style={{
          width: "100%", padding: "13px", background: C.gold, color: "#060810", border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 700, fontFamily: font, cursor: loading || !pw || !email ? "not-allowed" : "pointer",
          opacity: loading || !pw || !email ? 0.6 : 1, transition: "opacity 0.2s",
        }}>
          {loading ? "Verifying…" : "Sign In →"}
        </button>
        <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
          This portal is for authorised Orion Soft administrators only.<br />Unauthorised access attempts are logged.
        </p>
      </form>
    </div>
  );
}

// ─── Live analytics hook — fetches from /api/admin/analytics, 60s cache + auto-refresh ───
const ANALYTICS_TTL = 60_000;
function useAnalytics() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastUpdated,setUpdated]    = useState(null);
  const [countdown,  setCountdown]  = useState(60);
  const cacheRef = useRef({ data: null, ts: 0 });

  const loadData = useCallback(async (force = false) => {
    const c = cacheRef.current;
    if (!force && c.data && (Date.now() - c.ts) < ANALYTICS_TTL) {
      setData(c.data); setLoading(false); return;
    }
    setLoading(true);
    try {
      const res = await globalThis.fetch("/api/admin/analytics", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      cacheRef.current = { data: json, ts: Date.now() };
      setData(json); setUpdated(new Date()); setCountdown(60); setError(null);
    } catch (err) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const t1 = setInterval(() => loadData(true), ANALYTICS_TTL);
    const t2 = setInterval(() => setCountdown(n => n <= 1 ? 60 : n - 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [loadData]);

  return { data, loading, error, lastUpdated, countdown, refresh: () => loadData(true) };
}

// ─── Skeleton loading placeholders ───────────────────────────────────────────
const shimmerStyle = {
  background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)",
  backgroundSize: "400% 100%",
  animation: "shimmer 1.8s ease-in-out infinite",
};
function SkeletonCard() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
      <div style={{ ...shimmerStyle, height: 11, width: "55%", borderRadius: 4, marginBottom: 18 }}/>
      <div style={{ ...shimmerStyle, height: 34, width: "65%", borderRadius: 6, marginBottom: 14 }}/>
      <div style={{ ...shimmerStyle, height: 9, width: "42%", borderRadius: 4 }}/>
    </div>
  );
}
function SkeletonBlock({ height = 200 }) {
  return <div style={{ ...shimmerStyle, borderRadius: 14, height, border: `1px solid ${C.border}` }}/>;
}

// ─── Inline sparkline for stat cards ────────────────────────────────────────
function MiniSparkline({ data = [], color = C.gold, width = 80, height = 32 }) {
  if (!data.length || data.every(v => !v)) return null;
  const max = Math.max(...data, 1);
  const step = width / (data.length - 1 || 1);
  const pts  = data.map((v, i) => [i * step, height - (v / max) * (height - 4)]);
  const line = pts.map(([x,y], i) => `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0]},${height} L0,${height} Z`;
  const gid  = `spk${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:"block", flexShrink:0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color}/>
    </svg>
  );
}

// ─── Full-width area line chart ──────────────────────────────────────────────
function LineAreaChart({ data = [], color = C.blue, height = 160, secondaryData = [], secondaryColor = C.gold }) {
  const W = 600, PAD = { t:12, r:8, b:30, l:36 };
  const cW = W - PAD.l - PAD.r, cH = height - PAD.t - PAD.b;
  const vals = data.map(d => d.value ?? d.visits ?? 0);
  const max  = Math.max(...vals, ...secondaryData.map(d => d.value ?? d.leads ?? 0), 1);
  const toX  = i  => PAD.l + (i / (data.length - 1 || 1)) * cW;
  const toY  = v  => PAD.t + cH - (v / max) * cH;
  const pts  = vals.map((v, i) => [toX(i), toY(v)]);
  const line = pts.map(([x,y],i) => `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)[0]},${PAD.t+cH} L${PAD.l},${PAD.t+cH} Z`;
  const gid1 = `lac${color.replace(/[^a-z0-9]/gi,"")}`;

  // Second series (leads)
  const s2vals = secondaryData.map(d => d.value ?? d.leads ?? 0);
  const pts2   = s2vals.map((v,i) => [toX(i), toY(v)]);
  const line2  = pts2.map(([x,y],i) => `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  // X-axis: first, 1/4, 1/2, 3/4, last
  const xTicks = [0, Math.floor(data.length*0.25), Math.floor(data.length*0.5), Math.floor(data.length*0.75), data.length-1].filter((v,i,a) => a.indexOf(v) === i);
  // Y-axis ticks
  const yTicks = [0, Math.round(max*0.5), max].map(v => ({ y: toY(v), v }));

  if (!data.length) return <div style={{ height, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMuted, fontSize:13 }}>No data yet. Visits will appear as people browse the site.</div>;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width:"100%", height, display:"block" }}>
      <defs>
        <linearGradient id={gid1} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yTicks.map((t,i) => (
        <g key={i}>
          <line x1={PAD.l} y1={t.y} x2={W-PAD.r} y2={t.y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <text x={PAD.l-4} y={t.y+4} textAnchor="end" fontSize="9" fill={C.textMuted} fontFamily={font}>{t.v}</text>
        </g>
      ))}
      {/* Area + primary line */}
      <path d={area} fill={`url(#${gid1})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Secondary series */}
      {s2vals.some(v => v > 0) && <path d={line2} fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" opacity="0.7"/>}
      {/* X-axis labels */}
      {xTicks.map(i => (
        data[i] && <text key={i} x={toX(i)} y={height-4} textAnchor="middle" fontSize="9" fill={C.textMuted} fontFamily={font}>{data[i].label}</text>
      ))}
      {/* Last point */}
      {pts.length > 0 && <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3.5" fill={color} stroke={C.card} strokeWidth="1.5"/>}
    </svg>
  );
}

// ─── Donut / ring chart ──────────────────────────────────────────────────────
function DonutChart({ segments = [], size = 140, innerLabel = "total" }) {
  const total = segments.reduce((s, sg) => s + (sg.value || 0), 0);
  if (!total) return <div style={{ height:size, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMuted, fontSize:12 }}>No data yet</div>;
  const cx = size/2, cy = size/2, R = size*0.35, stroke = size*0.17;
  let angle = -Math.PI / 2;
  const arcs = segments.filter(s => s.value > 0).map(sg => {
    const sweep = (sg.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle), y2 = cy + R * Math.sin(angle);
    return { ...sg, d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${sweep>Math.PI?1:0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}` };
  });
  return (
    <div style={{ display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={stroke} strokeLinecap="butt">
            <title>{arc.label}: {arc.value}</title>
          </path>
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize={size*0.13} fontWeight="800" fill={C.heading} fontFamily={font}>{total}</text>
        <text x={cx} y={cy + size*0.1} textAnchor="middle" fontSize={size*0.07} fill={C.textMuted} fontFamily={font}>{innerLabel}</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {segments.filter(s => s.value > 0).map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:C.textMuted, fontFamily:font }}>{s.label}</span>
            <span style={{ fontSize:12, color:C.text, fontFamily:font, fontWeight:700, marginLeft:"auto" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal bar chart ────────────────────────────────────────────────────
function HBarChart({ data = [], color = C.gold, nameKey = "name", countKey = "count" }) {
  if (!data.length) return <p style={{ color:C.textMuted, fontSize:13, fontFamily:font }}>No data yet.</p>;
  const max = Math.max(...data.map(d => d[countKey] || 0), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {data.slice(0, 8).map((d, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:10, color:C.textMuted, fontFamily:font, width:16, textAlign:"right", flexShrink:0 }}>#{i+1}</div>
          <div style={{ flex:1, fontSize:12, color:C.text, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d[nameKey] || d.page || d.source || "—"}</div>
          <div style={{ width:120, height:7, background:C.surface, borderRadius:4, overflow:"hidden", flexShrink:0 }}>
            <div style={{ width:`${((d[countKey]||0)/max)*100}%`, height:"100%", background:color, borderRadius:4, opacity:0.6+0.4*((d[countKey]||0)/max), transition:"width 0.5s ease" }}/>
          </div>
          <div style={{ fontSize:12, color:color, fontFamily:font, fontWeight:700, width:36, textAlign:"right", flexShrink:0 }}>{d[countKey]}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Dual bar chart (visits + leads per month) ───────────────────────────────
function DualBarChart({ data = [], color1 = C.blue, color2 = C.gold, height = 140 }) {
  const maxV = Math.max(...data.map(d => d.visits || 0), 1);
  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:3, height }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
            <div style={{ width:"100%", display:"flex", gap:1, alignItems:"flex-end", height:height-22 }}>
              <div style={{ flex:1, background:color1, opacity:0.7, borderRadius:"2px 2px 0 0", height:`${Math.max((d.visits/maxV)*100,d.visits>0?2:0)}%` }} title={`${d.label}: ${d.visits} visits`}/>
              <div style={{ flex:1, background:color2, opacity:0.8, borderRadius:"2px 2px 0 0", height:`${Math.max(((d.leads||0)/maxV)*100,(d.leads||0)>0?3:0)}%` }} title={`${d.label}: ${d.leads} leads`}/>
            </div>
            <div style={{ fontSize:8, color:C.textMuted, fontFamily:font, textAlign:"center", lineHeight:1.2 }}>{d.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:14, marginTop:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.textMuted }}><div style={{ width:10, height:10, borderRadius:2, background:color1 }}/> Visits</div>
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.textMuted }}><div style={{ width:10, height:10, borderRadius:2, background:color2 }}/> Leads</div>
      </div>
    </div>
  );
}

// ─── Live stat card with sparkline ───────────────────────────────────────────
function LiveStatCard({ label, value, sub, color = C.gold, icon, spark = [], trend = null }) {
  const val = typeof value === "number" ? value.toLocaleString() : value;
  const pos  = typeof trend === "number" && trend >= 0;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:12, color:C.textMuted, fontFamily:font, fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:16 }}>{icon}</span>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:8 }}>
        <div style={{ fontSize:30, fontWeight:800, color, fontFamily:font, letterSpacing:"-0.03em", lineHeight:1 }}>{val}</div>
        {spark?.length > 1 && <MiniSparkline data={spark} color={color} width={72} height={28}/>}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {sub && <div style={{ fontSize:11.5, color:C.textMuted, fontFamily:font }}>{sub}</div>}
        {trend !== null && trend !== undefined && (
          <div style={{ fontSize:11, fontWeight:700, color: pos ? C.mint : C.rose, fontFamily:font }}>
            {pos ? "↑" : "↓"} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Overview ──────────────────────────────────────────────────────
function DashboardOverview() {
  const { data, loading, error, lastUpdated, countdown, refresh } = useAnalytics();
  const blog    = lsGet(SK.blog,    []);
  const clients = lsGet(SK.clients, []);
  const audit   = lsGet(SK.audit,   []);

  const s    = data?.stats    || {};
  const tr   = data?.trends   || {};
  const v7   = (tr.daily || []).slice(-7).map(d => d.visits);
  const l7   = (tr.daily || []).slice(-7).map(d => d.leads);

  const METRICS = [
    { label:"Website Visitors",    value:s.visitors?.total      ?? 0, sub:`${(s.visitors?.month??0).toLocaleString()} this month`,            color:C.blue,   icon:"👁️",  spark:v7, trend:s.visitors?.growth },
    { label:"Visitors Today",      value:s.visitors?.today      ?? 0, sub:new Date().toLocaleDateString("en-NG",{weekday:"long"}),             color:C.cyan,   icon:"📅",  spark:v7 },
    { label:"Demo Requests",       value:s.leads?.demo          ?? 0, sub:`${s.leads?.new??0} new unread`,                                     color:C.gold,   icon:"🎯",  spark:l7, trend:s.leads?.growth },
    { label:"Active Clients",      value:clients.filter(c=>c.published!==false).length, sub:"From clients list",                               color:C.mint,   icon:"🏢",  spark:null },
    { label:"Support Tickets",     value:s.leads?.support       ?? 0, sub:"Via support form",                                                  color:C.amber,  icon:"🎫",  spark:l7 },
    { label:"Contact Messages",    value:s.leads?.contact       ?? 0, sub:"Via contact form",                                                  color:C.purple, icon:"📬",  spark:l7 },
    { label:"Newsletter Subs",     value:s.leads?.newsletter    ?? 0, sub:"Signed up via website",                                             color:C.rose,   icon:"📰",  spark:l7 },
    { label:"Companies Reached",   value:s.companies?.unique    ?? 0, sub:`Across ${s.leads?.total??0} total submissions`,                     color:C.gold,   icon:"🏭",  spark:null },
  ];

  const LEAD_TYPE_COLORS = { demo:C.gold, contact:C.blue, support:C.purple, newsletter:C.rose, quote:C.mint, career:C.amber, partnership:C.cyan };
  const donutSegs = Object.entries(data?.leadTypes || {}).map(([k, v]) => ({ label:k, value:v, color:LEAD_TYPE_COLORS[k]||C.textMuted }));

  return (
    <div>
      {/* Header bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:12, color:C.textMuted, fontFamily:font }}>
          {error && <span style={{ color:C.rose }}>⚠ {error} · </span>}
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-NG")} · refreshing in ${countdown}s` : loading ? "Loading live data…" : ""}
        </div>
        <Btn small variant="ghost" onClick={refresh} disabled={loading}>
          {loading ? "…" : "↻ Refresh"}
        </Btn>
      </div>

      {/* 8 live stat cards */}
      <div className="admin-stat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:14, marginBottom:24 }}>
        {loading
          ? Array(8).fill(0).map((_,i) => <SkeletonCard key={i}/>)
          : METRICS.map(m => <LiveStatCard key={m.label} {...m}/>)
        }
      </div>

      {/* Charts row */}
      <div className="admin-analytics-grid" style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:20 }}>
        <SectionCard>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <SectionTitle>Visitor Trend (30 days)</SectionTitle>
            <div style={{ display:"flex", gap:10, fontSize:11, color:C.textMuted }}>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:2, background:C.blue, borderRadius:1 }}/> Visits</span>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:2, background:C.gold, borderRadius:1, borderTop:"1px dashed" }}/> Leads</span>
            </div>
          </div>
          {loading ? <SkeletonBlock height={160}/> : <LineAreaChart data={tr.daily||[]} color={C.blue} height={160} secondaryData={tr.daily||[]} secondaryColor={C.gold}/>}
        </SectionCard>

        <SectionCard>
          <SectionTitle>Lead Breakdown</SectionTitle>
          <div style={{ marginTop:16 }}>
            {loading ? <SkeletonBlock height={140}/> : <DonutChart segments={donutSegs} size={130} innerLabel="leads"/>}
          </div>
        </SectionCard>
      </div>

      {/* Popular products + admin audit */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <SectionCard>
          <SectionTitle>Popular Products</SectionTitle>
          <p style={{ fontSize:12, color:C.textMuted, fontFamily:font, margin:"4px 0 16px" }}>By demo request interest</p>
          {loading ? <SkeletonBlock height={140}/> : <HBarChart data={data?.topProducts||[]} color={C.gold} nameKey="name" countKey="count"/>}
        </SectionCard>

        <SectionCard>
          <SectionTitle>Recent Admin Actions</SectionTitle>
          <p style={{ fontSize:12, color:C.textMuted, fontFamily:font, margin:"4px 0 16px" }}>From this browser session</p>
          {audit.slice(0,7).map((e,i) => (
            <div key={i} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}`, alignItems:"flex-start" }}>
              <span style={{ fontSize:11, color:C.textMuted, fontFamily:font, whiteSpace:"nowrap", marginTop:1 }}>
                {new Date(e.ts).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"})}
              </span>
              <div style={{ fontSize:13, color:C.text, fontFamily:font }}>
                <strong style={{ color:C.gold }}>{e.user}</strong> {e.action}
                {e.target && e.target !== "admin" && <span style={{ color:C.textMuted }}> · {e.target}</span>}
                {e.details && <div style={{ fontSize:11.5, color:C.textMuted, marginTop:2 }}>{e.details}</div>}
              </div>
            </div>
          ))}
          {audit.length === 0 && <p style={{ fontSize:13, color:C.textMuted, fontFamily:font }}>No actions yet this session.</p>}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Analytics ───────────────────────────────────────────────────────────────
function AnalyticsSection() {
  const { data, loading, error, lastUpdated, countdown, refresh } = useAnalytics();
  const tr = data?.trends || {};

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:12, color:C.textMuted, fontFamily:font }}>
          {error && <span style={{ color:C.rose }}>⚠ {error} · </span>}
          {lastUpdated ? `Live data · updated ${lastUpdated.toLocaleTimeString("en-NG")} · next in ${countdown}s` : loading ? "Loading from Upstash…" : ""}
        </div>
        <Btn small variant="ghost" onClick={refresh} disabled={loading}>{loading ? "…" : "↻ Refresh"}</Btn>
      </div>

      {/* Summary stat row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
        {loading ? Array(4).fill(0).map((_,i) => <SkeletonCard key={i}/>) : [
          { label:"Total Visitors",  value:(data?.stats?.visitors?.total??0).toLocaleString(),  color:C.blue,   icon:"👁️" },
          { label:"This Month",      value:(data?.stats?.visitors?.month??0).toLocaleString(),  color:C.cyan,   icon:"📅" },
          { label:"Growth MoM",      value:`${data?.stats?.visitors?.growth??0 >= 0 ? "+" : ""}${data?.stats?.visitors?.growth??0}%`, color:data?.stats?.visitors?.growth>=0?C.mint:C.rose, icon:"📈" },
          { label:"Pages Tracked",   value:(data?.topPages||[]).length, color:C.gold, icon:"📄" },
        ].map(m => <StatCard key={m.label} {...m} />)}
      </div>

      {/* 30-day area chart */}
      <SectionCard>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <SectionTitle>Visitors: Last 30 Days</SectionTitle>
          <div style={{ display:"flex", gap:12, fontSize:11, color:C.textMuted }}>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:2, background:C.blue, borderRadius:1 }}/> Visits</span>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:2, background:C.gold, borderRadius:1 }}/> Leads</span>
          </div>
        </div>
        {loading ? <SkeletonBlock height={180}/> : <LineAreaChart data={tr.daily||[]} color={C.blue} height={180} secondaryData={tr.daily||[]} secondaryColor={C.gold}/>}
      </SectionCard>

      {/* 12-month dual bar */}
      <SectionCard style={{ marginTop:20 }}>
        <SectionTitle>Monthly Overview (12 Months)</SectionTitle>
        <div style={{ marginTop:16 }}>
          {loading ? <SkeletonBlock height={160}/> : <DualBarChart data={tr.monthly||[]} color1={C.blue} color2={C.gold} height={160}/>}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:12, fontSize:11, color:C.textMuted }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:C.blue }}/> Visits</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:C.gold }}/> Leads</span>
        </div>
      </SectionCard>

      {/* Traffic sources + top pages */}
      <div className="admin-analytics-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginTop:20 }}>
        <SectionCard>
          <SectionTitle>Traffic Sources</SectionTitle>
          <div style={{ marginTop:16 }}>
            {loading ? <SkeletonBlock height={140}/> : (
              (data?.trafficSources||[]).length > 0
                ? <DonutChart segments={(data.trafficSources).map(s => ({ label:s.source, value:s.count, color:C.blue }))} size={120} innerLabel="sources"/>
                : <p style={{ fontSize:13, color:C.textMuted, fontFamily:font }}>No referrer data yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionTitle>Top Pages</SectionTitle>
          <div style={{ marginTop:12 }}>
            {loading ? <SkeletonBlock height={140}/> : <HBarChart data={(data?.topPages||[]).map(p=>({name:p.page,count:p.count}))} color={C.cyan} nameKey="name" countKey="count"/>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Live Visitors ───────────────────────────────────────────────────────────
function LiveVisitorsSection() {
  const { data, loading, refresh, countdown } = useAnalytics();
  const todayVisits = data?.stats?.visitors?.today ?? null;
  const totalVisits = data?.stats?.visitors?.total ?? null;
  const v7 = (data?.trends?.daily||[]).slice(-7).map(d => d.visits);

  return (
    <div>
      <SectionCard>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:12, height:12, borderRadius:"50%", background:C.mint, boxShadow:`0 0 10px ${C.mint}`, animation:"pulse 2s infinite" }}/>
            <SectionTitle>Live Traffic (Upstash)</SectionTitle>
          </div>
          <div style={{ fontSize:12, color:C.textMuted, fontFamily:font }}>refreshes in {countdown}s · <button onClick={refresh} style={{ background:"none", border:"none", color:C.blue, cursor:"pointer", fontSize:12, fontFamily:font }}>↻</button></div>
        </div>

        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14 }}>
            {Array(3).fill(0).map((_,i) => <SkeletonCard key={i}/>)}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14 }}>
            <div style={{ background:C.surface, borderRadius:12, padding:"20px 24px" }}>
              <div style={{ fontSize:11, color:C.textMuted, fontFamily:font, fontWeight:600, letterSpacing:"0.06em", marginBottom:8 }}>TODAY</div>
              <div style={{ fontSize:36, fontWeight:900, color:C.blue, fontFamily:font, lineHeight:1 }}>{(todayVisits??0).toLocaleString()}</div>
              <div style={{ fontSize:12, color:C.textMuted, fontFamily:font, marginTop:6 }}>page views</div>
            </div>
            <div style={{ background:C.surface, borderRadius:12, padding:"20px 24px" }}>
              <div style={{ fontSize:11, color:C.textMuted, fontFamily:font, fontWeight:600, letterSpacing:"0.06em", marginBottom:8 }}>ALL TIME</div>
              <div style={{ fontSize:36, fontWeight:900, color:C.gold, fontFamily:font, lineHeight:1 }}>{(totalVisits??0).toLocaleString()}</div>
              <div style={{ fontSize:12, color:C.textMuted, fontFamily:font, marginTop:6 }}>total visits tracked</div>
            </div>
            <div style={{ background:C.surface, borderRadius:12, padding:"20px 24px" }}>
              <div style={{ fontSize:11, color:C.textMuted, fontFamily:font, fontWeight:600, letterSpacing:"0.06em", marginBottom:8 }}>LAST 7 DAYS</div>
              <div style={{ marginTop:4 }}>
                <MiniSparkline data={v7} color={C.mint} width={120} height={40}/>
              </div>
              <div style={{ fontSize:12, color:C.textMuted, fontFamily:font, marginTop:6 }}>{v7.reduce((a,b)=>a+b,0).toLocaleString()} visits</div>
            </div>
          </div>
        )}

        <div style={{ marginTop:20 }}>
          <SectionTitle style={{ marginBottom:12 }}>Visitor Trend (Last 14 Days)</SectionTitle>
          {loading ? <SkeletonBlock height={140}/> : <LineAreaChart data={(data?.trends?.daily||[]).slice(-14)} color={C.blue} height={140}/>}
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
    ref: l.ref || l.id?.slice(0, 12) || "",
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
// Two-column "edit here / see the real thing here" layout, used by any editor
// that has a public-facing visual worth previewing live (letters, product
// cards, blog posts, etc). Stacks to one column on narrow viewports.
function SplitEditor({ left, right }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 20, alignItems: "start" }}>
      <div>{left}</div>
      <div style={{ position: "sticky", top: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", marginBottom: 10 }}>LIVE PREVIEW</div>
        {right}
      </div>
    </div>
  );
}

function CrudSection({ title, sk, defaultItem, fields, renderItem, renderPreview, defaultList = [] }) {
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

  const formCard = (
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
  );

  return (
    <div>
      {renderPreview ? <SplitEditor left={formCard} right={renderPreview(form)} /> : formCard}

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
        { key: "id",       label: "ID / URL Slug",   placeholder: "e.g. hrcore (used in URL no spaces)", hint: "Leave blank to auto-generate. Must be unique." },
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
      renderPreview={f => (
        <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #E7E9F0", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
          <div style={{ height: 70, background: `${f.color || "#C8A850"}14`, position: "relative", borderBottom: `3px solid ${f.color || "#C8A850"}` }}>
            {f.soon && <span style={{ position: "absolute", top: 10, left: 10, background: "#0B1120", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 5 }}>COMING SOON</span>}
          </div>
          <div style={{ padding: "22px 22px 26px" }}>
            {f.tag && <span style={{ fontSize: 10.5, fontWeight: 800, color: f.color || "#C8A850", background: `${f.color || "#C8A850"}14`, padding: "3px 9px", borderRadius: 20, display: "inline-block", marginBottom: 10 }}>{f.tag}</span>}
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0B1120", margin: "0 0 6px" }}>{f.name || "Product name"}</h3>
            {f.tagline && <div style={{ fontSize: 13, color: "#5B6472", marginBottom: 8, fontWeight: 600 }}>{f.tagline}</div>}
            <p style={{ fontSize: 13.5, color: "#5B6472", lineHeight: 1.72, margin: 0 }}>{f.desc || "Product description goes here."}</p>
          </div>
        </div>
      )}
    />
  );
}

// ─── Services ────────────────────────────────────────────────────────────────
function ServicesSection() {
  return (
    <CrudSection
      title="Service"
      sk={SK.services}
      defaultList={[]}
      defaultItem={{ title: "", tagline: "", desc: "", features: "", order: 99, published: true }}
      fields={[
        { key: "title",    label: "Service Name",  placeholder: "e.g. Software Development" },
        { key: "tagline",  label: "Tagline",       placeholder: "One-line pitch" },
        { key: "desc",     label: "Description",   type: "textarea", rows: 3, placeholder: "What this service covers" },
        { key: "features", label: "Highlights (one per line)", type: "textarea", rows: 4, placeholder: "Web Applications\nAPI Development\nBusiness Automation…" },
        { key: "order",     label: "Display Order", type: "number", placeholder: "1–99 (lower = appears first)" },
        { key: "published", label: "Published",     type: "toggle", toggleLabel: "Visible on website" },
      ]}
      renderItem={s => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{s.title}</span>
            <Badge color={s.published ? C.mint : C.textMuted}>{s.published ? "Published" : "Draft"}</Badge>
          </div>
          {s.tagline && <div style={{ fontSize: 12, color: C.gold, fontFamily: font, marginBottom: 2 }}>{s.tagline}</div>}
          {s.desc && <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginTop: 4 }}>{String(s.desc).slice(0, 120)}{String(s.desc).length > 120 ? "…" : ""}</div>}
        </div>
      )}
      renderPreview={f => (
        <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #E7E9F0", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
          <div style={{ height: 8, background: "#C8A850" }} />
          <div style={{ padding: "22px 22px 26px" }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0B1120", margin: "0 0 6px" }}>{f.title || "Service name"}</h3>
            {f.tagline && <div style={{ fontSize: 13, color: "#C8A850", marginBottom: 8, fontWeight: 700 }}>{f.tagline}</div>}
            <p style={{ fontSize: 13.5, color: "#5B6472", lineHeight: 1.72, margin: "0 0 12px" }}>{f.desc || "What this service covers."}</p>
            {f.features && (
              <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#5B6472", fontSize: 13 }}>
                {String(f.features).split("\n").filter(Boolean).map((l, i) => <li key={i} style={{ marginBottom: 4 }}>{l}</li>)}
              </ul>
            )}
          </div>
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
      renderPreview={f => (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
          {f.category && <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{f.category}</div>}
          <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, margin: "0 0 8px" }}>{f.title || "Post title"}</h3>
          <p style={{ fontSize: 13.5, color: C.text, margin: "0 0 12px", lineHeight: 1.6 }}>{f.excerpt || "Post excerpt goes here."}</p>
          <div style={{ fontSize: 12, color: C.textMuted }}>{f.author || "Orion Soft"} · {new Date().toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}</div>
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
      renderPreview={f => (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "36px 32px" }}>
          <div style={{ fontSize: 52, fontFamily: "Georgia, serif", color: C.gold, opacity: 0.5, lineHeight: 1, marginBottom: -8 }}>&ldquo;</div>
          <blockquote style={{ fontSize: 15.5, color: C.text, lineHeight: 1.78, margin: "0 0 20px", fontStyle: "italic" }}>{f.quote || "Their testimonial will appear here."}</blockquote>
          <div style={{ width: 32, height: 2, background: C.gold, marginBottom: 10 }} />
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.heading }}>{f.name || "Client name"}</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>{[f.role, f.company].filter(Boolean).join(" · ") || "Role · Company"}</div>
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
      renderPreview={f => (
        <div style={{ background: C.card, border: `1px solid ${C.gold}44`, borderRadius: 12, boxShadow: "0 0 0 3px rgba(200,168,80,0.07)" }}>
          <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 700, color: C.heading, margin: 0 }}>{f.question || "Question goes here"}</h3>
            <span style={{ fontSize: 20, color: C.gold, transform: "rotate(45deg)", display: "inline-block", flexShrink: 0 }}>+</span>
          </div>
          <div style={{ padding: "0 24px 20px", fontSize: 14, color: C.text, lineHeight: 1.8 }}>{f.answer || "Answer goes here."}</div>
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
      renderPreview={f => (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
          {f.photoUrl ? (
            <img src={f.photoUrl} alt={f.name} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.gold}44`, margin: "0 auto 14px" }} onError={e => { e.target.style.display = "none"; }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.gold}20, ${C.gold}40)`, fontSize: 26, fontWeight: 800, color: C.gold }}>
              {adminInitials(f.name)}
            </div>
          )}
          <div style={{ fontSize: 17, fontWeight: 700, color: C.heading }}>{f.name || "Team member"}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginTop: 4 }}>{f.role || "Role / Title"}</div>
          {f.bio && <p style={{ fontSize: 13, color: C.text, marginTop: 10, lineHeight: 1.6 }}>{f.bio}</p>}
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
      renderPreview={f => (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: C.heading, margin: "0 0 4px" }}>{f.title || "Job title"}</h2>
              <div style={{ fontSize: 12.5, color: C.textMuted }}>{[f.type, f.location].filter(Boolean).join(" / ") || "Type / Location"}</div>
            </div>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.gold}`, flexShrink: 0 }} />
          </div>
          <p style={{ fontSize: 13.5, color: C.text, margin: "0 0 10px", lineHeight: 1.6 }}>{f.desc || "Role description goes here."}</p>
          {f.salary && <div style={{ fontSize: 12.5, fontWeight: 800, color: C.gold }}>{f.salary}</div>}
        </div>
      )}
    />
  );
}

// ─── Applicants ──────────────────────────────────────────────────────────────
const APPLICANT_STAGES = ["applied", "reviewing", "assessment", "interview", "offer", "hired"];
const APPLICANT_STATUS_LABELS = { applied: "Applied", reviewing: "Reviewing", assessment: "Assessment", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Rejected" };
const APPLICANT_STATUS_COLORS = { applied: C.blue, reviewing: C.amber, assessment: C.purple, interview: C.cyan, offer: C.gold, hired: C.mint, rejected: C.rose };

function ApplicantDetail({ applicant: a, onBack, onUpdate }) {
  const [status, setStatus] = useState(a.status);
  const [score, setScore] = useState(a.score ?? "");
  const [reviewer, setReviewer] = useState(a.reviewer || "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(extra = {}) {
    setSaving(true);
    await onUpdate({ id: a.id, status, score: score === "" ? null : Number(score), reviewer, ...extra });
    setSaving(false);
    if (extra.note) setNote("");
  }

  const stageIndex = APPLICANT_STAGES.indexOf(a.status);

  return (
    <div>
      <button type="button" onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, fontFamily: font, cursor: "pointer", marginBottom: 16, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
        onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
        <ChevronLeft size={15} /> Back to applicants
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.heading, margin: "0 0 4px", fontFamily: font }}>{a.fullName}</h1>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{a.roleAppliedFor} · Applied {new Date(a.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}</div>
        </div>
        <Badge color={APPLICANT_STATUS_COLORS[a.status] || C.textMuted}>{APPLICANT_STATUS_LABELS[a.status] || a.status}</Badge>
      </div>

      <SectionCard style={{ marginBottom: 20 }}>
        <SectionTitle>Recruitment progress</SectionTitle>
        {a.status === "rejected" ? (
          <p style={{ fontSize: 13.5, color: C.rose, marginTop: 12 }}>This application was rejected.</p>
        ) : (
          <div style={{ display: "flex", marginTop: 20, overflowX: "auto", paddingBottom: 4 }}>
            {APPLICANT_STAGES.map((s, i) => {
              const done = stageIndex >= i;
              return (
                <div key={s} style={{ flex: 1, minWidth: 96, textAlign: "center", position: "relative" }}>
                  {i > 0 && <div style={{ position: "absolute", top: 15, left: "-50%", width: "100%", height: 2, background: stageIndex >= i ? C.mint : C.border, zIndex: 0 }} />}
                  <div style={{ position: "relative", zIndex: 1, width: 32, height: 32, borderRadius: "50%", background: done ? C.mint : C.surface, border: `2px solid ${done ? C.mint : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", color: done ? "#06100E" : C.textMuted, fontWeight: 700, fontSize: 13 }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 11.5, color: done ? C.heading : C.textMuted, fontWeight: 600, fontFamily: font }}>{APPLICANT_STATUS_LABELS[s]}</div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,1.6fr) minmax(260px,1fr)", gap: 20 }}>
        <div>
          <ReportDetailCard title="Application">
            {a.coverNote || "No cover note provided."}
            <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
              {a.cvLink && <a href={a.cvLink} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>View CV →</a>}
              {a.portfolio && <a href={a.portfolio} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>View Portfolio →</a>}
            </div>
          </ReportDetailCard>
          <ReportDetailCard title="Notes">
            {(a.notes || []).length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>No notes yet.</p>}
            {(a.notes || []).map((n, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < a.notes.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div>{n.text}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>{n.by} · {new Date(n.at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <Textarea rows={2} placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} />
              <Btn small onClick={() => save({ note })} disabled={!note.trim() || saving} style={{ marginTop: 8 }}>Add note</Btn>
            </div>
          </ReportDetailCard>
        </div>

        <div>
          <SectionCard style={{ marginBottom: 16 }}>
            <SectionTitle>Contact & recruitment</SectionTitle>
            <div style={{ marginTop: 12, fontSize: 13, color: C.text, lineHeight: 2 }}>
              <div>{a.email}</div>
              <div>{a.phone || "No phone"}</div>
              <div>{a.location || "No location"}</div>
              {a.experience && <div>Experience: {a.experience}</div>}
              {a.qualification && <div>Qualification: {a.qualification}</div>}
              {a.availability && <div>Availability: {a.availability}</div>}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionTitle>Review</SectionTitle>
            <div style={{ marginTop: 12 }}>
              <Label>Status</Label>
              <Select value={status} onChange={e => setStatus(e.target.value)}>
                {[...APPLICANT_STAGES, "rejected"].map(s => <option key={s} value={s}>{APPLICANT_STATUS_LABELS[s]}</option>)}
              </Select>
            </div>
            <div style={{ marginTop: 12 }}>
              <Label>Score (0–100)</Label>
              <Input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Label>Reviewer</Label>
              <Input value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="Reviewer name" />
            </div>
            <Btn onClick={() => save()} disabled={saving} style={{ marginTop: 14 }}>{saving ? "Saving…" : "Save changes"}</Btn>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function ApplicantsSection() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [filters, setFilters] = useState({ status: "", role: "", location: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: "", email: "", roleAppliedFor: "", phone: "", location: "" });
  const [addErr, setAddErr] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/applicants");
      const j = await r.json();
      if (r.ok) setApplicants(j.applicants || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function updateApplicant(patch) {
    const r = await fetch("/api/admin/applicants", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (r.ok) { auditLog("update_applicant", patch.id, patch.status || ""); load(); }
  }

  async function addApplicant() {
    setAddErr("");
    if (!addForm.fullName || !addForm.email || !addForm.roleAppliedFor) { setAddErr("Name, email, and role are required."); return; }
    const r = await fetch("/api/admin/applicants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
    const j = await r.json();
    if (!r.ok) { setAddErr(j.error || "Failed to add applicant."); return; }
    setShowAdd(false);
    setAddForm({ fullName: "", email: "", roleAppliedFor: "", phone: "", location: "" });
    load();
  }

  const roles = Array.from(new Set(applicants.map(a => a.roleAppliedFor).filter(Boolean)));
  const locations = Array.from(new Set(applicants.map(a => a.location).filter(Boolean)));

  const filtered = applicants.filter(a =>
    (!filters.status || a.status === filters.status) &&
    (!filters.role || a.roleAppliedFor === filters.role) &&
    (!filters.location || a.location === filters.location)
  );

  const viewingApplicant = viewing ? applicants.find(a => a.id === viewing) : null;
  if (viewingApplicant) {
    return <ApplicantDetail applicant={viewingApplicant} onBack={() => setViewing(null)} onUpdate={updateApplicant} />;
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Applicants" value={applicants.length} color={C.blue} icon="👥" />
        <StatCard label="Applied" value={applicants.filter(a => a.status === "applied").length} color={C.blue} icon="📥" />
        <StatCard label="In Process" value={applicants.filter(a => ["reviewing", "assessment", "interview", "offer"].includes(a.status)).length} color={C.amber} icon="⏳" />
        <StatCard label="Hired" value={applicants.filter(a => a.status === "hired").length} color={C.mint} icon="✅" />
      </div>

      <SectionCard style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <SectionTitle>Applicants</SectionTitle>
          <Btn small onClick={() => setShowAdd(s => !s)}>{showAdd ? "Cancel" : "+ Add Applicant"}</Btn>
        </div>

        {showAdd && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><Label>Full name</Label><Input value={addForm.fullName} onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Role applied for</Label><Input value={addForm.roleAppliedFor} onChange={e => setAddForm(f => ({ ...f, roleAppliedFor: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Location</Label><Input value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} /></div>
            </div>
            <Btn small onClick={addApplicant}>Save Applicant</Btn>
            {addErr && <p style={{ color: C.rose, fontSize: 13, marginTop: 8 }}>{addErr}</p>}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ width: "auto", minWidth: 150 }}>
            <option value="">All statuses</option>
            {[...APPLICANT_STAGES, "rejected"].map(s => <option key={s} value={s}>{APPLICANT_STATUS_LABELS[s]}</option>)}
          </Select>
          <Select value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))} style={{ width: "auto", minWidth: 150 }}>
            <option value="">All roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} style={{ width: "auto", minWidth: 150 }}>
            <option value="">All locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </div>
      </SectionCard>

      <SectionCard>
        {loading && <p style={{ color: C.textMuted, fontSize: 13 }}>Loading…</p>}
        {!loading && filtered.length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>No applicants match these filters.</p>}
        {filtered.map(a => (
          <div key={a.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{a.fullName}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{a.email}</div>
            </div>
            <div style={{ fontSize: 13, color: C.text, minWidth: 140 }}>{a.roleAppliedFor}</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, minWidth: 100 }}>{a.experience || "—"}</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, minWidth: 100 }}>{a.location || "—"}</div>
            <div style={{ fontSize: 12, color: C.textMuted, minWidth: 90 }}>{new Date(a.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</div>
            <Badge color={APPLICANT_STATUS_COLORS[a.status] || C.textMuted}>{APPLICANT_STATUS_LABELS[a.status] || a.status}</Badge>
            <Btn small variant="ghost" onClick={() => setViewing(a.id)}>View</Btn>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Events ──────────────────────────────────────────────────────────────────
function EventsSection() {
  return (
    <CrudSection
      title="Event"
      sk={SK.events}
      defaultList={[]}
      defaultItem={{ title: "", date: "", location: "", desc: "", registerLink: "", published: true }}
      fields={[
        { key: "title",        label: "Event Title",   placeholder: "e.g. Orion Soft Product Demo Day" },
        { key: "date",         label: "Date",           type: "date" },
        { key: "location",     label: "Location",       placeholder: "e.g. Lagos / Virtual" },
        { key: "desc",         label: "Description",    type: "textarea", rows: 4, placeholder: "What the event is about" },
        { key: "registerLink", label: "Registration Link", placeholder: "https://…" },
        { key: "published",    label: "Published",      type: "toggle", toggleLabel: "Visible on website" },
      ]}
      renderItem={e => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{e.title}</span>
            <Badge color={e.published ? C.mint : C.textMuted}>{e.published ? "Published" : "Draft"}</Badge>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>{[e.date, e.location].filter(Boolean).join(" · ")}</div>
        </div>
      )}
      renderPreview={f => (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, display: "flex", gap: 16 }}>
          <div style={{ flexShrink: 0, width: 56, textAlign: "center", background: C.goldDim, borderRadius: 10, padding: "10px 6px", alignSelf: "flex-start" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase" }}>{f.date ? new Date(f.date).toLocaleDateString("en-NG", { month: "short" }) : "TBA"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.gold }}>{f.date ? new Date(f.date).getDate() : "--"}</div>
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.heading, margin: "0 0 4px" }}>{f.title || "Event title"}</h3>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 8 }}>{f.location || "Location"}</div>
            <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>{f.desc || "Event description goes here."}</p>
          </div>
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
  home:     { title: "Orion Soft Limited Software that Works", desc: "Healthcare technology and custom software.", keywords: "hospital management system, custom software Nigeria", ogImage: "", robots: "index, follow" },
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
        <div style={{ marginBottom: 6 }}><Label>Page Title (&lt; 60 chars)</Label><Input value={cur.title || ""} onChange={e => upd("title", e.target.value)} placeholder="Page Title Brand" /></div>
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
  superadmin: "Full access all sections, system settings, admin & staff management",
  editor:     "Content only blog, products, testimonials, FAQs, team, careers",
};

function UsersSection({ session }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "editor" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const isSuperAdmin = session.adminRole === "superadmin";

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/admins");
      const json = await r.json();
      if (r.ok) setAdmins(json.admins || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addUser() {
    setErr(""); setMsg("");
    if (!form.username || !form.email || !form.password) { setErr("All fields required."); return; }
    if (form.password.length < 10) { setErr("Password must be at least 10 characters."); return; }
    const r = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await r.json();
    if (!r.ok) { setErr(json.error || "Failed to add admin."); return; }
    auditLog("create_admin", form.email);
    setForm({ username: "", email: "", password: "", role: "editor" });
    setMsg("Admin added.");
    setTimeout(() => setMsg(""), 3000);
    load();
  }

  async function toggleStatus(a) {
    const nextStatus = a.status === "active" ? "disabled" : "active";
    const r = await fetch("/api/admin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, status: nextStatus }),
    });
    if (r.ok) { auditLog("update_admin_status", a.email, nextStatus); load(); }
  }

  async function deleteUser(a) {
    if (!confirm(`Remove admin "${a.username}"?`)) return;
    const r = await fetch(`/api/admin/admins?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(json.error || "Failed to remove admin."); return; }
    auditLog("delete_admin", a.email);
    load();
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Admins" value={admins.length}                                     color={C.blue}   icon="👤" />
        <StatCard label="Active"       value={admins.filter(a => a.status === "active").length}   color={C.mint}   icon="✅" />
        <StatCard label="Your Role"    value={session.adminRole}                                  color={C.gold}   icon="🔑" />
      </div>

      <SectionCard>
        <SectionTitle>Role Permissions</SectionTitle>
        <div style={{ marginTop: 14 }}>
          {Object.entries(ROLE_PERMS).map(([role, desc]) => (
            <div key={role} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <Badge color={role === "superadmin" ? C.gold : C.blue}>{role}</Badge>
              <span style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {isSuperAdmin && (
        <SectionCard style={{ marginTop: 20 }}>
          <SectionTitle>Add Admin</SectionTitle>
          <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, marginBottom: 16 }}>Additional admins log in with their own email and password — real server-verified accounts, not shared credentials.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. content_editor" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@orionsoftlimited.com" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 10 characters" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="editor">Editor</option>
                <option value="superadmin">Super Admin</option>
              </Select>
            </div>
          </div>
          <Btn onClick={addUser}>Add Admin</Btn>
          {msg && <p style={{ fontSize: 13, color: C.mint, fontFamily: font, marginTop: 8 }}>{msg}</p>}
          {err && <p style={{ fontSize: 13, color: C.rose, fontFamily: font, marginTop: 8 }}>{err}</p>}
        </SectionCard>
      )}

      <SectionCard style={{ marginTop: 20 }}>
        <SectionTitle>Admin Accounts</SectionTitle>
        {loading && <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, padding: "14px 0" }}>Loading…</p>}
        {!loading && admins.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.heading, fontFamily: font }}>{a.username} <span style={{ color: C.textMuted, fontWeight: 400 }}>· {a.email}</span></div>
              <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 2 }}>Created {new Date(a.createdAt).toLocaleDateString("en-NG")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Badge color={a.role === "superadmin" ? C.gold : C.blue}>{a.role}</Badge>
              <Badge color={a.status === "active" ? C.mint : C.textMuted}>{a.status}</Badge>
              {isSuperAdmin && a.id !== session.id && (
                <>
                  <button type="button" onClick={() => toggleStatus(a)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer", fontSize: 12, padding: "4px 8px" }}>
                    {a.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button type="button" onClick={() => deleteUser(a)} style={{ background: "none", border: "none", color: C.rose, cursor: "pointer", fontSize: 16 }}>×</button>
                </>
              )}
            </div>
          </div>
        ))}
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
        <p style={{ color: C.textMuted, fontSize: 13, fontFamily: font, marginBottom: 16 }}>Reset individual data stores. Use with caution this cannot be undone without a backup.</p>
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

// ─── Recent Activities ───────────────────────────────────────────────────────
function RecentActivitiesSection() {
  const { data, loading, refresh, countdown } = useAnalytics();
  const activities = data?.recentActivities || [];
  const LEAD_COLORS = { demo:C.gold, contact:C.blue, support:C.purple, newsletter:C.rose, quote:C.mint, career:C.amber, partnership:C.cyan };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <p style={{ fontSize:13, color:C.textMuted, fontFamily:font }}>
          Combined lead + conversation feed from Upstash · refreshing in {countdown}s
        </p>
        <Btn small variant="ghost" onClick={refresh} disabled={loading}>{loading ? "…" : "↻ Refresh"}</Btn>
      </div>

      <SectionCard>
        {loading
          ? Array(8).fill(0).map((_,i) => (
              <div key={i} style={{ ...shimmerStyle, height:58, borderRadius:8, marginBottom:10 }}/>
            ))
          : activities.length === 0
            ? <p style={{ fontSize:14, color:C.textMuted, fontFamily:font }}>No activity yet. Submit forms on the website to see entries here.</p>
            : activities.map((a, i) => {
                const isLead = a._kind === "lead";
                const typeColor = isLead ? (LEAD_COLORS[a.type] || C.textMuted) : C.cyan;
                const dt = new Date(a.submittedAt || a.startedAt || 0);
                return (
                  <div key={i} style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:`1px solid ${C.border}`, alignItems:"flex-start" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:`${typeColor}22`, border:`1px solid ${typeColor}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:15 }}>
                      {isLead ? { demo:"🎯", contact:"✉️", support:"🎫", newsletter:"📰", quote:"💰", career:"🚀", partnership:"🤝" }[a.type] || "📬" : "💬"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontSize:13.5, fontWeight:700, color:C.heading, fontFamily:font }}>
                          {isLead ? (a.name || a.email || "Anonymous") : (a.visitorName || "Visitor")}
                        </span>
                        <span style={{ fontSize:11, fontWeight:600, color:typeColor, background:`${typeColor}18`, padding:"2px 8px", borderRadius:20 }}>
                          {isLead ? (a.type || "lead") : "chat"}
                        </span>
                        {isLead && a.company && <span style={{ fontSize:12, color:C.textMuted, fontFamily:font }}>· {a.company}</span>}
                      </div>
                      <div style={{ fontSize:12.5, color:C.textMuted, fontFamily:font, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"90%" }}>
                        {isLead ? (a.message || a.interestedService || "No message") : (a.messages?.[0]?.content || "Conversation started")}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:C.textMuted, fontFamily:font, whiteSpace:"nowrap", marginTop:2 }}>
                      {isNaN(dt) ? "—" : dt.toLocaleDateString("en-NG", { month:"short", day:"numeric" }) + " " + dt.toLocaleTimeString("en-NG", { hour:"2-digit", minute:"2-digit" })}
                    </div>
                  </div>
                );
              })
        }
      </SectionCard>
    </div>
  );
}

// ─── Calendar / Heatmap ──────────────────────────────────────────────────────
function CalendarSection() {
  const { data, loading } = useAnalytics();
  const daily = data?.trends?.daily || [];
  const byDate = {};
  daily.forEach(d => { byDate[d.date] = { visits: d.visits, leads: d.leads }; });
  const maxV = Math.max(...daily.map(d => d.visits), 1);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const monthLabel = now.toLocaleDateString("en-NG", { month:"long", year:"numeric" });

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dk = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ d, dk, ...(byDate[dk] || { visits:0, leads:0 }) });
  }

  function heatColor(v) {
    if (v === 0) return C.surface;
    const pct = v / maxV;
    if (pct < 0.25) return "#0f3460";
    if (pct < 0.5)  return "#1a5276";
    if (pct < 0.75) return "#1f618d";
    return C.blue;
  }

  return (
    <div>
      <SectionCard>
        <SectionTitle>{monthLabel}: Visit Heatmap</SectionTitle>
        <p style={{ fontSize:12, color:C.textMuted, fontFamily:font, margin:"6px 0 20px" }}>
          Color intensity = visitor volume. Data from Upstash daily counters.
        </p>

        {loading ? <SkeletonBlock height={220}/> : (
          <>
            {/* Day labels */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:4 }}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} style={{ fontSize:10, color:C.textMuted, fontFamily:font, textAlign:"center", fontWeight:600 }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
              {cells.map((cell, i) => cell === null
                ? <div key={`e${i}`} style={{ aspectRatio:"1", borderRadius:6 }}/>
                : (
                  <div key={cell.dk} title={`${cell.dk}: ${cell.visits} visits, ${cell.leads} leads`}
                    style={{ aspectRatio:"1", borderRadius:6, background:heatColor(cell.visits), display:"flex", alignItems:"center", justifyContent:"center", cursor:"default", border:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:10, color: cell.visits > 0 ? "#fff" : C.textMuted, fontFamily:font, fontWeight:cell.visits>0?700:400 }}>{cell.d}</span>
                  </div>
                )
              )}
            </div>

            {/* Legend */}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:16 }}>
              <span style={{ fontSize:11, color:C.textMuted, fontFamily:font }}>Less</span>
              {[0, 0.2, 0.45, 0.7, 1].map((p,i) => (
                <div key={i} style={{ width:14, height:14, borderRadius:3, background:heatColor(Math.round(p*maxV)) }}/>
              ))}
              <span style={{ fontSize:11, color:C.textMuted, fontFamily:font }}>More</span>
            </div>
          </>
        )}
      </SectionCard>

      {/* Monthly totals table */}
      <SectionCard style={{ marginTop:20 }}>
        <SectionTitle>Month-by-Month Summary</SectionTitle>
        <div style={{ overflowX:"auto", marginTop:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:font, fontSize:13 }}>
            <thead>
              <tr>
                {["Month","Visits","Leads","Conversion"].map(h => (
                  <th key={h} style={{ textAlign:"left", padding:"8px 12px", fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:"0.06em", borderBottom:`1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(6).fill(0).map((_,i) => (
                    <tr key={i}><td colSpan={4} style={{ padding:"10px 12px" }}><div style={{ ...shimmerStyle, height:16, borderRadius:4 }}/></td></tr>
                  ))
                : (data?.trends?.monthly||[]).slice(-6).reverse().map(m => (
                    <tr key={m.month} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"10px 12px", color:C.text, fontWeight:500 }}>{m.label}</td>
                      <td style={{ padding:"10px 12px", color:C.blue, fontWeight:700 }}>{m.visits.toLocaleString()}</td>
                      <td style={{ padding:"10px 12px", color:C.gold, fontWeight:700 }}>{m.leads}</td>
                      <td style={{ padding:"10px 12px", color:C.mint }}>
                        {m.visits > 0 ? `${((m.leads/m.visits)*100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── System Health ───────────────────────────────────────────────────────────
function SystemHealthSection() {
  const { data, loading, lastUpdated, refresh } = useAnalytics();
  const health = data?.health || {};
  const [latency, setLatency] = useState(null);
  const [pinging, setPinging] = useState(false);

  async function ping() {
    setPinging(true);
    const t0 = Date.now();
    try {
      await globalThis.fetch("/api/admin/analytics", { cache: "no-store" });
      setLatency(Date.now() - t0);
    } catch { setLatency(-1); }
    setPinging(false);
  }

  useEffect(() => { ping(); }, []);

  const SERVICES = [
    {
      name: "Upstash Redis",
      icon: "🗄️",
      status: loading ? null : health.upstash,
      description: "Primary data store: leads, visits, conversations",
    },
    {
      name: "Email Service",
      icon: "📧",
      status: loading ? null : health.email,
      description: "Gmail/Resend: notification emails on form submissions",
    },
    {
      name: "AI (Groq)",
      icon: "🤖",
      status: loading ? null : health.ai,
      description: "Groq LLM: powers Ori AI assistant and chat responses",
    },
    {
      name: "API Endpoint",
      icon: "⚡",
      status: loading ? null : latency !== null,
      description: latency === -1 ? "Unreachable" : latency !== null ? `${latency}ms response time` : "Measuring…",
      latency,
    },
  ];

  function StatusDot({ ok }) {
    if (ok === null) return <div style={{ width:10, height:10, borderRadius:"50%", background:C.textMuted, ...shimmerStyle }}/>;
    return (
      <div style={{ width:10, height:10, borderRadius:"50%", background: ok ? C.mint : C.rose, boxShadow: ok ? `0 0 8px ${C.mint}` : `0 0 8px ${C.rose}`, animation: ok ? "pulse 3s infinite" : "none" }}/>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <p style={{ fontSize:13, color:C.textMuted, fontFamily:font }}>
          {lastUpdated ? `Last checked: ${lastUpdated.toLocaleTimeString("en-NG")}` : "Checking services…"}
        </p>
        <Btn small variant="ghost" onClick={() => { refresh(); ping(); }} disabled={loading || pinging}>
          {(loading || pinging) ? "…" : "↻ Check Now"}
        </Btn>
      </div>

      {/* Service cards */}
      <div className="admin-health-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {SERVICES.map(svc => (
          <SectionCard key={svc.name}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ fontSize:22 }}>{svc.icon}</span>
              <StatusDot ok={svc.status}/>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:C.heading, fontFamily:font, marginBottom:4 }}>{svc.name}</div>
            <div style={{ fontSize:12, color: svc.status === null ? C.textMuted : svc.status ? C.mint : C.rose, fontFamily:font, marginBottom:6 }}>
              {svc.status === null ? "Checking…" : svc.status ? "Operational" : "Degraded"}
            </div>
            <div style={{ fontSize:11.5, color:C.textMuted, fontFamily:font, lineHeight:1.5 }}>{svc.description}</div>
          </SectionCard>
        ))}
      </div>

      {/* API latency gauge */}
      <SectionCard>
        <SectionTitle>API Response Latency</SectionTitle>
        <div style={{ marginTop:16 }}>
          {latency === null ? (
            <SkeletonBlock height={40}/>
          ) : latency === -1 ? (
            <p style={{ fontSize:14, color:C.rose, fontFamily:font }}>API endpoint unreachable.</p>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                <div style={{ fontSize:32, fontWeight:900, color: latency < 300 ? C.mint : latency < 800 ? C.amber : C.rose, fontFamily:font }}>{latency}ms</div>
                <div style={{ fontSize:13, color:C.textMuted, fontFamily:font }}>
                  {latency < 300 ? "Excellent (under 300ms)" : latency < 800 ? "Good (under 800ms)" : "Slow (over 800ms)"}
                </div>
              </div>
              <div style={{ height:8, background:C.surface, borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min((latency/1500)*100,100)}%`, background: latency < 300 ? C.mint : latency < 800 ? C.amber : C.rose, borderRadius:4, transition:"width 0.6s" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.textMuted, fontFamily:font, marginTop:4 }}>
                <span>0ms</span><span>750ms</span><span>1500ms+</span>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* Environment config status */}
      <SectionCard style={{ marginTop:20 }}>
        <SectionTitle>Environment Variables</SectionTitle>
        <p style={{ fontSize:12, color:C.textMuted, fontFamily:font, margin:"6px 0 16px" }}>Detected from API health check response</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { key:"UPSTASH_REDIS_REST_URL", ok:health.upstash, label:"Upstash Redis URL" },
            { key:"UPSTASH_REDIS_REST_TOKEN", ok:health.upstash, label:"Upstash Redis Token" },
            { key:"GMAIL_USER / RESEND_API_KEY", ok:health.email, label:"Email provider" },
            { key:"GROQ_API_KEY", ok:health.ai, label:"Groq AI key" },
          ].map(e => (
            <div key={e.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:C.surface, borderRadius:8 }}>
              <span style={{ fontSize:13 }}>{e.ok ? "✅" : "⚠️"}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:font }}>{e.label}</div>
                <div style={{ fontSize:10.5, color:C.textMuted, fontFamily:font }}>{e.key}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Employees ───────────────────────────────────────────────────────────────
function EmployeesSection() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", title: "", department: "", salaryAmount: "", salaryCurrency: "NGN", staffRole: "staff" });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/employees");
      const json = await r.json();
      if (r.ok) setEmployees(json.employees || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addEmployee() {
    setErr(""); setMsg("");
    if (!form.fullName || !form.email || !form.title) { setErr("Full name, email, and title are required."); return; }
    const r = await fetch("/api/admin/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await r.json();
    if (!r.ok) { setErr(json.error || "Failed to add employee."); return; }
    auditLog("create_employee", form.email);
    setForm({ fullName: "", email: "", phone: "", title: "", department: "", salaryAmount: "", salaryCurrency: "NGN", staffRole: "staff" });
    setMsg("Employee added — welcome email sent.");
    setShowForm(false);
    setTimeout(() => setMsg(""), 4000);
    load();
  }

  async function toggleStatus(emp) {
    const nextStatus = emp.status === "active" ? "suspended" : "active";
    const r = await fetch("/api/admin/employees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: emp.id, status: nextStatus }) });
    if (r.ok) { auditLog("update_employee_status", emp.email, nextStatus); load(); }
  }

  async function toggleStaffRole(emp) {
    const nextRole = emp.staffRole === "manager" ? "staff" : "manager";
    const r = await fetch("/api/admin/employees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: emp.id, staffRole: nextRole }) });
    if (r.ok) { auditLog("update_employee_role", emp.email, nextRole); load(); }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Employees" value={employees.length} color={C.blue} icon="🧑‍💼" />
        <StatCard label="Active" value={employees.filter(e => e.status === "active").length} color={C.mint} icon="✅" />
        <StatCard label="Suspended" value={employees.filter(e => e.status !== "active").length} color={C.amber} icon="⏸️" />
      </div>

      <SectionCard style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Employees</SectionTitle>
          <Btn small onClick={() => setShowForm(s => !s)}>{showForm ? "Cancel" : "+ Add Employee"}</Btn>
        </div>
        {showForm && (
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><Label>Full name</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Job title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
              <div><Label>Staff role</Label>
                <Select value={form.staffRole} onChange={e => setForm(f => ({ ...f, staffRole: e.target.value }))}>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager (approves their department's reports & leave)</option>
                </Select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}>
                <div><Label>Salary</Label><Input type="number" value={form.salaryAmount} onChange={e => setForm(f => ({ ...f, salaryAmount: e.target.value }))} /></div>
                <div><Label>Currency</Label><Select value={form.salaryCurrency} onChange={e => setForm(f => ({ ...f, salaryCurrency: e.target.value }))}><option>NGN</option><option>USD</option></Select></div>
              </div>
            </div>
            <Btn onClick={addEmployee}>Create employee & send welcome email</Btn>
            {err && <p style={{ color: C.rose, fontSize: 13, marginTop: 10 }}>{err}</p>}
          </div>
        )}
        {msg && <p style={{ color: C.mint, fontSize: 13, marginTop: 10 }}>{msg}</p>}
      </SectionCard>

      <SectionCard>
        {loading ? <p style={{ color: C.textMuted, fontSize: 13 }}>Loading…</p> : (
          <Table
            cols={[
              { key: "fullName", label: "Name", render: e => (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {e.avatarDataUrl
                    ? <img src={e.avatarDataUrl} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.goldDim, color: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700 }}>{(e.fullName || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("")}</div>}
                  <span>{e.fullName}</span>
                </div>
              ) },
              { key: "title", label: "Title" },
              { key: "department", label: "Department" },
              { key: "email", label: "Email" },
              { key: "staffRole", label: "Role", render: e => <Badge color={e.staffRole === "manager" ? C.purple : C.textMuted}>{e.staffRole || "staff"}</Badge> },
              { key: "status", label: "Status", render: e => <Badge color={e.status === "active" ? C.mint : C.amber}>{e.status}</Badge> },
              { key: "actions", label: "", render: e => (
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => toggleStaffRole(e)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer", fontSize: 12, padding: "4px 8px" }}>{e.staffRole === "manager" ? "Make Staff" : "Make Manager"}</button>
                  <button type="button" onClick={() => toggleStatus(e)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer", fontSize: 12, padding: "4px 8px" }}>{e.status === "active" ? "Suspend" : "Reactivate"}</button>
                </div>
              ) },
            ]}
            rows={employees}
            emptyMsg="No employees yet — add your first team member above."
          />
        )}
      </SectionCard>
    </div>
  );
}

// ─── Weekly Reports (admin review) ───────────────────────────────────────────
function ReportStat({ label, value }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.heading, fontFamily: font }}>{value}</div>
    </div>
  );
}

function ReportDetailCard({ title, children }) {
  return (
    <SectionCard style={{ marginBottom: 16 }}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ marginTop: 12, fontSize: 13.5, color: C.text, lineHeight: 1.7 }}>{children}</div>
    </SectionCard>
  );
}

function WeeklyReportDetail({ report: r, employeeName, notes, setNotes, onDecide, onBack }) {
  const activityCount = (r.prospects?.length || 0) + (r.sales?.length || 0) + (r.followUps?.length || 0);
  return (
    <div>
      <button type="button" onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, fontFamily: font, cursor: "pointer", marginBottom: 16, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
        onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
        <ChevronLeft size={15} /> Back to weekly reports
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.heading, margin: "0 0 4px", fontFamily: font }}>{employeeName(r.employeeId)}</h1>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>
            {r.productFocus ? `${r.productFocus} · ` : ""}{r.weekStart} – {r.weekEnd}{r.territory ? ` · ${r.territory}` : ""}
          </div>
        </div>
        <Badge color={r.status === "approved" ? C.mint : r.status === "rejected" ? C.rose : C.amber}>{r.status}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
        <ReportStat label="Activities" value={activityCount} />
        <ReportStat label="Sales Closed" value={r.totals?.salesClosed || 0} />
        <ReportStat label="Sales Value" value={`₦${Number(r.totals?.salesValue || 0).toLocaleString()}`} />
        <ReportStat label="Meetings Held" value={r.totals?.meetingsHeld || 0} />
        <ReportStat label="Reviewed" value={r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "—"} />
      </div>

      <ReportDetailCard title="Summary">
        {r.summary || "—"}
        {r.reportingManager && <div style={{ marginTop: 10, fontSize: 12.5, color: C.textMuted }}>Reporting manager: {r.reportingManager}</div>}
      </ReportDetailCard>

      {r.prospects?.length > 0 && (
        <ReportDetailCard title={`Prospects (${r.prospects.length})`}>
          {r.prospects.map((p, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < r.prospects.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <strong style={{ color: C.heading }}>{p.organisation}</strong> — {p.contactPerson} <Badge color={C.blue}>{p.status}</Badge>
              {p.nextAction && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>Next: {p.nextAction}</div>}
            </div>
          ))}
        </ReportDetailCard>
      )}

      {r.sales?.length > 0 && (
        <ReportDetailCard title={`Sales (${r.sales.length})`}>
          {r.sales.map((s, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < r.sales.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <strong style={{ color: C.heading }}>{s.customer}</strong> — {s.productPlan} — ₦{Number(s.saleValue || 0).toLocaleString()} <Badge color={C.mint}>{s.paymentStatus}</Badge>
            </div>
          ))}
        </ReportDetailCard>
      )}

      {r.followUps?.length > 0 && (
        <ReportDetailCard title={`Follow-ups (${r.followUps.length})`}>
          {r.followUps.map((f, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < r.followUps.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <strong style={{ color: C.heading }}>{f.prospect}</strong> — {f.reason} — by {f.plannedDate}
            </div>
          ))}
        </ReportDetailCard>
      )}

      {(r.challenges || r.objections || r.supportNeeded) && (
        <ReportDetailCard title="Challenges & support needed">
          {r.challenges && <div style={{ marginBottom: 8 }}><strong style={{ color: C.heading }}>Challenges:</strong> {r.challenges}</div>}
          {r.objections && <div style={{ marginBottom: 8 }}><strong style={{ color: C.heading }}>Objections:</strong> {r.objections}</div>}
          {r.supportNeeded && <div><strong style={{ color: C.heading }}>Support needed:</strong> {r.supportNeeded}</div>}
        </ReportDetailCard>
      )}

      {(r.competitors || r.marketTrends) && (
        <ReportDetailCard title="Market intelligence">
          {r.competitors && <div style={{ marginBottom: 8 }}><strong style={{ color: C.heading }}>Competitors:</strong> {r.competitors}</div>}
          {r.marketTrends && <div><strong style={{ color: C.heading }}>Market trends:</strong> {r.marketTrends}</div>}
        </ReportDetailCard>
      )}

      {r.keyTargets?.filter(Boolean).length > 0 && (
        <ReportDetailCard title="Next week's key targets">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {r.keyTargets.filter(Boolean).map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
          </ul>
        </ReportDetailCard>
      )}

      <SectionCard>
        <SectionTitle>Review</SectionTitle>
        <div style={{ marginTop: 12 }}>
          <Label>Review notes</Label>
          <Textarea rows={3} placeholder="Optional notes for the employee…" value={notes[r.id] ?? r.reviewNotes ?? ""} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <Btn onClick={() => onDecide(r, "approved")} disabled={r.status === "approved"}>Approve</Btn>
            <Btn danger onClick={() => onDecide(r, "rejected")} disabled={r.status === "rejected"}>Reject</Btn>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function WeeklyReportsSection() {
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [viewing, setViewing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [rReports, rEmp] = await Promise.all([fetch("/api/admin/reports"), fetch("/api/admin/employees")]);
      const [jReports, jEmp] = await Promise.all([rReports.json(), rEmp.json()]);
      if (rReports.ok) setReports(jReports.reports || []);
      if (rEmp.ok) setEmployees(jEmp.employees || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function employeeName(id) { return employees.find(e => e.id === id)?.fullName || "Unknown"; }

  async function decide(report, status) {
    const r = await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: report.id, status, reviewNotes: notes[report.id] || "" }) });
    if (r.ok) { auditLog("review_report", employeeName(report.employeeId), status); load(); }
  }

  const viewingReport = viewing ? reports.find(r => r.id === viewing) : null;
  if (viewingReport) {
    return <WeeklyReportDetail report={viewingReport} employeeName={employeeName} notes={notes} setNotes={setNotes} onDecide={decide} onBack={() => setViewing(null)} />;
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Reports" value={reports.length} color={C.blue} icon="🗒️" />
        <StatCard label="Awaiting Review" value={reports.filter(r => r.status === "submitted").length} color={C.amber} icon="⏳" />
        <StatCard label="Approved" value={reports.filter(r => r.status === "approved").length} color={C.mint} icon="✅" />
      </div>
      <SectionCard>
        <SectionTitle>Weekly reports</SectionTitle>
        {loading && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>Loading…</p>}
        {!loading && reports.length === 0 && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>No reports submitted yet.</p>}
        {reports.map(r => {
          const activityCount = (r.prospects?.length || 0) + (r.sales?.length || 0) + (r.followUps?.length || 0);
          return (
            <div key={r.id} style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{employeeName(r.employeeId)} {r.productFocus ? <span style={{ color: C.textMuted, fontWeight: 400 }}>· {r.productFocus}</span> : ""}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{r.weekStart} – {r.weekEnd} · {activityCount} activities{r.submittedAt ? ` · Submitted ${new Date(r.submittedAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge color={r.status === "approved" ? C.mint : r.status === "rejected" ? C.rose : C.amber}>{r.status}</Badge>
                <Btn small variant="ghost" onClick={() => setViewing(r.id)}>Open full review</Btn>
              </div>
            </div>
          );
        })}
      </SectionCard>
    </div>
  );
}

// ─── Leave Requests (admin review) ───────────────────────────────────────────
function LeaveRequestsSection() {
  const [leave, setLeave] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});

  async function load() {
    setLoading(true);
    try {
      const [rLeave, rEmp] = await Promise.all([fetch("/api/admin/leave"), fetch("/api/admin/employees")]);
      const [jLeave, jEmp] = await Promise.all([rLeave.json(), rEmp.json()]);
      if (rLeave.ok) setLeave(jLeave.leave || []);
      if (rEmp.ok) setEmployees(jEmp.employees || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function employeeName(id) { return employees.find(e => e.id === id)?.fullName || "Unknown"; }

  async function decide(item, status) {
    const r = await fetch("/api/admin/leave", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status, decisionNotes: notes[item.id] || "" }) });
    if (r.ok) { auditLog("decide_leave", employeeName(item.employeeId), status); load(); }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Requests" value={leave.length} color={C.blue} icon="🌴" />
        <StatCard label="Pending" value={leave.filter(l => l.status === "pending").length} color={C.amber} icon="⏳" />
        <StatCard label="Approved" value={leave.filter(l => l.status === "approved").length} color={C.mint} icon="✅" />
      </div>
      <SectionCard>
        <SectionTitle>Leave requests</SectionTitle>
        {loading && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>Loading…</p>}
        {!loading && leave.length === 0 && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>No leave requests yet.</p>}
        {leave.map(l => (
          <div key={l.id} style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{employeeName(l.employeeId)}</div>
                <div style={{ fontSize: 12, color: C.textMuted, textTransform: "capitalize" }}>{l.type} · {l.startDate} – {l.endDate}</div>
              </div>
              <Badge color={l.status === "approved" ? C.mint : l.status === "rejected" ? C.rose : C.amber}>{l.status}</Badge>
            </div>
            {l.reason && <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 8 }}>Reason: {l.reason}</div>}
            {l.status === "pending" && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                <Input placeholder="Decision notes (optional)" value={notes[l.id] || ""} onChange={e => setNotes(n => ({ ...n, [l.id]: e.target.value }))} style={{ maxWidth: 300 }} />
                <Btn small onClick={() => decide(l, "approved")}>Approve</Btn>
                <Btn small danger onClick={() => decide(l, "rejected")}>Reject</Btn>
              </div>
            )}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Signature pad (canvas) — used by Signatories ────────────────────────────
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function pos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = pos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = pos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#0A2540";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasDrawn(true);
  }
  function end() {
    drawing.current = false;
    if (hasDrawn) onChange(canvasRef.current.toDataURL("image/png"));
  }
  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef} width={360} height={140}
        style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, touchAction: "none", cursor: "crosshair" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div style={{ marginTop: 8 }}>
        <Btn small variant="ghost" onClick={clear}>Clear signature</Btn>
      </div>
    </div>
  );
}

// ─── Rich text + letterhead preview (shared by Templates & Contracts) ────────
function RichText({ text }) {
  const paragraphs = parseRichText(text);
  if (paragraphs.length === 0) return <span style={{ color: "#999", fontStyle: "italic" }}>Start typing the letter body on the left…</span>;
  return paragraphs.map((para, pi) => (
    <p key={pi} style={{ margin: pi === 0 ? "0 0 12px" : "12px 0" }}>
      {para.lines.map((runs, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {runs.map((run, ri) => {
            let node = run.text;
            if (run.bold) node = <strong key={ri}>{node}</strong>;
            if (run.italic) node = <em key={ri}>{node}</em>;
            return <span key={ri}>{node}</span>;
          })}
        </span>
      ))}
    </p>
  ));
}

function fillPlaceholders(text, fillData, recipientName) {
  return String(text || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => {
    if (key === "recipientName") return recipientName || "[Recipient Name]";
    const val = fillData?.[key];
    return val ? val : m;
  });
}

// Mirrors the real letterhead PDF (api/_lib/pdf.js) as closely as HTML/CSS
// allows, so this on-screen preview isn't a rough stand-in but an accurate
// picture of what recipients actually receive: navy header band with the
// wordmark on the left and the registered company block right-aligned, a
// gold rule + left spine, formal letter body, a two-column signature block,
// and the same confidential footer.
const LETTER_COMPANY_LINES = ["Orion Soft Limited", "RC 9535128 · Nigeria", "orionsoftlimited@gmail.com · 08169577059"];

// Same mark used site-wide (src/App.jsx's OrionLogo) — reused here so the
// letterhead preview carries the real brand mark, not just a text wordmark.
function OrionLogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="letter-logo-gold" x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8E6B2" />
          <stop offset="0.46" stopColor="#D6B56D" />
          <stop offset="1" stopColor="#A77C33" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="#070809" />
      <circle cx="32" cy="32" r="24" stroke="url(#letter-logo-gold)" strokeWidth="4" />
      <circle cx="32" cy="32" r="14" stroke="url(#letter-logo-gold)" strokeWidth="2.8" opacity="0.9" />
      <path d="M43 30C43 37.2 38.4 42 31.6 42" stroke="url(#letter-logo-gold)" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4.4" fill="url(#letter-logo-gold)" />
    </svg>
  );
}

function LetterPreview({ bodyMarkup, subject, recipientName, recipientEmail, signatoryName, signatoryTitle, docRef }) {
  const serif = "'Georgia', 'Times New Roman', serif";
  return (
    <div style={{ background: "#fff", borderRadius: 6, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.35)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 5, background: "#C8A850" }} />

      <div style={{ background: "#0A2540", padding: "22px 30px 20px 38px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #C8A850" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <OrionLogoMark size={34} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: serif, letterSpacing: "-0.01em" }}>
              <span style={{ color: "#fff" }}>Orion</span><span style={{ color: "#C8A850" }}>Soft</span>
            </div>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.7)", marginTop: 4, fontFamily: font }}>Enterprise Software, Built for Africa</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 8.5, color: "rgba(255,255,255,0.7)", fontFamily: font, lineHeight: 1.7 }}>
          {LETTER_COMPANY_LINES.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>

      <div style={{ padding: "24px 30px 30px 38px", color: "#212934", fontFamily: serif }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#6B7A96", fontFamily: font, marginBottom: 20 }}>
          <span>{docRef || "Ref: —"}</span>
          <span>{new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{recipientName || "Recipient name"}</div>
        {recipientEmail && <div style={{ fontSize: 10.5, color: "#6B7A96", fontFamily: font, marginBottom: 14 }}>{recipientEmail}</div>}
        {!recipientEmail && <div style={{ marginBottom: 14 }} />}

        {subject && <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0A2540", marginBottom: 16 }}>RE: {subject.toUpperCase()}</div>}

        <div style={{ fontSize: 12, lineHeight: 1.8 }}>
          <RichText text={bodyMarkup} />
        </div>

        <div style={{ marginTop: 36, fontSize: 9.5, color: "#6B7A96", fontFamily: font }}>Executed by the parties below:</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 18 }}>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "#C8A850", fontFamily: font, letterSpacing: "0.05em", marginBottom: 26 }}>FOR ORION SOFT LIMITED</div>
            <div style={{ borderTop: "1px solid #999", paddingTop: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>{signatoryName || "Authorized Signatory"}</div>
              {signatoryTitle && <div style={{ fontSize: 9, color: "#6B7A96", fontFamily: font, marginTop: 2 }}>{signatoryTitle}</div>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "#C8A850", fontFamily: font, letterSpacing: "0.05em", marginBottom: 26 }}>RECIPIENT</div>
            <div style={{ borderTop: "1px solid #999", paddingTop: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>{recipientName || "—"}</div>
              <div style={{ fontSize: 9, color: "#6B7A96", fontFamily: font, marginTop: 2 }}>Date: _______________</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #dce0e6", padding: "10px 30px 14px 38px", display: "flex", justifyContent: "space-between", fontSize: 8, color: "#6B7A96", fontFamily: font }}>
        <span>Orion Soft Limited — Confidential</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

// ─── Document Templates ──────────────────────────────────────────────────────
function TemplatesSection() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ name: "", bodyMarkup: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/templates");
      const json = await r.json();
      if (r.ok) setTemplates(json.templates || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(t) { setEditing(t.id); setDraft({ name: t.name, bodyMarkup: t.bodyMarkup }); }

  async function save() {
    const r = await fetch("/api/admin/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing, ...draft }) });
    if (r.ok) { auditLog("update_template", editing); setEditing(null); setMsg("Template saved."); setTimeout(() => setMsg(""), 3000); load(); }
  }

  return (
    <div>
      <SectionCard>
        <SectionTitle>Document templates</SectionTitle>
        <p style={{ color: C.textMuted, fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>
          Use <code>{"{{placeholder}}"}</code> tokens — they become fillable fields when composing a document.
          Basic formatting is supported and renders properly in the PDF and on the signing page: <code>{"<b>bold</b>"}</code>, <code>{"<i>italic</i>"}</code>, <code>{"<br>"}</code> for a line break, and <code>{"<p>...</p>"}</code> or <code>{"<ul><li>...</li></ul>"}</code> for paragraphs and bullet lists. Any other tags are stripped, not shown literally.
        </p>
        {msg && <p style={{ color: C.mint, fontSize: 13, marginTop: 8 }}>{msg}</p>}
        {loading && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>Loading…</p>}
        {!loading && templates.map(t => (
          <div key={t.id} style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            {editing === t.id ? (
              <SplitEditor
                left={
                  <div>
                    <div style={{ marginBottom: 10 }}><Label>Name</Label><Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} /></div>
                    <div style={{ marginBottom: 10 }}><Label>Body (HTML)</Label><Textarea style={{ minHeight: 260, fontFamily: "monospace", fontSize: 12.5 }} value={draft.bodyMarkup} onChange={e => setDraft(d => ({ ...d, bodyMarkup: e.target.value }))} /></div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small onClick={save}>Save</Btn>
                      <Btn small variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                    </div>
                  </div>
                }
                right={<LetterPreview bodyMarkup={draft.bodyMarkup} />}
              />
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, textTransform: "capitalize" }}>{t.type.replace(/_/g, " ")}</div>
                </div>
                <Btn small variant="ghost" onClick={() => startEdit(t)}>Edit</Btn>
              </div>
            )}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Signatories ─────────────────────────────────────────────────────────────
function SignatoriesSection() {
  const [signatories, setSignatories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: "", title: "", email: "" });
  const [sigData, setSigData] = useState(null);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/signatories");
      const json = await r.json();
      if (r.ok) setSignatories(json.signatories || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    setErr(""); setMsg("");
    if (!form.fullName || !sigData) { setErr("Full name and a drawn signature are required."); return; }
    const r = await fetch("/api/admin/signatories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, signatureImageDataUrl: sigData }) });
    const json = await r.json();
    if (!r.ok) { setErr(json.error || "Failed to add signatory."); return; }
    auditLog("create_signatory", form.fullName);
    setForm({ fullName: "", title: "", email: "" }); setSigData(null);
    setMsg("Signatory added."); setTimeout(() => setMsg(""), 3000);
    load();
  }

  async function remove(s) {
    if (!confirm(`Remove signatory "${s.fullName}"?`)) return;
    const r = await fetch(`/api/admin/signatories?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
    if (r.ok) { auditLog("delete_signatory", s.fullName); load(); }
  }

  return (
    <div>
      <SectionCard style={{ marginBottom: 20 }}>
        <SectionTitle>Add signatory</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16, marginBottom: 14 }}>
          <div><Label>Full name</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
          <div><Label>Job title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><Label>Email (optional)</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        </div>
        <Label>Draw signature</Label>
        <SignaturePad onChange={setSigData} />
        <div style={{ marginTop: 14 }}><Btn onClick={add}>Add signatory</Btn></div>
        {err && <p style={{ color: C.rose, fontSize: 13, marginTop: 10 }}>{err}</p>}
        {msg && <p style={{ color: C.mint, fontSize: 13, marginTop: 10 }}>{msg}</p>}
      </SectionCard>

      <SectionCard>
        <SectionTitle>Signatories</SectionTitle>
        {loading && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>Loading…</p>}
        {!loading && signatories.length === 0 && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12 }}>No signatories yet.</p>}
        {signatories.map(s => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src={s.signatureImageDataUrl} alt={`${s.fullName} signature`} style={{ width: 90, height: 36, objectFit: "contain", background: "#fff", borderRadius: 6 }} />
              <div>
                <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{s.fullName}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{s.title}</div>
              </div>
            </div>
            <button type="button" onClick={() => remove(s)} style={{ background: "none", border: "none", color: C.rose, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Contracts ───────────────────────────────────────────────────────────────
function extractPlaceholders(bodyMarkup) {
  const found = new Set();
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let m;
  while ((m = re.exec(bodyMarkup || ""))) { if (m[1] !== "recipientName") found.add(m[1]); }
  return Array.from(found);
}

function ContractsSection() {
  const [contracts, setContracts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [signatories, setSignatories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ templateId: "", recipientName: "", recipientEmail: "", amount: "", currency: "NGN", signatoryIds: [], fillData: {} });
  const [expanded, setExpanded] = useState(null);
  const [milestoneTitle, setMilestoneTitle] = useState({});
  const [payments, setPayments] = useState([]);
  const [paymentLinks, setPaymentLinks] = useState({});
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [rC, rT, rS, rP] = await Promise.all([fetch("/api/admin/contracts"), fetch("/api/admin/templates"), fetch("/api/admin/signatories"), fetch("/api/admin/payments")]);
      const [jC, jT, jS, jP] = await Promise.all([rC.json(), rT.json(), rS.json(), rP.json()]);
      if (rC.ok) setContracts(jC.contracts || []);
      if (rT.ok) setTemplates(jT.templates || []);
      if (rS.ok) setSignatories(jS.signatories || []);
      if (rP.ok) setPayments(jP.payments || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function requestPayment(c) {
    const r = await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId: c.id }) });
    const json = await r.json();
    if (!r.ok) { alert(json.error || "Failed to create payment link."); return; }
    setPaymentLinks(links => ({ ...links, [c.id]: json.authorizationUrl }));
    auditLog("request_payment", c.title);
    load();
  }

  const selectedTemplate = templates.find(t => t.id === form.templateId);
  const placeholders = selectedTemplate ? extractPlaceholders(selectedTemplate.bodyMarkup) : [];

  async function compose() {
    setErr(""); setMsg("");
    if (!form.templateId || !form.recipientName) { setErr("Template and recipient name are required."); return; }
    const r = await fetch("/api/admin/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await r.json();
    if (!r.ok) { setErr(json.error || "Failed to create contract."); return; }
    auditLog("create_contract", form.recipientName);
    setForm({ templateId: "", recipientName: "", recipientEmail: "", amount: "", currency: "NGN", signatoryIds: [], fillData: {} });
    setShowCompose(false);
    setMsg("Draft created.");
    setTimeout(() => setMsg(""), 3000);
    load();
  }

  async function send(c) {
    if (!confirm(`Send "${c.title}" to ${c.recipientEmail}?`)) return;
    const r = await fetch("/api/admin/contracts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, action: "send" }) });
    const json = await r.json();
    if (!r.ok) { alert(json.error || "Failed to send."); return; }
    auditLog("send_contract", c.title);
    load();
  }

  async function cancelContract(c) {
    if (!confirm(`Cancel "${c.title}"?`)) return;
    const r = await fetch("/api/admin/contracts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, action: "cancel" }) });
    if (r.ok) { auditLog("cancel_contract", c.title); load(); }
  }

  async function addMilestone(c) {
    const title = milestoneTitle[c.id];
    if (!title) return;
    const r = await fetch("/api/admin/contracts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, action: "add_milestone", title }) });
    if (r.ok) { setMilestoneTitle(m => ({ ...m, [c.id]: "" })); load(); }
  }

  async function toggleMilestone(c, ms) {
    const status = ms.status === "completed" ? "pending" : "completed";
    const r = await fetch("/api/admin/contracts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, action: "update_milestone", milestoneId: ms.id, status }) });
    if (r.ok) { auditLog("update_milestone", `${c.title} — ${ms.title}`, status); load(); }
  }

  const statusColor = { draft: C.textMuted, sent: C.blue, signed: C.mint, active: C.mint, completed: C.gold, cancelled: C.rose };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Contracts" value={contracts.length} color={C.blue} icon="📑" />
        <StatCard label="Awaiting Signature" value={contracts.filter(c => c.status === "sent").length} color={C.amber} icon="⏳" />
        <StatCard label="Signed / Active" value={contracts.filter(c => ["signed", "active"].includes(c.status)).length} color={C.mint} icon="✅" />
      </div>

      <SectionCard style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Contracts</SectionTitle>
          <Btn small onClick={() => setShowCompose(s => !s)}>{showCompose ? "Cancel" : "+ Compose Document"}</Btn>
        </div>
        {showCompose && (
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
            <SplitEditor
              left={
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <Label>Template</Label>
                    <Select value={form.templateId} onChange={e => setForm(f => ({ ...f, templateId: e.target.value, fillData: {} }))}>
                      <option value="">Select a template…</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div><Label>Recipient name</Label><Input value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} /></div>
                    <div><Label>Recipient email</Label><Input type="email" value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))} /></div>
                    <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                    <div><Label>Currency</Label><Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}><option>NGN</option><option>USD</option></Select></div>
                  </div>
                  {placeholders.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <Label>Fill in the template fields</Label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {placeholders.map(p => (
                          <Input key={p} placeholder={p} value={form.fillData[p] || ""} onChange={e => setForm(f => ({ ...f, fillData: { ...f.fillData, [p]: e.target.value } }))} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <Label>Signatories</Label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {signatories.map(s => {
                        const active = form.signatoryIds.includes(s.id);
                        return (
                          <button key={s.id} type="button" onClick={() => setForm(f => ({ ...f, signatoryIds: active ? f.signatoryIds.filter(id => id !== s.id) : [...f.signatoryIds, s.id] }))}
                            style={{ background: active ? C.goldDim : C.surface, border: `1px solid ${active ? C.gold : C.border}`, borderRadius: 8, padding: "6px 12px", color: active ? C.gold : C.text, fontSize: 12.5, cursor: "pointer" }}>
                            {s.fullName}
                          </button>
                        );
                      })}
                      {signatories.length === 0 && <span style={{ color: C.textMuted, fontSize: 12.5 }}>No signatories yet — add one under Signatories.</span>}
                    </div>
                  </div>
                  <Btn onClick={compose}>Create draft & generate PDF</Btn>
                  {err && <p style={{ color: C.rose, fontSize: 13, marginTop: 10 }}>{err}</p>}
                </div>
              }
              right={
                selectedTemplate ? (
                  <LetterPreview
                    subject={selectedTemplate.name}
                    recipientName={form.recipientName}
                    recipientEmail={form.recipientEmail}
                    signatoryName={signatories.find(s => s.id === form.signatoryIds[0])?.fullName}
                    signatoryTitle={signatories.find(s => s.id === form.signatoryIds[0])?.title}
                    bodyMarkup={fillPlaceholders(selectedTemplate.bodyMarkup, form.fillData, form.recipientName)}
                  />
                ) : (
                  <div style={{ color: C.textMuted, fontSize: 13, fontFamily: font, padding: "40px 0", textAlign: "center" }}>Select a template to preview the letter.</div>
                )
              }
            />
          </div>
        )}
        {msg && <p style={{ color: C.mint, fontSize: 13, marginTop: 10 }}>{msg}</p>}
      </SectionCard>

      <SectionCard>
        {loading && <p style={{ color: C.textMuted, fontSize: 13 }}>Loading…</p>}
        {!loading && contracts.length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>No contracts yet — compose your first document above.</p>}
        {!loading && contracts.map(c => (
          <div key={c.id} style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(e => e === c.id ? null : c.id)}>
              <div>
                <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{c.recipientEmail} · {c.currency} {Number(c.amount).toLocaleString()}</div>
              </div>
              <Badge color={statusColor[c.status] || C.textMuted}>{c.status}</Badge>
            </div>
            {expanded === c.id && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}44` }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                  <a href={`/api/files/download?key=${encodeURIComponent(c.pdfKey)}`} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>View draft PDF →</a>
                  {c.signedPdfKey && <a href={`/api/files/download?key=${encodeURIComponent(c.signedPdfKey)}`} target="_blank" rel="noreferrer" style={{ color: C.mint, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>View signed PDF →</a>}
                  {c.status === "draft" && <Btn small onClick={() => send(c)}>Send for signature</Btn>}
                  {["signed", "active"].includes(c.status) && c.amount > 0 && <Btn small onClick={() => requestPayment(c)}>Request Payment</Btn>}
                  {!["signed", "active", "completed", "cancelled"].includes(c.status) && <Btn small danger onClick={() => cancelContract(c)}>Cancel</Btn>}
                </div>
                {paymentLinks[c.id] && (
                  <div style={{ background: C.goldDim, border: `1px solid ${C.gold}44`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12.5, color: C.text, wordBreak: "break-all" }}>
                    Payment link: <a href={paymentLinks[c.id]} target="_blank" rel="noreferrer" style={{ color: C.gold }}>{paymentLinks[c.id]}</a>
                  </div>
                )}
                {payments.filter(p => p.contractId === c.id).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Label>Payments</Label>
                    {payments.filter(p => p.contractId === c.id).map(p => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
                        <span style={{ color: C.text }}>{p.currency} {Number(p.amount).toLocaleString()} · {p.reference}</span>
                        <Badge color={p.status === "success" ? C.mint : p.status === "failed" ? C.rose : C.amber}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <Label>Milestones</Label>
                {(c.milestones || []).map(ms => (
                  <div key={ms.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <input type="checkbox" checked={ms.status === "completed"} onChange={() => toggleMilestone(c, ms)} />
                    <span style={{ color: ms.status === "completed" ? C.mint : C.text, fontSize: 13, textDecoration: ms.status === "completed" ? "line-through" : "none" }}>{ms.title}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Input placeholder="New milestone" value={milestoneTitle[c.id] || ""} onChange={e => setMilestoneTitle(m => ({ ...m, [c.id]: e.target.value }))} style={{ maxWidth: 240 }} />
                  <Btn small variant="ghost" onClick={() => addMilestone(c)}>+ Add</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ─── Payroll ─────────────────────────────────────────────────────────────────
function PayrollSection() {
  const [payroll, setPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", period: "", grossAmount: "", currency: "NGN" });
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [rP, rE] = await Promise.all([fetch("/api/admin/payroll"), fetch("/api/admin/employees")]);
      const [jP, jE] = await Promise.all([rP.json(), rE.json()]);
      if (rP.ok) setPayroll(jP.payroll || []);
      if (rE.ok) setEmployees(jE.employees || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function employeeName(id) { return employees.find(e => e.id === id)?.fullName || "Unknown"; }

  async function create() {
    setErr(""); setMsg("");
    if (!form.employeeId || !form.period || !form.grossAmount) { setErr("Employee, period, and gross amount are required."); return; }
    const r = await fetch("/api/admin/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await r.json();
    if (!r.ok) { setErr(json.error || "Failed to create payroll entry."); return; }
    auditLog("create_payroll", `${employeeName(form.employeeId)} — ${form.period}`);
    setForm({ employeeId: "", period: "", grossAmount: "", currency: "NGN" });
    setShowForm(false);
    setMsg("Draft payroll entry created.");
    setTimeout(() => setMsg(""), 3000);
    load();
  }

  async function issue(p) {
    if (!confirm(`Issue payslip for ${employeeName(p.employeeId)} — ${p.period}? This sends an email with the PDF attached.`)) return;
    const r = await fetch("/api/admin/payroll", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, action: "issue" }) });
    const json = await r.json();
    if (!r.ok) { alert(json.error || "Failed to issue payslip."); return; }
    auditLog("issue_payslip", `${employeeName(p.employeeId)} — ${p.period}`);
    load();
  }

  async function markPaid(p) {
    const r = await fetch("/api/admin/payroll", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, action: "mark_paid" }) });
    if (r.ok) { auditLog("mark_paid", `${employeeName(p.employeeId)} — ${p.period}`); load(); }
  }

  const statusColor = { draft: C.textMuted, issued: C.blue, paid: C.mint };

  return (
    <div>
      <SectionCard style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Payroll</SectionTitle>
          <Btn small onClick={() => setShowForm(s => !s)}>{showForm ? "Cancel" : "+ New Payroll Entry"}</Btn>
        </div>
        {showForm && (
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><Label>Employee</Label>
                <Select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                  <option value="">Select employee…</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </Select>
              </div>
              <div><Label>Period (e.g. 2026-09)</Label><Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="YYYY-MM" /></div>
              <div><Label>Gross amount</Label><Input type="number" value={form.grossAmount} onChange={e => setForm(f => ({ ...f, grossAmount: e.target.value }))} /></div>
              <div><Label>Currency</Label><Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}><option>NGN</option><option>USD</option></Select></div>
            </div>
            <Btn onClick={create}>Create draft entry</Btn>
            {err && <p style={{ color: C.rose, fontSize: 13, marginTop: 10 }}>{err}</p>}
          </div>
        )}
        {msg && <p style={{ color: C.mint, fontSize: 13, marginTop: 10 }}>{msg}</p>}
      </SectionCard>

      <SectionCard>
        {loading ? <p style={{ color: C.textMuted, fontSize: 13 }}>Loading…</p> : (
          <Table
            cols={[
              { key: "employee", label: "Employee", render: p => employeeName(p.employeeId) },
              { key: "period", label: "Period" },
              { key: "netAmount", label: "Net Pay", render: p => `${p.currency} ${Number(p.netAmount).toLocaleString()}` },
              { key: "status", label: "Status", render: p => <Badge color={statusColor[p.status]}>{p.status}</Badge> },
              { key: "actions", label: "", render: p => (
                <div style={{ display: "flex", gap: 6 }}>
                  {p.status === "draft" && <Btn small onClick={() => issue(p)}>Issue & Email</Btn>}
                  {p.status === "issued" && <Btn small variant="ghost" onClick={() => markPaid(p)}>Mark Paid</Btn>}
                  {p.payslipPdfKey && <a href={`/api/files/download?key=${encodeURIComponent(p.payslipPdfKey)}`} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 12, fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>PDF</a>}
                </div>
              ) },
            ]}
            rows={payroll}
            emptyMsg="No payroll entries yet."
          />
        )}
      </SectionCard>
    </div>
  );
}

// ─── Email Log ────────────────────────────────────────────────────────────────
function EmailLogSection() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/email-log");
      const json = await r.json();
      if (r.ok) setEmails(json.emails || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const kinds = Array.from(new Set(emails.map(e => e.kind)));
  const filtered = filter ? emails.filter(e => e.kind === filter) : emails;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Sent" value={emails.length} color={C.blue} icon="✉️" />
        <StatCard label="Delivered" value={emails.filter(e => e.ok).length} color={C.mint} icon="✅" />
        <StatCard label="Failed" value={emails.filter(e => !e.ok).length} color={C.rose} icon="⚠️" />
      </div>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>Email log</SectionTitle>
          <Select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="">All types</option>
            {kinds.map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
        </div>
        {loading ? <p style={{ color: C.textMuted, fontSize: 13 }}>Loading…</p> : (
          <Table
            cols={[
              { key: "sentAt", label: "Sent", render: e => new Date(e.sentAt).toLocaleString("en-NG") },
              { key: "to", label: "To" },
              { key: "subject", label: "Subject" },
              { key: "kind", label: "Type", render: e => <Badge color={C.textMuted}>{e.kind}</Badge> },
              { key: "ok", label: "Status", render: e => <Badge color={e.ok ? C.mint : C.rose}>{e.ok ? "sent" : "failed"}</Badge> },
            ]}
            rows={filtered}
            emptyMsg="No emails sent yet."
          />
        )}
      </SectionCard>
    </div>
  );
}

// ─── Section router ──────────────────────────────────────────────────────────
function DashboardContent({ active, session }) {
  switch (active) {
    case "dashboard":     return <DashboardOverview />;
    case "analytics":     return <AnalyticsSection />;
    case "live":          return <LiveVisitorsSection />;
    case "activities":    return <RecentActivitiesSection />;
    case "calendar":      return <CalendarSection />;
    case "health":        return <SystemHealthSection />;
    case "leads":         return <LeadsSection />;
    case "newsletter":    return <NewsletterSection />;
    case "chat":          return <ConversationsSection />;
    case "homepage":      return <HomepageSection />;
    case "announcements": return <AnnouncementsSection />;
    case "products":      return <ProductsSection />;
    case "services":      return <ServicesSection />;
    case "blog":          return <BlogSection />;
    case "portfolio":     return <PortfolioSection />;
    case "testimonials":  return <TestimonialsSection />;
    case "faqs":          return <FAQsSection />;
    case "team":          return <TeamSection />;
    case "careers":       return <CareersSection />;
    case "applicants":    return <ApplicantsSection />;
    case "events":        return <EventsSection />;
    case "seo":           return <SEOSection />;
    case "features":      return <FeatureFlagsSection />;
    case "clients":       return <ClientsSection />;
    case "menus":         return <MenusSection />;
    case "settings":      return <SettingsSection />;
    case "employees":      return <EmployeesSection />;
    case "weekly-reports": return <WeeklyReportsSection />;
    case "leave-requests": return <LeaveRequestsSection />;
    case "payroll":        return <PayrollSection />;
    case "templates":      return <TemplatesSection />;
    case "signatories":    return <SignatoriesSection />;
    case "contracts":      return <ContractsSection />;
    case "email-log":      return <EmailLogSection />;
    case "users":         return <UsersSection session={session} />;
    case "audit":         return <AuditSection />;
    case "media":         return <MediaSection />;
    case "backups":       return <BackupsSection />;
    default:              return <DashboardOverview />;
  }
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────
function adminInitials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
}

function TopBar({ session, active, navigate }) {
  const { data } = useAnalytics();
  const unread = data?.recentActivities?.length || 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14,
      padding: "14px clamp(20px, 3vw, 40px)", borderBottom: `1px solid ${C.border}`, background: C.surface,
    }}>
      <button type="button" onClick={() => navigate("activities")} title="Recent activity" style={{
        position: "relative", background: "none", border: `1px solid ${C.border}`, borderRadius: 10,
        width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
        color: active === "activities" ? C.gold : C.textMuted, cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderHover; }}
      onMouseLeave={e => { e.currentTarget.style.color = active === "activities" ? C.gold : C.textMuted; e.currentTarget.style.borderColor = C.border; }}>
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 3px",
            borderRadius: 999, background: C.rose, color: "#fff", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font,
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <div style={{ width: 1, height: 24, background: C.border }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.heading, fontFamily: font, lineHeight: 1.2 }}>{session.name}</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font, textTransform: "capitalize" }}>{session.adminRole || "Admin"}</div>
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", background: C.goldDim, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: font, flexShrink: 0,
        }}>
          {adminInitials(session.name)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Shell ────────────────────────────────────────────────────
export default function AdminDashboard({ setCurrentPage }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const applySession = useCallback((user) => {
    setSession(user);
    setCurrentAuditUser(user);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((user) => { if (!cancelled) { applySession(user); setChecking(false); } });
    const t = setInterval(async () => {
      const user = await fetchSession();
      if (!cancelled && !user) applySession(null);
    }, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [applySession]);

  if (checking) {
    return <div style={{ minHeight: "100vh", background: C.bg }} />;
  }

  if (!session) {
    return <AdminLogin onLogin={applySession} />;
  }

  function logout() {
    auditLog("logout", "admin", "Manual logout");
    serverLogout();
    applySession(null);
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
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }} title={sidebarOpen ? "Collapse" : "Expand"}>
            {sidebarOpen ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
          </button>
        </div>

        <div style={{ flex: 1 }}>
          {NAV_GROUPS.map(g => (
            <div key={g.label} style={{ padding: sidebarOpen ? "16px 12px 8px" : "16px 8px 8px" }}>
              {sidebarOpen && <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", padding: "0 8px 8px" }}>{g.label}</div>}
              {g.items.map(item => {
                const isActive = active === item.id;
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => navigate(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: sidebarOpen ? "10px 12px" : "10px 8px",
                    background: isActive ? C.gold : "none", border: "1px solid transparent",
                    borderRadius: 10, cursor: "pointer", color: isActive ? "#0A0E18" : C.textMuted, fontFamily: font,
                    fontSize: 14, fontWeight: isActive ? 700 : 400, marginBottom: 2, textAlign: "left",
                    transition: "all 0.15s", justifyContent: sidebarOpen ? "flex-start" : "center", boxShadow: isActive ? "0 4px 14px rgba(200,168,80,0.28)" : "none",
                  }}
                  title={!sidebarOpen ? item.label : ""}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.text; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMuted; } }}>
                    <Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
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
              <span style={{ color: C.text, fontWeight: 600 }}>{session.name}</span>
              {" · "}{session.adminRole}
            </div>
          )}
          <button type="button" onClick={logout} style={{
            width: "100%", padding: "9px 12px", background: C.roseDim, border: `1px solid ${C.rose}33`, color: C.rose,
            borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <LogOut size={15} />{sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowX: "hidden" }}>
        <TopBar session={session} active={active} navigate={navigate} />
        <div style={{ padding: "24px clamp(20px, 3vw, 40px) 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
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
        </div>
      </main>
    </div>
  );
}
