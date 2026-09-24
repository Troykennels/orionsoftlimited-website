import { useState } from "react";
import { Link2, CheckCircle2, ExternalLink } from "lucide-react";
import { C } from "../theme.js";
import { api, waLink } from "../api.js";
import { Btn, SectionCard, SectionTitle, Badge, EmptyState, PageHeader, Grid, toast } from "../components.jsx";
import { useOffice } from "../office.js";

export default function Handbook() {
  const { office, me, reload } = useOffice();
  const [acked, setAcked] = useState(office.acknowledged);
  const [open, setOpen] = useState(null);
  const groups = office.config.resources.reduce((m, r) => ({ ...m, [r.category || "General"]: [...(m[r.category || "General"] || []), r] }), {});

  async function ack(id) {
    try { await api("/api/staff/office", { method: "POST", body: { action: "acknowledge", resourceId: id } }); setAcked(a => [...a, id]); toast("Thanks, acknowledged"); reload(); }
    catch (e) { toast(e.message, "err"); }
  }

  return (
    <div>
      <PageHeader title="Handbook & Links" sub="Company policies, how-tos and the tools you use every day." />
      <div className="so-two">
        <div className="so-stack" style={{ gap: 16 }}>
          {Object.keys(groups).length === 0 && <EmptyState>No handbook entries yet.</EmptyState>}
          {Object.entries(groups).map(([cat, items]) => (
            <SectionCard key={cat}>
              <SectionTitle>{cat}</SectionTitle>
              {items.map(r => {
                const done = acked.includes(r.id);
                return (
                  <div key={r.id} style={{ borderTop: `1px solid ${C.border}`, padding: "12px 0" }}>
                    <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: C.heading }}>{r.title}</span>
                      {r.requiresAck && (done ? <Badge color={C.mint}><CheckCircle2 size={12} /> Acknowledged</Badge> : <Badge color={C.amber}>Please read</Badge>)}
                    </button>
                    {(open === r.id || (r.requiresAck && !done)) && (
                      <div style={{ marginTop: 8 }}>
                        {r.body && <p style={{ fontSize: 13.5, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: "0 0 10px" }}>{r.body}</p>}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {r.url && <a href={r.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" icon={ExternalLink}>Open document</Btn></a>}
                          {r.requiresAck && !done && <Btn small icon={CheckCircle2} onClick={() => ack(r.id)}>I've read and understood this</Btn>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </SectionCard>
          ))}
        </div>
        <div className="so-stack" style={{ gap: 16 }}>
          <SectionCard>
            <SectionTitle>Quick links</SectionTitle>
            {office.config.quickLinks.map(l => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="so-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 4px", textDecoration: "none", color: C.text, fontSize: 13.5, borderRadius: 8 }}><Link2 size={14} color={C.gold} /> {l.label}</a>
            ))}
          </SectionCard>
          <SectionCard>
            <SectionTitle sub="For urgent issues when you're away from the office.">Need help?</SectionTitle>
            <Grid min={140}>
              {office.config.managementWhatsapp && <a href={waLink(office.config.managementWhatsapp, `Hello, this is ${me.fullName} from the Orion Soft team. `)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn variant="ghost" style={{ width: "100%", color: "#25D366", borderColor: "#25D36655" }}>WhatsApp management</Btn></a>}
              {office.config.whatsappGroupLink && <a href={office.config.whatsappGroupLink} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn variant="ghost" style={{ width: "100%", color: "#25D366", borderColor: "#25D36655" }}>Team WhatsApp group</Btn></a>}
            </Grid>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
