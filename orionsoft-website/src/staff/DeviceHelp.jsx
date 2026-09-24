import { RefreshCw, AlertTriangle } from "lucide-react";
import { C, font } from "./theme.js";
import { Btn } from "./components.jsx";
import { phoneInfo } from "./geo.js";

// Plain-language, phone-specific fixes for location/camera failures.
function steps(kind) {
  const p = phoneInfo();
  const chromeSite = [
    "In Chrome, tap the icon to the left of the web address (a lock or ⓘ).",
    "Tap Permissions (or Site settings) and set Location and Camera to Allow.",
    "Come back here and tap Try again.",
  ];
  switch (kind) {
    case "overlay":
      return {
        title: "Your phone blocked the permission pop-up",
        why: "Android hides website permission pop-ups while another app is showing on top of the screen, to protect you from trick taps.",
        list: [
          "Close any chat bubbles or floating heads (Messenger, WhatsApp bubbles, Truecaller caller ID).",
          "Turn off night light, eye comfort, blue-light filter or screen-dimmer apps for a moment.",
          "Stop any screen recorder.",
          ...(p.transsion ? ["Tecno/Infinix/itel: swipe away the Smart Panel, and turn off Floating windows in Settings → Special function."] : []),
          ...(p.samsung ? ["Samsung: close Edge panels and any floating/pop-up view apps."] : []),
          "Still stuck? Open Settings → Apps → Special app access → Display over other apps, and switch it off for chat/filter apps.",
          "Then tap Try again.",
        ],
      };
    case "denied":
    case "camera_denied":
      return p.ios ? {
        title: kind === "denied" ? "Location is blocked for this site" : "Camera is blocked for this site",
        why: "It was turned off on this iPhone, so the site can't ask again by itself.",
        list: [
          `Open Settings → Privacy & Security → ${kind === "denied" ? "Location Services → turn it On → Safari Websites → While Using the App" : "Camera → allow Safari"}.`,
          "Or in Safari tap aA in the address bar → Website Settings → set Location and Camera to Allow.",
          "Come back here and tap Try again.",
        ],
      } : {
        title: kind === "denied" ? "Location is blocked for this site" : "Camera is blocked for this site",
        why: "It was set to Block for orionsoftlimited.com, so the site can't ask again by itself.",
        list: [...chromeSite, "If it's still blocked: phone Settings → Apps → Chrome → Permissions → allow Location and Camera."],
      };
    case "notif_denied":
      return p.ios ? {
        title: "Notifications are blocked",
        why: "They were turned off for the Staff Office app on this iPhone.",
        list: ["Open Settings → Notifications → Staff Office and switch Allow Notifications on.", "Come back and tap Try again."],
      } : {
        title: "Notifications are blocked for this site",
        why: "They were set to Block, so the site can't ask again by itself.",
        list: ["In Chrome, tap the icon left of the web address (lock or ⓘ) → Permissions → Notifications → Allow.", "If it still won't work: phone Settings → Apps → Chrome → Notifications → allow.", "Come back and tap Try again."],
      };
    case "notif_app_blocked":
      return {
        title: "Your phone isn't letting Chrome show notifications",
        why: "The site is allowed, but the phone has notifications switched off for the Chrome app.",
        list: [
          "Open phone Settings → Apps → Chrome → Notifications and switch them on.",
          ...(p.transsion ? ["Tecno/Infinix/itel: also check Settings → Notifications & status bar → Chrome → Allow."] : []),
          "Turn off Do Not Disturb or battery saver restrictions for Chrome if they're on.",
          "Come back and tap Try again.",
        ],
      };
    case "off":
      return {
        title: "Your phone's location is switched off",
        why: "The website can't get GPS while location is off on the phone.",
        list: [
          p.ios ? "Open Settings → Privacy & Security → Location Services and switch it on." : "Swipe down from the top of the screen and turn on Location (GPS).",
          ...(p.android ? ["For the best accuracy also turn on Google Location Accuracy (Settings → Location)."] : []),
          "Tap Try again.",
        ],
      };
    case "timeout":
      return {
        title: "No GPS signal yet",
        why: "Phones need a clear view of the sky for an accurate fix.",
        list: ["Step near a window or outside for a moment.", "Make sure Location is on and not in battery-saver mode.", "Tap Try again."],
      };
    case "no_camera":
      return { title: "No camera found", why: "This device doesn't have a camera the browser can use.", list: ["Use your phone instead of a computer for check-ins.", "Or upload a photo (it will be marked as not taken live)."] };
    case "camera_busy":
      return { title: "The camera is being used by another app", why: "Only one app can use the camera at a time.", list: ["Close the Camera app, WhatsApp video or any video call.", "Tap Try again."] };
    case "insecure":
      return { title: "Open the secure site", why: "Location and camera only work on https.", list: ["Use https://www.orionsoftlimited.com/staff"] };
    default:
      return { title: "Something blocked this", why: "The browser couldn't use location or the camera.", list: ["Use Google Chrome (Android) or Safari (iPhone), updated to the latest version.", ...chromeSite] };
  }
}

export default function DeviceHelp({ kind, onRetry, onSkip, skipLabel = "Continue without it" }) {
  if (!kind) return null;
  const s = steps(kind);
  return (
    <div role="alert" style={{ background: C.amberDim, border: `1px solid ${C.amber}66`, borderRadius: 12, padding: 14, fontFamily: font }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14.5, fontWeight: 800, color: C.heading }}><AlertTriangle size={17} color={C.amber} /> {s.title}</div>
      <p style={{ fontSize: 13, color: C.text, margin: "6px 0 8px", lineHeight: 1.5 }}>{s.why}</p>
      <ol style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 13.5, color: C.heading, lineHeight: 1.6 }}>
        {s.list.map((t, i) => <li key={i}>{t}</li>)}
      </ol>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {onRetry && <Btn small icon={RefreshCw} onClick={onRetry}>Try again</Btn>}
        {onSkip && <Btn small variant="ghost" onClick={onSkip}>{skipLabel}</Btn>}
      </div>
    </div>
  );
}
