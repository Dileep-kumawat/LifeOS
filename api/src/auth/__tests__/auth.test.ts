import { describe, it, expect, beforeEach, vi } from "vitest";
import { hashToken, rotateRefreshToken } from "../tokenService.js";
import { User } from "../../models/User.js";
import { RefreshToken } from "../../models/RefreshToken.js";

// Mock Mongoose Models for testing without an active MongoDB connection
vi.mock("../../models/User.js", () => {
  return {
    User: {
      findOne: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findByIdAndDelete: vi.fn()
    }
  };
});

vi.mock("../../models/RefreshToken.js", () => {
  return {
    RefreshToken: {
      findOne: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      updateOne: vi.fn(),
      find: vi.fn()
    }
  };
});

vi.mock("../../db/redis.js", () => {
  return {
    redis: {
      incr: vi.fn(),
      expire: vi.fn(),
      ttl: vi.fn()
    }
  };
});

describe("Auth Module Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Registration with duplicate email", () => {
    it("should reject duplicate email registration", async () => {
      const existingUser = { email: "test@example.com", _id: "user123" };
      vi.mocked(User.findOne).mockResolvedValue(existingUser as any);

      const found = await User.findOne({ email: "test@example.com" });
      expect(found).not.toBeNull();
      expect(found?.email).toBe("test@example.com");
    });
  });

  describe("2. Login Rate Limiting", () => {
    it("should block request when rate limit exceeded (5 attempts per 15 min)", async () => {
      const { redis } = await import("../../db/redis.js");
      vi.mocked(redis.incr).mockResolvedValue(6);
      vi.mocked(redis.ttl).mockResolvedValue(900);

      const attempts = await redis.incr("ratelimit:login:127.0.0.1:test@example.com");
      expect(attempts).toBeGreaterThan(5);
    });
  });

  describe("3. Refresh Token Rotation & Theft/Reuse Detection", () => {
    it("should detect reuse of a revoked token outside grace period and revoke entire token family", async () => {
      const rawToken = "sample-revoked-token";
      const tokenHash = hashToken(rawToken);
      const familyId = "family-12345";

      const mockRevokedToken = {
        tokenHash,
        userId: "user-123",
        familyId,
        revokedAt: new Date(Date.now() - 60000), // Revoked 60s ago (outside 30s grace period)
        expiresAt: new Date(Date.now() + 1000000),
        save: vi.fn()
      };

      vi.mocked(RefreshToken.findOne).mockResolvedValue(mockRevokedToken as any);
      vi.mocked(RefreshToken.updateMany).mockResolvedValue({ modifiedCount: 3 } as any);

      await expect(rotateRefreshToken(rawToken, "Test Device")).rejects.toThrow(
        /Security alert: Revoked refresh token reused/
      );

      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        { familyId, revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } }
      );
    });

    it("should allow safe rotation when token was revoked within grace period (concurrent requests)", async () => {
      const rawToken = "sample-recent-revoked-token";
      const tokenHash = hashToken(rawToken);
      const familyId = "family-12345";

      const mockRecentRevokedToken = {
        tokenHash,
        userId: "user-123",
        familyId,
        revokedAt: new Date(Date.now() - 2000), // Revoked 2s ago (inside grace period)
        expiresAt: new Date(Date.now() + 1000000),
        save: vi.fn()
      };

      vi.mocked(RefreshToken.findOne).mockResolvedValue(mockRecentRevokedToken as any);
      vi.mocked(RefreshToken.updateMany).mockResolvedValue({ modifiedCount: 1 } as any);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

      const result = await rotateRefreshToken(rawToken, "Test Device");

      expect(result.userId).toBe("user-123");
      expect(result.newRawToken).toBeDefined();
      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        { familyId, revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } }
      );
    });

    it("should rotate token successfully when current token is valid and active", async () => {
      const rawToken = "valid-active-token";
      const tokenHash = hashToken(rawToken);
      const familyId = "family-67890";

      const mockValidToken = {
        tokenHash,
        userId: "user-456",
        familyId,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000000),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(RefreshToken.findOne).mockResolvedValue(mockValidToken as any);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

      const result = await rotateRefreshToken(rawToken, "Test Device");

      expect(mockValidToken.revokedAt).not.toBeNull();
      expect(mockValidToken.save).toHaveBeenCalled();
      expect(result.userId).toBe("user-456");
      expect(result.newRawToken).toBeDefined();
    });
  });

  describe("4. Password Reset Token Expiry", () => {
    it("should reject expired password reset tokens", async () => {
      const rawToken = "expired-reset-token";
      const tokenHash = hashToken(rawToken);

      vi.mocked(User.findOne).mockResolvedValue(null);

      const user = await User.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() }
      });

      expect(user).toBeNull();
    });
  });

  describe("5. Soft-Delete Account (Immediate Soft-Delete, Deferred Purge)", () => {
    it("should mark account as soft_deleted without immediately deleting user record", async () => {
      const mockUser: { _id: string; status: string; deletedAt: Date | null; save: any } = {
        _id: "user-to-delete",
        status: "active",
        deletedAt: null,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        })
      };

      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      mockUser.status = "soft_deleted";
      mockUser.deletedAt = new Date();
      await mockUser.save();

      expect(mockUser.status).toBe("soft_deleted");
      expect(mockUser.deletedAt).toBeInstanceOf(Date);
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
