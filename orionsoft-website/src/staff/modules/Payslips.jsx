import { useEffect, useState } from "react";
import { Wallet, Download } from "lucide-react";
import { C } from "../theme.js";
import { api } from "../api.js";
import { SectionCard, SectionTitle, EmptyState, PageHeader, Btn, toast } from "../components.jsx";

export default function Payslips() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const load = () => api("/api/staff/payslips").then(setData).catch(e => toast(e.message, "err"));
    load();
    // Commissions added during the month show up without a refresh.
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);
  if (!data) return <EmptyState>Loading…</EmptyState>;
  const d = data.currentDraft;
  const money = (cur, n) => `${cur || "NGN"} ${Number(n || 0).toLocaleString()}`;
  return (
    <div>
      <PageHeader title="Payslips" sub="Your pay history, plus this month's running total as commissions are added." />
      {d && (
        <SectionCard style={{ marginBottom: 18, borderColor: `${C.gold}55` }}>
          <SectionTitle sub="Updates live as commissions are added. Finalised when payroll issues your payslip.">{d.period} · in progress</SectionTitle>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Base salary</span><span>{money(d.currency, d.baseSalary)}</span></div>
            {(d.commissions || []).map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", color: C.mint }}><span>{c.label}</span><span>+{money(d.currency, c.amount)}</span></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: C.heading, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}><span>Running total</span><span>{money(d.currency, d.grossAmount)}</span></div>
          </div>
        </SectionCard>
      )}
      <SectionCard>
        <SectionTitle>Issued payslips</SectionTitle>
        {data.payslips.length === 0 && <EmptyState icon={Wallet}>No payslips issued yet.</EmptyState>}
        {data.payslips.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: `1px solid ${C.border}`, gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, color: C.heading, fontSize: 14 }}>{p.period}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted }}>Net pay {money(p.currency, p.netAmount)} · {p.status}</div>
            </div>
            {p.payslipPdfKey && <a href={`/api/files/download?key=${encodeURIComponent(p.payslipPdfKey)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" icon={Download}>PDF</Btn></a>}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
