// After `vite build`: give every public page its own HTML file with its own
// title, description, canonical address, social preview, structured data and
// readable content. The site is a single-page app, so without this every URL
// served the homepage's tags: Google treated pages as duplicates and
// LinkedIn/WhatsApp/AI assistants (which don't run JavaScript) only ever saw
// the homepage. React replaces the fallback content as soon as it loads.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SITE = "https://www.orionsoftlimited.com";
const dist = new URL("../dist/", import.meta.url);
let base = readFileSync(new URL("index.html", dist), "utf8");
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ORG = { "@id": `${SITE}/#organization` };

// The social profiles saved in Site Settings become the organisation's
// "sameAs", which tells Google and AI assistants which LinkedIn, Facebook,
// Instagram… pages are ours (and helps the knowledge panel).
try {
  const r = await fetch(`${SITE}/api/content?only=orionsoft_settings_v1`, { signal: AbortSignal.timeout(10000) });
  const st = (await r.json()).content?.orionsoft_settings_v1 || {};
  const same = ["linkedin", "facebook", "instagram", "twitter", "tiktok", "youtube", "github"].map(k => String(st[k] || "").trim()).filter(u => /^https:\/\/[^\s"<>]+$/.test(u));
  const anchor = `"@id": "${SITE}/#organization",`;
  if (same.length && base.includes(anchor)) base = base.replace(anchor, `${anchor} "sameAs": ${JSON.stringify(same)},`);
  console.log(`prerender-seo: ${same.length} social profiles in sameAs`);
} catch (e) { console.log("prerender-seo: settings skipped:", e.message); }

const PRODUCTS = {
  carecore: { name: "CareCore", h1: "CareCore: Hospital Management System for Nigeria", title: "CareCore Hospital Management Software (HMS) in Nigeria", desc: "CareCore is a complete hospital management system for Nigerian hospitals, clinics, pharmacies and labs: EHR, OPD, wards, pharmacy, lab, billing, NHIS/HMO claims and analytics. 25+ modules, live in Nigerian hospitals.", category: "HealthApplication",
    points: ["Electronic health records and outpatient (OPD) clinics", "Inpatient admissions, wards and bed management", "Pharmacy with stock and drug interaction checks", "Laboratory (LIS) and radiology", "Billing, NHIS and HMO claims, and payments", "Appointments, staff management and executive analytics"] },
  schoolcore: { name: "SchoolCore", h1: "SchoolCore: School Management Software", title: "SchoolCore School Management Software in Nigeria", desc: "School management software for Nigerian schools: admissions, attendance, results in WAEC/NECO formats, fees, timetables, CBT exams, library, staff payroll and a parent portal.", category: "EducationalApplication",
    points: ["Admissions and student records", "Attendance and timetables", "Results and report cards in WAEC/NECO formats", "School fees, invoices and payments", "CBT examinations and library", "Parent portal, SMS and email"] },
  compliancecore: { name: "ComplianceCore", h1: "ComplianceCore: Compliance & Risk Management", title: "ComplianceCore Compliance & Risk Management Software Nigeria", desc: "Compliance and risk software for Nigerian banks, health and public organisations: policies, risk register, audits, regulatory calendar (CBN, NDPA, CAC, NAFDAC), incidents and training records.", category: "BusinessApplication",
    points: ["Policy management and attestations", "Risk register and controls", "Internal audits and findings", "Regulatory calendar: CBN, NDPA/NDPR, CAC, NAFDAC", "Incident reporting and document control", "Training records and compliance dashboard"] },
  inventorycore: { name: "InventoryCore", h1: "InventoryCore: Inventory & Supply Chain Software", title: "InventoryCore Inventory Management Software Nigeria", desc: "Inventory and supply chain software for Nigerian businesses: multi-warehouse stock, purchase orders, reorder alerts, suppliers, barcode/QR scanning, batch and expiry tracking.", category: "BusinessApplication",
    points: ["Multi-warehouse, real-time stock", "Purchase orders and supplier management", "Reorder alerts", "Barcode and QR scanning", "Batch, serial and expiry tracking", "Stock reports and valuation"] },
  financecore: { name: "FinanceCore", h1: "FinanceCore: Accounting & Payroll Software for Nigeria", title: "FinanceCore Accounting & Payroll Software Nigeria (PAYE, VAT)", desc: "Accounting software built for Nigeria: invoicing, receivables and payables, bank reconciliation, payroll with PAYE, pension and NHF, VAT and WHT, financial statements and budgets.", category: "FinanceApplication",
    points: ["Invoicing, receivables and payables", "Bank reconciliation", "Payroll with PAYE, pension (PFA) and NHF", "VAT and WHT", "Financial statements", "Budgets and forecasts"] },
  hrcore: { name: "HRCore", h1: "HRCore: HR Software for Nigerian Organisations", title: "HRCore HR & People Management Software Nigeria", desc: "HR software for Nigerian organisations: employee records, recruitment, onboarding, leave, attendance, payroll integration, performance reviews and training.", category: "BusinessApplication",
    points: ["Employee records and org chart", "Recruitment and onboarding", "Leave and attendance", "Payroll integration", "Performance reviews", "Training records"] },
  churchcore: { name: "ChurchCore", h1: "ChurchCore: Church Management Software", title: "ChurchCore Church Management Software in Nigeria", desc: "Church management software built for Nigerian church culture: members, attendance, cell groups and units, tithes and giving, events, SMS/email, volunteers and leadership reports.", category: "BusinessApplication",
    points: ["Member database", "Attendance tracking", "Zones, units and cell groups", "Tithes, offerings and giving", "Events, SMS and email", "Volunteers and leadership reports"] },
  fleetcore: { name: "FleetCore", h1: "FleetCore: Fleet Management Software", title: "FleetCore Fleet Management Software Nigeria", desc: "Fleet management software for Nigerian logistics, schools, hospitals and government fleets: vehicles, drivers, trips, maintenance, fuel, documents and GPS.", category: "BusinessApplication",
    points: ["Vehicle registry and documents", "Driver management and behaviour", "Trips and dispatch", "Maintenance scheduling", "Fuel tracking", "GPS integration and reports"] },
  telehealth: { name: "TeleHealth", h1: "TeleHealth: Telemedicine Platform (coming soon)", title: "TeleHealth Telemedicine Platform for Nigeria", desc: "Orion Soft TeleHealth (coming soon): video consultations, digital prescriptions, scheduling, remote monitoring and specialist referrals, integrated with CareCore.", category: "HealthApplication",
    points: ["Video consultations", "Digital prescriptions", "Patient scheduling", "Remote monitoring", "Specialist referrals", "CareCore integration"] },
};

const PAGES = {
  "/products": ["Software Products for Nigerian Hospitals, Schools & Businesses", "Orion Soft's products: CareCore hospital management, SchoolCore, FinanceCore accounting and payroll, HRCore, InventoryCore, ComplianceCore, ChurchCore and FleetCore. Built in Nigeria for African organisations.", "Our software products"],
  "/industries": ["Industries We Serve | Healthcare, Education, Finance & More", "Software for healthcare, education, financial services, government and NGOs, faith organisations, manufacturing, retail and logistics in Nigeria and Africa.", "Industries we serve"],
  "/solutions": ["Business Solutions | Go Paperless, Automate & Report", "Go paperless, automate processes, get real-time reports, stay compliant and integrate your systems with Orion Soft.", "Solutions"],
  "/pricing": ["Pricing | Orion Soft Software Plans in Naira", "Clear, Naira pricing for Orion Soft software, from monthly plans for small clinics and schools to enterprise licences. Book a demo for a tailored quote.", "Pricing"],
  "/about": ["About Orion Soft Limited | Nigerian Software Company", "Orion Soft Limited (RC 9535128) is a Lagos-based software company building production software for African hospitals, schools and businesses.", "About Orion Soft"],
  "/why": ["Why Choose Orion Soft", "Built for Nigeria, local support, fast implementation, secure and NDPA-compliant software. See why organisations choose Orion Soft.", "Why Orion Soft"],
  "/process": ["How We Work | Discovery to Go-Live", "Our process: discovery, scoping, build, data migration, training, go-live and ongoing support, with milestones you sign off.", "How we work"],
  "/work": ["Our Work | Software & Websites We've Built", "Software, websites and apps built by Orion Soft for organisations across Nigeria.", "Our work"],
  "/case-studies": ["Case Studies | Orion Soft Results", "How hospitals, schools and businesses in Nigeria use Orion Soft software to go paperless, get paid faster and report in real time.", "Case studies"],
  "/clients": ["Our Clients | Orion Soft", "Organisations that trust Orion Soft software.", "Our clients"],
  "/testimonials": ["Client Testimonials | Orion Soft", "What our clients say about Orion Soft software and support.", "Testimonials"],
  "/success-stories": ["Success Stories | Orion Soft", "Results our clients achieved with Orion Soft.", "Success stories"],
  "/security": ["Security & Data Protection | NDPA Compliant", "How Orion Soft protects your data: encryption, access control, backups and Nigeria Data Protection Act (NDPA) compliance.", "Security"],
  "/support": ["Support Centre | Orion Soft", "Get help with Orion Soft products: guides, contact options and support hours.", "Support centre"],
  "/partners": ["Partner with Orion Soft", "Resellers, implementation partners and integrators: partner with Orion Soft across Nigeria and Africa.", "Partners"],
  "/tech": ["Our Technology | Orion Soft", "The technology behind Orion Soft products: secure cloud, web and mobile.", "Technology"],
  "/team": ["Our Team | Orion Soft", "Meet the team building Orion Soft.", "Our team"],
  "/people": ["Our People | Orion Soft", "Meet the people at Orion Soft.", "Our people"],
  "/careers": ["Careers at Orion Soft | Software Jobs in Lagos", "Join Orion Soft: software, sales and support roles in Lagos, Nigeria. See open positions and apply online.", "Careers"],
  "/blog": ["Blog | Healthcare IT, Business Software & Tech in Nigeria", "Insights on hospital management, school software, accounting, compliance and digital transformation in Nigeria.", "Blog"],
  "/events": ["Events | Orion Soft", "Webinars, demos and events from Orion Soft.", "Events"],
  "/faq": ["FAQ | Orion Soft Software", "Answers to common questions about Orion Soft software, pricing, implementation, data and support.", "Frequently asked questions"],
  "/docs": ["Documentation | Orion Soft", "Product documentation and guides.", "Documentation"],
  "/contact": ["Contact Orion Soft | Lagos Island, Lagos · 0816 957 7059", "Contact Orion Soft Limited: call or WhatsApp 0816 957 7059, email orionsoftlimited@gmail.com, or visit us on Lagos Island, Lagos. Book a free demo.", "Contact us"],
  "/consultation": ["Book a Free Demo or Consultation | Orion Soft", "Book a free demo of CareCore, SchoolCore, FinanceCore and more, or a consultation for custom software, websites and apps.", "Book a free demo"],
  "/privacy": ["Privacy Policy | Orion Soft", "How Orion Soft Limited collects, uses and protects personal data.", "Privacy policy"],
  "/terms": ["Terms of Service | Orion Soft", "Terms of service for Orion Soft Limited websites and software.", "Terms of service"],
};

const LINKS = [["/", "Home"], ["/products", "Products"], ["/carecore", "CareCore HMS"], ["/pricing", "Pricing"], ["/case-studies", "Case studies"], ["/about", "About"], ["/blog", "Blog"], ["/careers", "Careers"], ["/contact", "Contact"], ["/consultation", "Book a demo"]];

function page(path, { title, desc, h1, body = [], points = [], jsonLd = [], image }) {
  const url = `${SITE}${path === "/" ? "/" : path}`;
  const fullTitle = /orion soft/i.test(title) ? title : `${title} | Orion Soft`;
  let html = base
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(fullTitle)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(desc)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(fullTitle)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(desc)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(fullTitle)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(desc)}" />`);
  if (image) html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(image)}" />`);
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` }, ...(path === "/" ? [] : [{ "@type": "ListItem", position: 2, name: h1, item: url }])] };
  const ld = [crumbs, ...jsonLd].map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n    ");
  html = html.replace("</head>", `    ${ld}\n  </head>`);
  // Readable content for crawlers and link previews; React replaces it on load.
  const content = `<div id="root"><main style="max-width:880px;margin:0 auto;padding:110px 20px 60px;font-family:system-ui,sans-serif;color:#C8D0E0;background:#060810;line-height:1.6">
<h1 style="color:#F2F6FF">${esc(h1)}</h1><p>${esc(desc)}</p>
${body.map(b => `<p>${esc(b)}</p>`).join("")}
${points.length ? `<ul>${points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
<p>Orion Soft Limited · Lagos Island, Lagos, Nigeria · <a href="tel:+2348169577059" style="color:#C8A850">0816 957 7059</a> · <a href="mailto:orionsoftlimited@gmail.com" style="color:#C8A850">orionsoftlimited@gmail.com</a> · <a href="https://wa.me/2348169577059" style="color:#C8A850">WhatsApp</a></p>
<nav>${LINKS.map(([h, l]) => `<a href="${h}" style="color:#C8A850;margin-right:12px">${esc(l)}</a>`).join("")}</nav>
</main></div>`;
  html = html.replace(/<div id="root"><\/div>/, content);
  const out = path === "/" ? new URL("index.html", dist) : new URL(`${path.slice(1)}/index.html`, dist);
  if (path !== "/") mkdirSync(new URL(`${path.slice(1)}/`, dist), { recursive: true });
  writeFileSync(out, html);
}

let count = 0;
// Homepage: keep its tags, add readable content.
page("/", {
  title: "Orion Soft Limited: Hospital Management System & Custom Software Nigeria", h1: "Orion Soft Limited: software for African hospitals, schools and businesses",
  desc: "Orion Soft Limited builds production-grade software for Nigerian hospitals and businesses. CareCore HMS is live in hospitals with 25+ modules. School, accounting, HR, inventory, compliance, church and fleet software, plus custom websites and apps.",
  points: Object.values(PRODUCTS).map(p => `${p.name}: ${p.desc.split(":")[0]}`),
}); count++;
for (const [path, [title, desc, h1]] of Object.entries(PAGES)) { page(path, { title, desc, h1 }); count++; }
for (const [id, p] of Object.entries(PRODUCTS)) {
  page(`/${id}`, {
    title: p.title, desc: p.desc, h1: p.h1, points: p.points,
    jsonLd: [{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: `${p.name} by Orion Soft`, applicationCategory: p.category, operatingSystem: "Web, Android, iOS", url: `${SITE}/${id}`, description: p.desc, featureList: p.points.join(", "), publisher: ORG, provider: ORG, areaServed: "NG", offers: { "@type": "Offer", priceCurrency: "NGN", availability: id === "telehealth" ? "https://schema.org/PreOrder" : "https://schema.org/InStock", url: `${SITE}/consultation` } }],
  }); count++;
}

// Blog posts and FAQs from the live site's content (skipped if unreachable).
try {
  const r = await fetch(`${SITE}/api/content?only=orionsoft_blog_v1,orionsoft_faqs_v1`, { signal: AbortSignal.timeout(10000) });
  const content = (await r.json()).content || {};
  for (const post of (content.orionsoft_blog_v1 || []).filter(x => x && x.title && x.published !== false && (x.slug || x.id))) {
    const slug = String(post.slug || post.id);
    if (!/^[a-z0-9-_]+$/i.test(slug)) continue;
    const plain = String(post.content || "").replace(/<[^>]+>/g, " ").replace(/[#*_>`-]+/g, " ").replace(/\s+/g, " ").trim();
    const desc = String(post.excerpt || plain).slice(0, 160);
    page(`/blog/${slug}`, {
      title: post.title, desc, h1: post.title, body: plain ? [plain.slice(0, 2500)] : [], image: /^https:\/\//.test(post.coverImage || "") ? post.coverImage : undefined,
      jsonLd: [{ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: desc, datePublished: post.date || post.createdAt, dateModified: post.updatedAt || post.date, author: { "@type": "Organization", name: post.author || "Orion Soft" }, publisher: ORG, mainEntityOfPage: `${SITE}/blog/${slug}`, ...(post.coverImage ? { image: post.coverImage } : {}) }],
    }); count++;
  }
  const faqs = (content.orionsoft_faqs_v1 || []).filter(f => f && (f.q || f.question) && (f.a || f.answer));
  if (faqs.length) {
    page("/faq", {
      title: PAGES["/faq"][0], desc: PAGES["/faq"][1], h1: PAGES["/faq"][2],
      body: faqs.slice(0, 30).map(f => `${f.q || f.question} ${f.a || f.answer}`),
      jsonLd: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.slice(0, 30).map(f => ({ "@type": "Question", name: f.q || f.question, acceptedAnswer: { "@type": "Answer", text: String(f.a || f.answer).replace(/<[^>]+>/g, "") } })) }],
    });
  }
} catch (e) { console.log("prerender-seo: live content skipped:", e.message); }

console.log(`prerender-seo: ${count} pages written`);
