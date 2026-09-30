// Staff ID cards. Each card carries a random verification code (in its QR
// code); scanning it opens /verify/staff/<code>, which shows whether the
// holder is a current, active member of staff. A card only counts once an
// admin has signed and authorised it. Reissuing a card replaces the code (so
// a lost or old card stops verifying) and needs authorising again.
import { randomBytes } from "node:crypto";
import { putRecord, listRecords } from "./records.js";
import { incr } from "../store.js";
import { getCompanySettings } from "./settings.js";

export const CARD_VALID_YEARS = 2;

const siteUrl = () => (process.env.APP_BASE_URL || "https://www.orionsoftlimited.com").replace(/\/$/, "");
export const verifyUrl = code => `${siteUrl()}/verify/staff/${code}`;

async function nextStaffNumber() {
  const n = await incr("orionsoft:staff:number-seq");
  return `OSL-${String(n).padStart(4, "0")}`;
}

// Gives the employee a staff number and a card if they don't have one yet
// (or a fresh card when reissuing). Saves only when something changed.
export async function ensureIdCard(emp, { reissue = false } = {}) {
  let changed = false;
  if (!String(emp.employeeNumber || "").trim()) { emp.employeeNumber = await nextStaffNumber(); changed = true; }
  if (!emp.idCard?.code || reissue) {
    const now = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + CARD_VALID_YEARS);
    emp.idCard = {
      code: randomBytes(12).toString("base64url"),
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString().slice(0, 10),
      version: (emp.idCard?.version || 0) + 1,
      authorizedAt: null, authorizedBy: "", signatoryId: "",
    };
    changed = true;
  }
  if (changed) await putRecord("employees", emp.id, emp);
  return emp;
}

// Everything the card needs to print. The card carries only the authorising
// signature, never the signer's name: staff get the signature image alone,
// and only the admin view learns who signed.
export async function cardPayload(emp, { forAdmin = false } = {}) {
  const [company, signatories] = await Promise.all([getCompanySettings(), listRecords("signatories")]);
  const sig = emp.idCard.authorizedAt ? signatories.find(s => s.id === emp.idCard.signatoryId && s.signatureImageDataUrl) || null : null;
  const { authorizedBy, signatoryId, ...cardPublic } = emp.idCard;
  return {
    employee: {
      id: emp.id, fullName: emp.fullName, title: emp.title || "", department: emp.department || "",
      employeeNumber: emp.employeeNumber, status: emp.status,
      // The card photo: the passport photo, or the profile photo until one is added.
      avatarDataUrl: emp.idPhotoDataUrl || emp.avatarDataUrl || "",
      hasPassport: !!emp.idPhotoDataUrl, hasProfilePhoto: !!emp.avatarDataUrl,
      emergencyContactName: emp.emergencyContactName || "", emergencyContactPhone: emp.emergencyContactPhone || "",
      emergencyContactRelationship: emp.emergencyContactRelationship || "", bloodGroup: emp.bloodGroup || "",
    },
    card: { ...cardPublic, ...(forAdmin ? { authorizedBy, signatoryId } : {}), authorized: !!emp.idCard.authorizedAt, verifyUrl: verifyUrl(emp.idCard.code) },
    company: { companyName: company.companyName, address: company.address, phone: company.phone, email: company.email, website: company.website, rc: company.rc },
    signatory: sig ? { signatureImageDataUrl: sig.signatureImageDataUrl, ...(forAdmin ? { id: sig.id, fullName: sig.fullName, title: sig.title } : {}) } : null,
  };
}

// Passport photo for the card: a JPEG/PNG data URL, portrait, not huge.
export function validPassport(dataUrl) {
  return typeof dataUrl === "string" && /^data:image\/(jpeg|png);base64,/.test(dataUrl) && dataUrl.length <= 1_600_000;
}

// A new passport photo on a signed card puts it back to pending, so a face
// can never be swapped on an authorised card without the admin re-signing.
export async function setPassport(emp, dataUrl) {
  emp.idPhotoDataUrl = dataUrl;
  emp.idPhotoUpdatedAt = new Date().toISOString();
  if (emp.idCard?.authorizedAt) emp.idCard = { ...emp.idCard, authorizedAt: null, authorizedBy: "", signatoryId: "" };
  await putRecord("employees", emp.id, emp);
  return emp;
}

// For the public verification page: only what a card-checker needs.
export async function verifyCard(code) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(String(code || ""))) return null;
  const emp = (await listRecords("employees")).find(e => e.idCard?.code === code);
  if (!emp) return null;
  const expired = emp.idCard.expiresAt && emp.idCard.expiresAt < new Date().toISOString().slice(0, 10);
  const company = await getCompanySettings();
  return {
    valid: emp.status === "active" && !expired && !!emp.idCard.authorizedAt,
    state: emp.status !== "active" ? "inactive" : expired ? "expired" : !emp.idCard.authorizedAt ? "pending" : "active",
    fullName: emp.fullName, title: emp.title || "", department: emp.department || "",
    employeeNumber: emp.employeeNumber || "", avatarDataUrl: emp.idPhotoDataUrl || emp.avatarDataUrl || "",
    issuedAt: emp.idCard.issuedAt, expiresAt: emp.idCard.expiresAt, authorizedAt: emp.idCard.authorizedAt || null,
    companyName: company.companyName,
  };
}
