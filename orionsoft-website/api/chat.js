// Rate limiting — in-memory per cold start
const rateMap = new Map();
const RATE_LIMIT = 30; // requests per minute per IP
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  rateMap.set(ip, entry);
  return true;
}

const SYSTEM_PROMPT = `You are Ori, the intelligent AI sales assistant for Orion Soft Limited — a Nigerian software company that builds production-grade business management software.

PERSONALITY: Professional, warm, concise, helpful. Represent Orion Soft's values of quality and honesty. Never be pushy. Speak naturally.

COMPANY:
- Name: Orion Soft Limited
- Location: Nigeria
- CAC RC: 9535128
- Email: orionsoftlimited@gmail.com
- Phone: 08169577059
- NDPR Compliant

PRODUCTS (know each one deeply):

1. CareCore — Hospital Management System
   - Color theme: Blue
   - Target: Hospitals, clinics, health centres, pharmacies, diagnostic labs
   - Key modules: Electronic Health Records (EHR), OPD (Outpatient), IPD & Ward Management, Pharmacy, Laboratory (LIS), Billing & Finance, Appointments, Staff Management, Radiology (PACS), Executive Analytics
   - 25+ modules. Production-ready. Deployed in Nigerian hospitals.
   - USP: Built specifically for Nigerian healthcare — NHIS, LHIS, local drug databases

2. SchoolCore — School Management System
   - Target: Primary/secondary schools, universities, vocational centres
   - Key modules: Admissions, Attendance, Academic Records & Results, Fee Management, Timetable Builder, CBT Examination, Library, Staff & Payroll, Parent Portal, Communication
   - USP: WAEC/NECO result format, Nigerian school fee structures

3. ComplianceCore — Compliance & Risk Management
   - Target: Financial institutions, healthcare orgs, manufacturing, government agencies, NGOs
   - Key modules: Policy Management, Risk Register, Audit Management, Regulatory Calendar (CAC, NDPR, CBN, NAFDAC), Document Control, Incident Reporting, Training Records, Compliance Dashboard
   - USP: Built around Nigerian regulatory requirements

4. InventoryCore — Inventory & Supply Chain
   - Target: Retail, warehouses, hospitals, schools, manufacturing
   - Key modules: Multi-warehouse Management, Purchase Orders, Real-time Stock Tracking, Reorder Alerts, Supplier Management, Barcode/QR Scanning, Batch & Serial Tracking, Expiry Management
   - USP: Expiry management for healthcare/food, multi-location Nigerian businesses

5. FinanceCore — Finance & Accounting
   - Target: SMEs, NGOs, schools, healthcare, professional services
   - Key modules: Chart of Accounts, Invoicing, Accounts Payable/Receivable, Bank Reconciliation, Payroll, Tax Management (PAYE, VAT, WHT), Financial Statements, Budget & Forecast
   - USP: Built for Nigeria — PAYE, pension (PFA), NHF, FIRS compliance

6. HRCore — Human Resources Management
   - Target: Any organisation with staff
   - Key modules: Employee Records, Recruitment, Onboarding, Leave Management, Time & Attendance, Payroll Integration with FinanceCore, Performance Reviews, Training, Org Chart

7. ChurchCore — Church Management System
   - Target: Churches, ministries, prayer houses, faith-based organisations
   - Key modules: Member Database, Attendance Tracking, Cell Groups & Units, Giving & Tithes, Events Management, Communication (SMS/email), Volunteer Management, Prayer Requests, Leadership Reports
   - USP: Built for Nigerian church culture — zones, units, cell groups

8. FleetCore — Fleet Management
   - Target: Logistics companies, school buses, hospital transport, government fleets
   - Key modules: Vehicle Registry, Driver Management, Trip Management, Maintenance Scheduling, Fuel Tracking, Insurance & Documents, GPS Integration, Driver Behaviour, Fleet Reports

9. TeleHealth — Telemedicine Platform (Coming 2026)
   - Target: Hospitals, practitioners, patients
   - Features: Video Consultations, Digital Prescriptions, Patient Scheduling, CareCore Integration, Remote Monitoring, Specialist Referrals
   - Status: In development

PRICING:
- All products are priced based on organisation size and modules selected
- Contact-based pricing (no public price list)
- Typical range for a mid-sized hospital: contact for exact quote
- If asked about price, say: "Our pricing is tailored to your organisation — a 20-bed clinic and a 300-bed hospital have different needs. I can connect you with our team for an accurate quote, or you can book a free demo first."

RESPONSE RULES:
- Keep responses SHORT: 2-3 sentences max for factual answers, up to 5 for explanations
- NEVER say "I don't know" — say "Let me get you connected with our team for that"
- Detect Nigerian context: pidgin, local references, Nigerian city/state names — be culturally aware
- When recommending products, be specific about WHY this product fits their business
- Always offer to book a demo or connect with the team
- If asked about competitors, acknowledge professionally: "I can't speak to how other systems work, but here's what makes [product] different..."
- For technical deep dives, offer to connect them with the technical team

ACTION SYSTEM — at the end of your response, you may append ONE of these tokens (invisible to user):
- [ACTION:BOOK_DEMO] — when user wants a demo or trial
- [ACTION:COLLECT_LEAD] — when user is interested but not ready for demo
- [ACTION:ESCALATE] — when user explicitly asks for a human / complex technical question
- [ACTION:PRODUCT:carecore] — when recommending CareCore (replace with product id)
Do not explain the tokens. They will be stripped before showing to the user.

CONVERSATION GOAL: Understand the user's business, recommend the right product, and either book a demo or collect contact info.`;

