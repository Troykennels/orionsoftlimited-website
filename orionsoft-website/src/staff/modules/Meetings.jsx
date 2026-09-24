import { useCallback, useEffect, useState } from "react";
import { Video, CalendarPlus, MapPin, Plus, Trash2 } from "lucide-react";
import { C, font } from "../theme.js";
import { api, fmtDateTime } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, SectionTitle, Input, Textarea, Select, Modal, Field, EmptyState, PageHeader, Grid, toast } from "../components.jsx";
import { useOffice } from "../office.js";

function localInputValue(d) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NewMeeting({ onClose, onCreated, withId }) {
  const { me, directory } = useOffice();
  const next = new Date(); next.setMinutes(0, 0, 0); next.setHours(next.getHours() + 1);
  const [f, setF] = useState({ title: "", agenda: "", startsAt: localInputValue(next), durationMin: 30, attendeeIds: withId ? [withId] : [], everyone: false, linkMode: "auto", link: "", location: "" });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const toggle = id => setF(x => ({ ...x, attendeeIds: x.attendeeIds.includes(id) ? x.attendeeIds.filter(a => a !== id) : [...x.attendeeIds, id] }));

  async function create() {
    setBusy(true);
    try {
      const j = await api("/api/staff/meetings", { method: "POST", body: {
        title: f.title, agenda: f.agenda, startsAt: new Date(f.startsAt).toISOString(), durationMin: f.durationMin,
        attendeeIds: f.attendeeIds, everyone: f.everyone, location: f.location,
        link: f.linkMode === "auto" ? "" : f.linkMode === "none" ? "none" : f.link,
      } });
      toast("Meeting scheduled. Invites sent.");
      onCreated(j.meeting);
    } catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  const people = directory.filter(p => p.id !== me.id && (!q || p.fullName.toLowerCase().includes(q.toLowerCase())));
  return (
    <Modal title="Schedule a meeting" onClose={onClose} width={620}>
      <Field label="Title" style={{ marginBottom: 12 }}><Input value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="e.g. Weekly sales sync" autoFocus /></Field>
      <Grid min={170} style={{ marginBottom: 12 }}>
        <Field label="Starts"><Input type="datetime-local" value={f.startsAt} onChange={e => setF(x => ({ ...x, startsAt: e.target.value }))} /></Field>
        <Field label="Duration"><Select value={f.durationMin} onChange={e => setF(x => ({ ...x, durationMin: Number(e.target.value) }))}>{[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} minutes</option>)}</Select></Field>
        <Field label="Video room"><Select value={f.linkMode} onChange={e => setF(x => ({ ...x, linkMode: e.target.value }))}><option value="auto">Create a Jitsi room for me</option><option value="custom">Use my own link (Meet/Zoom)</option><option value="none">No video (in person/phone)</option></Select></Field>
      </Grid>
      {f.linkMode === "custom" && <Field label="Meeting link" style={{ marginBottom: 12 }}><Input value={f.link} onChange={e => setF(x => ({ ...x, link: e.target.value }))} placeholder="https://meet.google.com/…" /></Field>}
      {f.linkMode === "none" && <Field label="Location" style={{ marginBottom: 12 }}><Input value={f.location} onChange={e => setF(x => ({ ...x, location: e.target.value }))} placeholder="Client office, phone call…" /></Field>}
      <Field label="Agenda" style={{ marginBottom: 12 }}><Textarea value={f.agenda} onChange={e => setF(x => ({ ...x, agenda: e.target.value }))} placeholder="What will you cover?" style={{ minHeight: 70 }} /></Field>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.text, marginBottom: 8 }}><input type="checkbox" checked={f.everyone} onChange={e => setF(x => ({ ...x, everyone: e.target.checked }))} /> Invite the whole company (all-hands)</label>
      {!f.everyone && (
        <div style={{ marginBottom: 14 }}>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search people… (${f.attendeeIds.length} invited)`} style={{ marginBottom: 6 }} />
          <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
            {people.map(p => (
              <label key={p.id} className="so-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", cursor: "pointer" }}>
                <input type="checkbox" checked={f.attendeeIds.includes(p.id)} onChange={() => toggle(p.id)} />
                <Avatar src={p.avatarDataUrl} name={p.fullName} size={26} presence={p.presence?.status} />
                <span style={{ fontSize: 13, color: C.heading }}>{p.fullName}</span><span style={{ fontSize: 11.5, color: C.textMuted }}>{p.roleLabel}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <Btn icon={CalendarPlus} onClick={create} disabled={busy || !f.title.trim()}>Schedule & send invites</Btn>
    </Modal>
  );
}

function MeetingDetail({ meeting: initial, onClose, onChanged }) {
  const { me, person, directory } = useOffice();
  const [m, setM] = useState(initial);
  const [notes, setNotes] = useState(initial.notes || "");
  const [items, setItems] = useState([]);
  const host = m.hostId === me.id;
  const attendees = m.everyone ? directory.map(p => p.id).filter(id => id !== m.hostId) : m.attendeeIds;

  async function patch(body, msg) {
    try { const j = await api("/api/staff/meetings", { method: "PATCH", body: { id: m.id, ...body } }); setM(j.meeting); if (msg) toast(msg); onChanged(); return j.meeting; }
    catch (e) { toast(e.message, "err"); return null; }
  }

  return (
    <Modal title={m.title} onClose={onClose} width={640}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge color={C.gold}>{fmtDateTime(m.startsAt)}</Badge><Badge color={C.blue}>{m.durationMin} min</Badge>
        {m.status !== "scheduled" && <Badge color={m.status === "cancelled" ? C.rose : C.mint}>{m.status}</Badge>}
      </div>
      {m.link && <a href={m.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn icon={Video}>Join video call</Btn></a>}
      {m.location && <div style={{ fontSize: 13, color: C.text, marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}><MapPin size={14} /> {m.location}</div>}
      {m.agenda && <><h3 style={h3}>AGENDA</h3><p style={{ fontSize: 14, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>{m.agenda}</p></>}

      {!host && m.status === "scheduled" && (
        <>
          <h3 style={h3}>ARE YOU COMING?</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {[["yes", "Yes"], ["maybe", "Maybe"], ["no", "Can't make it"]].map(([v, l]) => <Btn key={v} small variant={m.rsvps?.[me.id] === v ? "primary" : "ghost"} onClick={() => patch({ rsvp: v }, "RSVP sent")}>{l}</Btn>)}
          </div>
        </>
      )}

      <h3 style={h3}>ATTENDEES · host {person(m.hostId).fullName}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {attendees.map(id => {
          const p = person(id), r = m.rsvps?.[id];
          return <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 10px 3px 3px", fontSize: 12.5, color: C.text }}>
            <Avatar src={p.avatarDataUrl} name={p.fullName} size={22} /> {p.fullName}
            <span style={{ color: r === "yes" ? C.mint : r === "no" ? C.rose : r === "maybe" ? C.amber : C.textMuted }}>{r === "yes" ? "✓" : r === "no" ? "✕" : r === "maybe" ? "?" : "…"}</span>
          </span>;
        })}
      </div>

      {(host || m.notes) && <h3 style={h3}>MINUTES</h3>}
      {host ? <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key decisions and discussion points…" /> : m.notes && <p style={{ fontSize: 14, color: C.text, whiteSpace: "pre-wrap", margin: 0 }}>{m.notes}</p>}

      {(m.actionItems || []).length > 0 && (
        <>
          <h3 style={h3}>ACTION ITEMS</h3>
          {m.actionItems.map((a, i) => <div key={i} style={{ fontSize: 13.5, color: C.text, padding: "4px 0" }}>☐ {a.text} → <strong style={{ color: C.heading }}>{person(a.assigneeId).fullName}</strong>{a.dueDate ? ` · due ${a.dueDate}` : ""}</div>)}
        </>
      )}
      {host && m.status !== "cancelled" && (
        <>
          <h3 style={h3}>ADD ACTION ITEMS · each becomes a task for its owner</h3>
          {items.map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr auto", gap: 6, marginBottom: 6 }}>
              <Input value={a.text} onChange={e => setItems(list => list.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} placeholder="Action" />
              <Select value={a.assigneeId} onChange={e => setItems(list => list.map((x, j) => j === i ? { ...x, assigneeId: e.target.value } : x))}>
                {[m.hostId, ...attendees].map(id => <option key={id} value={id}>{person(id).fullName}</option>)}
              </Select>
              <Input type="date" value={a.dueDate} onChange={e => setItems(list => list.map((x, j) => j === i ? { ...x, dueDate: e.target.value } : x))} />
              <button type="button" onClick={() => setItems(list => list.filter((_, j) => j !== i))} aria-label="Remove" style={{ background: "none", border: "none", color: C.rose, cursor: "pointer" }}><Trash2 size={15} /></button>
            </div>
          ))}
          <Btn small variant="ghost" icon={Plus} onClick={() => setItems(list => [...list, { text: "", assigneeId: attendees[0] || me.id, dueDate: "" }])}>Add action item</Btn>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <Btn onClick={async () => { if (await patch({ notes, actionItems: items.filter(a => a.text.trim()) }, "Minutes saved, tasks created")) setItems([]); }}>Save minutes</Btn>
            {m.status === "scheduled" && <Btn variant="ghost" onClick={() => patch({ notes, done: true, actionItems: items.filter(a => a.text.trim()) }, "Meeting marked done")}>Mark as done</Btn>}
            {m.status === "scheduled" && <Btn danger onClick={() => confirm("Cancel this meeting for everyone?") && patch({ status: "cancelled" }, "Meeting cancelled")}>Cancel meeting</Btn>}
          </div>
        </>
      )}
    </Modal>
  );
}
const h3 = { fontSize: 12, color: C.textMuted, letterSpacing: "0.07em", margin: "18px 0 8px", fontFamily: font };

export default function Meetings({ param }) {
  const { person, navigate } = useOffice();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => api("/api/staff/meetings").then(j => setMeetings(j.meetings)).catch(e => toast(e.message, "err")).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);

  const creating = param === "new" || param?.startsWith("with-");
  const open = param && !creating ? meetings.find(m => m.id === param) : null;
  const now = Date.now();
  const upcoming = meetings.filter(m => m.status === "scheduled" && Date.parse(m.startsAt) + m.durationMin * 60000 >= now);
  const past = meetings.filter(m => !upcoming.includes(m)).reverse().slice(0, 20);

  const card = m => {
    const start = Date.parse(m.startsAt);
    const live = start <= now && start + m.durationMin * 60000 >= now;
    return (
      <SectionCard key={m.id} className="so-lift" style={{ cursor: "pointer", padding: 16 }}>
        <div onClick={() => navigate("meetings", m.id)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && navigate("meetings", m.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.heading }}>{m.title}</div>
            {live ? <Badge color={C.rose}>● Live now</Badge> : m.status !== "scheduled" ? <Badge color={m.status === "cancelled" ? C.rose : C.mint}>{m.status}</Badge> : null}
          </div>
          <div style={{ fontSize: 12.5, color: C.gold, fontWeight: 700, marginTop: 4 }}>{fmtDateTime(m.startsAt)} · {m.durationMin} min</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>Host: {person(m.hostId).fullName} · {m.everyone ? "Whole company" : `${m.attendeeIds.length + 1} people`}</div>
        </div>
        {m.link && m.status === "scheduled" && <a href={m.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "inline-block", marginTop: 10 }} onClick={e => e.stopPropagation()}><Btn small icon={Video} variant={live ? "primary" : "ghost"}>Join</Btn></a>}
      </SectionCard>
    );
  };

  return (
    <div>
      <PageHeader title="Meetings" sub="Every meeting gets a video room automatically. Reminders go out 15 minutes before." action={<Btn icon={CalendarPlus} onClick={() => navigate("meetings", "new")}>Schedule meeting</Btn>} />
      <SectionTitle>Upcoming</SectionTitle>
      {!loading && upcoming.length === 0 && <EmptyState icon={Video}>No upcoming meetings.</EmptyState>}
      <Grid min={280} style={{ marginBottom: 24 }}>{upcoming.map(card)}</Grid>
      {past.length > 0 && <><SectionTitle>Past & cancelled</SectionTitle><Grid min={280}>{past.map(card)}</Grid></>}
      {creating && <NewMeeting withId={param?.startsWith("with-") ? param.slice(5) : null} onClose={() => navigate("meetings")} onCreated={m => { load(); navigate("meetings", m.id); }} />}
      {open && <MeetingDetail key={open.id} meeting={open} onClose={() => navigate("meetings")} onChanged={load} />}
    </div>
  );
}
