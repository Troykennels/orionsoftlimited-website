import { useEffect, useMemo, useState } from "react";
import "./App.css";

const COMPANY_EMAIL = "orionsoftlimited@gmail.com";
const COMPANY_PHONE = "08169577059";
const COMPANY_RC = "9535128";
const FORM_ENDPOINT = import.meta.env.VITE_ORIONSOFT_FORM_ENDPOINT || "";
const BUILT_IN_FORM_ENDPOINT = "/api/forms";

const phoneDigits = COMPANY_PHONE.replace(/^0/, "").replace(/\D/g, "");
const telLink = `tel:+234${phoneDigits}`;
const whatsappLink = `https://wa.me/234${phoneDigits}`;

const assets = {
  hero: "/assets/medical-practitioner-tech.jpg",
  carecore: "/assets/carecore-doctor-workstation.jpeg",
  network: "/assets/carecore-network.jpeg",
  code: "/assets/developer-code-workstation.jpg",
  cloud: "/assets/cloud-infrastructure-team.jpg",
  business: "/assets/business-team-laptop.jpg",
};

const navLinks = [
  ["CareCore", "#carecore"],
  ["Services", "#services"],
  ["Process", "#process"],
  ["Pricing", "#pricing"],
  ["Careers", "#careers"],
  ["Contact", "#contact"],
];

const stats = [
  ["Healthcare-first", "Product thinking shaped around real hospital workflows."],
  ["Fast onboarding", "Lean setup plans for clinics that need momentum, not meetings."],
  ["Nigeria based", "Local support, practical pricing, global engineering habits."],
];

const carecoreModules = [
  "Patient registration",
  "Appointments and queues",
  "Clinical notes",
  "Billing and invoices",
  "Pharmacy flow",
  "Reports and admin controls",
];

const services = [
  {
    title: "Hospital management systems",
    text: "CareCore helps clinics digitize records, reduce paper bottlenecks, and keep daily operations visible from reception to management.",
    image: assets.carecore,
  },
  {
    title: "Custom web applications",
    text: "We design dashboards, portals, booking systems, internal tools, and customer-facing platforms that feel sharp and work reliably.",
    image: assets.code,
  },
  {
    title: "Cloud and automation",
    text: "We connect databases, workflows, notifications, analytics, and deployment pipelines so your team can run with less manual work.",
    image: assets.cloud,
  },
];

const process = [
  ["01", "Discover", "We map the business problem, user journeys, constraints, and the fastest path to a useful first release."],
  ["02", "Design", "We create clean screens, strong content, accessible flows, and responsive layouts before heavy build work begins."],
  ["03", "Build", "We implement with modern React, secure form handling, performance awareness, and practical admin workflows."],
  ["04", "Launch", "We deploy, test on real devices, support onboarding, and keep improving from user feedback."],
];

const pricing = [
  ["CareCore Starter", "For small clinics moving from paper records.", "Demo based quote"],
  ["Business Website", "A professional website with contact flows and strong visual direction.", "From NGN 250K"],
  ["Custom Software", "Dashboards, portals, SaaS products, automations, and integrations.", "Scoped proposal"],
];

const careers = [
  "Health Liaison Officer",
  "Business Development Officer",
  "Digital Marketing Executive",
  "Software Developer",
];

