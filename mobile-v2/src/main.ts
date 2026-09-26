import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from "@capacitor/push-notifications";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { CONFIG } from "./config";

// State
let currentFcmToken: string | null = null;
let currentAccessToken: string | null = null;

/**
 * Maps incoming notification data to web application routes (matching web deepLink.ts).
 */
export function resolveDeepLinkRoute(data: Record<string, any> = {}, type?: string): string {
  if (typeof data.href === "string" && data.href.length > 0) {
    return data.href;
  }
  if (typeof data.url === "string" && data.url.length > 0) {
    return data.url;
  }

  const notificationType = type || data.type;
  switch (notificationType) {
    case "calendar_reminder":
      return typeof data.eventId === "string" && data.eventId
        ? `/calendar?eventId=${encodeURIComponent(data.eventId)}`
        : "/calendar";
    case "habit_reminder":
      return typeof data.habitId === "string" && data.habitId
        ? `/habits?habitId=${encodeURIComponent(data.habitId)}`
        : "/habits";
    case "budget_alert":
      return typeof data.budgetId === "string" && data.budgetId
        ? `/finance?tab=budgets&budgetId=${encodeURIComponent(data.budgetId)}`
        : "/finance?tab=budgets";
    default:
      return "/";
  }
}

/**
 * Register FCM device token with the backend REST endpoint
 */
