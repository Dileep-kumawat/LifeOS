import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import { Types } from "mongoose";
import { authRouter } from "../auth.js";
import { googleAuthService } from "../../auth/googleAuthService.js";
import { User } from "../../models/User.js";
import { RefreshToken } from "../../models/RefreshToken.js";

const testUserId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e0a");

// Mock rate limiter to pass through
vi.mock("../../middleware/rateLimiter.js", () => ({
  loginRateLimiter: (_req: any, _res: any, next: any) => next()
}));

// Mock auth middleware for protected endpoints
vi.mock("../../middleware/authMiddleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
    }
    req.user = {
      _id: testUserId,
      email: "authenticated@example.com",
      name: "Authenticated User",
      role: "user",
      emailVerified: true,
      status: "active",
      googleId: null,
      passwordHash: "existing-password-hash"
    };
    next();
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
    updateMany: vi.fn(),
    updateOne: vi.fn(),
    find: vi.fn()
  }
}));

vi.mock("../../services/financeCategory.js", () => ({
  seedDefaultCategories: vi.fn().mockResolvedValue(undefined)
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/v1", authRouter);

describe("Google OAuth API Routes Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    googleAuthService.resetVerifier();
  });

  describe("POST /api/v1/auth/google", () => {
    it("should register a new Google user and return 201 with tokens and cookie", async () => {
      googleAuthService.setVerifier(async (token) => {
        if (token === "valid-new-token") {
          return {
            sub: "google-new-sub",
            email: "brandnew@example.com",
            name: "Brand New User",
            emailVerified: true
          };
        }
        throw new Error("Invalid token");
      });

      vi.mocked(User.findOne).mockResolvedValue(null);
      const createdUser = {
        _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e11"),
        email: "brandnew@example.com",
        name: "Brand New User",
        googleId: "google-new-sub",
        passwordHash: null,
        role: "user",
        emailVerified: true,
        status: "active",
        createdAt: new Date()
      };
      vi.mocked(User.create).mockResolvedValue(createdUser as any);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

      const response = await request(app)
        .post("/api/v1/auth/google")
        .send({ idToken: "valid-new-token" });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe("brandnew@example.com");
      expect(response.body.user.googleId).toBe("google-new-sub");
      expect(response.body.accessToken).toBeDefined();
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should authenticate an existing Google user and return 200", async () => {
      googleAuthService.setVerifier(async () => ({
        sub: "google-existing-sub",
        email: "existing@example.com",
        name: "Existing User",
        emailVerified: true
      }));

      const existingUser = {
        _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e22"),
        email: "existing@example.com",
        name: "Existing User",
        googleId: "google-existing-sub",
        passwordHash: null,
        role: "user",
        emailVerified: true,
        status: "active",
        createdAt: new Date()
      };
      vi.mocked(User.findOne).mockResolvedValue(existingUser as any);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

      const response = await request(app)
        .post("/api/v1/auth/google")
        .send({ idToken: "valid-existing-token" });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe("existing@example.com");
      expect(response.body.accessToken).toBeDefined();
    });

    it("should return 409 AccountLinkingRequired if email exists without linked Google account", async () => {
      googleAuthService.setVerifier(async () => ({
        sub: "google-collision-sub",
        email: "colliding@example.com",
        name: "Collision User",
        emailVerified: true
      }));

      // 1st lookup by googleId -> null, 2nd by email -> existing user
      vi.mocked(User.findOne)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e33"),
          email: "colliding@example.com",
          googleId: null
        } as any);

      const response = await request(app)
        .post("/api/v1/auth/google")
        .send({ idToken: "colliding-token" });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe("AccountLinkingRequired");
      expect(response.body.message).toContain("Please log in with your password and link your Google account");
    });

    it("should return 401 for invalid Google ID token", async () => {
      googleAuthService.setVerifier(async () => {
        throw new Error("Invalid token signature or expired");
      });

      const response = await request(app)
        .post("/api/v1/auth/google")
        .send({ idToken: "invalid-token" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/v1/auth/google redirect initiation", () => {
    it("should set oauth_state cookie and redirect to Google OAuth URL", async () => {
      const response = await request(app).get("/api/v1/auth/google");
      // If GOOGLE_CLIENT_ID not set or set, returns 302 or 503
      if (response.status === 302) {
        expect(response.headers.location).toContain("accounts.google.com");
        expect(response.headers["set-cookie"]).toBeDefined();
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  describe("GET /api/v1/auth/google/callback redirect handler", () => {
    it("should reject redirect if state token is missing or mismatched", async () => {
      const response = await request(app)
        .get("/api/v1/auth/google/callback?code=mock_code&state=mismatched_state")
        .set("Cookie", ["oauth_state=original_state"]);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("error=invalid_oauth_state");
    });
  });

  describe("POST /api/v1/auth/google/link", () => {
    it("should link Google account for authenticated user", async () => {
      googleAuthService.setVerifier(async () => ({
        sub: "new-linked-sub-999",
        email: "authenticated@example.com",
        name: "Authenticated User",
        emailVerified: true
      }));

      // No other user has this googleId
      vi.mocked(User.findOne).mockResolvedValue(null);

      const mockDbUser = {
        _id: testUserId,
        email: "authenticated@example.com",
        name: "Authenticated User",
        role: "user",
        emailVerified: true,
        status: "active",
        googleId: null,
        passwordHash: "some-hash",
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(User.findById).mockResolvedValue(mockDbUser as any);

      const response = await request(app)
        .post("/api/v1/auth/google/link")
        .set("Authorization", "Bearer valid-token")
        .send({ idToken: "linkable-google-id-token" });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Google account linked successfully");
      expect(mockDbUser.googleId).toBe("new-linked-sub-999");
      expect(mockDbUser.save).toHaveBeenCalled();
    });

    it("should return 409 if Google account is already linked to another user", async () => {
      googleAuthService.setVerifier(async () => ({
        sub: "already-owned-sub",
        email: "other@example.com",
        name: "Other",
        emailVerified: true
      }));

      const otherUser = {
        _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e99"),
        googleId: "already-owned-sub"
      };
      vi.mocked(User.findOne).mockResolvedValue(otherUser as any);

      const response = await request(app)
        .post("/api/v1/auth/google/link")
        .set("Authorization", "Bearer valid-token")
        .send({ idToken: "owned-token" });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("already linked to another LifeOS user");
    });
  });

  describe("DELETE /api/v1/auth/google/link", () => {
    it("should unlink Google account for authenticated user who has password", async () => {
      const mockDbUser = {
        _id: testUserId,
        email: "authenticated@example.com",
        name: "Authenticated User",
        role: "user",
        emailVerified: true,
        status: "active",
        googleId: "sub-to-unlink",
        passwordHash: "has-password-hash",
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(User.findById).mockResolvedValue(mockDbUser as any);

      const response = await request(app)
        .delete("/api/v1/auth/google/link")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Google account unlinked successfully");
      expect(mockDbUser.googleId).toBeNull();
      expect(mockDbUser.save).toHaveBeenCalled();
    });

    it("should reject unlinking with 400 if user has no password set", async () => {
      const mockDbUser = {
        _id: testUserId,
        email: "authenticated@example.com",
        name: "Authenticated User",
        role: "user",
        emailVerified: true,
        status: "active",
        googleId: "sub-only",
        passwordHash: null,
        createdAt: new Date(),
        save: vi.fn()
      };
      vi.mocked(User.findById).mockResolvedValue(mockDbUser as any);

      const response = await request(app)
        .delete("/api/v1/auth/google/link")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Cannot unlink Google account without setting a password first");
      expect(mockDbUser.save).not.toHaveBeenCalled();
    });
  });
});
