import { RefreshCw, AlertTriangle } from "lucide-react";
import { C, font } from "./theme.js";
import { Btn } from "./components.jsx";
import { phoneInfo } from "./geo.js";

// Plain-language, phone-specific fixes for location/camera failures.
function steps(kind) {
  const p = phoneInfo();
  const browser = p.edge ? "Edge" : "Chrome";
  // Setting the permission by hand never needs the pop-up, so it works even
  // when a call or chat bubble stops the pop-up from appearing.
  const chromeSite = [
    `In ${browser}, tap the icon to the left of the web address (a lock or ⓘ).`,
    "Tap Permissions (or Site settings) and set Location and Camera to Allow.",
    "Come back here and tap Try again.",
  ];
  switch (kind) {
    case "overlay":
      return {
        title: "Your phone blocked the permission pop-up",
        why: "Android hides website permission pop-ups while another app is on top of the screen, like a WhatsApp call (the green \"using microphone\" bar), a chat bubble or a screen filter.",
        list: [
          "End any phone or WhatsApp call first. A call in progress always blocks this pop-up.",
          "Close chat bubbles or floating heads (Messenger, WhatsApp, Truecaller) and turn off night light or blue-light filters for a moment.",
          ...(p.transsion ? ["Tecno/Infinix/itel: swipe away the Smart Panel and turn off Floating windows (Settings → Special function)."] : []),
          ...(p.samsung ? ["Samsung: close Edge panels and any pop-up view apps."] : []),
          "Tap Try again.",
          `Still blocked? Skip the pop-up. In ${browser}, tap the lock or ⓘ left of the web address → Permissions → set Location and Camera to Allow, then tap Try again. You only need to do this once.`,
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
        list: [
          ...chromeSite,
          ...(p.edge ? ["Also in Edge: tap ⋯ (menu) → Settings → Privacy and security → Site permissions → Location, turn on \"Ask before accessing\" and remove orionsoftlimited.com from Blocked."] : []),
          `If it's still blocked: phone Settings → Apps → ${browser} → Permissions → Location → Allow only while using the app.`,
        ],
      };
    case "app_denied":
      return {
        title: `Your phone is blocking ${browser} from using location`,
        why: `This website is allowed, but Android has location switched off for the ${browser} app itself, so every try fails until it's allowed.`,
        list: [
          `Open phone Settings → Apps → ${browser} → Permissions → Location.`,
          "Choose \"Allow only while using the app\" and make sure \"Use precise location\" is on.",
          ...(p.transsion ? [`Tecno/Infinix/itel: Settings → Apps → App management → ${browser} → Permissions → Location → Allow.`] : []),
          ...(p.edge ? ["In Edge also check: ⋯ (menu) → Settings → Privacy and security → Site permissions → Location is set to \"Ask before accessing\"."] : []),
          "Make sure Location is on (swipe down from the top of the screen).",
          "Come back here and tap Try again.",
        ],
      };
    case "notif_denied":
      return p.ios ? {
        title: "Notifications are blocked",
        why: "They were turned off for the Staff Office app on this iPhone.",
        list: ["Open Settings → Notifications → Staff Office and switch Allow Notifications on.", "Come back and tap Try again."],
      } : {
        title: "Notifications are blocked for this site",
        why: "They were set to Block, so the site can't ask again by itself.",
        list: [`In ${browser}, tap the icon left of the web address (lock or ⓘ) → Permissions → Notifications → Allow.`, `If it still won't work: phone Settings → Apps → ${browser} → Notifications → allow.`, "Come back and tap Try again."],
      };
    case "notif_app_blocked":
      return {
        title: `Your phone isn't letting ${browser} show notifications`,
        why: `The site is allowed, but the phone has notifications switched off for the ${browser} app.`,
        list: [
          `Open phone Settings → Apps → ${browser} → Notifications and switch them on.`,
          ...(p.transsion ? [`Tecno/Infinix/itel: also check Settings → Notifications & status bar → ${browser} → Allow.`] : []),
          `Turn off Do Not Disturb or battery saver restrictions for ${browser} if they're on.`,
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
        title: "No location signal yet",
        why: "The phone couldn't get GPS, Wi-Fi or mobile-network location in time.",
        list: [
          "Make sure Location is on (swipe down from the top of the screen).",
          ...(p.android ? ["Turn on Google Location Accuracy (Settings → Location → Location services) so Wi-Fi and mobile data can locate you indoors."] : []),
          "Turn on Wi-Fi scanning or mobile data, or step near a window.",
          "Tap Try again.",
        ],
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

export default function DeviceHelp({ kind, detail, onRetry, onSkip, skipLabel = "Continue without it" }) {
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
      {detail && <div style={{ marginTop: 10, fontSize: 11.5, color: C.textMuted, wordBreak: "break-word" }}>{detail}</div>}
    </div>
  );
}
