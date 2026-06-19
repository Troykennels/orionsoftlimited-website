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
  products:    "orionsoft_products_v1",
  portfolio:   "orionsoft_portfolio_v1",
  blog:        "orionsoft_blog_v1",
  testimonials:"orionsoft_testimonials_v1",
  messages:    "orionsoft_messages_v1",
  media:       "orionsoft_media_v1",
  careers:     "orionsoft_careers_v1",
  settings:    "orionsoft_settings_v1",
  seo:         "orionsoft_seo_v1",
  users:       "orionsoft_users_v1",
  analytics:   "orionsoft_analytics_v1",
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
function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
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
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
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
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
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
  { id: "overview",      label: "Overview",       icon: "🏠" },
  { id: "analytics",     label: "Analytics",      icon: "📊" },
  { id: "products",      label: "Products",       icon: "📦" },
  { id: "portfolio",     label: "Portfolio",      icon: "🖼️" },
  { id: "blog",          label: "Blog",           icon: "✍️" },
  { id: "testimonials",  label: "Testimonials",   icon: "⭐" },
  { id: "messages",      label: "Messages",       icon: "💬" },
  { id: "media",         label: "Media Library",  icon: "🗂️" },
  { id: "careers",       label: "Careers",        icon: "💼" },
  { id: "settings",      label: "Settings",       icon: "⚙️" },
  { id: "seo",           label: "SEO",            icon: "🔍" },
  { id: "users",         label: "Users & Roles",  icon: "👤" },
  { id: "backups",       label: "Backups",        icon: "💾" },
];

// ─── Shell ───────────────────────────────────────────────────────────────────
function DashboardShell({ section, setSection, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? 64 : 220;
  const unread = ls(SK.messages, []).filter(m => !m.read).length;

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
          <button onClick={() => setCollapsed(p => !p)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1, marginLeft: collapsed ? "auto" : 0 }}>{collapsed ? "→" : "←"}</button>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          {NAV.map(n => {
            const active = section === n.id;
            return (
              <button key={n.id} onClick={() => setSection(n.id)} style={{
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
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onLogout} style={{
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
  const unread      = messages.filter(m => !m.read).length;

  const today = new Date().toDateString();
  const todayViews = analytics.filter(e => new Date(e.ts).toDateString() === today).length;
  const totalViews = analytics.length;

  const recentMsgs = messages.slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: C.heading, fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Good {getGreeting()}, Admin 👋</h1>
        <p style={{ color: C.textMuted, margin: 0 }}>Here's what's happening with Orion Soft today.</p>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Page Views Today" value={todayViews} color={C.accent} icon="📈" />
        <StatCard label="Total Views" value={totalViews} color={C.mint} icon="👁️" />
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
            <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
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
                <button onClick={() => setForm(fr => ({ ...fr, features: fr.features.filter((_, j) => j !== i) }))}
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
                <button onClick={() => setForm(f => ({ ...f, pricing: f.pricing.filter((_, j) => j !== i) }))}
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
                    <button onClick={() => setForm(f => ({ ...f, screenshots: f.screenshots.filter((_, j) => j !== i) }))}
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
function PortfolioSection() {
  return (
    <CrudSection
      title="Portfolio"
      storageKey={SK.portfolio}
      defaultItem={{ title: "", client: "", category: "", year: "", desc: "", url: "", featured: false }}
      emptyMsg="No portfolio items yet."
      fields={[
        { key: "title", label: "Project Title *", required: true, placeholder: "e.g. Hospital Management System" },
        { key: "client", label: "Client", placeholder: "e.g. St. Mary's Hospital" },
        { key: "category", label: "Category", placeholder: "e.g. Healthcare, Fintech, Logistics" },
        { key: "year", label: "Year", placeholder: "e.g. 2025" },
        { key: "desc", label: "Description", placeholder: "Brief project summary", rows: 3 },
        { key: "url", label: "URL (optional)", placeholder: "https://..." },
        { key: "featured", label: "Featured on Homepage", type: "toggle" },
      ]}
      renderRow={[
        { key: "title", label: "Title", render: p => <span style={{ color: C.heading, fontWeight: 600 }}>{p.title}</span> },
        { key: "client", label: "Client" },
        { key: "category", label: "Category" },
        { key: "featured", label: "Featured", render: p => p.featured ? <Badge color={C.mint}>Yes</Badge> : null },
      ]}
    />
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
                <button onClick={() => setConfirm(item.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 11, padding: 0, marginTop: 4 }}>Delete</button>
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
          <button key={p} onClick={() => setPage(p)} style={{
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

// ─── Section router ──────────────────────────────────────────────────────────
function DashboardContent({ section }) {
  switch (section) {
    case "overview":     return <OverviewSection />;
    case "analytics":    return <AnalyticsSection />;
    case "products":     return <ProductsSection />;
    case "portfolio":    return <PortfolioSection />;
    case "blog":         return <BlogSection />;
    case "testimonials": return <TestimonialsSection />;
    case "messages":     return <MessagesSection />;
    case "media":        return <MediaSection />;
    case "careers":      return <CareersSection />;
    case "settings":     return <SettingsSection />;
    case "seo":          return <SEOSection />;
    case "users":        return <UsersSection />;
    case "backups":      return <BackupsSection />;
    default:             return <OverviewSection />;
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────
const ADMIN_SESSION_KEY = "orionsoft_admin_v1";
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
