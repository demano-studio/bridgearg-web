// scripts/generate-sitemap.mjs
// Genera sitemap.xml y robots.txt en dist/ a partir del catálogo en Supabase.
// Corre automáticamente vía "postbuild" después de "vite build".
//
// Usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (públicas, solo lectura).
// En Vercel ya están en el entorno del build; en local exportalas o usá el .env del proyecto.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getCatalogRoutes } from "./get-routes.mjs";

const SITE = "https://www.bridgearg.net";
const OUT_DIR = "dist";

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(urls) {
  const body = urls
    .map(
      (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function buildRobots() {
  return `User-agent: *
Allow: /
Disallow: /admin
Sitemap: ${SITE}/sitemap.xml
`;
}

function toAbsoluteUrl(path) {
  if (path === "/") return `${SITE}/`;
  return `${SITE}${path}`;
}

async function main() {
  console.log("Generando sitemap.xml y robots.txt…");

  const { paths, artistCount, artworkCount } = await getCatalogRoutes();
  const urls = paths.map(toAbsoluteUrl);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "sitemap.xml"), buildSitemap(urls), "utf8");
  await writeFile(join(OUT_DIR, "robots.txt"), buildRobots(), "utf8");

  console.log(
    `OK  dist/sitemap.xml (${urls.length} URLs: ${artistCount} artists, ${artworkCount} artworks)`
  );
  console.log(`OK  dist/robots.txt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
