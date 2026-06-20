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

const SYSTEM_PROMPT = `You are Ori, the intelligent AI sales assistant for Orion Soft Limited — a Nigerian software company that builds production-grade business management software, custom websites, and web/mobile applications.

PERSONALITY: Professional, warm, concise, helpful. Represent Orion Soft's values of quality and honesty. Never be pushy. Speak naturally.

COMPANY:
- Name: Orion Soft Limited
- Location: Nigeria
- CAC RC: 9535128
- Email: orionsoftlimited@gmail.com
- Phone: 08169577059
- NDPR Compliant
- Services: Software products, custom website development, web applications, mobile apps, digital transformation

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

CUSTOM DEVELOPMENT SERVICES (in addition to products):
Orion Soft DOES build websites, web apps, and mobile apps. Always confirm this clearly when asked.

1. Website Development
   - Business websites, corporate sites, landing pages, e-commerce
   - Modern, mobile-responsive, SEO-optimised
   - Suitable for: Any business, startup, NGO, church, school, hospital

2. Web Application Development
   - Custom web apps, dashboards, portals, admin systems
   - Built to client's specific workflow and business logic

3. Mobile App Development
   - iOS and Android apps
   - Cross-platform or native

4. Digital Transformation & IT Consulting
   - Process automation, system integration, cloud migration
   - IT strategy for growing Nigerian businesses

5. Software Customisation
   - Tailoring any of our core products (CareCore, SchoolCore, etc.) to specific requirements
   - API integrations, bespoke modules, white-labelling

PRICING:
- All products are priced based on organisation size and modules selected
- Custom development is quoted per project scope
- Contact-based pricing (no public price list)
- If asked about price, say: "Our pricing is tailored to your specific needs — I'd rather give you an accurate quote than a rough number. Can I get your contact so our team can reach out?"

RESPONSE RULES:
- Keep responses SHORT: 2-3 sentences max for factual answers, up to 5 for explanations
- NEVER say "I don't know" — say "Let me get you connected with our team for that"
- NEVER say "we don't build websites" — Orion Soft DOES build websites and web applications. Always confirm this positively.
- If someone asks "do you build websites?" or "can you make a website for me?" → YES. Say: "Yes, we build professional business websites — responsive, fast, and SEO-ready. Would you like to tell me more about what you need so I can get our team in touch?"
- Detect Nigerian context: pidgin, local references, Nigerian city/state names — be culturally aware
- When recommending products, be specific about WHY this product fits their business
- Always offer to book a demo or connect with the team
- If asked about competitors, acknowledge professionally: "I can't speak to how other systems work, but here's what makes [product] different..."
- For technical deep dives, offer to connect them with the technical team
- For booking confirmations or follow-up questions: acknowledge warmly, confirm that the team will be in touch, and offer to collect their contact if not already done

ACTION SYSTEM — ALWAYS append exactly ONE token at the end of your response (invisible to user):
- [ACTION:PRODUCT:carecore] — when you have identified the right product. Replace "carecore" with the product id: carecore, schoolcore, compliancecore, inventorycore, financecore, hrcore, churchcore, fleetcore, or telehealth.
- [ACTION:BOOK_DEMO] — when user explicitly asks for a demo/trial AND no specific product is identified yet
- [ACTION:COLLECT_LEAD] — when user is interested but not ready for demo, or wants to be contacted
- [ACTION:ESCALATE] — when user asks to speak to a human, or has a complex technical question

PRODUCT ACTION RULES (most important):
- ANY time you mention, recommend, or focus on a specific product → append [ACTION:PRODUCT:productid]
- Example: If discussing CareCore → end with [ACTION:PRODUCT:carecore]
- If the user asks about CareCore specifically → [ACTION:PRODUCT:carecore]
- If recommending CareCore + also offering a demo → still use [ACTION:PRODUCT:carecore], NOT [ACTION:BOOK_DEMO]
- Only use [ACTION:BOOK_DEMO] if the user asks for a demo but you haven't pinpointed which product yet
- Do not explain the tokens. They will be stripped before showing to the user.

CONVERSATION GOAL: Understand the user's business, identify the exact Orion Soft product that fits, and either show them the product page or book a demo.`;

