// Orion Staff Office service worker: shows phone notifications and opens the
// right page when one is tapped. It deliberately does not cache or intercept
// any requests, so the website always loads fresh.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: event.data?.text() || "Orion Staff Office" }; }
  const title = data.title || "Orion Staff Office";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    tag: data.tag || "office",
    renotify: true,
    requireInteraction: !!data.urgent,
    vibrate: data.urgent ? [300, 120, 300, 120, 300] : [120],
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
