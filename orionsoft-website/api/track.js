// Lightweight page view + event tracker
// Called from frontend on every page navigation — no auth required
import { incr, hincr } from "./store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { page = "/", referrer = "", event = "pageview" } = req.body || {};

  // Total visit counter
  await incr("orionsoft:visits:total");

  if (event === "pageview") {
    // Per-page counter
    const safe = page.replace(/[^a-zA-Z0-9/_-]/g, "_").slice(0, 100) || "home";
    await hincr("orionsoft:visits:pages", safe);
  }

  // Don't expose anything — just acknowledge
  return res.status(200).json({ ok: true });
}
