// Admin (owner) controls for people and the Staff Office:
//  - EmployeesSection: hire, roles & reporting lines, full 360° staff view,
//    password resets, org chart, and entering the office as the owner.
//  - StaffOfficeSection: targeted announcements, feed moderation, share kits,
//    roles & permissions, office settings/handbook, and advocacy analytics.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, KeyRound, Eye, Pencil, Megaphone, Pin, Trash2, Plus, Copy, Save, Network, Users, Download, IdCard } from "lucide-react";
import { C, font, PRESENCE, SOCIAL_META } from "../staff/theme.js";
import { Btn, Badge, SectionCard, SectionTitle, Input, Textarea, Select, Field, Grid, Modal, Tabs, EmptyState, StatCard, Avatar, Progress, Toaster, toast } from "../staff/components.jsx";
import { resizeImageToDataUrl } from "../staff/imageUtils.js";
import "../staff/staff.css";

async function call(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}
const fmtDate = d => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const ago = iso => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  return s < 3600 ? `${Math.max(1, Math.floor(s / 60))}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : fmtDate(iso);
};
function downloadCSV(name, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, "'")}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function RoleSelect({ roles, value, onChange }) {
  const levels = [...new Set(roles.map(r => r.level))].sort((a, b) => a - b);
  const names = { 1: "Executive", 2: "Senior leadership", 3: "Management", 4: "Leads", 5: "Officers & staff", 6: "Interns" };
  return (
    <Select value={value} onChange={onChange}>
      {levels.map(l => <optgroup key={l} label={names[l] || `Level ${l}`}>{roles.filter(r => r.level === l).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</optgroup>)}
    </Select>
  );
}

function TempPassword({ info, onClose }) {
  return (
    <Modal title={info.title} onClose={onClose} width={460}>
      <p style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6, marginTop: 0 }}>{info.text}</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.surface, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "12px 14px", margin: "12px 0" }}>
        <code style={{ flex: 1, fontSize: 18, color: C.goldLight, letterSpacing: "0.06em" }}>{info.password}</code>
        <Btn small variant="ghost" icon={Copy} onClick={() => navigator.clipboard?.writeText(`Staff Office: ${window.location.origin}/staff\nEmail: ${info.email}\nTemporary password: ${info.password}`).then(() => toast("Login details copied"))}>Copy login</Btn>
      </div>
      <p style={{ fontSize: 12.5, color: C.textMuted, margin: 0 }}>We also emailed it to {info.email}. It's shown here once so you can share it on WhatsApp if the email doesn't arrive. They should change it (or link Google) after signing in.</p>
    </Modal>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Working days (tap to toggle) plus start and finish times.
function WorkHoursFields({ value, onChange }) {
  const days = value.days || [1, 2, 3, 4, 5];
  const toggle = d => onChange({ ...value, days: days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort() });
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }} role="group" aria-label="Working days">
        {WEEK_ORDER.map(d => {
          const on = days.includes(d);
          return <button key={d} type="button" aria-pressed={on} onClick={() => toggle(d)} style={{ minWidth: 48, padding: "8px 10px", borderRadius: 8, border: `1px solid ${on ? C.gold : C.border}`, background: on ? C.goldDim : "transparent", color: on ? C.heading : C.textMuted, fontWeight: 700, fontSize: 13, fontFamily: font, cursor: "pointer" }}>{DAY_NAMES[d]}</button>;
        })}
      </div>
      <Grid min={160}>
        <Field label="Starts at"><Input type="time" value={value.start || "09:00"} onChange={e => onChange({ ...value, start: e.target.value })} /></Field>
        <Field label="Finishes at"><Input type="time" value={value.end || "17:00"} onChange={e => onChange({ ...value, end: e.target.value })} /></Field>
      </Grid>
    </div>
  );
}

function EmployeeForm({ initial, roles, employees, onClose, onSaved }) {
  const creating = !initial;
  const [f, setF] = useState(() => initial ? {
    fullName: initial.fullName || "", title: initial.title || "", department: initial.department || "", phone: initial.phone || "",
    staffRole: initial.staffRole || "staff", managerId: initial.managerId || "", status: initial.status || "active",
    startDate: initial.startDate || "", salaryAmount: initial.salaryAmount || "", salaryCurrency: initial.salaryCurrency || "NGN",
    leaveAllowance: initial.leaveAllowance ?? 20, extraPermissions: initial.extraPermissions || [], employmentType: initial.employmentType || "full_time",
    bankName: initial.bankName || "", bankAccountNumber: initial.bankAccountNumber || "", bankAccountName: initial.bankAccountName || "",
    publicProfile: !!initial.publicProfile,
    workSchedule: initial.workSchedule || null,
    taxId: initial.taxId || "", pfaName: initial.pfaName || "", rsaPin: initial.rsaPin || "", nhfNumber: initial.nhfNumber || "",
    annualRent: initial.annualRent ?? "", pensionableMonthly: initial.pensionableMonthly ?? "", basicMonthly: initial.basicMonthly ?? "", nhisMonthly: initial.nhisMonthly ?? "",
    nhfOptIn: !!initial.nhfOptIn, pensionExempt: !!initial.pensionExempt,
    probationEndDate: initial.probationEndDate || "", documents: initial.documents || [],
  } : { fullName: "", email: "", title: "", department: "", phone: "", staffRole: "staff", managerId: "", salaryAmount: "", salaryCurrency: "NGN", startDate: new Date().toISOString().slice(0, 10) });
  const [perms, setPerms] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { call("/api/admin/employees").then(j => setPerms(j.permissions || {})).catch(() => {}); }, []);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const role = roles.find(r => r.id === f.staffRole);
  const departments = [...new Set([...employees.map(e => e.department), ...roles.map(r => r.department)].filter(Boolean))].sort();

  async function save() {
    setBusy(true);
    try {
      const body = { ...f, managerId: f.managerId || null };
      const j = await call("/api/admin/employees", { method: creating ? "POST" : "PATCH", body: creating ? body : { id: initial.id, ...body } });
      toast(creating ? "Employee added and welcomed on the office feed" : "Changes saved");
      onSaved(j);
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <Modal title={creating ? "Add an employee" : `Edit ${initial.fullName}`} onClose={onClose} width={720}>
      <Grid min={200} style={{ marginBottom: 12 }}>
        <Field label="Full name"><Input value={f.fullName} onChange={set("fullName")} /></Field>
        {creating && <Field label="Work email"><Input type="email" value={f.email} onChange={set("email")} /></Field>}
        <Field label="Job title"><Input value={f.title} onChange={set("title")} placeholder={role?.label} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field>
      </Grid>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "6px 0 8px" }}>ROLE & REPORTING LINE</div>
      <Grid min={200} style={{ marginBottom: 8 }}>
        <Field label="Role"><RoleSelect roles={roles} value={f.staffRole} onChange={e => { const r = roles.find(x => x.id === e.target.value); setF(x => ({ ...x, staffRole: e.target.value, department: x.department || r?.department || "" })); }} /></Field>
        <Field label="Department">
          <Input list="dept-list" value={f.department} onChange={set("department")} placeholder={role?.department || "e.g. Sales & Business Development"} />
          <datalist id="dept-list">{departments.map(d => <option key={d} value={d} />)}</datalist>
        </Field>
        <Field label="Reports to"><Select value={f.managerId} onChange={set("managerId")}><option value="">Nobody (top of the organisation)</option>{employees.filter(e => e.id !== initial?.id && e.status === "active").map(e => <option key={e.id} value={e.id}>{e.fullName} · {roles.find(r => r.id === e.staffRole)?.label || e.title}</option>)}</Select></Field>
      </Grid>
      {role && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12.5, color: C.text }}>
          <strong style={{ color: C.heading }}>{role.label}</strong> can: {role.permissions.length ? role.permissions.map(p => perms[p] || p).join(" · ") : "use the standard staff tools (feed, messages, meetings, tasks, goals, social, reports, leave, expenses, payslips)."}
        </div>
      )}
      {!creating && (
        <>
          <Grid min={180} style={{ marginBottom: 12 }}>
            <Field label="Status"><Select value={f.status} onChange={set("status")}><option value="active">Active</option><option value="suspended">Suspended (can't sign in)</option><option value="exited">Exited the company</option></Select></Field>
            <Field label="Employment type"><Select value={f.employmentType} onChange={set("employmentType")}><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="intern">Intern / NYSC</option></Select></Field>
            <Field label="Start date"><Input type="date" value={f.startDate} onChange={set("startDate")} /></Field>
            <Field label="Annual leave (days)"><Input type="number" min="0" value={f.leaveAllowance} onChange={set("leaveAllowance")} /></Field>
          </Grid>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "6px 0 8px" }}>WORKING HOURS</div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.text, marginBottom: 10 }}>
            <input type="checkbox" checked={!f.workSchedule} onChange={e => setF(x => ({ ...x, workSchedule: e.target.checked ? null : { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] } }))} />
            Follow the company working hours (set in Staff Office → Settings)
          </label>
          {f.workSchedule && <div style={{ marginBottom: 12 }}><WorkHoursFields value={f.workSchedule} onChange={ws => setF(x => ({ ...x, workSchedule: ws }))} /></div>}
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "6px 0 8px" }}>EXTRA PERMISSIONS (ON TOP OF THE ROLE)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 6, marginBottom: 12 }}>
            {Object.entries(perms).map(([k, label]) => {
              const fromRole = role?.permissions.includes(k);
              return (
                <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: fromRole ? C.textMuted : C.text }}>
                  <input type="checkbox" disabled={fromRole} checked={fromRole || f.extraPermissions.includes(k)} onChange={e => setF(x => ({ ...x, extraPermissions: e.target.checked ? [...x.extraPermissions, k] : x.extraPermissions.filter(p => p !== k) }))} style={{ marginTop: 2 }} />
                  <span>{label}{fromRole ? " (from role)" : ""}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
      <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "6px 0 8px" }}>PAY</div>
      <Grid min={180} style={{ marginBottom: 12 }}>
        <Field label="Monthly salary"><Input type="number" value={f.salaryAmount} onChange={set("salaryAmount")} /></Field>
        <Field label="Currency"><Select value={f.salaryCurrency} onChange={set("salaryCurrency")}><option>NGN</option><option>USD</option></Select></Field>
        {creating && <Field label="Start date"><Input type="date" value={f.startDate} onChange={set("startDate")} /></Field>}
        {!creating && <><Field label="Bank"><Input value={f.bankName} onChange={set("bankName")} /></Field><Field label="Account number"><Input value={f.bankAccountNumber} onChange={set("bankAccountNumber")} /></Field><Field label="Account name"><Input value={f.bankAccountName} onChange={set("bankAccountName")} /></Field></>}
      </Grid>
      {!creating && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "6px 0 4px" }}>TAX, PENSION & NHF</div>
          <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 8px" }}>Used to work out PAYE, pension and NHF on each payslip. Leave pay splits blank to use the full monthly salary.</p>
          <Grid min={180} style={{ marginBottom: 8 }}>
            <Field label="Tax ID (TIN)"><Input value={f.taxId} onChange={set("taxId")} /></Field>
            <Field label="Pension manager (PFA)"><Input value={f.pfaName} onChange={set("pfaName")} placeholder="e.g. Stanbic IBTC Pension" /></Field>
            <Field label="RSA PIN"><Input value={f.rsaPin} onChange={set("rsaPin")} placeholder="PEN…" /></Field>
            <Field label="NHF number"><Input value={f.nhfNumber} onChange={set("nhfNumber")} /></Field>
            <Field label="Basic + housing + transport / month"><Input type="number" min="0" value={f.pensionableMonthly} onChange={set("pensionableMonthly")} placeholder="= salary" /></Field>
            <Field label="Basic pay / month (for NHF)"><Input type="number" min="0" value={f.basicMonthly} onChange={set("basicMonthly")} placeholder="= above" /></Field>
            <Field label="Rent paid / year (rent relief)"><Input type="number" min="0" value={f.annualRent} onChange={set("annualRent")} /></Field>
            <Field label="Health insurance / month"><Input type="number" min="0" value={f.nhisMonthly} onChange={set("nhisMonthly")} /></Field>
          </Grid>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 12, fontSize: 13, color: C.text }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.nhfOptIn} onChange={e => setF(x => ({ ...x, nhfOptIn: e.target.checked }))} /> Contributes to NHF (2.5%)</label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.pensionExempt} onChange={e => setF(x => ({ ...x, pensionExempt: e.target.checked }))} /> No pension deduction</label>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.06em", margin: "6px 0 8px" }}>PROBATION & DOCUMENTS</div>
          <Grid min={200} style={{ marginBottom: 8 }}>
            <Field label="Probation ends"><Input type="date" value={f.probationEndDate} onChange={set("probationEndDate")} /></Field>
          </Grid>
          <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 6px" }}>IDs, licences, guarantor forms, certifications… You and HR are reminded 30 and 7 days before anything expires.</p>
          {f.documents.map((d, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1.2fr auto", gap: 6, marginBottom: 6 }}>
              <Input value={d.name} onChange={e => setF(x => ({ ...x, documents: x.documents.map((y, j) => j === i ? { ...y, name: e.target.value } : y) }))} placeholder="Document (e.g. Driver's licence)" aria-label="Document name" />
              <Input value={d.number || ""} onChange={e => setF(x => ({ ...x, documents: x.documents.map((y, j) => j === i ? { ...y, number: e.target.value } : y) }))} placeholder="Number" aria-label="Document number" />
              <Input type="date" value={d.expiresOn || ""} onChange={e => setF(x => ({ ...x, documents: x.documents.map((y, j) => j === i ? { ...y, expiresOn: e.target.value } : y) }))} aria-label="Expiry date" />
              <Btn small danger icon={Trash2} onClick={() => setF(x => ({ ...x, documents: x.documents.filter((_, j) => j !== i) }))} />
            </div>
          ))}
          <Btn small variant="ghost" icon={Plus} onClick={() => setF(x => ({ ...x, documents: [...x.documents, { name: "", number: "", expiresOn: "" }] }))} style={{ marginBottom: 14 }}>Add document</Btn>
        </>
      )}
      <Btn onClick={save} disabled={busy || !f.fullName || !f.title || (creating && !f.email)} icon={Save}>{creating ? "Create & send welcome email" : "Save changes"}</Btn>
    </Modal>
  );
}

// Onboarding / offboarding checklists for one person (admin can tick any item).
function AdminChecklists({ employeeId }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const load = useCallback(() => call(`/api/admin/checklists?employeeId=${encodeURIComponent(employeeId)}`).then(setData).catch(e => toast(e.message, "err")), [employeeId]);
  useEffect(() => { load(); }, [load]);
  const act = async (body, method = "PATCH") => { try { await call("/api/admin/checklists", { method, body }); load(); } catch (e) { toast(e.message, "err"); } };
  if (!data) return <EmptyState>Loading…</EmptyState>;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Btn small variant="ghost" icon={Plus} onClick={() => act({ employeeId, kind: "onboarding" }, "POST")}>Start onboarding</Btn>
        <Btn small variant="ghost" icon={Plus} onClick={() => act({ employeeId, kind: "offboarding" }, "POST")}>Start offboarding</Btn>
      </div>
      {data.checklists.length === 0 && <EmptyState>No checklists yet. One starts automatically when someone is hired or marked as exited.</EmptyState>}
      {data.checklists.map(list => (
        <SectionCard key={list.id} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <strong style={{ color: C.heading, fontSize: 14 }}>{list.kind === "onboarding" ? "Onboarding" : "Offboarding"} · started {fmtDate(list.createdAt)}</strong>
            <Badge color={list.progress.pct === 100 ? C.mint : C.blue}>{list.progress.done}/{list.progress.total}</Badge>
          </div>
          <Progress value={list.progress.pct} height={5} />
          {list.items.map(i => (
            <div key={i.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <input type="checkbox" checked={i.done} onChange={() => act({ id: list.id, action: "toggle", itemId: i.id, done: !i.done })} aria-label={i.text} />
              <span style={{ flex: 1, color: i.done ? C.textMuted : C.text, textDecoration: i.done ? "line-through" : "none" }}>{i.text}</span>
              <span style={{ fontSize: 11.5, color: C.textMuted }}>{data.owners[i.owner]}{i.doneBy ? ` · ✓ ${i.doneBy}` : ""}</span>
              <button type="button" aria-label="Remove item" onClick={() => act({ id: list.id, action: "remove-item", itemId: i.id })} style={{ background: "none", border: "none", color: C.rose, cursor: "pointer" }}>×</button>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 150px auto", gap: 6, marginTop: 8 }}>
            <Input value={draft[list.id]?.text || ""} onChange={ev => setDraft(d => ({ ...d, [list.id]: { ...d[list.id], text: ev.target.value } }))} placeholder="Add an item…" aria-label="New item" />
            <Select value={draft[list.id]?.owner || "hr"} onChange={ev => setDraft(d => ({ ...d, [list.id]: { ...d[list.id], owner: ev.target.value } }))} aria-label="Who does it">{Object.entries(data.owners).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            <Btn small onClick={() => { act({ id: list.id, action: "add-item", text: draft[list.id]?.text, owner: draft[list.id]?.owner || "hr" }); setDraft(d => ({ ...d, [list.id]: {} })); }}>Add</Btn>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

function Employee360({ id, roles, onClose, onEdit }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("profile");
  useEffect(() => { call(`/api/admin/employees?id=${encodeURIComponent(id)}`).then(setD).catch(e => toast(e.message, "err")); }, [id]);
  if (!d) return <Modal title="Loading…" onClose={onClose}><EmptyState>Loading full profile…</EmptyState></Modal>;
  const e = d.employee;
  const role = roles.find(r => r.id === e.staffRole);
  const pres = PRESENCE[e.presence?.status] || PRESENCE.offline;
  const row = (k, v) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><span style={{ color: C.textMuted }}>{k}</span><span style={{ color: C.heading, textAlign: "right", wordBreak: "break-word" }}>{v || "—"}</span></div>;
  return (
    <Modal title={e.fullName} onClose={onClose} width={860}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <Avatar src={e.avatarDataUrl} name={e.fullName} size={64} presence={e.presence?.status} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13.5, color: C.text }}>{e.title} · {e.department || "No department"}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <Badge color={C.gold}>{role?.label || e.staffRole}</Badge><Badge color={pres.color}>{pres.label}</Badge>
            <Badge color={e.status === "active" ? C.mint : C.amber}>{e.status}</Badge>
            {e.googleSub && <Badge color={C.blue}>Google linked</Badge>}{e.publicProfile && <Badge color={C.mint}>Public profile</Badge>}
            <Badge color={C.purple}>{d.points} pts</Badge>
          </div>
          {e.headline && <div style={{ fontSize: 13, color: C.heading, marginTop: 6 }}>{e.headline}</div>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Btn small variant="ghost" icon={IdCard} onClick={() => window.open(`/id-card?employee=${encodeURIComponent(e.id)}`, "_blank", "noopener")}>ID card</Btn>
          <Btn small variant="ghost" icon={Pencil} onClick={onEdit}>Edit</Btn>
          {e.totpEnabled && <Btn small variant="ghost" icon={KeyRound} onClick={async () => {
            if (!confirm(`Turn off two-step sign-in for ${e.fullName}? Do this only if they've lost their phone; they can set it up again from their profile.`)) return;
            try { await call("/api/admin/employees", { method: "PATCH", body: { id: e.id, action: "reset-2fa" } }); toast("Two-step sign-in turned off"); } catch (err) { toast(err.message, "err"); }
          }}>Reset two-step</Btn>}
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: "profile", label: "Profile & HR" }, { id: "work", label: "Work & goals", count: d.goals.length }, { id: "hr", label: "Leave, reports, attendance" }, { id: "social", label: "Social & advocacy" }, { id: "checklists", label: "On/offboarding" }, { id: "activity", label: "Activity" }]} />
      {tab === "profile" && (
        <Grid min={320}>
          <div>
            <SectionTitle>About</SectionTitle>
            <p style={{ fontSize: 13.5, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 0 }}>{e.bio || "No bio yet."}</p>
            {(e.skills || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{e.skills.map(s => <Badge key={s} color={C.blue}>{s}</Badge>)}</div>}
            {Object.entries(e.socials || {}).map(([k, url]) => <a key={k} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginRight: 10, fontSize: 13, color: SOCIAL_META[k]?.color || C.blue }}>{SOCIAL_META[k]?.label || k} ↗</a>)}
            <div style={{ height: 12 }} />
            {row("Work email", e.email)}{row("Phone", e.phone)}{row("WhatsApp", e.whatsapp)}{row("Location", e.location)}
            {row("Reports to", d.manager ? `${d.manager.fullName} (${d.manager.title})` : "Top of organisation")}
            {row("Direct reports", d.directReports.map(r => r.fullName).join(", ") || "None")}
          </div>
          <div>
            <SectionTitle>HR record</SectionTitle>
            {row("Start date", fmtDate(e.startDate))}{row("Employment type", e.employmentType?.replace("_", " "))}{row("Date of birth", fmtDate(e.dateOfBirth))}{row("Gender", e.gender)}{row("Home address", e.address)}
            {row("Emergency contact", [e.emergencyContactName, e.emergencyContactRelationship, e.emergencyContactPhone].filter(Boolean).join(" · "))}
            {row("Salary", e.salaryAmount ? `${e.salaryCurrency} ${Number(e.salaryAmount).toLocaleString()}` : "")}
            {row("Bank", [e.bankName, e.bankAccountNumber, e.bankAccountName].filter(Boolean).join(" · "))}
            {row("Annual leave", `${e.leaveAllowance ?? 20} days`)}{row("Last sign-in", e.lastLoginAt ? `${ago(e.lastLoginAt)} (${e.lastLoginMethod || "password"})` : "")}
          </div>
        </Grid>
      )}
      {tab === "work" && (
        <Grid min={320}>
          <div>
            <SectionTitle>Goals</SectionTitle>
            {d.goals.length === 0 && <EmptyState>No goals.</EmptyState>}
            {d.goals.map(g => <div key={g.id} style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.heading, marginBottom: 4 }}><span>{g.title} <span style={{ color: C.textMuted }}>· {g.status} · {g.visibility}</span></span><strong>{g.progress}%</strong></div><Progress value={g.progress} /></div>)}
          </div>
          <div>
            <SectionTitle>Tasks</SectionTitle>
            {d.tasks.length === 0 && <EmptyState>No tasks.</EmptyState>}
            {d.tasks.map(t => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ color: C.heading }}>{t.title}</span><Badge color={t.status === "done" ? C.mint : C.blue}>{t.status.replace("_", " ")}</Badge></div>)}
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 10 }}>{d.feed.posts} feed posts · {d.feed.kudosReceived} kudos received</div>
          </div>
        </Grid>
      )}
      {tab === "hr" && (
        <Grid min={260}>
          <div><SectionTitle>Leave</SectionTitle>{d.leave.length === 0 && <EmptyState>None.</EmptyState>}{d.leave.map(l => <div key={l.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.border}`, color: C.text }}>{l.type} · {fmtDate(l.startDate)}–{fmtDate(l.endDate)} <Badge color={l.status === "approved" ? C.mint : l.status === "rejected" ? C.rose : C.amber}>{l.status}</Badge></div>)}</div>
          <div><SectionTitle>Weekly reports</SectionTitle>{d.reports.length === 0 && <EmptyState>None.</EmptyState>}{d.reports.map(r => <div key={r.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.border}`, color: C.text }}>{fmtDate(r.weekStart)} <Badge color={r.status === "approved" ? C.mint : r.status === "rejected" ? C.rose : C.amber}>{r.status}</Badge><div style={{ color: C.textMuted, fontSize: 12 }}>{r.summary?.slice(0, 90)}</div></div>)}</div>
          <div><SectionTitle>Attendance (last 30 days)</SectionTitle>{d.attendance.length === 0 && <EmptyState>No clock-ins yet.</EmptyState>}{d.attendance.map(a => <div key={a.id} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${C.border}`, color: C.text, display: "flex", justifyContent: "space-between" }}><span>{fmtDate(a.date)} · {a.mode?.replace("_", " ")}</span><span style={{ color: C.textMuted }}>{Math.floor((a.minutes || 0) / 60)}h {(a.minutes || 0) % 60}m{a.standup ? " · standup" : ""}</span></div>)}</div>
        </Grid>
      )}
      {tab === "social" && (
        <div>
          <SectionTitle>Logged social posts</SectionTitle>
          {d.socialPosts.length === 0 && <EmptyState>No social posts logged.</EmptyState>}
          {d.socialPosts.map(p => <div key={p.id} style={{ fontSize: 13, padding: "8px 0", borderBottom: `1px solid ${C.border}`, color: C.text }}><Badge color={SOCIAL_META[p.platform]?.color}>{SOCIAL_META[p.platform]?.label || p.platform}</Badge> {p.caption} {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ color: C.blue }}>open ↗</a>}<div style={{ fontSize: 12, color: C.textMuted }}>{p.metrics.likes} likes · {p.metrics.comments} comments · {p.metrics.shares} shares · {p.metrics.views} views · boosted by {(p.engagedBy || []).length}</div></div>)}
          <SectionTitle>Follower growth</SectionTitle>
          {d.followers.length === 0 ? <EmptyState>No follower data.</EmptyState> : Object.entries(d.followers.reduce((m, s) => ({ ...m, [s.platform]: [...(m[s.platform] || []), s] }), {})).map(([k, pts]) => <div key={k} style={{ fontSize: 13, color: C.text }}>{SOCIAL_META[k]?.label || k}: {pts[0].followers.toLocaleString()} → <strong style={{ color: C.mint }}>{pts[pts.length - 1].followers.toLocaleString()}</strong> ({fmtDate(pts[0].date)} to {fmtDate(pts[pts.length - 1].date)})</div>)}
        </div>
      )}
      {tab === "checklists" && <AdminChecklists employeeId={e.id} />}
      {tab === "activity" && (d.activity.length === 0 ? <EmptyState>No activity yet.</EmptyState> : d.activity.map(a => <div key={a.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.border}`, color: C.text, display: "flex", justifyContent: "space-between", gap: 10 }}><span>{a.text}</span><span style={{ color: C.textMuted, whiteSpace: "nowrap", fontSize: 12 }}>{ago(a.at)}</span></div>))}
    </Modal>
  );
}

