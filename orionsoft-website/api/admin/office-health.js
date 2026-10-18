import { requireAdminAuth } from "../_lib/auth.js";
import { listRecords } from "../_lib/records.js";
import { get, storeBackend, storeError } from "../store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const auth = await requireAdminAuth(req, res);
  if (!auth) return;
  const jobs = (await listRecords("automationRuns")).map(({ id, status, startedAt, finishedAt, lastSuccessAt, attempts, error }) => ({
    id, name: id.replace(/^orionsoft:(automation:)?/, "").replace(/[-:]/g, " "), status, startedAt, finishedAt, lastSuccessAt, attempts, error,
  })).sort((a,b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  const storedPushKeys = await get("orionsoft:push:vapid");
  const configured = value => !!value;
  return res.json({ ok: true, checkedAt: new Date().toISOString(),
    database: { backend: storeBackend(), status: storeError() ? "degraded" : storeBackend() === "mem" ? "temporary" : "connected" },
    services: { email: configured(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD || process.env.RESEND_API_KEY), payments: configured(process.env.PAYSTACK_SECRET_KEY), push: configured(process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PUBLIC_KEY || storedPushKeys?.privateKey && storedPushKeys?.publicKey) },
    jobs, failed: jobs.filter(job => job.status === "failed").length,
  });
}
