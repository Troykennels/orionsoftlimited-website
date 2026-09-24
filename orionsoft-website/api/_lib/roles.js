// Role catalog, permissions, and reporting-line hierarchy for the Staff Office.
//
// Every employee has a `staffRole` (a role id below) and an optional
// `managerId` (who they report to). Permissions come from the role, plus any
// per-person `extraPermissions` an admin grants. Admins can add new roles or
// edit built-in ones from the dashboard; those overrides are stored in Redis
// and merged over BUILTIN_ROLES, so the code never has to change to add a role.
//
// Legacy values "staff" and "manager" (used before this catalog existed) are
// kept as real roles so existing employee records keep working unchanged.
import { get, set } from "../store.js";

export const PERMISSIONS = {
  "team.view":       "See their team's dashboard, presence and progress",
  "team.approve":    "Approve leave & weekly reports for people who report to them",
  "org.approve":     "Approve leave & weekly reports for anyone in the company",
  "hr.records":      "View full HR records (personal, emergency, bank) of all staff",
  "announce":        "Post pinned company announcements to the office feed",
  "tasks.assign":    "Assign tasks to people who report to them",
  "pipeline":        "Use the business development deal pipeline",
  "pipeline.all":    "See every deal in the company pipeline",
  "liaison":         "Use the stakeholder & partner liaison register",
  "liaison.all":     "See every stakeholder engagement in the company",
  "sharekits":       "Publish social share kits for staff to share",
  "finance.approve": "Approve staff expense claims",
  "moderate":        "Pin or remove posts in the office feed",
};

const ALL = Object.keys(PERMISSIONS);
const LEAD = ["team.view", "team.approve", "tasks.assign"];

// level: 1 = top of the organisation. Lower numbers outrank higher ones and
// sort first in the org chart. `department` is only a suggested default.
export const BUILTIN_ROLES = [
  // The company owner, linked to a website admin account. Sees everything.
  { id: "owner",                       label: "Owner (Admin)",                        level: 1, department: "Executive",               permissions: ALL },
  { id: "md",                          label: "Managing Director / CEO",              level: 1, department: "Executive",               permissions: ALL },
  { id: "coo",                         label: "Chief Operating Officer",              level: 2, department: "Executive",               permissions: [...LEAD, "org.approve", "announce", "pipeline", "pipeline.all", "liaison", "liaison.all", "sharekits", "finance.approve", "moderate"] },
  { id: "hr_manager",                  label: "HR Manager",                           level: 3, department: "Human Resources",         permissions: [...LEAD, "org.approve", "hr.records", "announce", "sharekits", "moderate"] },
  { id: "chief_liaison_officer",       label: "Chief Liaison Officer",                level: 3, department: "Partnerships & Liaison",  permissions: [...LEAD, "liaison", "liaison.all", "pipeline", "announce"] },
  { id: "head_business_development",   label: "Head of Business Development",         level: 3, department: "Sales & Business Development", permissions: [...LEAD, "pipeline", "pipeline.all", "liaison", "sharekits"] },
  { id: "finance_manager",             label: "Finance Manager",                      level: 3, department: "Finance",                 permissions: [...LEAD, "finance.approve"] },
  { id: "marketing_manager",           label: "Marketing & Communications Manager",   level: 3, department: "Marketing",               permissions: [...LEAD, "sharekits", "announce", "moderate"] },
  { id: "tech_lead",                   label: "Technical Lead / Engineering Manager", level: 3, department: "Engineering",             permissions: [...LEAD] },
  { id: "manager",                     label: "Department Manager",                   level: 3, department: "",                        permissions: [...LEAD, "pipeline"] },
  { id: "product_manager",             label: "Product Manager",                      level: 4, department: "Product",                 permissions: ["team.view", "tasks.assign"] },
  { id: "team_lead",                   label: "Team Lead / Supervisor",               level: 4, department: "",                        permissions: [...LEAD] },
  { id: "business_development_officer",label: "Business Development Officer",         level: 5, department: "Sales & Business Development", permissions: ["pipeline", "liaison"] },
  { id: "sales_executive",             label: "Sales Executive (Field Sales)",        level: 5, department: "Sales & Business Development", permissions: ["pipeline"] },
  { id: "liaison_officer",             label: "Liaison Officer",                      level: 5, department: "Partnerships & Liaison",  permissions: ["liaison"] },
  { id: "hr_officer",                  label: "HR Officer",                           level: 5, department: "Human Resources",         permissions: ["hr.records"] },
  { id: "accountant",                  label: "Accountant",                           level: 5, department: "Finance",                 permissions: [] },
  { id: "marketing_officer",           label: "Marketing / Social Media Officer",     level: 5, department: "Marketing",               permissions: ["sharekits"] },
  { id: "software_engineer",           label: "Software Engineer",                    level: 5, department: "Engineering",             permissions: [] },
  { id: "implementation_specialist",   label: "Implementation & Training Specialist", level: 5, department: "Customer Success",        permissions: [] },
  { id: "support_officer",             label: "Customer Success / Support Officer",   level: 5, department: "Customer Success",        permissions: [] },
  { id: "admin_officer",               label: "Admin & Office Officer",               level: 5, department: "Administration",          permissions: [] },
  { id: "staff",                       label: "Staff",                                level: 5, department: "",                        permissions: [] },
  { id: "intern",                      label: "Intern / NYSC Corps Member",           level: 6, department: "",                        permissions: [] },
];

