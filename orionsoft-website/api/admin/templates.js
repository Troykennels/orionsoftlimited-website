import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { TEMPLATE_TYPES, DEFAULT_TEMPLATES } from "../_lib/templates.js";

// Lazily seeds the 5 default templates into the store on first access, so the
// admin always has a starting point without a separate migration step.
async function ensureSeeded() {
  const existing = await listRecords("templates");
  const existingTypes = new Set(existing.map(t => t.type));
  for (const type of TEMPLATE_TYPES) {
    if (!existingTypes.has(type)) {
      const def = DEFAULT_TEMPLATES[type];
      const id = newId("tpl");
      await putRecord("templates", id, {
        id, type, name: def.name, bodyMarkup: def.bodyMarkup,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
  }
  return listRecords("templates");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const templates = await ensureSeeded();
    return res.json({ ok: true, templates });
  }

  if (req.method === "PATCH") {
    const { id, name, bodyMarkup, resetToDefault } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const template = await getRecord("templates", id);
    if (!template) return res.status(404).json({ error: "Template not found" });
    if (resetToDefault) {
      const def = DEFAULT_TEMPLATES[template.type];
      if (!def) return res.status(400).json({ error: "No default exists for this template type" });
      template.name = def.name;
      template.bodyMarkup = def.bodyMarkup;
    } else {
      if (name !== undefined) template.name = name;
      if (bodyMarkup !== undefined) template.bodyMarkup = bodyMarkup;
    }
    template.updatedAt = new Date().toISOString();
    await putRecord("templates", id, template);
    return res.json({ ok: true, template });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
