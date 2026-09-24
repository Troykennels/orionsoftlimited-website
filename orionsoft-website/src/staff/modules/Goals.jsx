import { useCallback, useEffect, useState } from "react";
import { Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { C } from "../theme.js";
import { api, timeAgo, fmtDate } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, Input, Textarea, Select, Modal, Field, EmptyState, PageHeader, Tabs, Grid, Progress, toast } from "../components.jsx";
import { useOffice } from "../office.js";

const VIS = { private: ["🔒 Private", C.textMuted], team: ["👥 Team", C.blue], public: ["🌍 Public", C.mint] };

function GoalForm({ onClose, onSaved, categories, team }) {
  const { me, person } = useOffice();
  const [f, setF] = useState({ title: "", description: "", category: categories[0] || "", dueDate: "", visibility: "team", ownerId: me.id, keyResults: [{ title: "", target: "", unit: "" }] });
  const setKr = (i, k, v) => setF(x => ({ ...x, keyResults: x.keyResults.map((kr, j) => j === i ? { ...kr, [k]: v } : kr) }));
  async function save() {
    try { await api("/api/staff/goals", { method: "POST", body: f }); toast("Goal created. Go get it! 🎯"); onSaved(); } catch (e) { toast(e.message, "err"); }
  }
  return (
    <Modal title="Set a goal" onClose={onClose} width={620}>
      <Field label="Goal" style={{ marginBottom: 12 }}><Input value={f.title} autoFocus onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="e.g. Onboard 5 new hospitals onto CareCore this quarter" /></Field>
      <Field label="Why it matters (optional)" style={{ marginBottom: 12 }}><Textarea value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} style={{ minHeight: 60 }} /></Field>
      <Grid min={150} style={{ marginBottom: 12 }}>
        <Field label="Category"><Select value={f.category} onChange={e => setF(x => ({ ...x, category: e.target.value }))}>{categories.map(c => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={e => setF(x => ({ ...x, dueDate: e.target.value }))} /></Field>
        <Field label="Who can see it"><Select value={f.visibility} onChange={e => setF(x => ({ ...x, visibility: e.target.value }))}><option value="team">Colleagues</option><option value="public">Public (on my profile page)</option><option value="private">Only me & my managers</option></Select></Field>
        {team.length > 0 && <Field label="Goal owner"><Select value={f.ownerId} onChange={e => setF(x => ({ ...x, ownerId: e.target.value }))}><option value={me.id}>Me</option>{team.map(id => <option key={id} value={id}>{person(id).fullName}</option>)}</Select></Field>}
      </Grid>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>KEY RESULTS · how you'll measure it (progress is calculated automatically)</div>
      {f.keyResults.map((kr, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 90px 90px auto", gap: 6, marginBottom: 6 }}>
          <Input value={kr.title} onChange={e => setKr(i, "title", e.target.value)} placeholder="e.g. Hospitals signed" />
          <Input type="number" value={kr.target} onChange={e => setKr(i, "target", e.target.value)} placeholder="Target" />
          <Input value={kr.unit} onChange={e => setKr(i, "unit", e.target.value)} placeholder="Unit" />
          <button type="button" aria-label="Remove key result" onClick={() => setF(x => ({ ...x, keyResults: x.keyResults.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", color: C.rose, cursor: "pointer" }}><Trash2 size={15} /></button>
        </div>
      ))}
      <Btn small variant="ghost" icon={Plus} onClick={() => setF(x => ({ ...x, keyResults: [...x.keyResults, { title: "", target: "", unit: "" }] }))}>Add key result</Btn>
      <div style={{ marginTop: 16 }}><Btn onClick={save} disabled={!f.title.trim()}>Create goal</Btn></div>
    </Modal>
  );
}

function CheckIn({ goal, onClose, onSaved }) {
  const [krs, setKrs] = useState(goal.keyResults.map(k => ({ id: k.id, current: k.current })));
  const [progress, setProgress] = useState(goal.progress);
  const [note, setNote] = useState("");
  const [confidence, setConfidence] = useState("on_track");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [pub, setPub] = useState(goal.visibility === "public");
  async function save() {
    try {
      const j = await api("/api/staff/goals", { method: "POST", body: { action: "checkin", id: goal.id, keyResults: krs, progress, note, confidence, shareToFeed, public: pub } });
      toast(j.goal.status === "completed" ? "🏆 Goal achieved! It's been celebrated on the feed." : `Progress saved: ${j.goal.progress}%`);
      onSaved();
    } catch (e) { toast(e.message, "err"); }
  }
  return (
    <Modal title={`Check in · ${goal.title}`} onClose={onClose} width={560}>
      {goal.keyResults.length > 0 ? goal.keyResults.map((k, i) => (
        <Field key={k.id} label={`${k.title} (target ${k.target}${k.unit ? ` ${k.unit}` : ""})`} style={{ marginBottom: 10 }}>
          <Input type="number" value={krs[i].current} onChange={e => setKrs(list => list.map((x, j) => j === i ? { ...x, current: e.target.value } : x))} />
        </Field>
      )) : (
        <Field label={`Progress: ${progress}%`} style={{ marginBottom: 12 }}><input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} style={{ width: "100%" }} /></Field>
      )}
      <Field label="How confident are you?" style={{ marginBottom: 10 }}>
        <Select value={confidence} onChange={e => setConfidence(e.target.value)}><option value="on_track">🟢 On track</option><option value="at_risk">🟠 At risk</option><option value="off_track">🔴 Off track</option></Select>
      </Field>
      <Field label="What moved it forward? (optional)" style={{ marginBottom: 10 }}><Textarea value={note} onChange={e => setNote(e.target.value)} style={{ minHeight: 60 }} /></Field>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.text, marginBottom: 6 }}><input type="checkbox" checked={shareToFeed} onChange={e => setShareToFeed(e.target.checked)} /> Share this progress on the office feed</label>
      {shareToFeed && <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.text, marginBottom: 14 }}><input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)} /> Make it public so I can share it on LinkedIn & other socials</label>}
      <Btn icon={TrendingUp} onClick={save}>Save check-in</Btn>
    </Modal>
  );
}

