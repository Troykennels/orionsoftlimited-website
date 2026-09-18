// Frontend mirror of api/_lib/richtext.js — same rich-text parser for
// document/letter/template bodies. Kept in sync manually since api/ and src/
// build/ship separately; used by the admin composer's live preview and the
// public signing page so formatting (and cleanup of pasted HTML) matches
// exactly what the generated PDF produces.
//
// Renders a small allow-listed set of tags (b/strong, i/em, br, p/div,
// ul/ol/li) as real formatting, but is deliberately forgiving about what
// it's FED: people paste whole HTML documents here (an AI-generated email
// template, a copy from Word/Google Docs, a saved webpage) — complete with
// <style>/<script> blocks, <table> markup, headings, and HTML entities.
// Anything not in the allow-list is stripped, but block-level containers
// (<style>, <script>, <head>, comments) are removed WITH their content, not
// just their tags, so CSS declarations and script source never leak into
// the body as literal text. Table rows and headings degrade to readable
// lines instead of running every cell/heading together.
//
// Output shape: Paragraph[] where Paragraph = { lines: Line[] },
// Line = Run[], Run = { text, bold, italic }.

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&middot;/gi, "·")
    .replace(/&bull;/gi, "•")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&rsquo;/gi, "’")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&copy;/gi, "©")
    .replace(/&reg;/gi, "®")
    .replace(/&trade;/gi, "™")
    .replace(/&deg;/gi, "°")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&"); // last: avoids re-decoding a literal "&lt;" etc. produced by a double-encoded "&amp;lt;"
}

// Removes elements whose CONTENT is never meant to be shown as prose —
// <style>/<script>/<head> and HTML comments — not just their tags.
function stripNonContent(input) {
  return String(input || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
}

function normalizeBlocks(input) {
  let s = stripNonContent(input);
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "\n• ").replace(/<\/li>/gi, "");
  // Table cells become short gaps on the same line, rows become their own
  // line, and the table itself is a block — so a pasted table reads as
  // plain aligned-ish text instead of one run-on paragraph.
  s = s.replace(/<\/t[dh]>/gi, "   ").replace(/<t[dh][^>]*>/gi, "");
  s = s.replace(/<\/tr>/gi, "\n").replace(/<tr[^>]*>/gi, "");
  s = s.replace(/<\/(table|thead|tbody|tfoot)>/gi, "\n\n").replace(/<(table|thead|tbody|tfoot)[^>]*>/gi, "");
  // Headings render as their own bold line rather than disappearing or
  // running into the next paragraph.
  s = s.replace(/<h[1-6][^>]*>/gi, "\n\n<b>").replace(/<\/h[1-6]>/gi, "</b>\n\n");
  s = s.replace(/<\/(p|div|ul|ol|html|body)>/gi, "\n\n").replace(/<(p|div|ul|ol|html|body)[^>]*>/gi, "");
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

// Re-serializes whatever parseRichText extracted back into the small
// allow-listed markup (<b>/<i>/<br>, blank line = new paragraph). Used to
// turn a pasted wall of HTML into the clean, editable form the composer
// actually stores and re-renders — see it once, trust what you see after.
export function sanitizeToAllowedHtml(input) {
  const paragraphs = parseRichText(input);
  return paragraphs
    .map(p => p.lines.map(runs => runs.map(runToHtml).join("")).join("<br>"))
    .join("\n\n");
}

function runToHtml(run) {
  let t = escapeHtml(run.text);
  if (run.bold) t = `<b>${t}</b>`;
  if (run.italic) t = `<i>${t}</i>`;
  return t;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
