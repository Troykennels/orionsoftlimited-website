import React, { useState } from "react";

const C = {
  bg: "#050A12",
  surface: "#0B1221",
  card: "#0F1A2E",
  border: "rgba(255,255,255,0.06)",
  white: "#FFFFFF",
  text: "#CBD5E1",
  textMuted: "#64748B",
  heading: "#F1F5F9",
  accent: "#00C8FF",
  accentDim: "rgba(0,200,255,0.12)",
  accentGlow: "rgba(0,200,255,0.25)",
  mint: "#34D399",
  purple: "#A78BFA",
  amber: "#FBBF24",
  rose: "#FB7185",
};

const font = "'Instrument Sans', 'DM Sans', system-ui, sans-serif";

const roles = [
  {
    title: "Business Development Officer (Nurse)",
    type: "Field Sales",
    location: "Lagos",
    color: C.accent,
    icon: "🏥",
    desc: "Visit hospitals, demo CareCore HMS, onboard new clients, and provide ongoing support. Nursing background required.",
    requirements: [
      "Registered Nurse (RN) or Registered Midwife (RM)",
      "Valid nursing/midwifery license",
      "Comfortable using smartphones and computers",
      "Strong communication and presentation skills",
      "Willingness to travel within Lagos and environs",
    ],
    compensation: "₦25K–30K base + ₦10K transport + ₦5K data + ₦30–50K per onboarding commission",
  },
  {
    title: "Business Development Officer (Marketing)",
    type: "Field Sales",
    location: "Lagos",
    color: C.mint,
    icon: "📊",
    desc: "Drive CareCore adoption through hospital visits, relationship building, cold outreach, and closing deals. Marketing/sales background preferred.",
    requirements: [
      "HND/BSc in Marketing, Business Admin, or related field",
      "1+ year experience in B2B sales or field marketing",
      "Confident presenting to senior hospital management",
      "Strong negotiation and follow-up skills",
      "Own smartphone, comfortable with digital tools",
    ],
    compensation: "₦25K–30K base + ₦10K transport + ₦5K data + ₦30–50K per onboarding commission",
  },
  {
    title: "Digital Marketing Executive",
    type: "Marketing",
    location: "Lagos / Remote",
    color: C.purple,
    icon: "📱",
    desc: "Manage Orion Soft's social media, create content showcasing CareCore, run campaigns, and generate inbound leads for the sales team.",
    requirements: [
      "Experience managing business social media accounts",
      "Ability to create short video content (reels, demos)",
      "Knowledge of Instagram, LinkedIn, Twitter/X, WhatsApp marketing",
      "Basic graphic design (Canva or similar)",
      "Understanding of healthcare or B2B marketing is a plus",
    ],
    compensation: "Competitive — based on experience",
  },
  {
    title: "Software Developer (Frontend/Backend)",
    type: "Engineering",
    location: "Remote",
    color: C.amber,
    icon: "💻",
    desc: "Help build and improve CareCore and other Orion Soft products. Work with React, Flask, PostgreSQL, and modern web technologies.",
    requirements: [
      "Proficiency in React (frontend) or Flask/Python (backend)",
      "Experience with REST APIs and database management",
      "Portfolio or GitHub with previous work",
      "Ability to work independently and meet deadlines",
      "Bonus: experience with healthcare systems or AI integration",
    ],
    compensation: "Competitive — based on experience and skill level",
  },
  {
    title: "Other / General Application",
    type: "Open",
    location: "Lagos / Remote",
    color: C.rose,
    icon: "🚀",
    desc: "Don't see your role listed? We're always looking for talented, driven people. Tell us what you can bring to Orion Soft.",
    requirements: [
      "Passion for technology and healthcare",
      "Self-motivated and results-oriented",
      "Team player with strong communication skills",
    ],
    compensation: "Depends on role and experience",
  },
];

