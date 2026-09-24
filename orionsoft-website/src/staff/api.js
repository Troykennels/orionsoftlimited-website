// Small fetch wrapper + helpers shared by every Staff Office module.
export async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body && typeof opts.body !== "string" ? JSON.stringify(opts.body) : opts.body,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(json.error || `Request failed (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return json;
}

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(d) {
  if (!d) return "";
  return new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function naira(n) {
  return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}

export function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
}

export function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

// Public profile / post share URLs. The share endpoint serves proper link
// previews (Open Graph) to LinkedIn, X, Facebook and WhatsApp.
export function profileUrl(slug) {
  return `${window.location.origin}/people/${slug}`;
}
export function shareUrl(slug, postId) {
  return `${window.location.origin}/api/public/share?person=${encodeURIComponent(slug)}${postId ? `&post=${encodeURIComponent(postId)}` : ""}`;
}

export const SHARE_TARGETS = [
  { id: "linkedin", label: "LinkedIn", build: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  { id: "x", label: "X (Twitter)", build: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text.slice(0, 240))}` },
  { id: "facebook", label: "Facebook", build: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { id: "whatsapp", label: "WhatsApp", build: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text.slice(0, 500)}\n${url}`)}` },
  { id: "telegram", label: "Telegram", build: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text.slice(0, 500))}` },
  { id: "email", label: "Email", build: (url, text) => `mailto:?subject=${encodeURIComponent("From the Orion Soft team")}&body=${encodeURIComponent(`${text}\n\n${url}`)}` },
];

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// Renders @mentions and links inside plain text safely (no HTML injection).
export function splitRichText(text, directory = []) {
  const parts = [];
  const re = /(@[a-z0-9][a-z0-9-]*|https?:\/\/[^\s]+)/gi;
  let last = 0, m;
  const str = String(text || "");
  while ((m = re.exec(str))) {
    if (m.index > last) parts.push({ t: "text", v: str.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("@")) {
      const person = directory.find(p => p.slug === tok.slice(1).toLowerCase());
      parts.push(person ? { t: "mention", v: `@${person.fullName}`, id: person.id } : { t: "text", v: tok });
    } else parts.push({ t: "link", v: tok });
    last = m.index + tok.length;
  }
  if (last < str.length) parts.push({ t: "text", v: str.slice(last) });
  return parts;
}

// WhatsApp click-to-chat (opens the app on phones, WhatsApp Web on desktop).
export function waLink(number, text = "") {
  if (!number) return "";
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
