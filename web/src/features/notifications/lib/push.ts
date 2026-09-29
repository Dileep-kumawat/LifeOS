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

/** Detects if current browser is Brave via official brave API. */
export async function isBraveBrowser(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    const nav = navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } };
    if (nav.brave && typeof nav.brave.isBrave === "function") {
      return await nav.brave.isBrave();
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Detects if current environment is iOS Safari / WebKit. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1)
  );
}

/** Detects if web app is running as an installed PWA on home screen. */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * VAPID public key (base64url) → the Uint8Array the PushManager expects for
 * `applicationServerKey`. Reads `VITE_VAPID_PUBLIC_KEY`; returns null when
 * unset so callers can degrade gracefully.
 */
export function getApplicationServerKey(): Uint8Array<ArrayBuffer> | null {
  if (typeof import.meta === "undefined" || !import.meta.env) return null;
  const b64 = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!b64 || !b64.trim()) return null;
  try {
    const padding = "=".repeat((4 - (b64.length % 4)) % 4);
    const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Unsubscribe any stale pre-existing subscription to prevent key mismatch AbortErrors.
 */
export async function clearStalePushSubscription(
  registration: ServiceWorkerRegistration
): Promise<void> {
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
    }
  } catch {
    /* best-effort cleanup */
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
