import { useState, useEffect, useRef } from "react";

const T = {
  bg:          "#060810",
  surface:     "#0B1120",
  card:        "#0F1828",
  border:      "rgba(255,255,255,0.07)",
  heading:     "#F2F6FF",
  text:        "#C8D0E0",
  muted:       "#6B7A96",
  gold:        "#C8A850",
  goldLt:      "#E8C96A",
  goldDim:     "rgba(200,168,80,0.12)",
  blue:        "#4F8EF7",
  blueDim:     "rgba(79,142,247,0.12)",
  mint:        "#10B981",
  mintDim:     "rgba(16,185,129,0.12)",
  purple:      "#8B5CF6",
  amber:       "#F59E0B",
  rose:        "#F43F5E",
  light:       "#F5F7FC",
  lightCard:   "#FFFFFF",
  lightBorder: "#E2E8F0",
  lightText:   "#1A2B3C",
  lightMuted:  "#4A5B6C",
};
const font = "'Instrument Sans','DM Sans',system-ui,sans-serif";
const FORM_ENDPOINT = import.meta.env.VITE_ORIONSOFT_FORM_ENDPOINT || "/api/forms";
const COMPANY_EMAIL = "orionsoftlimited@gmail.com";
const COMPANY_PHONE = "08169577059";

