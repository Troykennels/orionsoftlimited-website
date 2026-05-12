const DEFAULT_TO_EMAIL = "orionsoftlimited@gmail.com";
const DEFAULT_FROM_EMAIL = "Orion Soft Website <onboarding@resend.dev>";
const SENSITIVE_FIELDS = new Set(["password", "confirmPassword", "passwordConfirmation"]);

function json(response, status, data) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.send(JSON.stringify(data));
}

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
    .filter(([key]) => !SENSITIVE_FIELDS.has(key))
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
    .map(([key, value]) => [key, `${value}`]);
}

function stripSensitiveFields(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !SENSITIVE_FIELDS.has(key)),
  );
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

async function readPayload(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string" && request.body.trim()) return JSON.parse(request.body);

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method === "GET") {
    json(response, 200, {
      ok: true,
      emailServiceConfigured: Boolean(process.env.RESEND_API_KEY),
      toEmailConfigured: Boolean(process.env.FORM_TO_EMAIL),
      fromEmailConfigured: Boolean(process.env.FORM_FROM_EMAIL),
    });
    return;
  }

  if (request.method !== "POST") {
    json(response, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    json(response, 503, { ok: false, error: "Email service not configured" });
    return;
  }

  let payload;
  try {
    payload = stripSensitiveFields(await readPayload(request));
  } catch {
    json(response, 400, { ok: false, error: "Invalid JSON payload" });
    return;
  }

  if (payload.website) {
    json(response, 200, { ok: true, ignored: true });
    return;
  }

  if (!payload.type) {
    json(response, 400, { ok: false, error: "Missing submission type" });
    return;
  }

  const to = process.env.FORM_TO_EMAIL || DEFAULT_TO_EMAIL;
  const from = process.env.FORM_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const replyTo = payload.email && /\S+@\S+\.\S+/.test(payload.email) ? payload.email : undefined;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
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
    json(response, 502, { ok: false, error: "Email delivery failed", detail: errorText });
    return;
  }

  const result = await resendResponse.json();
  json(response, 200, { ok: true, id: result.id });
}
