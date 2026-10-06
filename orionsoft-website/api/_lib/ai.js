// Small helper for AI writing (same provider as the website chatbot: Groq,
// GROQ_API_KEY). Returns null when AI isn't configured or fails, so every
// caller has a plain, non-AI fallback.
export const aiReady = () => !!process.env.GROQ_API_KEY;

// Reads an image (e.g. a receipt photo) and returns parsed JSON, or null.
export async function aiReadImage(instruction, imageDataUrl) {
  if (!aiReady() || !/^data:image\/(png|jpe?g|webp);base64,/.test(String(imageDataUrl || ""))) return null;
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 500, temperature: 0, response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: instruction }, { type: "image_url", image_url: { url: imageDataUrl } }] }],
      }),
    });
    if (!r.ok) { console.error("[ai-vision]", r.status, (await r.text()).slice(0, 200)); return null; }
    const text = (await r.json()).choices?.[0]?.message?.content || "";
    try { return JSON.parse(text.replace(/^```(json)?|```$/g, "").trim()); } catch { return null; }
  } catch (e) { console.error("[ai-vision]", e.message); return null; }
}

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
