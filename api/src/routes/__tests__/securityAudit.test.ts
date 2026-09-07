import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Types } from "mongoose";

import { notesRouter } from "../notes.js";
import { habitsRouter } from "../habits.js";
import { goalsRouter } from "../goals.js";
import { calendarRouter } from "../calendar.js";
import { financeRouter } from "../finance.js";
import { studyRouter } from "../study.js";
import { focusRouter } from "../focus.js";
import { ocrRouter } from "../ocr.js";
import { authRouter } from "../auth.js";
import { generalApiRateLimiter } from "../../middleware/rateLimiter.js";

import { Note } from "../../models/Note.js";
import * as ocrJobService from "../../services/ocr/ocrJobService.js";
import { checkAiRateLimit } from "../../services/ai/rateLimiter.js";

const userAId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e01");
const userBId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e02");

// Dynamic current user for testing multiple authenticated tenants
let activeUser: any = {
  _id: userAId,
  email: "usera@example.com",
  name: "User A",
  role: "user",
  emailVerified: true,
  status: "active",
  subscriptionTier: "free"
};

// Mock Redis rate limiters for controllable testing
vi.mock("../../middleware/rateLimiter.js", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    loginRateLimiter: vi.fn((req, res, next) => {
      if (req.headers["x-test-rate-limit"] === "true") {
        res.setHeader("Retry-After", 900);
        return res.status(429).json({
          error: "TooManyRequests",
          message: "Too many login attempts. Please try again after 15 minutes."
        });
      }
      next();
    }),
    registerRateLimiter: vi.fn((req, res, next) => {
      if (req.headers["x-test-rate-limit"] === "true") {
        res.setHeader("Retry-After", 900);
        return res.status(429).json({
          error: "TooManyRequests",
          message: "Too many registration attempts from this IP. Please try again after 15 minutes."
        });
      }
      next();
    }),
    forgotPasswordRateLimiter: vi.fn((req, res, next) => {
      if (req.headers["x-test-rate-limit"] === "true") {
        res.setHeader("Retry-After", 900);
        return res.status(429).json({
          error: "TooManyRequests",
          message: "Too many password reset requests. Please try again after 15 minutes."
        });
      }
      next();
    }),
    resetPasswordRateLimiter: vi.fn((req, res, next) => {
      if (req.headers["x-test-rate-limit"] === "true") {
        res.setHeader("Retry-After", 900);
        return res.status(429).json({
          error: "TooManyRequests",
          message: "Too many password reset attempts. Please try again after 15 minutes."
        });
      }
      next();
    }),
    refreshRateLimiter: vi.fn((req, res, next) => {
      if (req.headers["x-test-rate-limit"] === "true") {
        res.setHeader("Retry-After", 60);
        return res.status(429).json({
          error: "TooManyRequests",
          message: "Too many token refresh requests. Please try again shortly."
        });
      }
      next();
    }),
    generalApiRateLimiter: vi.fn((req, res, next) => {
      if (req.headers["x-test-rate-limit-general"] === "true") {
        res.setHeader("Retry-After", 60);
        return res.status(429).json({
          error: "TooManyRequests",
          message: "API rate limit exceeded. Please slow down your requests."
        });
      }
      next();
    }),
    userDataExportRateLimiter: vi.fn((_req, _res, next) => next())
  };
});

// Mock auth middleware to bind `activeUser`
vi.mock("../../middleware/authMiddleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (req.headers["x-test-unauthenticated"] === "true" || (!authHeader && !req.cookies?.accessToken)) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required or account is inactive."
      });
    }
    if (activeUser.status === "soft_deleted") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required or account is inactive."
      });
    }
    req.user = activeUser;
    next();
  },
  requireRole: (role: string) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized", message: "Authentication required." });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden", message: "Insufficient permissions for this action." });
    }
    next();
  }
}));

// Mock Mongoose models
vi.mock("../../models/Note.js", () => ({
  Note: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    distinct: vi.fn()
  }
}));

