// Website content published from the admin dashboard, loaded from the server
// for every visitor. Pages read it through readPublished() before falling
// back to browser storage / built-in defaults.
//
// It's kept in memory (not written to browser storage) so that an admin
// browsing the public site never has their unpublished drafts overwritten.

const published = new Map();
let loaded = false;

export function readPublished(key) {
  return published.has(key) ? published.get(key) : undefined;
}

export function contentLoaded() { return loaded; }

export async function loadSiteContent() {
  try {
    const r = await fetch("/api/content", { cache: "no-store" });
    if (!r.ok) return;
    const { content } = await r.json();
    const changed = [];
    for (const [k, v] of Object.entries(content || {})) {
      if (JSON.stringify(published.get(k)) !== JSON.stringify(v)) { published.set(k, v); changed.push(k); }
    }
    loaded = true;
    // Same signal the pages already listen to for content changes.
    changed.forEach(key => window.dispatchEvent(new CustomEvent("localstoreupdate", { detail: { key } })));
  } catch { /* offline: pages keep their defaults */ }
}
