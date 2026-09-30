// Website content published from the admin dashboard, loaded from the server
// for every visitor. Pages read it through readPublished() before falling
// back to browser storage / built-in defaults.
//
// It's kept in memory (not written to browser storage) so that an admin
// browsing the public site never has their unpublished drafts overwritten.

import { useEffect, useState } from "react";

const published = new Map();
let loaded = false;

export function readPublished(key) {
  return published.has(key) ? published.get(key) : undefined;
}

export function contentLoaded() { return loaded; }

// A list the admin publishes (FAQs, testimonials, clients, events…): the
// visible items in display order, or null when the admin hasn't added any,
// so the page keeps its built-in copy. Re-renders when content refreshes.
function visibleList(key) {
  const v = readPublished(key);
  if (!Array.isArray(v)) return null;
  const items = v.filter(x => x && x.published !== false && x.status !== "draft")
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (Number(a.x.order) || 0) - (Number(b.x.order) || 0) || a.i - b.i)
    .map(({ x }) => x);
  return items.length ? items : null;
}
// A single published value (e.g. the homepage settings object), or undefined.
export function usePublished(key) {
  const [value, setValue] = useState(() => readPublished(key));
  useEffect(() => {
    const on = e => { if (!e.detail?.key || e.detail.key === key) setValue(readPublished(key)); };
    window.addEventListener("localstoreupdate", on);
    return () => window.removeEventListener("localstoreupdate", on);
  }, [key]);
  return value;
}
export function usePublishedList(key) {
  const [items, setItems] = useState(() => visibleList(key));
  useEffect(() => {
    const on = e => { if (!e.detail?.key || e.detail.key === key) setItems(visibleList(key)); };
    window.addEventListener("localstoreupdate", on);
    return () => window.removeEventListener("localstoreupdate", on);
  }, [key]);
  return items;
}

export async function loadSiteContent() {
  try {
    const r = await fetch("/api/content", { cache: "no-store" });
    if (!r.ok) return;
    const { content } = await r.json();
    const changed = [];
    for (const [k, v] of Object.entries(content || {})) {
      if (JSON.stringify(published.get(k)) !== JSON.stringify(v)) { published.set(k, v); changed.push(k); }
    }
    const first = !loaded;
    loaded = true;
    // Same signal the pages already listen to for content changes.
    changed.forEach(key => window.dispatchEvent(new CustomEvent("localstoreupdate", { detail: { key } })));
    // Pages waiting for the first load (e.g. a blog post opened by link) re-check.
    if (first && !changed.length) window.dispatchEvent(new CustomEvent("localstoreupdate", { detail: { key: "__loaded" } }));
  } catch { /* offline: pages keep their defaults */ }
}
