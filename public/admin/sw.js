/* BridgeARG Admin — minimal service worker for PWA installability only.
 * No offline caching yet (Phase A). Push listeners arrive in a later phase.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-only passthrough — required so the SW is considered active.
  event.respondWith(fetch(event.request));
});
