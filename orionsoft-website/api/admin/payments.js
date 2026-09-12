import { listRecords } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  let payments = await listRecords("payments");
  if (req.query.contractId) payments = payments.filter(p => p.contractId === req.query.contractId);
  return res.json({ ok: true, payments: payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
}
