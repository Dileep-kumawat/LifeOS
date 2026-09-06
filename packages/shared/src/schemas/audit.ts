import { z } from "zod";

export const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().min(1).max(100).optional(),
  resourceType: z.string().trim().min(1).max(100).optional(),
  actorUserId: z.string().trim().optional(),
  targetUserId: z.string().trim().optional(),
  outcome: z.enum(["SUCCESS", "DENIED", "ERROR"]).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional()
});

export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;

export const adminUsersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "suspended", "soft_deleted"]).optional()
});

export type AdminUsersListQuery = z.infer<typeof adminUsersListQuerySchema>;

export const adminUserStatusUpdateSchema = z.object({
  status: z.enum(["active", "suspended", "soft_deleted"]),
  reason: z.string().trim().max(500).optional()
});

export type AdminUserStatusUpdate = z.infer<typeof adminUserStatusUpdateSchema>;

export const adminUserRoleUpdateSchema = z.object({
  role: z.enum(["user", "admin"]),
  reason: z.string().trim().max(500).optional()
});

export type AdminUserRoleUpdate = z.infer<typeof adminUserRoleUpdateSchema>;

export const adminUserSubscriptionUpdateSchema = z.object({
  subscriptionTier: z.enum(["free", "pro"]),
  reason: z.string().trim().max(500).optional()
});

export type AdminUserSubscriptionUpdate = z.infer<typeof adminUserSubscriptionUpdateSchema>;
