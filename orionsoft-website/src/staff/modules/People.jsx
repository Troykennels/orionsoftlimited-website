import { useState } from "react";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { C, font, PRESENCE } from "../theme.js";
import { api, waLink, firstName } from "../api.js";
import { Avatar, Badge, SectionCard, Input, Select, EmptyState, PageHeader, Tabs, Grid, toast } from "../components.jsx";
import { useOffice } from "../office.js";

function OrgNode({ node, childrenOf, depth = 0 }) {
  const { openPerson } = useOffice();
  const kids = childrenOf(node.id);
  const [open, setOpen] = useState(depth < 2);
  const pres = PRESENCE[node.presence?.status] || PRESENCE.offline;
  return (
    <div style={{ marginLeft: depth ? 22 : 0, borderLeft: depth ? `1px dashed ${C.borderStrong}` : "none", paddingLeft: depth ? 14 : 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "6px 0" }}>
        {kids.length > 0 ? (
          <button type="button" onClick={() => setOpen(o => !o)} aria-label={open ? "Collapse" : "Expand"} aria-expanded={open} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 2, display: "flex" }}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
        ) : <span style={{ width: 20 }} />}
        <button type="button" onClick={() => openPerson(node.id)} className="so-card so-lift" style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.border}`, borderLeft: `3px solid ${node.level <= 2 ? C.gold : node.level <= 3 ? C.blue : C.border}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer", textAlign: "left", fontFamily: font, minWidth: 0, maxWidth: 420 }}>
          <Avatar src={node.avatarDataUrl} name={node.fullName} size={34} presence={node.presence?.status} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.fullName}</div>
            <div style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.roleLabel}{node.department ? ` · ${node.department}` : ""}</div>
          </div>
          <span title={pres.label} style={{ width: 8, height: 8, borderRadius: "50%", background: pres.color, flexShrink: 0 }} />
          {kids.length > 0 && <Badge color={C.textMuted}>{kids.length}</Badge>}
        </button>
      </div>
      {open && kids.map(k => <OrgNode key={k.id} node={k} childrenOf={childrenOf} depth={depth + 1} />)}
    </div>
  );
}

export default function People() {
  const { directory, me, openPerson, navigate } = useOffice();
  const [tab, setTab] = useState("directory");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const departments = [...new Set(directory.map(p => p.department).filter(Boolean))].sort();
  const list = directory.filter(p => (!dept || p.department === dept) && (!q || `${p.fullName} ${p.title} ${p.roleLabel} ${(p.skills || []).join(" ")}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.level - b.level || a.fullName.localeCompare(b.fullName));

  // Org chart: explicit managerId links; anyone without a (valid) manager sits at the top.
  const ids = new Set(directory.map(p => p.id));
  const childrenOf = id => directory.filter(p => p.managerId === id && p.id !== id).sort((a, b) => a.level - b.level || a.fullName.localeCompare(b.fullName));
  const roots = directory.filter(p => !p.managerId || !ids.has(p.managerId)).sort((a, b) => a.level - b.level || a.fullName.localeCompare(b.fullName));

  async function dm(id) {
    try { const j = await api("/api/staff/messages", { method: "POST", body: { action: "open-dm", partnerId: id } }); navigate("messages", j.id); } catch (e) { toast(e.message, "err"); }
  }

  return (
    <div>
      <PageHeader title="People & Org Chart" sub={`${directory.length} people at Orion Soft. Click anyone to see their profile, goals and achievements.`} />
      <Tabs active={tab} onChange={setTab} tabs={[{ id: "directory", label: "Directory" }, { id: "org", label: "Org chart" }]} />
      {tab === "directory" && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, role or skill…" style={{ maxWidth: 320 }} />
            <Select value={dept} onChange={e => setDept(e.target.value)} style={{ maxWidth: 240 }}><option value="">All departments</option>{departments.map(d => <option key={d}>{d}</option>)}</Select>
          </div>
          {list.length === 0 && <EmptyState>No one matches.</EmptyState>}
          <Grid min={250}>
            {list.map(p => {
              const pres = PRESENCE[p.presence?.status] || PRESENCE.offline;
              return (
                <SectionCard key={p.id} className="so-lift" style={{ padding: 16 }}>
                  <button type="button" onClick={() => openPerson(p.id)} style={{ display: "flex", gap: 12, alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: font, width: "100%" }}>
                    <Avatar src={p.avatarDataUrl} name={p.fullName} size={48} presence={p.presence?.status} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: C.heading }}>{p.fullName}{p.id === me.id ? " (you)" : ""}</div>
                      <div style={{ fontSize: 12.5, color: C.text }}>{p.title}</div>
                      <div style={{ fontSize: 11.5, color: pres.color, marginTop: 2 }}>● {pres.label}</div>
                    </div>
                  </button>
                  {p.headline && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>{p.headline}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    <Badge color={C.gold}>{p.roleLabel}</Badge>
                    {p.department && <Badge color={C.blue}>{p.department}</Badge>}
                  </div>
                  {p.id !== me.id && (
                    <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                      <button type="button" onClick={() => dm(p.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: C.blueDim, color: C.blue, border: "none", borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: font }}><MessageSquare size={14} /> Message</button>
                      {p.whatsapp && <a href={waLink(p.whatsapp, `Hi ${firstName(p.fullName)}, it's ${firstName(me.fullName)} from Orion Soft. `)} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", background: "rgba(37,211,102,0.14)", color: "#25D366", borderRadius: 8, padding: "7px", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>WhatsApp</a>}
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </Grid>
        </>
      )}
      {tab === "org" && (
        <SectionCard style={{ overflowX: "auto" }}>
          <p style={{ fontSize: 12.5, color: C.textMuted, marginTop: 0 }}>Reporting lines are set by HR/admin. Gold = executive, blue = management.</p>
          {roots.map(r => <OrgNode key={r.id} node={r} childrenOf={childrenOf} />)}
        </SectionCard>
      )}
    </div>
  );
}
