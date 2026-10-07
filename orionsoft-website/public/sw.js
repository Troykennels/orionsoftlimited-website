// Orion Staff Office service worker: shows phone notifications and opens the
// right page when one is tapped. It deliberately does not cache or intercept
// any requests, so the website always loads fresh.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: event.data?.text() || "Orion Staff Office" }; }
  const title = data.title || "Orion Staff Office";
  // An open office refreshes its bell straight away.
  event.waitUntil(self.clients.matchAll({ type: "window" }).then(all => all.forEach(c => c.postMessage({ type: "so-push" }))));
  // Number on the home-screen icon, like WhatsApp (iPhone and Android apps).
  if (self.navigator.setAppBadge) {
    const n = Number(data.badge);
    event.waitUntil((Number.isFinite(n) && n > 0 ? self.navigator.setAppBadge(n) : data.badge === 0 ? self.navigator.clearAppBadge() : self.navigator.setAppBadge()).catch(() => {}));
  }
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    tag: data.tag || "office",
    renotify: true,
    silent: !!data.silent, // quiet hours: no sound; otherwise the phone's notification sound
    requireInteraction: !!data.urgent,
    vibrate: data.urgent ? [400, 150, 400, 150, 400, 150, 400] : [200, 100, 200],
    timestamp: Date.now(),
    icon: "/staff-icon-192.png",
    badge: "/staff-badge-96.png",
    data: { url: data.url || "/staff" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/staff", self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = all.find(c => c.url.startsWith(`${self.location.origin}/staff`));
    if (existing) { await existing.focus(); existing.navigate(url).catch(() => {}); return; }
    await self.clients.openWindow(url);
  })());
});