function GoalCard({ goal, owner, canEdit, onCheckIn, onChanged }) {
  const [vl, vc] = VIS[goal.visibility] || VIS.team;
  const last = goal.checkins?.[0];
  async function patch(body) { try { await api("/api/staff/goals", { method: "PATCH", body: { id: goal.id, ...body } }); onChanged(); } catch (e) { toast(e.message, "err"); } }
  return (
    <SectionCard className="so-lift" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          {owner && <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: C.textMuted, marginBottom: 4 }}><Avatar src={owner.avatarDataUrl} name={owner.fullName} size={18} /> {owner.fullName}</div>}
          <div style={{ fontSize: 15, fontWeight: 800, color: C.heading, lineHeight: 1.35 }}>{goal.title}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: goal.progress >= 100 ? C.mint : C.gold }}>{goal.progress}%</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 10px" }}>
        <Badge color={C.purple}>{goal.category}</Badge><Badge color={vc}>{vl}</Badge>
        {goal.status === "completed" && <Badge color={C.mint}>🏆 Achieved</Badge>}
        {goal.dueDate && goal.status === "active" && <Badge color={C.textMuted}>Due {fmtDate(goal.dueDate)}</Badge>}
      </div>
      <Progress value={goal.progress} />
      {goal.keyResults.map(k => (
        <div key={k.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.text, marginTop: 8, gap: 10 }}>
          <span>{k.title}</span><span style={{ color: C.textMuted, whiteSpace: "nowrap" }}>{k.current} / {k.target} {k.unit}</span>
        </div>
      ))}
      {last && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Last check-in {timeAgo(last.at)}{last.note ? `: “${last.note.slice(0, 90)}”` : ""}</div>}
      {canEdit && goal.status === "active" && (
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {onCheckIn && <Btn small icon={TrendingUp} onClick={onCheckIn}>Check in</Btn>}
          <Btn small variant="ghost" onClick={() => patch({ visibility: goal.visibility === "public" ? "team" : "public" })}>{goal.visibility === "public" ? "Make team-only" : "Make public"}</Btn>
          <Btn small variant="ghost" onClick={() => confirm("Archive this goal?") && patch({ status: "archived" })}>Archive</Btn>
        </div>
      )}
    </SectionCard>
  );
}

