/**
 * Browser-side Web Push helpers. Contains NO permission prompts by itself —
 * the explicit `request` action in usePushPermission is the ONLY caller of
 * `Notification.requestPermission`, and it is only ever invoked from an
 * in-app button click (never on mount).
 */

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Reads (never triggers) the browser's current push permission. */
export function currentPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) return null;
  return window.Notification.permission;
}

/** `Notification.requestPermission` — prompts only if state is `default`. */
export function requestBrowserPermission(): Promise<NotificationPermission> {
  return window.Notification.requestPermission();
}

export function serviceWorkerSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * VAPID public key (base64url) → the Uint8Array the PushManager expects for
 * `applicationServerKey`. Reads `VITE_VAPID_PUBLIC_KEY`; returns null when
 * unset so callers can degrade gracefully.
 */
export function getApplicationServerKey(): Uint8Array<ArrayBuffer> | null {
  if (typeof import.meta === "undefined" || !import.meta.env) return null;
  const b64 = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!b64) return null;
  try {
    const raw = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Small localStorage record of the active endpoint (kept in sync with backend). */
const ENDPOINT_KEY = "lifeosPushEndpoint";

export function storePushEndpoint(endpoint: string): void {
  try {
    localStorage.setItem(ENDPOINT_KEY, endpoint);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function clearStoredPushEndpoint(): void {
  try {
    localStorage.removeItem(ENDPOINT_KEY);
  } catch {
    /* noop */
  }
}

export function getStoredPushEndpoint(): string | null {
  try {
    return localStorage.getItem(ENDPOINT_KEY);
  } catch {
    return null;
  }
}
