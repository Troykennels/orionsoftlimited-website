// Initializes a Paystack transaction for a contract's outstanding amount and
// returns the hosted checkout URL. Server-side only — the secret key never
// reaches the client.
import { getRecord, putRecord, newId } from "../_lib/records.js";
import { getSessionFromRequest, verifySession } from "../_lib/auth.js";

function isAuthorized(req, contract) {
  const session = getSessionFromRequest(req);
  if (session?.role === "admin") return true;
  const { token } = req.body || {};
  if (token) {
    const payload = verifySession(token);
    if (payload?.role === "contract-sign" && payload.contractId === contract.id) return true;
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return res.status(503).json({ error: "Payments are not configured yet. Set PAYSTACK_SECRET_KEY." });

  const { contractId } = req.body || {};
  if (!contractId) return res.status(400).json({ error: "contractId is required" });

  const contract = await getRecord("contracts", contractId);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (!isAuthorized(req, contract)) return res.status(401).json({ error: "Unauthorized" });
  if (!contract.recipientEmail) return res.status(400).json({ error: "Contract has no recipient email" });
  if (!contract.amount || contract.amount <= 0) return res.status(400).json({ error: "Contract has no payable amount" });
  if (!["signed", "active"].includes(contract.status)) return res.status(400).json({ error: "This contract must be signed before a payment can be requested" });

  const paymentId = newId("pmt");
  const reference = `orionsoft_${paymentId}`;
  const baseUrl = process.env.APP_BASE_URL || "";

  try {
    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: contract.recipientEmail,
        amount: Math.round(Number(contract.amount) * 100), // kobo/cents
        currency: contract.currency === "USD" ? "USD" : "NGN",
        reference,
        callback_url: `${baseUrl}/pay/callback?reference=${reference}`,
        metadata: { contractId: contract.id, contractTitle: contract.title },
      }),
    });
    const initJson = await initRes.json();
    if (!initRes.ok || !initJson.status) {
      return res.status(502).json({ error: initJson.message || "Paystack initialization failed" });
    }

    const payment = {
      id: paymentId, contractId: contract.id, reference,
      amount: contract.amount, currency: contract.currency,
      status: "initialized", paystackData: {}, receiptSentAt: null,
      createdAt: new Date().toISOString(), verifiedAt: null,
    };
    await putRecord("payments", paymentId, payment);

    return res.json({ ok: true, authorizationUrl: initJson.data.authorization_url, reference, payment });
  } catch (err) {
    return res.status(502).json({ error: "Could not reach Paystack", details: err.message });
  }
}
