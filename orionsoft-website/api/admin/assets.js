// Company asset / inventory register — laptops, phones, licenses, furniture —
// tracked by status and, optionally, which employee currently holds them.
import { listRecords, getRecord, putRecord, deleteRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { logAudit } from "../_lib/audit.js";

const CATEGORIES = ["Laptop", "Phone", "Monitor", "Furniture", "Software License", "Networking", "Other"];
const STATUSES = ["available", "in_use", "in_repair", "retired"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const assets = await listRecords("assets");
    return res.json({ ok: true, assets: assets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), categories: CATEGORIES });
  }

  if (req.method === "POST") {
    const { name, category, serialNumber, assignedToId, purchaseDate, purchaseCost, currency, warrantyExpiry, notes } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    let assignedToName = "";
    if (assignedToId) {
      const employee = await getRecord("employees", assignedToId);
      if (!employee) return res.status(404).json({ error: "Assigned employee not found" });
      assignedToName = employee.fullName;
    }
    const id = newId("ast");
    const asset = {
      id, name, category: CATEGORIES.includes(category) ? category : "Other",
      serialNumber: serialNumber || "", assignedToId: assignedToId || null, assignedToName,
      purchaseDate: purchaseDate || null, purchaseCost: Number(purchaseCost) || 0, currency: currency || "NGN",
      warrantyExpiry: warrantyExpiry || null, notes: notes || "",
      status: assignedToId ? "in_use" : "available",
      createdAt: new Date().toISOString(), createdBy: session.sub, updatedAt: new Date().toISOString(),
    };
    await putRecord("assets", id, asset);
    await logAudit(session, "create_asset", `asset ${id}`, name);
    return res.json({ ok: true, asset });
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const asset = await getRecord("assets", id);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    if (updates.status !== undefined && !STATUSES.includes(updates.status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    if (updates.assignedToId !== undefined) {
      if (updates.assignedToId) {
        const employee = await getRecord("employees", updates.assignedToId);
        if (!employee) return res.status(404).json({ error: "Assigned employee not found" });
        asset.assignedToId = updates.assignedToId;
        asset.assignedToName = employee.fullName;
        if (!updates.status) asset.status = "in_use";
      } else {
        asset.assignedToId = null;
        asset.assignedToName = "";
        if (!updates.status) asset.status = "available";
      }
    }
    const allowed = ["name", "category", "serialNumber", "purchaseDate", "purchaseCost", "currency", "warrantyExpiry", "notes", "status"];
    for (const key of allowed) {
      if (updates[key] !== undefined) asset[key] = updates[key];
    }
    asset.updatedAt = new Date().toISOString();
    await putRecord("assets", id, asset);
    return res.json({ ok: true, asset });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteRecord("assets", id);
    await logAudit(session, "delete_asset", `asset ${id}`);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
