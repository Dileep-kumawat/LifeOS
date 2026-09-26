import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import { tokenStorage } from "../tokenStorage";
import { useAuthStore } from "../../store/authStore";
import { apiClient, refreshAccessToken } from "../apiClient";

describe("Web Auth Flow & Silent Refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStorage.clearRefreshToken();
    useAuthStore.getState().clearAuth();
  });

  describe("1. Token Storage", () => {
    it("should set, get, and clear refresh token in tokenStorage", () => {
      expect(tokenStorage.getRefreshToken()).toBeNull();

      tokenStorage.setRefreshToken("test-refresh-token-1");
      expect(tokenStorage.getRefreshToken()).toBe("test-refresh-token-1");

      tokenStorage.clearRefreshToken();
      expect(tokenStorage.getRefreshToken()).toBeNull();
    });

    it("should synchronize with window.localStorage when available", () => {
      const mockStorage: Record<string, string> = {};
      const fakeLocalStorage = {
        getItem: vi.fn((k: string) => mockStorage[k] ?? null),
        setItem: vi.fn((k: string, v: string) => {
          mockStorage[k] = v;
        }),
        removeItem: vi.fn((k: string) => {
          delete mockStorage[k];
        }),
        clear: vi.fn(() => {
          Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
        })
      };

      vi.stubGlobal("window", { localStorage: fakeLocalStorage });
      vi.stubGlobal("localStorage", fakeLocalStorage);

      try {
        tokenStorage.setRefreshToken("browser-token-123");
        expect(fakeLocalStorage.setItem).toHaveBeenCalledWith("lifeos_refresh_token", "browser-token-123");
        expect(tokenStorage.getRefreshToken()).toBe("browser-token-123");

        tokenStorage.clearRefreshToken();
        expect(fakeLocalStorage.removeItem).toHaveBeenCalledWith("lifeos_refresh_token");
        expect(tokenStorage.getRefreshToken()).toBeNull();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("2. Zustand Auth Store State Transitions", () => {
    it("should set user and access token on setAuth", () => {
      const mockUser = {
        id: "u123",
        email: "test@example.com",
        name: "Test User",
        role: "user" as const,
        emailVerified: true,
        status: "active" as const,
        createdAt: new Date().toISOString()
      };

      useAuthStore.getState().setAuth(mockUser, "access-token-123");

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe("access-token-123");
      expect(state.isInitializing).toBe(false);
    });

    it("should clear auth state and refresh token on clearAuth", () => {
      tokenStorage.setRefreshToken("refresh-to-clear");
      useAuthStore.getState().setAuth(
        {
          id: "u123",
          email: "test@example.com",
          name: "Test User",
          role: "user" as const,
          emailVerified: true,
          status: "active" as const,
          createdAt: new Date().toISOString()
        },
        "token-xyz"
      );

      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(tokenStorage.getRefreshToken()).toBeNull();
    });
  });

  describe("3. Silent Token Refresh with Single-Flight Mutex", () => {
    it("should call refresh endpoint with stored token and rotate refresh token on success", async () => {
      tokenStorage.setRefreshToken("initial-refresh-token");

      const mockPost = vi.spyOn(axios, "post").mockResolvedValueOnce({
        data: {
          user: { id: "u123", email: "test@example.com", name: "Test User", role: "user" },
          accessToken: "new-access-token-999",
          refreshToken: "rotated-refresh-token-000"
        }
      });

      const token = await refreshAccessToken();

      expect(token).toBe("new-access-token-999");
      expect(useAuthStore.getState().accessToken).toBe("new-access-token-999");
      expect(tokenStorage.getRefreshToken()).toBe("rotated-refresh-token-000");

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/refresh"),
        { refreshToken: "initial-refresh-token" },
        expect.objectContaining({
          withCredentials: true,
          headers: expect.objectContaining({
            "x-refresh-token": "initial-refresh-token"
          })
        })
      );
    });

    it("should deduplicate concurrent refresh calls via single-flight mutex", async () => {
      tokenStorage.setRefreshToken("concurrent-refresh-token");

      let resolveRefresh: (val: any) => void;
      const delayedRefreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      const mockPost = vi.spyOn(axios, "post").mockImplementationOnce(() => delayedRefreshPromise as any);

      // Fire 3 simultaneous refresh calls
      const call1 = refreshAccessToken();
      const call2 = refreshAccessToken();
      const call3 = refreshAccessToken();

      // Resolve the single underlying network call
      resolveRefresh!({
        data: {
          user: { id: "u123", email: "test@example.com", name: "Test User", role: "user" },
          accessToken: "shared-access-token",
          refreshToken: "shared-rotated-refresh-token"
        }
      });

      const [res1, res2, res3] = await Promise.all([call1, call2, call3]);

      // All 3 callers receive the same fresh token
      expect(res1).toBe("shared-access-token");
      expect(res2).toBe("shared-access-token");
      expect(res3).toBe("shared-access-token");

      // Exactly ONE network request was made
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it("should clear auth state and storage when refresh fails (expired/revoked refresh token)", async () => {
      tokenStorage.setRefreshToken("expired-refresh-token");
      useAuthStore.getState().setAuth(
        {
          id: "u123",
          email: "test@example.com",
          name: "Test User",
          role: "user" as const,
          emailVerified: true,
          status: "active" as const,
          createdAt: new Date().toISOString()
        },
        "old-access-token"
      );

      vi.spyOn(axios, "post").mockRejectedValueOnce({
        response: { status: 401, data: { message: "Invalid refresh token." } }
      });

      const token = await refreshAccessToken();

      expect(token).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(tokenStorage.getRefreshToken()).toBeNull();
    });
  });

  describe("4. API Client 401 Response Interceptor & Silent Retries", () => {
    it("should intercept 401, silently refresh token, and retry original request successfully", async () => {
      tokenStorage.setRefreshToken("valid-refresh-token");
      useAuthStore.getState().setAuth(
        {
          id: "u123",
          email: "test@example.com",
          name: "Test User",
          role: "user" as const,
          emailVerified: true,
          status: "active" as const,
          createdAt: new Date().toISOString()
        },
        "expired-access-token"
      );

      // Mock refresh endpoint returning new tokens
      vi.spyOn(axios, "post").mockResolvedValueOnce({
        data: {
          user: { id: "u123", email: "test@example.com", name: "Test User", role: "user" },
          accessToken: "refreshed-jwt-token-777",
          refreshToken: "rotated-refresh-token-888"
        }
      });

      // Simulate a protected request failing with 401 first, then succeeding on retry
      let callCount = 0;
      const originalAdapter = apiClient.defaults.adapter;
      apiClient.defaults.adapter = async (config) => {
        callCount++;
        if (callCount === 1) {
          // First attempt returns 401
          const error: any = new Error("Request failed with status code 401");
          error.config = config;
          error.response = { status: 401, config, data: { error: "Unauthorized" } };
          throw error;
        }

        // Retry attempt verifies Authorization header contains new refreshed token
        const authHeader = (config.headers as any)?.get
          ? (config.headers as any).get("Authorization")
          : config.headers?.Authorization;

        expect(authHeader).toBe("Bearer refreshed-jwt-token-777");

        return {
          data: { events: [{ id: "ev-1", title: "Meeting" }] },
          status: 200,
          statusText: "OK",
          headers: {},
          config
        };
      };

      try {
        const response = await apiClient.get("/calendar/events");
        expect(response.status).toBe(200);
        expect(response.data.events).toHaveLength(1);
        expect(callCount).toBe(2);
        expect(tokenStorage.getRefreshToken()).toBe("rotated-refresh-token-888");
        expect(useAuthStore.getState().accessToken).toBe("refreshed-jwt-token-777");
      } finally {
        apiClient.defaults.adapter = originalAdapter;
      }
    });

    it("should handle concurrent 401s on multiple endpoints, making only ONE refresh call and retrying all requests", async () => {
      tokenStorage.setRefreshToken("concurrent-valid-refresh-token");
      useAuthStore.getState().setAuth(
        {
          id: "u123",
          email: "test@example.com",
          name: "Test User",
          role: "user" as const,
          emailVerified: true,
          status: "active" as const,
          createdAt: new Date().toISOString()
        },
        "expired-access-token"
      );

      let resolveRefresh: (val: any) => void;
      const delayedRefresh = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      const refreshSpy = vi.spyOn(axios, "post").mockImplementationOnce(() => delayedRefresh as any);

      const endpointAttempts: Record<string, number> = {
        "/calendar/events": 0,
        "/habits": 0,
        "/finance/summary": 0
      };

      const originalAdapter = apiClient.defaults.adapter;
      apiClient.defaults.adapter = async (config) => {
        const url = config.url || "";
        endpointAttempts[url] = (endpointAttempts[url] || 0) + 1;

        if (endpointAttempts[url] === 1) {
          // First attempt for each protected endpoint fails with 401
          const error: any = new Error("Request failed with status code 401");
          error.config = config;
          error.response = { status: 401, config, data: { error: "Unauthorized" } };
          throw error;
        }

        // Retries must include the newly refreshed access token
        const authHeader = (config.headers as any)?.get
          ? (config.headers as any).get("Authorization")
          : config.headers?.Authorization;

        expect(authHeader).toBe("Bearer batch-refreshed-access-token");

        return {
          data: { url, success: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config
        };
      };

      try {
        // Fire 3 simultaneous API requests (e.g. TanStack Query dashboard mount)
        const req1 = apiClient.get("/calendar/events");
        const req2 = apiClient.get("/habits");
        const req3 = apiClient.get("/finance/summary");

        // Allow microtasks to run so all 3 requests hit 401 and queue on the refresh mutex
        await new Promise((r) => setTimeout(r, 10));

        // Exactly ONE refresh call was dispatched
        expect(refreshSpy).toHaveBeenCalledTimes(1);

        // Resolve the refresh request
        resolveRefresh!({
          data: {
            user: { id: "u123", email: "test@example.com", name: "Test User", role: "user" },
            accessToken: "batch-refreshed-access-token",
            refreshToken: "batch-rotated-refresh-token"
          }
        });

        const [res1, res2, res3] = await Promise.all([req1, req2, req3]);

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
        expect(res3.status).toBe(200);

        expect(endpointAttempts["/calendar/events"]).toBe(2);
        expect(endpointAttempts["/habits"]).toBe(2);
        expect(endpointAttempts["/finance/summary"]).toBe(2);

        expect(tokenStorage.getRefreshToken()).toBe("batch-rotated-refresh-token");
        expect(useAuthStore.getState().accessToken).toBe("batch-refreshed-access-token");
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
      } finally {
        apiClient.defaults.adapter = originalAdapter;
      }
    });

    it("should NOT intercept 401s on auth endpoints to prevent infinite refresh loops", async () => {
      const originalAdapter = apiClient.defaults.adapter;
      apiClient.defaults.adapter = async (config) => {
        const error: any = new Error("Request failed with status code 401");
        error.config = config;
        error.response = { status: 401, config, data: { message: "Invalid email or password." } };
        throw error;
      };

      const refreshSpy = vi.spyOn(axios, "post");

      try {
        await expect(apiClient.post("/auth/login", { email: "bad@example.com", password: "wrong" })).rejects.toThrow();
        expect(refreshSpy).not.toHaveBeenCalled();
      } finally {
        apiClient.defaults.adapter = originalAdapter;
      }
    });
  });
});
