// Web Push: real phone notifications for staff, even when the Staff Office
// isn't open (Android Chrome; iPhone once added to the Home Screen).
// VAPID keys come from env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) or are
// generated once and stored, so push works with zero setup.
import webpush from "web-push";
import { get, set } from "../store.js";

const VAPID_KEY = "orionsoft:push:vapid";
const subsKey = id => `orionsoft:push:subs:${id}`;
let vapid = null;

export async function getVapid() {
  if (vapid) return vapid;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    vapid = await get(VAPID_KEY);
    if (!vapid?.publicKey) {
      vapid = webpush.generateVAPIDKeys();
      await set(VAPID_KEY, vapid);
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com"}`, vapid.publicKey, vapid.privateKey);
  return vapid;
}

function validSub(s) {
  return s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.keys?.p256dh && s.keys?.auth;
}

export async function saveSubscription(employeeId, sub, ua = "") {
  if (!validSub(sub)) throw new Error("Invalid push subscription");
  const list = ((await get(subsKey(employeeId))) || []).filter(s => s.endpoint !== sub.endpoint);
  list.unshift({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, ua: String(ua).slice(0, 160), at: new Date().toISOString() });
  await set(subsKey(employeeId), list.slice(0, 5)); // up to 5 devices per person
}

export async function removeSubscription(employeeId, endpoint) {
  const list = (await get(subsKey(employeeId))) || [];
  await set(subsKey(employeeId), list.filter(s => s.endpoint !== endpoint));
}

export async function subscriptionCount(employeeId) {
  return ((await get(subsKey(employeeId))) || []).length;
}

// Notification link ("feed:post_1", "visits", "messages:dm--a--b") -> office URL.
export function linkToUrl(link) {
  if (!link) return "/staff";
  const [module, param] = String(link).split(/:(.+)/);
  return `/staff/${module === "home" ? "" : module}${param ? `/${encodeURIComponent(param)}` : ""}`;
}

export async function sendPush(employeeId, { title, body = "", link = "", type = "" }) {
  const list = (await get(subsKey(employeeId))) || [];
  if (!list.length) return 0;
  await getVapid();
  const payload = JSON.stringify({ title, body: String(body).slice(0, 180), url: linkToUrl(link), tag: type || "office", urgent: type === "spotcheck" });
  let sent = 0;
  const dead = [];
  await Promise.all(list.map(async s => {
    try {
      await webpush.sendNotification(s, payload, { TTL: type === "spotcheck" ? 1200 : 86400, urgency: type === "spotcheck" ? "high" : "normal" });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.endpoint); // unsubscribed / expired
    }
  }));
  if (dead.length) await set(subsKey(employeeId), list.filter(s => !dead.includes(s.endpoint)));
  return sent;
}