function RoleCard({ role, isSelected, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: isSelected ? `${role.color}12` : C.card,
      borderRadius: 14, padding: "20px 22px", cursor: "pointer",
      border: `1px solid ${isSelected ? role.color + "44" : C.border}`,
      transition: "all 0.25s ease",
      boxShadow: isSelected ? `0 4px 20px ${role.color}15` : "none",
    }} onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = `${role.color}33`; }}
       onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = C.border; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{role.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font }}>{role.title}</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: font, marginTop: 2 }}>{role.type} • {role.location}</div>
          </div>
        </div>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: `2px solid ${isSelected ? role.color : C.border}`,
          background: isSelected ? role.color : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s", flexShrink: 0, marginTop: 4,
        }}>
          {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.bg }} />}
        </div>
      </div>
      <p style={{ fontSize: 13, color: C.text, fontFamily: font, lineHeight: 1.6, margin: "0 0 12px" }}>{role.desc}</p>
      <div style={{ fontSize: 12, color: role.color, fontFamily: font, fontWeight: 600 }}>{role.compensation}</div>
    </div>
  );
}

export default function App() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", location: "",
    role: "", experience: "", qualification: "",
    whyOrion: "", cvLink: "", portfolio: "", availability: "",
    referral: "",
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSelectRole = (i) => {
    setSelectedRole(i);
    update("role", roles[i].title);
  };

  // Google Form connection — LIVE and connected to orionsoftlimited@gmail.com
  const GOOGLE_FORM_ID = "1FAIpQLSdEMr5TKsf9O5pik29gQ2_uVAEaaL6axO1B76ZgNMS2eoEwgQ";
  const FIELD_MAP = {
    fullName:      "entry.456607244",
    email:         "entry.2071528042",
    phone:         "entry.1047973783",
    location:      "entry.624260353",
    role:          "entry.1956222092",
    qualification: "entry.2139165398",
    experience:    "entry.823766006",
    cvLink:        "entry.613018374",
    portfolio:     "entry.1264022189",
    availability:  "entry.1524407148",
    referral:      "entry.1725080512",
    whyOrion:      "entry.1635774021",
  };

  const handleSubmit = async () => {
    // If Google Form IDs haven't been set yet, fall back to mailto
    if (GOOGLE_FORM_ID === "YOUR_FORM_ID_HERE") {
      const subject = encodeURIComponent(`Job Application — ${form.role}`);
      const body = encodeURIComponent(
        `ORION SOFT LIMITED — JOB APPLICATION\n` +
        `${"=".repeat(45)}\n\n` +
        `Full Name: ${form.fullName}\n` +
        `Email: ${form.email}\n` +
        `Phone: ${form.phone}\n` +
        `Location: ${form.location}\n` +
        `Role Applied For: ${form.role}\n` +
        `Highest Qualification: ${form.qualification}\n` +
        `Years of Experience: ${form.experience}\n` +
        `Availability: ${form.availability}\n` +
        `How They Heard About Us: ${form.referral}\n\n` +
        `CV/Resume Link: ${form.cvLink || "Not provided"}\n` +
        `Portfolio/LinkedIn: ${form.portfolio || "Not provided"}\n\n` +
        `Why Orion Soft:\n${form.whyOrion}\n`
      );
      window.open(`mailto:orionsoftlimited@gmail.com?subject=${subject}&body=${body}`, "_blank");
      setSubmitted(true);
      return;
    }

    // Submit to Google Form silently via hidden iframe
    try {
      const formData = new URLSearchParams();
      Object.keys(FIELD_MAP).forEach(key => {
        formData.append(FIELD_MAP[key], form[key] || "");
      });

      const url = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;

      // Use a hidden iframe to avoid CORS issues with Google Forms
      const iframe = document.createElement("iframe");
      iframe.name = "hidden_iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      const formEl = document.createElement("form");
      formEl.method = "POST";
      formEl.action = url;
      formEl.target = "hidden_iframe";

      Object.keys(FIELD_MAP).forEach(key => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = FIELD_MAP[key];
        input.value = form[key] || "";
        formEl.appendChild(input);
      });

      document.body.appendChild(formEl);
      formEl.submit();

      // Clean up after submission
      setTimeout(() => {
        document.body.removeChild(formEl);
        document.body.removeChild(iframe);
      }, 3000);

      setSubmitted(true);
    } catch (err) {
      // If Google Form submission fails, fall back to mailto
      const subject = encodeURIComponent(`Job Application — ${form.role}`);
      const body = encodeURIComponent(
        `Full Name: ${form.fullName}\nEmail: ${form.email}\nPhone: ${form.phone}\n` +
        `Role: ${form.role}\nQualification: ${form.qualification}\n` +
        `Experience: ${form.experience}\nCV: ${form.cvLink}\n` +
        `Why Orion Soft: ${form.whyOrion}`
      );
      window.open(`mailto:orionsoftlimited@gmail.com?subject=${subject}&body=${body}`, "_blank");
      setSubmitted(true);
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.card, color: C.heading,
    fontSize: 14, fontFamily: font, outline: "none", transition: "border-color 0.2s",
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: C.text, fontFamily: font, marginBottom: 6, display: "block" };
  const requiredStar = { color: C.accent, marginLeft: 2 };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <style>{globalStyles}</style>
        <div style={{ textAlign: "center", maxWidth: 500 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: "0 auto 24px",
            background: `linear-gradient(135deg, ${C.accentDim}, rgba(52,211,153,0.12))`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
          }}>✅</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.heading, fontFamily: font, marginBottom: 12 }}>Application Sent!</h2>
          <p style={{ fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7, marginBottom: 12 }}>
            Thank you for applying to Orion Soft Limited. Your application for <span style={{ color: C.accent, fontWeight: 700 }}>{form.role}</span> has been sent to our team.
          </p>
          <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font, lineHeight: 1.7, marginBottom: 32 }}>
            Please also email your CV/Resume directly to <span style={{ color: C.accent }}>orionsoftlimited@gmail.com</span> with the subject line "Job Application — {form.role}" to complete your application.
          </p>
          <button onClick={() => { setSubmitted(false); setShowForm(false); setSelectedRole(null); setForm({ fullName: "", email: "", phone: "", location: "", role: "", experience: "", qualification: "", whyOrion: "", cvLink: "", portfolio: "", availability: "", referral: "" }); }} style={{
            background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
            color: C.bg, padding: "14px 32px", borderRadius: 10, border: "none",
            fontSize: 15, fontWeight: 700, fontFamily: font, cursor: "pointer",
          }}>← Apply for Another Role</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "0 clamp(16px, 4vw, 32px)" }}>
      <style>{globalStyles}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", paddingTop: 48, paddingBottom: 64 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#lg)" />
              <path d="M10 16C10 12.686 12.686 10 16 10C19.314 10 22 12.686 22 16C22 19.314 19.314 22 16 22" stroke="#050A12" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="16" cy="16" r="2" fill="#050A12" />
              <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#00C8FF" /><stop offset="1" stopColor="#34D399" /></linearGradient></defs>
            </svg>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.white, fontFamily: font }}>
              Orion<span style={{ color: C.accent }}>Soft</span>
            </span>
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: C.accentDim, border: `1px solid rgba(0,200,255,0.15)`,
            borderRadius: 100, padding: "6px 16px", marginBottom: 20,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.mint, boxShadow: `0 0 8px ${C.mint}` }} />
            <span style={{ fontSize: 12, color: C.accent, fontFamily: font, fontWeight: 600, letterSpacing: "0.06em" }}>
              WE'RE HIRING
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, color: C.heading,
            fontFamily: font, letterSpacing: "-0.03em", margin: "0 0 12px",
          }}>Join Our Team</h1>
          <p style={{
            fontSize: 16, color: C.text, fontFamily: font, lineHeight: 1.7,
            maxWidth: 550, margin: "0 auto",
          }}>
            We're building the future of healthcare technology in Nigeria.
            If you're driven, resourceful, and ready to make an impact — we want to hear from you.
          </p>
        </div>

        {!showForm ? (
          <>
            {/* Role Selection */}
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 16 }}>
              Open Positions
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {roles.map((role, i) => (
                <RoleCard key={i} role={role} isSelected={selectedRole === i} onClick={() => handleSelectRole(i)} />
              ))}
            </div>

            {/* Selected role details */}
            {selectedRole !== null && (
              <div style={{
                background: C.card, borderRadius: 16, padding: "clamp(20px, 3vw, 32px)",
                border: `1px solid ${roles[selectedRole].color}33`, marginBottom: 24,
              }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 16 }}>
                  Requirements — {roles[selectedRole].title}
                </h3>
                {roles[selectedRole].requirements.map((req, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <span style={{ color: roles[selectedRole].color, fontSize: 14, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 14, color: C.text, fontFamily: font, lineHeight: 1.5 }}>{req}</span>
                  </div>
                ))}

                <button onClick={() => setShowForm(true)} style={{
                  width: "100%", marginTop: 20, padding: "15px", borderRadius: 11, border: "none",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                  color: C.bg, fontSize: 15, fontWeight: 700, fontFamily: font,
                  cursor: "pointer", boxShadow: `0 8px 28px ${C.accentGlow}`,
                  transition: "all 0.3s",
                }} onMouseEnter={e => e.target.style.boxShadow = `0 12px 36px ${C.accentGlow}`}
                   onMouseLeave={e => e.target.style.boxShadow = `0 8px 28px ${C.accentGlow}`}>
                  Apply for This Role →
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Application Form */}
            <button onClick={() => setShowForm(false)} style={{
              background: "none", border: "none", color: C.accent, fontSize: 14,
              fontFamily: font, cursor: "pointer", marginBottom: 20, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>← Back to Roles</button>

            <div style={{
              background: C.card, borderRadius: 20, padding: "clamp(24px, 4vw, 40px)",
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: `${roles[selectedRole].color}15`, borderRadius: 8,
                  padding: "6px 14px", marginBottom: 12,
                }}>
                  <span>{roles[selectedRole].icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: roles[selectedRole].color, fontFamily: font }}>
                    {roles[selectedRole].title}
                  </span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: C.heading, fontFamily: font, margin: "0 0 6px" }}>Application Form</h2>
                <p style={{ fontSize: 14, color: C.textMuted, fontFamily: font }}>
                  All fields marked with <span style={{ color: C.accent }}>*</span> are required.
                </p>
              </div>

              {/* Personal Information */}
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                Personal Information
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={requiredStar}>*</span></label>
                  <input style={inputStyle} value={form.fullName} onChange={e => update("fullName", e.target.value)} placeholder="e.g. Adebayo Oluwaseun" />
                </div>
                <div>
                  <label style={labelStyle}>Email Address <span style={requiredStar}>*</span></label>
                  <input type="email" style={inputStyle} value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@email.com" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Phone Number <span style={requiredStar}>*</span></label>
                  <input style={inputStyle} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+234 8XX XXX XXXX" />
                </div>
                <div>
                  <label style={labelStyle}>Location (City, State) <span style={requiredStar}>*</span></label>
                  <input style={inputStyle} value={form.location} onChange={e => update("location", e.target.value)} placeholder="e.g. Ikeja, Lagos" />
                </div>
              </div>

              {/* Professional Background */}
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}`, marginTop: 24 }}>
                Professional Background
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Highest Qualification <span style={requiredStar}>*</span></label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.qualification} onChange={e => update("qualification", e.target.value)}>
                    <option value="">Select</option>
                    <option>SSCE / WAEC</option>
                    <option>OND / NCE</option>
                    <option>HND</option>
                    <option>BSc / B.Tech / BNSc</option>
                    <option>MSc / MBA / MPH</option>
                    <option>PhD / Doctorate</option>
                    <option>Professional Certification</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Years of Relevant Experience <span style={requiredStar}>*</span></label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.experience} onChange={e => update("experience", e.target.value)}>
                    <option value="">Select</option>
                    <option>No experience (fresh graduate)</option>
                    <option>Less than 1 year</option>
                    <option>1–2 years</option>
                    <option>3–5 years</option>
                    <option>5–10 years</option>
                    <option>10+ years</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>CV / Resume Link <span style={requiredStar}>*</span></label>
                <input style={inputStyle} value={form.cvLink} onChange={e => update("cvLink", e.target.value)} placeholder="Paste a Google Drive, Dropbox, or LinkedIn link to your CV" />
                <p style={{ fontSize: 12, color: C.textMuted, fontFamily: font, marginTop: 4 }}>
                  Upload your CV to Google Drive, set sharing to "Anyone with the link," and paste the link here.
                </p>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Portfolio / LinkedIn (Optional)</label>
                <input style={inputStyle} value={form.portfolio} onChange={e => update("portfolio", e.target.value)} placeholder="https://linkedin.com/in/yourname or portfolio link" />
              </div>

              {/* Availability & Motivation */}
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: font, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}`, marginTop: 24 }}>
                Availability & Motivation
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>When can you start? <span style={requiredStar}>*</span></label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.availability} onChange={e => update("availability", e.target.value)}>
                    <option value="">Select</option>
                    <option>Immediately</option>
                    <option>Within 1 week</option>
                    <option>Within 2 weeks</option>
                    <option>Within 1 month</option>
                    <option>More than 1 month</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>How did you hear about us?</label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.referral} onChange={e => update("referral", e.target.value)}>
                    <option value="">Select</option>
                    <option>Social media</option>
                    <option>Friend / referral</option>
                    <option>Job board</option>
                    <option>Google search</option>
                    <option>Our website</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Why do you want to work at Orion Soft? <span style={requiredStar}>*</span></label>
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={4} value={form.whyOrion} onChange={e => update("whyOrion", e.target.value)} placeholder="Tell us what excites you about this role and what you'd bring to the team. Be honest — we value authenticity over polish." />
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={!form.fullName || !form.email || !form.phone || !form.role || !form.whyOrion} style={{
                width: "100%", padding: "16px", borderRadius: 12, border: "none",
                background: (!form.fullName || !form.email || !form.phone || !form.role || !form.whyOrion)
                  ? C.border
                  : `linear-gradient(135deg, ${C.accent}, ${C.mint})`,
                color: (!form.fullName || !form.email || !form.phone || !form.role || !form.whyOrion)
                  ? C.textMuted : C.bg,
                fontSize: 15, fontWeight: 700, fontFamily: font,
                cursor: (!form.fullName || !form.email || !form.phone || !form.role || !form.whyOrion) ? "not-allowed" : "pointer",
                transition: "all 0.3s",
                boxShadow: (!form.fullName || !form.email || !form.phone || !form.role || !form.whyOrion)
                  ? "none" : `0 8px 28px ${C.accentGlow}`,
              }}>
                Submit Application →
              </button>

              <p style={{ fontSize: 12, color: C.textMuted, fontFamily: font, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
                Your application will be sent to <span style={{ color: C.accent }}>orionsoftlimited@gmail.com</span>. We review all applications and respond within 5 business days. Your data is kept confidential.
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font, lineHeight: 1.7 }}>
            © 2026 Orion Soft Limited. All rights reserved.<br />
            Lagos, Nigeria • orionsoftlimited@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { -webkit-font-smoothing: antialiased; }
  ::selection { background: rgba(0,200,255,0.25); color: #fff; }
  input:focus, textarea:focus, select:focus {
    border-color: #00C8FF !important;
    box-shadow: 0 0 0 3px rgba(0,200,255,0.12);
  }
  @media (max-width: 600px) {
    div[style*="grid-template-columns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }
`;