/* ─── Reveal on scroll ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Icon helpers ──────────────────────────────────────────────────────────── */
function IconEar({ color }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12a6 6 0 1 1 12 0c0 3-2.4 4.5-3.6 6-.6.9-1 2.4-1 3H9" />
      <path d="M9 18a3 3 0 0 0 3-3 3 3 0 0 1 3-3" />
    </svg>
  );
}
function IconMonitor({ color }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
function IconArrow({ color }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IconCheck({ color = T.mint, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconCheckCircle({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.mint} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function IconChevron({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconPhone({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.58 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6 6l1.14-1.14a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function IconMail({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconWhatsApp({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

/* ─── Shared style helpers ──────────────────────────────────────────────────── */
const sectionLabel = (color = T.gold) => ({
  display:       "inline-block",
  fontSize:      11,
  fontWeight:    700,
  letterSpacing: "0.12em",
  color,
  textTransform: "uppercase",
  marginBottom:  16,
});
const inputBase = (focused) => ({
  background:   T.surface,
  border:       `1px solid ${focused ? T.blue : T.border}`,
  color:        T.heading,
  borderRadius: 8,
  padding:      "12px 16px",
  fontFamily:   font,
  fontSize:     14,
  width:        "100%",
  outline:      "none",
  boxSizing:    "border-box",
  transition:   "border-color 0.2s",
});
const labelStyle = {
  fontSize:     13,
  fontWeight:   600,
  color:        T.text,
  display:      "block",
  marginBottom: 6,
};

/* ─── Controlled input with focus state ────────────────────────────────────── */
function Field({ label, type = "text", value, onChange, placeholder, required = true, rows }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: T.rose, marginLeft: 3 }}>*</span>}
      </label>
      {rows ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          required={required}
          style={{ ...inputBase(focused), resize: "vertical" }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          style={inputBase(focused)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required = true }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: T.rose, marginLeft: 3 }}>*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        style={{ ...inputBase(focused), appearance: "none", cursor: "pointer" }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <option value="">Select one</option>
        {options.map((o) => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
    </div>
  );
}

/* ─── Divider ───────────────────────────────────────────────────────────────── */
function Divider() {
  return <div style={{ borderTop: `1px solid ${T.border}`, margin: "24px 0" }} />;
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */
export default function ConsultationPage({ setCurrentPage }) {
  /* Form state */
  const [fullName, setFullName]           = useState("");
  const [jobTitle, setJobTitle]           = useState("");
  const [orgName, setOrgName]             = useState("");
  const [orgSize, setOrgSize]             = useState("");
  const [phone, setPhone]                 = useState("");
  const [email, setEmail]                 = useState("");
  const [products, setProducts]           = useState([]);
  const [preferredTime, setPreferredTime] = useState("");
  const [preferredDay, setPreferredDay]   = useState("");
  const [challenge, setChallenge]         = useState("");
  const [hearAbout, setHearAbout]         = useState("");
  const [loading, setLoading]             = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [error, setError]                 = useState("");

  /* FAQ state */
  const [openFaq, setOpenFaq] = useState(null);

  const formRef = useRef(null);

  const productOptions = [
    "CareCore", "SchoolCore", "ComplianceCore", "InventoryCore",
    "FinanceCore", "HRCore", "ChurchCore", "FleetCore", "Not sure yet",
  ];

  const toggleProduct = (p) => {
    setProducts((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:         "consultation",
          fullName,
          jobTitle,
          orgName,
          orgSize,
          phone,
          email,
          products,
          preferredTime,
          preferredDay,
          challenge,
          hearAbout,
        }),
      });
      if (!res.ok) throw new Error("Server error. Please try again.");
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again or contact us directly.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    const el = document.getElementById("consultation-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const faqs = [
    {
      q: "Is this really free?",
      a: "Yes, completely. No credit card, no contract, no obligation. If the conversation doesn't lead anywhere, that's fine. We would rather have an honest 45-minute conversation with 10 organisations and find two great fits than push everyone into a contract.",
    },
    {
      q: "Do I need to prepare anything in advance?",
      a: "No formal brief needed. Come with a general sense of your organisation's size, your current process (paper or existing software), and the problems you're trying to solve. We'll guide the conversation from there.",
    },
    {
      q: "Can I bring colleagues to the call?",
      a: "Yes, and we encourage it. The more people from your organisation on the call (IT staff, department heads, finance managers), the more useful the outcome. We can accommodate up to 5 people on the consultation.",
    },
    {
      q: "What happens after the consultation?",
      a: "Within 24 hours, we'll email you a written summary of what we discussed, a proposed product scope, and a pricing range. There is no follow-up pressure. You take as long as you need to decide, and reach out when you're ready.",
    },
    {
      q: "We are based outside Lagos. Can we still have a consultation?",
      a: "Yes. Most consultations happen on Google Meet. If you're in a city where we have active client deployments (Abuja, Port Harcourt, Kano, Enugu, Ibadan), we can sometimes arrange an in-person visit.",
    },
  ];

  return (
    <div style={{ fontFamily: font, background: T.bg, color: T.text, minHeight: "100vh" }}>

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: T.bg, padding: "100px 24px 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <span style={sectionLabel(T.gold)}>Book a Consultation</span>
          </Reveal>
          <Reveal delay={80}>
            <h1 style={{
              fontSize:    "clamp(2rem, 5vw, 3.2rem)",
              fontWeight:  800,
              color:       T.heading,
              lineHeight:  1.15,
              margin:      "0 0 20px",
              letterSpacing: "-0.02em",
            }}>
              Book a free consultation.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p style={{ fontSize: "clamp(1rem, 2vw, 1.15rem)", color: T.text, lineHeight: 1.75, maxWidth: 640, margin: "0 auto 28px" }}>
              A 45-minute call with one of our product specialists. We understand your needs, show you what's relevant, walk you through pricing, and give you a deployment timeline. No sales pressure, just clear answers.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px 24px" }}>
              {["Free", "No obligation", "45 minutes", "Google Meet or in-person (Lagos)"].map((item) => (
                <span key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.muted }}>
                  <IconCheck color={T.mint} size={14} />
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 2. WHAT WE COVER ─────────────────────────────────────────────────── */}
      <section style={{ background: T.surface, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={sectionLabel(T.blue)}>What to Expect</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", fontWeight: 800, color: T.heading, margin: "8px 0 0", letterSpacing: "-0.02em" }}>
                A conversation, not a presentation.
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              {
                icon:  <IconEar color={T.mint} />,
                color: T.mint,
                dim:   T.mintDim,
                title: "We listen first",
                body:  "We spend the first 15–20 minutes asking about your current workflows, team size, pain points, and budget before we say anything about our products. The best consultations start with questions, not demos.",
              },
              {
                icon:  <IconMonitor color={T.blue} />,
                color: T.blue,
                dim:   T.blueDim,
                title: "Relevant product walkthrough",
                body:  "We show you the modules most relevant to your organisation: real screens from production deployments, not mockups or slides. You'll see how people who look like your team use the system daily.",
              },
              {
                icon:  <IconArrow color={T.gold} />,
                color: T.gold,
                dim:   T.goldDim,
                title: "Clear next steps",
                body:  "By the end of the call, you'll have a timeline estimate, a pricing range, and a written summary within 24 hours. The next step is yours. There's no pressure and no follow-up calls unless you want them.",
              },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 100}>
                <div style={{
                  background:   T.card,
                  border:       `1px solid ${T.border}`,
                  borderRadius: 16,
                  padding:      28,
                  height:       "100%",
                  boxSizing:    "border-box",
                }}>
                  <div style={{
                    width:        52,
                    height:       52,
                    borderRadius: 12,
                    background:   card.dim,
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}>
                    {card.icon}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: T.heading, margin: "0 0 12px" }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: 14, color: T.text, lineHeight: 1.7, margin: 0 }}>
                    {card.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FORM + INFO PANEL ─────────────────────────────────────────────── */}
      <section style={{ background: T.bg, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            display:             "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,0.65fr)",
            gap:                 32,
            alignItems:          "start",
          }}
            className="consultation-grid"
          >
            {/* ── Left: Form ── */}
            <Reveal>
              <div
                id="consultation-form"
                ref={formRef}
                style={{
                  background:   T.card,
                  border:       `1px solid ${T.border}`,
                  borderRadius: 16,
                  padding:      32,
                  boxSizing:    "border-box",
                }}
              >
                {submitted ? (
                  /* Success state */
                  <div style={{ textAlign: "center", padding: "48px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                      <IconCheckCircle size={72} />
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 800, color: T.heading, margin: "0 0 14px" }}>
                      Consultation request received.
                    </h3>
                    <p style={{ fontSize: 15, color: T.text, lineHeight: 1.7, margin: "0 0 24px", maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                      We'll email you within 4 business hours with a confirmed time. In the meantime, feel free to call us directly.
                    </p>
                    <a
                      href={`tel:${COMPANY_PHONE}`}
                      style={{ fontSize: 18, fontWeight: 700, color: T.mint, textDecoration: "none" }}
                    >
                      {COMPANY_PHONE}
                    </a>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: T.heading, margin: "0 0 28px" }}>
                      Request your consultation
                    </h3>

                    <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    <Field label="Job title / role" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    <Field label="Organisation name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />

                    <SelectField
                      label="Organisation size"
                      value={orgSize}
                      onChange={(e) => setOrgSize(e.target.value)}
                      options={["1–10 people", "11–50 people", "51–200 people", "201–500 people", "500+ people"]}
                    />

                    <Field label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <Field label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

                    {/* Products (checkboxes) */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ ...labelStyle, marginBottom: 12 }}>
                        Products interested in<span style={{ color: T.rose, marginLeft: 3 }}>*</span>
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                        {productOptions.map((p) => (
                          <label
                            key={p}
                            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                          >
                            <div
                              onClick={() => toggleProduct(p)}
                              style={{
                                width:        18,
                                height:       18,
                                borderRadius: 4,
                                border:       `1.5px solid ${products.includes(p) ? T.gold : T.border}`,
                                background:   products.includes(p) ? T.goldDim : "transparent",
                                display:      "flex",
                                alignItems:   "center",
                                justifyContent: "center",
                                flexShrink:   0,
                                cursor:       "pointer",
                                transition:   "all 0.2s",
                              }}
                            >
                              {products.includes(p) && <IconCheck color={T.gold} size={11} />}
                            </div>
                            <span
                              style={{ fontSize: 13, color: T.text, userSelect: "none" }}
                              onClick={() => toggleProduct(p)}
                            >
                              {p}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <SelectField
                      label="Preferred time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      options={["Morning (9am–12pm)", "Afternoon (12pm–3pm)", "Evening (3pm–6pm)"]}
                    />

                    <SelectField
                      label="Preferred day"
                      value={preferredDay}
                      onChange={(e) => setPreferredDay(e.target.value)}
                      options={["Any weekday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}
                    />

                    <Field
                      label="Biggest challenge right now"
                      value={challenge}
                      onChange={(e) => setChallenge(e.target.value)}
                      placeholder="e.g. We currently track everything in spreadsheets and are losing data..."
                      required={false}
                      rows={4}
                    />

                    <SelectField
                      label="How did you hear about us?"
                      value={hearAbout}
                      onChange={(e) => setHearAbout(e.target.value)}
                      required={false}
                      options={[
                        "Google search",
                        "LinkedIn",
                        "Referral from a colleague",
                        "Social media",
                        "Trade event / conference",
                        "Existing Orion Soft client",
                        "Other",
                      ]}
                    />

                    {error && (
                      <p style={{ color: T.rose, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width:        "100%",
                        padding:      "14px 24px",
                        background:   loading ? T.goldDim : T.gold,
                        color:        loading ? T.muted : "#060810",
                        border:       "none",
                        borderRadius: 8,
                        fontSize:     15,
                        fontWeight:   700,
                        fontFamily:   font,
                        cursor:       loading ? "not-allowed" : "pointer",
                        transition:   "background 0.2s, opacity 0.2s",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {loading ? "Sending…" : "Book my consultation →"}
                    </button>
                  </form>
                )}
              </div>
            </Reveal>

            {/* ── Right: Info Panel ── */}
            <Reveal delay={120}>
              <div style={{
                background:   T.surface,
                border:       `1px solid ${T.border}`,
                borderRadius: 16,
                padding:      28,
                boxSizing:    "border-box",
              }}>
                {/* Key details */}
                <div style={{ marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 16px" }}>
                    Key details
                  </p>
                  {[
                    { label: "Response time", value: "Within 4 hours",              color: T.mint },
                    { label: "Duration",       value: "45 minutes",                  color: T.blue },
                    { label: "Format",         value: "Google Meet or in-person (Lagos)", color: T.purple },
                    { label: "Cost",           value: "Free, no obligation",          color: T.gold },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: T.muted, minWidth: 110 }}>{row.label}</span>
                      <span style={{ fontSize: 13, color: T.heading, fontWeight: 600 }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <Divider />

                {/* What to prepare */}
                <div style={{ marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.heading, margin: "0 0 14px" }}>
                    What to prepare
                  </p>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {[
                      "A brief description of your current process (paper-based or existing software)",
                      "Approximate number of staff who will use the system",
                      "Your target go-live date, if you have one",
                      "Any compliance or regulatory requirements specific to your sector",
                    ].map((item) => (
                      <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                        <span style={{ marginTop: 2, flexShrink: 0 }}>
                          <IconCheck color={T.mint} size={14} />
                        </span>
                        <span style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Divider />

                {/* Direct contact */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.heading, margin: "0 0 14px" }}>
                    Prefer to reach out directly?
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <a
                      href={`tel:${COMPANY_PHONE}`}
                      style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.text, fontSize: 14 }}
                    >
                      <span style={{ display: "flex", alignItems: "center" }}><IconPhone color={T.blue} /></span>
                      <span>{COMPANY_PHONE}</span>
                    </a>
                    <a
                      href={`mailto:${COMPANY_EMAIL}`}
                      style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.text, fontSize: 14 }}
                    >
                      <span style={{ display: "flex", alignItems: "center" }}><IconMail color={T.gold} /></span>
                      <span>{COMPANY_EMAIL}</span>
                    </a>
                    <a
                      href="https://wa.me/2348169577059"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.text, fontSize: 14 }}
                    >
                      <span style={{ display: "flex", alignItems: "center" }}><IconWhatsApp color={T.mint} /></span>
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 4. TESTIMONIALS STRIP ────────────────────────────────────────────── */}
      <section style={{ background: T.light, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={sectionLabel(T.purple)}>From Previous Consultations</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 800, color: T.lightText, margin: "8px 0 0", letterSpacing: "-0.02em" }}>
                What clients say about the first call.
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              {
                quote:  "The first call was completely different from any vendor conversation I'd had before. They spent 20 minutes asking questions before they showed us anything. That's how I knew they actually wanted to help.",
                name:   "Dr. Emeka Obi",
                role:   "Medical Director, St. James Hospital",
              },
              {
                quote:  "I booked expecting a product demo. I got a workflow analysis and a deployment plan. We signed the contract within the week.",
                name:   "Mrs. Funke Adeleke",
                role:   "Principal, Covenant Academy",
              },
              {
                quote:  "We were skeptical about another software company. The consultation changed that. They knew exactly what a logistics operation needs. They had clearly done this many times before.",
                name:   "Chidi Nwachukwu",
                role:   "Operations Manager, SwiftMove Logistics",
              },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div style={{
                  background:   T.lightCard,
                  border:       `1px solid ${T.lightBorder}`,
                  borderRadius: 16,
                  padding:      28,
                  boxSizing:    "border-box",
                  height:       "100%",
                  display:      "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ color: T.gold, fontSize: 28, lineHeight: 1, marginBottom: 16, letterSpacing: "-0.02em" }}>"</div>
                    <p style={{ fontSize: 14, color: T.lightMuted, lineHeight: 1.75, margin: "0 0 24px" }}>
                      {t.quote}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T.lightText, margin: "0 0 2px" }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: T.lightMuted, margin: 0 }}>{t.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FAQ ───────────────────────────────────────────────────────────── */}
      <section style={{ background: T.bg, padding: "80px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={sectionLabel(T.gold)}>Common Questions</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 800, color: T.heading, margin: "8px 0 0", letterSpacing: "-0.02em" }}>
                Before you book.
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <Reveal key={faq.q} delay={i * 60}>
                  <div style={{ borderBottom: `1px solid ${T.border}` }}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{
                        width:          "100%",
                        background:     "none",
                        border:         "none",
                        padding:        "22px 0",
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "space-between",
                        gap:            16,
                        cursor:         "pointer",
                        textAlign:      "left",
                        fontFamily:     font,
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 600, color: isOpen ? T.heading : T.text, lineHeight: 1.4 }}>
                        {faq.q}
                      </span>
                      <IconChevron open={isOpen} />
                    </button>
                    <div style={{
                      maxHeight:  isOpen ? 400 : 0,
                      overflow:   "hidden",
                      transition: "max-height 0.35s ease",
                    }}>
                      <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.8, margin: "0 0 24px", paddingRight: 24 }}>
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. BOTTOM CTA ────────────────────────────────────────────────────── */}
      <section style={{ background: T.surface, padding: "80px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", fontWeight: 800, color: T.heading, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Ready to see it in your organisation?
            </h2>
            <p style={{ fontSize: 15, color: T.text, lineHeight: 1.75, margin: "0 0 32px" }}>
              Book the consultation above, or reach out directly. We respond to every inquiry within 4 business hours.
            </p>
            <button
              onClick={scrollToForm}
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          8,
                padding:      "14px 32px",
                background:   T.gold,
                color:        "#060810",
                border:       "none",
                borderRadius: 8,
                fontSize:     15,
                fontWeight:   700,
                fontFamily:   font,
                cursor:       "pointer",
                letterSpacing: "0.01em",
                transition:   "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.goldLt)}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.gold)}
            >
              ↑ Back to form
            </button>
          </Reveal>
        </div>
      </section>

      {/* ── Responsive grid override ─────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .consultation-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
