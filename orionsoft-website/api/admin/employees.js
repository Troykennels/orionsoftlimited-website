import { randomBytes } from "node:crypto";
import { newId, listRecords, getByLookup, getRecord, putRecord, setLookup, deleteRecord, deleteLookup } from "../_lib/records.js";
import { requireAuth, hashPassword } from "../_lib/auth.js";
import { sendEmployeeWelcome } from "../_lib/emailTemplates.js";
import { getRoleCatalog, PERMISSIONS, managerChain, directReports } from "../_lib/roles.js";
import { ensureSlugs, systemPost, notify, listActivity, leaderboard, cleanSocials } from "../_lib/office.js";
import { logAudit } from "../_lib/audit.js";
import { get } from "../store.js";

// Reject a reporting line that would loop back to the employee themselves.
function createsCycle(employeeId, managerId, employees) {
  const byId = new Map(employees.map(e => [e.id, e]));
  let cur = managerId, guard = 0;
  while (cur && guard++ < 100) {
    if (cur === employeeId) return true;
    cur = byId.get(cur)?.managerId;
  }
  return false;
}

function publicShape(e) {
  const rest = { ...e };
  delete rest.passwordHash;
  return rest;
}

function genTempPassword() {
  // 12 chars from a CSPRNG, no ambiguous characters (0/O, 1/l/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(12), b => alphabet[b % alphabet.length]).join("");
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
    const [employees, catalog] = await Promise.all([listRecords("employees"), getRoleCatalog()]);
    await ensureSlugs(employees);
    if (req.query.id) {
      const employee = employees.find(e => e.id === req.query.id);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      // Full 360 view for admin: everything the employee filled in, plus
      // their work, progress, social advocacy and approvals history.
      const [activity, goals, leave, reports, tasks, socialposts, posts, board, followers, attendance] = await Promise.all([
        listActivity(employee.id, 50), listRecords("goals"), listRecords("leave"), listRecords("reports"),
        listRecords("tasks"), listRecords("socialposts"), listRecords("posts"), leaderboard("all"),
        get(`orionsoft:social:followers:${employee.id}`), listRecords("attendance"),
      ]);
      const mgr = managerChain(employee, employees, catalog)[0];
      return res.json({
        ok: true, employee: publicShape(employee),
        manager: mgr ? { id: mgr.id, fullName: mgr.fullName, title: mgr.title } : null,
        directReports: directReports(employee, employees.filter(e => e.status === "active"), catalog).map(e => ({ id: e.id, fullName: e.fullName, title: e.title })),
        activity,
        goals: goals.filter(g => g.ownerId === employee.id),
        leave: leave.filter(l => l.employeeId === employee.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
        reports: reports.filter(r => r.employeeId === employee.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
        tasks: tasks.filter(t => t.assigneeId === employee.id),
        socialPosts: socialposts.filter(p => p.employeeId === employee.id),
        followers: followers || [],
        attendance: attendance.filter(a => a.employeeId === employee.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
        feed: { posts: posts.filter(p => p.authorId === employee.id).length, kudosReceived: posts.filter(p => p.type === "kudos" && p.kudosTo === employee.id).length },
        points: board.find(b => b.id === employee.id)?.points || 0,
      });
    }
    return res.json({ ok: true, employees: employees.map(publicShape), roles: catalog, permissions: PERMISSIONS });
  }

  // The signed-in admin (company owner) gets their own Staff Office account
  // with the all-access "owner" role, linked to their admin login so they can
  // enter the office without a separate password.
  if (req.method === "POST" && req.body?.action === "owner-office") {
    const existing = await getByLookup("employees", "admin", session.sub);
    if (existing) return res.json({ ok: true, employee: publicShape(existing), created: false });
    const admin = await getRecord("admins", session.sub);
    if (!admin) return res.status(404).json({ error: "Admin account not found" });
    let employee = await getByLookup("employees", "email", admin.email);
    if (employee) {
      employee.staffRole = "owner";
      employee.linkedAdminId = admin.id;
      employee.status = "active";
    } else {
      const id = newId("emp");
      employee = {
        id, role: "staff", staffRole: "owner", managerId: null, leaveAllowance: 20, extraPermissions: [], linkedAdminId: admin.id,
        fullName: admin.username, email: String(admin.email).toLowerCase(), phone: "", passwordHash: null,
        title: "Founder & Owner", department: "Executive", startDate: new Date().toISOString().slice(0, 10), status: "active",
        bankName: "", bankAccountNumber: "", bankAccountName: "", salaryAmount: 0, salaryCurrency: "NGN",
        avatarDataUrl: "", dateOfBirth: "", gender: "", address: "", bio: "",
        emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: session.sub,
      };
      await setLookup("employees", "email", employee.email, id);
    }
    employee.updatedAt = new Date().toISOString();
    await putRecord("employees", employee.id, employee);
    await setLookup("employees", "admin", admin.id, employee.id);
    await ensureSlugs(await listRecords("employees"));
    await logAudit(session, "owner_office_account", `employee ${employee.id}`, admin.email);
    return res.json({ ok: true, employee: publicShape(employee), created: true });
  }

  if (req.method === "POST") {
    const { fullName, email, phone, title, department, startDate, salaryAmount, salaryCurrency, staffRole, managerId } = req.body || {};
    const catalog = await getRoleCatalog();
    if (!fullName || !email || !title) {
      return res.status(400).json({ error: "fullName, email, and title are required" });
    }
    const existing = await getByLookup("employees", "email", email);
    if (existing) return res.status(409).json({ error: "An employee with that email already exists" });

    const id = newId("emp");
    const tempPassword = genTempPassword();
    const employee = {
      id, role: "staff", staffRole: catalog.some(r => r.id === staffRole) ? staffRole : "staff",
      managerId: managerId || null, leaveAllowance: 20, extraPermissions: [],
      fullName, email: String(email).trim().toLowerCase(), phone: phone || "",
      passwordHash: await hashPassword(tempPassword),
      title, department: department || "", startDate: startDate || new Date().toISOString().slice(0, 10),
      status: "active",
      bankName: "", bankAccountNumber: "", bankAccountName: "",
      salaryAmount: salaryAmount || 0, salaryCurrency: salaryCurrency || "NGN",
      avatarDataUrl: "", dateOfBirth: "", gender: "", address: "", bio: "",
      emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: session.sub,
    };
    await putRecord("employees", id, employee);
    await setLookup("employees", "email", email, id);
    const all = await listRecords("employees");
    await ensureSlugs(all);
    const fresh = all.find(e => e.id === id) || employee;

    try { await sendEmployeeWelcome(employee, tempPassword); } catch { /* best-effort */ }
    // Automation: welcome the new starter on the office feed.
    try {
      const post = await systemPost({ type: "celebration", text: `👋 Please welcome @${fresh.slug}, who joins us as ${title}${department ? ` in ${department}` : ""}! Say hello and help them settle in.`, meta: { kind: "welcome", employeeId: id } });
      await notify(all.filter(e => e.status === "active" && e.id !== id).map(e => e.id), { type: "celebration", title: `New teammate: ${fullName}`, body: title, link: `feed:${post.id}` });
    } catch { /* best-effort */ }
    await logAudit(session, "create_employee", `employee ${id}`, `${fullName} (${employee.staffRole})`);

    // The temporary password is shown to the admin once, so access never
    // depends on the welcome email actually being delivered.
    return res.json({ ok: true, employee: publicShape(employee), tempPassword });
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required" });
    const employee = await getRecord("employees", id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    if (updates.action === "reset-password") {
      const tempPassword = genTempPassword();
      employee.passwordHash = await hashPassword(tempPassword);
      employee.updatedAt = new Date().toISOString();
      await putRecord("employees", id, employee);
      try { await sendEmployeeWelcome(employee, tempPassword); } catch { /* best-effort */ }
      await logAudit(session, "reset_staff_password", `employee ${id}`, employee.fullName);
      return res.json({ ok: true, tempPassword });
    }

    const [employees, catalog] = await Promise.all([listRecords("employees"), getRoleCatalog()]);
    if (updates.staffRole !== undefined && !catalog.some(r => r.id === updates.staffRole)) {
      return res.status(400).json({ error: "Unknown role" });
    }
    if (updates.managerId) {
      if (!employees.some(e => e.id === updates.managerId)) return res.status(400).json({ error: "Manager not found" });
      if (createsCycle(id, updates.managerId, employees)) return res.status(400).json({ error: "That reporting line would create a loop" });
    }
    if (updates.status !== undefined && !["active", "suspended", "exited"].includes(updates.status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const allowed = [
      "fullName", "phone", "title", "department", "status", "staffRole", "salaryAmount", "salaryCurrency",
      "bankName", "bankAccountNumber", "bankAccountName",
      "dateOfBirth", "gender", "address", "bio", "headline", "location", "startDate", "employeeNumber", "employmentType",
      "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship",
    ];
    const before = { staffRole: employee.staffRole, managerId: employee.managerId || null, status: employee.status };
    for (const key of allowed) {
      if (updates[key] !== undefined) employee[key] = updates[key];
    }
    if (updates.managerId !== undefined) employee.managerId = updates.managerId || null;
    if (updates.leaveAllowance !== undefined) employee.leaveAllowance = Math.max(0, parseInt(updates.leaveAllowance, 10) || 0);
    if (updates.extraPermissions !== undefined) employee.extraPermissions = (updates.extraPermissions || []).filter(p => PERMISSIONS[p]);
    if (updates.socials !== undefined) employee.socials = cleanSocials(updates.socials);
    if (updates.publicProfile !== undefined) employee.publicProfile = !!updates.publicProfile;
    const changed = Object.keys(before).filter(k => (before[k] || null) !== (employee[k] || null));
    if (changed.length) {
      await logAudit(session, "update_employee_access", `employee ${id}`, changed.map(k => `${k}: ${before[k] || "-"} -> ${employee[k] || "-"}`).join(", "));
      if (before.staffRole !== employee.staffRole) {
        const label = catalog.find(r => r.id === employee.staffRole)?.label || employee.staffRole;
        await notify([id], { type: "role", title: `Your role is now ${label}`, body: "Your Staff Office tools have been updated to match.", link: "home" });
      }
    }
    employee.updatedAt = new Date().toISOString();
    await putRecord("employees", id, employee);
    return res.json({ ok: true, employee: publicShape(employee) });
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const employee = await getRecord("employees", id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    await deleteRecord("employees", id);
    await deleteLookup("employees", "email", employee.email);
    // Anyone who reported to them now reports to their manager.
    const rest = await listRecords("employees");
    for (const e of rest.filter(x => x.managerId === id)) {
      e.managerId = employee.managerId || null;
      await putRecord("employees", e.id, e);
    }
    await logAudit(session, "delete_employee", `employee ${id}`, employee.fullName);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
