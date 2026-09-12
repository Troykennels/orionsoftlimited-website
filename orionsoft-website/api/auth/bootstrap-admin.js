// One-time (or as-needed) admin account creation, gated by the server-only ADMIN_SECRET.
// Use via curl/Postman — never exposed in any client UI. Requires header: x-bootstrap-secret.
import { getByLookup, putRecord, setLookup, newId } from "../_lib/records.js";
import { hashPassword } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(500).json({ error: "ADMIN_SECRET is not configured on the server" });
  if (req.headers["x-bootstrap-secret"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { username, email, password, role } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, and password are required" });
  }
  if (password.length < 10) {
    return res.status(400).json({ error: "password must be at least 10 characters" });
  }

  const existing = await getByLookup("admins", "email", email);
  if (existing) return res.status(409).json({ error: "An admin with that email already exists" });

  const id = newId("adm");
  const passwordHash = await hashPassword(password);
  const admin = {
    id,
    username,
    email,
    passwordHash,
    role: role === "editor" ? "editor" : "superadmin",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  await putRecord("admins", id, admin);
  await setLookup("admins", "email", email, id);

  return res.json({ ok: true, admin: { id, username, email, role: admin.role } });
}
