// Formats long text written in the admin (blog posts, case studies) for the
// website. People type it as plain text, so besides simple Markdown
// (# heading, **bold**, *italic*, [link](https://…), "- " bullets) it also
// recognises the headings they naturally write:
//   - a short line in CAPITALS ("THE CLIENT")
//   - a short stand-alone line without end punctuation
//     ("The Problem With Disconnected Processes")
// Rendered as React elements, never as raw HTML.

function inline(text, key, linkColor, strongColor) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<strong key={k} style={{ color: strongColor }}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={k}>{m[2]}</em>);
    else out.push(<a key={k} href={m[4]} target="_blank" rel="noopener noreferrer" style={{ color: linkColor }}>{m[3]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isCapsHeading = l => l.length <= 60 && /[A-Z]{2}/.test(l) && l === l.toUpperCase() && !/[.!?]$/.test(l);
const isTitleLine = l => l.length <= 80 && l.split(/\s+/).length >= 2 && /^[A-Z0-9]/.test(l) && !/[.!?,;:)"']$/.test(l);
const BULLET = /^\s*[-*•]\s+/;

// Text → blocks: { type: "h", text } | { type: "p", lines } | { type: "ul", items }
export function toBlocks(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").map(l => l.trim());
  const blocks = [];
  let para = null, list = null;
  const flush = () => { if (para) blocks.push({ type: "p", lines: para }); if (list) blocks.push({ type: "ul", items: list }); para = null; list = null; };
  lines.forEach((l, i) => {
    if (!l) { flush(); return; }
    const md = l.match(/^(#{1,3})\s+(.*)$/);
    if (md) { flush(); blocks.push({ type: "h", level: md[1].length, text: md[2] }); return; }
    // A capitals line heads a section when a blank line and more text follow;
    // "ORION SOFT LIMITED" directly above a tagline is a sign-off, not a heading.
    const more = !lines[i + 1] && lines.slice(i + 1).some(Boolean);
    if (more && isCapsHeading(l)) { flush(); blocks.push({ type: "h", level: 3, text: l, caps: true }); return; }
    const alone = !lines[i - 1] && (i + 1 >= lines.length || !lines[i + 1]);
    if (alone && isTitleLine(l) && i + 1 < lines.length) { flush(); blocks.push({ type: "h", level: 2, text: l }); return; }
    if (BULLET.test(l)) { if (para) { blocks.push({ type: "p", lines: para }); para = null; } (list ||= []).push(l.replace(BULLET, "")); return; }
    if (list) { blocks.push({ type: "ul", items: list }); list = null; }
    (para ||= []).push(l);
  });
  flush();
  return blocks;
}

export function RichText({ text, font, headingColor, textColor, linkColor, size = 16 }) {
  return toBlocks(text).map((b, i) => {
    if (b.type === "h") {
      const fs = b.caps ? Math.round(size * 0.8) : b.level === 1 ? Math.round(size * 1.6) : b.level === 2 ? Math.round(size * 1.35) : Math.round(size * 1.15);
      return <h2 key={i} style={{ fontSize: fs, fontWeight: 800, color: headingColor, fontFamily: font, margin: `${i ? size * 1.8 : 0}px 0 ${size * 0.6}px`, lineHeight: 1.3, letterSpacing: b.caps ? "0.1em" : "-0.01em" }}>{inline(b.text, i, linkColor, headingColor)}</h2>;
    }
    if (b.type === "ul") {
      return <ul key={i} style={{ margin: `0 0 ${size}px`, paddingLeft: 22, color: textColor }}>{b.items.map((it, j) => <li key={j} style={{ marginBottom: 6 }}>{inline(it, `${i}-${j}`, linkColor, headingColor)}</li>)}</ul>;
    }
    // Numbered step titles ("01 — System Configuration") stand out in bold.
    const step = l => l.length <= 70 && /^\d{1,2}\s*[—–.)-]\s*\S/.test(l);
    return <p key={i} style={{ margin: `0 0 ${size}px`, color: textColor }}>{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}{step(l) ? <strong style={{ color: headingColor }}>{l}</strong> : inline(l, `${i}-${j}`, linkColor, headingColor)}</span>)}</p>;
  });
}

// The first sentence(s) of a text, for cards and previews.
export function summary(text, max = 180) {
  const plain = toBlocks(text).filter(b => b.type === "p").map(b => b.lines.join(" ")).join(" ");
  return plain.length > max ? `${plain.slice(0, max).replace(/\s+\S*$/, "")}…` : plain;
}
