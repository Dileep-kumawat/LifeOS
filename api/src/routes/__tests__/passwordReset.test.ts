import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import { Types } from "mongoose";
import crypto from "crypto";

import { authRouter } from "../auth.js";
import { User } from "../../models/User.js";
import { RefreshToken } from "../../models/RefreshToken.js";
import * as tokenService from "../../auth/tokenService.js";
import { env } from "../../config/env.js";

// Mock rate limiters so they pass through in test suite
vi.mock("../../middleware/rateLimiter.js", () => ({
  loginRateLimiter: (_req: any, _res: any, next: any) => next(),
  registerRateLimiter: (_req: any, _res: any, next: any) => next(),
  forgotPasswordRateLimiter: (_req: any, _res: any, next: any) => next(),
  resetPasswordRateLimiter: (_req: any, _res: any, next: any) => next(),
  refreshRateLimiter: (_req: any, _res: any, next: any) => next(),
  generalApiRateLimiter: (_req: any, _res: any, next: any) => next(),
  userDataExportRateLimiter: (_req: any, _res: any, next: any) => next()
}));

// Mock AuditLog to avoid DB writes during tests
vi.mock("../../models/AuditLog.js", () => ({
  AuditLog: {
    create: vi.fn().mockResolvedValue({}),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([])
    }),
    countDocuments: vi.fn().mockResolvedValue(0)
  }
}));

// Mock Mongoose models
vi.mock("../../models/User.js", () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock("../../models/RefreshToken.js", () => ({
  RefreshToken: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateOne: vi.fn(),
    find: vi.fn()
  }
}));

describe("Forgot & Reset Password Flow with Brevo", () => {
  let app: express.Express;
  let originalFetch: typeof globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    // Default Brevo configuration for tests
    (env as any).BREVO_API_KEY = "mock-brevo-api-key";
    (env as any).BREVO_SENDER_EMAIL = "noreply@lifeos.app";
    (env as any).BREVO_SENDER_NAME = "LifeOS";
    (env as any).FRONTEND_URL = "http://localhost:5173";

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/v1", authRouter);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("existing email returns 200 and sends reset email via Brevo", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: "<123@brevo>" })
      });

      const userDoc: any = {
        _id: new Types.ObjectId(),
        email: "alice@example.com",
        name: "Alice Smith",
        passwordHash: "$2a$12$someExistingHash",
        status: "active",
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(userDoc)
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "alice@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("If an account exists for that email, a reset link has been sent.");

      // Check user document was updated with hash and 30-min expiry
      expect(userDoc.save).toHaveBeenCalled();
      expect(userDoc.passwordResetTokenHash).toBeDefined();
      expect(userDoc.passwordResetExpires).toBeInstanceOf(Date);
      expect(userDoc.passwordResetExpires.getTime()).toBeGreaterThan(Date.now() + 25 * 60 * 1000);

      // Check Brevo fetch was dispatched
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.brevo.com/v3/smtp/email",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "api-key": "mock-brevo-api-key",
            "Content-Type": "application/json"
          }),
          body: expect.stringContaining("Reset your password")
        })
      );
    });

    it("unknown email returns the identical 200 and sends nothing", async () => {
      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(null)
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "unknown@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("If an account exists for that email, a reset link has been sent.");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("Google-only account (passwordHash === null) sends notice email and does NOT generate reset token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: "<google-notice@brevo>" })
      });

      const userDoc: any = {
        _id: new Types.ObjectId(),
        email: "googleuser@example.com",
        name: "Google User",
        passwordHash: null,
        googleId: "google-12345",
        status: "active",
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(userDoc)
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "googleuser@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("If an account exists for that email, a reset link has been sent.");

      // No password reset token should be generated
      expect(userDoc.save).not.toHaveBeenCalled();
      expect(userDoc.passwordResetTokenHash).toBeUndefined();

      // Brevo sent Google account guidance
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.brevo.com/v3/smtp/email",
        expect.objectContaining({
          body: expect.stringContaining("Google Sign-In")
        })
      );
    });

    it("silently skips users with status suspended or pending_deletion", async () => {
      const suspendedUser: any = {
        _id: new Types.ObjectId(),
        email: "suspended@example.com",
        name: "Suspended User",
        passwordHash: "$2a$12$hash",
        status: "suspended",
        save: vi.fn()
      };

      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(suspendedUser)
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "suspended@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("If an account exists for that email, a reset link has been sent.");
      expect(suspendedUser.save).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("Brevo failure (mock fetch error/timeout) does not break response (fail-open)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Brevo network timeout"));

      const userDoc: any = {
        _id: new Types.ObjectId(),
        email: "bob@example.com",
        name: "Bob",
        passwordHash: "$2a$12$hash",
        status: "active",
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(userDoc)
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "bob@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("If an account exists for that email, a reset link has been sent.");
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("resets password, revokes all refresh tokens, and sends confirmation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: "<confirm@brevo>" })
      });

      const revokeSpy = vi.spyOn(tokenService, "revokeAllUserTokens");

      const rawToken = "valid-raw-reset-token-1234567890";
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const userId = new Types.ObjectId();

      const userDoc: any = {
        _id: userId,
        email: "carol@example.com",
        name: "Carol",
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: new Date(Date.now() + 20 * 60 * 1000), // 20m in future
        status: "active",
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(userDoc)
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: rawToken,
          newPassword: "BrandNewPassword123"
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password reset successful. Please log in with your new password.");

      // Check token and expiry cleared
      expect(userDoc.passwordResetTokenHash).toBeNull();
      expect(userDoc.passwordResetExpires).toBeNull();
      expect(userDoc.passwordHash).toBeDefined();
      expect(userDoc.save).toHaveBeenCalled();

      // Check refresh tokens revoked
      expect(revokeSpy).toHaveBeenCalledWith(userId.toString());
      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        { userId: userId.toString(), revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } }
      );
    });

    it("rejects expired token with 400", async () => {
      // User.findOne will return null because expiry is in the past
      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(null)
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "expired-raw-token",
          newPassword: "NewValidPassword123"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("BadRequest");
      expect(res.body.message).toBe("Invalid or expired password reset token.");
    });

    it("rejects second attempt with the same token (single-use)", async () => {
      // First attempt succeeds
      const userDoc: any = {
        _id: new Types.ObjectId(),
        email: "dave@example.com",
        name: "Dave",
        passwordResetTokenHash: "hash-dave",
        passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
        status: "active",
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(User.findOne).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue(userDoc)
      } as any);

      const res1 = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "dave-token",
          newPassword: "ValidPassword123"
        });

      expect(res1.status).toBe(200);

      // On second attempt, User.findOne returns null because hash was cleared
      vi.mocked(User.findOne).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue(null)
      } as any);

      const res2 = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "dave-token",
          newPassword: "AnotherPassword123"
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error).toBe("BadRequest");
      expect(res2.body.message).toBe("Invalid or expired password reset token.");
    });

    it("rejects passwords failing validation rules (min 10 chars, letter and number)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "any-token",
          newPassword: "short"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("ValidationError");
    });
  });
});
