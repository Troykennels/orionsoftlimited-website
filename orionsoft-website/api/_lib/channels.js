// WhatsApp and SMS for alerts that must reach someone even without the app:
//  - WhatsApp: Meta WhatsApp Cloud API (no middleman fee). Needs
//    WHATSAPP_TOKEN, WHATSAPP_PHONE_ID and an approved "utility" template
//    (WHATSAPP_TEMPLATE, default "staff_alert") with two body variables:
//    {{1}} = the alert, {{2}} = the link.
//  - SMS: Termii (Nigerian provider; the "dnd" route reaches numbers on DND).
//    Needs TERMII_API_KEY and TERMII_SENDER_ID (an approved sender name).
// Both are off until those settings exist, so nothing is sent or billed.

export const whatsappReady = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
export const smsReady = () => !!(process.env.TERMII_API_KEY && process.env.TERMII_SENDER_ID);

// "0803 123 4567" / "+234 803…" / "803…" → "2348031234567"
export function intlPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (/^234\d{10}$/.test(d)) return d;
  if (/^0\d{10}$/.test(d)) return `234${d.slice(1)}`;
  if (/^[789]\d{9}$/.test(d)) return `234${d}`;
  return d.length >= 11 && d.length <= 15 ? d : "";
}

export async function sendWhatsApp(phone, text, url) {
  const to = intlPhone(phone);
  if (!whatsappReady() || !to) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to, type: "template",
        template: {
          name: process.env.WHATSAPP_TEMPLATE || "staff_alert",
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: String(text).slice(0, 900) }, { type: "text", text: url }] }],
        },
      }),
    });
    if (!r.ok) console.error("[whatsapp]", r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error("[whatsapp]", e.message); return false; }
}

export async function sendSms(phone, text) {
  const to = intlPhone(phone);
  if (!smsReady() || !to) return false;
  try {
    const r = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.TERMII_API_KEY, to, from: process.env.TERMII_SENDER_ID, sms: String(text).slice(0, 300), type: "plain", channel: process.env.TERMII_CHANNEL || "dnd" }),
    });
    if (!r.ok) console.error("[sms]", r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error("[sms]", e.message); return false; }
}

// WhatsApp first, SMS if WhatsApp isn't set up or fails.
export async function sendUrgent(employee, { title, body, url }) {
  const phone = employee.whatsapp || employee.phone;
  const text = body ? `${title}: ${body}` : title;
  if (await sendWhatsApp(phone, text, url)) return "whatsapp";
  if (await sendSms(phone, `Orion Soft: ${text.slice(0, 200)} ${url}`)) return "sms";
  return null;
}
