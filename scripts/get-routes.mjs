// scripts/get-routes.mjs
// Lista compartida de rutas públicas para sitemap y prerender.
// Usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (públicas, solo lectura).

import { createClient } from "@supabase/supabase-js";

const STATIC_PATHS = ["/", "/artworks", "/artists", "/about", "/contact"];

async function fetchAll(supabase, table, columns) {
  const out = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(columns).range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

/**
 * @returns {Promise<{
 *   paths: string[],
 *   artistCount: number,
 *   artworkCount: number,
 *   artists: Array<{ name: string, slug: string, bio: string | null, statement: string | null, profile_image_url: string | null }>,
 *   artworks: Array<{ id: number, title: string, image_url: string | null, price_usd: number | null, year: string | null, medium: string | null, artists: { name: string } | null }>,
 * }>}
 */
export async function getCatalogRoutes() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en el entorno.");
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const [artists, artworks] = await Promise.all([
    fetchAll(
      supabase,
      "artists",
      "name,slug,bio,statement,profile_image_url"
    ),
    fetchAll(
      supabase,
      "artworks",
      "id,title,image_url,price_usd,year,medium,artists(name)"
    ),
  ]);

  const artistPaths = artists
    .map((a) => a.slug)
    .filter(Boolean)
    .map((slug) => `/artists/${slug}`);

  const artworkPaths = artworks
    .map((a) => a.id)
    .filter((id) => id != null)
    .map((id) => `/artworks/${id}`);

  return {
    paths: [...STATIC_PATHS, ...artistPaths, ...artworkPaths],
    artistCount: artists.length,
    artworkCount: artworks.length,
    artists,
    artworks,
  };
}
