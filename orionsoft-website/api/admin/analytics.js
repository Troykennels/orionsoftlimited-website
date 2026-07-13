// Comprehensive analytics endpoint — all metrics from Upstash in one call
import { list, getCount, hgetall, available } from "../store.js";

const SECRET = process.env.ADMIN_SECRET || process.env.VITE_ADMIN_PASSWORD || "orionsoft2026";

function safeParse(item) {
  if (item && typeof item === "object") return item;
  try { return JSON.parse(item); } catch { return null; }
}

function extractDomain(url) {
  if (!url) return "direct";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") || "direct";
  } catch { return "direct"; }
}

const EMPTY = {
  ok: true, upstashMissing: true,
  generatedAt: new Date().toISOString(),
  stats: {
    visitors: { total: 0, today: 0, month: 0, growth: 0 },
    leads: { total: 0, demo: 0, contact: 0, support: 0, newsletter: 0, quote: 0, new: 0, growth: 0 },
    companies: { unique: 0 },
    conversations: { total: 0, escalated: 0 },
  },
  trends: { daily: [], monthly: [] },
  topPages: [], topProducts: [], trafficSources: [], leadTypes: {},
  recentActivities: [],
  health: { upstash: false, email: false, ai: false },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const key = req.headers["x-admin-key"] || req.query.key || "";
  if (key !== SECRET) return res.status(401).json({ error: "Unauthorized" });

  if (!available()) return res.json(EMPTY);

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const thisMonth = today.slice(0, 7);

    // Fetch all data sources in parallel
    const [rawLeads, rawConvs, totalVisits, pageViews, dailyVisits, referrers] = await Promise.all([
      list("orionsoft:leads", 500),
      list("orionsoft:conversations", 500),
      getCount("orionsoft:visits:total"),
      hgetall("orionsoft:visits:pages"),
      hgetall("orionsoft:visits:daily"),
      hgetall("orionsoft:visits:referrers"),
    ]);

    const leads = rawLeads.map(safeParse).filter(Boolean);
    const convs  = rawConvs.map(safeParse).filter(Boolean);

    // Aggregate from leads
    const leadsByType = {}, leadsByDay = {}, productCounts = {};
    const companies = new Set();

    for (const l of leads) {
      if (l.type) leadsByType[l.type] = (leadsByType[l.type] || 0) + 1;
      const day = (l.submittedAt || "").slice(0, 10);
      if (day) leadsByDay[day] = (leadsByDay[day] || 0) + 1;
      const prod = l.interestedService || l.product;
      if (prod) productCounts[prod] = (productCounts[prod] || 0) + 1;
      if (l.company) companies.add(l.company.toLowerCase().trim());
    }

    // Build last 30 days daily trend
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const dk = d.toISOString().split("T")[0];
      return {
        date: dk,
        label: d.toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
        visits: parseInt(dailyVisits?.[dk] || 0),
        leads: leadsByDay[dk] || 0,
      };
    });

    // Build last 12 months monthly trend
    const last12 = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const mKey = d.toISOString().slice(0, 7);
      const mVisits = Object.entries(dailyVisits || {})
        .filter(([k]) => k.startsWith(mKey))
        .reduce((s, [, v]) => s + parseInt(v || 0), 0);
      const mLeads = Object.entries(leadsByDay)
        .filter(([k]) => k.startsWith(mKey))
        .reduce((s, [, v]) => s + v, 0);
      return { month: mKey, label: d.toLocaleDateString("en-NG", { month: "short", year: "2-digit" }), visits: mVisits, leads: mLeads };
    });

    // Month-over-month growth
    const curV = last12[11]?.visits || 0, prevV = last12[10]?.visits || 0;
    const curL = last12[11]?.leads  || 0, prevL = last12[10]?.leads  || 0;
    const vGrowth = prevV > 0 ? Math.round(((curV - prevV) / prevV) * 100) : 0;
    const lGrowth = prevL > 0 ? Math.round(((curL - prevL) / prevL) * 100) : 0;

    const todayVisits = parseInt(dailyVisits?.[today] || 0);
    const monthVisits = Object.entries(dailyVisits || {})
      .filter(([k]) => k.startsWith(thisMonth))
      .reduce((s, [, v]) => s + parseInt(v || 0), 0);

    // Top pages (by all-time hits)
    const topPages = Object.entries(pageViews || {})
      .map(([page, count]) => ({ page, count: parseInt(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top products from demo lead interest
    const topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Traffic sources (referrer domains)
    const trafficSources = Object.entries(referrers || {})
      .map(([source, count]) => ({ source, count: parseInt(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Recent combined activity feed (leads + conversations, newest first)
    const recentActivities = [
      ...leads.slice(0, 10).map(l => ({ ...l, _kind: "lead" })),
      ...convs.slice(0, 5).map(c => ({ ...c, _kind: "conversation" })),
    ]
      .sort((a, b) => new Date(b.submittedAt || b.startedAt || 0) - new Date(a.submittedAt || a.startedAt || 0))
      .slice(0, 15);

    return res.json({
      ok: true,
      generatedAt: now.toISOString(),
      stats: {
        visitors: { total: parseInt(totalVisits || 0), today: todayVisits, month: monthVisits, growth: vGrowth },
        leads: {
          total: leads.length,
          demo: leadsByType.demo || 0,
          contact: leadsByType.contact || 0,
          support: leadsByType.support || 0,
          newsletter: leadsByType.newsletter || 0,
          quote: leadsByType.quote || 0,
          new: leads.filter(l => (l.status || "").toLowerCase() === "new").length,
          growth: lGrowth,
        },
        companies: { unique: companies.size },
        conversations: { total: convs.length, escalated: convs.filter(c => c.escalated).length },
      },
      trends: { daily: last30, monthly: last12 },
      topPages,
      topProducts,
      trafficSources,
      leadTypes: leadsByType,
      recentActivities,
      health: {
        upstash: true,
        email: !!(process.env.GMAIL_USER || process.env.RESEND_API_KEY),
        ai: !!process.env.GROQ_API_KEY,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Analytics failed", details: err.message });
  }
}
