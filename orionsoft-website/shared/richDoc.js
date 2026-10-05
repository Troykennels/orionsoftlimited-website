// One rich-text decoder for every document body (letters, contracts,
// templates, purchase-order terms), shared by the admin live preview, the
// client signing page and the PDF generator, so all three always agree.
//
// It accepts whatever people paste:
//  - real HTML (from an AI tool, Word, Google Docs, an email or a web page),
//    including <style>/<script>/<head>, Office junk, tables and entities;
//  - the clean markup the composer stores;
//  - plain text, with light Markdown: **bold**, *italic*, __underline__,
//    ~~strike~~, # headings, "- " bullets, "1. " numbers, "> " quotes, "---"
//    rules, and ->centred<- lines.
// and turns it into blocks:
//   { type: "p" | "h" | "li" | "hr", level (h1–h6), align: left|center|right|justify,
//     list: { ordered, index, depth } (li), quote (bool), lines: Run[][] }
//   Run = { text, bold, italic, underline, strike }
// `lines` keeps older callers working: each block is still { lines }.

const NAMED = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", middot: "·", bull: "•", mdash: "—", ndash: "–",
  hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", sbquo: "‚", bdquo: "„", laquo: "«", raquo: "»",
  copy: "©", reg: "®", trade: "™", deg: "°", plusmn: "±", times: "×", divide: "÷", frac12: "½", frac14: "¼", frac34: "¾",
  pound: "£", euro: "€", yen: "¥", cent: "¢", sect: "§", para: "¶", dagger: "†", Dagger: "‡", prime: "′", Prime: "″",
  ensp: " ", emsp: " ", thinsp: " ", zwnj: "", zwj: "", shy: "", iexcl: "¡", iquest: "¿", larr: "←", rarr: "→",
  uarr: "↑", darr: "↓", harr: "↔", check: "✓", hearts: "♥", star: "☆", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
  ouml: "ö", uuml: "ü", auml: "ä", ntilde: "ñ", oacute: "ó", iacute: "í", uacute: "ú", aacute: "á", szlig: "ß",
};

export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      try { return n ? String.fromCodePoint(n) : m; } catch { return m; }
    }
    return Object.prototype.hasOwnProperty.call(NAMED, code) ? NAMED[code] : Object.prototype.hasOwnProperty.call(NAMED, code.toLowerCase()) ? NAMED[code.toLowerCase()] : m;
  });
}

// Content that is never prose: removed with everything inside it.
function stripNonContent(input) {
  return String(input || "")
    .replace(/\r\n?/g, "\n")
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<(style|script|head|title|noscript|template|svg|object|iframe|select|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?o:[^>]*>/gi, "") // Word's <o:p>
    .replace(/<\/?(w|m|v):[^>]*>/gi, "");
}

