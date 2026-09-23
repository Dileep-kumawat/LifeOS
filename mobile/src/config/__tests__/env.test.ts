import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: null
  }
}));

import Constants from "expo-constants";
import {
  getAppEnvironment,
  resolveApiBaseUrl,
  resolveApiOrigin,
  PRODUCTION_API_ORIGIN,
  PRODUCTION_API_URL
} from "../env";

describe("Mobile Environment Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EXPO_PUBLIC_APP_ENV;
    delete process.env.EXPO_PUBLIC_ENV;
    delete process.env.EXPO_PUBLIC_API_URL;
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
    (Constants as any).expoConfig = null;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getAppEnvironment", () => {
    it("should default to development if no environment variables are set", () => {
      expect(getAppEnvironment()).toBe("development");
    });

    it("should return production when EXPO_PUBLIC_APP_ENV=production", () => {
      process.env.EXPO_PUBLIC_APP_ENV = "production";
      expect(getAppEnvironment()).toBe("production");
    });

    it("should return production when EXPO_PUBLIC_ENV=production (alias)", () => {
      process.env.EXPO_PUBLIC_ENV = "production";
      expect(getAppEnvironment()).toBe("production");
    });

    it("should return development when EXPO_PUBLIC_APP_ENV=development", () => {
      process.env.EXPO_PUBLIC_APP_ENV = "development";
      expect(getAppEnvironment()).toBe("development");
    });

    it("should handle whitespace and case-insensitivity", () => {
      process.env.EXPO_PUBLIC_APP_ENV = "  PRODUCTION  ";
      expect(getAppEnvironment()).toBe("production");
    });
  });

  describe("resolveApiBaseUrl", () => {
    it("should return production API URL when in production mode", () => {
      process.env.EXPO_PUBLIC_APP_ENV = "production";
      expect(resolveApiBaseUrl()).toBe(PRODUCTION_API_URL);
      expect(resolveApiBaseUrl()).toBe("https://lifeos-api-hqcz.onrender.com/api/v1");
    });

    it("should return localhost:4000 in development mode when no hostUri is available", () => {
      process.env.EXPO_PUBLIC_APP_ENV = "development";
      (Constants as any).expoConfig = null;
      expect(resolveApiBaseUrl()).toBe("http://localhost:4000/api/v1");
    });

    it("should return host machine IP in development mode when running over Wi-Fi", () => {
      process.env.EXPO_PUBLIC_APP_ENV = "development";
      (Constants as any).expoConfig = { hostUri: "192.168.1.145:8081" };
      expect(resolveApiBaseUrl()).toBe("http://192.168.1.145:4000/api/v1");
    });

    it("should ignore localhost/127.0.0.1 in hostUri and fall back to localhost:4000", () => {
      process.env.EXPO_PUBLIC_APP_ENV = "development";
      (Constants as any).expoConfig = { hostUri: "localhost:8081" };
      expect(resolveApiBaseUrl()).toBe("http://localhost:4000/api/v1");

      (Constants as any).expoConfig = { hostUri: "127.0.0.1:8081" };
      expect(resolveApiBaseUrl()).toBe("http://localhost:4000/api/v1");
    });

    it("should honor explicit EXPO_PUBLIC_API_URL override regardless of mode", () => {
      process.env.EXPO_PUBLIC_APP_ENV = "development";
      process.env.EXPO_PUBLIC_API_URL = "https://custom-staging.example.com/api/v1/";
      expect(resolveApiBaseUrl()).toBe("https://custom-staging.example.com/api/v1");
    });
  });

  describe("resolveApiOrigin", () => {
    it("should extract origin from production URL", () => {
      expect(resolveApiOrigin(PRODUCTION_API_URL)).toBe(PRODUCTION_API_ORIGIN);
      expect(resolveApiOrigin("https://lifeos-api-hqcz.onrender.com/api/v1")).toBe(
        "https://lifeos-api-hqcz.onrender.com"
      );
    });

    it("should extract origin from localhost URL", () => {
      expect(resolveApiOrigin("http://localhost:4000/api/v1")).toBe("http://localhost:4000");
    });

    it("should extract origin from LAN IP URL", () => {
      expect(resolveApiOrigin("http://192.168.1.50:4000/api/v1")).toBe(
        "http://192.168.1.50:4000"
      );
    });
  });
});
