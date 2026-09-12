// Minimal, safe rich-text parser for document template bodies. Templates are
// plain text by default, but may contain a small allow-listed set of HTML-ish
// tags for formatting: <b>/<strong>, <i>/<em>, <br>, <p>/<div>, <ul>/<ol>/<li>.
// Anything else is stripped so no literal tags ever leak into a generated PDF
// or the public signing page — this is NOT a general HTML renderer.
//
// Output shape: Paragraph[] where Paragraph = { lines: Line[] },
// Line = Run[], Run = { text, bold, italic }.

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeBlocks(input) {
  let s = String(input || "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "\n• ").replace(/<\/li>/gi, "");
  s = s.replace(/<\/(p|div|ul|ol)>/gi, "\n\n").replace(/<(p|div|ul|ol)[^>]*>/gi, "");
  return s;
}

function parseInlineRuns(line) {
  const runs = [];
  let bold = false, italic = false;
  const tokenRe = /<\/?(b|strong|i|em)>/gi;
  let lastIndex = 0, m;
  const pushText = (raw) => {
    const t = decodeEntities(raw.replace(/<[^>]+>/g, ""));
    if (t) runs.push({ text: t, bold, italic });
  };
  while ((m = tokenRe.exec(line))) {
    pushText(line.slice(lastIndex, m.index));
    const tag = m[0].toLowerCase();
    if (tag === "<b>" || tag === "<strong>") bold = true;
    else if (tag === "</b>" || tag === "</strong>") bold = false;
    else if (tag === "<i>" || tag === "<em>") italic = true;
    else if (tag === "</i>" || tag === "</em>") italic = false;
    lastIndex = tokenRe.lastIndex;
  }
  pushText(line.slice(lastIndex));
  return runs;
}

export function parseRichText(input) {
  const normalized = normalizeBlocks(input);
  const paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return paragraphs.map(p => ({
    lines: p.split("\n").map(l => parseInlineRuns(l.trim())).filter(runs => runs.length > 0),
  })).filter(block => block.lines.length > 0);
}
