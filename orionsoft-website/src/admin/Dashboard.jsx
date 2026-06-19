import { useState, useEffect, useRef, useCallback } from "react";

// ─── Design tokens (mirror App.jsx) ─────────────────────────────────────────
const C = {
  bg: "#0A2540", surface: "#102A43", card: "#132F4C", cardHover: "#173B60",
  border: "rgba(255,255,255,0.09)", white: "#FFFFFF", text: "#D7E3EF",
  textMuted: "#8DA2B8", heading: "#F8FBFF", accent: "#38BDF8",
  accentDim: "rgba(56,189,248,0.14)", accentGlow: "rgba(56,189,248,0.28)",
  mint: "#2DD4BF", mintDim: "rgba(45,212,191,0.13)", purple: "#C4B5FD",
  purpleDim: "rgba(196,181,253,0.12)", amber: "#FCD34D",
  amberDim: "rgba(252,211,77,0.12)", rose: "#FDA4AF",
  roseDim: "rgba(253,164,175,0.12)", danger: "#F87171",
  dangerDim: "rgba(248,113,113,0.14)",
};
const font = "'Instrument Sans','DM Sans',system-ui,-apple-system,sans-serif";

// ─── Storage keys ────────────────────────────────────────────────────────────
const SK = {
  products:     "orionsoft_products_v1",
  portfolio:    "orionsoft_portfolio_v1",
  leads:        "orionsoft_leads_v1",
  blog:         "orionsoft_blog_v1",
  testimonials: "orionsoft_testimonials_v1",
  messages:     "orionsoft_messages_v1",
  media:        "orionsoft_media_v1",
  careers:      "orionsoft_careers_v1",
  settings:     "orionsoft_settings_v1",
  seo:          "orionsoft_seo_v1",
  users:        "orionsoft_users_v1",
  analytics:    "orionsoft_analytics_v1",
  faqs:         "orionsoft_faqs_v1",
  homepage:     "orionsoft_homepage_v1",
  clients:      "orionsoft_clients_v1",
  menus:        "orionsoft_menus_v1",
  team:         "orionsoft_team_v1",
  announcements:"orionsoft_announce_v1",
  conversations:"orionsoft_conversations_v1",
};

// ─── Local storage helpers ───────────────────────────────────────────────────
function ls(key, fallback = []) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  window.dispatchEvent(new CustomEvent("localstoreupdate", { detail: { key } }));
}
function uid() { return `i-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ─── Shared UI ───────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", small, disabled, style = {}, type }) {
  const base = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: font, fontWeight: 600, fontSize: small ? 13 : 14,
    padding: small ? "6px 14px" : "9px 20px",
    opacity: disabled ? 0.5 : 1, transition: "all 0.15s", display: "inline-flex",
    alignItems: "center", gap: 6, ...style,
  };
  const variants = {
    primary: { background: C.accent, color: C.bg },
    ghost:   { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
    danger:  { background: C.dangerDim, color: C.danger, border: `1px solid ${C.danger}33` },
    mint:    { background: C.mintDim, color: C.mint, border: `1px solid ${C.mint}33` },
  };
  return <button type={type || "button"} style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type = "text", rows, style = {} }) {
  const s = {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontFamily: font, fontSize: 14,
    padding: "9px 12px", outline: "none", boxSizing: "border-box", ...style,
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 5, fontWeight: 600 }}>{label}</div>}
      {rows
        ? <textarea style={{ ...s, resize: "vertical", minHeight: rows * 22 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
        : <input style={s} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 5, fontWeight: 600 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, color: C.text, fontFamily: font, fontSize: 14, padding: "9px 12px",
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14 }}>
      <div style={{
        width: 40, height: 22, borderRadius: 11, background: checked ? C.accent : C.border,
        position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 2, left: checked ? 20 : 2, transition: "left 0.2s",
        }} />
      </div>
      {label && <span style={{ color: C.text, fontSize: 14 }}>{label}</span>}
    </label>
  );
}

function Badge({ children, color = C.accent }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}33`,
      borderRadius: 6, fontSize: 11, fontWeight: 700, padding: "2px 8px",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>{children}</span>
  );
}

function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,37,64,0.85)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
        width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto",
        padding: 28, animation: "slideInRight 0.22s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ color: C.heading, fontSize: 18, fontWeight: 700 }}>{title}</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
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

function StatCard({ label, value, color = C.accent, icon }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "22px 24px", display: "flex", alignItems: "center", gap: 18, flex: "1 1 200px",
    }}>
      <div style={{ fontSize: 30 }}>{icon}</div>
      <div>
        <div style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ color, fontSize: 28, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
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

// ─── Sidebar nav items ───────────────────────────────────────────────────────
const NAV = [
  { id: "overview",       label: "Overview",        icon: "🏠" },
  { id: "analytics",      label: "Analytics",       icon: "📊" },
  { id: "leads",          label: "Leads",           icon: "📋" },
  { id: "homepage",       label: "Homepage",        icon: "🏗️" },
  { id: "announcements",  label: "Announcements",   icon: "📢" },
  { id: "products",       label: "Products",        icon: "📦" },
  { id: "portfolio",      label: "Portfolio",       icon: "🖼️" },
  { id: "blog",           label: "Blog",            icon: "✍️" },
  { id: "testimonials",   label: "Testimonials",    icon: "⭐" },
  { id: "faqs",           label: "FAQs",            icon: "❓" },
  { id: "clients",        label: "Clients",         icon: "🏢" },
  { id: "team",           label: "Team",            icon: "👥" },
  { id: "careers",        label: "Careers",         icon: "💼" },
  { id: "menus",          label: "Navigation",      icon: "🔗" },
  { id: "messages",       label: "Messages",        icon: "💬" },
  { id: "chat",           label: "AI Conversations",icon: "🤖" },
  { id: "media",          label: "Media Library",   icon: "🗂️" },
  { id: "settings",       label: "Settings",        icon: "⚙️" },
  { id: "seo",            label: "SEO",             icon: "🔍" },
  { id: "users",          label: "Users & Roles",   icon: "👤" },
  { id: "backups",        label: "Backups",         icon: "💾" },
];

