// Admin: staff queries across the whole company. Issue a query to anyone,
// read responses, close with an outcome, withdraw, or delete. See _lib/queries.js.
import { getRecord, listRecords, deleteRecord } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";
import { getRoleCatalog } from "../_lib/roles.js";
import { CATEGORIES, OUTCOMES, createQuery, closeQuery, withdrawQuery } from "../_lib/queries.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;
  const fail = (e) => res.status(e.status || 500).json({ error: e.message || "Something went wrong" });
  const adminName = session.name || "Management";

  if (req.method === "GET") {
    const queries = (await listRecords("queries")).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ ok: true, queries, categories: CATEGORIES, outcomes: OUTCOMES });
  }

  try {
    if (req.method === "POST") {
      const body = req.body || {};
      const [employees, catalog] = await Promise.all([listRecords("employees"), getRoleCatalog()]);
      const employee = employees.find(e => e.id === body.employeeId && e.status === "active");
      if (!employee) return res.status(404).json({ error: "Staff member not found" });
      const query = await createQuery({
        employee, employees, catalog, session, body,
        issuedBy: { kind: "admin", id: session.sub, name: String(body.issuerName || "").trim().slice(0, 80) || adminName, title: String(body.issuerTitle || "").trim().slice(0, 80) || "Management" },
      });
      return res.json({ ok: true, query });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};
      const q = body.id ? await getRecord("queries", body.id) : null;
      if (!q) return res.status(404).json({ error: "Query not found" });
      if (body.action === "close") return res.json({ ok: true, query: await closeQuery(q, body, adminName, session) });
      if (body.action === "withdraw") return res.json({ ok: true, query: await withdrawQuery(q, body.reason, adminName, session) });
      return res.status(400).json({ error: "Unknown action" });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id || !(await getRecord("queries", id))) return res.status(404).json({ error: "Query not found" });
      await deleteRecord("queries", id);
      await logAudit(session, "delete_query", `query ${id}`);
      return res.json({ ok: true });
    }
  } catch (e) { return fail(e); }

  return res.status(405).json({ error: "Method not allowed" });
}
