import "dotenv/config";
import type { CapacitorConfig } from "@capacitor/cli";

// Resolve target web URL:
// 1. Explicit CAPACITOR_WEB_URL environment variable (highest priority)
// 2. Dev mode fallback: defaults to local Vite dev server (10.0.2.2 for Android emulator)
// 3. Production default: deployed web app URL
const isDev = process.env.CAPACITOR_DEV === "true" || process.env.NODE_ENV === "development";
const explicitWebUrl = process.env.CAPACITOR_WEB_URL;
const devUrl = process.env.CAPACITOR_DEV_URL || "http://10.0.2.2:5173";
const defaultProdUrl = "https://life-os-web-puce.vercel.app";

const targetUrl = explicitWebUrl || (isDev ? devUrl : defaultProdUrl);

console.log("[Capacitor Config] Target Web URL:", targetUrl);
console.log("[Capacitor Config] WebContents Debugging Enabled:", isDev);

const config: CapacitorConfig = {
  appId: "com.lifeos.v2",
  appName: "LifeOS",
  webDir: "dist",
  server: {
    url: targetUrl,
    cleartext: true,
    androidScheme: "https"
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: isDev
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#00000000",
      overlaysWebView: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
