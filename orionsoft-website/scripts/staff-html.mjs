// After `vite build`: write dist/staff.html, the same app shell as index.html
// but with the Staff Office manifest, icon and name in the HTML itself.
// vercel.json serves it for /staff, so "Add to Home Screen" on an iPhone
// installs the Staff Office (Safari reads these tags straight from the HTML,
// before any script could change them).
import { readFileSync, writeFileSync } from "node:fs";

const src = new URL("../dist/index.html", import.meta.url);
let html = readFileSync(src, "utf8");
const swap = (re, to) => {
  if (!re.test(html)) throw new Error(`staff-html: pattern not found: ${re}`);
  html = html.replace(re, to);
};
swap(/<link rel="manifest" href="\/site\.webmanifest"\s*\/?>/, '<link rel="manifest" href="/staff.webmanifest" />');
swap(/<link rel="apple-touch-icon" href="[^"]*"\s*\/?>/, '<link rel="apple-touch-icon" href="/staff-icon-192.png" />');
swap(/<meta name="apple-mobile-web-app-title" content="[^"]*"\s*\/?>/, '<meta name="apple-mobile-web-app-title" content="Staff Office" />');
html = html.replace(/<title>[^<]*<\/title>/, "<title>Orion Staff Office</title>");
writeFileSync(new URL("../dist/staff.html", import.meta.url), html);
console.log("staff-html: dist/staff.html written");
