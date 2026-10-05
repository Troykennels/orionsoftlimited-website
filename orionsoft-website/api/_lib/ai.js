// Small helper for AI writing (same provider as the website chatbot: Groq,
// GROQ_API_KEY). Returns null when AI isn't configured or fails, so every
// caller has a plain, non-AI fallback.
export const aiReady = () => !!process.env.GROQ_API_KEY;

export async function aiComplete(system, user, { maxTokens = 900, json = false } = {}) {
  if (!aiReady()) return null;
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        max_tokens: maxTokens, temperature: 0.3, reasoning_effort: "low",
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!r.ok) { console.error("[ai]", r.status, (await r.text()).slice(0, 200)); return null; }
    const text = (await r.json()).choices?.[0]?.message?.content || "";
    const clean = text.replace(/—/g, ", ").trim();
    if (!json) return clean;
    try { return JSON.parse(clean.replace(/^```(json)?|```$/g, "")); } catch { return null; }
  } catch (e) { console.error("[ai]", e.message); return null; }
}
