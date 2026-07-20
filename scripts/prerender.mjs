// scripts/prerender.mjs
// Prerenderiza las rutas públicas del catálogo con Playwright sobre dist/.
// Corre en postbuild después de generate-sitemap.mjs.
//
// Escribe HTML estático en dist/<ruta>/index.html (y dist/index.html para "/").
// No modifica el código de la app: solo lee el build y escribe HTML adicional.

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "playwright";
import { getCatalogRoutes } from "./get-routes.mjs";

const OUT_DIR = resolve("dist");
const PORT = Number(process.env.PRERENDER_PORT || 4173);
const ORIGIN = `http://127.0.0.1:${PORT}`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".map": "application/json",
};

function isInsideDist(filePath) {
  const resolved = resolve(filePath);
  return resolved === OUT_DIR || resolved.startsWith(OUT_DIR + sep);
}

function startStaticServer() {
  if (!existsSync(OUT_DIR)) {
    throw new Error(`No existe ${OUT_DIR}. Corré "vite build" antes del prerender.`);
  }

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url || "/", ORIGIN);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.includes("\0")) {
        res.writeHead(400).end("Bad request");
        return;
      }

      let filePath = join(OUT_DIR, pathname === "/" ? "index.html" : pathname);
      filePath = normalize(filePath);

      if (!isInsideDist(filePath)) {
        res.writeHead(403).end("Forbidden");
        return;
      }

      if (existsSync(filePath) && statSync(filePath).isDirectory()) {
        filePath = join(filePath, "index.html");
      }

      // SPA fallback: rutas de React sin HTML propio aún → dist/index.html
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        filePath = join(OUT_DIR, "index.html");
      }

      if (!isInsideDist(filePath) || !existsSync(filePath)) {
        res.writeHead(404).end("Not found");
        return;
      }

      const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      createReadStream(filePath).pipe(res);
    } catch (e) {
      console.error("Static server error:", e);
      res.writeHead(500).end("Server error");
    }
  });

  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolveListen(server));
  });
}

function outputPathForRoute(routePath) {
  if (routePath === "/") return join(OUT_DIR, "index.html");
  const clean = routePath.replace(/^\/+|\/+$/g, "");
  return join(OUT_DIR, clean, "index.html");
}

async function main() {
  console.log("Prerender: obteniendo rutas del catálogo…");
  const { paths, artistCount, artworkCount } = await getCatalogRoutes();
  console.log(
    `Prerender: ${paths.length} rutas (${artistCount} artists, ${artworkCount} artworks)`
  );

  const server = await startStaticServer();
  console.log(`Prerender: sirviendo ${OUT_DIR} en ${ORIGIN}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // Evitar que GTM/analytics mantengan la red ocupada y bloqueen networkidle
  await context.route("**/*", (route) => {
    const u = route.request().url();
    if (
      u.includes("googletagmanager.com") ||
      u.includes("google-analytics.com") ||
      u.includes("analytics.google.com") ||
      u.includes("doubleclick.net")
    ) {
      return route.abort();
    }
    return route.continue();
  });

  let ok = 0;
  let failed = 0;

  try {
    for (const routePath of paths) {
      const page = await context.newPage();
      const url = routePath === "/" ? `${ORIGIN}/` : `${ORIGIN}${routePath}`;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
        const html = await page.content();
        const outFile = outputPathForRoute(routePath);
        await mkdir(dirname(outFile), { recursive: true });
        await writeFile(outFile, html, "utf8");
        ok++;
        console.log(`ok  ${routePath} → ${outFile.replace(OUT_DIR + sep, "dist/")}`);
      } catch (e) {
        failed++;
        console.error(`FAIL ${routePath}:`, e instanceof Error ? e.message : e);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }

  console.log(`\nPrerender listo — OK: ${ok} | Fallidas: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
