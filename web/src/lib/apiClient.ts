import axios, { type AxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

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
      const refreshUrl = API_BASE_URL ? `${API_BASE_URL}/api/v1/auth/refresh` : "/api/v1/auth/refresh";
      const response = await axios.post(refreshUrl, {}, { withCredentials: true });
      const { accessToken, user } = response.data;
      useAuthStore.getState().setAuth(user, accessToken);
      return accessToken as string;
    } catch (_error) {
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

    // Don't intercept 401s coming from the login or refresh endpoints themselves
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
