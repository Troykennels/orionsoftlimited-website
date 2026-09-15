// Unified PDF/file download endpoint. Three ways to be authorized for a given
// `key` (an orionsoft:files:* blob key):
//   1. Admin session cookie — any key.
//   2. Staff session cookie — only their own issued payslip.
//   3. Contract sign token (?token=&contractId=) — only that contract's PDF.
import { get } from "../store.js";
import { getSessionFromRequest, verifySession } from "../_lib/auth.js";
import { listRecords } from "../_lib/records.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const key = req.query.key;
  if (!key || !key.startsWith("orionsoft:files:")) return res.status(400).json({ error: "Invalid key" });

  let authorized = false;

  const session = getSessionFromRequest(req);
  if (session?.role === "admin") {
    authorized = true;
  } else if (session?.role === "staff") {
    const payrolls = await listRecords("payroll");
    const owning = payrolls.find(p => p.payslipPdfKey === key);
    if (owning && owning.employeeId === session.sub) authorized = true;
  }

  if (!authorized && req.query.token && req.query.contractId) {
    const payload = verifySession(req.query.token);
    if (payload?.role === "contract-sign" && payload.contractId === req.query.contractId) {
      if (key === `orionsoft:files:contract_${req.query.contractId}` || key === `orionsoft:files:contract_signed_${req.query.contractId}`) {
        authorized = true;
      }
    }
  }

  if (!authorized) return res.status(401).json({ error: "Unauthorized" });

  const base64 = await get(key);
  if (!base64) return res.status(404).json({ error: "File not found" });

  const buffer = Buffer.from(base64, "base64");
  const disposition = req.query.download ? "attachment" : "inline";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="${key.split(":").pop()}.pdf"`);
  return res.status(200).send(buffer);
}