function OrgChart({ employees, roles }) {
  const active = employees.filter(e => e.status === "active");
  const ids = new Set(active.map(e => e.id));
  const level = e => roles.find(r => r.id === e.staffRole)?.level || 5;
  const kids = id => active.filter(e => e.managerId === id).sort((a, b) => level(a) - level(b));
  const node = (e, depth = 0) => (
    <div key={e.id} style={{ marginLeft: depth ? 24 : 0, borderLeft: depth ? `1px dashed ${C.borderStrong}` : "none", paddingLeft: depth ? 14 : 0 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, margin: "5px 0", padding: "7px 12px", background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${level(e) <= 2 ? C.gold : level(e) <= 3 ? C.blue : C.border}`, borderRadius: 10 }}>
        <Avatar src={e.avatarDataUrl} name={e.fullName} size={28} />
        <div><div style={{ fontSize: 13, fontWeight: 800, color: C.heading }}>{e.fullName}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{roles.find(r => r.id === e.staffRole)?.label} · {e.department || "—"}</div></div>
      </div>
      {kids(e.id).map(k => node(k, depth + 1))}
    </div>
  );
  return <SectionCard style={{ overflowX: "auto" }}>{active.filter(e => !e.managerId || !ids.has(e.managerId)).sort((a, b) => level(a) - level(b)).map(e => node(e))}</SectionCard>;
}

export function EmployeesSection() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useState("list");
  const [form, setForm] = useState(null); // "new" | employee
  const [viewing, setViewing] = useState(null);
  const [temp, setTemp] = useState(null);

  const load = useCallback(async () => {
    try { const j = await call("/api/admin/employees"); setEmployees(j.employees); setRoles(j.roles); }
    catch (e) { toast(e.message, "err"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const roleLabel = id => roles.find(r => r.id === id)?.label || id;
  const byId = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const list = employees.filter(e => !q || `${e.fullName} ${e.email} ${e.title} ${e.department} ${roleLabel(e.staffRole)}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || (roles.find(r => r.id === a.staffRole)?.level || 9) - (roles.find(r => r.id === b.staffRole)?.level || 9));

  async function enterOffice() {
    // Phones (iPhone Safari especially) block a new tab opened after waiting
    // for the server, so the tab is opened right on the tap and pointed at the
    // office once the owner account is ready. If it's still blocked, the
    // office opens in this tab instead.
    const tab = window.open("", "_blank");
    try {
      const j = await call("/api/admin/employees", { method: "POST", body: { action: "owner-office" } });
      toast(j.created ? "Your owner account is ready" : "Opening the Staff Office");
      if (tab && !tab.closed) tab.location.href = "/staff";
      else window.location.href = "/staff";
      load();
    } catch (e) { if (tab) tab.close(); toast(e.message, "err"); }
  }
  async function resetPassword(e) {
    if (!confirm(`Reset ${e.fullName}'s password? Their current password stops working immediately.`)) return;
    try { const j = await call("/api/admin/employees", { method: "PATCH", body: { id: e.id, action: "reset-password" } }); setTemp({ title: "New temporary password", text: `${e.fullName}'s password was reset and emailed to them.`, password: j.tempPassword, email: e.email }); }
    catch (ex) { toast(ex.message, "err"); }
  }
  async function toggleStatus(e) {
    const next = e.status === "active" ? "suspended" : "active";
    if (next === "suspended" && !confirm(`Suspend ${e.fullName}? They'll be signed out of the Staff Office immediately.`)) return;
    try { await call("/api/admin/employees", { method: "PATCH", body: { id: e.id, status: next } }); toast(next === "active" ? "Reactivated" : "Suspended"); load(); } catch (ex) { toast(ex.message, "err"); }
  }

  return (
    <div style={{ fontFamily: font }}>
      <Toaster />
      <SectionCard style={{ marginBottom: 18, background: "linear-gradient(120deg, rgba(10,37,64,0.95), rgba(59,47,18,0.6))", borderColor: `${C.gold}44` }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <Building2 size={30} color={C.gold} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.heading }}>You're the owner. Admin sees everything.</div>
            <div style={{ fontSize: 13, color: C.text, marginTop: 4, lineHeight: 1.6 }}>HR, managers and staff work in the Staff Office with role-based access. HR can't access this admin dashboard. Open any employee below for their full 360° profile, or join the office yourself with the all-access Owner role.</div>
          </div>
          <Btn icon={Building2} onClick={enterOffice}>Enter Staff Office as Owner</Btn>
        </div>
      </SectionCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard label="Employees" value={employees.length} color={C.blue} icon={Users} />
        <StatCard label="Active" value={employees.filter(e => e.status === "active").length} color={C.mint} />
        <StatCard label="Suspended / exited" value={employees.filter(e => e.status !== "active").length} color={C.amber} />
        <StatCard label="Managers & leads" value={employees.filter(e => (roles.find(r => r.id === e.staffRole)?.permissions || []).includes("team.approve")).length} color={C.purple} />
        <StatCard label="Public profiles" value={employees.filter(e => e.publicProfile).length} color={C.gold} />
      </div>

      <SectionCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, role, department…" style={{ maxWidth: 320 }} />
          <Btn small variant={view === "list" ? "primary" : "ghost"} icon={Users} onClick={() => setView("list")}>List</Btn>
          <Btn small variant={view === "org" ? "primary" : "ghost"} icon={Network} onClick={() => setView("org")}>Org chart</Btn>
          <div style={{ flex: 1 }} />
          <Btn small variant="ghost" icon={Download} onClick={() => downloadCSV("employees", ["Name", "Email", "Phone", "WhatsApp", "Title", "Role", "Department", "Reports to", "Status", "Start", "Salary", "Currency"], employees.map(e => [e.fullName, e.email, e.phone, e.whatsapp, e.title, roleLabel(e.staffRole), e.department, byId.get(e.managerId)?.fullName || "", e.status, e.startDate, e.salaryAmount, e.salaryCurrency]))}>Export CSV</Btn>
          <Btn small icon={Plus} onClick={() => setForm("new")}>Add employee</Btn>
        </div>
      </SectionCard>

      {view === "org" ? <OrgChart employees={employees} roles={roles} /> : (
        <SectionCard>
          {loading && <EmptyState>Loading…</EmptyState>}
          {!loading && list.length === 0 && <EmptyState>No employees yet. Add your first team member.</EmptyState>}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead><tr>{["Person", "Role", "Department", "Reports to", "Status", ""].map(h => <th key={h} style={{ textAlign: "left", fontSize: 11.5, color: C.textMuted, padding: 8, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {list.map(e => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, opacity: e.status === "active" ? 1 : 0.6 }}>
                    <td style={{ padding: 8 }}><button type="button" onClick={() => setViewing(e.id)} style={{ display: "flex", gap: 10, alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: font }}><Avatar src={e.avatarDataUrl} name={e.fullName} size={32} presence={e.presence?.status} /><div><div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading }}>{e.fullName}{e.linkedAdminId ? " (you)" : ""}</div><div style={{ fontSize: 12, color: C.textMuted }}>{e.title} · {e.email}</div></div></button></td>
                    <td style={{ padding: 8 }}><Badge color={e.staffRole === "owner" ? C.gold : (roles.find(r => r.id === e.staffRole)?.level || 5) <= 3 ? C.purple : C.textMuted}>{roleLabel(e.staffRole)}</Badge></td>
                    <td style={{ padding: 8, fontSize: 13, color: C.text }}>{e.department || "—"}</td>
                    <td style={{ padding: 8, fontSize: 13, color: C.text }}>{byId.get(e.managerId)?.fullName || "—"}</td>
                    <td style={{ padding: 8 }}><Badge color={e.status === "active" ? C.mint : C.amber}>{e.status}</Badge></td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <Btn small variant="ghost" icon={Eye} onClick={() => setViewing(e.id)}>View</Btn>
                        <Btn small variant="ghost" icon={Pencil} onClick={() => setForm(e)}>Edit</Btn>
                        <Btn small variant="ghost" icon={IdCard} onClick={() => window.open(`/id-card?employee=${encodeURIComponent(e.id)}`, "_blank", "noopener")} title={e.idCard?.authorizedAt ? "ID card (authorised)" : "ID card (needs your signature)"}>{e.idCard?.code && !e.idCard?.authorizedAt ? "ID card · sign" : "ID card"}</Btn>
                        {!e.linkedAdminId && <Btn small variant="ghost" icon={KeyRound} onClick={() => resetPassword(e)} title="Reset password">Reset</Btn>}
                        {!e.linkedAdminId && <Btn small variant="ghost" onClick={() => toggleStatus(e)}>{e.status === "active" ? "Suspend" : "Reactivate"}</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {form && <EmployeeForm initial={form === "new" ? null : form} roles={roles} employees={employees} onClose={() => setForm(null)} onSaved={j => { const created = form === "new"; setForm(null); load(); if (created && j.tempPassword) setTemp({ title: "Employee created", text: `${j.employee.fullName} can now sign in to the Staff Office at ${window.location.origin}/staff.`, password: j.tempPassword, email: j.employee.email }); }} />}
      {viewing && <Employee360 id={viewing} roles={roles} onClose={() => setViewing(null)} onEdit={() => { const e = byId.get(viewing); setViewing(null); setForm(e); }} />}
      {temp && <TempPassword info={temp} onClose={() => setTemp(null)} />}
    </div>
  );
}

// ─── Staff Office management ────────────────────────────────────────────────
function AudienceField({ value, onChange, people, roles }) {
  const departments = [...new Set(people.map(p => p.department).filter(Boolean))].sort();
  const opts = value.type === "departments" ? departments.map(d => [d, d]) : value.type === "roles" ? roles.map(r => [r.id, r.label]) : value.type === "people" ? people.map(p => [p.id, p.fullName]) : [];
  const count = value.type === "all" ? people.length : people.filter(p => value.type === "departments" ? value.values.includes(p.department) : value.type === "roles" ? value.values.includes(p.staffRole) : value.values.includes(p.id)).length;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ fontSize: 12.5, color: C.textMuted }}>Send to:</strong>
        {[["all", "Everyone"], ["departments", "Departments"], ["roles", "Roles"], ["people", "Specific staff"]].map(([id, l]) => <Btn key={id} small variant={value.type === id ? "primary" : "ghost"} onClick={() => onChange({ type: id, values: [] })}>{l}</Btn>)}
        <span style={{ fontSize: 12.5, color: C.gold, fontWeight: 700, marginLeft: "auto" }}>Reaches {count} {count === 1 ? "person" : "people"}</span>
      </div>
      {opts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, maxHeight: 150, overflowY: "auto" }}>
          {opts.map(([v, l]) => <label key={v} style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 12.5, color: C.text, background: value.values.includes(v) ? C.blueDim : "none", border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}><input type="checkbox" style={{ margin: 0 }} checked={value.values.includes(v)} onChange={() => onChange({ ...value, values: value.values.includes(v) ? value.values.filter(x => x !== v) : [...value.values, v] })} /> {l}</label>)}
        </div>
      )}
    </div>
  );
}

