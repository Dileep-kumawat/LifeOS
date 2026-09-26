import axios, { type AxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import { tokenStorage } from "./tokenStorage";
import type { UserProfile } from "@lifeos/shared";

export const API_BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) || "").replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api/v1` : "/api/v1",
  withCredentials: true,
  // Fail fast in production instead of hanging on "Pending" forever when the
  // backend stalls (e.g. Redis outage). Callers surface timeout as an error.
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request Interceptor: Attach in-memory access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("Authorization", `Bearer ${token}`);
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Refresh token deduplication promise (single-flight mutex)
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshUrl = API_BASE_URL ? `${API_BASE_URL}/api/v1/auth/refresh` : "/api/v1/auth/refresh";
      const storedRefreshToken = tokenStorage.getRefreshToken();

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (storedRefreshToken) {
        headers["x-refresh-token"] = storedRefreshToken;
      }

      const response = await axios.post<{
        user: UserProfile;
        accessToken: string;
        refreshToken?: string;
      }>(
        refreshUrl,
        storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
        {
          withCredentials: true,
          headers
        }
      );

      const { accessToken, user, refreshToken: newRefreshToken } = response.data;

      // Update in-memory Zustand store
      useAuthStore.getState().setAuth(user, accessToken);

      // Crucial: Persist rotated refresh token so subsequent refreshes don't fail or trigger reuse detection
      if (newRefreshToken) {
        tokenStorage.setRefreshToken(newRefreshToken);
      }

      return accessToken;
    } catch (_error) {
      // Refresh token invalid or expired: clear auth state to prompt login
      tokenStorage.clearRefreshToken();
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

    // Don't intercept 401s coming from the login, register, or refresh endpoints themselves
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/register");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        if (originalRequest.headers) {
          if (typeof (originalRequest.headers as any).set === "function") {
            (originalRequest.headers as any).set("Authorization", `Bearer ${newAccessToken}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
        }
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
