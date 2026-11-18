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
  /** Classes for the <img> element (in addition to default object-fit). */
  imageClassName?: string;
  /** Log the resolved src if the image fails to load. */
  logSrcOnError?: boolean;
  /** CSS sizes attribute for responsive srcset. Default "100vw". */
  sizes?: string;
  /** When true (default), attach srcset for Supabase Storage URLs. */
  responsive?: boolean;
  /** Prefer eager load + high fetch priority (above the fold). */
  priority?: boolean;
  /**
   * CSS aspect-ratio for the outer container (e.g. "4/5").
   * Reserves height before the image loads to avoid CLS.
   * For layout="intrinsic", applied on the <img> instead.
   */
  aspectRatio?: string;
  /** CSS object-position for the <img> (and blur placeholder). Default "center". */
  objectPosition?: string;
  /**
   * - "cover" (default): absolute fill + object-cover (existing grids/cards).
   * - "intrinsic": natural image height, width 100%, no crop (artist works masonry).
   */
  layout?: "cover" | "intrinsic";
  /** Optional native width attribute (layout reservation). */
  width?: number;
  /** Optional native height attribute (layout reservation). */
  height?: number;
  /** Fired once the image has natural dimensions (for masonry height estimates). */
  onNaturalSize?: (naturalWidth: number, naturalHeight: number) => void;
}

/**
 * Unified, optimized image component with:
 * - Blur placeholder.
 * - Optional aspect-ratio box to reserve layout space (CLS).
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
  aspectRatio,
  objectPosition = "center",
  layout = "cover",
  width,
  height,
  onNaturalSize,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  const resolvedSrc = variant === "artwork" ? getWorkImageUrl(src) : src;
  const useTransforms = responsive && isSupabaseStorageObjectUrl(resolvedSrc);
  const displaySrc = useTransforms
    ? transformUrl(resolvedSrc, { width: 1200, quality: 75 })
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

  const handleLoad = (img: HTMLImageElement) => {
    setLoaded(true);
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      onNaturalSize?.(img.naturalWidth, img.naturalHeight);
    }
  };

  if (layout === "intrinsic") {
    return (
      <div className={`relative w-full ${className}`}>
        {!loaded && (
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              backgroundColor: "inherit",
              opacity: 1,
            }}
            aria-hidden
          />
        )}
        <img
          src={displaySrc}
          srcSet={srcSet || undefined}
          sizes={srcSet ? sizes : undefined}
          alt={resolvedAlt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className={`relative block h-auto w-full ${
            loaded ? "opacity-100" : "opacity-0"
          } ${imageClassName}`}
          style={{
            // Reserve space before load; once loaded, drop aspect-ratio so the
            // decoded image drives height (avoids stretch when DB/provisional ratio differs).
            aspectRatio: loaded ? undefined : aspectRatio || undefined,
            objectPosition,
            transition: "opacity 0.4s ease-out",
          }}
          onLoad={(e) => handleLoad(e.currentTarget)}
          onError={() => {
            if (logSrcOnError) {
              console.log("[OptimizedImage] Failed to load image src:", displaySrc);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-muted ${aspectRatio ? "" : "h-full"} ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Blur placeholder (same image, scaled + blurred) */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: loaded ? 0 : 1,
          backgroundImage: `url(${placeholderSrc})`,
          backgroundSize: "cover",
          backgroundPosition: objectPosition,
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
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${imageClassName}`}
        style={{ opacity: loaded ? 1 : 0, objectPosition }}
        onLoad={(e) => handleLoad(e.currentTarget)}
        onError={() => {
          if (logSrcOnError) {
            console.log("[OptimizedImage] Failed to load image src:", displaySrc);
          }
        }}
      />
    </div>
  );
}
