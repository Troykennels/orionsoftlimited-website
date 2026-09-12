import { C, font } from "./theme.js";

export function Btn({ children, onClick, type = "button", variant = "primary", small = false, danger = false, disabled = false }) {
  const bg = danger ? C.roseDim : variant === "primary" ? C.gold : variant === "ghost" ? "transparent" : C.card;
  const color = danger ? C.rose : variant === "primary" ? "#060810" : C.text;
  const border = danger ? `1px solid ${C.rose}44` : variant === "ghost" ? `1px solid ${C.border}` : "none";
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: bg, color, border, borderRadius: 8,
      padding: small ? "7px 14px" : "10px 20px", fontSize: small ? 13 : 14, fontWeight: 700,
      fontFamily: font, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      transition: "opacity 0.15s, transform 0.1s",
    }}>
      {children}
    </button>
  );
}

export function Badge({ children, color = C.textMuted }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999,
      fontSize: 11.5, fontWeight: 700, fontFamily: font, textTransform: "capitalize",
      background: `${color}22`, color,
    }}>
      {children}
    </span>
  );
}

export function SectionCard({ children, style = {} }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 16, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 4px" }}>{children}</h2>;
}

export function Label({ children }) {
  return <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.textMuted, fontFamily: font, marginBottom: 6 }}>{children}</label>;
}

const fieldStyle = {
  width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text,
  borderRadius: 10, padding: "11px 14px", fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box",
};

export function Input(props) {
  return <input {...props} style={{ ...fieldStyle, ...(props.style || {}) }} />;
}

export function Textarea(props) {
  return <textarea {...props} style={{ ...fieldStyle, minHeight: 90, resize: "vertical", ...(props.style || {}) }} />;
}

export function Select({ children, ...props }) {
  return <select {...props} style={{ ...fieldStyle, ...(props.style || {}) }}>{children}</select>;
}

export function StatCard({ label, value, sub, color = C.gold, icon }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font, fontWeight: 600 }}>{label}</span>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: font }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: font, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div style={{ padding: "32px 0", textAlign: "center", color: C.textMuted, fontFamily: font, fontSize: 13.5 }}>
      {children}
    </div>
  );
}
