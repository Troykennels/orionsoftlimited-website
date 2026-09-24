import { useEffect, useRef, useState } from "react";
import { Camera, Globe, ExternalLink, Copy, ShieldCheck, Lock } from "lucide-react";
import { C, SOCIAL_META } from "../theme.js";
import { api, profileUrl, shareUrl, SHARE_TARGETS, copyText, fmtDate } from "../api.js";
import { Avatar, Badge, Btn, SectionCard, SectionTitle, Input, Textarea, Select, Field, Grid, PageHeader, toast } from "../components.jsx";
import { resizeImageToDataUrl } from "../imageUtils.js";
import { loadGoogleIdentity, getGoogleClientId } from "../StaffLogin.jsx";
import { useOffice } from "../office.js";

const SOCIAL_KEYS = ["linkedin", "x", "facebook", "instagram", "tiktok", "github", "youtube", "website"];

function GoogleLink({ linked, email, onChange }) {
  const btn = useRef(null);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (linked) return undefined;
    let cancelled = false;
    (async () => {
      const clientId = await getGoogleClientId();
      if (!clientId || cancelled) return;
      try {
        const google = await loadGoogleIdentity();
        if (cancelled) return;
        google.accounts.id.initialize({
          client_id: clientId, auto_select: false,
          callback: async ({ credential }) => {
            try { const j = await api("/api/auth/google", { method: "POST", body: { action: "link", credential } }); toast(`Linked ${j.googleEmail}. Next time just tap "Continue with Google".`); onChange(); }
            catch (e) { toast(e.message, "err"); }
          },
        });
        if (btn.current) google.accounts.id.renderButton(btn.current, { theme: "filled_black", size: "medium", text: "continue_with", shape: "pill" });
        setAvailable(true);
      } catch { /* Google unavailable */ }
    })();
    return () => { cancelled = true; };
  }, [linked, onChange]);
  async function unlink() {
    try { await api("/api/auth/google", { method: "POST", body: { action: "unlink" } }); toast("Google account unlinked"); onChange(); } catch (e) { toast(e.message, "err"); }
  }
  if (linked) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <Badge color={C.mint}><ShieldCheck size={12} /> Linked{email ? `: ${email}` : ""}</Badge>
      <Btn small variant="ghost" onClick={unlink}>Unlink</Btn>
    </div>
  );
  return (
    <div>
      <div ref={btn} />
      {!available && <div style={{ fontSize: 12.5, color: C.textMuted }}>Google sign-in isn't enabled for the office yet. Ask the admin to add it.</div>}
    </div>
  );
}

