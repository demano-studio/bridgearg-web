import { getArtworkImagePublicUrl } from "@/lib/supabaseStorage";
import bridgeWork1 from "@/assets/bridgearg-work1.jpg";
import bridgeWork2 from "@/assets/bridgearg-work2.jpg";
import bridgeWork3 from "@/assets/bridgearg-work3.jpg";
import bridgeWork4 from "@/assets/bridgearg-work4.jpg";

const slugToImage: Record<string, string> = {
  "bridgearg-work1.jpg": bridgeWork1,
  "bridgearg-work2.jpg": bridgeWork2,
  "bridgearg-work3.jpg": bridgeWork3,
  "bridgearg-work4.jpg": bridgeWork4,
};

/**
 * Resolves work image URL: local asset by slug, or Supabase bucket "artworks" public URL, or URL as-is.
 */
export function getWorkImageUrl(imagenUrl: string): string {
  if (slugToImage[imagenUrl]) return slugToImage[imagenUrl];
  if (imagenUrl.startsWith("http://") || imagenUrl.startsWith("https://")) return imagenUrl;
  return getArtworkImagePublicUrl(imagenUrl);
}

export { getArtworkImagePublicUrl } from "@/lib/supabaseStorage";
