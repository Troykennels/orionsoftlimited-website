import { listRecords, getRecord, putRecord, newId } from "../_lib/records.js";
import { requireAuth } from "../_lib/auth.js";
import { CONTRACT_TEMPLATES, CONTRACT_TEMPLATE_TYPES, LEGACY_DEFAULT_BODIES, requiredPlaceholders } from "../_lib/contractTemplates.js";
import { AUTO_KEYS } from "../_lib/contracts.js";

// Seeds any missing template type on first access, and upgrades templates
// still holding the original (never edited) wording to the current library.
// Edited templates are kept as the admin wrote them.
async function ensureSeeded() {
  const existing = await listRecords("templates");
  const byType = new Map(existing.map(t => [t.type, t]));
  const now = new Date().toISOString();
  for (const type of CONTRACT_TEMPLATE_TYPES) {
    const def = CONTRACT_TEMPLATES[type];
    const t = byType.get(type);
    if (!t) {
      const id = newId("tpl");
      await putRecord("templates", id, { id, type, name: def.name, bodyMarkup: def.bodyMarkup, createdAt: now, updatedAt: now });
    } else if (LEGACY_DEFAULT_BODIES.has(String(t.bodyMarkup || "").trim())) {
      await putRecord("templates", t.id, { ...t, name: def.name, bodyMarkup: def.bodyMarkup, upgradedAt: now, updatedAt: now });
    }
  }
  return listRecords("templates");
}

// Template settings the compose form needs, and the fields it must ask for.
function describe(t) {
  const def = CONTRACT_TEMPLATES[t.type] || {};
  return {
    ...t,
    kind: def.kind || "agreement", docLabel: def.docLabel || "Agreement", payable: !!def.payable, requiresScope: !!def.requiresScope,
    isDefault: !!def.bodyMarkup && String(t.bodyMarkup).trim() === def.bodyMarkup.trim(),
    fields: requiredPlaceholders(t.bodyMarkup, AUTO_KEYS),
  };
}
const ORDER = new Map(CONTRACT_TEMPLATE_TYPES.map((k, i) => [k, i]));

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const session = requireAuth(req, res, "admin");
  if (!session) return;

  if (req.method === "GET") {
    const templates = (await ensureSeeded()).map(describe).sort((a, b) => (ORDER.get(a.type) ?? 99) - (ORDER.get(b.type) ?? 99));
    return res.json({ ok: true, templates, autoKeys: AUTO_KEYS });
  }

  if (req.method === "PATCH") {
    const { id, name, bodyMarkup, resetToDefault } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const template = await getRecord("templates", id);
    if (!template) return res.status(404).json({ error: "Template not found" });
    if (resetToDefault) {
      const def = CONTRACT_TEMPLATES[template.type];
      if (!def) return res.status(400).json({ error: "No default exists for this template type" });
      template.name = def.name;
      template.bodyMarkup = def.bodyMarkup;
    } else {
      if (name !== undefined) {
        if (!String(name).trim()) return res.status(400).json({ error: "The template needs a name" });
        template.name = String(name).trim().slice(0, 120);
      }
      if (bodyMarkup !== undefined) {
        if (!String(bodyMarkup).trim()) return res.status(400).json({ error: "The template body can't be empty" });
        template.bodyMarkup = String(bodyMarkup).slice(0, 100_000);
      }
    }
    template.updatedAt = new Date().toISOString();
    await putRecord("templates", id, template);
    return res.json({ ok: true, template: describe(template) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
