/**
 * Public URL for files in the Supabase storage bucket "artworks".
 * Requires VITE_SUPABASE_URL in .env (e.g. https://xxxx.supabase.co).
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const BUCKET = "artworks";

/**
 * Returns the public URL for an image in the Supabase bucket "artworks".
 * @param path - Object path inside the bucket (e.g. "folder/image.jpg"). No leading slash.
 * @returns Full public URL, or the original path if Supabase URL is not configured.
 */
export function getArtworkImagePublicUrl(path: string): string {
  if (!SUPABASE_URL?.trim()) return path;
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${normalized}`;
}
