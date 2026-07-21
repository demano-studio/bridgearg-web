import { OptimizedImage } from "@/components/OptimizedImage";

export interface WorkImageProps {
  /** Raw image reference (slug, path, or full URL). Resolved via Supabase-aware helper. */
  imagenUrl: string;
  /** Work title — used for alt (with artistName) for SEO / Google Images. */
  title: string;
  /** Artist name — used for alt: "{title} – {artistName}". */
  artistName: string;
  /** Classes applied to the outer image container. */
  className?: string;
  /** Extra classes on the inner img (e.g. hover, filters). */
  imageClassName?: string;
}

/**
 * Work/artwork image delegating in the unified OptimizedImage component.
 * Keeps existing usages working while centralizing logic in OptimizedImage.
 */
export function WorkImage({ imagenUrl, title, artistName, className = "", imageClassName = "" }: WorkImageProps) {
  return (
    <OptimizedImage
      src={imagenUrl}
      title={title}
      artistName={artistName}
      variant="artwork"
      className={className}
      imageClassName={imageClassName}
    />
  );
}