// Rule-based fallback when no API key
function ruleBasedResponse(messages) {
  const last = (messages.filter(m => m.role === "user").pop()?.content || "").toLowerCase();

  if (/hospital|clinic|health centre|pharmacy|lab|ward|doctor|patient|medical/.test(last))
    return { text: "Based on what you've described, CareCore — our Hospital Management System — would be an excellent fit. It covers everything from patient registration and clinical workflows to pharmacy, lab, billing, and real-time analytics. Would you like to see a live demo?", action: "BOOK_DEMO" };

  if (/school|student|pupil|teacher|class|academic|waec|neco|university|polytechnic/.test(last))
    return { text: "SchoolCore is built for exactly that — admissions, attendance, results, fee management, timetables, and a parent portal, all in one system. Want me to arrange a demo?", action: "BOOK_DEMO" };

  if (/church|ministry|pastor|member|tithe|offering|cell group|prayer/.test(last))
    return { text: "ChurchCore is designed specifically for Nigerian ministries — member management, cell groups, tithes and offerings, events, and SMS communication. Would you like to see how it works?", action: "BOOK_DEMO" };

  if (/fleet|vehicle|truck|driver|logistics|transport|delivery/.test(last))
    return { text: "FleetCore would work well for you — vehicle registry, driver management, fuel tracking, maintenance scheduling, and route management. Shall I book you a demo?", action: "BOOK_DEMO" };

  if (/inventory|stock|warehouse|supply|purchase order|supplier/.test(last))
    return { text: "InventoryCore gives you real-time stock visibility across multiple locations, automated reorder alerts, batch tracking, and supplier management. Want to see it in action?", action: "BOOK_DEMO" };

  if (/hr|human resource|staff|employee|payroll|leave|recruitment|onboard/.test(last))
    return { text: "HRCore manages your full employee lifecycle — records, recruitment, onboarding, leave, attendance, performance reviews, and payroll integration. Want a demo?", action: "BOOK_DEMO" };

  if (/finance|accounting|invoice|account|tax|paye|vat|budget|payroll/.test(last))
    return { text: "FinanceCore is built for Nigerian businesses — invoicing, payroll, PAYE, VAT/WHT, bank reconciliation, and financial statements. Shall I connect you with the team?", action: "COLLECT_LEAD" };

  if (/compliance|risk|audit|regulatory|policy|ndpr|cbn|nafdac/.test(last))
    return { text: "ComplianceCore keeps you audit-ready with policy management, risk registers, regulatory tracking for Nigerian requirements (CAC, NDPR, CBN, NAFDAC), and a full audit trail.", action: "COLLECT_LEAD" };

  if (/price|cost|how much|fee|subscription|payment|afford/.test(last))
    return { text: "Our pricing is tailored to your organisation — size, modules, and deployment type all factor in. I'd rather give you an accurate quote than a number that doesn't fit. Can I get your contact details so our team can reach out?", action: "COLLECT_LEAD" };

  if (/demo|trial|show me|see it|presentation|pilot/.test(last))
    return { text: "I'd love to arrange a free demo for you! It usually takes 30–45 minutes and is tailored to your specific use case. Shall we book one?", action: "BOOK_DEMO" };

  if (/human|person|agent|support|speak to|talk to|contact/.test(last))
    return { text: "Absolutely — I'll connect you with a member of our team. They'll be in touch within a few hours during business hours (Mon–Fri, 8am–6pm WAT).", action: "ESCALATE" };

  if (/product|software|what do you offer|what can you do|services/.test(last))
    return { text: "Orion Soft builds 8 software products: CareCore (hospitals), SchoolCore (schools), ChurchCore (churches), FleetCore (logistics), InventoryCore (stock management), FinanceCore (accounting), HRCore (HR), and ComplianceCore (compliance & risk). Which type of business are you managing?" };

  return { text: "Hi! I'm Ori, Orion Soft's AI assistant. I can help you find the right software for your business, explain our products, or book a free demo. What kind of organisation are you running?" };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) return res.status(429).json({ error: "Too many requests", text: "I'm getting a lot of messages right now. Please try again in a moment." });

  const { messages = [] } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: "Messages required" });

  // Keep last 20 messages max
  const trimmedMessages = messages.slice(-20).map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: String(m.content || "").slice(0, 1000),
  }));

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const fallback = ruleBasedResponse(trimmedMessages);
    return res.json(fallback);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: trimmedMessages,
      }),
    });

    if (!response.ok) {
      const fallback = ruleBasedResponse(trimmedMessages);
      return res.json(fallback);
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || "";

    // Extract action token
    const actionMatch = raw.match(/\[ACTION:([^\]]+)\]/);
    const action = actionMatch ? actionMatch[1] : null;
    const text = raw.replace(/\[ACTION:[^\]]+\]/g, "").trim();

    // Extract product recommendation
    let product = null;
    const productMatch = action?.match(/^PRODUCT:(.+)$/);
    if (productMatch) product = productMatch[1];

    return res.json({ text, action: productMatch ? "PRODUCT" : action, product });
  } catch (err) {
    const fallback = ruleBasedResponse(trimmedMessages);
    return res.json(fallback);
  }
}
