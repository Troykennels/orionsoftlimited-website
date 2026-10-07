// Orion Staff Office service worker: shows phone notifications and opens the
// right page when one is tapped. It deliberately does not cache or intercept
// any requests, so the website always loads fresh.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: event.data?.text() || "Orion Staff Office" }; }
  // Showing the alert comes first and nothing else can stop it: a push that
  // shows nothing makes iPhones cancel the subscription.
  const show = self.registration.showNotification(data.title || "Orion Staff Office", {
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
  }).catch(() => self.registration.showNotification(data.title || "Orion Staff Office", { body: data.body || "", data: { url: data.url || "/staff" } }));
  const extras = (async () => {
    // An open office refreshes its bell straight away.
    try { (await self.clients.matchAll({ type: "window" })).forEach(c => c.postMessage({ type: "so-push" })); } catch { /* ignore */ }
    // Number on the home-screen icon, like WhatsApp.
    try {
      const n = Number(data.badge);
      if (self.navigator.setAppBadge) await (n > 0 ? self.navigator.setAppBadge(n) : data.badge === 0 ? self.navigator.clearAppBadge() : self.navigator.setAppBadge());
    } catch { /* ignore */ }
  })();
  event.waitUntil(Promise.all([show, extras]));
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
