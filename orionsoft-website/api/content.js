// Public: the website content the admin has published. Loaded by every
// visitor's browser when the site opens (see src/lib/siteContent.js).
import { readAllContent, publicView } from "./_lib/content.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const content = publicView(await readAllContent());
    // Always fresh: a job the admin closes must disappear straight away.
    res.setHeader("Cache-Control", "no-cache");
    return res.json({ ok: true, content });
  } catch (err) {
    return res.status(500).json({ error: "Couldn't load site content", details: err.message });
  }
}
