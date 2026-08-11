/**
 * Single source of truth for turning a notification into a deep link.
 *
 * Used in two places — the in-app NotificationPanel (react-router navigate)
 * and the service worker's `notificationclick` handler (clients.openWindow) —
 * so the route mapping is never duplicated.
 *
 * The `data` payload object is the same shape produced by the backend
 * notification worker: `{ eventId?, habitId?, href?, ... }`. An explicit
 * `href` wins; otherwise the notification `type` drives the route.
 */
export interface DeepLinkSource {
  type?: string;
  payload?: {
    data?: Record<string, unknown> | null;
  };
}

export function getDeepLinkUrl(notification: DeepLinkSource): string {
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
