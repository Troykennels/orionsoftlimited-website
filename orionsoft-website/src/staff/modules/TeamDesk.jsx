import { useEffect, useState } from "react";
import { Users, Clock, Coffee, Palmtree, AlertTriangle, Cake } from "lucide-react";
import { C, font, PRESENCE } from "../theme.js";
import { api, fmtDate } from "../api.js";
import { Avatar, Badge, SectionCard, EmptyState, PageHeader, Grid, StatCard, Progress, Input, Tabs, toast } from "../components.jsx";
import { useOffice } from "../office.js";

export default function TeamDesk() {
  const { openPerson, person } = useOffice();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("people");
  useEffect(() => { api("/api/staff/team").then(setData).catch(e => toast(e.message, "err")); }, []);
  if (!data) return <EmptyState>Loading…</EmptyState>;

  const people = data.people.filter(p => !q || `${p.fullName} ${p.department} ${p.roleLabel}`.toLowerCase().includes(q.toLowerCase()));
  const standups = data.people.filter(p => p.attendanceToday?.standup);

  return (
    <div>
      <PageHeader title={data.hrRecords ? "HR Desk" : "Team Desk"} sub={data.companyWide ? "Everyone in the company, live." : "Everyone in your reporting line, live."} />
      <Grid min={160} style={{ marginBottom: 18 }}>
        <StatCard label="Headcount" value={data.summary.headcount} color={C.blue} icon={Users} />
        <StatCard label="Clocked in now" value={data.summary.clockedIn} color={C.mint} icon={Clock} />
        <StatCard label="Standups today" value={data.summary.standups} color={C.purple} icon={Coffee} />
        <StatCard label="On leave today" value={data.summary.onLeave} color={C.amber} icon={Palmtree} />
        <StatCard label="Overdue tasks" value={data.summary.overdueTasks} color={C.rose} icon={AlertTriangle} />
      </Grid>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: "people", label: "People" }, { id: "standups", label: "Today's standups", count: standups.length }, { id: "celebrations", label: "Birthdays & anniversaries", count: data.upcoming.length }, { id: "departments", label: "Departments" }]} />

      {tab === "people" && (
        <SectionCard>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by name, department or role…" style={{ maxWidth: 340, marginBottom: 12 }} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontFamily: font }}>
              <thead><tr>{["Person", "Status", "Today", "Tasks", "Goals", "Annual leave", "Points"].map(h => <th key={h} style={{ textAlign: "left", fontSize: 11.5, color: C.textMuted, padding: "8px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>
                {people.map(p => {
                  const pres = PRESENCE[p.presence?.status] || PRESENCE.offline;
                  const att = p.attendanceToday;
                  return (
                    <tr key={p.id} className="so-row" onClick={() => openPerson(p.id)} style={{ cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: 8 }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Avatar src={p.avatarDataUrl} name={p.fullName} size={30} presence={p.presence?.status} /><div><div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading }}>{p.fullName}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{p.roleLabel} · {p.department || "—"}</div></div></div></td>
                      <td style={{ padding: 8 }}>{p.onLeaveToday ? <Badge color={C.rose}>On leave</Badge> : <Badge color={pres.color}>{pres.label}</Badge>}</td>
                      <td style={{ padding: 8, fontSize: 12.5, color: C.text }}>{att?.clockIn ? `In ${new Date(att.clockIn).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}${att.clockOut ? " · out" : ""}${att.standup ? " · standup ✓" : ""}` : <span style={{ color: C.textMuted }}>Not in yet</span>}</td>
                      <td style={{ padding: 8, fontSize: 12.5 }}><span style={{ color: C.text }}>{p.openTasks} open</span>{p.overdueTasks ? <span style={{ color: C.rose, fontWeight: 700 }}> · {p.overdueTasks} overdue</span> : null}</td>
                      <td style={{ padding: 8, minWidth: 110 }}>{p.goalProgress === null ? <span style={{ fontSize: 12, color: C.textMuted }}>No goals</span> : <><div style={{ fontSize: 11.5, color: C.text, marginBottom: 3 }}>{p.goalCount} · {p.goalProgress}%</div><Progress value={p.goalProgress} height={5} /></>}</td>
                      <td style={{ padding: 8, fontSize: 12.5, color: C.text }}>{p.leaveUsed}/{p.leaveAllowance} days</td>
                      <td style={{ padding: 8, fontSize: 13, fontWeight: 800, color: C.mint }}>{p.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {people.length === 0 && <EmptyState>No one to show.</EmptyState>}
          {data.hrRecords && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Click anyone to see their full HR record (personal details, emergency contact, leave allowance).</p>}
        </SectionCard>
      )}

      {tab === "standups" && (standups.length === 0 ? <EmptyState icon={Coffee}>No standups posted yet today.</EmptyState> : (
        <Grid min={300}>
          {standups.map(p => (
            <SectionCard key={p.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><Avatar src={p.avatarDataUrl} name={p.fullName} size={30} /><strong style={{ color: C.heading, fontSize: 13.5 }}>{p.fullName}</strong></div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                <div><strong style={{ color: C.textMuted }}>Yesterday:</strong> {p.attendanceToday.standup.yesterday || "—"}</div>
                <div><strong style={{ color: C.textMuted }}>Today:</strong> {p.attendanceToday.standup.today}</div>
                {p.attendanceToday.standup.blockers && <div style={{ color: C.rose }}><strong>Blocked:</strong> {p.attendanceToday.standup.blockers}</div>}
              </div>
            </SectionCard>
          ))}
        </Grid>
      ))}

      {tab === "celebrations" && (
        <SectionCard>
          {data.upcoming.length === 0 && <EmptyState>Nothing in the next 30 days.</EmptyState>}
          {data.upcoming.map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <Cake size={16} color={u.kind === "birthday" ? C.rose : C.gold} aria-hidden="true" />
              <span style={{ flex: 1, fontSize: 13.5, color: C.text }}><strong style={{ color: C.heading }}>{person(u.employeeId).fullName}</strong> · {u.kind === "birthday" ? "Birthday" : `${u.years}-year work anniversary`}</span>
              <span style={{ fontSize: 12.5, color: C.textMuted }}>{fmtDate(u.date)}</span>
            </div>
          ))}
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>The office posts a celebration on the feed automatically on the day.</p>
        </SectionCard>
      )}

      {tab === "departments" && (
        <Grid min={220}>
          {data.summary.byDepartment.map(d => <StatCard key={d.name} label={d.name} value={d.count} sub={`${d.count === 1 ? "person" : "people"}`} color={C.gold} />)}
        </Grid>
      )}
    </div>
  );
}