const BLOCK = new Set(["p", "div", "section", "article", "header", "footer", "main", "aside", "nav", "address", "figure", "figcaption",
  "center", "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "dt", "dd", "dl", "caption", "form", "fieldset", "legend", "details", "summary", "body", "html"]);
const STRUCTURE = /<(p|div|h[1-6]|li|ul|ol|table|tr|section|article|center|blockquote|body|html|pre|hr)\b/i;

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : "";
}

function stylesOf(tag) {
  const style = attr(tag, "style").toLowerCase();
  const cls = attr(tag, "class").toLowerCase();
  const out = {};
  const ta = style.match(/text-align\s*:\s*(left|center|centre|right|justify|start|end)/);
  const al = attr(tag, "align").toLowerCase();
  const align = ta ? ta[1] : al || (/\b(text-center|center|centered|ql-align-center|has-text-align-center|aligncenter)\b/.test(cls) ? "center"
    : /\b(text-right|ql-align-right|has-text-align-right|alignright)\b/.test(cls) ? "right"
      : /\b(text-justify|ql-align-justify)\b/.test(cls) ? "justify" : "");
  if (align) out.align = { centre: "center", start: "left", end: "right" }[align] || align;
  const fw = style.match(/font-weight\s*:\s*(bold|bolder|[5-9]00)/);
  if (fw) out.bold = true;
  if (/font-weight\s*:\s*(normal|lighter|[1-4]00)/.test(style)) out.bold = false;
  if (/font-style\s*:\s*italic/.test(style)) out.italic = true;
  if (/text-decoration[^;]*underline/.test(style)) out.underline = true;
  if (/text-decoration[^;]*line-through/.test(style)) out.strike = true;
  if (/\b(font-bold|fw-bold|bold)\b/.test(cls)) out.bold = true;
  if (/\b(italic|fst-italic)\b/.test(cls)) out.italic = true;
  if (/\bunderline\b/.test(cls)) out.underline = true;
  return out;
}

// Plain text / light Markdown → the same HTML the composer stores.
function markdownToHtml(src) {
  const esc = s => s.replace(/&(?![a-z#][a-z0-9]*;)/gi, "&amp;").replace(/<(?![a-z/!])/gi, "&lt;");
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/(^|[\s(])\*(?!\s)(.+?)(?<!\s)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>")
    .replace(/(^|[\s(])_(?!\s)(.+?)(?<!\s)_(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>");
  const out = [];
  for (const para of src.split(/\n[ \t]*\n+/)) {
    const lines = para.split("\n");
    let list = null, buf = [];
    const flushBuf = () => { if (buf.length) { out.push(`<p>${buf.join("<br>")}</p>`); buf = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.join("")}</${list.tag}>`); list = null; } };
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, "");
      let m;
      if (!line.trim()) continue;
      if ((m = line.match(/^\s*(#{1,6})\s+(.*)$/))) { flushBuf(); flushList(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushBuf(); flushList(); out.push("<hr>"); continue; }
      if ((m = line.match(/^\s*->\s*(.*?)\s*<-\s*$/))) { flushBuf(); flushList(); out.push(`<p style="text-align:center">${inline(m[1])}</p>`); continue; }
      if ((m = line.match(/^\s*>\s?(.*)$/))) { flushBuf(); flushList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
      const bullet = line.match(/^\s*[-*•●▪◦]\s+(.*)$/);
      const num = line.match(/^\s*(\d{1,3})[.)]\s+(.*)$/);
      if (bullet || num) {
        flushBuf();
        const tag = num ? "ol" : "ul";
        if (list && list.tag !== tag) flushList();
        if (!list) list = { tag, items: [], start: num ? num[1] : null };
        list.items.push(`<li>${inline(num ? num[2] : bullet[1])}</li>`);
        continue;
      }
      flushList();
      buf.push(inline(line.trim()));
    }
    flushBuf(); flushList();
  }
  return out.join("\n");
}

export function parseRichText(input) {
  let src = stripNonContent(input);
  if (!src.trim()) return [];
  // Text without structural tags: blank lines are paragraphs, single newlines
  // are line breaks, and the light Markdown above applies.
  if (!STRUCTURE.test(src)) src = markdownToHtml(src);

  const blocks = [];
  const inline = [];              // [{ tag, bold?, italic?, underline?, strike? }]
  const ctx = [{ tag: "#root", align: "left" }]; // block contexts
  const lists = [];               // [{ ordered, counter }]
  let quote = 0, pre = 0;
  let cur = null;

  const style = () => {
    const s = { bold: false, italic: false, underline: false, strike: false };
    for (const e of inline) for (const k of ["bold", "italic", "underline", "strike"]) if (e[k] !== undefined) s[k] = e[k];
    return s;
  };
  const alignNow = () => { for (let i = ctx.length - 1; i >= 0; i--) if (ctx[i].align) return ctx[i].align; return "left"; };
  const headingNow = () => { for (let i = ctx.length - 1; i >= 0; i--) if (ctx[i].heading) return ctx[i].heading; return 0; };
  const listItemNow = () => { for (let i = ctx.length - 1; i >= 0; i--) if (ctx[i].li) return ctx[i].li; return null; };

  const begin = () => {
    if (cur) return cur;
    const h = headingNow(), li = listItemNow();
    cur = { type: h ? "h" : li && !li.used ? "li" : "p", level: h || undefined, align: alignNow(), quote: quote > 0, lines: [[]] };
    if (cur.type === "li") { cur.list = { ordered: li.ordered, index: li.index, depth: li.depth }; li.used = true; }
    return cur;
  };
  const end = () => {
    if (!cur) return;
    // Split at blank lines (<br><br>) into separate paragraphs.
    const parts = [[]];
    for (const ln of cur.lines) {
      const text = ln.map(r => r.text).join("");
      if (!text.trim()) { if (parts[parts.length - 1].length) parts.push([]); continue; }
      const last = ln[ln.length - 1]; last.text = last.text.replace(/\s+$/, "");
      const first = ln[0]; first.text = first.text.replace(/^\s+/, "");
      parts[parts.length - 1].push(ln.filter(r => r.text));
    }
    parts.filter(p => p.length).forEach((lines, i) => blocks.push({ ...cur, ...(i > 0 && cur.type === "li" ? { type: "p", list: undefined, indent: cur.list.depth + 1 } : {}), lines }));
    cur = null;
  };
  const text = raw => {
    let t = decodeEntities(raw);
    if (!pre) t = t.replace(/[ \t\n\r\f]+/g, " ");
    t = t.replace(/\u00a0/g, " ");
    if (!t || (!cur && !t.trim())) return;
    begin();
    const lines = cur.lines;
    (pre ? t.split("\n") : [t]).forEach((seg, i) => {
      if (i > 0) lines.push([]);
      const line = lines[lines.length - 1];
      if (!line.some(r => r.text.trim())) seg = seg.replace(/^ +/, "");
      else if (/ $/.test(line[line.length - 1].text) && !pre) seg = seg.replace(/^ (?! )/, "");
      if (!seg) return;
      const s = style();
      const prev = line[line.length - 1];
      if (prev && prev.bold === s.bold && prev.italic === s.italic && prev.underline === s.underline && prev.strike === s.strike) prev.text += seg;
      else line.push({ text: seg, ...s });
    });
  };
  const br = () => { begin(); cur.lines.push([]); };

  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>|[^<]+|</g;
  let m;
  while ((m = re.exec(src))) {
    const tok = m[0];
    if (!m[1]) { text(tok); continue; }
    const name = m[1].toLowerCase();
    const closing = tok[1] === "/";
    const selfClose = /\/>$/.test(tok);

    if (name === "br") { br(); continue; }
    if (name === "hr") { end(); blocks.push({ type: "hr", align: "left", lines: [] }); continue; }
    if (name === "img") { const alt = attr(tok, "alt"); if (alt) text(`[${alt}]`); continue; }

    if (name === "ul" || name === "ol") {
      end();
      if (closing) lists.pop();
      else lists.push({ ordered: name === "ol", counter: (parseInt(attr(tok, "start"), 10) || 1) - 1 });
      continue;
    }
    if (name === "table" || name === "thead" || name === "tbody" || name === "tfoot") { end(); continue; }
    // Table cells sit on one line with a gap; header cells are bold. A row
    // whose only cell is centred (common in email layouts) stays centred.
    if (name === "td" || name === "th") {
      if (closing) { for (let i = inline.length - 1; i >= 0; i--) if (inline[i].tag === name) { inline.splice(i, 1); break; } continue; }
      const s = stylesOf(tok);
      if (cur && cur.lines[cur.lines.length - 1].length) text("   ");
      else if (s.align && ctx[ctx.length - 1].tag === "tr") ctx[ctx.length - 1].align = s.align;
      inline.push({ tag: name, ...(name === "th" ? { bold: true } : {}), ...(s.bold !== undefined ? { bold: s.bold } : {}), ...(s.italic ? { italic: true } : {}) });
      continue;
    }

    if (BLOCK.has(name)) {
      if (!closing) {
        end();
        const s = stylesOf(tok);
        const c = { tag: name };
        if (s.align) c.align = s.align;
        if (name === "center") c.align = "center";
        if (/^h[1-6]$/.test(name)) c.heading = Number(name[1]);
        if (name === "li") {
          const L = lists[lists.length - 1] || { ordered: false, counter: 0 };
          L.counter = (parseInt(attr(tok, "value"), 10) || L.counter + 1);
          c.li = { ordered: L.ordered, index: L.counter, depth: Math.max(0, lists.length - 1) };
        }
        if (name === "blockquote") quote++;
        if (name === "pre") pre++;
        ctx.push(c);
        const st = {};
        for (const k of ["bold", "italic", "underline", "strike"]) if (s[k] !== undefined) st[k] = s[k];
        inline.push({ tag: `block:${name}`, ...st });
        if (selfClose) { ctx.pop(); inline.pop(); }
      } else {
        end();
        for (let i = ctx.length - 1; i > 0; i--) if (ctx[i].tag === name) { ctx.splice(i); break; }
        for (let i = inline.length - 1; i >= 0; i--) if (inline[i].tag === `block:${name}`) { inline.splice(i); break; }
        if (name === "blockquote") quote = Math.max(0, quote - 1);
        if (name === "pre") pre = Math.max(0, pre - 1);
      }
      continue;
    }

    // Inline formatting.
    if (closing) {
      for (let i = inline.length - 1; i >= 0; i--) {
        if (inline[i].tag !== name) continue;
        const [e] = inline.splice(i, 1);
        if (e.linkSuffix) text(e.linkSuffix); // printed documents show where a link goes
        break;
      }
      continue;
    }
    if (selfClose) continue;
    const e = { tag: name, ...stylesOf(tok) };
    delete e.align;
    if (name === "b" || name === "strong") e.bold = true;
    if (name === "i" || name === "em" || name === "cite" || name === "dfn" || name === "var") e.italic = true;
    if (name === "u" || name === "ins") e.underline = true;
    if (name === "s" || name === "strike" || name === "del") e.strike = true;
    if (name === "a") {
      const href = attr(tok, "href");
      const close = src.toLowerCase().indexOf("</a>", re.lastIndex);
      const inner = close > 0 ? decodeEntities(src.slice(re.lastIndex, close).replace(/<[^>]+>/g, "")).trim().toLowerCase() : "";
      const bare = href.replace(/^(https?:\/\/|mailto:)/i, "").replace(/\/$/, "").toLowerCase();
      if (inner && /^(https?:|mailto:)/i.test(href) && !inner.includes(bare) && !bare.includes(inner)) e.linkSuffix = ` (${href.replace(/^mailto:/i, "")})`;
    }
    inline.push(e);
  }
  end();
  return blocks.filter(b => b.type === "hr" || b.lines.some(l => l.some(r => r.text.trim())));
}

// ─── Clean HTML (what the composer stores after "Clean & format") ──────────
const escapeHtml = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function runToHtml(r) {
  let t = escapeHtml(r.text);
  if (r.bold) t = `<b>${t}</b>`;
  if (r.italic) t = `<i>${t}</i>`;
  if (r.underline) t = `<u>${t}</u>`;
  if (r.strike) t = `<s>${t}</s>`;
  return t;
}
const linesHtml = b => b.lines.map(l => l.map(runToHtml).join("")).join("<br>");

export function blocksToHtml(blocks, { inlineStyles = false } = {}) {
  const out = [];
  let open = []; // list stack [{ tag, depth }]
  const alignAttr = b => (b.align && b.align !== "left" ? ` style="text-align:${b.align}"` : "");
  const closeTo = depth => { while (open.length > depth) out.push(`</${open.pop().tag}>`); };
  for (const b of blocks) {
    if (b.type === "li") {
      const tag = b.list.ordered ? "ol" : "ul";
      closeTo(b.list.depth + 1);
      while (open.length < b.list.depth + 1) { const t = open.length === b.list.depth ? tag : "ul"; open.push({ tag: t }); out.push(`<${t}${b.list.ordered && open.length === b.list.depth + 1 && b.list.index > 1 && !out.length ? ` start="${b.list.index}"` : ""}>`); }
      if (open[b.list.depth].tag !== tag) { out.push(`</${open[b.list.depth].tag}>`); open[b.list.depth] = { tag }; out.push(`<${tag}>`); }
      out.push(`<li${alignAttr(b)}>${linesHtml(b)}</li>`);
      continue;
    }
    closeTo(0);
    if (b.type === "hr") out.push("<hr>");
    else if (b.type === "h") out.push(`<h${b.level}${alignAttr(b)}>${linesHtml(b)}</h${b.level}>`);
    else if (b.quote) out.push(`<blockquote${alignAttr(b)}>${linesHtml(b)}</blockquote>`);
    else out.push(`<p${alignAttr(b)}${inlineStyles && b.indent ? ` style="margin-left:${b.indent * 22}px"` : ""}>${linesHtml(b)}</p>`);
  }
  closeTo(0);
  return out.join("\n");
}

export function sanitizeToAllowedHtml(input) {
  return blocksToHtml(parseRichText(input));
}

// ─── Preview HTML (escaped text, our own tags only; safe for innerHTML) ─────
export function richTextToSafeHtml(input, { headingColor = "inherit" } = {}) {
  const blocks = parseRichText(input);
  const sizes = { 1: "1.6em", 2: "1.35em", 3: "1.18em", 4: "1.05em", 5: "1em", 6: "0.95em" };
  const out = [];
  let open = [];
  const closeTo = d => { while (open.length > d) out.push(`</${open.pop()}>`); };
  for (const b of blocks) {
    const align = b.align && b.align !== "left" ? `text-align:${b.align};` : "";
    if (b.type === "li") {
      const tag = b.list.ordered ? "ol" : "ul";
      closeTo(b.list.depth + 1);
      while (open.length < b.list.depth + 1) { open.push(tag); out.push(`<${tag} style="margin:6px 0;padding-left:24px">`); }
      out.push(`<li${b.list.ordered ? ` value="${b.list.index}"` : ""} style="margin:3px 0;${align}">${linesHtml(b)}</li>`);
      continue;
    }
    closeTo(0);
    if (b.type === "hr") out.push(`<hr style="border:none;border-top:1px solid #ccd3df;margin:14px 0">`);
    else if (b.type === "h") out.push(`<div style="font-size:${sizes[b.level]};font-weight:700;color:${headingColor};margin:16px 0 8px;${align}">${linesHtml(b)}</div>`);
    else if (b.quote) out.push(`<blockquote style="margin:10px 0;padding:4px 0 4px 14px;border-left:3px solid #C8A850;color:#555;${align}">${linesHtml(b)}</blockquote>`);
    else out.push(`<p style="margin:0 0 12px;${align}${b.indent ? `margin-left:${b.indent * 24}px;` : ""}">${linesHtml(b)}</p>`);
  }
  closeTo(0);
  return out.join("");
}

// Characters the standard PDF fonts (WinAnsi) can't draw are swapped for
// close equivalents instead of crashing the PDF.
const PDF_SWAP = new Map([
  ["\u20A6", "NGN "], ["\u2192", "->"], ["\u2190", "<-"], ["\u2194", "<->"], ["\u21D2", "=>"], ["\u2713", "v"], ["\u2714", "v"],
  ["\u2717", "x"], ["\u2718", "x"], ["\u2605", "*"], ["\u2606", "*"], ["\u25CF", "\u2022"], ["\u25AA", "\u2022"], ["\u25E6", "\u2022"],
  ["\u25A0", "\u2022"], ["\u25A1", "-"], ["\u2265", ">="], ["\u2264", "<="], ["\u2260", "!="], ["\u2032", "'"], ["\u2033", '"'],
  ["\u2009", " "], ["\u2002", " "], ["\u2003", " "], ["\u202F", " "],
]);
// Characters outside Latin-1 that WinAnsi still has (quotes, dashes, euro…).
const WIN_ANSI_EXTRA = new Set("\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122");
export function pdfSafe(text) {
  let out = "";
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    if (PDF_SWAP.has(ch)) out += PDF_SWAP.get(ch);
    else if (cp <= 0xFF || WIN_ANSI_EXTRA.has(ch)) out += ch;
    else if (cp >= 0x1F000 || (cp >= 0x2600 && cp <= 0x27BF) || cp === 0xFE0F || (cp >= 0x200B && cp <= 0x200D)) continue; // emoji, joiners
    else out += "?";
  }
  return out;
}
