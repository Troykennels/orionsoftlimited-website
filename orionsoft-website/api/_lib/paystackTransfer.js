// Thin wrappers around the Paystack Transfers API (paying money OUT to a bank
// account), distinct from api/payments/*.js which handles money coming IN
// (Paystack Checkout for contract payments). Mirrors the fetch/error-shape
// conventions used there. All calls use PAYSTACK_SECRET_KEY.
const BASE = "https://api.paystack.co";

function authHeaders() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" };
}

// Full list of banks Paystack can send NGN transfers to, with their codes.
export async function listBanks() {
  const r = await fetch(`${BASE}/bank?currency=NGN&type=nuban`, { headers: authHeaders() });
  const json = await r.json();
  if (!r.ok || !json.status) throw new Error(json.message || "Could not fetch bank list");
  return json.data.map(b => ({ name: b.name, code: b.code }));
}

// Verifies an account number actually belongs to a real account at that bank,
// and returns the real registered name — the critical safety check before
// ever sending money.
export async function resolveAccount(accountNumber, bankCode) {
  const r = await fetch(`${BASE}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, { headers: authHeaders() });
  const json = await r.json();
  if (!r.ok || !json.status) throw new Error(json.message || "Could not verify this account number");
  return { accountNumber: json.data.account_number, accountName: json.data.account_name };
}

// Registers a payout beneficiary with Paystack. recipient_code is reused for
// every future transfer to the same person so we don't create duplicates.
export async function createRecipient({ name, accountNumber, bankCode }) {
  const r = await fetch(`${BASE}/transferrecipient`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ type: "nuban", name, account_number: accountNumber, bank_code: bankCode, currency: "NGN" }),
  });
  const json = await r.json();
  if (!r.ok || !json.status) throw new Error(json.message || "Could not register this bank account with Paystack");
  return json.data.recipient_code;
}

// Sends the actual transfer. `reference` should be deterministic per payout
// (e.g. `payroll_<id>`) so Paystack itself rejects an accidental duplicate
// call rather than paying twice.
export async function initiateTransfer({ amount, recipientCode, reference, reason }) {
  const r = await fetch(`${BASE}/transfer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(Number(amount) * 100), // kobo
      recipient: recipientCode,
      reference,
      reason,
      currency: "NGN",
    }),
  });
  const json = await r.json();
  if (!r.ok || !json.status) {
    const err = new Error(json.message || "Transfer could not be initiated");
    err.paystackCode = json.data?.status;
    throw err;
  }
  // Paystack returns data.status of "success" (instant), "pending" (queued,
  // webhook will confirm), or "otp" (blocked until OTP-for-transfers is
  // disabled in the dashboard — see api/admin/payroll.js's handling of this).
  return { status: json.data.status, transferCode: json.data.transfer_code, reference: json.data.reference };
}

// Lets an admin manually re-check a transfer that's been stuck in
// "processing" (e.g. its confirmation webhook never arrived) instead of it
// being a permanent dead end.
export async function verifyTransfer(reference) {
  const r = await fetch(`${BASE}/transfer/verify/${encodeURIComponent(reference)}`, { headers: authHeaders() });
  const json = await r.json();
  if (!r.ok || !json.status) throw new Error(json.message || "Could not verify this transfer");
  return { status: json.data.status, transferCode: json.data.transfer_code, reference: json.data.reference };
}
