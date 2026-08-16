import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { useAuthStore } from "../store/authStore";
import { tokenStorage } from "./tokenStorage";
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput
} from "@lifeos/shared";

// Determine local dev API base URL depending on environment, USB reverse, or Expo host IP
export const getDefaultApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // If running in Expo Go or Dev Client, extract host machine IP
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      // Over Wi-Fi, connect to host machine IP on port 4000
      return `http://${host}:4000/api/v1`;
    }
  }

  // Physical Android device over USB cable (with adb reverse tcp:4000 tcp:4000) or iOS/Web uses localhost
  return "http://localhost:4000/api/v1";
};

export const API_BASE_URL = getDefaultApiUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 15000
});

// Request Interceptor: Attach in-memory access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token deduplication promise
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = await tokenStorage.getRefreshToken();
      if (!storedRefreshToken) {
        useAuthStore.getState().clearAuth();
        return null;
      }

      const response = await axios.post<{
        user: any;
        accessToken: string;
        refreshToken?: string;
      }>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: storedRefreshToken },
        {
          headers: {
            "Content-Type": "application/json",
            "x-refresh-token": storedRefreshToken
          }
        }
      );

      const { accessToken, user, refreshToken: newRefreshToken } = response.data;

      // Update in-memory state
      useAuthStore.getState().setAuth(user, accessToken);

      // Persist rotated refresh token in SecureStore
      if (newRefreshToken) {
        await tokenStorage.setRefreshToken(newRefreshToken);
      }

      return accessToken;
    } catch (error) {
      await tokenStorage.clearRefreshToken();
      useAuthStore.getState().clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Response Interceptor: Catch 401 and retry once after deduplicated refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/register");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Authentication API Service Endpoints
 */
export const authApi = {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse & { refreshToken?: string }>(
      "/auth/register",
      data
    );
    const { user, accessToken, refreshToken } = response.data;

    if (refreshToken) {
      await tokenStorage.setRefreshToken(refreshToken);
    }
    useAuthStore.getState().setAuth(user, accessToken);

    return { user, accessToken };
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse & { refreshToken?: string }>(
      "/auth/login",
      data
    );
    const { user, accessToken, refreshToken } = response.data;

    if (refreshToken) {
      await tokenStorage.setRefreshToken(refreshToken);
    }
    useAuthStore.getState().setAuth(user, accessToken);

    return { user, accessToken };
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      await apiClient.post("/auth/logout", { refreshToken });
    } catch (_err) {
      // Ignore network errors on logout
    } finally {
      await tokenStorage.clearRefreshToken();
      useAuthStore.getState().clearAuth();
    }
  },

  async forgotPassword(data: ForgotPasswordInput): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>("/auth/forgot-password", data);
    return response.data;
  },

  async restoreSession(): Promise<boolean> {
    try {
      useAuthStore.getState().setIsInitializing(true);
      const token = await refreshAccessToken();
      return !!token;
    } catch {
      return false;
    } finally {
      useAuthStore.getState().setIsInitializing(false);
    }
  }
};