function PasswordSection() {
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (f.newPassword.length < 10) { toast("New password must be at least 10 characters", "err"); return; }
    if (f.newPassword !== f.confirmPassword) { toast("New passwords don't match", "err"); return; }
    setBusy(true);
    try { await api("/api/staff/change-password", { method: "POST", body: { currentPassword: f.currentPassword, newPassword: f.newPassword } }); toast("Password changed"); setF({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
    catch (e) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  return (
    <>
      <Grid min={180} style={{ marginBottom: 12 }}>
        <Field label="Current password"><Input type="password" autoComplete="current-password" value={f.currentPassword} onChange={e => setF(x => ({ ...x, currentPassword: e.target.value }))} /></Field>
        <Field label="New password"><Input type="password" autoComplete="new-password" value={f.newPassword} onChange={e => setF(x => ({ ...x, newPassword: e.target.value }))} /></Field>
        <Field label="Confirm new password"><Input type="password" autoComplete="new-password" value={f.confirmPassword} onChange={e => setF(x => ({ ...x, confirmPassword: e.target.value }))} /></Field>
      </Grid>
      <Btn small icon={Lock} onClick={submit} disabled={busy || !f.currentPassword || !f.newPassword}>Change password</Btn>
    </>
  );
}

export default function Profile() {
  const { me, office, reload, person } = useOffice();
  const [f, setF] = useState(() => ({
    headline: me.headline || "", bio: me.bio || "", skills: (me.skills || []).join(", "), location: me.location || "",
    phone: me.phone || "", whatsapp: me.whatsapp || "", showPhone: !!me.showPhone,
    socials: { ...(me.socials || {}) }, publicProfile: !!me.publicProfile, slug: me.slug || "",
    publicFields: { location: false, email: false, tenure: true, ...(me.publicFields || {}) },
    dateOfBirth: me.dateOfBirth || "", gender: me.gender || "", address: me.address || "",
    emergencyContactName: me.emergencyContactName || "", emergencyContactPhone: me.emergencyContactPhone || "", emergencyContactRelationship: me.emergencyContactRelationship || "",
    bankName: me.bankName || "", bankAccountNumber: me.bankAccountNumber || "", bankAccountName: me.bankAccountName || "",
  }));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function save(extra = {}) {
    setSaving(true);
    try { await api("/api/staff/profile", { method: "PATCH", body: { ...f, ...extra } }); toast("Profile saved"); reload(); }
    catch (e) { toast(e.message, "err"); } finally { setSaving(false); }
  }
  async function onPhoto(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    try { const d = await resizeImageToDataUrl(file, 400, 0.85); await api("/api/staff/profile", { method: "PATCH", body: { avatarDataUrl: d } }); toast("Photo updated"); reload(); }
    catch (ex) { toast(ex.message, "err"); }
  }
  async function shareProfile(target) {
    const url = shareUrl(me.slug);
    const text = `Meet me at Orion Soft: ${me.title}${me.headline ? `, ${me.headline}` : ""}.`;
    if (target) window.open(target.build(url, text), "_blank", "noopener,noreferrer");
    else { await copyText(profileUrl(me.slug)); toast("Profile link copied"); }
  }

  const manager = office.lineManager;
  const completeness = ["avatarDataUrl", "headline", "bio", "whatsapp"].filter(k => me[k]).length + ((me.skills || []).length ? 1 : 0) + (Object.keys(me.socials || {}).length ? 1 : 0);

  return (
    <div>
      <PageHeader title="My Profile" sub="Your profile is how colleagues get to know you, and your public page is how the world does." />
      <SectionCard style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: 110, background: "linear-gradient(120deg, rgba(10,37,64,0.92), rgba(22,52,92,0.7) 55%, rgba(59,47,18,0.85)), url(/assets/cloud-infrastructure-team.jpg) center 40% / cover" }} />
        <div style={{ padding: "0 20px 20px", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ position: "relative", border: `4px solid ${C.card}`, borderRadius: "50%", marginTop: -48 }}>
            <Avatar src={me.avatarDataUrl} name={me.fullName} size={96} />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change photo" style={{ position: "absolute", right: 0, bottom: 0, background: C.gold, color: "#060810", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Camera size={15} /></button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={onPhoto} />
          </div>
          <div style={{ flex: 1, minWidth: 220, paddingTop: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.heading }}>{me.fullName}</div>
            <div style={{ fontSize: 13.5, color: C.text }}>{me.title}{me.department ? ` · ${me.department}` : ""}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <Badge color={C.gold}>{me.role?.label || "Staff"}</Badge>
              {me.publicProfile ? <Badge color={C.mint}><Globe size={11} /> Public profile on</Badge> : <Badge color={C.textMuted}>Public profile off</Badge>}
              <Badge color={completeness >= 6 ? C.mint : C.amber}>Profile {Math.round(completeness / 6 * 100)}% complete</Badge>
            </div>
          </div>
          {me.publicProfile && me.slug && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 14 }}>
              <a href={profileUrl(me.slug)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn small variant="ghost" icon={ExternalLink}>View public page</Btn></a>
              {SHARE_TARGETS.slice(0, 4).map(t => <Btn key={t.id} small variant="ghost" onClick={() => shareProfile(t)}>{t.label}</Btn>)}
              <Btn small variant="blue" icon={Copy} onClick={() => shareProfile(null)}>Copy link</Btn>
            </div>
          )}
        </div>
      </SectionCard>

      <div className="so-two">
        <div className="so-stack" style={{ gap: 16 }}>
          <SectionCard>
            <SectionTitle sub="Visible to all colleagues, and on your public page if you switch it on.">About me</SectionTitle>
            <Field label="Headline" style={{ marginBottom: 10 }}><Input value={f.headline} onChange={set("headline")} placeholder="e.g. Helping Nigerian hospitals go digital with CareCore" maxLength={140} /></Field>
            <Field label="Bio" style={{ marginBottom: 10 }}><Textarea value={f.bio} onChange={set("bio")} placeholder="What you do, what you're great at, what you're working on." /></Field>
            <Grid min={200}>
              <Field label="Skills (comma separated)"><Input value={f.skills} onChange={set("skills")} placeholder="Sales, CRM, React, Negotiation" /></Field>
              <Field label="Location"><Input value={f.location} onChange={set("location")} placeholder="Lagos, Nigeria" /></Field>
            </Grid>
          </SectionCard>

          <SectionCard>
            <SectionTitle sub="Colleagues can reach you on WhatsApp in one tap from your profile and the directory.">Contact & social accounts</SectionTitle>
            <Grid min={200} style={{ marginBottom: 10 }}>
              <Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field>
              <Field label="WhatsApp number"><Input value={f.whatsapp} onChange={set("whatsapp")} placeholder="0803 123 4567" /></Field>
            </Grid>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.text, marginBottom: 14 }}><input type="checkbox" checked={f.showPhone} onChange={e => setF(x => ({ ...x, showPhone: e.target.checked }))} /> Show my phone number to colleagues</label>
            <Grid min={220}>
              {SOCIAL_KEYS.map(k => <Field key={k} label={SOCIAL_META[k].label}><Input value={f.socials[k] || ""} onChange={e => setF(x => ({ ...x, socials: { ...x.socials, [k]: e.target.value } }))} placeholder={k === "website" ? "https://…" : `${k === "x" ? "x" : k}.com/yourname`} /></Field>)}
            </Grid>
          </SectionCard>

          <SectionCard style={{ borderColor: f.publicProfile ? `${C.mint}55` : undefined }}>
            <SectionTitle sub="Your own page on orionsoftlimited.com with your photo, bio, skills, social links, public goals, wins and kudos. Great for LinkedIn and your CV.">Public profile</SectionTitle>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: C.heading, fontWeight: 700, marginBottom: 12 }}><input type="checkbox" checked={f.publicProfile} onChange={e => setF(x => ({ ...x, publicProfile: e.target.checked }))} /> Publish my profile on the Orion Soft website</label>
            <Field label="Profile address" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13, color: C.textMuted, whiteSpace: "nowrap" }}>{window.location.host}/people/</span><Input value={f.slug} onChange={set("slug")} /></div>
            </Field>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>ALSO SHOW</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: C.text }}>
              {[["location", "Location"], ["email", "Work email"], ["tenure", "Year I joined"]].map(([k, l]) => (
                <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.publicFields[k]} onChange={e => setF(x => ({ ...x, publicFields: { ...x.publicFields, [k]: e.target.checked } }))} /> {l}</label>
              ))}
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 0 }}>Private details (phone, address, birthday, bank, emergency contact) are never shown publicly.</p>
          </SectionCard>

          <div><Btn onClick={() => save()} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Btn></div>

          <SectionCard>
            <SectionTitle sub="Only you, HR and your line management can see these.">Private details</SectionTitle>
            <Grid min={180} style={{ marginBottom: 12 }}>
              <Field label="Date of birth"><Input type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} /></Field>
              <Field label="Gender"><Select value={f.gender} onChange={set("gender")}><option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option></Select></Field>
              <Field label="Home address"><Input value={f.address} onChange={set("address")} /></Field>
            </Grid>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>EMERGENCY CONTACT</div>
            <Grid min={180} style={{ marginBottom: 12 }}>
              <Field label="Name"><Input value={f.emergencyContactName} onChange={set("emergencyContactName")} /></Field>
              <Field label="Phone"><Input value={f.emergencyContactPhone} onChange={set("emergencyContactPhone")} /></Field>
              <Field label="Relationship"><Input value={f.emergencyContactRelationship} onChange={set("emergencyContactRelationship")} /></Field>
            </Grid>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>BANK DETAILS (FOR PAYROLL)</div>
            <Grid min={180} style={{ marginBottom: 12 }}>
              <Field label="Bank"><Input value={f.bankName} onChange={set("bankName")} /></Field>
              <Field label="Account number"><Input value={f.bankAccountNumber} onChange={set("bankAccountNumber")} inputMode="numeric" /></Field>
              <Field label="Account name"><Input value={f.bankAccountName} onChange={set("bankAccountName")} /></Field>
            </Grid>
            <Btn small onClick={() => save()} disabled={saving}>Save private details</Btn>
          </SectionCard>
        </div>

        <div className="so-stack" style={{ gap: 16 }}>
          <SectionCard>
            <SectionTitle>Employment</SectionTitle>
            {[["Role", me.role?.label || "Staff"], ["Job title", me.title], ["Department", me.department || "—"], ["Reports to", manager ? manager.fullName : "—"], ["Work email", me.email], ["Started", me.startDate ? fmtDate(me.startDate) : "—"], ["Annual leave", `${me.leaveAllowance || 20} days / year`]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMuted }}>{k}</span><span style={{ color: C.heading, fontWeight: 600, textAlign: "right" }}>{v}</span>
              </div>
            ))}
            {office.directReports.length > 0 && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 10 }}>You manage {office.directReports.map(id => person(id).fullName).join(", ")}.</div>}
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 0 }}>These are managed by HR. Contact HR if anything is wrong.</p>
          </SectionCard>

          <SectionCard>
            <SectionTitle sub="Link Google to sign in with one tap, without typing your password.">Sign-in & security</SectionTitle>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>GOOGLE ACCOUNT</div>
            <GoogleLink linked={me.googleLinked} email={me.googleEmail} onChange={reload} />
            {!me.viaAdmin && <><div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, margin: "18px 0 8px" }}>PASSWORD</div><PasswordSection /></>}
            {me.viaAdmin && <p style={{ fontSize: 12.5, color: C.textMuted }}>You're using the office with your owner (admin) account. Your admin password is managed in the admin dashboard.</p>}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
