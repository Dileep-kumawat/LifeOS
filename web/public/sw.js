"use strict";
(() => {
  // src/features/notifications/lib/deepLink.ts
  function getDeepLinkUrl(notification) {
    const data = notification.payload?.data ?? {};
    if (typeof data.href === "string" && data.href.length > 0) {
      return data.href;
    }
    switch (notification.type) {
      case "calendar_reminder":
        return typeof data.eventId === "string" && data.eventId
          ? `/calendar?eventId=${encodeURIComponent(data.eventId)}`
          : "/calendar";
      case "habit_reminder":
        return typeof data.habitId === "string" && data.habitId
          ? `/habits?habitId=${encodeURIComponent(data.habitId)}`
          : "/habits";
      default:
        return "/";
    }
  }

  // src/features/notifications/serviceWorker/sw.ts
  self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });
  function parsePushPayload(event) {
    let raw = {};
    try {
      raw = event.data?.json() ?? {};
    } catch {
      raw = {};
    }
    if (raw && typeof raw === "object" && "notification" in raw) {
      raw = raw.notification;
    }
    return raw ?? {};
  }
  self.addEventListener("push", (event) => {
    const data = parsePushPayload(event);
    const title = data.title || String(event.data?.text() ?? "") || "LifeOS";
    const options = {
      body: data.body || "",
      icon: data.icon,
      badge: data.badge,
      tag: "lifeos",
      data: {
        // Keep only the deep-link payload the click handler needs.
        type: data.type ?? "system",
        payload: { data: data.data ?? {} }
      }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  });
  self.addEventListener("notificationclick", (event) => {
    const notification = event.notification;
    notification.close();
    event.waitUntil(
      (async () => {
        const url = getDeepLinkUrl(notification.data ?? {});
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true
        });
        const visible = clients.find((c) => c.visibilityState === "visible");
        const target = visible ?? clients[0];
        if (target) {
          await target.navigate(url);
          await target.focus();
        } else {
          await self.clients.openWindow(url);
        }
      })()
    );
  });
})();