// Rule-based fallback when no API key
function ruleBasedResponse(messages) {
  const last = (messages.filter(m => m.role === "user").pop()?.content || "").toLowerCase();

  if (/hospital|clinic|health centre|pharmacy|lab|ward|doctor|patient|medical/.test(last))
    return { text: "Based on what you've described, CareCore — our Hospital Management System — would be an excellent fit. It covers everything from patient registration and clinical workflows to pharmacy, lab, billing, and real-time analytics. Would you like to see a live demo?", action: "PRODUCT", product: "carecore" };

  if (/school|student|pupil|teacher|class|academic|waec|neco|university|polytechnic/.test(last))
    return { text: "SchoolCore is built for exactly that — admissions, attendance, results, fee management, timetables, and a parent portal, all in one system. Want me to arrange a demo?", action: "PRODUCT", product: "schoolcore" };

  if (/church|ministry|pastor|member|tithe|offering|cell group|prayer/.test(last))
    return { text: "ChurchCore is designed specifically for Nigerian ministries — member management, cell groups, tithes and offerings, events, and SMS communication. Would you like to see how it works?", action: "PRODUCT", product: "churchcore" };

  if (/fleet|vehicle|truck|driver|logistics|transport|delivery/.test(last))
    return { text: "FleetCore would work well for you — vehicle registry, driver management, fuel tracking, maintenance scheduling, and route management. Shall I book you a demo?", action: "PRODUCT", product: "fleetcore" };

  if (/inventory|stock|warehouse|supply|purchase order|supplier/.test(last))
    return { text: "InventoryCore gives you real-time stock visibility across multiple locations, automated reorder alerts, batch tracking, and supplier management. Want to see it in action?", action: "PRODUCT", product: "inventorycore" };

  if (/\bhr\b|human resource|staff.*manage|employee|leave.*manage|recruitment|onboard/.test(last))
    return { text: "HRCore manages your full employee lifecycle — records, recruitment, onboarding, leave, attendance, performance reviews, and payroll integration. Want a demo?", action: "PRODUCT", product: "hrcore" };

  if (/finance|accounting|invoice|account|tax|paye|vat|budget/.test(last))
    return { text: "FinanceCore is built for Nigerian businesses — invoicing, payroll, PAYE, VAT/WHT, bank reconciliation, and financial statements. Shall I connect you with the team?", action: "PRODUCT", product: "financecore" };

  if (/compliance|risk|audit|regulatory|policy|ndpr|cbn|nafdac/.test(last))
    return { text: "ComplianceCore keeps you audit-ready with policy management, risk registers, regulatory tracking for Nigerian requirements (CAC, NDPR, CBN, NAFDAC), and a full audit trail.", action: "PRODUCT", product: "compliancecore" };

  if (/price|cost|how much|fee|subscription|payment|afford/.test(last))
    return { text: "Our pricing is tailored to your organisation — size, modules, and deployment type all factor in. I'd rather give you an accurate quote than a number that doesn't fit. Can I get your contact details so our team can reach out?", action: "COLLECT_LEAD" };

  if (/demo|trial|show me|see it|presentation|pilot/.test(last))
    return { text: "I'd love to arrange a free demo for you! It usually takes 30–45 minutes and is tailored to your specific use case. Shall we book one?", action: "BOOK_DEMO" };

  if (/human|person|agent|support|speak to|talk to|contact/.test(last))
    return { text: "Absolutely — I'll connect you with a member of our team. They'll be in touch within a few hours during business hours (Mon–Fri, 8am–6pm WAT).", action: "ESCALATE" };

  if (/website|web site|web app|web application|mobile app|build.*app|app.*build|e-commerce|ecommerce|landing page|digital/.test(last))
    return { text: "Yes, we build professional business websites, web applications, and mobile apps — responsive, fast, and tailored to your brand. Whether you need a simple business site or a full web platform, our team can deliver it. Shall I get someone to reach out to you?", action: "COLLECT_LEAD" };

  if (/product|software|what do you offer|what can you do|services/.test(last))
    return { text: "Orion Soft builds software products (CareCore, SchoolCore, ChurchCore, FleetCore, InventoryCore, FinanceCore, HRCore, ComplianceCore) AND offers custom website development, web/mobile app development, and digital transformation services. What does your business need?" };

  return { text: "Hi! I'm Ori, Orion Soft's AI assistant. I can help you find the right software for your business, explain our products, arrange a demo, or discuss a custom website or app. What brings you here today?" };
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

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const fallback = ruleBasedResponse(trimmedMessages);
    return res.json(fallback);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 400,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmedMessages],
      }),
    });

    if (!response.ok) {
      const fallback = ruleBasedResponse(trimmedMessages);
      return res.json(fallback);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

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
