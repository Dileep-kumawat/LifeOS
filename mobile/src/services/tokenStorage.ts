/**
 * Token Storage Service for LifeOS Mobile
 *
 * ARCHITECTURAL DESIGN & PLATFORM DEVIATION NOTE:
 * On the web platform, refresh tokens are securely stored in httpOnly, SameSite=Strict cookies
 * managed directly by the browser's credential container.
 *
 * Mobile environments (React Native / Expo) do not have a native httpOnly cookie isolation model.
 * To satisfy NFR-2.5 (Encryption-at-Rest for all sensitive credentials) and prevent credential theft,
 * we store the long-lived refresh token in hardware-backed encrypted storage via Expo SecureStore
 * (Keychain on iOS, Keystore-backed AES-256 encrypted SharedPreferences on Android).
 *
 * We deliberately DO NOT use AsyncStorage or unencrypted storage for credentials.
 *
 * Short-lived Access Tokens are held exclusively in volatile memory (Zustand store) and are
 * NEVER persisted to disk, matching the web client's in-memory security posture.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_TOKEN_KEY = "lifeos_refresh_token";

// In-memory fallback for non-native environments (e.g. Node tests / web fallback)
const inMemoryFallbackStore = new Map<string, string>();

export const tokenStorage = {
  /**
   * Securely persist the refresh token to hardware-encrypted storage
   */
  async setRefreshToken(token: string): Promise<void> {
    return this.setItem(REFRESH_TOKEN_KEY, token);
  },

  /**
   * Retrieve the refresh token from hardware-encrypted storage
   */
  async getRefreshToken(): Promise<string | null> {
    return this.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Securely remove the refresh token upon logout or session invalidation
   */
  async clearRefreshToken(): Promise<void> {
    return this.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Generic key-value encrypted storage helpers
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web" || !SecureStore.setItemAsync) {
        inMemoryFallbackStore.set(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
      });
    } catch (error) {
      console.warn(`SecureStore setItem error for key ${key}:`, error);
      inMemoryFallbackStore.set(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web" || !SecureStore.getItemAsync) {
        return inMemoryFallbackStore.get(key) ?? null;
      }
      const val = await SecureStore.getItemAsync(key);
      return val ?? (inMemoryFallbackStore.get(key) ?? null);
    } catch (error) {
      console.warn(`SecureStore getItem error for key ${key}:`, error);
      return inMemoryFallbackStore.get(key) ?? null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      inMemoryFallbackStore.delete(key);
      if (Platform.OS !== "web" && SecureStore.deleteItemAsync) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.warn(`SecureStore removeItem error for key ${key}:`, error);
    }
  }
};
