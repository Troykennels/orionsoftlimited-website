// Keeps open tabs on the current release. Every deploy renames the code
// files, so a tab left open across a deploy (e.g. overnight) asks for files
// that no longer exist and every section it opens fails. We:
//  - reload once when a code file fails to load (with a guard against loops),
//  - notice a new release in the background and reload when the person comes
//    back to the tab, or offer a Refresh button while they're using it.

const RELOAD_KEY = "so_reloaded_at";

export function isChunkError(err) {
  const m = String(err?.message || err || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|is not a valid JavaScript MIME type|ChunkLoadError|Loading chunk \S+ failed/i.test(m);
}

// Reload at most once every 30s, so a genuinely broken file can't loop.
export function reloadOnce() {
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch { /* storage blocked */ }
  if (Date.now() - last < 30000) return false;
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* storage blocked */ }
  window.location.reload();
  return true;
}

const currentBuild = () => document.querySelector('script[type="module"][src*="/assets/index-"]')?.getAttribute("src") || "";

async function latestBuild() {
  try {
    const html = await (await fetch(`/?build-check=${Date.now()}`, { cache: "no-store" })).text();
    return html.match(/\/assets\/index-[\w-]+\.js/)?.[0] || "";
  } catch { return ""; }
}

function showUpdateBar() {
  if (document.getElementById("so-update-bar")) return;
  const bar = document.createElement("div");
  bar.id = "so-update-bar";
  bar.setAttribute("role", "status");
  bar.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:12px;max-width:calc(100% - 32px);background:#0F1828;color:#F2F6FF;border:1px solid rgba(200,168,80,.55);border-radius:12px;padding:10px 14px;font:600 13.5px 'Instrument Sans',system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45)";
  bar.innerHTML = '<span>A new version is ready.</span>';
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Refresh";
  btn.style.cssText = "background:#C8A850;color:#060810;border:none;border-radius:8px;padding:6px 14px;font-weight:800;cursor:pointer";
  btn.onclick = () => window.location.reload();
  bar.appendChild(btn);
  document.body.appendChild(bar);
}

export function keepFresh() {
  if (typeof window === "undefined" || import.meta.env.DEV) return;
  // Vite fires this when a lazily loaded file can't be fetched.
  window.addEventListener("vite:preloadError", e => { e.preventDefault(); reloadOnce(); });
  window.addEventListener("unhandledrejection", e => { if (isChunkError(e.reason)) reloadOnce(); });

  const mine = currentBuild();
  if (!mine) return;
  let newer = false;
  const check = async () => {
    if (newer) return;
    const latest = await latestBuild();
    if (latest && latest !== mine) { newer = true; showUpdateBar(); }
  };
  setInterval(check, 5 * 60 * 1000);
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
    await check();
    // Coming back after a long break (not a quick tab switch mid-form) is a
    // safe moment to switch versions; otherwise the Refresh bar stays up.
    if (newer && hiddenAt && Date.now() - hiddenAt > 10 * 60 * 1000) window.location.reload();
  });
}
