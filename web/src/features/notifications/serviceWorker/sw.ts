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
      const url = getDeepLinkUrl((notification.data as DeepLinkSource) ?? {});
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
