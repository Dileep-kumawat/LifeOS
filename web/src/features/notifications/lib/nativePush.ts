import { PushNotifications, type ActionPerformed, type PushNotificationSchema, type Token } from "@capacitor/push-notifications";
import { isInsideNativeApp } from "../../../lib/platform";
import { notificationsApi } from "../api/notificationsApi";
import { resolveNativePushRoute } from "./deepLink";

const NATIVE_FCM_TOKEN_KEY = "lifeos_native_fcm_token";

export function getStoredNativeFcmToken(): string | null {
  try {
    return localStorage.getItem(NATIVE_FCM_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeNativeFcmToken(token: string): void {
  try {
    localStorage.setItem(NATIVE_FCM_TOKEN_KEY, token);
  } catch {
    /* non-fatal */
  }
}

export function clearStoredNativeFcmToken(): void {
  try {
    localStorage.removeItem(NATIVE_FCM_TOKEN_KEY);
  } catch {
    /* non-fatal */
  }
}

let listenersInitialized = false;

/**
 * Creates the high-priority Android notification channel required for
 * head-up notifications and alerts when the app is in background or killed.
 */
export async function createAlertChannel(): Promise<void> {
  if (!isInsideNativeApp()) return;
  try {
    await PushNotifications.createChannel({
      id: "lifeos_alerts",
      name: "LifeOS Alerts",
      description: "High-priority notifications, daily AI summaries, and time-sensitive reminders",
      importance: 5, // NotificationManager.IMPORTANCE_HIGH
      visibility: 1, // NotificationCompat.VISIBILITY_PUBLIC
      sound: "default",
      vibration: true,
      lights: true,
      lightColor: "#6366f1"
    });
  } catch (err) {
    console.warn("[LifeOS Native] Failed to create Android notification channel:", err);
  }
}

/**
 * Initializes listeners for FCM registration, incoming notifications, and tap actions.
 */
export function initNativePushListeners(onNavigate?: (path: string) => void): void {
  if (!isInsideNativeApp() || listenersInitialized) return;
  listenersInitialized = true;

  PushNotifications.addListener("registration", async (token: Token) => {
    storeNativeFcmToken(token.value);
    try {
      await notificationsApi.registerFcmToken(token.value, {
        deviceType: "android",
        deviceName: "Capacitor Android Device"
      });
    } catch (err) {
      console.error("[LifeOS Native] Failed to sync FCM token with backend:", err);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("[LifeOS Native] Push registration error:", err);
  });

  PushNotifications.addListener("pushNotificationReceived", (_notification: PushNotificationSchema) => {
    /* foreground notification received */
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
    const data = action.notification?.data || {};
    const targetRoute = resolveNativePushRoute(data);
    if (onNavigate) {
      onNavigate(targetRoute);
    } else if (typeof window !== "undefined") {
      window.location.href = targetRoute;
    }
  });
}

/**
 * Request notification permissions, ensure notification channel exists,
 * register with FCM, and sync token with the backend.
 */
export async function registerNativePush(onNavigate?: (path: string) => void): Promise<{ success: boolean; token?: string }> {
  if (!isInsideNativeApp()) {
    throw new Error("Native push notifications are only available inside the Android app.");
  }

  // 1. Ensure channel exists first
  await createAlertChannel();

  // 2. Set up event listeners
  initNativePushListeners(onNavigate);

  // 3. Check and request permission
  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive !== "granted") {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== "granted") {
    throw new Error("Push notification permission was denied. Please allow notifications in Android app settings.");
  }

  // 4. Register with FCM / APNs
  await PushNotifications.register();

  const token = getStoredNativeFcmToken();
  return { success: true, token: token || undefined };
}

/**
 * Unregisters the native device token from the backend and clears local storage.
 * Called on user logout or when disabling push in settings.
 */
export async function unregisterNativePush(): Promise<void> {
  const token = getStoredNativeFcmToken();
  if (!token) return;

  try {
    await notificationsApi.unregisterFcmToken(token);
  } catch (err) {
    console.warn("[LifeOS Native] Failed to unregister FCM token on backend:", err);
  } finally {
    clearStoredNativeFcmToken();
  }
}

/**
 * Queries current native push status without triggering permission prompts.
 */
export async function getNativePushStatus(): Promise<"registered" | "not_registered" | "blocked" | "unsupported"> {
  if (!isInsideNativeApp()) return "unsupported";
  try {
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "denied") return "blocked";
    if (permStatus.receive === "granted") {
      return getStoredNativeFcmToken() ? "registered" : "not_registered";
    }
    return "not_registered";
  } catch {
    return "unsupported";
  }
}
