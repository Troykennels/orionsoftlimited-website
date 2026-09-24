import { useCallback, useEffect, useState } from "react";
import { Plus, Send, CalendarDays } from "lucide-react";
import { C, font } from "../theme.js";
import { api, timeAgo, fmtDate } from "../api.js";
import { Avatar, Badge, Btn, Input, Textarea, Select, Modal, Field, EmptyState, PageHeader, Tabs, Grid, RichText, toast } from "../components.jsx";
import { useOffice } from "../office.js";

const COLUMNS = [
  { id: "todo", label: "To do", color: C.textMuted },
  { id: "in_progress", label: "In progress", color: C.blue },
  { id: "review", label: "Review", color: C.amber },
  { id: "done", label: "Done", color: C.mint },
];
const PRIORITY = { urgent: C.rose, high: C.amber, medium: C.blue, low: C.textMuted };

function TaskForm({ team, onClose, onSaved }) {
  const { me, person } = useOffice();
  const [f, setF] = useState({ title: "", description: "", project: "", priority: "medium", dueDate: "", assigneeId: me.id });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await api("/api/staff/tasks", { method: "POST", body: f }); toast(f.assigneeId === me.id ? "Task added" : "Task assigned"); onSaved(); }
    catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  return (
    <Modal title="New task" onClose={onClose}>
      <Field label="Title" style={{ marginBottom: 12 }}><Input value={f.title} autoFocus onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="What needs doing?" /></Field>
      <Field label="Details" style={{ marginBottom: 12 }}><Textarea value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} style={{ minHeight: 70 }} /></Field>
      <Grid min={150} style={{ marginBottom: 14 }}>
        <Field label="Assign to"><Select value={f.assigneeId} onChange={e => setF(x => ({ ...x, assigneeId: e.target.value }))}><option value={me.id}>Me</option>{team.map(id => <option key={id} value={id}>{person(id).fullName}</option>)}</Select></Field>
        <Field label="Priority"><Select value={f.priority} onChange={e => setF(x => ({ ...x, priority: e.target.value }))}>{Object.keys(PRIORITY).map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</Select></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={e => setF(x => ({ ...x, dueDate: e.target.value }))} /></Field>
        <Field label="Project"><Input value={f.project} onChange={e => setF(x => ({ ...x, project: e.target.value }))} placeholder="Optional" /></Field>
      </Grid>
      <Btn onClick={save} disabled={busy || !f.title.trim()}>Create task</Btn>
    </Modal>
  );
}

