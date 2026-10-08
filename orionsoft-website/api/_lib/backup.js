// Backups. Redis (Upstash) is the only datastore, so a copy leaves it every
// night: all records, website content and settings, gzipped JSON, emailed to
// BACKUP_EMAIL (or ADMIN_EMAIL). Photos and generated PDFs are left out to keep
// it small; password hashes and sign-in secrets too, so a leaked backup can't
// be used to sign in (people reset their password after a restore).
import { gzipSync } from "node:zlib";
import { get, list } from "../store.js";
import { listRecords } from "./records.js";
import { CONTENT_KEYS } from "./content.js";

export const ENTITIES = [
  "admins", "applicants", "appraisals", "assets", "attendance", "channels", "checklists", "contracts", "deals", "employees",
  "expenses", "goals", "invoices", "leave", "letters", "liaisons", "meetings", "payments", "payroll", "posts", "proposals", "purchaseOrders", "queries", "subscriptions",
  "reports", "sharekits", "signatories", "socialposts", "spotchecks", "tasks", "templates", "tickets", "visitplans", "visits",
];
const VALUE_KEYS = [
  "orionsoft:settings:roles", "orionsoft:settings:company", "orionsoft:office:config", "orionsoft:newsletter:settings",
  "orionsoft:leads:state", "orionsoft:field:sites", "orionsoft:invoices:seq", "orionsoft:po:seq", "orionsoft:content:_meta",
];
const LIST_KEYS = ["orionsoft:leads", "orionsoft:newsletter:subs", "orionsoft:admin:audit", "orionsoft:conversations"];
const SECRET = new Set(["passwordHash", "securityPinHash", "totpSecret", "totpPending", "totpRecovery", "photoDataUrl", "receiptDataUrl"]);

const scrub = v => (Array.isArray(v) ? v.map(scrub) : v && typeof v === "object"
  ? Object.fromEntries(Object.entries(v).filter(([k]) => !SECRET.has(k)).map(([k, x]) => [k, scrub(x)])) : v);

async function readAny(key) {
  try { const v = await get(key); if (v != null) return v; } catch { /* a list, not a value */ }
  try { return await list(key, 20000); } catch { return null; }
}

export async function buildBackup() {
  const records = {};
  for (const e of ENTITIES) records[e] = scrub(await listRecords(e).catch(() => []));
  const values = {};
  for (const k of VALUE_KEYS) values[k] = await readAny(k);
  for (const k of LIST_KEYS) values[k] = await readAny(k);
  const content = {};
  for (const k of CONTENT_KEYS) content[k] = await get(`orionsoft:content:${k}`).catch(() => null);
  const data = { app: "orionsoft-website", version: 1, createdAt: new Date().toISOString(), records, values, content };
  const counts = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, v.length]));
  return { data, counts };
}

export async function backupFile() {
  const { data, counts } = await buildBackup();
  const gz = gzipSync(Buffer.from(JSON.stringify(data)));
  return { name: `orionsoft-backup-${data.createdAt.slice(0, 10)}.json.gz`, buffer: gz, counts };
}

export async function emailBackup() {
  const to = process.env.BACKUP_EMAIL || process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com";
  const { name, buffer, counts } = await backupFile();
  const { sendEmail, brandedShell } = await import("./mailer.js");
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const html = brandedShell(`<h2 style="color:#0A2540;font-size:18px;margin:0 0 12px;">Nightly backup</h2>
    <p style="color:#3A4556;font-size:14px;line-height:1.7;">Attached: ${total.toLocaleString()} records (${(buffer.length / 1024).toFixed(0)} KB, gzipped JSON). Keep a few recent copies somewhere safe. Photos, PDFs and passwords are not included.</p>`, { title: "Backup" });
  const ok = await sendEmail(to, `Orion Soft backup ${name.slice(18, 28)}`, html, { attachments: [{ filename: name, content: buffer }], kind: "backup" });
  return { ok, bytes: buffer.length, total };
}
