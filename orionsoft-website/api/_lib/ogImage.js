// Branded 1200×630 share images (the picture LinkedIn, Facebook, X and
// WhatsApp show with a link). Posts shared without their own picture all used
// to show the same generic image; this draws one with the post's title.
// Drawn as SVG, rendered to PNG with resvg, using the site's font (Instrument
// Sans, SIL Open Font License, files in ./fonts).
import { fileURLToPath } from "node:url";

const FONT_DIR = fileURLToPath(new URL("./fonts/", import.meta.url));
const FONTS = ["InstrumentSans-Bold.ttf", "InstrumentSans-SemiBold.ttf", "InstrumentSans-Medium.ttf"].map(f => FONT_DIR + f);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Rough glyph widths for Instrument Sans Bold, in ems, for line wrapping.
const NARROW = /[ilIjtf.,:;'!|()[\] ]/, WIDE = /[mwMW@%&]/, CAPS = /[A-Z0-9]/;
const textWidth = (s, size) => [...s].reduce((w, ch) => w + size * (NARROW.test(ch) ? 0.3 : WIDE.test(ch) ? 0.85 : CAPS.test(ch) ? 0.66 : 0.55), 0);

function wrap(text, size, maxWidth, maxLines) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (textWidth(next, size) <= maxWidth || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && textWidth(`${last}…`, size) > maxWidth) last = last.slice(0, -1).trimEnd();
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

// Biggest title size (72 → 46px) that fits in four lines.
function fitTitle(title, maxWidth) {
  for (let size = 72; size >= 46; size -= 4) {
    const lines = wrap(title, size, maxWidth, 99);
    if (lines.length <= (size >= 60 ? 3 : 4)) return { size, lines };
  }
  return { size: 46, lines: wrap(title, 46, maxWidth, 4) };
}

export function ogSvg({ title, label = "", footer = "orionsoftlimited.com" }) {
  const W = 1200, H = 630, X = 80, maxWidth = W - X * 2;
  const { size, lines } = fitTitle(title || "Orion Soft Limited", maxWidth);
  const lineH = Math.round(size * 1.12);
  const top = 250 - Math.round(((lines.length - 1) * lineH) / 2) + Math.round(size * 0.35);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="0.85" cy="0" r="0.9"><stop offset="0" stop-color="#C8A850" stop-opacity="0.28"/><stop offset="1" stop-color="#C8A850" stop-opacity="0"/></radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1426"/><stop offset="1" stop-color="#060810"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g opacity="0.07" stroke="#FFFFFF" stroke-width="1">${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 110}" y1="0" x2="${i * 110 - 300}" y2="${H}"/>`).join("")}</g>
  <rect x="0" y="0" width="10" height="${H}" fill="#C8A850"/>
  <circle cx="${X + 18}" cy="86" r="17" fill="none" stroke="#C8A850" stroke-width="4"/>
  <circle cx="${X + 18}" cy="86" r="6" fill="#C8A850"/>
  <text x="${X + 48}" y="98" font-family="Instrument Sans" font-weight="700" font-size="34" fill="#F2F6FF">Orion<tspan fill="#C8A850">Soft</tspan></text>
  ${label ? `<text x="${W - X}" y="96" text-anchor="end" font-family="Instrument Sans" font-weight="600" font-size="20" letter-spacing="3" fill="#C8A850">${esc(label.toUpperCase())}</text>` : ""}
  ${lines.map((l, i) => `<text x="${X}" y="${top + i * lineH}" font-family="Instrument Sans" font-weight="700" font-size="${size}" fill="#F2F6FF" letter-spacing="-1">${esc(l)}</text>`).join("\n  ")}
  <rect x="${X}" y="${H - 118}" width="64" height="5" rx="2.5" fill="#C8A850"/>
  <text x="${X}" y="${H - 66}" font-family="Instrument Sans" font-weight="500" font-size="26" fill="#9AA6BF">${esc(footer)}</text>
  <text x="${W - X}" y="${H - 66}" text-anchor="end" font-family="Instrument Sans" font-weight="600" font-size="22" fill="#9AA6BF">Software for African organisations</text>
</svg>`;
}

const cache = new Map();
export async function ogPng(opts) {
  const key = JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  const { Resvg } = await import("@resvg/resvg-js");
  const png = new Resvg(ogSvg(opts), { font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Instrument Sans" }, fitTo: { mode: "width", value: 1200 } }).render().asPng();
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  cache.set(key, png);
  return png;
}
