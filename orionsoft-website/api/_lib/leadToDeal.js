// Website enquiries become pipeline deals automatically: demo bookings,
// quotes, contact and partnership requests, and chatbot leads. Each new deal
// goes to the next salesperson in turn (round robin), due for follow-up today,
// and they're alerted at once. A repeat enquiry from the same email lands on
// that client's open deal instead of creating a duplicate.
import { listRecords, getRecord, putRecord, newId } from "./records.js";
import { get, set, incr } from "../store.js";
import { notify } from "./office.js";
import { getRoleCatalog, can } from "./roles.js";

const SALES_TYPES = new Set(["demo", "quote", "contact", "partnership", "consultation", "pricing", "proposal"]);
const SALES_ROLES = ["sales_executive", "business_development_officer", "head_business_development"];
const STATE_KEY = "orionsoft:leads:state";
const lagosToday = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);

async function pickOwner(employees, catalog) {
  const active = employees.filter(e => e.status === "active");
  let pool = active.filter(e => SALES_ROLES.includes(e.staffRole));
  if (!pool.length) pool = active.filter(e => e.staffRole !== "owner" && can(e, "pipeline", catalog));
  if (!pool.length) pool = active.filter(e => e.staffRole === "owner");
  if (!pool.length) return null;
  pool.sort((a, b) => a.id.localeCompare(b.id));
  const n = await incr("orionsoft:leads:roundrobin");
  return pool[(n - 1) % pool.length];
}

export async function leadToDeal(lead) {
  if (!lead || !SALES_TYPES.has(String(lead.type || "").toLowerCase()) || !lead.email) return null;
  const email = String(lead.email).trim().toLowerCase();
  const [deals, employees, catalog] = await Promise.all([listRecords("deals"), listRecords("employees"), getRoleCatalog()]);
  const what = [lead.type === "demo" ? "Demo request" : lead.type === "quote" ? "Quote request" : "Website enquiry", lead.interestedService && lead.interestedService !== lead.type ? `for ${lead.interestedService}` : ""].filter(Boolean).join(" ");
  const note = `${what} (${lead.ref || "website"})${lead.source ? ` via ${lead.source}` : ""}${lead.demoSlot ? `. Preferred time: ${lead.demoSlot}` : ""}${lead.message ? `: "${String(lead.message).slice(0, 400)}"` : ""}`;

  // Same client asking again: add it to their open deal.
  const existing = deals.find(d => String(d.contactEmail || "").toLowerCase() === email && !["won", "lost"].includes(d.stage));
  let deal;
  if (existing) {
    existing.timeline = [{ at: new Date().toISOString(), by: "system", text: `New ${note}`, kind: "lead" }, ...(existing.timeline || [])].slice(0, 100);
    existing.nextFollowUp = lagosToday();
    existing.nextAction = `Reply to their new ${what.toLowerCase()}`;
    existing.updatedAt = new Date().toISOString();
    await putRecord("deals", existing.id, existing);
    deal = existing;
  } else {
    const owner = await pickOwner(employees, catalog);
    if (!owner) return null;
    deal = {
      id: newId("deal"), ownerId: owner.id, organisation: String(lead.company || lead.organisation || lead.orgName || lead.contactName || email).slice(0, 140),
      contactPerson: String(lead.contactName || "").slice(0, 100), contactPhone: String(lead.phone || "").slice(0, 40), contactEmail: email,
      product: String(lead.interestedService || "").slice(0, 60), value: 0, currency: "NGN", stage: "lead", source: lead.source || "Website",
      nextFollowUp: lagosToday(), nextAction: lead.type === "demo" ? "Confirm the demo time and send the meeting link" : "Call or email them back today",
      leadId: lead.id, leadRef: lead.ref || "",
      timeline: [{ at: new Date().toISOString(), by: "system", text: `Created from ${note}`, kind: "lead" }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await putRecord("deals", deal.id, deal);
  }
  await notify([deal.ownerId], {
    type: "pipeline", title: `🔥 New ${what.toLowerCase()}: ${deal.organisation}`,
    body: [lead.contactName, lead.phone, lead.email].filter(Boolean).join(" · "), link: `pipeline:${deal.id}`,
  });
  // Mark the lead as being worked on, with its deal.
  try {
    const state = (await get(STATE_KEY)) || {};
    state[lead.id] = { ...(state[lead.id] || {}), status: "contacted", dealId: deal.id, ownerId: deal.ownerId, updatedAt: new Date().toISOString(), by: "Automation" };
    await set(STATE_KEY, state);
  } catch { /* the deal exists either way */ }
  return deal;
}

export async function dealOwnerName(deal) {
  const e = deal?.ownerId ? await getRecord("employees", deal.ownerId) : null;
  return e?.fullName || "";
}
