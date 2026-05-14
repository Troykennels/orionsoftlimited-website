const DEFAULT_TO_EMAIL = "orionsoftlimited@gmail.com";
const DEFAULT_FROM_EMAIL = "Orion Soft Website <hello@orionsoftlimited.com>";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEntries(payload) {
  return Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
    .map(([key, value]) => [key, `${value}`]);
}

function buildSubject(type) {
  if (!type) return "New website submission";
  return `Orion Soft website ${type}`;
}

function buildHtml(payload) {
  const rows = formatEntries(payload)
    .map(([key, value]) => `
      <tr>
        <td style="padding:10px 12px;border:1px solid #dbe2ea;font-weight:700;background:#f8fafc;vertical-align:top;">${escapeHtml(key)}</td>
        <td style="padding:10px 12px;border:1px solid #dbe2ea;vertical-align:top;">${escapeHtml(value).replaceAll("\n", "<br />")}</td>
      </tr>
    `)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a">
      <h2 style="margin:0 0 16px;">New Orion Soft website submission</h2>
      <table style="border-collapse:collapse;width:100%;max-width:820px">${rows}</table>
    </div>
  `;
}

function buildText(payload) {
  return formatEntries(payload)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function splitEmails(value) {
  return String(value || "")
    .split(",")
    .map(email => email.trim())
    .filter(Boolean);
}

async function readResendError(resendResponse) {
  const raw = await resendResponse.text();
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    return parsed.message || parsed.error || raw;
  } catch {
    return raw;
  }
}

function buildDeliveryHint(status, detail, from) {
  const lowerDetail = String(detail || "").toLowerCase();
  const lowerFrom = String(from || "").toLowerCase();

  if (status === 403 && lowerFrom.includes("@resend.dev")) {
    return "Resend's resend.dev sender is only for testing and can only send to the email address on the Resend account. Verify your own domain in Resend and set FORM_FROM_EMAIL to an address on that domain.";
  }

  if (lowerDetail.includes("verify a domain") || lowerDetail.includes("domain is not verified")) {
    return "The sender address must use a domain verified in Resend. In Vercel, set FORM_FROM_EMAIL to something like Orion Soft Website <hello@orionsoftlimited.com> after verifying orionsoftlimited.com in Resend.";
  }

  if (lowerDetail.includes("api key")) {
    return "Check that RESEND_API_KEY is set in the Vercel project environment variables for Production and redeploy after saving it.";
  }

  return "Check RESEND_API_KEY, FORM_FROM_EMAIL, FORM_TO_EMAIL, and the Resend email logs for this request.";
}

export default async function handler(request, response) {
  // CORS headers
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (request.method === "GET") {
    response.status(200).json({
      ok: true,
      emailServiceConfigured: Boolean(apiKey),
      apiKeyPrefix: apiKey ? apiKey.substring(0, 6) + "..." : "NOT SET",
      envKeysAvailable: Object.keys(process.env).filter(k => k.includes("RESEND") || k.includes("FORM")).join(", ") || "NONE",
    });
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!apiKey) {
    response.status(503).json({ ok: false, error: "Email service not configured. RESEND_API_KEY not found in environment." });
    return;
  }

  let payload;
  try {
    if (request.body && typeof request.body === "object") {
      payload = request.body;
    } else if (typeof request.body === "string" && request.body.trim()) {
      payload = JSON.parse(request.body);
    } else {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString("utf8");
      payload = body ? JSON.parse(body) : {};
    }
  } catch {
    response.status(400).json({ ok: false, error: "Invalid JSON payload" });
    return;
  }

  // Honeypot check
  if (payload.website) {
    response.status(200).json({ ok: true, ignored: true });
    return;
  }

  if (!payload.type) {
    response.status(400).json({ ok: false, error: "Missing submission type" });
    return;
  }

  const to = process.env.FORM_TO_EMAIL || DEFAULT_TO_EMAIL;
  const from = process.env.FORM_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const toEmails = splitEmails(to);
  const replyTo = payload.email && /\S+@\S+\.\S+/.test(payload.email) ? payload.email : undefined;

  if (!toEmails.length) {
    response.status(400).json({ ok: false, error: "No recipient configured. Set FORM_TO_EMAIL." });
    return;
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: toEmails,
        subject: buildSubject(payload.type),
        html: buildHtml(payload),
        text: buildText(payload),
        reply_to: replyTo,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await readResendError(resendResponse);
      response.status(502).json({
        ok: false,
        error: "Email delivery failed",
        status: resendResponse.status,
        detail,
        hint: buildDeliveryHint(resendResponse.status, detail, from),
      });
      return;
    }

    const result = await resendResponse.json();
    response.status(200).json({ ok: true, id: result.id });
  } catch (err) {
    response.status(500).json({ ok: false, error: "Internal error", detail: err.message });
  }
}
