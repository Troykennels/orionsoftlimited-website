const DEFAULT_TO_EMAIL = "orionsoftlimited@gmail.com";
const DEFAULT_FROM_EMAIL = "Orion Soft Website <onboarding@resend.dev>";

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
  const replyTo = payload.email && /\S+@\S+\.\S+/.test(payload.email) ? payload.email : undefined;

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: buildSubject(payload.type),
        html: buildHtml(payload),
        text: buildText(payload),
        reply_to: replyTo,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      response.status(502).json({ ok: false, error: "Email delivery failed", detail: errorText });
      return;
    }

    const result = await resendResponse.json();
    response.status(200).json({ ok: true, id: result.id });
  } catch (err) {
    response.status(500).json({ ok: false, error: "Internal error", detail: err.message });
  }
}