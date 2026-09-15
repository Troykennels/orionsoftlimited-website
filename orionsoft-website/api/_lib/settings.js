// Company info shown on generated letterhead/PDF documents (contracts,
// payslips) and the admin's live letter preview. Previously hardcoded as
// constants in api/_lib/pdf.js and src/admin/Dashboard.jsx with no way for
// an admin to actually change them; now a single server-side record so both
// places read the same source of truth, editable from Settings.
import { get, set } from "../store.js";

const KEY = "orionsoft:settings:company";

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: "Orion Soft Limited",
  rc: "9535128",
  email: "orionsoftlimited@gmail.com",
  phone: "08169577059",
  address: "Nigeria",
};

export async function getCompanySettings() {
  const stored = await get(KEY);
  return { ...DEFAULT_COMPANY_SETTINGS, ...(stored || {}) };
}

export async function saveCompanySettings(updates) {
  const current = await getCompanySettings();
  const allowed = ["companyName", "rc", "email", "phone", "address"];
  const next = { ...current };
  for (const key of allowed) {
    if (updates[key] !== undefined) next[key] = String(updates[key]);
  }
  await set(KEY, next);
  return next;
}
