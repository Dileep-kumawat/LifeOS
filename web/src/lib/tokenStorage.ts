/**
 * Token Storage Service for LifeOS Web
 *
 * Persists rotated refresh tokens across browser sessions while access tokens
 * are maintained strictly in volatile memory (Zustand store).
 *
 * Works in tandem with httpOnly cookies (withCredentials: true), providing dual-channel
 * resilience for environments where cross-site cookies are blocked or stripped
 * (e.g. Capacitor WebViews, privacy-enhanced browsers, or separated API/web subdomains).
 */

const REFRESH_TOKEN_KEY = "lifeos_refresh_token";

// In-memory fallback store when localStorage is unavailable or in non-browser test environments
const inMemoryFallbackStore = new Map<string, string>();

function isStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined" && window.localStorage !== null;
  } catch {
    return false;
  }
}

export const tokenStorage = {
  /**
   * Retrieve stored refresh token from localStorage or in-memory fallback
   */
  getRefreshToken(): string | null {
    try {
      if (isStorageAvailable()) {
        return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? inMemoryFallbackStore.get(REFRESH_TOKEN_KEY) ?? null;
      }
      return inMemoryFallbackStore.get(REFRESH_TOKEN_KEY) ?? null;
    } catch {
      return inMemoryFallbackStore.get(REFRESH_TOKEN_KEY) ?? null;
    }
  },

  /**
   * Persist active refresh token
   */
  setRefreshToken(token: string): void {
    try {
      if (isStorageAvailable()) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
      }
      inMemoryFallbackStore.set(REFRESH_TOKEN_KEY, token);
    } catch {
      inMemoryFallbackStore.set(REFRESH_TOKEN_KEY, token);
    }
  },

  /**
   * Clear refresh token upon logout or session invalidation
   */
  clearRefreshToken(): void {
    try {
      if (isStorageAvailable()) {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      inMemoryFallbackStore.delete(REFRESH_TOKEN_KEY);
    } catch {
      inMemoryFallbackStore.delete(REFRESH_TOKEN_KEY);
    }
  }
};