function audienceText(a, roles) {
  if (!a || a.type === "all") return "Everyone";
  if (a.type === "roles") return a.values.map(v => roles.find(r => r.id === v)?.label || v).join(", ");
  if (a.type === "people") return `${a.values.length} selected staff`;
  return a.values.join(", ");
}

function RolesEditor({ data, reload }) {
  const [editing, setEditing] = useState(null);
  const blank = { id: "", label: "", level: 5, department: "", permissions: [] };
  async function save() {
    try { await call("/api/admin/office", { method: "POST", body: { action: "save-role", role: editing } }); toast("Role saved. It applies to everyone with this role immediately."); setEditing(null); reload(); }
    catch (e) { toast(e.message, "err"); }
  }
  async function remove(r) {
    const builtin = data.builtinRoleIds.includes(r.id);
    if (!confirm(builtin ? `Reset "${r.label}" to its default permissions?` : `Delete the custom role "${r.label}"?`)) return;
    try { await call("/api/admin/office", { method: "POST", body: { action: "delete-role", id: r.id } }); toast(builtin ? "Role reset" : "Role deleted"); reload(); } catch (e) { toast(e.message, "err"); }
  }
  const perms = Object.entries(data.permissions);
  const inUse = id => data.people.filter(p => p.staffRole === id).length;
  return (
    <div>
      <SectionCard style={{ marginBottom: 14 }}>
        <SectionTitle action={<Btn small icon={Plus} onClick={() => setEditing(blank)}>Add a role</Btn>} sub="Roles decide what each person can do in the Staff Office. Level sets seniority (1 = top) for the org chart and approvals. Reporting lines are set per person under Employees.">Roles & permissions</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 900, width: "100%" }}>
            <thead><tr><th style={th}>Role</th><th style={th}>Lvl</th>{perms.map(([k, l]) => <th key={k} title={l} style={{ ...th, writingMode: "vertical-rl", transform: "rotate(180deg)", height: 110, fontSize: 11 }}>{k}</th>)}<th style={th} /></tr></thead>
            <tbody>
              {data.roles.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: 8 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.heading }}>{r.label}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{inUse(r.id)} people{r.custom ? " · custom" : ""}</div></td>
                  <td style={{ padding: 8, fontSize: 13, color: C.text }}>{r.level}</td>
                  {perms.map(([k]) => <td key={k} style={{ textAlign: "center", color: r.permissions.includes(k) ? C.mint : C.border }}>{r.permissions.includes(k) ? "●" : "·"}</td>)}
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>{r.id !== "owner" && <><Btn small variant="ghost" icon={Pencil} onClick={() => setEditing({ ...r })}>Edit</Btn> <Btn small variant="ghost" onClick={() => remove(r)}>{data.builtinRoleIds.includes(r.id) ? "Reset" : "Delete"}</Btn></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      {editing && (
        <Modal title={editing.id && data.roles.some(r => r.id === editing.id) ? `Edit ${editing.label}` : "New role"} onClose={() => setEditing(null)} width={640}>
          <Grid min={180} style={{ marginBottom: 12 }}>
            <Field label="Role name"><Input value={editing.label} onChange={e => setEditing(x => ({ ...x, label: e.target.value, id: data.roles.some(r => r.id === x.id) ? x.id : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") }))} placeholder="e.g. Regional Sales Manager" /></Field>
            <Field label="Level (1 = most senior)"><Select value={editing.level} onChange={e => setEditing(x => ({ ...x, level: Number(e.target.value) }))}>{[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}</Select></Field>
            <Field label="Default department"><Input value={editing.department} onChange={e => setEditing(x => ({ ...x, department: e.target.value }))} /></Field>
          </Grid>
          <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            {perms.map(([k, l]) => <label key={k} style={{ display: "flex", gap: 8, fontSize: 13, color: C.text, alignItems: "flex-start" }}><input type="checkbox" checked={editing.permissions.includes(k)} onChange={e => setEditing(x => ({ ...x, permissions: e.target.checked ? [...x.permissions, k] : x.permissions.filter(p => p !== k) }))} style={{ marginTop: 3 }} /><span><strong style={{ color: C.heading }}>{k}</strong>: {l}</span></label>)}
          </div>
          <Btn icon={Save} onClick={save} disabled={!editing.label.trim()}>Save role</Btn>
        </Modal>
      )}
    </div>
  );
}
const th = { textAlign: "left", fontSize: 11.5, color: C.textMuted, padding: 8, borderBottom: `1px solid ${C.border}`, fontFamily: font };

// Who will actually get a phone alert, and a one-click email with set-up steps.
function PhoneAlerts({ list, channels }) {
  const [busy, setBusy] = useState(false);
  const off = list.filter(p => !p.devices);
  async function nudge(employeeId) {
    setBusy(true);
    try {
      const j = await call("/api/admin/office", { method: "POST", body: { action: "nudge-alerts", employeeId } });
      toast(j.total ? `Set-up email sent to ${j.sent} of ${j.total}` : "Everyone already has alerts on");
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  return (
    <SectionCard>
      <SectionTitle sub="Phone alerts ring like WhatsApp even when the Staff Office is closed. Each person turns them on once, on their own phone."
        action={off.length > 0 && <Btn small icon={Megaphone} disabled={busy} onClick={() => nudge()}>Email set-up steps to all {off.length}</Btn>}>
        Phone alerts: {list.length - off.length} of {list.length} on
      </SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 6 }}>
        {list.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13 }}>
            <span style={{ flex: 1, color: C.heading, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.fullName}</span>
            {p.devices ? <Badge color={C.mint}>on · {p.devices} device{p.devices === 1 ? "" : "s"}</Badge> : <>
              <Badge color={C.rose}>off</Badge>
              {p.email && <Btn small variant="ghost" disabled={busy} onClick={() => nudge(p.id)}>Remind</Btn>}
            </>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12, fontSize: 12.5, color: C.textMuted }}>
        Backup channels:
        {[["email", "Email"], ["whatsapp", "WhatsApp"], ["sms", "SMS"]].map(([k, l]) => <Badge key={k} color={channels[k] ? C.mint : C.textMuted}>{l} {channels[k] ? "on" : "not set up"}</Badge>)}
      </div>
      {(!channels.whatsapp || !channels.sms) && (
        <p style={{ fontSize: 12, color: C.textMuted, margin: "6px 0 0", lineHeight: 1.6 }}>
          WhatsApp/SMS send location checks always, and meeting and approval alerts to people without phone alerts. To switch them on, add to the server settings (Railway): WhatsApp, <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_ID</code> and an approved template named <code>staff_alert</code> with two variables (the alert and the link); SMS, <code>TERMII_API_KEY</code> and <code>TERMII_SENDER_ID</code>. About ₦12 per WhatsApp message and ₦15 per SMS.
        </p>
      )}
      <p style={{ fontSize: 12.5, color: C.textMuted, margin: "10px 0 0", lineHeight: 1.6 }}>
        You too: open the Staff Office as Owner on your phone and tap <strong>Turn on alerts</strong>, so check-ins and location checks reach you. iPhones must first add the Staff Office to the Home Screen (Share → Add to Home Screen).
      </p>
    </SectionCard>
  );
}

function OfficeSettings({ data, reload }) {
  const [cfg, setCfg] = useState(data.config);
  async function save() {
    try { await call("/api/admin/office", { method: "POST", body: { action: "save-config", config: cfg } }); toast("Office settings saved"); reload(); } catch (e) { toast(e.message, "err"); }
  }
  const setLink = (i, k, v) => setCfg(c => ({ ...c, quickLinks: c.quickLinks.map((l, j) => j === i ? { ...l, [k]: v } : l) }));
  const setRes = (i, k, v) => setCfg(c => ({ ...c, resources: c.resources.map((r, j) => j === i ? { ...r, [k]: v } : r) }));
  return (
    <div className="so-stack" style={{ gap: 14 }}>
      <SectionCard>
        <SectionTitle>Welcome & contact</SectionTitle>
        <Field label="Lobby welcome message" style={{ marginBottom: 10 }}><Textarea value={cfg.welcome} onChange={e => setCfg(c => ({ ...c, welcome: e.target.value }))} style={{ minHeight: 60 }} /></Field>
        <Grid min={240}>
          <Field label="Management WhatsApp number"><Input value={cfg.managementWhatsapp || ""} onChange={e => setCfg(c => ({ ...c, managementWhatsapp: e.target.value }))} placeholder="0816 957 7059" /></Field>
          <Field label="Team WhatsApp group invite link"><Input value={cfg.whatsappGroupLink || ""} onChange={e => setCfg(c => ({ ...c, whatsappGroupLink: e.target.value }))} placeholder="https://chat.whatsapp.com/…" /></Field>
        </Grid>
      </SectionCard>
      <SectionCard>
        <SectionTitle sub="Company default for everyone (Lagos time). To give one person different hours, open Employees → Edit → Working hours.">Working hours</SectionTitle>
        <WorkHoursFields
          value={{ start: cfg.workStart || "09:00", end: cfg.workEnd || "17:00", days: cfg.workDays || [1, 2, 3, 4, 5] }}
          onChange={v => setCfg(c => ({ ...c, workStart: v.start, workEnd: v.end, workDays: v.days }))} />
        <Grid min={200} style={{ marginTop: 10 }}>
          <Field label="Grace period (minutes before 'late')"><Input type="number" min="0" max="120" value={cfg.graceMinutes ?? 15} onChange={e => setCfg(c => ({ ...c, graceMinutes: e.target.value }))} /></Field>
          <Field label="Location check: minutes to respond (10–60)"><Input type="number" min="10" max="60" value={cfg.spotWindowMinutes ?? 20} onChange={e => setCfg(c => ({ ...c, spotWindowMinutes: e.target.value }))} /></Field>
        </Grid>
        <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, margin: "10px 0 0" }}>
          These hours decide who is late or left early, who gets a "you haven't clocked in" reminder 45 minutes after the start plus grace period, and when location checks may be sent. Work outside them counts as overtime.
        </p>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.text, marginTop: 12 }}>
          <input type="checkbox" checked={cfg.spotChecks !== false} onChange={e => setCfg(c => ({ ...c, spotChecks: e.target.checked }))} />
          Send one random location check each working day to staff clocked in on field work
        </label>
      </SectionCard>
      <SectionCard>
        <SectionTitle sub="Line managers and the owner hear about these as they happen, on their phone or by email.">Live alerts</SectionTitle>
        {[
          ["alertFieldVisits", true, "Tell the line manager and owner every time someone checks in or out at a client, and answers or misses a location check"],
          ["alertClockIns", false, "Also tell them every time someone clocks in or out (late arrivals and early departures of 30+ minutes are always reported)"],
          ["emailFallback", true, "Email alerts (meetings, tasks, approvals, messages…) to anyone who hasn't turned on phone alerts"],
          ["dailyDigest", true, "Send everyone a 7am email on working days with their meetings, approvals waiting, overdue tasks and unread alerts"],
        ].map(([k, def, label]) => (
          <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: C.text, marginBottom: 8 }}>
            <input type="checkbox" checked={cfg[k] ?? def} onChange={e => setCfg(c => ({ ...c, [k]: e.target.checked }))} style={{ marginTop: 2 }} />
            {label}
          </label>
        ))}
        <Grid min={180} style={{ marginTop: 10 }}>
          <Field label="Quiet hours from (no sound)"><Input type="time" value={cfg.quietStart || ""} onChange={e => setCfg(c => ({ ...c, quietStart: e.target.value }))} /></Field>
          <Field label="Quiet hours until"><Input type="time" value={cfg.quietEnd || ""} onChange={e => setCfg(c => ({ ...c, quietEnd: e.target.value }))} /></Field>
          <Field label="Delete location & photos after (months)"><Input type="number" min="3" max="120" value={cfg.retentionMonths ?? 24} onChange={e => setCfg(c => ({ ...c, retentionMonths: e.target.value }))} /></Field>
        </Grid>
        <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, margin: "8px 0 0" }}>
          During quiet hours (e.g. 21:00 to 07:00) alerts still arrive but don't ring; location checks always ring. Old GPS points and visit photos are deleted automatically each month after the retention period (Nigeria Data Protection Act); times and outcomes are kept.
        </p>
      </SectionCard>
      <SectionCard>
        <SectionTitle sub="When someone opens the Staff Office at one of these places, it offers a one-tap 'clock in'. Clocking in 'at the office' from somewhere else is flagged to their manager.">Office locations</SectionTitle>
        {(cfg.offices || []).map((o, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1.4fr) 110px auto", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <Input value={o.name} onChange={e => setCfg(c => ({ ...c, offices: c.offices.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="e.g. Lagos Island office" aria-label="Office name" />
            <span style={{ fontSize: 12.5, color: C.textMuted }}>{Number(o.lat).toFixed(5)}, {Number(o.lng).toFixed(5)} · <a href={`https://www.google.com/maps?q=${o.lat},${o.lng}`} target="_blank" rel="noreferrer" style={{ color: C.blue }}>map</a></span>
            <Input type="number" min="50" max="2000" value={o.radius} onChange={e => setCfg(c => ({ ...c, offices: c.offices.map((x, j) => j === i ? { ...x, radius: e.target.value } : x) }))} aria-label="Radius in metres" title="Radius in metres" />
            <Btn small danger icon={Trash2} onClick={() => setCfg(c => ({ ...c, offices: c.offices.filter((_, j) => j !== i) }))} />
          </div>
        ))}
        <Btn small variant="ghost" icon={Plus} onClick={() => {
          if (!navigator.geolocation) { toast("This browser can't share its location", "err"); return; }
          toast("Getting your location…");
          navigator.geolocation.getCurrentPosition(
            p => setCfg(c => ({ ...c, offices: [...(c.offices || []), { name: "Office", lat: p.coords.latitude, lng: p.coords.longitude, radius: Math.max(100, Math.round(Math.min(p.coords.accuracy, 300))) }] })),
            () => toast("Couldn't get your location. Allow location for this site and try again.", "err"),
            { enableHighAccuracy: true, timeout: 20000 });
        }}>Add office here (use my current location)</Btn>
        <p style={{ fontSize: 12, color: C.textMuted, margin: "8px 0 0" }}>Stand inside the office when you add it. Radius is in metres (150 suits most buildings). Remember to save.</p>
      </SectionCard>
      <PhoneAlerts list={data.phoneAlerts || []} channels={data.channels || {}} />
      <SectionCard>
        <SectionTitle action={<Btn small icon={Plus} onClick={() => setCfg(c => ({ ...c, quickLinks: [...c.quickLinks, { label: "", url: "" }] }))}>Add link</Btn>}>Quick links</SectionTitle>
        {cfg.quickLinks.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 6, marginBottom: 6 }}>
            <Input value={l.label} onChange={e => setLink(i, "label", e.target.value)} placeholder="Label" />
            <Input value={l.url} onChange={e => setLink(i, "url", e.target.value)} placeholder="https://…" />
            <Btn small danger icon={Trash2} onClick={() => setCfg(c => ({ ...c, quickLinks: c.quickLinks.filter((_, j) => j !== i) }))} />
          </div>
        ))}
      </SectionCard>
      <SectionCard>
        <SectionTitle action={<Btn small icon={Plus} onClick={() => setCfg(c => ({ ...c, resources: [...c.resources, { title: "", category: "Policies", body: "", url: "", requiresAck: false }] }))}>Add entry</Btn>} sub="Policies with 'must acknowledge' show on every staff member's Lobby until they confirm they've read them.">Handbook</SectionTitle>
        {cfg.resources.map((r, i) => {
          const ack = data.acknowledgements.find(a => a.resourceId === r.id);
          return (
            <div key={r.id || i} style={{ borderTop: `1px solid ${C.border}`, padding: "12px 0" }}>
              <Grid min={200} style={{ marginBottom: 6 }}>
                <Input value={r.title} onChange={e => setRes(i, "title", e.target.value)} placeholder="Title" />
                <Input value={r.category} onChange={e => setRes(i, "category", e.target.value)} placeholder="Category" />
                <Input value={r.url} onChange={e => setRes(i, "url", e.target.value)} placeholder="Document link (optional)" />
              </Grid>
              <Textarea value={r.body} onChange={e => setRes(i, "body", e.target.value)} placeholder="Content" style={{ minHeight: 60 }} />
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 6, fontSize: 13, color: C.text }}><input type="checkbox" checked={r.requiresAck} onChange={e => setRes(i, "requiresAck", e.target.checked)} /> Staff must acknowledge</label>
                {r.requiresAck && ack && <Badge color={ack.done.length === ack.total ? C.mint : C.amber}>{ack.done.length}/{ack.total} acknowledged</Badge>}
                <div style={{ flex: 1 }} />
                <Btn small danger icon={Trash2} onClick={() => setCfg(c => ({ ...c, resources: c.resources.filter((_, j) => j !== i) }))}>Remove</Btn>
              </div>
            </div>
          );
        })}
      </SectionCard>
      <div><Btn icon={Save} onClick={save}>Save office settings</Btn></div>
    </div>
  );
}

