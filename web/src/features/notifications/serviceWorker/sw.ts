/// <reference lib="webworker" />
/**
 * LifeOS service worker — receives web-push events and displays them with the
 * Notification API. A `notificationclick` handler respects the same shared
 * `getDeepLinkUrl(notification)` helper used by the in-app NotificationPanel,
 * so deep-linking is defined in exactly one place.
 *
 * This file is the canonical source. It is bundled to `public/sw.js` by
 * `npm run sw:build` (esbuild) so the shipped artifact is plain JS.
 */
import { getDeepLinkUrl, type DeepLinkSource } from "../lib/deepLink";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  type?: string;
  data?: Record<string, unknown>;
}

function parsePushPayload(event: PushEvent): PushPayload {
  let raw: unknown = {};
  try {
    raw = event.data?.json() ?? {};
  } catch {
    raw = {};
  }
  if (raw && typeof raw === "object" && "notification" in (raw as Record<string, unknown>)) {
    raw = (raw as { notification: unknown }).notification;
  }
  return (raw ?? {}) as PushPayload;
}

self.addEventListener("push", (event) => {
  const data = parsePushPayload(event);

  const title = data.title || String(event.data?.text() ?? "") || "LifeOS";
  const options: NotificationOptions = {
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
      const url = getDeepLinkUrl((notification.data as DeepLinkSource) ?? {});
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

/**
 * Handle subscription rotation by the browser or push service.
 * Broadcasts the updated endpoint to any active client windows so they
 * can sync the new subscription with the backend.
 */
self.addEventListener("pushsubscriptionchange", (event: any) => {
  event.waitUntil(
    (async () => {
      try {
        const oldSubscription = event.oldSubscription;
        const newSubscription =
          event.newSubscription ||
          (await self.registration.pushManager.subscribe(oldSubscription?.options));

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
        /* Best-effort subscription renewal */
      }
    })()
  );
});
