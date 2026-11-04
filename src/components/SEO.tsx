import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  /** When true, use `title` as-is (no " — BRIDGEARG" suffix). */
  exactTitle?: boolean;
}

const SITE_NAME = "BRIDGEARG";
const DEFAULT_DESCRIPTION =
  "Curating and connecting extraordinary Argentine contemporary art with global collectors. From Córdoba to the world.";
const SITE_URL = "https://www.bridgearg.net";
const DEFAULT_OG_IMAGE = "https://www.bridgearg.net/assets/ui/og-cover.jpg";

export function SEO({
  title,
  description,
  image,
  url,
  type = "website",
  exactTitle = false,
}: SEOProps) {
  const fullTitle = !title ? SITE_NAME : exactTitle ? title : `${title} — ${SITE_NAME}`;
  const metaDescription = description ?? DEFAULT_DESCRIPTION;
  const metaUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const metaImage = image ?? DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="robots" content="index, follow" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={metaUrl} />
      <link rel="canonical" href={metaUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={metaImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={metaImage} />
    </Helmet>
  );
}

