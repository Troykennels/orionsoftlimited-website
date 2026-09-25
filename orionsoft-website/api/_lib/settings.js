// Company info shown on generated letterhead/PDF documents (contracts,
// letters, invoices, purchase orders, payslips) and the admin's live letter
// preview. A single server-side record, editable from Admin → Site Settings.
import { get, set } from "../store.js";

const KEY = "orionsoft:settings:company";

export const DEFAULT_ADDRESS = "Lagos Island, Lagos, Nigeria";

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: "Orion Soft Limited",
  rc: "9535128",
  email: "orionsoftlimited@gmail.com",
  phone: "08169577059",
  address: DEFAULT_ADDRESS,
  website: "www.orionsoftlimited.com",
  taxId: "",
  // Printed in the "Payment details" panel of every invoice.
  bankDetails: "",
  // Pre-filled into new invoices; editable per invoice.
  invoiceTerms: "Payment is due by the date shown above. Please use the invoice number as your payment reference.",
  // Default invoice design: classic | minimal | bold.
  invoiceTemplate: "classic",
};

const FIELDS = Object.keys(DEFAULT_COMPANY_SETTINGS);

export async function getCompanySettings() {
  const stored = (await get(KEY)) || {};
  const merged = { ...DEFAULT_COMPANY_SETTINGS, ...stored };
  // Letterheads used to show only "Nigeria".
  if (!String(merged.address || "").trim() || merged.address.trim() === "Nigeria") merged.address = DEFAULT_ADDRESS;
  return merged;
}

export async function saveCompanySettings(updates) {
  const current = await getCompanySettings();
  const next = { ...current };
  for (const key of FIELDS) {
    if (updates[key] !== undefined) next[key] = String(updates[key]).slice(0, key === "bankDetails" || key === "invoiceTerms" ? 1000 : 200);
  }
  await set(KEY, next);
  return next;
}
