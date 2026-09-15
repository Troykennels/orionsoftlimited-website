import { requireAuth } from "../_lib/auth.js";
import { getCompanySettings, saveCompanySettings } from "../_lib/settings.js";
import { logAudit } from "../_lib/audit.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const settings = await getCompanySettings();
    return res.json({ ok: true, settings });
  }

  if (req.method === "PATCH") {
    const settings = await saveCompanySettings(req.body || {});
    await logAudit(session, "update_company_settings", "settings", settings.companyName);
    return res.json({ ok: true, settings });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
