// Public, non-secret auth configuration for the sign-in screens. Keeping the
// Google client id server-side means it's set once (GOOGLE_CLIENT_ID on
// Railway) instead of also needing a rebuild-time VITE_ variable.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.json({ ok: true, googleClientId: process.env.GOOGLE_CLIENT_ID || "" });
}
