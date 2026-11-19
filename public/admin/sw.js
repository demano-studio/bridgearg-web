/* BridgeARG Admin — PWA SW (installability + Web Push). */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  let data = { title: "bridgearg", body: "Nueva alerta", url: "/admin/resumen" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (_e) {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch (_e2) {
      /* keep defaults */
    }
  }

  const title = typeof data.title === "string" && data.title.trim() ? data.title : "bridgearg";
  const body = typeof data.body === "string" ? data.body : "";
  const url = typeof data.url === "string" && data.url.startsWith("/admin") ? data.url : "/admin/resumen";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/admin/icons/icon-192.png",
      badge: "/admin/icons/icon-192.png",
      data: { url },
      tag: url,
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    event.notification && event.notification.data && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/admin/resumen";
  const absolute = new URL(target, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(absolute);
              return;
            } catch (_e) {
              /* fall through */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(absolute);
      }
    })(),
  );
});
