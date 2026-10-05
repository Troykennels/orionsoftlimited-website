// Super admin: download a backup now (GET) or email one now (POST).
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { backupFile, emailBackup } from "../_lib/backup.js";
import { get } from "../store.js";

export default async function handler(req, res) {
  const session = requireAuth(req, res, "admin");
  if (!session) return;
  if (session.adminRole !== "superadmin") return res.status(403).json({ error: "Only a super admin can take backups" });

  if (req.method === "GET") {
    if (req.query.view === "status") return res.json({ ok: true, last: await get("orionsoft:backup:last"), to: process.env.BACKUP_EMAIL || process.env.ADMIN_EMAIL || "orionsoftlimited@gmail.com" });
    const { name, buffer } = await backupFile();
    await logAudit(session, "download_backup", "all data");
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    return res.end(buffer);
  }
  if (req.method === "POST") {
    const r = await emailBackup();
    await logAudit(session, "email_backup", "all data", `${r.total} records, ${r.ok ? "sent" : "failed"}`);
    return r.ok ? res.json({ ok: true, ...r }) : res.status(502).json({ error: "The backup email couldn't be sent. Check the email settings.", ...r });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
