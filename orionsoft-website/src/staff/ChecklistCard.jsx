// Lobby card: onboarding / offboarding items that are yours to tick off.
import { useCallback, useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { C, font } from "./theme.js";
import { api } from "./api.js";
import { SectionCard, SectionTitle, Progress, Badge, toast } from "./components.jsx";

export default function ChecklistCard() {
  const [data, setData] = useState(null);
  const load = useCallback(() => api("/api/staff/checklists").then(setData).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  if (!data?.checklists?.length) return null;

  async function tick(list, item) {
    try {
      await api("/api/staff/checklists", { method: "PATCH", body: { id: list.id, itemId: item.id, done: !item.done } });
      load();
    } catch (e) { toast(e.message, "err"); }
  }

  return (
    <SectionCard style={{ marginBottom: 16, borderColor: `${C.blue}55` }}>
      <SectionTitle><ListChecks size={16} style={{ verticalAlign: -3, marginRight: 6 }} aria-hidden="true" />Checklists for you</SectionTitle>
      {data.checklists.map(list => (
        <div key={list.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.heading, marginBottom: 6, flexWrap: "wrap" }}>
            <span>{list.kind === "onboarding" ? "Onboarding" : "Offboarding"}: {list.employeeName}</span>
            <Badge color={list.progress.pct === 100 ? C.mint : C.blue}>{list.progress.done}/{list.progress.total} done</Badge>
          </div>
          <Progress value={list.progress.pct} height={5} />
          <div style={{ marginTop: 8 }}>
            {list.items.map(i => (
              <label key={i.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", fontSize: 13.5, color: i.done ? C.textMuted : C.text, fontFamily: font, cursor: "pointer", textDecoration: i.done ? "line-through" : "none", minHeight: 24 }}>
                <input type="checkbox" checked={i.done} onChange={() => tick(list, i)} style={{ marginTop: 3, width: 16, height: 16 }} />
                <span style={{ flex: 1 }}>{i.text}</span>
                <span style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>{data.owners[i.owner]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </SectionCard>
  );
}