function Icon({ name }) {
  const icons = {
    menu: "M4 7h16M4 12h16M4 17h16",
    close: "M6 6l12 12M18 6L6 18",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    check: "M5 13l4 4L19 7",
    phone: "M7 5c1 6 6 11 12 12l2-4-4-2-2 2c-2-1-4-3-5-5l2-2-2-4-4 3z",
    message: "M4 5h16v11H8l-4 4V5z",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

function getFormEndpoint() {
  if (FORM_ENDPOINT) return FORM_ENDPOINT;
  if (typeof window === "undefined") return "";
  return ["localhost", "127.0.0.1"].includes(window.location.hostname) ? "" : BUILT_IN_FORM_ENDPOINT;
}

function buildMailto(type, data) {
  const rows = Object.entries({ type, ...data, page: window.location.href })
    .filter(([, value]) => `${value || ""}`.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return `mailto:${COMPANY_EMAIL}?subject=${encodeURIComponent(`Orion Soft ${type}`)}&body=${encodeURIComponent(rows)}`;
}

function Logo() {
  return (
    <a href="#home" className="logo" aria-label="Orion Soft home">
      <span className="logo-mark">O</span>
      <span>Orion<span>Soft</span></span>
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <header className={scrolled ? "site-header is-scrolled" : "site-header"}>
      <div className="container nav">
        <Logo />
        <nav className={open ? "nav-links is-open" : "nav-links"} aria-label="Primary navigation">
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} onClick={closeMenu}>{label}</a>
          ))}
          <a className="nav-call" href={telLink}>Call {COMPANY_PHONE}</a>
        </nav>
        <button className="icon-button menu-button" type="button" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Software for hospitals, clinics, and growing businesses</p>
          <h1>Professional digital systems built with clarity, speed, and care.</h1>
          <p className="hero-lede">
            Orion Soft Limited designs dependable web platforms, healthcare systems, and business tools that help teams serve customers faster and manage work with confidence.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#contact">Start a project <Icon name="arrow" /></a>
            <a className="button secondary" href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp us</a>
          </div>
          <div className="hero-trust" aria-label="Company highlights">
            {stats.map(([title, text]) => (
              <div key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-media">
          <img src={assets.hero} alt="Healthcare professional using digital medical software" />
          <div className="hero-panel">
            <span>CareCore HMS</span>
            <strong>Records, queues, billing, and reporting in one calmer workflow.</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function CareCore() {
  return (
    <section id="carecore" className="section light-section">
      <div className="container split">
        <div>
          <p className="eyebrow dark">Flagship product</p>
          <h2>CareCore brings hospital operations into one clean digital workspace.</h2>
          <p className="section-lede">
            Built for practical healthcare environments, CareCore helps clinical and administrative teams reduce repeated entry, find patient information faster, and make better daily decisions.
          </p>
          <div className="module-grid">
            {carecoreModules.map((item) => (
              <span key={item}><Icon name="check" />{item}</span>
            ))}
          </div>
        </div>
        <div className="image-stack">
          <img src={assets.carecore} alt="Doctor workstation showing healthcare technology" />
          <img src={assets.network} alt="Connected healthcare network interface" />
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="section services-section">
      <div className="container">
        <div className="section-heading">
          <p className="eyebrow">What we build</p>
          <h2>Focused engineering for work that needs to look good and run well.</h2>
          <p>Every project is shaped around real user tasks, strong presentation, maintainable code, and a launch plan your team can actually follow.</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <img src={service.image} alt="" loading="lazy" />
              <div>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section id="process" className="section light-section">
      <div className="container">
        <div className="section-heading dark-copy">
          <p className="eyebrow dark">How we work</p>
          <h2>A direct process that keeps decisions visible.</h2>
          <p>Good software is not magic. It is careful thinking, disciplined delivery, and a team that communicates before problems become expensive.</p>
        </div>
        <div className="process-grid">
          {process.map(([num, title, text]) => (
            <article key={title} className="process-card">
              <span>{num}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Proof() {
  return (
    <section className="proof-band">
      <div className="container proof-grid">
        <div>
          <p className="eyebrow">Built for retention</p>
          <h2>Sharp design, useful content, and contact paths that stay close.</h2>
        </div>
        <p>
          The new experience uses real business imagery, compact sections, strong contrast, clear buttons, mobile-first navigation, and practical trust signals so visitors understand what Orion Soft does without digging.
        </p>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="section services-section">
      <div className="container">
        <div className="section-heading">
          <p className="eyebrow">Starting points</p>
          <h2>Clear packages, honest scope, and room to customize.</h2>
          <p>Final pricing depends on features, integrations, timeline, support needs, and content readiness.</p>
        </div>
        <div className="pricing-grid">
          {pricing.map(([title, text, price]) => (
            <article key={title} className="price-card">
              <h3>{title}</h3>
              <p>{text}</p>
              <strong>{price}</strong>
              <a href="#contact">Request details</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Careers() {
  return (
    <section id="careers" className="section light-section careers-section">
      <div className="container careers-layout">
        <div>
          <p className="eyebrow dark">Careers</p>
          <h2>Join a practical software company building useful systems.</h2>
          <p className="section-lede">
            Orion Soft is open to disciplined people in healthcare growth, business development, digital marketing, and software engineering.
          </p>
          <a className="button dark-button" href="#contact">Apply or ask a question</a>
        </div>
        <div className="career-list">
          {careers.map((role) => <span key={role}>{role}</span>)}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    ["Can Orion Soft build outside healthcare?", "Yes. Healthcare is a major focus, but we also build business websites, dashboards, portals, and workflow systems."],
    ["How fast can a project start?", "After discovery, small website projects can usually start quickly. Larger platforms need a short planning phase so scope, timelines, and responsibilities are clear."],
    ["Do you support existing systems?", "Yes. We can review an existing website or app, improve the design, fix broken flows, and modernize the codebase where needed."],
  ];

  return (
    <section className="section faq-section">
      <div className="container faq-layout">
        <div>
          <p className="eyebrow">Questions</p>
          <h2>Useful answers before you reach out.</h2>
        </div>
        <div className="faq-list">
          {items.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    service: "CareCore HMS",
    message: "",
  });

  const formReady = useMemo(() => form.name.trim() && (form.email.trim() || form.phone.trim()) && form.message.trim(), [form]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formReady) {
      setError("Please add your name, a contact detail, and a short message.");
      return;
    }

    const endpoint = getFormEndpoint();
    if (!endpoint) {
      window.location.href = buildMailto("project inquiry", form);
      return;
    }

    try {
      setStatus("sending");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: "project inquiry", ...form, submittedAt: new Date().toISOString() }),
      });

      if (!response.ok) throw new Error("Submission failed");
      setStatus("sent");
      setForm({ name: "", company: "", email: "", phone: "", service: "CareCore HMS", message: "" });
    } catch {
      window.location.href = buildMailto("project inquiry", form);
      setStatus("idle");
    }
  };

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Name<input name="name" value={form.name} onChange={update} autoComplete="name" /></label>
        <label>Company<input name="company" value={form.company} onChange={update} autoComplete="organization" /></label>
        <label>Email<input name="email" value={form.email} onChange={update} autoComplete="email" inputMode="email" /></label>
        <label>Phone<input name="phone" value={form.phone} onChange={update} autoComplete="tel" inputMode="tel" /></label>
      </div>
      <label>
        What do you need?
        <select name="service" value={form.service} onChange={update}>
          <option>CareCore HMS</option>
          <option>Business website</option>
          <option>Custom web application</option>
          <option>Cloud or automation</option>
          <option>Career inquiry</option>
        </select>
      </label>
      <label>
        Message
        <textarea name="message" rows="5" value={form.message} onChange={update} placeholder="Tell us what you want to build, fix, or improve." />
      </label>
      {error && <p className="form-error">{error}</p>}
      {status === "sent" && <p className="form-success">Thank you. Orion Soft has received your message.</p>}
      <button className="button primary" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send inquiry"} <Icon name="arrow" />
      </button>
    </form>
  );
}

function Contact() {
  return (
    <section id="contact" className="section contact-section">
      <div className="container contact-layout">
        <div>
          <p className="eyebrow">Contact</p>
          <h2>Tell us what you want to build next.</h2>
          <p>
            Reach Orion Soft by phone, WhatsApp, email, or the form. We respond with the next practical step, not a vague sales script.
          </p>
          <div className="contact-cards">
            <a href={telLink}><Icon name="phone" />{COMPANY_PHONE}</a>
            <a href={whatsappLink} target="_blank" rel="noreferrer"><Icon name="message" />WhatsApp Orion Soft</a>
            <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
          </div>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>Orion Soft Limited builds practical, polished software for healthcare providers and ambitious businesses.</p>
        </div>
        <div>
          <strong>Company</strong>
          <a href="#carecore">CareCore HMS</a>
          <a href="#services">Services</a>
          <a href="#careers">Careers</a>
        </div>
        <div>
          <strong>Contact</strong>
          <a href={telLink}>{COMPANY_PHONE}</a>
          <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
          <a href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>Copyright 2026 Orion Soft Limited. RC: {COMPANY_RC}</span>
        <span>Lagos, Nigeria</span>
      </div>
    </footer>
  );
}

function FloatingActions() {
  return (
    <div className="floating-actions" aria-label="Quick contact actions">
      <a href={telLink} aria-label={`Call Orion Soft on ${COMPANY_PHONE}`}><Icon name="phone" /></a>
      <a href={whatsappLink} target="_blank" rel="noreferrer" aria-label="Message Orion Soft on WhatsApp"><Icon name="message" /></a>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#home">Skip to main content</a>
      <Header />
      <main>
        <Hero />
        <CareCore />
        <Services />
        <Process />
        <Proof />
        <Pricing />
        <Careers />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <FloatingActions />
    </>
  );
}
