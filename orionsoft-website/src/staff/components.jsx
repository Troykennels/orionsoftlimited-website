import { forwardRef, useEffect, useState } from "react";
import { C, font, PRESENCE } from "./theme.js";
import { initials, splitRichText } from "./api.js";

export function Btn({ children, onClick, type = "button", variant = "primary", small = false, danger = false, disabled = false, icon: Icon, style = {}, title }) {
  const bg = danger ? C.roseDim : variant === "primary" ? C.gold : variant === "ghost" ? "transparent" : variant === "blue" ? C.blueDim : C.raised;
  const color = danger ? C.rose : variant === "primary" ? "#060810" : variant === "blue" ? C.blue : C.text;
  const border = danger ? `1px solid ${C.rose}44` : variant === "ghost" ? `1px solid ${C.borderStrong}` : "1px solid transparent";
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className="so-btn" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
      background: bg, color, border, borderRadius: 9, whiteSpace: "nowrap",
      padding: small ? "7px 12px" : "10px 18px", fontSize: small ? 12.5 : 14, fontWeight: 700,
      fontFamily: font, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style,
    }}>
      {Icon && <Icon size={small ? 14 : 16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconBtn({ icon: Icon, label, onClick, active = false, color, size = 18, badge }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="so-iconbtn" style={{
      position: "relative", background: active ? C.goldDim : "transparent", color: color || (active ? C.gold : C.textMuted),
      border: "none", borderRadius: 8, padding: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: font, fontSize: 12.5, fontWeight: 700,
    }}>
      <Icon size={size} aria-hidden="true" />
      {badge ? <span style={{ position: "absolute", top: 1, right: 1, minWidth: 16, height: 16, borderRadius: 8, background: C.rose, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{badge > 99 ? "99+" : badge}</span> : null}
    </button>
  );
}

export function Badge({ children, color = C.textMuted, style = {} }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999,
      fontSize: 11.5, fontWeight: 700, fontFamily: font, whiteSpace: "nowrap",
      background: `${color}22`, color, ...style,
    }}>
      {children}
    </span>
  );
}

export function SectionCard({ children, style = {}, className = "" }) {
  return (
    <div className={`so-card ${className}`} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: sub ? 4 : 12, flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontSize: 15.5, fontWeight: 800, color: C.heading, fontFamily: font, margin: 0 }}>{children}</h2>
        {sub && <p style={{ fontSize: 12.5, color: C.textMuted, margin: "4px 0 12px", lineHeight: 1.5 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.heading, margin: 0, letterSpacing: "-0.02em" }}>{title}</h1>
        {sub && <p style={{ fontSize: 13.5, color: C.textMuted, margin: "6px 0 0", lineHeight: 1.5 }}>{sub}</p>}
      </div>
      {action && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{action}</div>}
    </div>
  );
}

export function Label({ children, htmlFor }) {
  return <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, fontFamily: font, marginBottom: 6 }}>{children}</label>;
}

const fieldStyle = {
  width: "100%", background: C.surface, border: `1px solid ${C.borderStrong}`, color: C.text,
  borderRadius: 10, padding: "10px 13px", fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box",
};

export function Input(props) {
  return <input {...props} className="so-field" style={{ ...fieldStyle, ...(props.style || {}) }} />;
}

export const Textarea = forwardRef(function Textarea(props, ref) {
  return <textarea ref={ref} {...props} className="so-field" style={{ ...fieldStyle, minHeight: 90, resize: "vertical", lineHeight: 1.55, ...(props.style || {}) }} />;
});

export function Select({ children, ...props }) {
  return <select {...props} className="so-field" style={{ ...fieldStyle, ...(props.style || {}) }}>{children}</select>;
}

export function Field({ label, children, style }) {
  return <div style={style}><Label>{label}</Label>{children}</div>;
}

