// Real admin account management — replaces the old localStorage SHA-256 "Users & Roles" list.
import { listRecords, getByLookup, putRecord, deleteRecord, deleteLookup, setLookup, newId } from "../_lib/records.js";
import { requireAuth, hashPassword } from "../_lib/auth.js";

function publicShape(a) {
  return { id: a.id, username: a.username, email: a.email, role: a.role, status: a.status, createdAt: a.createdAt };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const admins = await listRecords("admins");
    return res.json({ ok: true, admins: admins.map(publicShape) });
  }

  if (req.method === "POST") {
    if (session.adminRole !== "superadmin") return res.status(403).json({ error: "Only a super admin can add admins" });
    const { username, email, password, role } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ error: "username, email, and password are required" });
    if (password.length < 10) return res.status(400).json({ error: "password must be at least 10 characters" });

    const existing = await getByLookup("admins", "email", email);
    if (existing) return res.status(409).json({ error: "An admin with that email already exists" });

    const id = newId("adm");
    const admin = {
      id, username, email,
      passwordHash: await hashPassword(password),
      role: role === "superadmin" ? "superadmin" : "editor",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await putRecord("admins", id, admin);
    await setLookup("admins", "email", email, id);
    return res.json({ ok: true, admin: publicShape(admin) });
  }

  if (req.method === "PATCH") {
    if (session.adminRole !== "superadmin") return res.status(403).json({ error: "Only a super admin can change admin status" });
    const { id, status } = req.body || {};
    if (!id || !["active", "disabled"].includes(status)) return res.status(400).json({ error: "id and a valid status are required" });
    if (id === session.sub) return res.status(400).json({ error: "You cannot change your own status" });
    const admins = await listRecords("admins");
    const target = admins.find((a) => a.id === id);
    if (!target) return res.status(404).json({ error: "Admin not found" });
    target.status = status;
    await putRecord("admins", id, target);
    return res.json({ ok: true, admin: publicShape(target) });
  }

  if (req.method === "DELETE") {
    if (session.adminRole !== "superadmin") return res.status(403).json({ error: "Only a super admin can remove admins" });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    if (id === session.sub) return res.status(400).json({ error: "You cannot delete your own account" });
    const admins = await listRecords("admins");
    const target = admins.find((a) => a.id === id);
    if (!target) return res.status(404).json({ error: "Admin not found" });
    const remainingSuperadmins = admins.filter((a) => a.role === "superadmin" && a.id !== id);
    if (target.role === "superadmin" && remainingSuperadmins.length === 0) {
      return res.status(400).json({ error: "Cannot remove the last super admin" });
    }
    await deleteRecord("admins", id);
    await deleteLookup("admins", "email", target.email);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
