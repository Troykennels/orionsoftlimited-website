import { listRecords } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = requireAuth(req, res, "staff");
  if (!session) return;

  const all = await listRecords("payroll");
  const mine = all
    .filter(p => p.employeeId === session.sub && p.status !== "draft")
    .sort((a, b) => b.period.localeCompare(a.period));
  return res.json({ ok: true, payslips: mine });
}