function TaskDetail({ task: initial, onClose, onChanged }) {
  const { me, person, directory, openPerson } = useOffice();
  const [t, setT] = useState(initial);
  const [comment, setComment] = useState("");
  async function patch(body) {
    try { const j = await api("/api/staff/tasks", { method: "PATCH", body: { id: t.id, ...body } }); setT(j.task); onChanged(); } catch (e) { toast(e.message, "err"); }
  }
  async function send() {
    try { const j = await api("/api/staff/tasks", { method: "POST", body: { action: "comment", id: t.id, text: comment } }); setT(j.task); setComment(""); } catch (e) { toast(e.message, "err"); }
  }
  const assignee = person(t.assigneeId);
  return (
    <Modal title={t.title} onClose={onClose} width={600}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge color={PRIORITY[t.priority]}>{t.priority}</Badge>
        {t.project && <Badge color={C.purple}>{t.project}</Badge>}
        {t.dueDate && <Badge color={t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== "done" ? C.rose : C.textMuted}><CalendarDays size={11} /> {fmtDate(t.dueDate)}</Badge>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text, marginBottom: 12 }}>
        <Avatar src={assignee.avatarDataUrl} name={assignee.fullName} size={26} /> Assigned to <button type="button" onClick={() => openPerson(assignee.id)} style={{ background: "none", border: "none", padding: 0, color: C.heading, fontWeight: 700, cursor: "pointer", fontFamily: font, fontSize: 13 }}>{t.assigneeId === me.id ? "you" : assignee.fullName}</button>
        {t.createdByEmployee && t.createdByEmployee !== t.assigneeId && <span style={{ color: C.textMuted }}>· by {person(t.createdByEmployee).fullName}</span>}
      </div>
      {t.description && <p style={{ fontSize: 14, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{t.description}</p>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0" }}>
        {COLUMNS.map(c => <Btn key={c.id} small variant={t.status === c.id ? "primary" : "ghost"} onClick={() => patch({ status: c.id })}>{c.label}</Btn>)}
      </div>
      <h3 style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.07em", margin: "16px 0 8px" }}>COMMENTS</h3>
      {(t.comments || []).length === 0 && <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>No comments yet.</div>}
      {(t.comments || []).map(c => (
        <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Avatar src={person(c.authorId).avatarDataUrl} name={person(c.authorId).fullName} size={26} />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 11px", flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.heading }}>{person(c.authorId).fullName} <span style={{ color: C.textMuted, fontWeight: 500 }}>· {timeAgo(c.at)}</span></div>
            <RichText text={c.text} directory={directory} style={{ fontSize: 13.5, color: C.text }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add an update or question…" onKeyDown={e => e.key === "Enter" && comment.trim() && send()} />
        <Btn icon={Send} onClick={send} disabled={!comment.trim()}>Send</Btn>
      </div>
    </Modal>
  );
}

export default function Tasks({ param }) {
  const { me, person, navigate, can } = useOffice();
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [view, setView] = useState("mine");
  const [creating, setCreating] = useState(false);
  const [drag, setDrag] = useState(null);
  const load = useCallback(() => api("/api/staff/tasks").then(j => { setTasks(j.tasks); setTeam(j.team); }).catch(e => toast(e.message, "err")), []);
  useEffect(() => { load(); }, [load]);

  const shown = tasks.filter(t => view === "mine" ? t.assigneeId === me.id : view === "team" ? team.includes(t.assigneeId) : t.createdByEmployee === me.id && t.assigneeId !== me.id);
  const open = param ? tasks.find(t => t.id === param) : null;
  const today = new Date().toISOString().slice(0, 10);

  async function move(id, status) {
    setTasks(list => list.map(t => t.id === id ? { ...t, status } : t));
    try { await api("/api/staff/tasks", { method: "PATCH", body: { id, status } }); if (status === "done") toast("Nice work! ✅"); }
    catch (e) { toast(e.message, "err"); load(); }
  }

  return (
    <div>
      <PageHeader title="Tasks" sub="Drag cards between columns. Completing a task notifies whoever assigned it." action={<Btn icon={Plus} onClick={() => setCreating(true)}>New task</Btn>} />
      <Tabs active={view} onChange={setView} tabs={[
        { id: "mine", label: "My tasks", count: tasks.filter(t => t.assigneeId === me.id && t.status !== "done").length },
        ...(can("tasks.assign") ? [{ id: "team", label: "My team" }, { id: "assigned", label: "Assigned by me" }] : []),
      ]} />
      <div className="so-kanban">
        {COLUMNS.map(col => {
          const items = shown.filter(t => t.status === col.id);
          return (
            <div key={col.id} onDragOver={e => e.preventDefault()} onDrop={() => { if (drag) move(drag, col.id); setDrag(null); }}
              style={{ background: "rgba(11,17,32,0.7)", border: `1px solid ${C.border}`, borderRadius: 14, padding: 10, minHeight: 240 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px 10px" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: col.color }}>{col.label}</span>
                <span style={{ fontSize: 12, color: C.textMuted }}>{items.length}</span>
              </div>
              {items.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: 14, border: `1px dashed ${C.border}`, borderRadius: 10 }}>Drop tasks here</div>}
              {items.map(t => {
                const a = person(t.assigneeId);
                const overdue = t.dueDate && t.dueDate < today && t.status !== "done";
                return (
                  <div key={t.id} draggable onDragStart={() => setDrag(t.id)} onClick={() => navigate("tasks", t.id)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && navigate("tasks", t.id)}
                    className="so-card so-lift" style={{ border: `1px solid ${C.border}`, borderLeft: `3px solid ${PRIORITY[t.priority]}`, borderRadius: 10, padding: 11, marginBottom: 8, cursor: "grab" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading, lineHeight: 1.4 }}>{t.title}</div>
                    {t.project && <div style={{ fontSize: 11.5, color: C.purple, marginTop: 4 }}>{t.project}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      {view !== "mine" && <Avatar src={a.avatarDataUrl} name={a.fullName} size={20} />}
                      {t.dueDate && <span style={{ fontSize: 11.5, color: overdue ? C.rose : C.textMuted, fontWeight: overdue ? 700 : 500 }}>{overdue ? "Overdue · " : ""}{fmtDate(t.dueDate)}</span>}
                      <span style={{ flex: 1 }} />
                      {(t.comments || []).length > 0 && <span style={{ fontSize: 11.5, color: C.textMuted }}>💬 {t.comments.length}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {shown.length === 0 && <EmptyState>No tasks here yet.</EmptyState>}
      {creating && <TaskForm team={team} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {open && <TaskDetail key={open.id} task={open} onClose={() => navigate("tasks")} onChanged={load} />}
    </div>
  );
}
