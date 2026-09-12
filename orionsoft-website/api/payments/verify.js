// Client-facing fallback verification — called from the Paystack callback page
// so the payer sees an immediate result even if the webhook hasn't landed yet.
// Re-verifies directly against Paystack's API rather than trusting query params.
import { getRecord, putRecord, listRecords } from "../_lib/records.js";
import { sendPaymentReceipt } from "../_lib/emailTemplates.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return res.status(503).json({ error: "Payments are not configured" });

  const reference = req.query.reference;
  if (!reference) return res.status(400).json({ error: "reference is required" });

  const payments = await listRecords("payments");
  const payment = payments.find(p => p.reference === reference);
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  if (payment.status === "success") {
    return res.json({ ok: true, status: "success", payment });
  }

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const json = await verifyRes.json();
    if (!verifyRes.ok || !json.status) return res.status(502).json({ error: "Could not verify payment" });

    if (json.data.status === "success" && payment.status !== "success") {
      payment.status = "success";
      payment.paystackData = {
        channel: json.data.channel, paidAt: json.data.paid_at,
        authorizationCode: json.data.authorization?.authorization_code || "",
      };
      payment.verifiedAt = new Date().toISOString();
      await putRecord("payments", payment.id, payment);

      const contract = await getRecord("contracts", payment.contractId);
      if (contract) {
        if (contract.status === "signed") {
          contract.status = "active";
          contract.updatedAt = new Date().toISOString();
          await putRecord("contracts", contract.id, contract);
        }
        try {
          await sendPaymentReceipt(payment, contract);
          payment.receiptSentAt = new Date().toISOString();
          await putRecord("payments", payment.id, payment);
        } catch { /* best-effort */ }
      }
      return res.json({ ok: true, status: "success", payment });
    }

    return res.json({ ok: true, status: json.data.status, payment });
  } catch (err) {
    return res.status(502).json({ error: "Could not reach Paystack", details: err.message });
  }
}
