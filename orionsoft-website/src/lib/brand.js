// Website brand colour, chosen by the admin (Admin → Theme & Colours) and
// published like other site content. Every gold accent on the public site
// reads from BRAND, so one choice recolours buttons, highlights, borders,
// glows, icons and charts together.
//
// BRAND is filled in before the website's code loads (see main.jsx), so values
// captured when modules load are already in the chosen colours: visitors
// never see a flash of the default gold.

export const THEME_KEY = "orionsoft_theme_v1";
const CACHE_KEY = "so_theme_cache";

export const THEME_PRESETS = [
  { id: "gold",    name: "Orion Gold",     color: "#C8A850", light: "#E8C96A", note: "The original Orion Soft look" },
  { id: "blue",    name: "Royal Blue",     color: "#3B82F6", light: "#60A5FA", note: "Trustworthy and corporate" },
  { id: "emerald", name: "Emerald",        color: "#10B981", light: "#34D399", note: "Health, growth, fresh" },
  { id: "crimson", name: "Crimson",        color: "#E11D48", light: "#FB7185", note: "Bold and energetic" },
  { id: "purple",  name: "Royal Purple",   color: "#8B5CF6", light: "#A78BFA", note: "Creative and premium" },
  { id: "orange",  name: "Sunset Orange",  color: "#F97316", light: "#FB923C", note: "Warm and friendly" },
  { id: "teal",    name: "Ocean Teal",     color: "#14B8A6", light: "#2DD4BF", note: "Calm and modern" },
];
export const DEFAULT_THEME = { preset: "gold" };

const HEX = /^#[0-9a-f]{6}$/i;
const toRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toHex = rgb => `#${rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
// A lighter shade of a colour, for hover states and gradients.
export const lighten = (hex, amount = 0.28) => toHex(toRgb(hex).map(v => v + (255 - v) * amount));

// { preset } or { preset: "custom", color } → the two colours used.
export function resolveColors(theme) {
  const t = theme && typeof theme === "object" ? theme : DEFAULT_THEME;
  if (t.preset === "custom" && HEX.test(t.color || "")) return { color: t.color.toUpperCase(), light: HEX.test(t.light || "") ? t.light : lighten(t.color) };
  const p = THEME_PRESETS.find(x => x.id === t.preset) || THEME_PRESETS[0];
  return { color: p.color, light: p.light };
}

function build(theme) {
  const { color, light } = resolveColors(theme);
  const rgb = toRgb(color).join(",");
  return {
    gold: color,
    goldLight: light,
    rgb, // "200,168,80" for rgba(${BRAND.rgb},0.12)
    rgba: a => `rgba(${rgb},${a})`,
  };
}

// Mutable, so everything importing it sees the chosen theme.
export const BRAND = build(typeof window !== "undefined" ? window.__SO_THEME : null);

export function setTheme(theme) {
  Object.assign(BRAND, build(theme));
  if (typeof document !== "undefined") {
    const s = document.documentElement.style;
    s.setProperty("--brand", BRAND.gold);
    s.setProperty("--brand-light", BRAND.goldLight);
    s.setProperty("--brand-rgb", BRAND.rgb);
  }
}

function readCache() {
  try { const v = localStorage.getItem(CACHE_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
function writeCache(theme) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(theme)); } catch { /* storage blocked */ }
}

async function fetchTheme(timeoutMs) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const t = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const r = await fetch(`/api/content?only=${THEME_KEY}`, { cache: "no-store", signal: ctrl?.signal });
    if (!r.ok) return undefined;
    const j = await r.json();
    return j.content?.[THEME_KEY] || DEFAULT_THEME;
  } catch { return undefined; } finally { clearTimeout(t); }
}

// Called by main.jsx before the website's code is loaded. Returning visitors
// use their saved copy at once (refreshed in the background for next time);
// first-time visitors wait briefly for the published theme.
export async function prepareTheme() {
  const cached = readCache();
  if (cached) {
    window.__SO_THEME = cached;
    setTheme(cached);
    const bootAt = Date.now();
    fetchTheme(8000).then(latest => {
      if (!latest || JSON.stringify(latest) === JSON.stringify(cached)) return;
      writeCache(latest);
      // The admin changed the theme since this visitor's last visit: switch
      // now if the page has only just opened (the saved copy then matches, so
      // this happens once).
      if (Date.now() - bootAt < 4000) window.location.reload();
    });
    return;
  }
  const latest = await fetchTheme(1500);
  const theme = latest || DEFAULT_THEME;
  if (latest) writeCache(latest);
  window.__SO_THEME = theme;
  setTheme(theme);
}
