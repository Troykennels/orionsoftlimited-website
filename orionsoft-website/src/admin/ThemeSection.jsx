import { useMemo, useState } from "react";
import { THEME_PRESETS, DEFAULT_THEME, resolveColors, lighten } from "../lib/brand.js";

// Admin → Theme & Colours: pick the website's brand colour from ready-made
// themes or any custom colour, preview it, and publish it to every visitor.
// `read`/`save` are the dashboard's storage helpers (save also publishes).
const A = {
  bg: "#060810", surface: "#0B1120", card: "#0F1828", border: "rgba(255,255,255,0.07)",
  heading: "#F2F6FF", text: "#C8D0E0", muted: "#6B7A96", gold: "#C8A850", mint: "#10B981", amber: "#F59E0B",
};
const font = "'Instrument Sans', 'DM Sans', system-ui, sans-serif";
export const THEME_SK = "orionsoft_theme_v1";

// Relative luminance (WCAG) of a #RRGGBB colour.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

function Preview({ color, light }) {
  const rgba = a => { const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)); return `rgba(${r},${g},${b},${a})`; };
  return (
    <div style={{ background: A.bg, borderRadius: 14, border: `1px solid ${A.border}`, overflow: "hidden", fontFamily: font }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${A.border}` }}>
        <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Orion<span style={{ color }}>Soft</span></span>
        <span style={{ display: "flex", gap: 12, fontSize: 12, color: A.text }}>
          <span>Products</span><span style={{ color }}>Services</span><span>Careers</span>
        </span>
      </div>
      <div style={{ padding: "22px 18px", background: `radial-gradient(ellipse 70% 60% at 50% -10%, ${rgba(0.16)} 0%, transparent 70%)` }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", color, background: rgba(0.12), border: `1px solid ${rgba(0.3)}`, padding: "4px 10px", borderRadius: 20 }}>NOW HIRING</span>
        <div style={{ fontSize: 22, fontWeight: 900, color: A.heading, margin: "12px 0 6px", letterSpacing: "-0.02em" }}>
          Software that <span style={{ backgroundImage: `linear-gradient(135deg, ${color}, ${light})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color }}>works as hard</span> as you do.
        </div>
        <p style={{ fontSize: 12.5, color: A.text, margin: "0 0 14px", lineHeight: 1.6 }}>This is how buttons, highlights and cards will look across the website.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ background: color, color: "#060810", fontWeight: 800, fontSize: 12.5, padding: "9px 16px", borderRadius: 10, boxShadow: `0 8px 24px ${rgba(0.3)}` }}>Book a demo →</span>
          <span style={{ border: `1px solid ${rgba(0.45)}`, color, fontWeight: 700, fontSize: 12.5, padding: "9px 16px", borderRadius: 10 }}>See our work</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {[["25+", "Modules"], ["99.9%", "Uptime"], ["24/7", "Support"]].map(([n, l]) => (
            <div key={l} style={{ background: A.card, border: `1px solid ${A.border}`, borderTop: `2px solid ${color}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color }}>{n}</div>
              <div style={{ fontSize: 11.5, color: A.muted }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ThemeSection({ read, save }) {
  const live = read(THEME_SK, DEFAULT_THEME) || DEFAULT_THEME;
  const [choice, setChoice] = useState(live);
  const [custom, setCustom] = useState(live.preset === "custom" && live.color ? live.color : "#2563EB");
  const [msg, setMsg] = useState("");
  const { color, light } = useMemo(() => resolveColors(choice), [choice]);
  const liveColors = resolveColors(live);
  const liveName = live.preset === "custom" ? `Custom (${liveColors.color})` : (THEME_PRESETS.find(p => p.id === live.preset) || THEME_PRESETS[0]).name;
  const unchanged = JSON.stringify(choice) === JSON.stringify(live);
  const lowContrast = contrast(color, A.bg) < 3;

  function publish(theme = choice) {
    save(THEME_SK, theme, "update_theme", theme.preset === "custom" ? theme.color : theme.preset);
    // This browser shows the new colours on its next page load straight away.
    try { localStorage.setItem("so_theme_cache", JSON.stringify(theme)); } catch { /* storage blocked */ }
    setMsg("Published. Visitors see the new colours the next time they open or refresh the website.");
    setTimeout(() => setMsg(""), 6000);
  }

  const card = { background: A.card, border: `1px solid ${A.border}`, borderRadius: 16, padding: 22, fontFamily: font };
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: A.heading, margin: 0 }}>Website colour theme</h2>
          <span style={{ fontSize: 12.5, color: A.muted }}>Live now: <strong style={{ color: liveColors.color }}>{liveName}</strong></span>
        </div>
        <p style={{ fontSize: 13, color: A.muted, margin: "6px 0 18px", lineHeight: 1.6 }}>
          Changes the brand colour across the whole public website: buttons, highlights, borders, glows, icons and charts. The admin and Staff Office keep their own look.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {THEME_PRESETS.map(p => {
            const on = choice.preset === p.id;
            return (
              <button key={p.id} type="button" onClick={() => setChoice({ preset: p.id })} aria-pressed={on} style={{
                textAlign: "left", cursor: "pointer", background: on ? `${p.color}14` : A.surface, border: `1.5px solid ${on ? p.color : A.border}`,
                borderRadius: 12, padding: 12, fontFamily: font, transition: "border-color 0.2s",
              }}>
                <div style={{ height: 34, borderRadius: 8, background: `linear-gradient(135deg, ${p.color}, ${p.light})`, marginBottom: 9, boxShadow: on ? `0 6px 18px ${p.color}55` : "none" }} />
                <div style={{ fontSize: 13.5, fontWeight: 800, color: A.heading }}>{p.name}{p.id === "gold" ? " (default)" : ""}</div>
                <div style={{ fontSize: 11.5, color: A.muted, marginTop: 2 }}>{p.note}</div>
              </button>
            );
          })}
          <div style={{ background: choice.preset === "custom" ? `${custom}14` : A.surface, border: `1.5px solid ${choice.preset === "custom" ? custom : A.border}`, borderRadius: 12, padding: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
              <input type="color" value={custom} aria-label="Custom colour"
                onChange={e => { setCustom(e.target.value.toUpperCase()); setChoice({ preset: "custom", color: e.target.value.toUpperCase() }); }}
                style={{ width: 40, height: 34, border: "none", background: "none", padding: 0, cursor: "pointer" }} />
              <input value={custom} maxLength={7} aria-label="Custom colour hex"
                onChange={e => { const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`; setCustom(v); if (/^#[0-9a-f]{6}$/i.test(v)) setChoice({ preset: "custom", color: v.toUpperCase() }); }}
                style={{ width: "100%", minWidth: 0, background: A.bg, border: `1px solid ${A.border}`, color: A.heading, borderRadius: 8, padding: "7px 8px", fontSize: 13, fontFamily: "monospace" }} />
            </label>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: A.heading, marginTop: 9 }}>Custom colour</div>
            <div style={{ fontSize: 11.5, color: A.muted, marginTop: 2 }}>Match your logo or brand guide</div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 800, color: A.gold, letterSpacing: "0.08em", marginBottom: 10 }}>PREVIEW</div>
        <Preview color={color} light={light || lighten(color)} />
        {lowContrast && (
          <div role="alert" style={{ marginTop: 12, fontSize: 13, color: A.amber, lineHeight: 1.5 }}>
            ⚠ This colour is quite dark on the website's dark background, so some text and icons may be hard to read. A brighter shade will work better.
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, alignItems: "center" }}>
          <button type="button" disabled={unchanged} onClick={() => publish()} style={{ background: unchanged ? A.surface : color, color: unchanged ? A.muted : "#060810", border: "none", borderRadius: 10, padding: "11px 20px", fontWeight: 800, fontSize: 14, cursor: unchanged ? "not-allowed" : "pointer", fontFamily: font }}>
            {unchanged ? "This theme is live" : "Publish this theme"}
          </button>
          {live.preset !== "gold" && (
            <button type="button" onClick={() => { setChoice(DEFAULT_THEME); publish(DEFAULT_THEME); }} style={{ background: "none", color: A.text, border: `1px solid ${A.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: font }}>
              Reset to Orion Gold
            </button>
          )}
          <a href="/" target="_blank" rel="noreferrer" style={{ fontSize: 13.5, color: A.text }}>Open the website ↗</a>
        </div>
        {msg && <p style={{ fontSize: 13, color: A.mint, margin: "12px 0 0" }}>{msg}</p>}
      </div>
    </div>
  );
}
