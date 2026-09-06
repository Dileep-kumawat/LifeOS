import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { Types } from "mongoose";

import { adminRouter } from "../admin.js";
import { financeRouter } from "../finance.js";
import { notesRouter } from "../notes.js";
import { analyticsRouter } from "../analytics.js";
import { correlationMiddleware } from "../../middleware/correlationMiddleware.js";
import { auditService } from "../../services/auditService.js";
import { User } from "../../models/User.js";
import { Transaction } from "../../models/Transaction.js";
import { Note } from "../../models/Note.js";

// Mock rate limiters to avoid Redis connection requirement in unit test environment
vi.mock("../../middleware/rateLimiter.js", () => ({
  adminRateLimiter: (_req: any, _res: any, next: any) => next(),
  adminAuditRateLimiter: (_req: any, _res: any, next: any) => next(),
  generalApiRateLimiter: (_req: any, _res: any, next: any) => next(),
  exportRateLimiter: (_req: any, _res: any, next: any) => next()
}));

vi.mock("../../services/analytics/rateLimiter.js", () => ({
  exportRateLimiter: (_req: any, _res: any, next: any) => next()
}));

vi.mock("../../db/redis.js", () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn()
  }
}));

const { getActiveUser, setActiveUser } = vi.hoisted(() => {
  let user: any = null;
  return {
    getActiveUser: () => user,
    setActiveUser: (u: any) => {
      user = u;
    }
  };
});

vi.mock("passport", () => ({
  default: {
    authenticate: (_strategy: string, _options: any, callback: any) => (req: any, res: any, _next: any) => {
      if (req.headers["x-test-unauthenticated"] === "true") {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required or account is inactive."
        });
      }
      callback(null, getActiveUser(), null);
    }
  }
}));

vi.mock("../../auth/tokenService.js", () => ({
  revokeAllUserTokens: vi.fn().mockResolvedValue({})
}));

// Mock export generator
vi.mock("../../services/analytics/exportService.js", () => ({
  generateAnalyticsExport: vi.fn().mockResolvedValue({
    content: "Date,Amount\n2026-08-01,100",
    contentType: "text/csv; charset=utf-8",
    filename: "export.csv"
  })
}));

// Mock Mongoose models
vi.mock("../../models/User.js", () => ({
  User: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndDelete: vi.fn()
  }
}));

vi.mock("../../models/Transaction.js", () => ({
  Transaction: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndDelete: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn()
  }
}));

vi.mock("../../models/Note.js", () => ({
  Note: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn()
  }
}));

vi.mock("../../models/AuditLog.js", () => ({
  AuditLog: {
    create: vi.fn().mockResolvedValue({}),
    find: vi.fn(),
    countDocuments: vi.fn()
  }
}));

vi.mock("../../models/RefreshToken.js", () => ({
  RefreshToken: {
    deleteMany: vi.fn().mockResolvedValue({})
  }
}));

