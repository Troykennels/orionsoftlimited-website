// Railway entrypoint — API-only backend. The static frontend and the
// orionsoftlimited.com domain stay on Vercel; vercel.json rewrites /api/*
// to this service so the browser only ever talks to one origin (no CORS or
// cross-origin cookie concerns). This dynamically mounts every existing
// api/*.js handler at its Vercel-equivalent path — no handler logic changes,
// only the hosting/wiring layer is new, and the files stay valid on Vercel
// too if ever needed again.
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, "api");
const WEBHOOK_PATH = "/api/payments/webhook";

const app = express();

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// JSON body parsing for every route except the Paystack webhook, which must
// read the raw, unparsed request stream itself to verify the HMAC signature.
app.use((req, res, next) => {
  if (req.path === WEBHOOK_PATH) return next();
  express.json({ limit: "5mb" })(req, res, next);
});

app.get("/health", (req, res) => res.json({ ok: true }));

// Recursively discover every api/*.js handler (skipping api/_lib/, which
// holds shared helpers, not routes) and mount it at the same path Vercel
// would have used, e.g. api/admin/contracts.js -> /api/admin/contracts.
function collectRouteFiles(dir, base = "") {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_")) continue;
    const full = path.join(dir, entry.name);
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(full, relative));
    } else if (entry.name.endsWith(".js")) {
      files.push({ full, relative });
    }
  }
  return files;
}

async function mountApiRoutes() {
  const routeFiles = collectRouteFiles(API_DIR);
  for (const { full, relative } of routeFiles) {
    const routePath = "/api/" + relative.replace(/\.js$/, "");
    const mod = await import(pathToFileURL(full).href);
    const handler = mod.default;
    if (typeof handler !== "function") continue;
    app.all(routePath, (req, res) => handler(req, res));
    console.log(`Mounted ${routePath}`);
  }
}

async function start() {
  await mountApiRoutes();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Orion Soft API server listening on port ${port}`));
}

start();