const OVERRIDES_KEY = "orionsoft:settings:roles";

function cleanRole(r) {
  return {
    id: String(r.id || "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40),
    label: String(r.label || r.id || "").slice(0, 80),
    level: Math.min(9, Math.max(1, parseInt(r.level, 10) || 5)),
    department: String(r.department || "").slice(0, 80),
    permissions: (Array.isArray(r.permissions) ? r.permissions : []).filter(p => PERMISSIONS[p]),
    custom: !!r.custom,
  };
}

// Built-ins merged with admin overrides/additions. Cached briefly because
// nearly every staff request resolves permissions.
let cache = null;
let cacheAt = 0;
export async function getRoleCatalog() {
  if (cache && Date.now() - cacheAt < 30_000) return cache;
  const overrides = (await get(OVERRIDES_KEY)) || {};
  const byId = new Map(BUILTIN_ROLES.map(r => [r.id, { ...r, custom: false }]));
  for (const [id, o] of Object.entries(overrides)) {
    if (o?.deleted) { if (!BUILTIN_ROLES.some(b => b.id === id)) byId.delete(id); continue; }
    byId.set(id, cleanRole({ ...(byId.get(id) || {}), ...o, id }));
  }
  cache = [...byId.values()].sort((a, b) => a.level - b.level || a.label.localeCompare(b.label));
  cacheAt = Date.now();
  return cache;
}

export async function saveRole(role) {
  const clean = cleanRole(role);
  if (!clean.id || !clean.label) throw new Error("Role id and label are required");
  const overrides = (await get(OVERRIDES_KEY)) || {};
  overrides[clean.id] = { ...clean, custom: !BUILTIN_ROLES.some(b => b.id === clean.id) };
  await set(OVERRIDES_KEY, overrides);
  cache = null;
  return clean;
}

// Built-in roles can't be deleted, only reset to their defaults.
export async function deleteRole(id) {
  const overrides = (await get(OVERRIDES_KEY)) || {};
  if (BUILTIN_ROLES.some(b => b.id === id)) delete overrides[id];
  else overrides[id] = { deleted: true };
  await set(OVERRIDES_KEY, overrides);
  cache = null;
}

export function roleOf(employee, catalog) {
  return catalog.find(r => r.id === employee?.staffRole) || catalog.find(r => r.id === "staff") || BUILTIN_ROLES.find(r => r.id === "staff");
}

export function permissionsOf(employee, catalog) {
  const perms = new Set(roleOf(employee, catalog).permissions);
  for (const p of employee?.extraPermissions || []) if (PERMISSIONS[p]) perms.add(p);
  return perms;
}

export function can(employee, perm, catalog) {
  return permissionsOf(employee, catalog).has(perm);
}

// Who someone reports to, walking up managerId links (cycle-safe). If a person
// has no explicit manager, the most senior team lead in their department acts
// as their line manager so nobody's requests are left without an approver.
export function managerChain(employee, employees, catalog) {
  const byId = new Map(employees.map(e => [e.id, e]));
  const chain = [];
  const seen = new Set([employee.id]);
  let cur = employee;
  while (cur?.managerId && !seen.has(cur.managerId) && byId.has(cur.managerId)) {
    seen.add(cur.managerId);
    cur = byId.get(cur.managerId);
    chain.push(cur);
  }
  if (chain.length === 0 && employee.department) {
    const myLevel = roleOf(employee, catalog).level;
    const heads = employees
      .filter(e => e.id !== employee.id && e.status === "active" && e.department === employee.department
        && can(e, "team.approve", catalog) && roleOf(e, catalog).level < myLevel)
      .sort((a, b) => roleOf(a, catalog).level - roleOf(b, catalog).level);
    if (heads[0]) chain.push(heads[0]);
  }
  return chain;
}

export function isAbove(actor, target, employees, catalog) {
  return managerChain(target, employees, catalog).some(m => m.id === actor.id);
}

// Everyone below `actor` in the reporting tree (direct + indirect).
export function subordinates(actor, employees, catalog) {
  return employees.filter(e => e.id !== actor.id && isAbove(actor, e, employees, catalog));
}

export function directReports(actor, employees, catalog) {
  return employees.filter(e => e.id !== actor.id && managerChain(e, employees, catalog)[0]?.id === actor.id);
}

// Can `actor` approve/review requests raised by `target`?
export function canApproveFor(actor, target, employees, catalog) {
  if (!actor || !target || actor.id === target.id) return false;
  if (can(actor, "org.approve", catalog)) return true;
  return can(actor, "team.approve", catalog) && isAbove(actor, target, employees, catalog);
}

// People who should be notified when `target` submits something for approval:
// their line manager plus company-wide approvers (HR/executive).
export function approversFor(target, employees, catalog) {
  const ids = new Set();
  const line = managerChain(target, employees, catalog)[0];
  if (line && can(line, "team.approve", catalog)) ids.add(line.id);
  for (const e of employees) {
    if (e.id !== target.id && e.status === "active" && can(e, "org.approve", catalog)) ids.add(e.id);
  }
  return [...ids];
}
