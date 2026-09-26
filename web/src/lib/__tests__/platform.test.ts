import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isInsideNativeApp } from "../platform";

describe("isInsideNativeApp platform detection", () => {
  beforeEach(() => {
    (globalThis as any).window = globalThis;
    delete (globalThis as any).Capacitor;
    delete (globalThis as any).LIFEOS_APP_SHELL;
    delete (globalThis as any).LifeOSNative;
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
    delete (globalThis as any).LIFEOS_APP_SHELL;
    delete (globalThis as any).LifeOSNative;
  });

  it("returns false in a standard desktop or mobile web browser", () => {
    expect(isInsideNativeApp()).toBe(false);
  });

  it("returns true when window.Capacitor.isNativePlatform() is true", () => {
    (globalThis as any).Capacitor = {
      isNativePlatform: vi.fn().mockReturnValue(true),
      getPlatform: vi.fn().mockReturnValue("android")
    };
    expect(isInsideNativeApp()).toBe(true);
  });

  it("returns true when window.LIFEOS_APP_SHELL is true", () => {
    (globalThis as any).LIFEOS_APP_SHELL = true;
    expect(isInsideNativeApp()).toBe(true);
  });

  it("returns true when window.LifeOSNative bridge is present", () => {
    (globalThis as any).LifeOSNative = {};
    expect(isInsideNativeApp()).toBe(true);
  });

  it("returns false when Capacitor runs on web platform preview", () => {
    (globalThis as any).Capacitor = {
      isNativePlatform: vi.fn().mockReturnValue(false),
      getPlatform: vi.fn().mockReturnValue("web")
    };
    expect(isInsideNativeApp()).toBe(false);
  });
});
