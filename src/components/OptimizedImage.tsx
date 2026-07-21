import { useState } from "react";
import { getWorkImageUrl } from "@/lib/work-images";

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
}

/**
 * Unified, optimized image component with:
 * - Blur placeholder.
 * - Supabase "artworks" bucket support when variant="artwork".
 * - SEO-friendly alt: "Title – Artist" when both are provided.
 *
 * When migrating to next/image, the internal <img> can be swapped
 * for <Image> here sin tocar el resto del código.
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
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  const resolvedSrc = variant === "artwork" ? getWorkImageUrl(src) : src;

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
          backgroundImage: `url(${resolvedSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px)",
          transform: "scale(1.05)",
        }}
        aria-hidden
      />
      <img
        src={resolvedSrc}
        alt={resolvedAlt}
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${imageClassName}`}
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (logSrcOnError) {
            console.log("[OptimizedImage] Failed to load image src:", resolvedSrc);
          }
        }}
      />
    </div>
  );
}