describe("NFR-2.6 Production Audit Logging System Integration Tests", () => {
  let app: express.Express;
  let auditLogSpy: any;

  const adminUserId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e00");
  const regularUserAId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e01");
  const regularUserBId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e02");

  beforeEach(() => {
    vi.clearAllMocks();
    auditLogSpy = vi.spyOn(auditService, "log");

    // Configure test Express app mounting correlation middleware and routes
    app = express();
    app.use(express.json());
    app.use(correlationMiddleware);

    // Mock authentication middleware assigning activeUser
    app.use((req: any, _res, next) => {
      req.user = getActiveUser();
      next();
    });

    const v1 = express.Router();
    v1.use(adminRouter);
    v1.use(financeRouter);
    v1.use(notesRouter);
    v1.use(analyticsRouter);
    app.use("/api/v1", v1);
  });

  describe("1. Administrative Actions Audit Logging", () => {
    beforeEach(() => {
      setActiveUser({
        _id: adminUserId,
        id: adminUserId.toString(),
        email: "admin@lifeos.test",
        role: "admin",
        status: "active"
      });
    });

    it("records critical audit event when an admin modifies user status (suspend/restore)", async () => {
      const targetUser: any = {
        _id: regularUserBId,
        email: "userb@lifeos.test",
        name: "User B",
        role: "user",
        status: "active",
        subscriptionTier: "free",
        emailVerified: true,
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, "findById").mockResolvedValue(targetUser);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${regularUserBId}/status`)
        .send({ status: "suspended", reason: "Terms of service violation" });

      expect(res.status).toBe(200);
      expect(targetUser.status).toBe("suspended");

      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_SUSPENSION",
          resourceType: "user",
          resourceId: regularUserBId.toString(),
          targetUserId: regularUserBId.toString(),
          outcome: "SUCCESS",
          reason: "Terms of service violation",
          metadata: expect.objectContaining({
            previousStatus: "active",
            newStatus: "suspended"
          })
        }),
        expect.objectContaining({ critical: true })
      );
    });

    it("records critical audit event when an admin changes a user role", async () => {
      const targetUser: any = {
        _id: regularUserBId,
        email: "userb@lifeos.test",
        name: "User B",
        role: "user",
        status: "active",
        subscriptionTier: "free",
        emailVerified: true,
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, "findById").mockResolvedValue(targetUser);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${regularUserBId}/role`)
        .send({ role: "admin", reason: "Promoted to support lead" });

      expect(res.status).toBe(200);
      expect(targetUser.role).toBe("admin");

      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_ROLE_CHANGE",
          resourceType: "user",
          resourceId: regularUserBId.toString(),
          targetUserId: regularUserBId.toString(),
          outcome: "SUCCESS",
          metadata: expect.objectContaining({
            previousRole: "user",
            newRole: "admin"
          })
        }),
        expect.objectContaining({ critical: true })
      );
    });

    it("records audit event when an admin lists or looks up user accounts", async () => {
      vi.spyOn(User, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                _id: regularUserBId,
                email: "userb@lifeos.test",
                name: "User B",
                role: "user",
                status: "active",
                subscriptionTier: "free",
                emailVerified: true,
                createdAt: new Date()
              }
            ])
          })
        })
      } as any);
      vi.spyOn(User, "countDocuments").mockResolvedValue(1);

      const res = await request(app).get("/api/v1/admin/users?search=userb");
      expect(res.status).toBe(200);

      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_LOOKUP",
          outcome: "SUCCESS"
        })
      );
    });
  });

  describe("2. Privileged & Sensitive Access Auditing", () => {
    it("records audit event when admin accesses sensitive user finance records", async () => {
      setActiveUser({
        _id: adminUserId,
        id: adminUserId.toString(),
        role: "admin",
        status: "active"
      });

      const targetUser: any = {
        _id: regularUserBId,
        email: "userb@lifeos.test"
      };
      vi.spyOn(User, "findById").mockResolvedValue(targetUser);

      vi.spyOn(Transaction, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              amount: 50,
              type: "expense",
              category: "Groceries",
              date: new Date(),
              note: "Confidential spend"
            }
          ])
        })
      } as any);

      const res = await request(app).get(`/api/v1/admin/users/${regularUserBId}/finance`);
      expect(res.status).toBe(200);

      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ADMIN_SENSITIVE_ACCESS",
          resourceType: "finance",
          targetUserId: regularUserBId.toString(),
          outcome: "SUCCESS"
        }),
        expect.objectContaining({ critical: true })
      );
    });

    it("records audit event when an authenticated user exports sensitive analytics data", async () => {
      setActiveUser({
        _id: regularUserAId,
        id: regularUserAId.toString(),
        role: "user",
        status: "active"
      });

      const res = await request(app).get(
        "/api/v1/analytics/export?type=finance&format=csv&startDate=2026-08-01&endDate=2026-08-31"
      );

      expect(res.status).toBe(200);
      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SENSITIVE_DATA_EXPORT",
          resourceType: "analytics",
          outcome: "SUCCESS",
          metadata: expect.objectContaining({
            type: "finance",
            format: "csv",
            startDate: "2026-08-01",
            endDate: "2026-08-31"
          })
        })
      );
    });
  });

  describe("3. Security-Relevant Denials Auditing (IDOR & Privilege Escalation)", () => {
    it("records denial security event when non-admin attempts to access admin endpoint", async () => {
      setActiveUser({
        _id: regularUserAId,
        id: regularUserAId.toString(),
        role: "user",
        status: "active"
      });

      const res = await request(app).get("/api/v1/admin/users");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Forbidden");

      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ADMIN_ACCESS_DENIED",
          resourceType: "admin_endpoint",
          outcome: "DENIED",
          reason: "INSUFFICIENT_PERMISSIONS"
        }),
        expect.objectContaining({ critical: true })
      );
    });

    it("records denial security event when User A attempts cross-user access (IDOR) on User B finance transaction", async () => {
      setActiveUser({
        _id: regularUserAId,
        id: regularUserAId.toString(),
        role: "user",
        status: "active"
      });

      const txId = new Types.ObjectId();

      // Transaction findOne by activeUser (User A) returns null
      vi.spyOn(Transaction, "findOne").mockResolvedValue(null);
      // But transaction exists in database owned by User B!
      vi.spyOn(Transaction, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: txId, userId: regularUserBId })
      } as any);

      const res = await request(app).get(`/api/v1/finance/transactions/${txId}`);

      // Returns 404 to avoid leaking existence
      expect(res.status).toBe(404);

      // But records cross-user access denial in audit log!
      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CROSS_USER_ACCESS_ATTEMPT",
          resourceType: "finance",
          resourceId: txId.toString(),
          targetUserId: regularUserBId.toString(),
          outcome: "DENIED",
          reason: "OWNERSHIP_MISMATCH"
        }),
        expect.objectContaining({ critical: true })
      );
    });

    it("records denial security event when User A attempts cross-user access (IDOR) on User B note", async () => {
      setActiveUser({
        _id: regularUserAId,
        id: regularUserAId.toString(),
        role: "user",
        status: "active"
      });

      const noteId = new Types.ObjectId();

      // Note findOne by activeUser (User A) returns null
      vi.spyOn(Note, "findOne").mockResolvedValue(null);
      // But note exists in database owned by User B!
      vi.spyOn(Note, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: noteId, userId: regularUserBId })
      } as any);

      const res = await request(app).get(`/api/v1/notes/${noteId}`);

      expect(res.status).toBe(404);

      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CROSS_USER_ACCESS_ATTEMPT",
          resourceType: "note",
          resourceId: noteId.toString(),
          targetUserId: regularUserBId.toString(),
          outcome: "DENIED",
          reason: "OWNERSHIP_MISMATCH"
        }),
        expect.objectContaining({ critical: true })
      );
    });
  });

  describe("4. Operational Noise Suppression", () => {
    it("does NOT generate audit logs for normal, authorized user CRUD read requests", async () => {
      setActiveUser({
        _id: regularUserAId,
        id: regularUserAId.toString(),
        role: "user",
        status: "active"
      });

      vi.spyOn(Transaction, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      } as any);
      vi.spyOn(Transaction, "countDocuments").mockResolvedValue(0);
      vi.spyOn(Transaction, "aggregate").mockResolvedValue([]);

      const res = await request(app).get("/api/v1/finance/transactions");
      expect(res.status).toBe(200);

      // Normal read should not trigger audit logging
      expect(auditLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("5. Tamper Resistance via API", () => {
    it("rejects POST, PUT, PATCH, and DELETE requests on audit logs endpoint", async () => {
      setActiveUser({
        _id: adminUserId,
        id: adminUserId.toString(),
        role: "admin",
        status: "active"
      });

      const postRes = await request(app).post("/api/v1/admin/audit-logs").send({ action: "fake" });
      expect(postRes.status).toBe(404);

      const putRes = await request(app).put("/api/v1/admin/audit-logs/123").send({ action: "fake" });
      expect(putRes.status).toBe(404);

      const deleteRes = await request(app).delete("/api/v1/admin/audit-logs/123");
      expect(deleteRes.status).toBe(404);
    });
  });

  describe("6. Admin Audit Log Viewer Query Endpoint", () => {
    it("allows admin to query paginated audit logs with filters", async () => {
      setActiveUser({
        _id: adminUserId,
        id: adminUserId.toString(),
        role: "admin",
        status: "active"
      });

      const mockAuditResults = {
        data: [
          {
            id: "audit-1",
            timestamp: new Date().toISOString(),
            actorUserId: adminUserId.toString(),
            actorRole: "admin",
            action: "USER_SUSPENSION",
            resourceType: "user",
            outcome: "SUCCESS",
            correlationId: "corr-xyz",
            ipAddress: "127.0.0.1",
            userAgent: "TestAgent",
            metadata: {},
            expiresAt: new Date(Date.now() + 90 * 86400000).toISOString()
          }
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasMore: false
        }
      };

      vi.spyOn(auditService, "queryLogs").mockResolvedValue(mockAuditResults as any);

      const res = await request(app).get(
        "/api/v1/admin/audit-logs?page=1&limit=20&outcome=SUCCESS&action=USER_SUSPENSION"
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].action).toBe("USER_SUSPENSION");
      expect(res.body.pagination.total).toBe(1);
    });

    it("rejects non-admin from querying audit logs", async () => {
      setActiveUser({
        _id: regularUserAId,
        id: regularUserAId.toString(),
        role: "user",
        status: "active"
      });

      const res = await request(app).get("/api/v1/admin/audit-logs");
      expect(res.status).toBe(403);
    });
  });
});