export function Grid({ children, min = 220, gap = 14, style = {} }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`, gap, ...style }}>{children}</div>;
}

export function StatCard({ label, value, sub, color = C.gold, icon: Icon, onClick }) {
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter") onClick(); } : undefined}
      className={onClick ? "so-hover" : ""}
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, cursor: onClick ? "pointer" : "default" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font, fontWeight: 600 }}>{label}</span>
        {Icon && <Icon size={16} color={color} aria-hidden="true" />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: font, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function EmptyState({ children, icon: Icon }) {
  return (
    <div style={{ padding: "30px 10px", textAlign: "center", color: C.textMuted, fontFamily: font, fontSize: 13.5, lineHeight: 1.6 }}>
      {Icon && <Icon size={28} style={{ opacity: 0.5, marginBottom: 8 }} aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}

export function Avatar({ src, name, size = 40, presence, onClick }) {
  const style = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.38, fontWeight: 700, fontFamily: font, color: C.gold,
    background: C.goldDim, border: `1px solid ${C.border}`, overflow: "hidden",
  };
  const dot = presence ? PRESENCE[presence] || PRESENCE.offline : null;
  return (
    <div onClick={onClick} style={{ position: "relative", flexShrink: 0, cursor: onClick ? "pointer" : "default" }}>
      {src ? <img src={src} alt={name || "Avatar"} style={{ ...style, objectFit: "cover" }} /> : <div style={style} aria-label={name}>{initials(name)}</div>}
      {dot && <span title={dot.label} style={{ position: "absolute", right: -1, bottom: -1, width: Math.max(9, size * 0.28), height: Math.max(9, size * 0.28), borderRadius: "50%", background: dot.color, border: `2px solid ${C.card}` }} />}
    </div>
  );
}

export function Modal({ children, onClose, title, width = 560 }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(3,6,14,0.75)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.borderStrong}`, borderRadius: 16, padding: 22, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: C.heading, fontFamily: font, margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", borderBottom: `1px solid ${C.border}`, paddingBottom: 2 }}>
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={active === t.id} type="button" onClick={() => onChange(t.id)} style={{
          background: "none", border: "none", borderBottom: `2px solid ${active === t.id ? C.gold : "transparent"}`,
          color: active === t.id ? C.heading : C.textMuted, padding: "8px 12px", fontSize: 13, fontWeight: 700,
          fontFamily: font, cursor: "pointer", whiteSpace: "nowrap",
        }}>{t.label}{t.count ? <span style={{ marginLeft: 6, color: C.gold }}>{t.count}</span> : null}</button>
      ))}
    </div>
  );
}

export function Progress({ value = 0, color = C.gold, height = 8 }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ height, background: C.surface, borderRadius: height, overflow: "hidden", border: `1px solid ${C.border}` }} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${v}%`, height: "100%", background: v >= 100 ? C.mint : color, borderRadius: height, transition: "width 0.4s" }} />
    </div>
  );
}

export function Msg({ ok, err }) {
  if (!ok && !err) return null;
  return <p role="status" style={{ color: err ? C.rose : C.mint, fontFamily: font, fontSize: 13, margin: "10px 0 0" }}>{err || ok}</p>;
}

// Plain text with clickable links and @mention chips. Never renders HTML.
export function RichText({ text, directory, onMention, style = {} }) {
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6, ...style }}>
      {splitRichText(text, directory).map((p, i) => {
        // Mentions are only buttons when they do something; inside an already
        // clickable row they render as highlighted text (no nested buttons).
        if (p.t === "mention") return onMention
          ? <button key={i} type="button" onClick={e => { e.stopPropagation(); onMention(p.id); }} style={{ background: C.blueDim, color: C.blue, border: "none", borderRadius: 5, padding: "0 4px", font: "inherit", fontWeight: 700, cursor: "pointer" }}>{p.v}</button>
          : <span key={i} style={{ background: C.blueDim, color: C.blue, borderRadius: 5, padding: "0 4px", fontWeight: 700 }}>{p.v}</span>;
        if (p.t === "link") return <a key={i} href={p.v} target="_blank" rel="noreferrer noopener" style={{ color: C.blue, wordBreak: "break-all" }}>{p.v}</a>;
        return <span key={i}>{p.v}</span>;
      })}
    </div>
  );
}

// Lightweight global toasts: toast("Saved") from anywhere.
export function toast(message, kind = "ok") {
  window.dispatchEvent(new CustomEvent("so-toast", { detail: { message, kind, id: Math.random() } }));
}

export function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    function on(e) {
      const t = e.detail;
      setItems(list => [...list, t]);
      setTimeout(() => setItems(list => list.filter(x => x.id !== t.id)), 3500);
    }
    window.addEventListener("so-toast", on);
    return () => window.removeEventListener("so-toast", on);
  }, []);
  return (
    <div aria-live="polite" style={{ position: "fixed", bottom: 20, right: 20, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8, maxWidth: "calc(100vw - 40px)" }}>
      {items.map(t => (
        <div key={t.id} style={{ background: t.kind === "err" ? "#3A1520" : "#0E2A22", border: `1px solid ${t.kind === "err" ? C.rose : C.mint}55`, color: C.heading, padding: "11px 16px", borderRadius: 10, fontSize: 13.5, fontFamily: font, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>{t.message}</div>
      ))}
    </div>
  );
}
