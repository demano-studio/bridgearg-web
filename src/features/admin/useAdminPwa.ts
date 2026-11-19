import * as React from "react";

const MANIFEST_HREF = "/admin/manifest.webmanifest";
const SW_URL = "/admin/sw.js";
/** Must stay under the SW script directory (/admin/). */
const SW_SCOPE = "/admin/";

/**
 * Registers the admin-only service worker while AdminApp is mounted.
 * Does not run on the public site. Cleanup unregisters this SW when leaving /admin
 * in the SPA (optional; scope already limits control to /admin/).
 */
export function useAdminPwa() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
        if (cancelled) return;
        // Ensure updates apply promptly on next visit.
        void reg.update();
      } catch (err) {
        console.warn("[admin-pwa] SW register failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}

export const ADMIN_PWA = {
  manifestHref: MANIFEST_HREF,
  themeColor: "#1e1517",
  backgroundColor: "#fcf8ea",
  appleTouchIcon: "/admin/icons/icon-180.png",
} as const;
