// Paystack webhook receiver. Verifies the x-paystack-signature header (HMAC
// SHA512 over the raw request body) before trusting anything in the payload —
// this is the only server-to-server entry point that mutates payment/contract
// state based on an external call, so signature verification is mandatory.
import crypto from "node:crypto";
import { getRecord, putRecord, listRecords } from "../_lib/records.js";
import { sendPaymentReceipt } from "../_lib/emailTemplates.js";

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return res.status(503).json({ error: "Payments are not configured" });

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-paystack-signature"];
  const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  if (!signature || expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event;
  try { event = JSON.parse(rawBody.toString("utf8")); } catch { return res.status(400).json({ error: "Invalid payload" }); }

  if (event.event === "charge.success") {
    const reference = event.data?.reference;
    const payments = await listRecords("payments");
    const payment = payments.find(p => p.reference === reference);
    if (payment && payment.status !== "success") {
      payment.status = "success";
      payment.paystackData = {
        channel: event.data.channel, paidAt: event.data.paid_at,
        authorizationCode: event.data.authorization?.authorization_code || "",
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
    }
  }

  return res.status(200).json({ ok: true });
}
