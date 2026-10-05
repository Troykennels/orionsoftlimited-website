// Onboarding & offboarding checklists. One is created automatically when
// someone is hired (onboarding) or marked as exited (offboarding). Each item
// belongs to someone: HR/admin, the line manager, IT, or the employee, and
// everyone involved sees their own items in the Staff Office lobby.
import { listRecords, putRecord, newId } from "./records.js";

export const OWNERS = { hr: "HR / admin", manager: "Line manager", it: "IT", employee: "The employee" };

export const TEMPLATES = {
  onboarding: [
    ["hr", "Signed employment contract filed"],
    ["hr", "Guarantor form and ID copies received"],
    ["hr", "Tax ID (TIN), pension (PFA + RSA PIN) and NHF details recorded"],
    ["hr", "Bank details confirmed for salary"],
    ["it", "Work email and Staff Office account working"],
    ["it", "Laptop / phone / tools issued and logged in Assets"],
    ["employee", "Complete your profile and upload a photo"],
    ["employee", "Set up your phone (location, camera, alerts)"],
    ["employee", "Read and acknowledge the Staff Handbook"],
    ["manager", "Welcome meeting and first-week plan"],
    ["manager", "Set 30/60/90-day goals"],
    ["manager", "Probation review booked"],
  ],
  offboarding: [
    ["manager", "Handover notes and open tasks reassigned"],
    ["manager", "Client and partner contacts handed over"],
    ["it", "Company devices and assets returned"],
    ["it", "Email, Google and other system access removed"],
    ["hr", "Final pay, leave balance and deductions settled"],
    ["hr", "Pension and tax records updated"],
    ["hr", "ID card collected"],
    ["hr", "Exit interview held"],
  ],
};

export async function createChecklist(employee, kind, { extraItems = [] } = {}) {
  const existing = (await listRecords("checklists")).find(c => c.employeeId === employee.id && c.kind === kind && c.status !== "done");
  if (existing) return existing;
  const now = new Date().toISOString();
  const items = [...TEMPLATES[kind], ...extraItems].map(([owner, text]) => ({ id: newId("chk"), owner, text, done: false, doneAt: null, doneBy: null }));
  const list = { id: newId("cl"), employeeId: employee.id, kind, items, status: "open", createdAt: now, updatedAt: now };
  await putRecord("checklists", list.id, list);
  return list;
}

export function progress(list) {
  const done = list.items.filter(i => i.done).length;
  return { done, total: list.items.length, pct: list.items.length ? Math.round((done / list.items.length) * 100) : 100 };
}

export async function toggleItem(list, itemId, done, by) {
  const item = list.items.find(i => i.id === itemId);
  if (!item) throw new Error("Checklist item not found");
  item.done = !!done;
  item.doneAt = done ? new Date().toISOString() : null;
  item.doneBy = done ? by : null;
  list.status = list.items.every(i => i.done) ? "done" : "open";
  list.updatedAt = new Date().toISOString();
  await putRecord("checklists", list.id, list);
  return list;
}
