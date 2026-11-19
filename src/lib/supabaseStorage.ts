/**
 * Public URL helpers for Supabase storage buckets.
 * Requires VITE_SUPABASE_URL in .env (e.g. https://xxxx.supabase.co).
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ARTWORKS_BUCKET = "artworks";
const ARTISTS_BUCKET = "artists";

/**
 * Returns the public URL for an object in a public storage bucket.
 * If `pathOrUrl` is already an absolute URL, it is returned as-is.
 */
export function getStoragePublicUrl(bucket: string, pathOrUrl: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!SUPABASE_URL?.trim()) return raw;
  const normalized = raw.startsWith("/") ? raw.slice(1) : raw;
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${normalized}`;
}

/**
 * Returns the public URL for an image in the Supabase bucket "artworks".
 * @param path - Object path inside the bucket (e.g. "folder/image.jpg"). No leading slash.
 * @returns Full public URL, or the original path if Supabase URL is not configured.
 */
export function getArtworkImagePublicUrl(path: string): string {
  return getStoragePublicUrl(ARTWORKS_BUCKET, path);
}

/** Public URL for files in the "artists" bucket (or absolute URLs already stored). */
export function getArtistImagePublicUrl(path: string): string {
  return getStoragePublicUrl(ARTISTS_BUCKET, path);
}

export function resolveAdminImageSrc(
  pathOrUrl: string | null | undefined,
  bucket: "artworks" | "artists" = "artworks",
): string | null {
  const raw = pathOrUrl?.trim();
  if (!raw) return null;
  return getStoragePublicUrl(bucket, raw);
}