export async function syncFcmTokenWithBackend(fcmToken: string, accessToken?: string | null): Promise<boolean> {
  const token = accessToken || currentAccessToken || localStorage.getItem("lifeos_access_token");
  if (!token) {
    console.warn("[LifeOS Native] Cannot sync FCM token yet: user not authenticated. Will retry on login.");
    return false;
  }

  try {
    const res = await fetch(`${CONFIG.apiUrl}/notifications/fcm-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        token: fcmToken,
        deviceType: CONFIG.deviceType,
        deviceName: CONFIG.deviceName
      })
    });

    if (res.ok) {
      console.log("[LifeOS Native] FCM device token registered successfully with backend");
      return true;
    } else {
      console.warn("[LifeOS Native] FCM token registration response:", res.status);
      return false;
    }
  } catch (err) {
    console.error("[LifeOS Native] Error syncing FCM token:", err);
    return false;
  }
}

/**
 * Initiates Google OAuth via System Browser Tab (Chrome Custom Tabs).
 * Never uses the embedded webview to prevent Google 403 disallowed_useragent errors.
 */
export async function startGoogleOAuth(): Promise<void> {
  const authUrl = `${CONFIG.apiUrl}/auth/google?return_url=${encodeURIComponent(CONFIG.oauthRedirectUrl)}`;
  console.log("[LifeOS Native] Launching Google OAuth in system browser tab:", authUrl);
  await Browser.open({
    url: authUrl,
    windowName: "_blank",
    presentationStyle: "popover"
  });
}

/**
 * Handles incoming deep links (e.g. lifeos://oauth?oauth_success=true&accessToken=...)
 */
export async function handleAppUrlOpen(url: string): Promise<void> {
  console.log("[LifeOS Native] appUrlOpen triggered with:", url);

  if (!url.startsWith(CONFIG.oauthScheme)) {
    return;
  }

  // Close the Chrome Custom Tab if open
  try {
    await Browser.close();
  } catch {
    // Tab may already be closed
  }

  // Parse deep link parameters
  try {
    const parsed = new URL(url);
    const searchParams = parsed.searchParams;
    const isOauthSuccess = searchParams.get("oauth_success") === "true";
    const refreshToken = searchParams.get("refreshToken");
    const accessToken = searchParams.get("accessToken");
    const user = searchParams.get("user");
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    if (isOauthSuccess && (refreshToken || accessToken)) {
      if (accessToken) {
        currentAccessToken = accessToken;
        try {
          localStorage.setItem("lifeos_access_token", accessToken);
        } catch {
          // LocalStorage fallback
        }
      }

      // If we already have an FCM token, sync it with the backend now that we have auth!
      if (currentFcmToken) {
        syncFcmTokenWithBackend(currentFcmToken, accessToken).catch(() => {});
      }

      // Hand tokens back to the web application's LoginPage
      // The web LoginPage handles ?oauth_success=true&refreshToken=... and logs the user in
      const query = new URLSearchParams({
        oauth_success: "true",
        ...(refreshToken ? { refreshToken } : {}),
        ...(accessToken ? { accessToken } : {}),
        ...(user ? { user } : {})
      }).toString();

      const targetWebUrl = `${CONFIG.webUrl}/login?${query}`;
      console.log("[LifeOS Native] Shuttling OAuth tokens to webview:", targetWebUrl);
      window.location.href = targetWebUrl;
    } else if (error) {
      console.warn("[LifeOS Native] OAuth error received:", error, message);
      const errorQuery = new URLSearchParams({
        error: error || "oauth_failed",
        ...(message ? { message } : {})
      }).toString();
      window.location.href = `${CONFIG.webUrl}/login?${errorQuery}`;
    }
  } catch (err) {
    console.error("[LifeOS Native] Failed to parse OAuth callback URL:", err);
  }
}

/**
 * Configure Status Bar & System UI to match LifeOS website styling
 */
async function configureSystemUI(): Promise<void> {
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#00000000" });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch (e) {
    console.warn("[LifeOS Native] StatusBar config:", e);
  }
}

/**
 * Setup Push Notifications via FCM
 */
async function setupPushNotifications(): Promise<void> {
  try {
    const permStatus = await PushNotifications.checkPermissions();
    let granted = permStatus.receive === "granted";

    if (!granted) {
      const requested = await PushNotifications.requestPermissions();
      granted = requested.receive === "granted";
    }

    if (!granted) {
      console.warn("[LifeOS Native] Push notifications permission not granted");
      return;
    }

    // Register with FCM
    await PushNotifications.register();

    // Listen for FCM token
    await PushNotifications.addListener("registration", async (token: Token) => {
      console.log("[LifeOS Native] FCM token received:", token.value);
      currentFcmToken = token.value;
      try {
        localStorage.setItem("lifeos_fcm_token", token.value);
      } catch {
        // Fallback
      }

      await syncFcmTokenWithBackend(token.value);
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.error("[LifeOS Native] FCM registration error:", err);
    });

    // Foreground notification receipt
    await PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
      console.log("[LifeOS Native] Push notification received in foreground:", notification);
    });

    // User tapped notification
    await PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
      console.log("[LifeOS Native] Push notification tapped:", action);
      const data = action.notification.data || {};
      const targetRoute = resolveDeepLinkRoute(data, action.notification.title);
      console.log("[LifeOS Native] Routing to target screen:", targetRoute);
      window.location.href = `${CONFIG.webUrl}${targetRoute}`;
    });
  } catch (err) {
    console.warn("[LifeOS Native] Push notification setup skipped (non-native or missing config):", err);
  }
}

/**
 * Android Hardware Back Button Handling
 */
function setupBackButtonHandling(): void {
  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) {
      window.history.back();
    } else {
      const shouldExit = window.confirm("Do you want to exit LifeOS?");
      if (shouldExit) {
        App.exitApp();
      }
    }
  });
}

/**
 * Setup App URL Open Listener for Custom Schemes
 */
function setupDeepLinkHandling(): void {
  App.addListener("appUrlOpen", async (event) => {
    await handleAppUrlOpen(event.url);
  });
}

/**
 * Inject safe area CSS variables into document
 */
function setupSafeArea(): void {
  const style = document.createElement("style");
  style.id = "lifeos-safe-area-overrides";
  style.innerHTML = `
    :root {
      --sat: env(safe-area-inset-top, 0px);
      --sab: env(safe-area-inset-bottom, 0px);
      --sal: env(safe-area-inset-left, 0px);
      --sar: env(safe-area-inset-right, 0px);
    }
    body {
      padding-top: var(--sat);
      padding-bottom: var(--sab);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Main Initialization Lifecycle
 */
export async function initializeNativeShell(): Promise<void> {
  console.log("[LifeOS Native] Initializing Mobile-v2 Native Shell");

  setupSafeArea();
  await configureSystemUI();
  setupBackButtonHandling();
  setupDeepLinkHandling();
  await setupPushNotifications();

  // Hide native splash screen after initialization
  try {
    await SplashScreen.hide();
  } catch {
    // Ignore
  }

  // Expose global bridge helper on window
  (window as any).LIFEOS_APP_SHELL = true;
  (window as any).LifeOSNative = {
    startGoogleOAuth,
    syncFcmTokenWithBackend,
    getFcmToken: () => currentFcmToken,
    setAccessToken: (token: string) => {
      currentAccessToken = token;
      if (currentFcmToken) {
        syncFcmTokenWithBackend(currentFcmToken, token).catch(() => {});
      }
    }
  };

  // If running in local shell mode, attempt redirect to web app
  const isLocalShell = window.location.pathname === "/" && !window.location.search && document.getElementById("status-title");
  if (isLocalShell && CONFIG.webUrl !== window.location.origin) {
    console.log("[LifeOS Native] Redirecting local shell to web app:", CONFIG.webUrl);
    window.location.href = CONFIG.webUrl;
  }
}

// Start native shell on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initializeNativeShell());
} else {
  initializeNativeShell();
}
