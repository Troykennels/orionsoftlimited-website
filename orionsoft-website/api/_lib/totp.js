// Two-step sign-in with an authenticator app (Google Authenticator,
// Microsoft Authenticator, Authy…): RFC 6238 time-based codes, 6 digits,
// 30-second steps, SHA-1, plus one-time recovery codes. No dependencies.
import { createHmac, randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./auth.js";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export function newSecret() { return base32Encode(randomBytes(20)); }

export function totpAt(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).toString();
  return code.padStart(6, "0");
}

// Accepts the current code and one step either side (phone clocks drift).
// Returns the matching step so a code can't be replayed.
export function verifyTotp(secret, code, lastStep = -1, now = Date.now()) {
  const c = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c) || !secret) return null;
  const step = Math.floor(now / 30000);
  for (const s of [step, step - 1, step + 1]) {
    if (s > lastStep && totpAt(secret, s) === c) return s;
  }
  return null;
}

export function otpauthUrl(secret, account, issuer = "Orion Soft") {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export async function newRecoveryCodes(n = 8) {
  const plain = Array.from({ length: n }, () => randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})/, "$1-"));
  return { plain, hashed: await Promise.all(plain.map(c => hashPassword(c))) };
}

// Checks a 6-digit code or a recovery code against a user record, and returns
// the fields to save (last step used / remaining recovery codes), or null.
export async function checkSecondFactor(user, code) {
  const c = String(code || "").trim().toUpperCase();
  const step = verifyTotp(user.totpSecret, c, user.totpLastStep ?? -1);
  if (step != null) return { totpLastStep: step };
  if (/^[0-9A-F]{5}-[0-9A-F]{5}$/.test(c)) {
    for (const [i, h] of (user.totpRecovery || []).entries()) {
      if (await verifyPassword(c, h)) return { totpRecovery: user.totpRecovery.filter((_, j) => j !== i), usedRecovery: true };
    }
  }
  return null;
}
