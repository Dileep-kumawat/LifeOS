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
let inMemoryFallbackToken: string | null = null;

export const tokenStorage = {
  /**
   * Securely persist the refresh token to hardware-encrypted storage
   */
  async setRefreshToken(token: string): Promise<void> {
    try {
      if (Platform.OS === "web" || !SecureStore.setItemAsync) {
        inMemoryFallbackToken = token;
        return;
      }
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
      });
    } catch (error) {
      console.warn("SecureStore setRefreshToken error:", error);
      inMemoryFallbackToken = token;
    }
  },

  /**
   * Retrieve the refresh token from hardware-encrypted storage
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === "web" || !SecureStore.getItemAsync) {
        return inMemoryFallbackToken;
      }
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      return token ?? inMemoryFallbackToken;
    } catch (error) {
      console.warn("SecureStore getRefreshToken error:", error);
      return inMemoryFallbackToken;
    }
  },

  /**
   * Securely remove the refresh token upon logout or session invalidation
   */
  async clearRefreshToken(): Promise<void> {
    try {
      inMemoryFallbackToken = null;
      if (Platform.OS !== "web" && SecureStore.deleteItemAsync) {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      console.warn("SecureStore clearRefreshToken error:", error);
    }
  }
};
