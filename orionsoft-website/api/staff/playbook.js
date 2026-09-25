// The staff training guide (content/staff-playbook.html), for signed-in staff
// and the admin only. Opened from Staff Office → Handbook & Links.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getStaffSession, getAdminSession } from "../_lib/auth.js";
import { getRecord } from "../_lib/records.js";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../content/staff-playbook.html");

const signInPage = `<!doctype html><html lang="en-NG"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Staff Playbook</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A2540;font-family:system-ui,sans-serif;padding:16px;box-sizing:border-box">
<div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;text-align:center">
<h1 style="font-size:20px;margin:0 0 8px;color:#0E1726">Sign in to read the Staff Playbook</h1>
<p style="color:#4b5563;line-height:1.6;margin:0 0 18px">The playbook is for Orion Soft staff. Sign in to the Staff Office first, then open it from Handbook &amp; Links.</p>
<a href="/staff/handbook" style="display:inline-block;background:#C8A850;color:#060810;font-weight:700;padding:11px 20px;border-radius:10px;text-decoration:none">Go to the Staff Office</a>
</div></body></html>`;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  let allowed = !!getAdminSession(req);
  if (!allowed) {
    const s = getStaffSession(req);
    const emp = s ? await getRecord("employees", s.sub) : null;
    allowed = !!emp && emp.status === "active";
  }
  if (!allowed) return res.status(401).send(signInPage);
  return res.send(fs.readFileSync(FILE, "utf8"));
}
