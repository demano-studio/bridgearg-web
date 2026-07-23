// scripts/home-hero-preload.mjs
// Preload LCP del primer fondo del carrusel home (BrandHeroSection → images.fondoJose).
// transformUrl espeja src/lib/imageTransform.ts (quality default 75).

const FONDO_JOSE =
  "https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/ui-assets/fondo_jose_2.jpg";

const OBJECT_PUBLIC_MARKER = "/storage/v1/object/public/";
const RENDER_PUBLIC_MARKER = "/storage/v1/render/image/public/";

/** @see src/lib/imageTransform.ts */
function transformUrl(publicUrl, { width, quality = 75 }) {
  if (typeof publicUrl !== "string" || !publicUrl.includes(OBJECT_PUBLIC_MARKER)) {
    return publicUrl;
  }
  const base = publicUrl.replace(OBJECT_PUBLIC_MARKER, RENDER_PUBLIC_MARKER);
  const url = new URL(base);
  url.searchParams.set("width", String(Math.max(1, Math.round(width))));
  url.searchParams.set("quality", String(quality));
  return url.toString();
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildHomeHeroPreloadTag() {
  const href = transformUrl(FONDO_JOSE, { width: 800 });
  const src800 = transformUrl(FONDO_JOSE, { width: 800 });
  const src1600 = transformUrl(FONDO_JOSE, { width: 1600 });
  const imagesrcset = `${src800} 800w, ${src1600} 1600w`;
  return (
    `<link rel="preload" as="image" href="${escapeAttr(href)}" ` +
    `imagesrcset="${escapeAttr(imagesrcset)}" imagesizes="100vw" fetchpriority="high" />`
  );
}

/** Quita cualquier preload de imagen y deja exactamente uno (home LCP). */
export function ensureHomeHeroPreload(html) {
  let out = html.replace(
    /<link\b[^>]*\brel=["']preload["'][^>]*\bas=["']image["'][^>]*\/?>/gi,
    "",
  );
  out = out.replace(
    /<link\b[^>]*\bas=["']image["'][^>]*\brel=["']preload["'][^>]*\/?>/gi,
    "",
  );

  const tag = buildHomeHeroPreloadTag();
  const headClose = out.indexOf("</head>");
  if (headClose === -1) return `${out}\n${tag}`;
  return `${out.slice(0, headClose)}    ${tag}\n  ${out.slice(headClose)}`;
}
