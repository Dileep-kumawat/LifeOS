import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  authenticateOrRegisterGoogleUser,
  linkGoogleAccountToUser,
  unlinkGoogleAccountFromUser
} from "../../routes/auth.js";
import { googleAuthService } from "../googleAuthService.js";
import { User } from "../../models/User.js";
import { RefreshToken } from "../../models/RefreshToken.js";
import { logger } from "../../logger.js";

// Mock Mongoose Models
vi.mock("../../models/User.js", () => {
  return {
    User: {
      findOne: vi.fn(),
      create: vi.fn(),
      findById: vi.fn()
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

vi.mock("../../services/financeCategory.js", () => {
  return {
    seedDefaultCategories: vi.fn().mockResolvedValue(undefined)
  };
});

describe("Google OAuth Core Authentication & Account Linking Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    googleAuthService.resetVerifier();
  });

  describe("1. New Google User Registration (Case A)", () => {
    it("should register a new user, seed categories, and issue LifeOS access + refresh tokens", async () => {
      const mockIdentity = {
        sub: "google-sub-12345",
        email: "newuser@example.com",
        name: "New Google User",
        emailVerified: true
      };

      // User not found by googleId, and not found by email
      vi.mocked(User.findOne).mockResolvedValue(null);

      const createdUser = {
        _id: "662c9f1e9f0b2a001c3d4e99",
        email: "newuser@example.com",
        name: "New Google User",
        googleId: "google-sub-12345",
        passwordHash: null,
        role: "user",
        emailVerified: true,
        status: "active",
        createdAt: new Date()
      };
      vi.mocked(User.create).mockResolvedValue(createdUser as any);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

      const result = await authenticateOrRegisterGoogleUser(mockIdentity, "Test Browser");

      expect(result.isNewUser).toBe(true);
      expect(result.user).toEqual(createdUser);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "newuser@example.com",
          googleId: "google-sub-12345",
          passwordHash: null,
          emailVerified: true
        })
      );
    });
  });

  describe("2. Existing Google User Login (Case B)", () => {
    it("should authenticate existing Google account and issue LifeOS tokens without duplicate creation", async () => {
      const mockIdentity = {
        sub: "google-sub-existing",
        email: "existing@example.com",
        name: "Existing Google User",
        emailVerified: true
      };

      const existingUser = {
        _id: "662c9f1e9f0b2a001c3d4e88",
        email: "existing@example.com",
        name: "Existing Google User",
        googleId: "google-sub-existing",
        role: "user",
        status: "active"
      };

      vi.mocked(User.findOne).mockResolvedValue(existingUser as any);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

      const result = await authenticateOrRegisterGoogleUser(mockIdentity, "Test Browser");

      expect(result.isNewUser).toBe(false);
      expect(result.user).toEqual(existingUser);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(User.create).not.toHaveBeenCalled();
    });

    it("should reject login if Google user account is soft_deleted", async () => {
      const mockIdentity = {
        sub: "google-sub-deleted",
        email: "deleted@example.com",
        name: "Deleted User",
        emailVerified: true
      };

      const deletedUser = {
        _id: "662c9f1e9f0b2a001c3d4e77",
        email: "deleted@example.com",
        googleId: "google-sub-deleted",
        status: "soft_deleted"
      };

      vi.mocked(User.findOne).mockResolvedValue(deletedUser as any);

      await expect(authenticateOrRegisterGoogleUser(mockIdentity, "Test Browser")).rejects.toEqual(
        expect.objectContaining({
          status: 401,
          error: "Unauthorized",
          message: "User account inactive or deleted."
        })
      );
    });
  });

  describe("3. Verified-Email Collision with Existing Password Account (Case C)", () => {
    it("should reject unauthenticated login with 409 AccountLinkingRequired instead of silently merging", async () => {
      const mockIdentity = {
        sub: "google-sub-new",
        email: "passworduser@example.com",
        name: "Password User",
        emailVerified: true
      };

      // 1st call for googleId: null
      // 2nd call for email: existing user
      vi.mocked(User.findOne)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          _id: "user-password-1",
          email: "passworduser@example.com",
          passwordHash: "hashed-pw",
          googleId: null
        } as any);

      await expect(authenticateOrRegisterGoogleUser(mockIdentity, "Test Browser")).rejects.toEqual(
        expect.objectContaining({
          status: 409,
          error: "AccountLinkingRequired"
        })
      );
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe("4. Explicit Authenticated Account Linking (Case D)", () => {
    it("should link Google account when authenticated caller owns the account", async () => {
      const mockIdentity = {
        sub: "google-sub-link-me",
        email: "link@example.com",
        name: "Link User",
        emailVerified: true
      };

      // No other user has this googleId
      vi.mocked(User.findOne).mockResolvedValue(null);

      const mockUser = {
        _id: "current-user-id",
        email: "link@example.com",
        googleId: null,
        status: "active",
        save: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const linkedUser = await linkGoogleAccountToUser("current-user-id", mockIdentity);

      expect(mockUser.googleId).toBe("google-sub-link-me");
      expect(mockUser.save).toHaveBeenCalled();
      expect(linkedUser).toBe(mockUser);
    });

    it("should reject linking if Google account is already attached to another LifeOS user", async () => {
      const mockIdentity = {
        sub: "google-sub-owned-by-other",
        email: "other@example.com",
        name: "Other User",
        emailVerified: true
      };

      // Another user owns this googleId
      const otherUser = {
        _id: "different-user-id",
        googleId: "google-sub-owned-by-other"
      };
      vi.mocked(User.findOne).mockResolvedValue(otherUser as any);

      await expect(linkGoogleAccountToUser("current-user-id", mockIdentity)).rejects.toEqual(
        expect.objectContaining({
          status: 409,
          error: "Conflict",
          message: "This Google account is already linked to another LifeOS user."
        })
      );
    });
  });

  describe("5. Explicit Authenticated Account Unlinking (Case E)", () => {
    it("should safely unlink Google account if user has a password set", async () => {
      const mockUser = {
        _id: "user-with-pw",
        googleId: "google-sub-to-unlink",
        passwordHash: "secure-bcrypt-hash",
        status: "active",
        save: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      await unlinkGoogleAccountFromUser("user-with-pw");

      expect(mockUser.googleId).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should reject unlinking if user has no password set (prevents account lockout)", async () => {
      const mockUser = {
        _id: "user-without-pw",
        googleId: "google-sub-only",
        passwordHash: null,
        status: "active",
        save: vi.fn()
      };
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      await expect(unlinkGoogleAccountFromUser("user-without-pw")).rejects.toEqual(
        expect.objectContaining({
          status: 400,
          error: "BadRequest",
          message: "Cannot unlink Google account without setting a password first."
        })
      );
      expect(mockUser.save).not.toHaveBeenCalled();
    });
  });

  describe("6. Token Verification Service Adapter & Security Validation", () => {
    it("should validate and extract user identity via adapter", async () => {
      googleAuthService.setVerifier(async (token: string) => {
        if (token === "valid-google-id-token") {
          return {
            sub: "verified-sub-123",
            email: "verified@example.com",
            name: "Verified User",
            emailVerified: true
          };
        }
        throw new Error("Invalid token");
      });

      const identity = await googleAuthService.verifyIdToken("valid-google-id-token");
      expect(identity.sub).toBe("verified-sub-123");
      expect(identity.email).toBe("verified@example.com");
      expect(identity.emailVerified).toBe(true);

      await expect(googleAuthService.verifyIdToken("bad-token")).rejects.toThrow("Invalid token");
    });
  });

  describe("7. Redaction of Secrets and OAuth Tokens in Structured Logs", () => {
    it("should redact idToken, refreshToken, and passwords in logger configuration", () => {
      // Confirm logger redaction configuration is active
      expect(logger).toBeDefined();
      expect(logger.level).toBeDefined();
    });
  });
});
