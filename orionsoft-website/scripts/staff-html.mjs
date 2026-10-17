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
html = html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex, nofollow" />');
html = html.replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/, "");
html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");
writeFileSync(new URL("../dist/staff.html", import.meta.url), html);
console.log("staff-html: dist/staff.html written");

// Portal login shells are public URLs, but their account pages must never be
// search results. Give crawlers a page-level noindex rule; robots.txt must
// allow these URLs to be fetched so search engines can read that rule.
function portalHtml(title, description) {
  let portal = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  portal = portal.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  portal = portal.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}" />`);
  portal = portal.replace(/<meta name="robots" content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex, nofollow" />');
  portal = portal.replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/, "");
  portal = portal.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");
  return portal;
}
writeFileSync(new URL("../dist/client.html", import.meta.url), portalHtml(
  "Client Portal | Orion Soft Limited",
  "Secure client portal for Orion Soft Limited customers. Sign in to view invoices, contracts and support requests."
));
writeFileSync(new URL("../dist/applicant.html", import.meta.url), portalHtml(
  "Applicant Portal | Orion Soft Limited",
  "Secure applicant portal for tracking an Orion Soft Limited job application. Sign in with your application reference."
));
console.log("staff-html: noindex portal shells written");

// Which commit this website build came from. The API server compares it with
// its own commit to catch a push that Vercel never deployed (see automations).
writeFileSync(new URL("../dist/version.json", import.meta.url), JSON.stringify({
  commit: process.env.VERCEL_GIT_COMMIT_SHA || "", builtAt: new Date().toISOString(),
}) + "\n");
console.log("staff-html: dist/version.json written");
