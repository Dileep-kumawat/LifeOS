import Constants from "expo-constants";

export type AppEnvironment = "development" | "production";

export const PRODUCTION_API_ORIGIN = "https://lifeos-api-hqcz.onrender.com";
export const PRODUCTION_API_URL = `${PRODUCTION_API_ORIGIN}/api/v1`;

/**
 * Resolves the active environment mode.
 * Controlled by EXPO_PUBLIC_APP_ENV or EXPO_PUBLIC_ENV.
 * Defaults to "development".
 */
export function getAppEnvironment(): AppEnvironment {
  const envVar = (
    process.env.EXPO_PUBLIC_APP_ENV ||
    process.env.EXPO_PUBLIC_ENV ||
    process.env.NODE_ENV ||
    "development"
  )
    .trim()
    .toLowerCase();

  if (envVar === "production" || envVar === "prod") {
    return "production";
  }

  return "development";
}

/**
 * Resolves the API base URL based on the current environment mode and optional overrides.
 */
export function resolveApiBaseUrl(): string {
  // If an explicit custom API URL override is provided, prioritize it
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  const env = getAppEnvironment();

  if (env === "production") {
    return PRODUCTION_API_URL;
  }

  // Development mode:
  // If running in Expo Go or Dev Client on physical device over Wi-Fi, extract host machine IP
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:4000/api/v1`;
    }
  }

  // Physical Android device over USB cable (via adb reverse tcp:4000 tcp:4000) or iOS Simulator / Web
  return "http://localhost:4000/api/v1";
}

/**
 * Extracts origin URL from API base URL (e.g. "https://api.com/api/v1" -> "https://api.com").
 */
export function resolveApiOrigin(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return apiUrl.replace(/\/api\/v1\/?$/, "");
  }
}

const currentMode = getAppEnvironment();
const currentApiUrl = resolveApiBaseUrl();
const currentApiOrigin = resolveApiOrigin(currentApiUrl);

export const ENV = {
  mode: currentMode,
  isProduction: currentMode === "production",
  isDevelopment: currentMode === "development",
  apiUrl: currentApiUrl,
  socketUrl: currentApiOrigin,
  apiOrigin: currentApiOrigin
};
