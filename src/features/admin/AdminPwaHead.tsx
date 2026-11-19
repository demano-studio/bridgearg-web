import { Helmet } from "react-helmet-async";
import { ADMIN_PWA } from "@/features/admin/useAdminPwa";

/** iOS / theme meta + manifest — only mounted under AdminApp (never on the public site). */
export function AdminPwaHead() {
  return (
    <Helmet>
      <html lang="es" />
      <meta name="theme-color" content={ADMIN_PWA.themeColor} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="bridgearg" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="application-name" content="bridgearg" />
      <link rel="manifest" href={ADMIN_PWA.manifestHref} />
      <link rel="apple-touch-icon" href={ADMIN_PWA.appleTouchIcon} />
      <title>bridgearg</title>
    </Helmet>
  );
}
