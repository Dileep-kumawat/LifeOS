"use strict";
(() => {
  // src/features/notifications/lib/deepLink.ts
  function getDeepLinkUrl(notification) {
    const data = notification.payload?.data ?? {};
    if (typeof data.href === "string" && data.href.length > 0) {
      return data.href;
    }
    if (typeof data.deepLink === "string" && data.deepLink.length > 0) {
      return data.deepLink;
    }
    switch (notification.type) {
      case "calendar_reminder":
        return typeof data.eventId === "string" && data.eventId ? `/calendar?eventId=${encodeURIComponent(data.eventId)}` : "/calendar";
      case "habit_reminder":
        return typeof data.habitId === "string" && data.habitId ? `/habits?habitId=${encodeURIComponent(data.habitId)}` : "/habits";
      case "budget_alert":
        return typeof data.budgetId === "string" && data.budgetId ? `/finance?tab=budgets&budgetId=${encodeURIComponent(data.budgetId)}` : "/finance?tab=budgets";
      case "focus_session_alert":
        return "/focus";
      case "daily_summary":
        return "/dashboard";
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
      icon: data.icon || "/web-app-manifest-192x192.png",
      badge: data.badge || "/favicon-96x96.png",
      tag: `lifeos-${data.type ?? "alert"}`,
      data: {
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
        const origin = self.location.origin;
        const visible = clients.find((c) => {
          try {
            return c.visibilityState === "visible" && new URL(c.url).origin === origin;
          } catch {
            return false;
          }
        });
        const target = visible ?? clients.find((c) => {
          try {
            return new URL(c.url).origin === origin;
          } catch {
            return false;
          }
        });
        if (target) {
          await target.navigate(url);
          await target.focus();
        } else {
          await self.clients.openWindow(url);
        }
      })()
    );
  });
  self.addEventListener("pushsubscriptionchange", (event) => {
    event.waitUntil(
      (async () => {
        try {
          const oldSubscription = event.oldSubscription;
          const newSubscription = event.newSubscription || await self.registration.pushManager.subscribe(oldSubscription?.options);
          if (!newSubscription) return;
          const clients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
          });
          for (const client of clients) {
            client.postMessage({
              type: "PUSH_SUBSCRIPTION_CHANGED",
              endpoint: newSubscription.endpoint,
              subscription: newSubscription.toJSON()
            });
          }
        } catch {
        }
      })()
    );
  });
})();