export function StaffOfficeSection() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("announce");
  const [ann, setAnn] = useState({ text: "", audience: { type: "all", values: [] }, visibility: "company", sendEmail: false, pinned: true, link: "", imageDataUrl: "" });
  const [kit, setKit] = useState({ title: "", caption: "", link: "", hashtags: "", imageDataUrl: "" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => call("/api/admin/office").then(setData).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <div><Toaster /><EmptyState>Loading the Staff Office…</EmptyState></div>;

  const person = id => id === "admin" ? { fullName: "Orion Soft Management" } : id === "system" ? { fullName: "Office Bot" } : data.people.find(p => p.id === id) || { fullName: "Former staff" };
  const announcements = data.posts.filter(p => p.type === "announcement");
  const audienceSize = a => (!a || a.type === "all") ? data.people.length : data.people.filter(p => a.type === "departments" ? a.values.includes(p.department) : a.type === "roles" ? a.values.includes(p.staffRole) : a.values.includes(p.id)).length;

  async function sendAnnouncement() {
    setBusy(true);
    try {
      const j = await call("/api/admin/office", { method: "POST", body: { action: "announce", ...ann } });
      toast(`Announcement delivered to ${j.reached} staff${j.emailed ? ` · ${j.emailed} emailed` : ""}`);
      setAnn({ text: "", audience: { type: "all", values: [] }, visibility: "company", sendEmail: false, pinned: true, link: "", imageDataUrl: "" });
      load();
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  async function act(body, msg) { try { await call("/api/admin/office", { method: "POST", body }); if (msg) toast(msg); load(); } catch (e) { toast(e.message, "err"); } }
  async function remove(type, id) { if (!confirm("Delete this permanently?")) return; try { await call(`/api/admin/office?type=${type}&id=${encodeURIComponent(id)}`, { method: "DELETE" }); toast("Deleted"); load(); } catch (e) { toast(e.message, "err"); } }
  async function image(e, setter) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    try { const d = await resizeImageToDataUrl(f, 1280, 0.82); setter(d); } catch (ex) { toast(ex.message, "err"); }
  }

  return (
    <div style={{ fontFamily: font }}>
      <Toaster />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard label="Staff in the office" value={data.people.length} color={C.blue} />
        <StatCard label="Online now" value={data.people.filter(p => ["available", "meeting", "field", "focus"].includes(p.presence?.status)).length} color={C.mint} />
        <StatCard label="Feed posts (recent)" value={data.posts.length} color={C.purple} />
        <StatCard label="Share kits" value={data.kits.filter(k => !k.archived).length} color={C.gold} />
        <StatCard label="Public profiles" value={data.people.filter(p => p.publicProfile).length} color={C.cyan} />
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: "announce", label: "📣 Announcements" }, { id: "feed", label: "Feed moderation" }, { id: "kits", label: "Share kits" }, { id: "advocacy", label: "Social advocacy" }, { id: "roles", label: "Roles & permissions" }, { id: "settings", label: "Office settings & handbook" }]} />

      {tab === "announce" && (
        <div className="so-stack" style={{ gap: 14 }}>
          <SectionCard>
            <SectionTitle sub="Goes to the people you choose: pinned in their feed, in 'Announcements for you' on their Lobby, as a notification, and optionally by email. Make it public so staff can share it on their social accounts.">New announcement</SectionTitle>
            <AudienceField value={ann.audience} onChange={a => setAnn(x => ({ ...x, audience: a }))} people={data.people} roles={data.roles} />
            <Textarea value={ann.text} onChange={e => setAnn(x => ({ ...x, text: e.target.value }))} placeholder="Write your announcement…" style={{ minHeight: 110 }} />
            <Grid min={220} style={{ margin: "10px 0" }}>
              <Input value={ann.link} onChange={e => setAnn(x => ({ ...x, link: e.target.value }))} placeholder="Link (optional)" />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text, border: `1px dashed ${C.borderStrong}`, borderRadius: 10, padding: "0 12px", cursor: "pointer" }}>🖼 {ann.imageDataUrl ? "Image attached ✓" : "Attach an image"}<input type="file" accept="image/*" hidden onChange={e => image(e, d => setAnn(x => ({ ...x, imageDataUrl: d })))} /></label>
            </Grid>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: C.text, marginBottom: 12 }}>
              <label style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={ann.visibility === "public"} onChange={e => setAnn(x => ({ ...x, visibility: e.target.checked ? "public" : "company" }))} /> Public: staff can share it to LinkedIn, X, WhatsApp…</label>
              <label style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={ann.sendEmail} onChange={e => setAnn(x => ({ ...x, sendEmail: e.target.checked }))} /> Also email it</label>
              <label style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={ann.pinned} onChange={e => setAnn(x => ({ ...x, pinned: e.target.checked }))} /> Pin to the top of the feed</label>
            </div>
            <Btn icon={Megaphone} disabled={busy || !ann.text.trim() || (ann.audience.type !== "all" && !ann.audience.values.length)} onClick={sendAnnouncement}>Send announcement</Btn>
          </SectionCard>
          <SectionCard>
            <SectionTitle>Sent announcements & read receipts</SectionTitle>
            {announcements.length === 0 && <EmptyState>No announcements yet.</EmptyState>}
            {announcements.map(p => {
              const size = audienceSize(p.audience), read = (p.acks || []).length;
              return (
                <div key={p.id} style={{ borderTop: `1px solid ${C.border}`, padding: "12px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12.5, color: C.textMuted }}><strong style={{ color: C.gold }}>{person(p.authorId).fullName}</strong> · {ago(p.createdAt)} · to {audienceText(p.audience, data.roles)} {p.visibility === "public" && <Badge color={C.mint}>Public</Badge>} {p.pinned && <Badge color={C.gold}>Pinned</Badge>}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn small variant="ghost" icon={Pin} onClick={() => act({ action: "pin", id: p.id }, p.pinned ? "Unpinned" : "Pinned")}>{p.pinned ? "Unpin" : "Pin"}</Btn>
                      <Btn small danger icon={Trash2} onClick={() => remove("post", p.id)} />
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: C.heading, whiteSpace: "pre-wrap", margin: "6px 0" }}>{p.text}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 420 }}><Progress value={size ? read / size * 100 : 0} height={6} /><span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>Read by {read}/{size}</span></div>
                  {read < size && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Not read yet: {data.people.filter(x => !(p.acks || []).includes(x.id) && ((!p.audience || p.audience.type === "all") || (p.audience.type === "departments" ? p.audience.values.includes(x.department) : p.audience.type === "roles" ? p.audience.values.includes(x.staffRole) : p.audience.values.includes(x.id)))).map(x => x.fullName).join(", ")}</div>}
                </div>
              );
            })}
          </SectionCard>
        </div>
      )}

      {tab === "feed" && (
        <SectionCard>
          <SectionTitle sub="Everything staff post in the office. Pin important posts or remove anything inappropriate.">Recent posts</SectionTitle>
          {data.posts.map(p => (
            <div key={p.id} style={{ borderTop: `1px solid ${C.border}`, padding: "10px 0", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: C.textMuted }}><strong style={{ color: C.heading }}>{person(p.authorId).fullName}</strong> · {p.type} · {ago(p.createdAt)} · {Object.keys(p.reactions || {}).length} reactions · {(p.comments || []).length} comments{p.visibility === "public" ? " · public" : ""}</div>
                <div style={{ fontSize: 13.5, color: C.text, whiteSpace: "pre-wrap", marginTop: 3 }}>{(p.text || "").slice(0, 280)}</div>
              </div>
              <Btn small variant="ghost" icon={Pin} onClick={() => act({ action: "pin", id: p.id }, p.pinned ? "Unpinned" : "Pinned")}>{p.pinned ? "Unpin" : "Pin"}</Btn>
              <Btn small danger icon={Trash2} onClick={() => remove("post", p.id)} />
            </div>
          ))}
        </SectionCard>
      )}

      {tab === "kits" && (
        <div className="so-stack" style={{ gap: 14 }}>
          <SectionCard>
            <SectionTitle sub="Ready-made posts staff can share to their own networks in one click. Every share is tracked.">New share kit</SectionTitle>
            <Grid min={220} style={{ marginBottom: 8 }}>
              <Input value={kit.title} onChange={e => setKit(x => ({ ...x, title: e.target.value }))} placeholder="Title (e.g. CareCore live in Ogun)" />
              <Input value={kit.link} onChange={e => setKit(x => ({ ...x, link: e.target.value }))} placeholder="Link to share" />
              <Input value={kit.hashtags} onChange={e => setKit(x => ({ ...x, hashtags: e.target.value }))} placeholder="#Hashtags" />
            </Grid>
            <Textarea value={kit.caption} onChange={e => setKit(x => ({ ...x, caption: e.target.value }))} placeholder="Suggested caption" />
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, color: C.text, cursor: "pointer" }}>🖼 {kit.imageDataUrl ? "Image attached ✓" : "Attach an image"}<input type="file" accept="image/*" hidden onChange={e => image(e, d => setKit(x => ({ ...x, imageDataUrl: d })))} /></label>
              <Btn icon={Plus} disabled={!kit.title.trim() || !kit.caption.trim()} onClick={() => act({ action: "create-kit", ...kit }, "Share kit published to all staff").then(() => setKit({ title: "", caption: "", link: "", hashtags: "", imageDataUrl: "" }))}>Publish to all staff</Btn>
            </div>
          </SectionCard>
          <SectionCard>
            <SectionTitle>Published kits</SectionTitle>
            {data.kits.length === 0 && <EmptyState>No kits yet.</EmptyState>}
            {data.kits.map(k => {
              const total = Object.values(k.shares || {}).reduce((a, b) => a + b, 0);
              return (
                <div key={k.id} style={{ borderTop: `1px solid ${C.border}`, padding: "10px 0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", opacity: k.archived ? 0.55 : 1 }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>{k.title} {k.archived && <Badge>archived</Badge>}</div>
                    <div style={{ fontSize: 12.5, color: C.textMuted }}>{total} shares by {Object.keys(k.shares || {}).length} staff · {Object.entries(k.platformShares || {}).map(([pl, n]) => `${pl} ${n}`).join(" · ") || "no shares yet"}</div>
                  </div>
                  <Btn small variant="ghost" onClick={() => act({ action: "archive-kit", id: k.id })}>{k.archived ? "Restore" : "Archive"}</Btn>
                  <Btn small danger icon={Trash2} onClick={() => remove("kit", k.id)} />
                </div>
              );
            })}
          </SectionCard>
        </div>
      )}

      {tab === "advocacy" && (
        <SectionCard>
          <SectionTitle action={<Btn small variant="ghost" icon={Download} onClick={() => downloadCSV("social-advocacy", ["Name", "Points (month)", "Social posts", "Engagement", "Reach", "Kit shares", "Feed shares"], data.advocacy.map(a => [person(a.id).fullName, a.points, a.socialPosts, a.engagement, a.reach, a.kitShares, a.feedShares]))}>Export CSV</Btn>}>Staff social advocacy (this month's points)</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead><tr>{["Person", "Points", "Social posts", "Engagement", "Reach", "Kit shares", "Feed shares"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{data.advocacy.map(a => <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: 8, fontSize: 13, color: C.heading, fontWeight: 700 }}>{person(a.id).fullName}</td>{[a.points, a.socialPosts, a.engagement.toLocaleString(), a.reach.toLocaleString(), a.kitShares, a.feedShares].map((v, i) => <td key={i} style={{ padding: 8, fontSize: 13, color: i === 0 ? C.mint : C.text }}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === "roles" && <RolesEditor data={data} reload={load} />}
      {tab === "settings" && <OfficeSettings key={JSON.stringify(data.config).length} data={data} reload={load} />}
    </div>
  );
}