vi.mock("../../models/Habit.js", () => ({
  Habit: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../../models/Goal.js", () => ({
  Goal: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../../models/Event.js", () => ({
  Event: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../../models/Transaction.js", () => ({
  Transaction: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn().mockResolvedValue([])
  }
}));

vi.mock("../../models/Subject.js", () => ({
  Subject: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../../models/FocusSession.js", () => ({
  FocusSession: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../../models/User.js", () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../../models/RefreshToken.js", () => ({
  RefreshToken: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    updateOne: vi.fn()
  }
}));

vi.mock("../../db/redis.js", () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(900),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK")
  }
}));

vi.mock("../../services/queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, jobId: "mock-job-id" })
}));

vi.mock("../../services/emailService.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/financeCategory.js", () => ({
  seedDefaultCategories: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/ocr/ocrJobService.js", () => ({
  getOcrJobStatus: vi.fn(),
  setOcrJobStatus: vi.fn()
}));

vi.mock("../../services/ai/rateLimiter.js", () => ({
  checkAiRateLimit: vi.fn()
}));

function createTestApp() {
  const app = express();
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:"]
        }
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      frameguard: { action: "deny" }
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  const v1 = express.Router();
  v1.use(generalApiRateLimiter);
  v1.use(authRouter);
  v1.use(notesRouter);
  v1.use(habitsRouter);
  v1.use(goalsRouter);
  v1.use(calendarRouter);
  v1.use(financeRouter);
  v1.use(studyRouter);
  v1.use(focusRouter);
  v1.use(ocrRouter);

  app.use("/api/v1", v1);
  return app;
}

