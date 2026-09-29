import { useEffect, useState } from "react";
import { notificationsApi } from "../api/notificationsApi";
import {
  clearStalePushSubscription,
  clearStoredPushEndpoint,
  currentPermission,
  getApplicationServerKey,
  getStoredPushEndpoint,
  isBraveBrowser,
  isIOS,
  isNotificationSupported,
  isStandalonePWA,
  requestBrowserPermission,
  serviceWorkerSupported,
  storePushEndpoint
} from "../lib/push";

export type PushPermissionStatus = "unsupported" | "default" | "granted" | "subscribed" | "denied";
export type PushDeviceState = "registered" | "not_registered" | "blocked" | "unsupported";

export interface UsePushPermission {
  status: PushPermissionStatus;
  deviceState: PushDeviceState;
  isUpdating: boolean;
  isSendingTest: boolean;
  error: string | null;
  /** Opt-in: called ONLY from an explicit user button click. */
  request: () => Promise<void>;
  /** Opt-out: removes the backend subscription and unsubscribes the device. */
  disable: () => Promise<void>;
  /** Sends an immediate test notification via backend */
  sendTest: () => Promise<{ success: boolean; message: string }>;
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
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reconcile subscription state with the actual browser ServiceWorker PushManager on mount
  useEffect(() => {
    let isMounted = true;

    async function reconcile() {
      if (!isNotificationSupported() || !serviceWorkerSupported()) {
        setStatus("unsupported");
        return;
      }
      const perm = currentPermission();
      if (perm === "denied") {
        setStatus("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (!isMounted) return;

        if (sub) {
          storePushEndpoint(sub.endpoint);
          setStatus("subscribed");
        } else {
          clearStoredPushEndpoint();
          setStatus(perm === "granted" ? "granted" : "default");
        }
      } catch {
        /* non-fatal */
      }
    }

    reconcile();
    return () => {
      isMounted = false;
    };
  }, []);

  async function request(): Promise<void> {
    if (isUpdating) return;
    setIsUpdating(true);
    setError(null);

    try {
      if (!isNotificationSupported() || !serviceWorkerSupported()) {
        if (isIOS() && !isStandalonePWA()) {
          throw new Error("On iOS, push notifications require adding LifeOS to your Home Screen first via the Share menu (Share → Add to Home Screen).");
        }
        setStatus("unsupported");
        setError("This browser does not support Web Push notifications.");
        return;
      }

      // The single explicit call that may surface the browser permission prompt.
      const permission = await requestBrowserPermission();
      if (permission !== "granted") {
        const isDenied = currentPermission() === "denied";
        setStatus(isDenied ? "denied" : "default");
        if (isDenied) {
          setError("Notifications are blocked. Please enable them in your browser's site settings.");
        }
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Defensive cleanup: remove any stale subscription before re-subscribing
      await clearStalePushSubscription(registration);

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
    } catch (err: unknown) {
      const isBrave = await isBraveBrowser();
      const errName = (err as { name?: string })?.name;
      const errMsg = (err as { message?: string })?.message || "";
      const isAbortError = errName === "AbortError" || /push service error|abort/i.test(errMsg);

      let friendlyMessage = "Notifications could not be enabled. Check your browser settings and try again.";

      if (isBrave && isAbortError) {
        friendlyMessage =
          "Brave blocks push by default. Go to brave://settings/privacy, enable 'Use Google services for push messaging', restart Brave, then try again.";
      } else if (isIOS() && !isStandalonePWA()) {
        friendlyMessage =
          "On iOS, push notifications require adding LifeOS to your Home Screen first via the Share menu (Share → Add to Home Screen).";
      } else if (currentPermission() === "denied" || errName === "NotAllowedError") {
        friendlyMessage = "Notifications are blocked. Please enable them in your browser's site settings.";
      } else if (errMsg) {
        friendlyMessage = errMsg;
      }

      setError(friendlyMessage);
      setStatus(currentPermission() === "denied" ? "denied" : "granted");
    } finally {
      setIsUpdating(false);
    }
  }

  async function disable(): Promise<void> {
    if (isUpdating) return;
    setIsUpdating(true);
    setError(null);

    const endpoint = getStoredPushEndpoint();
    if (endpoint) {
      try {
        await notificationsApi.unregisterSubscription(endpoint);
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
    } finally {
      setIsUpdating(false);
    }

    setStatus(currentPermission() === "granted" ? "granted" : "default");
  }

  async function sendTest(): Promise<{ success: boolean; message: string }> {
    setIsSendingTest(true);
    setError(null);
    try {
      const res = await notificationsApi.sendTestNotification({
        title: "LifeOS Test Push",
        body: "Push notifications are working cleanly on your device!"
      });
      return { success: true, message: res.message || "Test notification dispatched!" };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (err as Error)?.message || "Failed to trigger test notification.";
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsSendingTest(false);
    }
  }

  const deviceState: PushDeviceState = (() => {
    if (status === "subscribed") return "registered";
    if (status === "denied") return "blocked";
    if (status === "unsupported") return "unsupported";
    return "not_registered";
  })();

  return {
    status,
    deviceState,
    isUpdating,
    isSendingTest,
    error,
    request,
    disable,
    sendTest
  };
}

