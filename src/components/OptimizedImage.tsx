import { useState } from "react";
import { getWorkImageUrl } from "@/lib/work-images";
import { buildSrcSet, isSupabaseStorageObjectUrl, transformUrl } from "@/lib/imageTransform";

export interface OptimizedImageProps {
  /** Raw image reference: URL, imported asset, or artworks slug. */
  src: string;
  /** Optional work title, used for SEO-friendly alt when combined with artistName. */
  title?: string;
  /** Optional artist name, used for SEO-friendly alt when combined with title. */
  artistName?: string;
  /** Explicit alt; if provided, it takes precedence over title/artistName. */
  alt?: string;
  /**
   * Variant:
   * - "artwork": resolve via Supabase-aware helper (getWorkImageUrl).
   * - "plain": use src as-is (for UI/brand images).
   */
  variant?: "artwork" | "plain";
  /** Classes for the outer container (controls size/rounding). */
  className?: string;
  /** Classes for the <img> element (in addition to object-cover + transitions). */
  imageClassName?: string;
  /** Log the resolved src if the image fails to load. */
  logSrcOnError?: boolean;
  /** CSS sizes attribute for responsive srcset. Default "100vw". */
  sizes?: string;
  /** When true (default), attach srcset for Supabase Storage URLs. */
  responsive?: boolean;
  /** Prefer eager load (above the fold). */
  priority?: boolean;
}

/**
 * Unified, optimized image component with:
 * - Blur placeholder.
 * - Supabase "artworks" bucket support when variant="artwork".
 * - Responsive srcset via Supabase Image Transformations when applicable.
 * - SEO-friendly alt: "Title – Artist" when both are provided.
 */
export function OptimizedImage({
  src,
  title,
  artistName,
  alt,
  variant = "plain",
  className = "",
  imageClassName = "",
  logSrcOnError = false,
  sizes = "100vw",
  responsive = true,
  priority = false,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  const resolvedSrc = variant === "artwork" ? getWorkImageUrl(src) : src;
  const useTransforms = responsive && isSupabaseStorageObjectUrl(resolvedSrc);
  const displaySrc = useTransforms
    ? transformUrl(resolvedSrc, { width: 800 })
    : resolvedSrc;
  const srcSet = useTransforms ? buildSrcSet(resolvedSrc) : undefined;
  const placeholderSrc = useTransforms
    ? transformUrl(resolvedSrc, { width: 48, quality: 40 })
    : resolvedSrc;

  const resolvedAlt =
    alt ??
    (title
      ? artistName
        ? `${title} – ${artistName}`
        : title
      : "");

  return (
    <div className={`relative h-full w-full overflow-hidden bg-muted ${className}`}>
      {/* Blur placeholder (same image, scaled + blurred) */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: loaded ? 0 : 1,
          backgroundImage: `url(${placeholderSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px)",
          transform: "scale(1.05)",
        }}
        aria-hidden
      />
      <img
        src={displaySrc}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt={resolvedAlt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${imageClassName}`}
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (logSrcOnError) {
            console.log("[OptimizedImage] Failed to load image src:", displaySrc);
          }
        }}
      />
    </div>
  );
}
