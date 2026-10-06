// AI helpers in the Staff Office. Everything is a draft the person reviews:
//  POST { action: "report-draft", weekStart, weekEnd } → weekly report fields
//       built from what they actually did that week (visits, deals, tasks,
//       standups, meetings). Numbers are counted, not invented.
//  POST { action: "meeting-summary", meetingId, notes } → tidy minutes and
//       action items with suggested owners and due dates.
import { listRecords, getRecord } from "../_lib/records.js";
import { officeContext } from "../_lib/office.js";
import { toLagos, lagosDate } from "../_lib/automations.js";
import { aiComplete, aiReady, aiReadImage } from "../_lib/ai.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STYLE = "Write in plain, professional British English for a Nigerian company. No em dashes. Don't invent facts, names or numbers that aren't in the data.";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await officeContext(req, res);
  if (!ctx) return;
  const { me, employees } = ctx;
  const b = req.body || {};

  if (b.action === "report-draft") {
    const to = DATE.test(b.weekEnd || "") ? b.weekEnd : lagosDate();
    const from = DATE.test(b.weekStart || "") ? b.weekStart : new Date(Date.parse(to) - 6 * 86400000).toISOString().slice(0, 10);
    const inWeek = iso => { const d = toLagos(iso).slice(0, 10); return d >= from && d <= to; };
    const [visits, deals, tasks, attendance, meetings] = await Promise.all([listRecords("visits"), listRecords("deals"), listRecords("tasks"), listRecords("attendance"), listRecords("meetings")]);
    const myVisits = visits.filter(v => v.employeeId === me.id && inWeek(v.checkIn.at));
    const myDeals = deals.filter(d => d.ownerId === me.id);
    const touched = myDeals.filter(d => (d.timeline || []).some(t => inWeek(t.at)) || (d.createdAt && inWeek(d.createdAt)));
    const won = myDeals.filter(d => d.stage === "won" && d.wonAt && inWeek(d.wonAt));
    const newLeads = myDeals.filter(d => d.createdAt && inWeek(d.createdAt));
    const proposals = touched.filter(d => ["proposal", "negotiation"].includes(d.stage));
    const done = tasks.filter(t => t.assigneeId === me.id && t.status === "done" && t.completedAt && inWeek(t.completedAt));
    const standups = attendance.filter(a => a.employeeId === me.id && a.date >= from && a.date <= to && a.standup).map(a => `${a.date}: ${a.standup.today}${a.standup.blockers ? ` (blocked: ${a.standup.blockers})` : ""}`);
    const mtgs = meetings.filter(m => m.status !== "cancelled" && inWeek(m.startsAt) && (m.hostId === me.id || (m.attendeeIds || []).includes(me.id)));
    const followUps = myDeals.filter(d => d.nextFollowUp && d.nextFollowUp > to && !["won", "lost"].includes(d.stage));

    const totals = {
      prospectsContacted: touched.length, physicalVisits: myVisits.length, meetingsHeld: mtgs.length + myVisits.length,
      productDemos: myVisits.filter(v => /demo/i.test(`${v.purpose} ${v.outcome}`)).length, proposalsSent: proposals.length,
      newLeadsGenerated: newLeads.length, salesClosed: won.length, salesValue: won.reduce((n, d) => n + (Number(d.value) || 0), 0),
    };
    const facts = [
      `Week ${from} to ${to}. Person: ${me.fullName}, ${me.title || ""}.`,
      `Client visits (${myVisits.length}): ${myVisits.map(v => `${v.organisation}${v.purpose ? ` (${v.purpose})` : ""}${v.outcome ? ` -> ${v.outcome}` : ""}`).join("; ") || "none"}.`,
      `Deals worked on: ${touched.map(d => `${d.organisation} [${d.stage}]${d.value ? ` ₦${d.value}` : ""}`).join("; ") || "none"}. Won: ${won.map(d => d.organisation).join(", ") || "none"}.`,
      `Tasks completed: ${done.map(t => t.title).join("; ") || "none"}.`,
      `Meetings: ${mtgs.map(m => m.title).join("; ") || "none"}.`,
      `Daily standups: ${standups.join(" | ") || "none"}.`,
      `Upcoming follow-ups: ${followUps.map(d => `${d.organisation} on ${d.nextFollowUp}`).join("; ") || "none"}.`,
    ].join("\n");
    const ai = await aiComplete(
      `You draft a salesperson's weekly report from their activity log. ${STYLE} Return JSON with keys: summary (4-8 short sentences or bullet lines on the week's main activities), challenges (1-3 sentences, only from blockers mentioned, else empty string), supportNeeded (empty unless clearly implied), nextWeekOrganisations (comma-separated organisations to follow up, from the data).`,
      facts, { json: true, maxTokens: 700 });
    const fallbackSummary = [
      myVisits.length && `Visited ${myVisits.length} client${myVisits.length === 1 ? "" : "s"}: ${myVisits.map(v => v.organisation).join(", ")}.`,
      touched.length && `Worked on ${touched.length} deal${touched.length === 1 ? "" : "s"}${won.length ? `, closed ${won.map(d => d.organisation).join(", ")}` : ""}.`,
      done.length && `Completed ${done.length} task${done.length === 1 ? "" : "s"}: ${done.slice(0, 5).map(t => t.title).join("; ")}.`,
      mtgs.length && `Attended ${mtgs.length} meeting${mtgs.length === 1 ? "" : "s"}.`,
    ].filter(Boolean).join("\n");
    return res.json({
      ok: true, ai: !!ai,
      draft: {
        summary: ai?.summary ? (Array.isArray(ai.summary) ? ai.summary.join("\n") : String(ai.summary)) : fallbackSummary,
        challenges: String(ai?.challenges || standups.filter(s => s.includes("blocked")).join("\n")),
        supportNeeded: String(ai?.supportNeeded || ""),
        totals,
        nextWeekPlan: { organisationsToVisit: String(ai?.nextWeekOrganisations || followUps.map(d => d.organisation).join(", ")) },
        followUps: followUps.slice(0, 10).map(d => ({ prospect: d.organisation, reason: d.nextAction || "Follow up", plannedDate: d.nextFollowUp, expectedOutcome: "" })),
      },
    });
  }

  if (b.action === "meeting-summary") {
    const m = await getRecord("meetings", b.meetingId);
    if (!m) return res.status(404).json({ error: "Meeting not found" });
    if (m.hostId !== me.id) return res.status(403).json({ error: "Only the host can write the minutes" });
    const notes = String(b.notes || "").slice(0, 8000);
    if (notes.trim().length < 20) return res.status(400).json({ error: "Write or paste some rough notes first" });
    if (!aiReady()) return res.status(503).json({ error: "AI isn't switched on for this site yet (GROQ_API_KEY)." });
    const people = [m.hostId, ...(m.attendeeIds || [])].map(id => employees.find(e => e.id === id)).filter(Boolean);
    const out = await aiComplete(
      `You turn rough meeting notes into minutes. ${STYLE} Return JSON: { "minutes": "clear minutes with decisions, as short paragraphs or bullet lines", "actionItems": [ { "text": "action", "owner": "exact full name from the attendee list or empty", "dueDate": "YYYY-MM-DD or empty" } ] }. Today is ${lagosDate()}. Only include actions the notes support.`,
      `Meeting: ${m.title} on ${toLagos(m.startsAt).slice(0, 10)}\nAgenda: ${m.agenda || "-"}\nAttendees: ${people.map(p => p.fullName).join(", ")}\n\nRough notes:\n${notes}`,
      { json: true, maxTokens: 1200 });
    if (!out) return res.status(502).json({ error: "The AI couldn't summarise that just now. Try again." });
    const items = (Array.isArray(out.actionItems) ? out.actionItems : []).slice(0, 15).map(a => {
      const owner = people.find(p => p.fullName.toLowerCase() === String(a.owner || "").toLowerCase()) || people.find(p => String(a.owner || "").toLowerCase().includes(p.fullName.split(" ")[0].toLowerCase()));
      return { text: String(a.text || "").slice(0, 300), assigneeId: owner?.id || m.hostId, dueDate: DATE.test(a.dueDate || "") ? a.dueDate : "" };
    }).filter(a => a.text);
    return res.json({ ok: true, minutes: String(out.minutes || "").slice(0, 8000), actionItems: items });
  }

  // Expense receipt photo → amount, date, vendor, category (the person checks it).
  if (b.action === "read-receipt") {
    if (!aiReady()) return res.status(503).json({ error: "Receipt reading isn't switched on yet." });
    const categories = ["Travel", "Meals & Entertainment", "Office Supplies", "Software & Subscriptions", "Client Costs", "Other"];
    const out = await aiReadImage(
      `Read this receipt (likely Nigerian). Return JSON only: {"amount": total paid as a number with no currency symbol, "currency": "NGN" or the currency shown, "date": "YYYY-MM-DD" or "", "vendor": shop or company name, "category": one of ${JSON.stringify(categories)}, "description": a short description of what was bought (under 80 characters)}. Use the grand total, not a subtotal. If something isn't visible, use "" or 0.`,
      String(b.imageDataUrl || ""));
    if (!out) return res.status(502).json({ error: "Couldn't read that receipt. Fill in the details yourself." });
    const amount = Number(String(out.amount ?? "").replace(/[^\d.]/g, "")) || 0;
    return res.json({
      ok: true,
      receipt: {
        amount, currency: String(out.currency || "NGN").slice(0, 3).toUpperCase(),
        date: DATE.test(out.date || "") && out.date <= lagosDate() ? out.date : "",
        vendor: String(out.vendor || "").slice(0, 80),
        category: categories.includes(out.category) ? out.category : "Other",
        description: String(out.description || "").slice(0, 120),
      },
    });
  }

  return res.status(400).json({ error: "Unknown action" });
}
