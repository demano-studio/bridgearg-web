// scripts/snapshot-prerender.mjs
// Tras prerender.mjs (metas), levanta dist/, visita cada ruta con Playwright y
// sobrescribe el HTML con el DOM ya renderizado por React (contenido en #root).
// Si Chromium no está o algo falla, loggea SKIPPED y sale 0 (deploy sigue con metas).
// Local: una vez, `npx playwright install chromium`. En Vercel usa @sparticuz/chromium.

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { getCatalogRoutes } from "./get-routes.mjs";
import { ensureHomeHeroPreload } from "./home-hero-preload.mjs";

const OUT_DIR = resolve("dist");
const PORT = Number(process.env.SNAPSHOT_PORT || 4174);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const CONCURRENCY = Math.min(6, Math.max(1, Number(process.env.SNAPSHOT_CONCURRENCY || 4)));

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

function skip(reason, err) {
  const detail = err instanceof Error ? err.message : err ? String(err) : "";
  console.warn(
    `\n[snapshot-prerender] SKIPPED: ${reason}${detail ? ` — ${detail}` : ""}\n` +
      `[snapshot-prerender] Deploy continúa con el prerender de metas (sin HTML de React).\n`,
  );
  process.exit(0);
}

function isInsideDist(filePath) {
  const resolved = resolve(filePath);
  return resolved === OUT_DIR || resolved.startsWith(OUT_DIR + sep);
}

function outputPathForRoute(routePath) {
  if (routePath === "/") return join(OUT_DIR, "index.html");
  const clean = routePath.replace(/^\/+|\/+$/g, "");
  return join(OUT_DIR, clean, "index.html");
}

function startStaticServer() {
  if (!existsSync(OUT_DIR)) {
    throw new Error(`No existe ${OUT_DIR}. Corré "vite build" antes.`);
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
      console.error("[snapshot-prerender] Static server error:", e);
      res.writeHead(500).end("Server error");
    }
  });

  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolveListen(server));
  });
}

function metaChecks(html) {
  return {
    title: /<title>[^<]+<\/title>/i.test(html),
    canonical: /<link\s+rel=["']canonical["']/i.test(html),
    ogImage: /<meta\s+property=["']og:image["']/i.test(html),
    twitterCard: /<meta\s+name=["']twitter:card["']/i.test(html),
  };
}

/** Clave de dedupe para tags SEO que prerender + react-helmet duplican. */
function headDedupeKey(tag) {
  if (/^<link\b/i.test(tag) && /\brel=["']canonical["']/i.test(tag)) {
    return "link:canonical";
  }
  if (!/^<meta\b/i.test(tag)) return null;

  const prop = tag.match(/\bproperty=["'](og:[^"']+)["']/i);
  if (prop) return `meta:property:${prop[1].toLowerCase()}`;

  const name = tag.match(/\bname=["']([^"']+)["']/i);
  if (!name) return null;
  const n = name[1].toLowerCase();
  if (n === "description" || n.startsWith("twitter:")) return `meta:name:${n}`;
  return null;
}

/**
 * En <head>, si canonical / og:* / twitter:* / description aparecen más de una vez,
 * conserva solo la última (react-helmet).
 */
function dedupeHeadMetas(html) {
  const headOpenMatch = html.match(/<head\b[^>]*>/i);
  const headCloseIdx = html.search(/<\/head>/i);
  if (!headOpenMatch || headCloseIdx === -1) return html;

  const openEnd = headOpenMatch.index + headOpenMatch[0].length;
  if (openEnd > headCloseIdx) return html;

  let headInner = html.slice(openEnd, headCloseIdx);
  const tagRe = /<(?:link|meta)\b[^>]*>/gi;
  /** @type {Array<{ key: string, start: number, end: number }>} */
  const candidates = [];
  let m;
  while ((m = tagRe.exec(headInner)) !== null) {
    const key = headDedupeKey(m[0]);
    if (key) candidates.push({ key, start: m.index, end: m.index + m[0].length });
  }

  /** @type {Map<string, { key: string, start: number, end: number }>} */
  const lastByKey = new Map();
  for (const c of candidates) lastByKey.set(c.key, c);

  const toRemove = candidates
    .filter((c) => lastByKey.get(c.key) !== c)
    .sort((a, b) => b.start - a.start);

  for (const r of toRemove) {
    headInner = headInner.slice(0, r.start) + headInner.slice(r.end);
  }

  return html.slice(0, openEnd) + headInner + html.slice(headCloseIdx);
}

async function mapPool(items, concurrency, worker) {
  const results = [];
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function snapshotRoute(context, routePath) {
  const page = await context.newPage();
  const url = routePath === "/" ? `${ORIGIN}/` : `${ORIGIN}${routePath}`;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForFunction(
      () => {
        const root = document.getElementById("root");
        return Boolean(root && root.children && root.children.length > 0);
      },
      { timeout: 60_000 },
    );
    let html = dedupeHeadMetas(await page.content());
    // Home: reafirmar un solo preload LCP (snapshot no debe pisarlo ni duplicarlo).
    if (routePath === "/") {
      html = ensureHomeHeroPreload(html);
    }
    const checks = metaChecks(html);
    const missing = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    if (missing.length > 0) {
      console.warn(
        `[snapshot-prerender] WARN ${routePath}: faltan metas en snapshot: ${missing.join(", ")}`,
      );
    }

    const outFile = outputPathForRoute(routePath);
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, html, "utf8");
    console.log(`ok  ${routePath} → ${outFile.replace(OUT_DIR + sep, "dist" + sep)}`);
    return { ok: true, routePath };
  } finally {
    await page.close();
  }
}

async function main() {
  let server;
  let browser;

  try {
    console.log("[snapshot-prerender] Obteniendo rutas…");
    const { paths, artistCount, artworkCount } = await getCatalogRoutes();
    console.log(
      `[snapshot-prerender] ${paths.length} rutas (${artistCount} artists, ${artworkCount} artworks), concurrency=${CONCURRENCY}`,
    );

    server = await startStaticServer();
    console.log(`[snapshot-prerender] Sirviendo ${OUT_DIR} en ${ORIGIN}`);

    let chromium;
    try {
      ({ chromium } = await import("playwright"));
    } catch (e) {
      skip("playwright no está instalado", e);
      return;
    }

    try {
      browser = await chromium.launch({ headless: true });
    } catch (primerError) {
      try {
        const sparticuz = (await import("@sparticuz/chromium")).default;
        browser = await chromium.launch({
          executablePath: await sparticuz.executablePath(),
          args: sparticuz.args,
          headless: true,
        });
        console.log("[snapshot-prerender] usando Chromium autocontenido (@sparticuz)");
      } catch (segundoError) {
        skip("Chromium no disponible ni via @sparticuz (local: npx playwright install chromium)", segundoError);
        return;
      }
    }

    const context = await browser.newContext();
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

    await mapPool(paths, CONCURRENCY, async (routePath) => {
      try {
        await snapshotRoute(context, routePath);
        ok++;
      } catch (e) {
        failed++;
        console.error(
          `[snapshot-prerender] FAIL ${routePath}:`,
          e instanceof Error ? e.message : e,
        );
      }
    });

    console.log(`\n[snapshot-prerender] Listo — OK: ${ok} | Fallidas: ${failed}`);
    if (ok === 0 && paths.length > 0) {
      skip("ninguna ruta se pudo capturar");
    }
  } catch (e) {
    skip("error inesperado", e);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
    if (server) {
      await new Promise((r) => server.close(r));
    }
  }
}

main().catch((e) => skip("fallo no capturado", e));