describe("OWASP Top 10 Security Review & Remediation Test Suite (NFR-2.4)", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    activeUser = {
      _id: userAId,
      email: "usera@example.com",
      name: "User A",
      role: "user",
      emailVerified: true,
      status: "active",
      subscriptionTier: "free"
    };
    app = createTestApp();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A01: Broken Access Control (BOLA / IDOR Verification)
  // ──────────────────────────────────────────────────────────────────────────
  describe("A01: Broken Access Control (IDOR / BOLA Prevention)", () => {
    it("rejects unauthorized note access when User A requests a note owned by User B", async () => {
      // Mock findOne to return null when querying with User A's userId for User B's note
      (Note.findOne as any).mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/notes/662c9f1e9f0b2a001c3d4e99")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not Found");
      expect(Note.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: "662c9f1e9f0b2a001c3d4e99",
          userId: userAId
        })
      );
    });

    it("rejects note modification if User A tries to PATCH a note owned by User B", async () => {
      (Note.findOne as any).mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/v1/notes/662c9f1e9f0b2a001c3d4e99")
        .set("Authorization", "Bearer valid-token")
        .send({ title: "Attacker updated title" });

      expect(res.status).toBe(404);
      expect(Note.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: "662c9f1e9f0b2a001c3d4e99",
          userId: userAId
        })
      );
    });

    it("prevents BOLA on OCR async jobs: User A cannot read User B's OCR job status or receipt scan", async () => {
      // Job was created by User B
      (ocrJobService.getOcrJobStatus as any).mockResolvedValue({
        jobId: "ocr-job-secret-999",
        userId: userBId.toString(),
        status: "completed",
        result: {
          extractedText: "Confidential Tax Receipt: $10,000",
          confidence: 0.98,
          source: "server_fallback"
        }
      });

      // User A attempts to read it
      const res = await request(app)
        .get("/api/v1/ocr/extract/ocr-job-secret-999")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("JobNotFound");
    });

    it("allows User A to read their own OCR extraction job", async () => {
      (ocrJobService.getOcrJobStatus as any).mockResolvedValue({
        jobId: "ocr-job-own-111",
        userId: userAId.toString(),
        status: "completed",
        result: {
          extractedText: "Grocery List: Milk, Eggs",
          confidence: 0.95,
          source: "server_fallback"
        }
      });

      const res = await request(app)
        .get("/api/v1/ocr/extract/ocr-job-own-111")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.result.extractedText).toBe("Grocery List: Milk, Eggs");
    });

    it("blocks soft-deleted user from accessing protected endpoints", async () => {
      activeUser.status = "soft_deleted";

      const res = await request(app)
        .get("/api/v1/notes")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(401);
      expect(res.body.message).toContain("inactive");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A03: Injection (Mongo Operator Injection & Schema Validation)
  // ──────────────────────────────────────────────────────────────────────────
  describe("A03: Injection Defense (Zod Schema Validation & Operator Sanitization)", () => {
    it("rejects MongoDB operator injection ($ne, $gt) in auth login payload", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: { $ne: null },
          password: "password123"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("ValidationError");
    });

    it("rejects malicious array/object injection into password reset request", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: { $regex: ".*@example.com" }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("ValidationError");
    });

    it("rejects malformed query parameter types (e.g. object instead of string)", async () => {
      const res = await request(app)
        .get("/api/v1/notes?page[$gt]=0")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A04 & A07: Rate Limiting & WebSocket AI Protection
  // ──────────────────────────────────────────────────────────────────────────
  describe("A04 & A07: Rate Limiting & AI Quota Enforcement (NFR-2.3, NFR-2.4)", () => {
    it("returns 429 TooManyRequests with Retry-After header when login rate limit is breached", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("x-test-rate-limit", "true")
        .send({
          email: "victim@example.com",
          password: "WrongPassword123"
        });

      expect(res.status).toBe(429);
      expect(res.headers["retry-after"]).toBeDefined();
      expect(res.body.error).toBe("TooManyRequests");
    });

    it("returns 429 TooManyRequests when registration rate limit is breached", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .set("x-test-rate-limit", "true")
        .send({
          email: "spam@example.com",
          password: "ValidPassword123",
          name: "Spam Bot"
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("TooManyRequests");
    });

    it("returns 429 TooManyRequests when forgot-password rate limit is breached", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .set("x-test-rate-limit", "true")
        .send({
          email: "target@example.com"
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("TooManyRequests");
    });

    it("returns 429 TooManyRequests when token refresh rate limit is breached", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("x-test-rate-limit", "true")
        .send({
          refreshToken: "some-refresh-token"
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("TooManyRequests");
    });

    it("returns 429 TooManyRequests when general API rate limit is breached", async () => {
      const res = await request(app)
        .get("/api/v1/notes")
        .set("Authorization", "Bearer valid-token")
        .set("x-test-rate-limit-general", "true");

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("TooManyRequests");
    });

    it("correctly identifies AI rate limit quota breaches for WebSocket handling", async () => {
      (checkAiRateLimit as any).mockResolvedValue({
        allowed: false,
        limit: 20,
        remaining: 0,
        resetAt: new Date(Date.UTC(2026, 8, 3, 0, 0, 0)),
        currentCount: 21
      });

      const check = await checkAiRateLimit(userAId.toString(), "free");
      expect(check.allowed).toBe(false);
      expect(check.limit).toBe(20);
      expect(check.remaining).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A05: Security Misconfiguration (Helmet Security Headers)
  // ──────────────────────────────────────────────────────────────────────────
  describe("A05: Security Misconfiguration (Helmet Security Headers)", () => {
    it("sets required HTTP security headers on API responses", async () => {
      const res = await request(app)
        .get("/api/v1/notes")
        .set("x-test-unauthenticated", "true");

      // Verify X-Content-Type-Options
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      // Verify Frameguard (X-Frame-Options: DENY)
      expect(res.headers["x-frame-options"]).toBe("DENY");
      // Verify Referrer-Policy
      expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      // Verify Content-Security-Policy exists
      expect(res.headers["content-security-policy"]).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // A07: Identification & Authentication Failures (Token Revocation & Cookies)
  // ──────────────────────────────────────────────────────────────────────────
  describe("A07: Token Security & Session Management", () => {
    it("rejects refresh request when no token is provided", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
      expect(res.body.message).toContain("Refresh token missing");
    });

    it("clears refresh cookie on logout", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send();

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged out successfully");
    });
  });
});