// ─── Shell ───────────────────────────────────────────────────────────────────
function DashboardShell({ section, setSection, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? 64 : 220;
  const unread = ls(SK.messages, []).filter(m => !m.read).length;
  const newLeads = ls(SK.leads, []).filter(l => l.status === "New").length;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: font, background: C.bg, overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{
        width: W, minWidth: W, background: C.surface, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", transition: "width 0.2s",
        overflow: "hidden",
      }}>
        <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {!collapsed && <span style={{ color: C.accent, fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>Orion Admin</span>}
          <button type="button" onClick={() => setCollapsed(p => !p)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1, marginLeft: collapsed ? "auto" : 0 }}>{collapsed ? "→" : "←"}</button>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          {NAV.map(n => {
            const active = section === n.id;
            return (
              <button type="button" key={n.id} onClick={() => setSection(n.id)} style={{
                width: "100%", background: active ? C.accentDim : "transparent",
                border: "none", borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
                color: active ? C.accent : C.text, fontFamily: font, fontSize: 13, fontWeight: active ? 700 : 400,
                padding: collapsed ? "11px 0" : "11px 16px", cursor: "pointer", display: "flex",
                alignItems: "center", gap: 10, textAlign: "left", transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
                <span style={{ fontSize: 16, minWidth: 20, textAlign: "center" }}>{n.icon}</span>
                {!collapsed && <span style={{ flex: 1 }}>{n.label}</span>}
                {!collapsed && n.id === "messages" && unread > 0 && (
                  <span style={{ background: C.rose, color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>{unread}</span>
                )}
                {!collapsed && n.id === "leads" && newLeads > 0 && (
                  <span style={{ background: C.accent, color: C.bg, borderRadius: 10, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>{newLeads}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
          <button type="button" onClick={onLogout} style={{
            width: "100%", background: C.dangerDim, border: "none", borderRadius: 8,
            color: C.danger, fontFamily: font, fontSize: 12, fontWeight: 600,
            padding: collapsed ? "8px 0" : "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>🚪</span>{!collapsed && "Logout"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ color: C.heading, fontWeight: 700, fontSize: 16 }}>
            {NAV.find(n => n.id === section)?.icon} {NAV.find(n => n.id === section)?.label}
          </div>
          <div style={{ color: C.textMuted, fontSize: 13 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────
function OverviewSection() {
  const analytics   = ls(SK.analytics, []);
  const products    = ls(SK.products, []);
  const messages    = ls(SK.messages, []);
  const portfolio   = ls(SK.portfolio, []);
  const blog        = ls(SK.blog, []);
  const testimonials= ls(SK.testimonials, []);
  const leads       = ls(SK.leads, []);
  const unread      = messages.filter(m => !m.read).length;
  const newLeads    = leads.filter(l => l.status === "New").length;

  const today = new Date().toDateString();
  const todayViews = analytics.filter(e => new Date(e.ts).toDateString() === today).length;
  const totalViews = analytics.length;

  const recentMsgs = messages.slice(0, 5);
  const recentLeads = leads.slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: C.heading, fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Good {getGreeting()}, Admin 👋</h1>
        <p style={{ color: C.textMuted, margin: 0 }}>Here's what's happening with Orion Soft today.</p>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Page Views Today" value={todayViews} color={C.accent} icon="📈" />
        <StatCard label="Total Views" value={totalViews} color={C.mint} icon="👁️" />
        <StatCard label="New Leads" value={newLeads} color={newLeads ? C.accent : C.textMuted} icon="📋" />
        <StatCard label="Unread Messages" value={unread} color={unread ? C.rose : C.textMuted} icon="💬" />
        <StatCard label="Published Products" value={products.filter(p => p.published).length} color={C.purple} icon="📦" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.heading, fontWeight: 700, marginBottom: 16 }}>Content Summary</div>
          {[
            { label: "Products", val: products.length, color: C.accent },
            { label: "Portfolio", val: portfolio.length, color: C.mint },
            { label: "Blog Posts", val: blog.length, color: C.purple },
            { label: "Testimonials", val: testimonials.length, color: C.amber },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}33` }}>
              <span style={{ color: C.textMuted, fontSize: 14 }}>{item.label}</span>
              <span style={{ color: item.color, fontWeight: 700, fontSize: 14 }}>{item.val}</span>
            </div>
          ))}
        </div>

        <div style={{ background: C.card, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.heading, fontWeight: 700, marginBottom: 16 }}>Recent Messages</div>
          {recentMsgs.length === 0
            ? <div style={{ color: C.textMuted, fontSize: 14 }}>No messages yet.</div>
            : recentMsgs.map((m, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}33`, display: "flex", alignItems: "center", gap: 10 }}>
                {!m.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, display: "inline-block", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: m.read ? 400 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name || "Anonymous"} — {m.subject || m.message?.slice(0, 40) || "No subject"}
                  </div>
                  <div style={{ color: C.textMuted, fontSize: 11 }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Recent leads */}
      <div style={{ background: C.card, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
        <div style={{ color: C.heading, fontWeight: 700, marginBottom: 16 }}>Recent Leads</div>
        {recentLeads.length === 0
          ? <div style={{ color: C.textMuted, fontSize: 14 }}>No leads yet. Website enquiries will appear here automatically.</div>
          : recentLeads.map((l, i) => (
            <div key={i} style={{ padding: "9px 0", borderBottom: `1px solid ${C.border}33`, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: LEAD_STATUS_COLORS[l.status] || C.accent, display: "inline-block", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.contactName || "Anonymous"}{l.hospitalName ? ` · ${l.hospitalName}` : ""}
                </div>
                <div style={{ color: C.textMuted, fontSize: 11 }}>{l.interestedService} · {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ""}</div>
              </div>
              <span style={{ fontSize: 11, color: LEAD_STATUS_COLORS[l.status] || C.textMuted, fontWeight: 700, flexShrink: 0 }}>{l.status}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── Analytics ───────────────────────────────────────────────────────────────
function AnalyticsSection() {
  const analytics = ls(SK.analytics, []);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    return { label: d.toLocaleDateString("en-GB", { weekday: "short" }), count: analytics.filter(e => new Date(e.ts).toDateString() === key).length };
  });

  const pageCounts = analytics.reduce((acc, e) => { acc[e.page] = (acc[e.page] || 0) + 1; return acc; }, {});
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const maxCount = Math.max(...last7.map(d => d.count), 1);

  return (
    <div>
      <SectionHeader title="Analytics" />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Page Views" value={analytics.length} color={C.accent} icon="📊" />
        <StatCard label="Today" value={analytics.filter(e => new Date(e.ts).toDateString() === new Date().toDateString()).length} color={C.mint} icon="☀️" />
        <StatCard label="This Week" value={last7.reduce((s, d) => s + d.count, 0)} color={C.purple} icon="📅" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.heading, fontWeight: 700, marginBottom: 20 }}>Page Views — Last 7 Days</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
            {last7.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div style={{
                    width: "100%", background: C.accent, borderRadius: "4px 4px 0 0", opacity: 0.85,
                    height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? 4 : 0,
                    transition: "height 0.3s",
                  }} />
                </div>
                <div style={{ color: C.textMuted, fontSize: 11 }}>{d.label}</div>
                <div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{d.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.heading, fontWeight: 700, marginBottom: 16 }}>Top Pages</div>
          {topPages.length === 0
            ? <div style={{ color: C.textMuted, fontSize: 14 }}>No data yet.</div>
            : topPages.map(([page, count]) => (
              <div key={page} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}33` }}>
                <span style={{ color: C.text, fontSize: 13, textTransform: "capitalize" }}>{page}</span>
                <span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {analytics.length === 0 && (
        <div style={{ color: C.textMuted, textAlign: "center", padding: 40 }}>
          Analytics will populate as visitors browse the website.
        </div>
      )}
    </div>
  );
}

// ─── Products ────────────────────────────────────────────────────────────────
const EMPTY_PRODUCT = { name: "", tag: "", status: "live", published: true, primary: false, headline: "", desc: "", features: [], pricing: [], screenshots: [], ctaLabel: "", ctaAction: "contact", color: "#38BDF8" };
const STATUS_OPTS = [{ value: "live", label: "Live" }, { value: "beta", label: "Beta" }, { value: "coming-soon", label: "Coming Soon" }];
const STATUS_COLOR = { live: C.mint, beta: C.amber, "coming-soon": C.textMuted };

function ProductsSection() {
  const [products, setProducts] = useState(() => ls(SK.products, []));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [tab, setTab] = useState("info");
  const [confirm, setConfirm] = useState(null);
  const [featInput, setFeatInput] = useState("");

  const reload = useCallback(() => setProducts(ls(SK.products, [])), []);
  useEffect(() => { window.addEventListener("localstoreupdate", reload); return () => window.removeEventListener("localstoreupdate", reload); }, [reload]);

  const save = (list) => { lsSet(SK.products, list); setProducts(list); };
  const openNew = () => { setForm({ ...EMPTY_PRODUCT, features: [], pricing: [], screenshots: [] }); setEditing("new"); setTab("info"); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); setTab("info"); };
  const close = () => { setEditing(null); setFeatInput(""); };

  const submit = () => {
    if (!form.name.trim()) return;
    if (editing === "new") {
      const p = { ...form, id: uid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      save([...products, p]);
    } else {
      save(products.map(p => p.id === editing ? { ...form, updatedAt: new Date().toISOString() } : p));
    }
    close();
  };

  const addFeature = () => {
    if (!featInput.trim()) return;
    setForm(f => ({ ...f, features: [...(f.features || []), featInput.trim()] }));
    setFeatInput("");
  };

  const addPricingTier = () => {
    const tier = { id: uid(), name: "New Tier", beds: "", onboard: "", monthly: "", popular: false };
    setForm(f => ({ ...f, pricing: [...(f.pricing || []), tier] }));
  };

  const tabStyle = (t) => ({
    background: tab === t ? C.accentDim : "transparent", border: "none",
    color: tab === t ? C.accent : C.textMuted, borderRadius: 8, padding: "6px 14px",
    cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600,
  });

  return (
    <div>
      <SectionHeader title="Products" action={<Btn onClick={openNew}>+ Add Product</Btn>} />

      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          cols={[
            { key: "name", label: "Name", render: p => <span style={{ color: C.heading, fontWeight: 600 }}>{p.name}</span> },
            { key: "status", label: "Status", render: p => <Badge color={STATUS_COLOR[p.status]}>{p.status}</Badge> },
            { key: "published", label: "Published", render: p => <Badge color={p.published ? C.mint : C.textMuted}>{p.published ? "Yes" : "No"}</Badge> },
            { key: "actions", label: "", render: p => (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small variant="ghost" onClick={() => openEdit(p)}>Edit</Btn>
                <Btn small variant="danger" onClick={() => setConfirm(p.id)}>Delete</Btn>
              </div>
            )},
          ]}
          rows={products}
          emptyMsg="No products yet. Add your first product."
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!editing} onClose={close} title={editing === "new" ? "Add Product" : "Edit Product"} width={620}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["info", "features", "pricing", "screenshots"].map(t => (
            <button type="button" key={t} style={tabStyle(t)} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {tab === "info" && <>
          <Input label="Product Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. CareCore HMS" />
          <Input label="Tag Line" value={form.tag} onChange={v => setForm(f => ({ ...f, tag: v }))} placeholder="e.g. FLAGSHIP PRODUCT" />
          <Input label="Headline" value={form.headline} onChange={v => setForm(f => ({ ...f, headline: v }))} placeholder="Short compelling headline" />
          <Input label="Description" value={form.desc} onChange={v => setForm(f => ({ ...f, desc: v }))} placeholder="Detailed description" rows={3} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUS_OPTS} />
            <Input label="CTA Button Label" value={form.ctaLabel} onChange={v => setForm(f => ({ ...f, ctaLabel: v }))} placeholder="e.g. Explore CareCore" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Toggle checked={form.published} onChange={v => setForm(f => ({ ...f, published: v }))} label="Published" />
            <Toggle checked={form.primary} onChange={v => setForm(f => ({ ...f, primary: v }))} label="Flagship / Primary" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Accent Color</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["#38BDF8", "#2DD4BF", "#C4B5FD", "#FCD34D", "#D6B56D", "#FDA4AF"].map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                  border: form.color === c ? `3px solid #fff` : "3px solid transparent",
                }} />
              ))}
            </div>
          </div>
        </>}

        {tab === "features" && <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Features</div>
            {(form.features || []).map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <span style={{ color: C.mint, fontSize: 14 }}>✓</span>
                <input value={f} onChange={e => setForm(fr => ({ ...fr, features: fr.features.map((x, j) => j === i ? e.target.value : x) }))}
                  style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font, fontSize: 13, padding: "7px 10px" }} />
                <button type="button" onClick={() => setForm(fr => ({ ...fr, features: fr.features.filter((_, j) => j !== i) }))}
                  style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={featInput} onChange={e => setFeatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addFeature()}
              placeholder="Add a feature and press Enter or click Add"
              style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font, fontSize: 13, padding: "8px 12px" }} />
            <Btn small onClick={addFeature}>Add</Btn>
          </div>
        </>}

        {tab === "pricing" && <>
          <Btn small variant="ghost" style={{ marginBottom: 16 }} onClick={addPricingTier}>+ Add Tier</Btn>
          {(form.pricing || []).map((tier, i) => (
            <div key={tier.id} style={{ background: C.surface, borderRadius: 10, padding: 16, marginBottom: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Tier {i + 1}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, pricing: f.pricing.filter((_, j) => j !== i) }))}
                  style={{ background: "none", border: "none", color: C.danger, cursor: "pointer" }}>Remove</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input placeholder="Name (e.g. Clinic)" value={tier.name} onChange={e => setForm(f => ({ ...f, pricing: f.pricing.map((t, j) => j === i ? { ...t, name: e.target.value } : t) }))}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontFamily: font, fontSize: 13, padding: "7px 10px" }} />
                <input placeholder="Subtitle (e.g. 1–10 beds)" value={tier.beds} onChange={e => setForm(f => ({ ...f, pricing: f.pricing.map((t, j) => j === i ? { ...t, beds: e.target.value } : t) }))}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontFamily: font, fontSize: 13, padding: "7px 10px" }} />
                <input placeholder="Setup cost" value={tier.onboard} onChange={e => setForm(f => ({ ...f, pricing: f.pricing.map((t, j) => j === i ? { ...t, onboard: e.target.value } : t) }))}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontFamily: font, fontSize: 13, padding: "7px 10px" }} />
                <input placeholder="Monthly cost" value={tier.monthly} onChange={e => setForm(f => ({ ...f, pricing: f.pricing.map((t, j) => j === i ? { ...t, monthly: e.target.value } : t) }))}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontFamily: font, fontSize: 13, padding: "7px 10px" }} />
              </div>
              <Toggle checked={tier.popular} onChange={v => setForm(f => ({ ...f, pricing: f.pricing.map((t, j) => j === i ? { ...t, popular: v } : t) }))} label="Most Popular" />
            </div>
          ))}
        </>}

        {tab === "screenshots" && <>
          <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>Upload screenshots (max 2MB each). They'll be stored as base64 in localStorage.</div>
          <input type="file" accept="image/*" multiple onChange={async e => {
            const files = Array.from(e.target.files || []);
            for (const file of files) {
              if (file.size > 2 * 1024 * 1024) { alert(`${file.name} exceeds 2MB`); continue; }
              const url = await new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(file); });
              const s = { id: uid(), url, title: file.name.replace(/\.[^.]+$/, ""), desc: "" };
              setForm(f => ({ ...f, screenshots: [...(f.screenshots || []), s] }));
            }
            e.target.value = "";
          }} style={{ marginBottom: 16, color: C.text }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(form.screenshots || []).map((s, i) => (
              <div key={s.id} style={{ background: C.surface, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <img src={s.url} alt={s.title} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                <div style={{ padding: "8px 10px" }}>
                  <input value={s.title} onChange={e => setForm(f => ({ ...f, screenshots: f.screenshots.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))}
                    placeholder="Title" style={{ width: "100%", background: "transparent", border: "none", color: C.text, fontFamily: font, fontSize: 12, marginBottom: 4, outline: "none" }} />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => setForm(f => ({ ...f, screenshots: f.screenshots.filter((_, j) => j !== i) }))}
                      style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 12 }}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn onClick={submit}>{editing === "new" ? "Add Product" : "Save Changes"}</Btn>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => save(products.filter(p => p.id !== confirm))}
        message="Delete this product? This cannot be undone." />
    </div>
  );
}

// ─── Generic CRUD section factory ────────────────────────────────────────────
function CrudSection({ title, storageKey, fields, defaultItem, renderRow, emptyMsg }) {
  const [items, setItems] = useState(() => ls(storageKey, []));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultItem);
  const [confirm, setConfirm] = useState(null);

  const save = (list) => { lsSet(storageKey, list); setItems(list); };
  const openNew = () => { setForm({ ...defaultItem }); setEditing("new"); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id); };
  const close = () => setEditing(null);

  const submit = () => {
    const valid = fields.find(f => f.required);
    if (valid && !form[valid.key]?.toString().trim()) return;
    if (editing === "new") {
      save([...items, { ...form, id: uid(), createdAt: new Date().toISOString() }]);
    } else {
      save(items.map(i => i.id === editing ? { ...form, updatedAt: new Date().toISOString() } : i));
    }
    close();
  };

  return (
    <div>
      <SectionHeader title={title} action={<Btn onClick={openNew}>+ Add</Btn>} />
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          cols={[
            ...(renderRow ? renderRow : [{ key: "name", label: "Name" }]),
            { key: "_actions", label: "", render: item => (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
                <Btn small variant="danger" onClick={() => setConfirm(item.id)}>Delete</Btn>
              </div>
            )},
          ]}
          rows={items}
          emptyMsg={emptyMsg}
        />
      </div>

      <Modal open={!!editing} onClose={close} title={editing === "new" ? `Add ${title}` : `Edit ${title}`}>
        {fields.map(field => field.type === "select"
          ? <Select key={field.key} label={field.label} value={form[field.key] || ""} onChange={v => setForm(f => ({ ...f, [field.key]: v }))} options={field.options} />
          : field.type === "toggle"
          ? <Toggle key={field.key} checked={!!form[field.key]} onChange={v => setForm(f => ({ ...f, [field.key]: v }))} label={field.label} />
          : <Input key={field.key} label={field.label} value={form[field.key] || ""} onChange={v => setForm(f => ({ ...f, [field.key]: v }))} placeholder={field.placeholder} rows={field.rows} type={field.type || "text"} />
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn onClick={submit}>{editing === "new" ? "Add" : "Save"}</Btn>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => save(items.filter(i => i.id !== confirm))}
        message={`Delete this item? This cannot be undone.`} />
    </div>
  );
}

// ─── Portfolio ───────────────────────────────────────────────────────────────
const PORTFOLIO_INDUSTRIES = ["Healthcare", "Education", "Retail", "Logistics", "Finance", "Government", "Technology", "Other"];
const PORTFOLIO_STATUSES = ["Completed", "Ongoing", "Discovery", "Paused"];
const PIND_COLORS = { Healthcare: "#38BDF8", Education: "#2DD4BF", Retail: "#FCD34D", Logistics: "#C4B5FD", Finance: "#FDA4AF", Government: "#D6B56D", Technology: "#A78BFA", Other: "#8DA2B8" };
const PSTATUS_COLORS = { Completed: "#2DD4BF", Ongoing: "#38BDF8", Discovery: "#C4B5FD", Paused: "#8DA2B8" };

function PortfolioSection() {
  const [items, setItems] = useState(() => ls(SK.portfolio, []));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState("info");
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState("All");
  const [tagInput, setTagInput] = useState("");

  const reload = useCallback(() => setItems(ls(SK.portfolio, [])), []);
  useEffect(() => {
    window.addEventListener("localstoreupdate", reload);
    return () => window.removeEventListener("localstoreupdate", reload);
  }, [reload]);

  const emptyForm = () => ({
    clientName: "", clientLogoUrl: "", projectTitle: "", tagline: "",
    description: "", industry: "Healthcare", status: "Completed",
    year: new Date().getFullYear().toString(), screenshots: [],
    coverImage: "", tags: [], featured: false, featuredOrder: 0,
    published: true, testimonial: { quote: "", name: "", title: "" },
  });

  const save = (list) => { lsSet(SK.portfolio, list); setItems(list); };

  const openNew = () => { setForm(emptyForm()); setEditing("new"); setTab("info"); setTagInput(""); };
  const openEdit = (item) => {
    setForm({ ...emptyForm(), ...item, screenshots: item.screenshots || [], tags: item.tags || [], testimonial: item.testimonial || { quote: "", name: "", title: "" } });
    setEditing(item.id); setTab("info"); setTagInput("");
  };
  const close = () => setEditing(null);

  const submit = () => {
    if (!form.projectTitle?.trim()) return;
    const now = new Date().toISOString();
    if (editing === "new") {
      save([...items, { ...form, id: uid(), createdAt: now, updatedAt: now }]);
    } else {
      save(items.map(i => i.id === editing ? { ...form, updatedAt: now } : i));
    }
    close();
  };

  const toggleFeatured = (id) => save(items.map(i => i.id === id ? { ...i, featured: !i.featured } : i));

  const readFile = (file) => new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(file); });

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { alert("Logo must be under 1.5MB"); return; }
    const url = await readFile(file);
    setForm(f => ({ ...f, clientLogoUrl: url }));
    e.target.value = "";
  };

  const uploadScreenshots = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) { alert(`${file.name} exceeds 2MB`); continue; }
      const url = await readFile(file);
      const s = { id: uid(), url, caption: file.name.replace(/\.[^.]+$/, "") };
      setForm(f => ({ ...f, screenshots: [...(f.screenshots || []), s], coverImage: f.coverImage || url }));
    }
    e.target.value = "";
  };

  const addTag = () => {
    const t = tagInput.trim(); if (!t) return;
    if (!(form.tags || []).includes(t)) setForm(f => ({ ...f, tags: [...(f.tags || []), t] }));
    setTagInput("");
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: (f.tags || []).filter(t => t !== tag) }));
  const setCover = (url) => setForm(f => ({ ...f, coverImage: url }));
  const removeScreenshot = (sid) => setForm(f => {
    const remaining = (f.screenshots || []).filter(s => s.id !== sid);
    const removedUrl = (f.screenshots || []).find(s => s.id === sid)?.url;
    return { ...f, screenshots: remaining, coverImage: f.coverImage === removedUrl ? (remaining[0]?.url || "") : f.coverImage };
  });

  const filtered = filter === "All" ? items : items.filter(i => i.industry === filter);
  const featuredCount = items.filter(i => i.featured).length;
  const publishedCount = items.filter(i => i.published !== false).length;
  const activeIndustries = ["All", ...PORTFOLIO_INDUSTRIES.filter(ind => items.some(i => i.industry === ind))];

  const tabBtn = (t, label) => (
    <button type="button" key={t} onClick={() => setTab(t)} style={{
      background: tab === t ? C.accentDim : "transparent",
      border: tab === t ? `1px solid ${C.accent}44` : `1px solid ${C.border}`,
      color: tab === t ? C.accent : C.textMuted,
      borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600,
    }}>{label}</button>
  );

  const uploadBtnSt = {
    background: C.accentDim, border: `1px solid ${C.accent}33`, color: C.accent,
    borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, display: "inline-block",
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="Total Projects" value={items.length} color={C.accent} icon="🖼️" />
        <StatCard label="Featured" value={featuredCount} color={C.mint} icon="⭐" />
        <StatCard label="Published" value={publishedCount} color={C.purple} icon="✅" />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {activeIndustries.map(ind => (
            <button type="button" key={ind} onClick={() => setFilter(ind)} style={{
              background: filter === ind ? `${PIND_COLORS[ind] || C.accent}18` : "transparent",
              border: `1px solid ${filter === ind ? (PIND_COLORS[ind] || C.accent) + "55" : C.border}`,
              color: filter === ind ? (PIND_COLORS[ind] || C.accent) : C.textMuted,
              borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: font, fontSize: 12, fontWeight: 600,
            }}>{ind}</button>
          ))}
        </div>
        <Btn onClick={openNew}>+ Add Project</Btn>
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ color: C.textMuted, textAlign: "center", padding: "50px 20px", fontSize: 14 }}>
            {items.length === 0 ? "No portfolio projects yet. Add your first." : "No projects in this industry."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Cover", "Project", "Client", "Industry", "Status", "Year", "Featured", ""].map(h => (
                    <th key={h} style={{ color: C.textMuted, fontSize: 12, fontWeight: 700, textAlign: "left", padding: "10px 14px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "10px 14px" }}>
                      {(item.coverImage || item.screenshots?.[0]?.url) ? (
                        <img src={item.coverImage || item.screenshots[0].url} alt="" style={{ width: 52, height: 36, objectFit: "cover", borderRadius: 6, display: "block" }} />
                      ) : (
                        <div style={{ width: 52, height: 36, background: C.surface, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🖼️</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ color: C.heading, fontWeight: 600, fontSize: 14 }}>{item.projectTitle}</div>
                      {item.tagline && <div style={{ color: C.textMuted, fontSize: 12 }}>{item.tagline}</div>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {item.clientLogoUrl && <img src={item.clientLogoUrl} alt="" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 3 }} />}
                        <span style={{ color: C.text, fontSize: 13 }}>{item.clientName || "—"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}><Badge color={PIND_COLORS[item.industry] || C.textMuted}>{item.industry}</Badge></td>
                    <td style={{ padding: "10px 14px" }}><Badge color={PSTATUS_COLORS[item.status] || C.textMuted}>{item.status}</Badge></td>
                    <td style={{ padding: "10px 14px", color: C.text, fontSize: 13 }}>{item.year || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button type="button" onClick={() => toggleFeatured(item.id)} style={{
                        background: item.featured ? C.mintDim : "transparent",
                        border: `1px solid ${item.featured ? C.mint + "44" : C.border}`,
                        color: item.featured ? C.mint : C.textMuted,
                        borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: font, fontSize: 12, fontWeight: 700,
                      }}>{item.featured ? "★ On" : "☆ Off"}</button>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
                        <Btn small variant="danger" onClick={() => setConfirm(item.id)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={!!editing} onClose={close} title={editing === "new" ? "Add Portfolio Project" : "Edit Project"} width={720}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {tabBtn("info", "Project Info")}
          {tabBtn("classify", "Classify")}
          {tabBtn("screenshots", `Screenshots (${form.screenshots?.length || 0})`)}
          {tabBtn("testimonial", "Testimonial")}
        </div>

        {tab === "info" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Client Name" value={form.clientName || ""} onChange={v => setForm(f => ({ ...f, clientName: v }))} placeholder="e.g. St. Mary's Hospital" />
              <Input label="Project Year" value={form.year || ""} onChange={v => setForm(f => ({ ...f, year: v }))} placeholder="2025" />
            </div>
            <Input label="Project Title *" value={form.projectTitle || ""} onChange={v => setForm(f => ({ ...f, projectTitle: v }))} placeholder="e.g. Hospital Management System" />
            <Input label="Tagline (one-liner)" value={form.tagline || ""} onChange={v => setForm(f => ({ ...f, tagline: v }))} placeholder="e.g. Full HMS rollout in 3 weeks" />
            <Input label="Project Description" value={form.description || ""} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="What was built, the problem it solved, measurable outcomes." rows={4} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Client Logo</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {form.clientLogoUrl ? (
                  <div style={{ position: "relative" }}>
                    <img src={form.clientLogoUrl} alt="Logo" style={{ width: 68, height: 48, objectFit: "contain", background: "rgba(255,255,255,0.07)", borderRadius: 8, border: `1px solid ${C.border}`, padding: 4 }} />
                    <button type="button" onClick={() => setForm(f => ({ ...f, clientLogoUrl: "" }))} style={{ position: "absolute", top: -6, right: -6, background: C.danger, border: "none", borderRadius: "50%", width: 18, height: 18, color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ) : (
                  <div style={{ width: 68, height: 48, background: C.surface, borderRadius: 8, border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏢</div>
                )}
                <label style={uploadBtnSt}>
                  Upload Logo (≤1.5MB)
                  <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: "none" }} />
                </label>
                <span style={{ color: C.textMuted, fontSize: 12 }}>PNG, SVG, WebP — transparent preferred</span>
              </div>
            </div>
          </div>
        )}

        {tab === "classify" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Select label="Industry" value={form.industry || "Healthcare"} onChange={v => setForm(f => ({ ...f, industry: v }))} options={PORTFOLIO_INDUSTRIES.map(i => ({ value: i, label: i }))} />
              <Select label="Project Status" value={form.status || "Completed"} onChange={v => setForm(f => ({ ...f, status: v }))} options={PORTFOLIO_STATUSES.map(s => ({ value: s, label: s }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Tech Stack / Tags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, minHeight: 28 }}>
                {(form.tags || []).map(tag => (
                  <span key={tag} style={{ background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}33`, borderRadius: 6, fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="e.g. React, PostgreSQL, CareCore…"
                  style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font, fontSize: 13, padding: "8px 12px", outline: "none" }} />
                <Btn small onClick={addTag}>Add</Btn>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <Toggle checked={!!form.featured} onChange={v => setForm(f => ({ ...f, featured: v }))} label="Featured on Homepage" />
              <Toggle checked={form.published !== false} onChange={v => setForm(f => ({ ...f, published: v }))} label="Published" />
            </div>
            {form.featured && (
              <Input label="Featured Order (lower = shown first)" value={String(form.featuredOrder ?? 0)} type="number" onChange={v => setForm(f => ({ ...f, featuredOrder: parseInt(v) || 0 }))} placeholder="0" />
            )}
          </div>
        )}

        {tab === "screenshots" && (
          <div>
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 14 }}>Upload screenshots (max 2MB each). Click "Set Cover" to use one as the card thumbnail.</p>
            <label style={{ ...uploadBtnSt, marginBottom: 20 }}>
              + Upload Screenshots
              <input type="file" accept="image/*" multiple onChange={uploadScreenshots} style={{ display: "none" }} />
            </label>
            {(form.screenshots || []).length === 0 ? (
              <div style={{ color: C.textMuted, textAlign: "center", padding: 32, background: C.surface, borderRadius: 10, fontSize: 14 }}>No screenshots yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
                {(form.screenshots || []).map(s => (
                  <div key={s.id} style={{ background: C.surface, borderRadius: 10, overflow: "hidden", border: `2px solid ${form.coverImage === s.url ? C.mint : C.border}` }}>
                    <img src={s.url} alt={s.caption} style={{ width: "100%", height: 108, objectFit: "cover", display: "block" }} />
                    <div style={{ padding: "8px 10px" }}>
                      <input value={s.caption || ""} onChange={e => setForm(f => ({ ...f, screenshots: f.screenshots.map(x => x.id === s.id ? { ...x, caption: e.target.value } : x) }))}
                        placeholder="Caption" style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, fontFamily: font, fontSize: 12, outline: "none", marginBottom: 8, paddingBottom: 4 }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => setCover(s.url)} style={{ background: form.coverImage === s.url ? C.mintDim : C.card, border: `1px solid ${form.coverImage === s.url ? C.mint + "55" : C.border}`, color: form.coverImage === s.url ? C.mint : C.textMuted, borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontFamily: font, fontSize: 11 }}>
                          {form.coverImage === s.url ? "✓ Cover" : "Set Cover"}
                        </button>
                        <button type="button" onClick={() => removeScreenshot(s.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 12, fontFamily: font }}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "testimonial" && (
          <div>
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>Optional client quote to display with this project card.</p>
            <Input label="Quote" value={form.testimonial?.quote || ""} onChange={v => setForm(f => ({ ...f, testimonial: { ...f.testimonial, quote: v } }))} placeholder="Their exact words about the project…" rows={3} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Person's Name" value={form.testimonial?.name || ""} onChange={v => setForm(f => ({ ...f, testimonial: { ...f.testimonial, name: v } }))} placeholder="e.g. Dr. Amara Osei" />
              <Input label="Title / Role" value={form.testimonial?.title || ""} onChange={v => setForm(f => ({ ...f, testimonial: { ...f.testimonial, title: v } }))} placeholder="e.g. Medical Director, Lagos" />
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn onClick={submit} disabled={!form.projectTitle?.trim()}>{editing === "new" ? "Add Project" : "Save Changes"}</Btn>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { save(items.filter(i => i.id !== confirm)); setConfirm(null); }}
        message="Delete this project? This cannot be undone." />
    </div>
  );
}

// ─── Leads ───────────────────────────────────────────────────────────────────
const LEAD_STATUSES = ["New", "Contacted", "Demo Scheduled", "Proposal Sent", "Won", "Lost", "On Hold"];
const LEAD_STATUS_COLORS = { "New": "#38BDF8", "Contacted": "#C4B5FD", "Demo Scheduled": "#FCD34D", "Proposal Sent": "#FDA4AF", "Won": "#2DD4BF", "Lost": "#F87171", "On Hold": "#8DA2B8" };
const LEAD_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const LEAD_PRIORITY_COLORS = { Low: "#8DA2B8", Medium: "#FCD34D", High: "#FDA4AF", Urgent: "#F87171" };
const LEAD_SERVICES = ["CareCore HMS", "Custom Software", "Consultation", "Website Feedback", "Other"];

function LeadsSection() {
  const [items, setItems] = useState(() => ls(SK.leads, []));
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [detailTab, setDetailTab] = useState("details");
  const [editForm, setEditForm] = useState({});
  const [noteInput, setNoteInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const selected = items.find(l => l.id === selectedId) || null;

  const reload = useCallback(() => setItems(ls(SK.leads, [])), []);
  useEffect(() => {
    window.addEventListener("localstoreupdate", reload);
    return () => window.removeEventListener("localstoreupdate", reload);
  }, [reload]);

  useEffect(() => {
    if (selectedId) {
      const found = items.find(l => l.id === selectedId);
      if (found) setEditForm({ ...found });
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (list) => { lsSet(SK.leads, list); setItems(list); };

  const patchLead = (id, patch, histEntry) => {
    const now = new Date().toISOString();
    const updated = items.map(l => {
      if (l.id !== id) return l;
      const newHist = histEntry ? [...(l.history || []), { id: uid(), ...histEntry, ts: now }] : (l.history || []);
      return { ...l, ...patch, history: newHist, updatedAt: now };
    });
    save(updated);
    if (selectedId === id) setEditForm(prev => ({ ...prev, ...patch }));
  };

  const saveDetails = () => {
    const now = new Date().toISOString();
    const updated = items.map(l => l.id === selectedId
      ? { ...l, ...editForm, history: [...(l.history || []), { id: uid(), type: "updated", message: "Lead details updated", by: "Admin", ts: now }], updatedAt: now }
      : l
    );
    save(updated);
  };

  const savePipeline = () => {
    const original = items.find(l => l.id === selectedId);
    const demoChanged = original && original.demoDate !== editForm.demoDate && editForm.demoDate;
    patchLead(selectedId,
      { priority: editForm.priority, assignedTo: editForm.assignedTo, demoDate: editForm.demoDate, demoTime: editForm.demoTime, notes: editForm.notes },
      demoChanged
        ? { type: "demo", message: `Demo scheduled for ${editForm.demoDate}${editForm.demoTime ? ` at ${editForm.demoTime}` : ""}`, by: "Admin" }
        : { type: "updated", message: "Pipeline updated", by: "Admin" }
    );
  };

  const changeStatus = (id, status) => patchLead(id, { status }, { type: "status", message: `Status → ${status}`, by: "Admin" });

  const addNote = () => {
    if (!noteInput.trim() || !selectedId) return;
    patchLead(selectedId, {}, { type: "note", message: noteInput.trim(), by: "Admin" });
    setNoteInput("");
  };

  const emptyAddForm = () => ({
    contactName: "", hospitalName: "", company: "", phone: "", email: "", location: "",
    interestedService: "CareCore HMS", facilitySize: "", projectDesc: "",
    status: "New", priority: "Medium", assignedTo: "", demoDate: "", demoTime: "", notes: "",
  });

  const submitAdd = () => {
    if (!addForm.contactName?.trim() && !addForm.hospitalName?.trim()) return;
    const now = new Date().toISOString();
    const lead = { ...addForm, id: uid(), source: "Manual", history: [{ id: uid(), type: "created", message: "Lead added manually by admin", by: "Admin", ts: now }], createdAt: now, updatedAt: now };
    save([lead, ...items]);
    setShowAddModal(false);
  };

  const filtered = items.filter(l => {
    if (statusFilter !== "All" && l.status !== statusFilter) return false;
    if (serviceFilter !== "All" && l.interestedService !== serviceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![l.contactName, l.hospitalName, l.email, l.phone, l.company, l.location].some(f => (f || "").toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const newCount = items.filter(l => l.status === "New").length;
  const demoCount = items.filter(l => l.status === "Demo Scheduled").length;
  const wonCount = items.filter(l => l.status === "Won").length;

  const ef = editForm;
  const pSt = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font, fontSize: 13, padding: "8px 11px", width: "100%", boxSizing: "border-box", outline: "none" };
  const lSt = { color: C.textMuted, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 5, display: "block" };

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", minHeight: 0, overflow: "hidden" }}>

      {/* ── Main list panel ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingRight: 0 }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          <StatCard label="Total Leads" value={items.length} color={C.accent} icon="📋" />
          <StatCard label="New" value={newCount} color="#38BDF8" icon="🔔" />
          <StatCard label="Demo Scheduled" value={demoCount} color={C.amber} icon="📅" />
          <StatCard label="Won" value={wonCount} color={C.mint} icon="🏆" />
        </div>

        {/* Search + service filter + add button */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search name, org, email, phone…"
            style={{ flex: "1 1 200px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font, fontSize: 13, padding: "9px 14px", outline: "none" }} />
          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: font, fontSize: 13, padding: "9px 12px", cursor: "pointer", outline: "none" }}>
            <option value="All">All Services</option>
            {LEAD_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Btn onClick={() => { setAddForm(emptyAddForm()); setShowAddModal(true); }}>+ Add Lead</Btn>
        </div>

        {/* Status filter bar */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
          {["All", ...LEAD_STATUSES].map(s => {
            const cnt = s === "All" ? items.length : items.filter(l => l.status === s).length;
            const col = LEAD_STATUS_COLORS[s] || C.accent;
            return (
              <button type="button" key={s} onClick={() => setStatusFilter(s)} style={{
                background: statusFilter === s ? `${col}18` : "transparent",
                border: `1px solid ${statusFilter === s ? col + "55" : C.border}`,
                color: statusFilter === s ? col : C.textMuted,
                borderRadius: 8, padding: "5px 11px", cursor: "pointer", fontFamily: font, fontSize: 12, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 5,
              }}>
                {s} <span style={{ fontSize: 11, background: statusFilter === s ? col + "22" : "rgba(255,255,255,0.07)", borderRadius: 10, padding: "1px 6px" }}>{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* Leads table */}
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ color: C.textMuted, textAlign: "center", padding: "50px 20px", fontSize: 14 }}>
              {items.length === 0
                ? "No leads yet. Enquiries from the website form are captured here automatically."
                : "No leads match the current filters."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["Contact", "Hospital / Org", "Phone", "Email", "Service", "Status", "Priority", "Assigned", "Demo", ""].map(h => (
                      <th key={h} style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textAlign: "left", padding: "9px 12px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => {
                    const isSel = lead.id === selectedId;
                    const sc = LEAD_STATUS_COLORS[lead.status] || C.text;
                    return (
                      <tr key={lead.id} onClick={() => { setSelectedId(isSel ? null : lead.id); setDetailTab("details"); }}
                        style={{ borderBottom: `1px solid ${C.border}22`, cursor: "pointer", background: isSel ? C.accentDim : "transparent", transition: "background 0.12s" }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ color: C.heading, fontWeight: 600, fontSize: 13.5 }}>{lead.contactName || "—"}</div>
                          {lead.location && <div style={{ color: C.textMuted, fontSize: 11 }}>{lead.location}</div>}
                        </td>
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ color: C.text, fontSize: 13 }}>{lead.hospitalName || "—"}</div>
                          {lead.company && <div style={{ color: C.textMuted, fontSize: 11 }}>{lead.company}</div>}
                        </td>
                        <td style={{ padding: "11px 12px", color: C.text, fontSize: 13, whiteSpace: "nowrap" }}>{lead.phone || "—"}</td>
                        <td style={{ padding: "11px 12px", color: C.text, fontSize: 13, maxWidth: 155, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email || "—"}</td>
                        <td style={{ padding: "11px 12px" }}>
                          <Badge color={lead.interestedService === "CareCore HMS" ? C.accent : lead.interestedService === "Custom Software" ? C.mint : lead.interestedService === "Consultation" ? C.purple : C.textMuted}>
                            {lead.interestedService || "—"}
                          </Badge>
                        </td>
                        <td style={{ padding: "11px 12px" }} onClick={e => e.stopPropagation()}>
                          <select value={lead.status} onChange={e => changeStatus(lead.id, e.target.value)}
                            style={{ background: `${sc}18`, border: `1px solid ${sc}44`, color: sc, borderRadius: 6, padding: "4px 8px", fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer", outline: "none" }}>
                            {LEAD_STATUSES.map(s => <option key={s} value={s} style={{ background: C.bg, color: C.text }}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "11px 12px" }}>
                          <Badge color={LEAD_PRIORITY_COLORS[lead.priority] || C.textMuted}>{lead.priority || "Medium"}</Badge>
                        </td>
                        <td style={{ padding: "11px 12px", color: lead.assignedTo ? C.text : C.textMuted, fontSize: 13 }}>{lead.assignedTo || "—"}</td>
                        <td style={{ padding: "11px 12px", color: lead.demoDate ? C.amber : C.textMuted, fontSize: 13, whiteSpace: "nowrap" }}>
                          {lead.demoDate ? `${lead.demoDate}${lead.demoTime ? ` ${lead.demoTime}` : ""}` : "—"}
                        </td>
                        <td style={{ padding: "11px 12px" }} onClick={e => e.stopPropagation()}>
                          <Btn small variant="danger" onClick={() => setConfirm(lead.id)}>Del</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail side panel ── */}
      {selected && (
        <div style={{ width: 370, minWidth: 300, background: C.surface, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
          {/* Header */}
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.heading, fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.contactName || "Lead"}</div>
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.hospitalName || selected.company || "—"}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge color={LEAD_STATUS_COLORS[selected.status] || C.accent}>{selected.status}</Badge>
                <Badge color={LEAD_PRIORITY_COLORS[selected.priority] || C.textMuted}>{selected.priority || "Medium"}</Badge>
              </div>
            </div>
            <button type="button" onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 0 0 12px", flexShrink: 0 }}>×</button>
          </div>

          {/* Quick-status rail */}
          <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
            {LEAD_STATUSES.map(s => (
              <button type="button" key={s} onClick={() => changeStatus(selected.id, s)} style={{
                background: selected.status === s ? `${LEAD_STATUS_COLORS[s]}22` : "transparent",
                border: `1px solid ${selected.status === s ? LEAD_STATUS_COLORS[s] + "66" : C.border}`,
                color: selected.status === s ? LEAD_STATUS_COLORS[s] : C.textMuted,
                borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontFamily: font, fontSize: 10.5, fontWeight: 700,
              }}>{s}</button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {[["details", "Details"], ["pipeline", "Pipeline"], ["history", "History"]].map(([t, label]) => (
              <button type="button" key={t} onClick={() => setDetailTab(t)} style={{
                flex: 1, background: "none", border: "none",
                borderBottom: detailTab === t ? `2px solid ${C.accent}` : "2px solid transparent",
                color: detailTab === t ? C.accent : C.textMuted, fontFamily: font, fontSize: 12.5, fontWeight: 600,
                padding: "10px 6px", cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          {/* Tab body */}
          <div style={{ padding: "16px 18px", flex: 1, overflowY: "auto" }}>

            {/* ── Details tab ── */}
            {detailTab === "details" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div><label style={lSt}>CONTACT NAME</label><input value={ef.contactName || ""} onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value }))} style={pSt} /></div>
                  <div><label style={lSt}>PHONE</label><input value={ef.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} style={pSt} /></div>
                </div>
                <div style={{ marginBottom: 10 }}><label style={lSt}>EMAIL</label><input value={ef.email || ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={pSt} /></div>
                <div style={{ marginBottom: 10 }}><label style={lSt}>HOSPITAL / FACILITY</label><input value={ef.hospitalName || ""} onChange={e => setEditForm(f => ({ ...f, hospitalName: e.target.value }))} style={pSt} /></div>
                <div style={{ marginBottom: 10 }}><label style={lSt}>COMPANY / GROUP</label><input value={ef.company || ""} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} style={pSt} placeholder="Parent company (optional)" /></div>
                <div style={{ marginBottom: 10 }}><label style={lSt}>LOCATION</label><input value={ef.location || ""} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} style={pSt} /></div>
                <div style={{ marginBottom: 10 }}>
                  <label style={lSt}>INTERESTED SERVICE</label>
                  <select value={ef.interestedService || "CareCore HMS"} onChange={e => setEditForm(f => ({ ...f, interestedService: e.target.value }))} style={pSt}>
                    {LEAD_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {ef.facilitySize && (
                  <div style={{ marginBottom: 10 }}><label style={lSt}>FACILITY SIZE</label><input value={ef.facilitySize || ""} onChange={e => setEditForm(f => ({ ...f, facilitySize: e.target.value }))} style={pSt} /></div>
                )}
                {ef.projectDesc && (
                  <div style={{ marginBottom: 10 }}><label style={lSt}>PROJECT DESCRIPTION</label><textarea value={ef.projectDesc || ""} onChange={e => setEditForm(f => ({ ...f, projectDesc: e.target.value }))} rows={3} style={{ ...pSt, resize: "vertical" }} /></div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Btn onClick={saveDetails}>Save Details</Btn>
                </div>
                <div style={{ marginTop: 16, padding: "12px 14px", background: C.card, borderRadius: 8 }}>
                  <div style={{ color: C.textMuted, fontSize: 11 }}><span style={{ color: C.text, fontWeight: 600 }}>Source:</span> {selected.source || "Website Form"}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}><span style={{ color: C.text, fontWeight: 600 }}>Created:</span> {new Date(selected.createdAt).toLocaleString()}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}><span style={{ color: C.text, fontWeight: 600 }}>Updated:</span> {new Date(selected.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* ── Pipeline tab ── */}
            {detailTab === "pipeline" && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lSt}>PRIORITY</label>
                  <select value={ef.priority || "Medium"} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} style={pSt}>
                    {LEAD_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lSt}>ASSIGN FOLLOW-UP TO</label>
                  <input value={ef.assignedTo || ""} onChange={e => setEditForm(f => ({ ...f, assignedTo: e.target.value }))} style={pSt} placeholder="Team member name" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={lSt}>DEMO DATE</label>
                    <input type="date" value={ef.demoDate || ""} onChange={e => setEditForm(f => ({ ...f, demoDate: e.target.value }))} style={{ ...pSt, colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label style={lSt}>DEMO TIME</label>
                    <input type="time" value={ef.demoTime || ""} onChange={e => setEditForm(f => ({ ...f, demoTime: e.target.value }))} style={{ ...pSt, colorScheme: "dark" }} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lSt}>NOTES</label>
                  <textarea value={ef.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={4} style={{ ...pSt, resize: "vertical" }} placeholder="Follow-up notes, meeting details, next actions…" />
                </div>
                <Btn onClick={savePipeline}>Save Pipeline</Btn>
              </div>
            )}

            {/* ── History tab ── */}
            {detailTab === "history" && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={lSt}>ADD NOTE</label>
                  <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} rows={2}
                    placeholder="Call summary, next action, meeting notes…"
                    style={{ ...pSt, resize: "vertical", marginBottom: 8 }} />
                  <Btn small onClick={addNote}>Add Note</Btn>
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                  {(selected.history || []).length === 0 ? (
                    <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No activity yet.</div>
                  ) : (
                    <div>
                      {[...(selected.history || [])].reverse().map((h, i, arr) => {
                        const iconMap = { note: "📝", status: "🔄", demo: "📅", created: "✅", updated: "✏️" };
                        const dimMap = { note: C.purpleDim, status: C.accentDim, demo: C.amberDim, created: C.mintDim, updated: "rgba(255,255,255,0.06)" };
                        return (
                          <div key={h.id} style={{ display: "flex", gap: 10, paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                              <div style={{ width: 26, height: 26, borderRadius: "50%", background: dimMap[h.type] || C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                                {iconMap[h.type] || "•"}
                              </div>
                              {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 10, background: C.border, marginTop: 3 }} />}
                            </div>
                            <div style={{ paddingTop: 3, flex: 1 }}>
                              <div style={{ color: C.text, fontSize: 13, lineHeight: 1.5 }}>{h.message}</div>
                              <div style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>{h.by} · {new Date(h.ts).toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Lead Modal ── */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Lead Manually" width={580}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Contact Name" value={addForm.contactName || ""} onChange={v => setAddForm(f => ({ ...f, contactName: v }))} placeholder="Dr. Amara Osei" />
          <Input label="Phone" value={addForm.phone || ""} onChange={v => setAddForm(f => ({ ...f, phone: v }))} placeholder="080xxxxxxxx" />
        </div>
        <Input label="Email" value={addForm.email || ""} onChange={v => setAddForm(f => ({ ...f, email: v }))} placeholder="name@hospital.ng" />
        <Input label="Hospital / Facility *" value={addForm.hospitalName || ""} onChange={v => setAddForm(f => ({ ...f, hospitalName: v }))} placeholder="St. Mary's Hospital" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Company / Group" value={addForm.company || ""} onChange={v => setAddForm(f => ({ ...f, company: v }))} placeholder="Parent company" />
          <Input label="Location" value={addForm.location || ""} onChange={v => setAddForm(f => ({ ...f, location: v }))} placeholder="City, State" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="Interested Service" value={addForm.interestedService || "CareCore HMS"} onChange={v => setAddForm(f => ({ ...f, interestedService: v }))} options={LEAD_SERVICES.map(s => ({ value: s, label: s }))} />
          <Select label="Status" value={addForm.status || "New"} onChange={v => setAddForm(f => ({ ...f, status: v }))} options={LEAD_STATUSES.map(s => ({ value: s, label: s }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="Priority" value={addForm.priority || "Medium"} onChange={v => setAddForm(f => ({ ...f, priority: v }))} options={LEAD_PRIORITIES.map(p => ({ value: p, label: p }))} />
          <Input label="Assign To" value={addForm.assignedTo || ""} onChange={v => setAddForm(f => ({ ...f, assignedTo: v }))} placeholder="Team member" />
        </div>
        <Input label="Notes" value={addForm.notes || ""} onChange={v => setAddForm(f => ({ ...f, notes: v }))} placeholder="Initial notes…" rows={2} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Btn>
          <Btn onClick={submitAdd} disabled={!addForm.contactName?.trim() && !addForm.hospitalName?.trim()}>Add Lead</Btn>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { save(items.filter(l => l.id !== confirm)); if (selectedId === confirm) setSelectedId(null); setConfirm(null); }}
        message="Delete this lead? This cannot be undone." />
    </div>
  );
}

// ─── Blog ────────────────────────────────────────────────────────────────────
function BlogSection() {
  return (
    <CrudSection
      title="Blog Posts"
      storageKey={SK.blog}
      defaultItem={{ title: "", slug: "", excerpt: "", content: "", category: "", published: false, author: "Orion Soft" }}
      emptyMsg="No blog posts yet."
      fields={[
        { key: "title", label: "Title *", required: true, placeholder: "Post title" },
        { key: "slug", label: "Slug", placeholder: "url-friendly-slug" },
        { key: "category", label: "Category", placeholder: "e.g. Technology, Healthcare" },
        { key: "author", label: "Author", placeholder: "Author name" },
        { key: "excerpt", label: "Excerpt", placeholder: "Short summary shown in lists", rows: 2 },
        { key: "content", label: "Content (Markdown)", placeholder: "Full post content...", rows: 8 },
        { key: "published", label: "Published", type: "toggle" },
      ]}
      renderRow={[
        { key: "title", label: "Title", render: p => <span style={{ color: C.heading, fontWeight: 600 }}>{p.title}</span> },
        { key: "category", label: "Category" },
        { key: "author", label: "Author" },
        { key: "published", label: "Status", render: p => <Badge color={p.published ? C.mint : C.textMuted}>{p.published ? "Published" : "Draft"}</Badge> },
      ]}
    />
  );
}

// ─── Testimonials ────────────────────────────────────────────────────────────
function TestimonialsSection() {
  return (
    <CrudSection
      title="Testimonials"
      storageKey={SK.testimonials}
      defaultItem={{ name: "", role: "", company: "", quote: "", rating: 5, featured: false }}
      emptyMsg="No testimonials yet."
      fields={[
        { key: "name", label: "Name *", required: true, placeholder: "e.g. Dr. Amara Osei" },
        { key: "role", label: "Role", placeholder: "e.g. Medical Director" },
        { key: "company", label: "Company", placeholder: "e.g. Greenfield Hospital" },
        { key: "quote", label: "Testimonial *", required: false, placeholder: "Their exact words...", rows: 3 },
        { key: "rating", label: "Rating (1–5)", placeholder: "5", type: "number" },
        { key: "featured", label: "Show on Homepage", type: "toggle" },
      ]}
      renderRow={[
        { key: "name", label: "Name", render: p => <span style={{ color: C.heading, fontWeight: 600 }}>{p.name}</span> },
        { key: "role", label: "Role" },
        { key: "company", label: "Company" },
        { key: "rating", label: "Rating", render: p => <span style={{ color: C.amber }}>{"★".repeat(Number(p.rating) || 5)}</span> },
        { key: "featured", label: "Featured", render: p => p.featured ? <Badge color={C.mint}>Yes</Badge> : null },
      ]}
    />
  );
}

// ─── Messages ────────────────────────────────────────────────────────────────
function MessagesSection() {
  const [messages, setMessages] = useState(() => ls(SK.messages, []));
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const markRead = (id) => {
    const updated = messages.map(m => m.id === id ? { ...m, read: true } : m);
    lsSet(SK.messages, updated); setMessages(updated);
  };
  const del = (id) => {
    const updated = messages.filter(m => m.id !== id);
    lsSet(SK.messages, updated); setMessages(updated);
    if (selected?.id === id) setSelected(null);
  };
  const open = (m) => { setSelected(m); if (!m.read) markRead(m.id); };

  return (
    <div>
      <SectionHeader title="Messages" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, minHeight: 400 }}>
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "auto" }}>
          {messages.length === 0 && <div style={{ color: C.textMuted, padding: 30, textAlign: "center", fontSize: 14 }}>No messages yet.</div>}
          {messages.map(m => (
            <div key={m.id} onClick={() => open(m)} style={{
              padding: "14px 16px", borderBottom: `1px solid ${C.border}33`, cursor: "pointer",
              background: selected?.id === m.id ? C.accentDim : "transparent",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              {!m.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, marginTop: 5, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.heading, fontWeight: m.read ? 400 : 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || "Anonymous"}</div>
                <div style={{ color: C.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject || m.message?.slice(0, 50)}</div>
                <div style={{ color: C.textMuted, fontSize: 11 }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
          {!selected
            ? <div style={{ color: C.textMuted, textAlign: "center", marginTop: 60, fontSize: 14 }}>Select a message to read.</div>
            : <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ color: C.heading, fontWeight: 700, fontSize: 16 }}>{selected.name || "Anonymous"}</div>
                  <div style={{ color: C.textMuted, fontSize: 13 }}>{selected.email} · {selected.phone}</div>
                  <div style={{ color: C.textMuted, fontSize: 12 }}>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ""}</div>
                </div>
                <Btn small variant="danger" onClick={() => setConfirm(selected.id)}>Delete</Btn>
              </div>
              {selected.subject && <div style={{ color: C.accent, fontWeight: 600, marginBottom: 12 }}>{selected.subject}</div>}
              <div style={{ color: C.text, lineHeight: 1.7, fontSize: 14, whiteSpace: "pre-wrap" }}>{selected.message}</div>
            </>}
        </div>
      </div>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => del(confirm)} message="Delete this message?" />
    </div>
  );
}

// ─── Media Library ───────────────────────────────────────────────────────────
function MediaSection() {
  const [media, setMedia] = useState(() => ls(SK.media, []));
  const [confirm, setConfirm] = useState(null);

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    const newItems = [];
    for (const file of files) {
      if (file.size > 3 * 1024 * 1024) { alert(`${file.name} exceeds 3MB`); continue; }
      const url = await new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(file); });
      newItems.push({ id: uid(), url, name: file.name, type: file.type, size: file.size, createdAt: new Date().toISOString() });
    }
    const updated = [...media, ...newItems];
    lsSet(SK.media, updated); setMedia(updated);
    e.target.value = "";
  };

  const del = (id) => { const u = media.filter(m => m.id !== id); lsSet(SK.media, u); setMedia(u); };

  return (
    <div>
      <SectionHeader title="Media Library" action={
        <label style={{ background: C.accent, color: C.bg, borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: font }}>
          + Upload <input type="file" multiple accept="image/*,video/*,application/pdf" onChange={upload} style={{ display: "none" }} />
        </label>
      } />
      {media.length === 0
        ? <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>No media uploaded yet.</div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {media.map(item => (
            <div key={item.id} style={{ background: C.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
              {item.type?.startsWith("image/")
                ? <img src={item.url} alt={item.name} style={{ width: "100%", height: 120, objectFit: "cover" }} />
                : <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{item.type?.includes("pdf") ? "📄" : "📁"}</div>}
              <div style={{ padding: "8px 10px" }}>
                <div style={{ color: C.text, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                <div style={{ color: C.textMuted, fontSize: 11 }}>{(item.size / 1024).toFixed(0)} KB</div>
                <button type="button" onClick={() => setConfirm(item.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 11, padding: 0, marginTop: 4 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>}
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => del(confirm)} message="Delete this file?" />
    </div>
  );
}

// ─── Careers ─────────────────────────────────────────────────────────────────
function CareersSection() {
  return (
    <CrudSection
      title="Careers"
      storageKey={SK.careers}
      defaultItem={{ title: "", type: "Full-time", location: "", department: "", desc: "", requirements: "", active: true }}
      emptyMsg="No job postings yet."
      fields={[
        { key: "title", label: "Job Title *", required: true, placeholder: "e.g. Senior Backend Engineer" },
        { key: "department", label: "Department", placeholder: "e.g. Engineering, Design" },
        { key: "location", label: "Location", placeholder: "e.g. Lagos, Nigeria / Remote" },
        { key: "type", label: "Type", type: "select", options: [{ value: "Full-time", label: "Full-time" }, { value: "Part-time", label: "Part-time" }, { value: "Contract", label: "Contract" }, { value: "Internship", label: "Internship" }] },
        { key: "desc", label: "Job Description", placeholder: "Role responsibilities...", rows: 4 },
        { key: "requirements", label: "Requirements", placeholder: "Skills and qualifications...", rows: 4 },
        { key: "active", label: "Accepting Applications", type: "toggle" },
      ]}
      renderRow={[
        { key: "title", label: "Title", render: p => <span style={{ color: C.heading, fontWeight: 600 }}>{p.title}</span> },
        { key: "department", label: "Department" },
        { key: "type", label: "Type" },
        { key: "location", label: "Location" },
        { key: "active", label: "Status", render: p => <Badge color={p.active ? C.mint : C.textMuted}>{p.active ? "Active" : "Closed"}</Badge> },
      ]}
    />
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  companyName: "Orion Soft Limited", tagline: "Software that Works as Hard as You Do.",
  email: "orionsoftlimited@gmail.com", phone: "08169577059", rc: "9535128",
  address: "Nigeria", linkedin: "", twitter: "", github: "",
  ctaHeadline: "Build something exceptional.", ctaSubtext: "Ready to get started?",
};

function SettingsSection() {
  const [form, setForm] = useState(() => ls(SK.settings, DEFAULT_SETTINGS));
  const [saved, setSaved] = useState(false);

  const save = () => {
    lsSet(SK.settings, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const f = (key) => ({ value: form[key] || "", onChange: v => setForm(s => ({ ...s, [key]: v })) });

  return (
    <div>
      <SectionHeader title="Website Settings" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.heading, fontWeight: 700, marginBottom: 18 }}>Company Info</div>
          <Input label="Company Name" placeholder="Company name" {...f("companyName")} />
          <Input label="Tagline" placeholder="Your tagline" {...f("tagline")} />
          <Input label="Email" placeholder="contact@..." {...f("email")} />
          <Input label="Phone" placeholder="Phone number" {...f("phone")} />
          <Input label="RC Number" placeholder="CAC Registration" {...f("rc")} />
          <Input label="Address" placeholder="City, Country" {...f("address")} />
        </div>
        <div>
          <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <div style={{ color: C.heading, fontWeight: 700, marginBottom: 18 }}>Social Links</div>
            <Input label="LinkedIn URL" placeholder="https://linkedin.com/..." {...f("linkedin")} />
            <Input label="Twitter/X URL" placeholder="https://twitter.com/..." {...f("twitter")} />
            <Input label="GitHub URL" placeholder="https://github.com/..." {...f("github")} />
          </div>
          <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.heading, fontWeight: 700, marginBottom: 18 }}>CTA Section</div>
            <Input label="CTA Headline" placeholder="Main call to action" {...f("ctaHeadline")} />
            <Input label="CTA Subtext" placeholder="Supporting text" {...f("ctaSubtext")} />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <Btn onClick={save}>Save Settings</Btn>
        {saved && <span style={{ color: C.mint, fontSize: 14 }}>✓ Saved!</span>}
      </div>
    </div>
  );
}

// ─── SEO ─────────────────────────────────────────────────────────────────────
const SEO_PAGES = ["home", "products", "services", "work", "contact", "careers"];
const DEFAULT_SEO = {
  home:     { title: "Orion Soft Limited — Software that Works", desc: "Healthcare technology and custom software. CareCore HMS and bespoke business systems.", keywords: "hospital management system, custom software Nigeria" },
  products: { title: "Products — Orion Soft", desc: "CareCore HMS and custom software solutions.", keywords: "CareCore HMS, hospital software Nigeria" },
  services: { title: "Services — Orion Soft", desc: "Software development, consulting, and support.", keywords: "software development Lagos Nigeria" },
  work:     { title: "Our Work — Orion Soft", desc: "Portfolio of healthcare and enterprise software projects.", keywords: "software portfolio Nigeria" },
  contact:  { title: "Contact — Orion Soft", desc: "Get in touch with the Orion Soft team.", keywords: "contact Orion Soft Nigeria" },
  careers:  { title: "Careers — Orion Soft", desc: "Join the team building the future of healthcare technology.", keywords: "software jobs Nigeria" },
};

function SEOSection() {
  const [page, setPage] = useState("home");
  const [data, setData] = useState(() => ls(SK.seo, DEFAULT_SEO));
  const [saved, setSaved] = useState(false);

  const save = () => {
    lsSet(SK.seo, data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const cur = data[page] || { title: "", desc: "", keywords: "" };
  const upd = (key, val) => setData(d => ({ ...d, [page]: { ...cur, [key]: val } }));

  return (
    <div>
      <SectionHeader title="SEO Settings" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {SEO_PAGES.map(p => (
          <button type="button" key={p} onClick={() => setPage(p)} style={{
            background: page === p ? C.accentDim : C.card, border: page === p ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
            color: page === p ? C.accent : C.text, borderRadius: 8, padding: "7px 14px",
            cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, textTransform: "capitalize",
          }}>{p}</button>
        ))}
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
        <Input label="Page Title (< 60 chars)" value={cur.title} onChange={v => upd("title", v)} placeholder="Page Title — Brand" />
        <div style={{ color: C.textMuted, fontSize: 12, marginTop: -10, marginBottom: 14 }}>{cur.title?.length || 0}/60</div>
        <Input label="Meta Description (< 155 chars)" value={cur.desc} onChange={v => upd("desc", v)} placeholder="Short description for search engines" rows={3} />
        <div style={{ color: C.textMuted, fontSize: 12, marginTop: -10, marginBottom: 14 }}>{cur.desc?.length || 0}/155</div>
        <Input label="Keywords (comma-separated)" value={cur.keywords} onChange={v => upd("keywords", v)} placeholder="keyword1, keyword2" />
      </div>
      <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <Btn onClick={save}>Save SEO</Btn>
        {saved && <span style={{ color: C.mint, fontSize: 14 }}>✓ Saved!</span>}
      </div>
    </div>
  );
}

// ─── Users & Roles ───────────────────────────────────────────────────────────
const ROLES = ["Owner", "Admin", "Editor", "Viewer"];

function UsersSection() {
  const [users, setUsers] = useState(() => ls(SK.users, [{ id: "u-owner", name: "Owner", email: "orionsoftlimited@gmail.com", role: "Owner", createdAt: new Date().toISOString() }]));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "Editor" });
  const [confirm, setConfirm] = useState(null);

  const save = (list) => { lsSet(SK.users, list); setUsers(list); };
  const openNew = () => { setForm({ name: "", email: "", role: "Editor" }); setEditing("new"); };
  const close = () => setEditing(null);
  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editing === "new") save([...users, { ...form, id: uid(), createdAt: new Date().toISOString() }]);
    else save(users.map(u => u.id === editing ? { ...form, id: editing } : u));
    close();
  };

  return (
    <div>
      <SectionHeader title="Users & Roles" action={<Btn onClick={openNew}>+ Add User</Btn>} />
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 20, overflow: "hidden" }}>
        <Table
          cols={[
            { key: "name", label: "Name", render: u => <span style={{ color: C.heading, fontWeight: 600 }}>{u.name}</span> },
            { key: "email", label: "Email", render: u => <span style={{ color: C.textMuted }}>{u.email}</span> },
            { key: "role", label: "Role", render: u => <Badge color={u.role === "Owner" ? C.amber : u.role === "Admin" ? C.accent : C.mint}>{u.role}</Badge> },
            { key: "_actions", label: "", render: u => u.role !== "Owner" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small variant="ghost" onClick={() => { setForm({ name: u.name, email: u.email, role: u.role }); setEditing(u.id); }}>Edit</Btn>
                <Btn small variant="danger" onClick={() => setConfirm(u.id)}>Remove</Btn>
              </div>
            ) : null },
          ]}
          rows={users}
          emptyMsg="No users."
        />
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
        <div style={{ color: C.heading, fontWeight: 700, marginBottom: 14 }}>Role Permissions</div>
        {ROLES.map(role => (
          <div key={role} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}33` }}>
            <Badge color={role === "Owner" ? C.amber : role === "Admin" ? C.accent : role === "Editor" ? C.mint : C.textMuted}>{role}</Badge>
            <span style={{ color: C.text, fontSize: 13 }}>
              {role === "Owner" && "Full access to all dashboard features and settings."}
              {role === "Admin" && "Manage all content, users, and settings except billing."}
              {role === "Editor" && "Create and edit content; no user management or settings."}
              {role === "Viewer" && "Read-only access to analytics and content."}
            </span>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={close} title={editing === "new" ? "Add User" : "Edit User"}>
        <Input label="Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Full name" />
        <Input label="Email *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="user@example.com" type="email" />
        <Select label="Role" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} options={ROLES.map(r => ({ value: r, label: r }))} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn onClick={submit}>{editing === "new" ? "Add" : "Save"}</Btn>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => save(users.filter(u => u.id !== confirm))} message="Remove this user?" />
    </div>
  );
}

// ─── Backups ─────────────────────────────────────────────────────────────────
function BackupsSection() {
  const [status, setStatus] = useState("");

  const exportAll = () => {
    const data = {};
    Object.values(SK).forEach(key => {
      try { data[key] = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orionsoft-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setStatus("Backup downloaded.");
    setTimeout(() => setStatus(""), 3000);
  };

  const importAll = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([key, val]) => { if (val !== null) localStorage.setItem(key, JSON.stringify(val)); });
        setStatus("Backup restored! Refresh the page to see changes.");
        setTimeout(() => setStatus(""), 5000);
      } catch { setStatus("Invalid backup file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const clearKey = (key) => {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("localstoreupdate", { detail: { key } }));
    setStatus(`Cleared ${key}.`);
    setTimeout(() => setStatus(""), 3000);
  };

  return (
    <div>
      <SectionHeader title="Backups" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.heading, fontWeight: 700, marginBottom: 12 }}>Export Backup</div>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 20 }}>Download all website data (products, blog, portfolio, settings, etc.) as a JSON file.</p>
          <Btn onClick={exportAll} variant="mint">⬇ Download Backup</Btn>
        </div>
        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.heading, fontWeight: 700, marginBottom: 12 }}>Restore Backup</div>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 20 }}>Upload a previously exported backup file. This will overwrite current data.</p>
          <label style={{ background: C.amberDim, color: C.amber, border: `1px solid ${C.amber}33`, borderRadius: 8, padding: "9px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: font }}>
            ⬆ Restore from File <input type="file" accept=".json" onChange={importAll} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {status && <div style={{ background: C.mintDim, border: `1px solid ${C.mint}44`, borderRadius: 10, padding: "12px 18px", color: C.mint, marginBottom: 20, fontSize: 14 }}>{status}</div>}

      <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
        <div style={{ color: C.heading, fontWeight: 700, marginBottom: 14 }}>Data Management</div>
        <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>Reset individual data stores. Use with caution — this cannot be undone without a backup.</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(SK).map(([label, key]) => (
            <Btn key={key} small variant="danger" onClick={() => { if (window.confirm(`Clear all ${label} data?`)) clearKey(key); }}>Clear {label}</Btn>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FAQs ─────────────────────────────────────────────────────────────────────
function FAQsSection() {
  return (
    <CrudSection
      title="FAQs"
      storageKey={SK.faqs}
      defaultItem={{ question: "", answer: "", category: "General", order: 0, published: true }}
      emptyMsg="No FAQs yet."
      fields={[
        { key: "question", label: "Question *", required: true, placeholder: "e.g. How long does implementation take?" },
        { key: "answer", label: "Answer *", placeholder: "Your answer...", rows: 4 },
        { key: "category", label: "Category", type: "select", options: [
          { value: "General", label: "General" }, { value: "CareCore HMS", label: "CareCore HMS" },
          { value: "Pricing", label: "Pricing" }, { value: "Support", label: "Support" },
          { value: "Technical", label: "Technical" },
        ]},
        { key: "order", label: "Display Order", type: "number", placeholder: "0" },
        { key: "published", label: "Published", type: "toggle" },
      ]}
      renderRow={[
        { key: "question", label: "Question", render: f => <span style={{ color: C.heading, fontWeight: 600 }}>{f.question}</span> },
        { key: "category", label: "Category" },
        { key: "published", label: "Status", render: f => <Badge color={f.published ? C.mint : C.textMuted}>{f.published ? "Published" : "Draft"}</Badge> },
      ]}
    />
  );
}

// ─── Clients ──────────────────────────────────────────────────────────────────
function ClientsSection() {
  return (
    <CrudSection
      title="Clients"
      storageKey={SK.clients}
      defaultItem={{ name: "", logoUrl: "", industry: "", website: "", featured: false, published: true }}
      emptyMsg="No clients added yet."
      fields={[
        { key: "name", label: "Client Name *", required: true, placeholder: "e.g. Faith General Hospital" },
        { key: "logoUrl", label: "Logo URL", placeholder: "https://... (optional)" },
        { key: "industry", label: "Industry", placeholder: "e.g. Healthcare, Education" },
        { key: "website", label: "Website", placeholder: "https://..." },
        { key: "featured", label: "Featured on Homepage", type: "toggle" },
        { key: "published", label: "Visible", type: "toggle" },
      ]}
      renderRow={[
        { key: "name", label: "Name", render: c => <span style={{ color: C.heading, fontWeight: 600 }}>{c.name}</span> },
        { key: "industry", label: "Industry" },
        { key: "featured", label: "Featured", render: c => <Badge color={c.featured ? C.gold : C.textMuted}>{c.featured ? "Featured" : "—"}</Badge> },
        { key: "published", label: "Status", render: c => <Badge color={c.published ? C.mint : C.textMuted}>{c.published ? "Visible" : "Hidden"}</Badge> },
      ]}
    />
  );
}

// ─── Team ─────────────────────────────────────────────────────────────────────
function TeamSection() {
  return (
    <CrudSection
      title="Team"
      storageKey={SK.team}
      defaultItem={{ name: "", role: "", bio: "", photoUrl: "", linkedin: "", order: 0, published: true }}
      emptyMsg="No team members yet."
      fields={[
        { key: "name", label: "Full Name *", required: true, placeholder: "e.g. Mathew Famojuro" },
        { key: "role", label: "Role / Title *", placeholder: "e.g. Lead Engineer" },
        { key: "bio", label: "Bio", placeholder: "Short biography...", rows: 3 },
        { key: "photoUrl", label: "Photo URL", placeholder: "https://... (optional)" },
        { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/..." },
        { key: "order", label: "Display Order", type: "number", placeholder: "0" },
        { key: "published", label: "Visible", type: "toggle" },
      ]}
      renderRow={[
        { key: "name", label: "Name", render: m => <span style={{ color: C.heading, fontWeight: 600 }}>{m.name}</span> },
        { key: "role", label: "Role" },
        { key: "published", label: "Status", render: m => <Badge color={m.published ? C.mint : C.textMuted}>{m.published ? "Visible" : "Hidden"}</Badge> },
      ]}
    />
  );
}

// ─── Menus ─────────────────────────────────────────────────────────────────────
const DEFAULT_NAV_ITEMS = [
  { id: "n1", label: "Products",  page: "products",  active: true, order: 1 },
  { id: "n2", label: "Work",      page: "work",      active: true, order: 2 },
  { id: "n3", label: "Services",  page: "services",  active: true, order: 3 },
  { id: "n4", label: "About",     page: "about",     active: true, order: 4 },
  { id: "n5", label: "Contact",   page: "contact",   active: true, order: 5 },
];

function MenusSection() {
  const [items, setItems] = useState(() => ls(SK.menus, { main: DEFAULT_NAV_ITEMS }).main || DEFAULT_NAV_ITEMS);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const save = (list) => { lsSet(SK.menus, { main: list }); setItems(list); };
  const openNew = () => { setForm({ label: "", page: "", active: true, order: items.length + 1 }); setEditing("new"); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id); };
  const close = () => setEditing(null);
  const submit = () => {
    if (!form.label?.trim() || !form.page?.trim()) return;
    if (editing === "new") save([...items, { ...form, id: uid() }]);
    else save(items.map(i => i.id === editing ? { ...form } : i));
    close();
  };

  return (
    <div>
      <SectionHeader title="Navigation" action={<Btn onClick={openNew}>+ Add Link</Btn>} />
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>Manage the main nav links. Leave empty to use default navigation.</p>
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          cols={[
            { key: "label", label: "Label", render: m => <span style={{ color: C.heading, fontWeight: 600 }}>{m.label}</span> },
            { key: "page", label: "Page key" },
            { key: "order", label: "Order" },
            { key: "active", label: "Status", render: m => <Badge color={m.active ? C.mint : C.textMuted}>{m.active ? "Visible" : "Hidden"}</Badge> },
            { key: "_actions", label: "", render: item => (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
                <Btn small variant="danger" onClick={() => setConfirm(item.id)}>Delete</Btn>
              </div>
            )},
          ]}
          rows={items.sort((a, b) => (a.order || 0) - (b.order || 0))}
          emptyMsg="No custom nav items. Default navigation is active."
        />
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <Btn variant="ghost" small onClick={() => save([])}>Reset to Default</Btn>
      </div>
      <Modal open={!!editing} onClose={close} title={editing === "new" ? "Add Nav Link" : "Edit Nav Link"}>
        <Input label="Label *" value={form.label || ""} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. Products" />
        <Input label="Page Key *" value={form.page || ""} onChange={v => setForm(f => ({ ...f, page: v }))} placeholder="e.g. products, work, blog, team" />
        <Input label="Order" value={form.order || ""} onChange={v => setForm(f => ({ ...f, order: Number(v) || 0 }))} type="number" placeholder="1" />
        <Toggle checked={!!form.active} onChange={v => setForm(f => ({ ...f, active: v }))} label="Visible" />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn onClick={submit}>{editing === "new" ? "Add" : "Save"}</Btn>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => save(items.filter(i => i.id !== confirm))}
        message="Delete this nav link? This cannot be undone." />
    </div>
  );
}

// ─── Announcements ─────────────────────────────────────────────────────────────
function AnnouncementsSection() {
  const [form, setForm] = useState(() => ls(SK.announcements, {
    active: false, text: "", type: "info", link: "", linkText: "", dismissible: true,
  }));
  const [saved, setSaved] = useState(false);

  const save = () => {
    lsSet(SK.announcements, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const f = key => ({ value: form[key] || "", onChange: v => setForm(s => ({ ...s, [key]: v })) });

  return (
    <div>
      <SectionHeader title="Announcement Bar" />
      <div style={{ background: C.card, borderRadius: 14, padding: 28, border: `1px solid ${C.border}`, maxWidth: 680 }}>
        <Toggle checked={!!form.active} onChange={v => setForm(s => ({ ...s, active: v }))} label="Show announcement bar" />
        <div style={{ marginTop: 18 }}>
          <Input label="Message *" placeholder="e.g. We're accepting new clients for Q3 2026." {...f("text")} rows={2} />
          <Select label="Type" value={form.type || "info"} onChange={v => setForm(s => ({ ...s, type: v }))}
            options={[{ value: "info", label: "Info (blue)" }, { value: "warning", label: "Warning (gold)" }, { value: "success", label: "Success (green)" }]} />
          <Input label="Link URL (optional)" placeholder="https://..." {...f("link")} />
          <Input label="Link Text (optional)" placeholder="e.g. Learn more →" {...f("linkText")} />
          <Toggle checked={form.dismissible !== false} onChange={v => setForm(s => ({ ...s, dismissible: v }))} label="Allow users to dismiss" />
        </div>
        {form.active && form.text && (
          <div style={{ margin: "18px 0", padding: "12px 16px", background: form.type === "warning" ? "#D6B56D18" : form.type === "success" ? "#2DD4BF18" : "#38BDF818", border: `1px solid ${form.type === "warning" ? "#D6B56D44" : form.type === "success" ? "#2DD4BF44" : "#38BDF844"}`, borderRadius: 8, fontSize: 13.5, color: C.text, fontFamily: font }}>
            Preview: {form.text}{form.link && form.linkText && <span> · <u>{form.linkText}</u></span>}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
          <Btn onClick={save}>Save</Btn>
          {saved && <span style={{ color: C.mint, fontSize: 14 }}>✓ Saved!</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Homepage Editor ──────────────────────────────────────────────────────────
const DEFAULT_HP = {
  hero: { badge: "", words: [], subheadline: "", ctaPrimary: "", ctaSecondary: "", trustItems: [] },
  stats: [],
  whyUs: [],
  cta: { tag: "", headline: "", subtext: "", primaryText: "", secondaryText: "" },
};

function HomepageSection() {
  const [data, setData] = useState(() => ls(SK.homepage, DEFAULT_HP));
  const [tab, setTab] = useState("hero");
  const [saved, setSaved] = useState(false);

  const save = () => { lsSet(SK.homepage, data); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const upd = (section, key, val) => setData(d => ({ ...d, [section]: { ...d[section], [key]: val } }));
  const updList = (section, val) => setData(d => ({ ...d, [section]: val }));

  const TABS = [{ id: "hero", label: "Hero" }, { id: "stats", label: "Stats" }, { id: "whyus", label: "Why Us" }, { id: "cta", label: "CTA" }];

  return (
    <div>
      <SectionHeader title="Homepage Editor" />
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button type="button" key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? C.accentDim : C.card, border: `1px solid ${tab === t.id ? C.accent : C.border}`,
            color: tab === t.id ? C.accent : C.text, borderRadius: 8, padding: "8px 18px",
            fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "hero" && (
        <div style={{ background: C.card, borderRadius: 14, padding: 28, border: `1px solid ${C.border}`, maxWidth: 680 }}>
          <Input label="Badge text" placeholder="e.g. Now Available" value={data.hero?.badge || ""} onChange={v => upd("hero", "badge", v)} />
          <Input label="Hero words (comma separated)" placeholder="Hospitals, Clinics, Operations" value={(data.hero?.words || []).join(", ")} onChange={v => upd("hero", "words", v.split(",").map(s => s.trim()).filter(Boolean))} />
          <Input label="Subheadline" placeholder="Supporting hero text..." value={data.hero?.subheadline || ""} onChange={v => upd("hero", "subheadline", v)} rows={2} />
          <Input label="Primary CTA" placeholder="e.g. Start Your Project →" value={data.hero?.ctaPrimary || ""} onChange={v => upd("hero", "ctaPrimary", v)} />
          <Input label="Secondary CTA" placeholder="e.g. See CareCore HMS" value={data.hero?.ctaSecondary || ""} onChange={v => upd("hero", "ctaSecondary", v)} />
          <Input label="Trust items (comma separated)" placeholder="Free consultation, No commitment, 24h response" value={(data.hero?.trustItems || []).join(", ")} onChange={v => upd("hero", "trustItems", v.split(",").map(s => s.trim()).filter(Boolean))} />
        </div>
      )}

      {tab === "stats" && (
        <div style={{ background: C.card, borderRadius: 14, padding: 28, border: `1px solid ${C.border}`, maxWidth: 680 }}>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 18 }}>Enter stats as JSON array: <code style={{ background: C.surface, padding: "2px 6px", borderRadius: 4 }}>[{`{"value":"12+","label":"Clients"}`}]</code></p>
          <Input label="Stats JSON" rows={8}
            value={JSON.stringify(data.stats || [], null, 2)}
            onChange={v => { try { updList("stats", JSON.parse(v)); } catch {} }}
          />
        </div>
      )}

      {tab === "whyus" && (
        <div style={{ background: C.card, borderRadius: 14, padding: 28, border: `1px solid ${C.border}`, maxWidth: 680 }}>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 18 }}>Enter items as JSON array: <code style={{ background: C.surface, padding: "2px 6px", borderRadius: 4 }}>[{`{"title":"Fast","desc":"We ship quickly."}`}]</code></p>
          <Input label="Why Us JSON" rows={8}
            value={JSON.stringify(data.whyUs || [], null, 2)}
            onChange={v => { try { updList("whyUs", JSON.parse(v)); } catch {} }}
          />
        </div>
      )}

      {tab === "cta" && (
        <div style={{ background: C.card, borderRadius: 14, padding: 28, border: `1px solid ${C.border}`, maxWidth: 680 }}>
          <Input label="CTA Tag" placeholder="e.g. READY WHEN YOU ARE" value={data.cta?.tag || ""} onChange={v => upd("cta", "tag", v)} />
          <Input label="CTA Headline" placeholder="e.g. Ship software your team will actually use." value={data.cta?.headline || ""} onChange={v => upd("cta", "headline", v)} />
          <Input label="CTA Subtext" placeholder="Supporting paragraph..." value={data.cta?.subtext || ""} onChange={v => upd("cta", "subtext", v)} rows={3} />
          <Input label="Primary Button Text" placeholder="e.g. Start Your Project →" value={data.cta?.primaryText || ""} onChange={v => upd("cta", "primaryText", v)} />
          <Input label="Secondary Button Text" placeholder="e.g. See CareCore HMS" value={data.cta?.secondaryText || ""} onChange={v => upd("cta", "secondaryText", v)} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
        <Btn onClick={save}>Save Homepage</Btn>
        {saved && <span style={{ color: C.mint, fontSize: 14 }}>✓ Saved!</span>}
      </div>
    </div>
  );
}

// ─── Section router ──────────────────────────────────────────────────────────
// ─── AI Conversations (Ori chatbot) ──────────────────────────────────────────
function ConversationsSection() {
  const [convs, setConvs] = useState(() => ls(SK.conversations, []));
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const handler = () => setConvs(ls(SK.conversations, []));
    window.addEventListener("localstoreupdate", handler);
    return () => window.removeEventListener("localstoreupdate", handler);
  }, []);

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
      <SectionHeader title="AI Conversations" action={<Btn variant="ghost" small onClick={exportCSV}>Export CSV</Btn>} />

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

function DashboardContent({ section }) {
  switch (section) {
    case "overview":       return <OverviewSection />;
    case "analytics":      return <AnalyticsSection />;
    case "leads":          return <LeadsSection />;
    case "homepage":       return <HomepageSection />;
    case "announcements":  return <AnnouncementsSection />;
    case "products":       return <ProductsSection />;
    case "portfolio":      return <PortfolioSection />;
    case "blog":           return <BlogSection />;
    case "testimonials":   return <TestimonialsSection />;
    case "faqs":           return <FAQsSection />;
    case "clients":        return <ClientsSection />;
    case "team":           return <TeamSection />;
    case "careers":        return <CareersSection />;
    case "menus":          return <MenusSection />;
    case "messages":       return <MessagesSection />;
    case "chat":           return <ConversationsSection />;
    case "media":          return <MediaSection />;
    case "settings":       return <SettingsSection />;
    case "seo":            return <SEOSection />;
    case "users":          return <UsersSection />;
    case "backups":        return <BackupsSection />;
    default:               return <OverviewSection />;
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────
const ADMIN_SESSION_KEY = "orionsoft_admin_v1";
// WARNING: This is a client-side password check appropriate only for a lightweight CMS demo/prototype.
// It does NOT provide real security — the password is visible in the JS bundle.
// Before production use, replace with a proper server-side authentication endpoint.
const ADMIN_PASSWORD = (typeof import.meta !== "undefined" && import.meta.env?.VITE_ADMIN_PASSWORD) || "orionsoft2026";

function DashboardLogin({ onAuth }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      onAuth();
    } else {
      setErr("Incorrect password."); setPw("");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: font, padding: 20,
    }}>
      <div style={{ background: C.surface, borderRadius: 20, padding: 48, width: "100%", maxWidth: 420, border: `1px solid ${C.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <div style={{ color: C.heading, fontSize: 22, fontWeight: 800 }}>Admin Dashboard</div>
          <div style={{ color: C.textMuted, fontSize: 14, marginTop: 6 }}>Orion Soft Limited</div>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Password</div>
            <div style={{ position: "relative" }}>
              <input
                type={show ? "text" : "password"} value={pw} onChange={e => { setPw(e.target.value); setErr(""); }}
                placeholder="Enter admin password" autoFocus
                style={{
                  width: "100%", background: C.card, border: `1px solid ${err ? C.danger : C.border}`,
                  borderRadius: 10, color: C.text, fontFamily: font, fontSize: 15,
                  padding: "12px 44px 12px 14px", boxSizing: "border-box", outline: "none",
                }}
              />
              <button type="button" onClick={() => setShow(s => !s)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16,
              }}>{show ? "🙈" : "👁️"}</button>
            </div>
            {err && <div style={{ color: C.danger, fontSize: 13, marginTop: 8 }}>{err}</div>}
          </div>
          <button type="submit" style={{
            width: "100%", background: C.accent, color: C.bg, border: "none", borderRadius: 10,
            padding: "13px 0", fontFamily: font, fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem(ADMIN_SESSION_KEY));
  const [section, setSection] = useState("overview");

  const logout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthed(false);
  };

  if (!authed) return <DashboardLogin onAuth={() => setAuthed(true)} />;

  return (
    <DashboardShell section={section} setSection={setSection} onLogout={logout}>
      <DashboardContent section={section} />
    </DashboardShell>
  );
}
