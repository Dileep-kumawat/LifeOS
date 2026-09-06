import type { Request } from "express";
import { AuditLog, type AuditActorRole, type AuditOutcome } from "../models/AuditLog.js";
import { logger } from "../logger.js";

const DEFAULT_RETENTION_DAYS = 90;

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /auth/i,
  /cookie/i,
  /credential/i,
  /card/i,
  /cvv/i,
  /prompt/i,
  /markdown/i,
  /content/i,
  /prosemirror/i
];

/**
 * Anonymize IP address for privacy compliance (GDPR/DPDP data minimization).
 * IPv4: zeroes the last octet (e.g., 192.0.2.123 -> 192.0.2.0).
 * IPv6: zeroes the lower 64 bits (interface ID).
 */
export function anonymizeIp(ip?: string | null): string {
  if (!ip) return "unknown";
  const cleanIp = ip.replace(/^::ffff:/, ""); // Strip IPv4-mapped IPv6 prefix

  if (cleanIp === "127.0.0.1" || cleanIp === "::1") {
    return cleanIp;
  }

  // IPv4 format
  const ipv4Parts = cleanIp.split(".");
  if (ipv4Parts.length === 4) {
    ipv4Parts[3] = "0";
    return ipv4Parts.join(".");
  }

  // IPv6 format
  const ipv6Parts = cleanIp.split(":");
  if (ipv6Parts.length >= 4) {
    return ipv6Parts.slice(0, 3).join(":") + "::";
  }

  return "anonymized";
}

/**
 * Recursively redacts sensitive keys and values from metadata objects.
 * Never stores tokens, passwords, prompt text, note content, or financial records.
 */
export function sanitizeAuditMetadata(obj: any, depth = 0): any {
  if (depth > 4) return "[TRUNCATED]";
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.slice(0, 20).map((item) => sanitizeAuditMetadata(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeAuditMetadata(value, depth + 1);
    } else if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + "...[TRUNCATED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export interface CreateAuditEventInput {
  req?: Request;
  actorUserId?: string | null;
  actorRole?: AuditActorRole;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  targetUserId?: string | null;
  outcome: AuditOutcome;
  reason?: string | null;
  metadata?: Record<string, any>;
  correlationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogOptions {
  critical?: boolean;
}

export class AuditService {
  private getRetentionDays(): number {
    const parsed = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || "", 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
  }

  /**
   * Main audit logging method.
   * - Extracts actor, correlationId, IP, user-agent from Request if provided.
   * - Redacts sensitive metadata.
   * - Automatically assigns expiresAt based on retention policy.
   * - Non-blocking asynchronous by default; awaited if critical: true.
   */
  async log(event: CreateAuditEventInput, options: AuditLogOptions = {}): Promise<void> {
    try {
      const retentionDays = this.getRetentionDays();
      const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

      // Derive actor & network context
      const actorUserId =
        event.actorUserId ?? (event.req?.user ? (event.req.user.id || event.req.user._id)?.toString() : null);

      const actorRole: AuditActorRole =
        event.actorRole ??
        (event.req?.user?.role === "admin"
          ? "admin"
          : event.req?.user?.role === "user"
            ? "user"
            : "anonymous");

      const rawIp = event.ipAddress ?? event.req?.ip ?? (event.req?.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim();
      const ipAddress = anonymizeIp(rawIp);

      const rawUserAgent = event.userAgent ?? (event.req?.headers["user-agent"] as string) ?? null;
      const userAgent = rawUserAgent ? rawUserAgent.substring(0, 200) : null;

      const correlationId =
        event.correlationId ??
        (event.req as any)?.id ??
        (event.req?.headers["x-request-id"] as string) ??
        (event.req?.headers["x-correlation-id"] as string) ??
        null;

      const sanitizedMetadata = sanitizeAuditMetadata(event.metadata || {});

      const doc = {
        timestamp: new Date(),
        actorUserId: actorUserId || null,
        actorRole,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ? String(event.resourceId) : null,
        targetUserId: event.targetUserId ? String(event.targetUserId) : null,
        outcome: event.outcome,
        correlationId: correlationId ? String(correlationId) : null,
        ipAddress,
        userAgent,
        reason: event.reason || null,
        metadata: sanitizedMetadata,
        expiresAt
      };

      if (options.critical) {
        await AuditLog.create(doc);
      } else {
        // Asynchronous non-blocking write for high performance
        AuditLog.create(doc).catch((err) => {
          logger.error({ err, action: event.action, correlationId }, "Failed to write audit log asynchronously");
        });
      }
    } catch (err: any) {
      logger.error({ err, action: event.action }, "Audit logging execution failure");
      if (options.critical) {
        throw err;
      }
    }
  }

  /**
   * Controlled, paginated, bounded query method for administrator audit viewer.
   */
  async queryLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    resourceType?: string;
    actorUserId?: string;
    targetUserId?: string;
    outcome?: AuditOutcome;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (params.action) {
      filter.action = params.action;
    }
    if (params.resourceType) {
      filter.resourceType = params.resourceType;
    }
    if (params.actorUserId) {
      filter.actorUserId = params.actorUserId;
    }
    if (params.targetUserId) {
      filter.targetUserId = params.targetUserId;
    }
    if (params.outcome) {
      filter.outcome = params.outcome;
    }

    if (params.startDate || params.endDate) {
      filter.timestamp = {};
      if (params.startDate) {
        filter.timestamp.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        if (params.endDate.length <= 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        filter.timestamp.$lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: logs.map((log: any) => ({
        id: log._id.toString(),
        timestamp: log.timestamp.toISOString(),
        actorUserId: log.actorUserId ? log.actorUserId.toString() : null,
        actorRole: log.actorRole,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        targetUserId: log.targetUserId ? log.targetUserId.toString() : null,
        outcome: log.outcome,
        correlationId: log.correlationId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        reason: log.reason,
        metadata: log.metadata,
        expiresAt: log.expiresAt ? log.expiresAt.toISOString() : null
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      }
    };
  }
}

export const auditService = new AuditService();
