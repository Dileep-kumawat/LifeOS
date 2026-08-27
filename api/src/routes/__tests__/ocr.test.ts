import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Mock BullMQ queue & enqueueJob
vi.mock("../../services/queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, duplicate: false, jobId: "ocr-mock-job-123" }),
  jobsQueue: {
    getJob: vi.fn().mockResolvedValue(null)
  }
}));

// Mock auth middleware to inject test user
vi.mock("../../middleware/authMiddleware.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = {
      _id: { toString: () => "662c9f1e9f0b2a001c3d4e0a" },
      tier: "free",
      status: "active"
    };
    next();
  }
}));

// Mock rate limiter
const mockCheckOcrRateLimit = vi.fn().mockResolvedValue({
  allowed: true,
  limit: 30,
  remaining: 29,
  resetAt: new Date(Date.now() + 86400000),
  currentCount: 1
});

vi.mock("../../services/ocr/rateLimiter.js", () => ({
  checkOcrRateLimit: (...args: any[]) => mockCheckOcrRateLimit(...args)
}));

// Mock Redis / job status
const mockRedisStore = new Map<string, string>();

vi.mock("../../db/redis.js", () => ({
  redis: {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(mockRedisStore.get(key) || null)),
    set: vi.fn().mockImplementation((key: string, val: string) => {
      mockRedisStore.set(key, val);
      return Promise.resolve("OK");
    }),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1)
  }
}));

import { ocrRouter } from "../ocr.js";
import { enqueueJob } from "../../services/queue.js";
import { setOcrJobStatus } from "../../services/ocr/ocrJobService.js";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use("/api/v1", ocrRouter);

describe("OCR Routes Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisStore.clear();
    mockCheckOcrRateLimit.mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: new Date(Date.now() + 86400000),
      currentCount: 1
    });
  });

  describe("POST /api/v1/ocr/extract validation", () => {
    it("rejects non-image MIME types cleanly with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/v1/ocr/extract")
        .send({
          imageBase64: Buffer.from("dummy pdf").toString("base64"),
          mimeType: "application/pdf"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("InvalidFileType");
      expect(res.body.message).toContain("Only image files");
    });

    it("rejects missing image payload cleanly with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/v1/ocr/extract")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("MissingImage");
    });

    it("rejects oversized images (>10MB) cleanly with 400 Bad Request", async () => {
      // 11MB string
      const oversizedString = "A".repeat(15 * 1024 * 1024);
      const res = await request(app)
        .post("/api/v1/ocr/extract")
        .send({
          imageBase64: oversizedString,
          mimeType: "image/jpeg"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("FileTooLarge");
      expect(res.body.message).toContain("10MB");
    });
  });

  describe("POST /api/v1/ocr/extract rate limiting", () => {
    it("returns 429 Too Many Requests when rate limit is exceeded", async () => {
      mockCheckOcrRateLimit.mockResolvedValueOnce({
        allowed: false,
        limit: 30,
        remaining: 0,
        resetAt: new Date("2026-08-28T00:00:00.000Z"),
        currentCount: 31
      });

      const res = await request(app)
        .post("/api/v1/ocr/extract")
        .send({
          imageBase64: Buffer.from("valid-fake-image").toString("base64"),
          mimeType: "image/png"
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("RateLimitExceeded");
      expect(res.body.message).toContain("rate limit exceeded");
    });
  });

  describe("POST /api/v1/ocr/extract queue flow & responses", () => {
    it("enqueues OCR job via Phase 2 queue infrastructure with async=true returning 202", async () => {
      const res = await request(app)
        .post("/api/v1/ocr/extract?async=true")
        .send({
          imageBase64: Buffer.from("valid-fake-image").toString("base64"),
          mimeType: "image/png"
        });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBe("ocr-mock-job-123");
      expect(res.body.status).toBe("pending");
      expect(res.body.pollUrl).toBe("/api/v1/ocr/extract/ocr-mock-job-123");

      expect(enqueueJob).toHaveBeenCalledWith(
        "ocr",
        expect.objectContaining({
          userId: "662c9f1e9f0b2a001c3d4e0a",
          mimeType: "image/png"
        })
      );
    });

    it("serves completed result when job completes within synchronous wait window", async () => {
      // Pre-seed completed result in Redis for the mock job
      await setOcrJobStatus("ocr-mock-job-123", {
        jobId: "ocr-mock-job-123",
        status: "completed",
        result: {
          extractedText: "SUPERMARKET\nTotal: $24.99",
          confidence: 0.96,
          source: "server_fallback",
          blocks: [
            {
              text: "SUPERMARKET",
              confidence: 0.98,
              boundingBox: { x: 0, y: 0, width: 100, height: 20 }
            }
          ]
        }
      });

      const res = await request(app)
        .post("/api/v1/ocr/extract")
        .send({
          imageBase64: Buffer.from("valid-fake-image").toString("base64"),
          mimeType: "image/jpeg"
        });

      expect(res.status).toBe(200);
      expect(res.body.extractedText).toBe("SUPERMARKET\nTotal: $24.99");
      expect(res.body.confidence).toBe(0.96);
      expect(res.body.source).toBe("server_fallback");
      expect(res.body.blocks).toHaveLength(1);
    });
  });

  describe("GET /api/v1/ocr/extract/:jobId status polling", () => {
    it("returns 404 when job does not exist in Redis", async () => {
      const res = await request(app).get("/api/v1/ocr/extract/nonexistent-job");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("JobNotFound");
    });

    it("returns 200 with job status and result when found", async () => {
      await setOcrJobStatus("job-completed-789", {
        jobId: "job-completed-789",
        status: "completed",
        result: {
          extractedText: "Receipt Item #1",
          confidence: 0.91,
          source: "server_fallback"
        },
        completedAt: new Date().toISOString()
      });

      const res = await request(app).get("/api/v1/ocr/extract/job-completed-789");

      expect(res.status).toBe(200);
      expect(res.body.jobId).toBe("job-completed-789");
      expect(res.body.status).toBe("completed");
      expect(res.body.result.extractedText).toBe("Receipt Item #1");
    });
  });
});
