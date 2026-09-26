// Mobile-v2 Client Configuration
export const CONFIG = {
  // Target website URL to render in WebView
  webUrl:
    import.meta.env.CAPACITOR_WEB_URL ||
    import.meta.env.VITE_WEB_URL ||
    (import.meta.env.DEV && !import.meta.env.CAPACITOR_WEB_URL
      ? import.meta.env.CAPACITOR_DEV_URL || "http://10.0.2.2:5173"
      : "https://life-os-web-puce.vercel.app"),

  // Backend REST API URL for direct token registration and sync
  apiUrl:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV && !import.meta.env.VITE_API_URL
      ? "http://10.0.2.2:4000/api/v1"
      : "https://lifeos-api-hqcz.onrender.com/api/v1"),

  // Custom deep link scheme for OAuth callbacks
  oauthScheme: "lifeos",
  oauthHost: "oauth",
  oauthRedirectUrl: "lifeos://oauth",

  // Device registration identifier
  deviceType: "android" as const,
  deviceName: "Android Capacitor Device"
};