export default function Goals() {
  const { me, person, can } = useOffice();
  const [tab, setTab] = useState("mine");
  const [goals, setGoals] = useState([]);
  const [teamGoals, setTeamGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [team, setTeam] = useState([]);
  const [creating, setCreating] = useState(false);
  const [checkIn, setCheckIn] = useState(null);

  const load = useCallback(async () => {
    try {
      const j = await api("/api/staff/goals");
      setGoals(j.goals); setCategories(j.categories);
      if (can("team.view") || can("tasks.assign")) {
        const t = await api("/api/staff/goals?scope=team");
        setTeamGoals(t.goals);
        const tk = await api("/api/staff/tasks");
        setTeam(tk.team);
      }
    } catch (e) { toast(e.message, "err"); }
  }, [can]);
  useEffect(() => { load(); }, [load]);

  const active = goals.filter(g => g.status === "active");
  const avg = active.length ? Math.round(active.reduce((n, g) => n + g.progress, 0) / active.length) : 0;

  return (
    <div>
      <PageHeader title="Goals & Progress" sub="Set measurable goals, check in weekly, and show your progress to the team or the world." action={<Btn icon={Plus} onClick={() => setCreating(true)}>New goal</Btn>} />
      <Grid min={170} style={{ marginBottom: 18 }}>
        <SectionCard><div style={{ fontSize: 12, color: C.textMuted }}>Active goals</div><div style={{ fontSize: 26, fontWeight: 800, color: C.blue }}>{active.length}</div></SectionCard>
        <SectionCard><div style={{ fontSize: 12, color: C.textMuted }}>Average progress</div><div style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>{avg}%</div></SectionCard>
        <SectionCard><div style={{ fontSize: 12, color: C.textMuted }}>Achieved</div><div style={{ fontSize: 26, fontWeight: 800, color: C.mint }}>{goals.filter(g => g.status === "completed").length}</div></SectionCard>
      </Grid>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: "mine", label: "My goals" }, ...(teamGoals.length || team.length ? [{ id: "team", label: "My team's goals" }] : []), { id: "done", label: "Achieved & archived" }]} />
      {tab === "mine" && (active.length ? <Grid min={300}>{active.map(g => <GoalCard key={g.id} goal={g} canEdit onCheckIn={() => setCheckIn(g)} onChanged={load} />)}</Grid> : <EmptyState icon={Target}>No active goals. Set one to start tracking your progress.</EmptyState>)}
      {tab === "team" && (teamGoals.length ? <Grid min={300}>{teamGoals.filter(g => g.status === "active").map(g => <GoalCard key={g.id} goal={g} owner={person(g.ownerId)} canEdit onChanged={load} />)}</Grid> : <EmptyState>No team goals yet. Use "New goal" to set one for someone who reports to you.</EmptyState>)}
      {tab === "done" && <Grid min={300}>{goals.filter(g => g.status !== "active").map(g => <GoalCard key={g.id} goal={g} canEdit={g.ownerId === me.id} onChanged={load} />)}</Grid>}
      {creating && <GoalForm categories={categories} team={team} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {checkIn && <CheckIn goal={checkIn} onClose={() => setCheckIn(null)} onSaved={() => { setCheckIn(null); load(); }} />}
    </div>
  );
}
