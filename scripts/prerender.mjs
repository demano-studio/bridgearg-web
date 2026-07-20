// scripts/prerender.mjs
// Inyecta meta tags SEO en copias estáticas de dist/index.html por cada ruta del catálogo.
// Corre en postbuild después de generate-sitemap.mjs.
// Sin Playwright ni servidor: solo lee la plantilla, reemplaza tags y escribe HTML en dist/.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { getCatalogRoutes } from "./get-routes.mjs";

const OUT_DIR = resolve("dist");
const SITE_NAME = "BRIDGEARG";
const SITE_URL = "https://www.bridgearg.net";
const DEFAULT_DESCRIPTION =
  "Curating and connecting extraordinary Argentine contemporary art with global collectors. From Córdoba to the world.";
const DEFAULT_OG_IMAGE = "https://www.bridgearg.net/assets/ui/new-hero-bg.jpg";

/** Mismos title/description que pasan a <SEO> en los componentes React. */
const STATIC_META = {
  "/": {
    title: "Contemporary Argentine Art",
    description:
      "Curating and connecting extraordinary Argentine contemporary art with global collectors. From Córdoba to the world.",
  },
  "/artworks": {
    title: "Collection",
    description: "Explore our collection of works by contemporary Argentine artists.",
  },
  "/artists": {
    title: "Artists",
    description: "Discover contemporary Argentine artists represented by BridgeArg.",
  },
  "/about": {
    title: "About",
    description:
      "Learn about BridgeArg, the gallery connecting Argentine contemporary art with global collectors.",
  },
  "/contact": {
    title: "Contact",
    description: "Get in touch with BridgeArg for artist inquiries, acquisitions, and more.",
  },
};

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPriceUSD(amountUsd) {
  return `USD ${Number(amountUsd).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function fullTitle(title) {
  return title ? `${title} — ${SITE_NAME}` : SITE_NAME;
}

function absoluteUrl(path) {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path}`;
}

function outputPathForRoute(routePath) {
  if (routePath === "/") return join(OUT_DIR, "index.html");
  const clean = routePath.replace(/^\/+|\/+$/g, "");
  return join(OUT_DIR, clean, "index.html");
}

/** Reemplaza un tag por prefijo exacto (sin regex). Si no existe, lo inserta antes de </head>. */
function replaceOrInsertTag(html, prefix, newTag) {
  const start = html.indexOf(prefix);
  if (start === -1) {
    const headClose = html.indexOf("</head>");
    if (headClose === -1) return html + "\n" + newTag;
    return html.slice(0, headClose) + `    ${newTag}\n  ` + html.slice(headClose);
  }

  if (prefix === "<title>") {
    const close = html.indexOf("</title>", start);
    if (close === -1) return html;
    return html.slice(0, start) + newTag + html.slice(close + "</title>".length);
  }

  const end = html.indexOf(">", start);
  if (end === -1) return html;
  return html.slice(0, start) + newTag + html.slice(end + 1);
}

function applyMeta(html, { title, description, image, url }) {
  const t = fullTitle(title);
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_OG_IMAGE;
  const loc = absoluteUrl(url);

  let out = html;
  out = replaceOrInsertTag(out, "<title>", `<title>${escapeAttr(t)}</title>`);
  out = replaceOrInsertTag(
    out,
    '<meta name="description"',
    `<meta name="description" content="${escapeAttr(desc)}" />`
  );
  out = replaceOrInsertTag(
    out,
    '<meta property="og:title"',
    `<meta property="og:title" content="${escapeAttr(t)}" />`
  );
  out = replaceOrInsertTag(
    out,
    '<meta property="og:description"',
    `<meta property="og:description" content="${escapeAttr(desc)}" />`
  );
  out = replaceOrInsertTag(
    out,
    '<meta property="og:image"',
    `<meta property="og:image" content="${escapeAttr(img)}" />`
  );
  out = replaceOrInsertTag(
    out,
    '<meta property="og:url"',
    `<meta property="og:url" content="${escapeAttr(loc)}" />`
  );
  out = replaceOrInsertTag(
    out,
    '<meta name="twitter:image"',
    `<meta name="twitter:image" content="${escapeAttr(img)}" />`
  );
  return out;
}

function buildPageMetas({ artists, artworks }) {
  /** @type {Array<{ path: string, title: string, description: string, image?: string | null, url: string }>} */
  const pages = [];

  for (const [path, meta] of Object.entries(STATIC_META)) {
    pages.push({
      path,
      title: meta.title,
      description: meta.description,
      image: null,
      url: path,
    });
  }

  for (const artist of artists) {
    if (!artist.slug) continue;
    const path = `/artists/${artist.slug}`;
    pages.push({
      path,
      title: artist.name,
      description:
        artist.bio ??
        `Works and biography of ${artist.name}, contemporary Argentine artist.`,
      image: artist.image_url?.trim() || null,
      url: path,
    });
  }

  for (const work of artworks) {
    if (work.id == null) continue;
    const path = `/artworks/${work.id}`;
    const artistName = work.artists?.name?.trim() || "Unknown artist";
    const priceDisplay = formatPriceUSD(work.price_usd ?? 0);
    const yearMedium = [work.year, work.medium].filter(Boolean).join(" · ");
    pages.push({
      path,
      title: work.title,
      description: `${artistName} · ${yearMedium} · ${priceDisplay}`,
      image: work.image_url?.startsWith("http") ? work.image_url : null,
      url: path,
    });
  }

  return pages;
}

async function main() {
  try {
    console.log("Prerender (meta): leyendo plantilla dist/index.html…");
    const template = await readFile(join(OUT_DIR, "index.html"), "utf8");

    console.log("Prerender (meta): obteniendo catálogo…");
    const catalog = await getCatalogRoutes();
    const pages = buildPageMetas(catalog);

    let ok = 0;
    let failed = 0;

    for (const page of pages) {
      try {
        const html = applyMeta(template, page);
        const outFile = outputPathForRoute(page.path);
        await mkdir(dirname(outFile), { recursive: true });
        await writeFile(outFile, html, "utf8");
        ok++;
        console.log(`ok  ${page.path} → ${outFile.replace(OUT_DIR + sep, "dist" + sep)}`);
      } catch (e) {
        failed++;
        console.error(`FAIL ${page.path}:`, e instanceof Error ? e.message : e);
      }
    }

    console.log(
      `\nPrerender (meta) listo — OK: ${ok} | Fallidas: ${failed} (${catalog.artistCount} artists, ${catalog.artworkCount} artworks)`
    );
  } catch (e) {
    console.error("Prerender falló, se sigue con el build sin prerenderizar:", e);
    process.exit(0);
  }
}

main();
