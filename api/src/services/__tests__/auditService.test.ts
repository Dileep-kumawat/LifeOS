import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AuditService,
  anonymizeIp,
  sanitizeAuditMetadata
} from "../auditService.js";
import { AuditLog } from "../../models/AuditLog.js";

describe("AuditService Unit Tests", () => {
  describe("anonymizeIp", () => {
    it("anonymizes standard IPv4 addresses by zeroing the last octet", () => {
      expect(anonymizeIp("192.168.1.45")).toBe("192.168.1.0");
      expect(anonymizeIp("10.0.2.199")).toBe("10.0.2.0");
      expect(anonymizeIp("::ffff:192.0.2.1")).toBe("192.0.2.0");
    });

    it("preserves localhost addresses for debugging", () => {
      expect(anonymizeIp("127.0.0.1")).toBe("127.0.0.1");
      expect(anonymizeIp("::1")).toBe("::1");
    });

    it("anonymizes IPv6 addresses by masking lower 64 bits", () => {
      const ipv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
      const result = anonymizeIp(ipv6);
      expect(result).toBe("2001:0db8:85a3::");
    });

    it("handles null or undefined gracefully", () => {
      expect(anonymizeIp(null)).toBe("unknown");
      expect(anonymizeIp(undefined)).toBe("unknown");
      expect(anonymizeIp("")).toBe("unknown");
    });
  });

  describe("sanitizeAuditMetadata", () => {
    it("redacts sensitive fields like passwords, tokens, credentials, prompts, and contents", () => {
      const sensitiveInput = {
        email: "alice@example.com",
        password: "SuperSecretPassword123!",
        refreshToken: "rt_abc123xyz",
        idToken: "id_jwt_token_sample",
        creditCard: "4111222233334444",
        prompt: "System instructions and sensitive user text",
        noteContent: { type: "doc", content: [{ text: "Secret private notes" }] },
        safeField: "this-is-allowed",
        nested: {
          authToken: "bearer-token",
          reason: "status_changed"
        }
      };

      const sanitized = sanitizeAuditMetadata(sensitiveInput);

      expect(sanitized.email).toBe("alice@example.com");
      expect(sanitized.safeField).toBe("this-is-allowed");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.refreshToken).toBe("[REDACTED]");
      expect(sanitized.idToken).toBe("[REDACTED]");
      expect(sanitized.creditCard).toBe("[REDACTED]");
      expect(sanitized.prompt).toBe("[REDACTED]");
      expect(sanitized.noteContent).toBe("[REDACTED]");
      expect(sanitized.nested.authToken).toBe("[REDACTED]");
      expect(sanitized.nested.reason).toBe("status_changed");
    });

    it("truncates excessively long string values", () => {
      const longString = "A".repeat(800);
      const sanitized = sanitizeAuditMetadata({ message: longString });
      expect(sanitized.message).toHaveLength(514); // 500 + '...[TRUNCATED]' (14 chars)
    });
  });

  describe("AuditService.log", () => {
    let service: AuditService;

    beforeEach(() => {
      service = new AuditService();
      vi.restoreAllMocks();
    });

    it("creates audit log with correct defaults, sanitized metadata, and calculated expiration", async () => {
      const createSpy = vi.spyOn(AuditLog, "create").mockResolvedValue({} as any);

      const mockReq: any = {
        id: "corr-12345",
        ip: "203.0.113.195",
        headers: {
          "user-agent": "Mozilla/5.0 Test Agent"
        },
        user: {
          id: "user-999",
          role: "admin"
        }
      };

      await service.log(
        {
          req: mockReq,
          action: "USER_STATUS_CHANGE",
          resourceType: "user",
          resourceId: "target-user-1",
          targetUserId: "target-user-1",
          outcome: "SUCCESS",
          metadata: {
            previousStatus: "active",
            newStatus: "suspended",
            passwordAttempt: "secret"
          }
        },
        { critical: true }
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      const callArgs = createSpy.mock.calls[0][0] as any;

      expect(callArgs.actorUserId).toBe("user-999");
      expect(callArgs.actorRole).toBe("admin");
      expect(callArgs.action).toBe("USER_STATUS_CHANGE");
      expect(callArgs.resourceType).toBe("user");
      expect(callArgs.resourceId).toBe("target-user-1");
      expect(callArgs.targetUserId).toBe("target-user-1");
      expect(callArgs.outcome).toBe("SUCCESS");
      expect(callArgs.correlationId).toBe("corr-12345");
      expect(callArgs.ipAddress).toBe("203.0.113.0"); // IPv4 anonymized
      expect(callArgs.userAgent).toBe("Mozilla/5.0 Test Agent");
      expect(callArgs.metadata.passwordAttempt).toBe("[REDACTED]");
      expect(callArgs.metadata.newStatus).toBe("suspended");

      // Verify expiration is ~90 days in future
      const now = Date.now();
      const expires = new Date(callArgs.expiresAt).getTime();
      const diffDays = Math.round((expires - now) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(90);
    });

    it("throws when critical audit log write fails", async () => {
      vi.spyOn(AuditLog, "create").mockRejectedValue(new Error("Database connection lost"));

      await expect(
        service.log(
          {
            action: "CRITICAL_ADMIN_PURGE",
            resourceType: "user",
            outcome: "SUCCESS"
          },
          { critical: true }
        )
      ).rejects.toThrow("Database connection lost");
    });
  });

  describe("AuditService.queryLogs", () => {
    let service: AuditService;

    beforeEach(() => {
      service = new AuditService();
    });

    it("queries logs with bounded pagination and sorting", async () => {
      const mockDocs = [
        {
          _id: "662c9f1e9f0b2a001c3d4e01",
          timestamp: new Date("2026-08-01T10:00:00Z"),
          actorUserId: "admin-1",
          actorRole: "admin",
          action: "USER_LOOKUP",
          resourceType: "user",
          outcome: "SUCCESS",
          correlationId: "corr-1",
          ipAddress: "192.0.2.0",
          userAgent: "TestAgent",
          metadata: {},
          expiresAt: new Date("2026-11-01T10:00:00Z")
        }
      ];

      const leanFn = vi.fn().mockResolvedValue(mockDocs);
      const limitFn = vi.fn().mockReturnValue({ lean: leanFn });
      const skipFn = vi.fn().mockReturnValue({ limit: limitFn });
      const sortFn = vi.fn().mockReturnValue({ skip: skipFn });
      vi.spyOn(AuditLog, "find").mockReturnValue({ sort: sortFn } as any);
      vi.spyOn(AuditLog, "countDocuments").mockResolvedValue(1);

      const result = await service.queryLogs({
        page: 1,
        limit: 20,
        action: "USER_LOOKUP",
        outcome: "SUCCESS"
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe("USER_LOOKUP");
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });
});
