import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockAxiosInstance } = vi.hoisted(() => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    },
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  };
  return { mockAxiosInstance: instance };
});

// Mock React Native and Expo SecureStore before importing services
vi.mock("react-native", () => ({
  Platform: { OS: "ios" }
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: null
  }
}));

vi.mock("expo-secure-store", () => {
  const store: Record<string, string> = {};
  return {
    AFTER_FIRST_UNLOCK: "AFTER_FIRST_UNLOCK",
    setItemAsync: vi.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    getItemAsync: vi.fn(async (key: string) => store[key] ?? null),
    deleteItemAsync: vi.fn(async (key: string) => {
      delete store[key];
    })
  };
});

vi.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn()
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn(() => "exp://127.0.0.1:8081/--/oauth")
}));

vi.mock("axios", () => {
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
  };
});

import { useAuthStore } from "../../store/authStore";
import { tokenStorage } from "../tokenStorage";
import { authApi } from "../apiClient";

describe("Mobile Auth Flow & Token Storage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
    await tokenStorage.clearRefreshToken();
  });

  describe("1. Zustand Auth Store Shape & State Transitions", () => {
    it("should start with unauthenticated state", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should set user and access token on setAuth", () => {
      const mockUser = {
        id: "usr-1",
        email: "jane@example.com",
        name: "Jane Doe",
        role: "user" as const,
        emailVerified: false,
        status: "active" as const,
        createdAt: new Date().toISOString()
      };
      const mockToken = "access-token-xyz";

      useAuthStore.getState().setAuth(mockUser, mockToken);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(mockToken);
    });

    it("should clear auth state on clearAuth", () => {
      const mockUser = {
        id: "usr-1",
        email: "jane@example.com",
        name: "Jane Doe",
        role: "user" as const,
        emailVerified: false,
        status: "active" as const,
        createdAt: new Date().toISOString()
      };
      useAuthStore.getState().setAuth(mockUser, "token-123");
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });
  });

  describe("2. Token Storage (SecureStore Encryption)", () => {
    it("should store, retrieve, and clear refresh token", async () => {
      await tokenStorage.setRefreshToken("secure-refresh-token-123");
      const retrieved = await tokenStorage.getRefreshToken();
      expect(retrieved).toBe("secure-refresh-token-123");

      await tokenStorage.clearRefreshToken();
      const cleared = await tokenStorage.getRefreshToken();
      expect(cleared).toBeNull();
    });
  });

  describe("3. Auth API Integration", () => {
    it("should store refresh token securely and update Zustand on login", async () => {
      const mockUser = {
        id: "usr-1",
        email: "jane@example.com",
        name: "Jane Doe",
        role: "user" as const,
        emailVerified: false,
        status: "active" as const,
        createdAt: new Date().toISOString()
      };
      const mockResponse = {
        data: {
          user: mockUser,
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token"
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse as any);

      const result = await authApi.login({
        email: "jane@example.com",
        password: "Password123!"
      });

      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe("new-access-token");
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe("new-access-token");

      const savedRefreshToken = await tokenStorage.getRefreshToken();
      expect(savedRefreshToken).toBe("new-refresh-token");
    });

    it("should store refresh token securely and update Zustand on loginWithGoogle", async () => {
      const mockGoogleUser = {
        id: "usr-google-1",
        email: "googleuser@example.com",
        name: "Google User",
        role: "user" as const,
        emailVerified: true,
        status: "active" as const,
        googleId: "google-sub-xyz",
        createdAt: new Date().toISOString()
      };
      const mockResponse = {
        data: {
          user: mockGoogleUser,
          accessToken: "google-access-token",
          refreshToken: "google-refresh-token"
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse as any);

      const result = await authApi.loginWithGoogle({
        idToken: "mock-google-id-token"
      });

      expect(result.user).toEqual(mockGoogleUser);
      expect(result.accessToken).toBe("google-access-token");
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockGoogleUser);

      const savedRefreshToken = await tokenStorage.getRefreshToken();
      expect(savedRefreshToken).toBe("google-refresh-token");
    });

    it("should handle startGoogleOAuth and ingest direct tokens and user profile", async () => {
      const WebBrowser = await import("expo-web-browser");
      const mockOAuthUser = {
        id: "usr-oauth-mobile",
        email: "mobile@example.com",
        name: "Mobile User",
        role: "user" as const,
        emailVerified: true,
        status: "active" as const,
        googleId: "google-mobile-sub",
        createdAt: new Date().toISOString()
      };

      vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
        type: "success",
        url: `exp://127.0.0.1:8081/--/oauth?oauth_success=true&accessToken=mobile-jwt-access&refreshToken=mobile-jwt-refresh&user=${encodeURIComponent(
          JSON.stringify(mockOAuthUser)
        )}`
      } as any);

      const result = await authApi.startGoogleOAuth();

      expect(result).not.toBeNull();
      expect(result?.user).toEqual(mockOAuthUser);
      expect(result?.accessToken).toBe("mobile-jwt-access");
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(await tokenStorage.getRefreshToken()).toBe("mobile-jwt-refresh");
    });

    it("should update user in Zustand on linkGoogle and unlinkGoogle", async () => {
      const initialUser = {
        id: "usr-link-1",
        email: "user@example.com",
        name: "User",
        role: "user" as const,
        emailVerified: true,
        status: "active" as const,
        googleId: null,
        createdAt: new Date().toISOString()
      };
      useAuthStore.getState().setAuth(initialUser, "acc-token");

      const linkedUser = { ...initialUser, googleId: "google-sub-999" };
      mockAxiosInstance.post.mockResolvedValue({
        data: { message: "Google account linked successfully", user: linkedUser }
      } as any);

      await authApi.linkGoogle({ idToken: "link-token" });
      expect(useAuthStore.getState().user?.googleId).toBe("google-sub-999");

      mockAxiosInstance.delete.mockResolvedValue({
        data: { message: "Google account unlinked successfully", user: initialUser }
      } as any);

      await authApi.unlinkGoogle();
      expect(useAuthStore.getState().user?.googleId).toBeNull();
    });

    it("should clear both SecureStore and in-memory Zustand state on logout", async () => {
      await tokenStorage.setRefreshToken("sample-refresh");
      useAuthStore.getState().setAuth({ id: "1" } as any, "access-token");

      mockAxiosInstance.post.mockResolvedValue({ data: { message: "Logged out" } } as any);

      await authApi.logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
    });
  });
});
