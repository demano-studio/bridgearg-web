const OBJECT_PUBLIC_MARKER = "/storage/v1/object/public/";
const RENDER_PUBLIC_MARKER = "/storage/v1/render/image/public/";

export type TransformOptions = {
  width: number;
  quality?: number;
};

/** True si la URL es un objeto público de Supabase Storage. */
export function isSupabaseStorageObjectUrl(url: string): boolean {
  return typeof url === "string" && url.includes(OBJECT_PUBLIC_MARKER);
}

/**
 * Convierte `/storage/v1/object/public/...` en `/storage/v1/render/image/public/...?width=&quality=`.
 * Si no es una URL de Supabase Storage, la devuelve intacta.
 */
export function transformUrl(publicUrl: string, { width, quality = 75 }: TransformOptions): string {
  if (!isSupabaseStorageObjectUrl(publicUrl)) return publicUrl;

  const base = publicUrl.replace(OBJECT_PUBLIC_MARKER, RENDER_PUBLIC_MARKER);
  const url = new URL(base);
  url.searchParams.set("width", String(Math.max(1, Math.round(width))));
  url.searchParams.set("quality", String(quality));
  return url.toString();
}

/**
 * Genera un string `srcset` con varias anchuras vía Image Transformations.
 * Si la URL no es de Supabase Storage, devuelve string vacío.
 */
export function buildSrcSet(
  publicUrl: string,
  widths: number[] = [480, 800, 1200, 1600],
): string {
  if (!isSupabaseStorageObjectUrl(publicUrl)) return "";

  return widths
    .map((width) => `${transformUrl(publicUrl, { width })} ${width}w`)
    .join(", ");
}
