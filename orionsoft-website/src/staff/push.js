// Phone notifications + installable Staff Office app (client side).
import { api } from "./api.js";
import { phoneInfo } from "./geo.js";

function b64ToBytes(b64) {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const isInstalled = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register("/sw.js", { scope: "/staff" }); } catch { return null; }
}

// "on" | "off" | "blocked" | "unsupported" | "needs-install" (iPhone)
export async function pushState() {
  if (!pushSupported()) return phoneInfo().ios && !isInstalled() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/staff");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

// Must be called from a tap (browsers require a user gesture for the prompt).
export async function enablePush() {
  if (!pushSupported()) throw new Error(phoneInfo().ios ? "On iPhone, first add the Staff Office to your Home Screen (Share → Add to Home Screen), then open it from there." : "This browser can't show notifications. Use Google Chrome.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    const e = new Error(perm === "denied" ? "Notifications are blocked for this site" : "Notification permission wasn't granted");
    e.kind = perm === "denied" ? "notif_denied" : "overlay";
    throw e;
  }
  const reg = (await registerServiceWorker()) || (await navigator.serviceWorker.ready);
  const { publicKey } = await api("/api/staff/push");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }); }
    catch {
      // Usually the phone blocks Chrome itself from posting notifications
      // (Android 13+ asks per app), even though the site is allowed.
      const e = new Error("Your phone isn't letting Chrome show notifications");
      e.kind = "notif_app_blocked";
      throw e;
    }
  }
  await api("/api/staff/push", { method: "POST", body: { subscription: sub.toJSON() } });
  return true;
}

export async function sendTestPush() {
  return api("/api/staff/push", { method: "POST", body: { action: "test" } });
}

// Use the Staff Office manifest/icons while in /staff, so "Add to Home
// Screen" / "Install app" installs the office rather than the marketing site.
export function applyStaffManifest() {
  const set = (sel, create, attrs) => {
    let el = document.head.querySelector(sel);
    if (!el) { el = document.createElement(create); document.head.appendChild(el); }
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  };
  set('link[rel="manifest"]', "link", { rel: "manifest", href: "/staff.webmanifest" });
  set('link[rel="apple-touch-icon"]', "link", { rel: "apple-touch-icon", href: "/staff-icon-192.png" });
  set('meta[name="theme-color"]', "meta", { name: "theme-color", content: "#0A2540" });
  set('meta[name="apple-mobile-web-app-capable"]', "meta", { name: "apple-mobile-web-app-capable", content: "yes" });
  set('meta[name="apple-mobile-web-app-title"]', "meta", { name: "apple-mobile-web-app-title", content: "Staff Office" });
}

// Chrome's install prompt, captured so we can offer an "Install app" button.
let deferredInstall = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; window.dispatchEvent(new Event("so-installable")); });
}
export const canInstall = () => !!deferredInstall;
export async function promptInstall() {
  if (!deferredInstall) return false;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = null;
  return outcome === "accepted";
}
