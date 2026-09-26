import { useState, useEffect } from "react";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      [key: string]: unknown;
    };
    LIFEOS_APP_SHELL?: boolean;
    LifeOSNative?: unknown;
  }
}

/**
 * Synchronous check to determine if the application is running inside the native mobile shell.
 * Returns true ONLY when loaded inside Capacitor native webview or with the native shell flag.
 * Regular mobile or desktop browser sessions (Chrome, Safari, Firefox, Edge) return false.
 */
export function isInsideNativeApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // 1. Primary check: Official Capacitor bridge injected into native webview
  const isCapacitorNative = Boolean(
    typeof window.Capacitor?.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
  );

  // 2. Extra confirmation fallback: Injected shell flag or native bridge object
  const isShellInjected = Boolean(
    window.LIFEOS_APP_SHELL === true ||
      window.LifeOSNative != null ||
      (typeof window.Capacitor?.getPlatform === "function" &&
        window.Capacitor.getPlatform() !== "web")
  );

  return isCapacitorNative || isShellInjected;
}

/**
 * React hook to reactively track if the app is running inside the native shell.
 * Re-checks if Capacitor bridge initializes shortly after initial component mount.
 */
export function useIsInsideNativeApp(): boolean {
  const [isNative, setIsNative] = useState(() => isInsideNativeApp());

  useEffect(() => {
    if (isNative) return;

    if (isInsideNativeApp()) {
      setIsNative(true);
      return;
    }

    const checkPlatform = () => {
      if (isInsideNativeApp()) {
        setIsNative(true);
      }
    };

    window.addEventListener("capacitorDidStart", checkPlatform);
    const timer = setTimeout(checkPlatform, 100);

    return () => {
      window.removeEventListener("capacitorDidStart", checkPlatform);
      clearTimeout(timer);
    };
  }, [isNative]);

  return isNative;
}

/**
 * High-level platform information hook.
 */
export function usePlatform() {
  const isNative = useIsInsideNativeApp();
  return {
    isNativeApp: isNative,
    isWebBrowser: !isNative,
    platform: isNative ? ("native" as const) : ("web" as const)
  };
}
