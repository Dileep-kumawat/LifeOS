import { useState } from "react";
import { notificationsApi } from "../api/notificationsApi";
import {
  clearStoredPushEndpoint,
  currentPermission,
  getApplicationServerKey,
  getStoredPushEndpoint,
  isNotificationSupported,
  requestBrowserPermission,
  serviceWorkerSupported,
  storePushEndpoint
} from "../lib/push";

export type PushPermissionStatus = "unsupported" | "default" | "granted" | "subscribed" | "denied";

export interface UsePushPermission {
  status: PushPermissionStatus;
  isUpdating: boolean;
  error: string | null;
  /** Opt-in: called ONLY from an explicit user button click. */
  request: () => Promise<void>;
  /** Opt-out: removes the backend subscription and unsubscribes the device. */
  disable: () => Promise<void>;
}

function initialStatus(): PushPermissionStatus {
  const permission = currentPermission();
  if (permission === null || !serviceWorkerSupported()) return "unsupported";
  if (permission === "denied") return "denied";
  if (permission === "granted") {
    return getStoredPushEndpoint() ? "subscribed" : "granted";
  }
  return "default";
}

/**
 * Web Push permission state machine. Critically, it NEVER calls a browser
 * permission API during initialisation — `initialStatus` only *reads*
 * `Notification.permission`. The browser prompt (and `pushManager.subscribe`)
 * happen exclusively inside `request`, which must be wired to a user click.
 */
export function usePushPermission(): UsePushPermission {
  const [status, setStatus] = useState<PushPermissionStatus>(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(): Promise<void> {
    if (isUpdating) return;
    setIsUpdating(true);
    setError(null);

    try {
      if (!isNotificationSupported() || !serviceWorkerSupported()) {
        setStatus("unsupported");
        return;
      }

      // The single explicit call that may surface the browser permission prompt.
      const permission = await requestBrowserPermission();
      if (permission !== "granted") {
        setStatus(currentPermission() === "denied" ? "denied" : "default");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscriptionOptions = (() => {
        const key = getApplicationServerKey();
        return key
          ? { userVisibleOnly: true, applicationServerKey: key }
          : { userVisibleOnly: true };
      })();

      const subscription = await registration.pushManager.subscribe(subscriptionOptions);
      const json = subscription.toJSON();

      await notificationsApi.registerPushSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? ""
        }
      });

      storePushEndpoint(subscription.endpoint);
      setStatus("subscribed");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Notifications could not be enabled. Check your browser settings and try again."
      );
      setStatus(currentPermission() === "denied" ? "denied" : "granted");
    } finally {
      setIsUpdating(false);
    }
  }

  async function disable(): Promise<void> {
    if (isUpdating) return;
    setError(null);

    const endpoint = getStoredPushEndpoint();
    if (endpoint) {
      try {
        await notificationsApi.unregisterPushSubscription(endpoint);
      } catch {
        /* best-effort — the device can no longer receive pushes anyway */
      }
      clearStoredPushEndpoint();
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    } catch {
      /* ignore — still reflect the opted-out state below */
    }

    setStatus(currentPermission() === "granted" ? "granted" : "default");
  }

  return { status, isUpdating, error, request, disable };
}
