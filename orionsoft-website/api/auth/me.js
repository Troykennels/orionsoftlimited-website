import { getSessionFromRequest } from "../_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  let ownerOffice = false;
  if (session.role === "admin") {
    const { getByLookup } = await import("../_lib/records.js");
    ownerOffice = !!(await getByLookup("employees", "admin", session.sub));
  }
  return res.json({
    ok: true, ownerOffice,
    user: { id: session.sub, name: session.name, email: session.email, role: session.role, adminRole: session.adminRole, staffRole: session.staffRole, department: session.department, title: session.title },
  });
}
