import { z } from "zod";
export declare const auditLogsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    action: z.ZodOptional<z.ZodString>;
    resourceType: z.ZodOptional<z.ZodString>;
    actorUserId: z.ZodOptional<z.ZodString>;
    targetUserId: z.ZodOptional<z.ZodString>;
    outcome: z.ZodOptional<z.ZodEnum<["SUCCESS", "DENIED", "ERROR"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    startDate?: string | undefined;
    endDate?: string | undefined;
    action?: string | undefined;
    resourceType?: string | undefined;
    actorUserId?: string | undefined;
    targetUserId?: string | undefined;
    outcome?: "SUCCESS" | "DENIED" | "ERROR" | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    action?: string | undefined;
    resourceType?: string | undefined;
    actorUserId?: string | undefined;
    targetUserId?: string | undefined;
    outcome?: "SUCCESS" | "DENIED" | "ERROR" | undefined;
}>;
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
export declare const adminUsersListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["user", "admin"]>>;
    status: z.ZodOptional<z.ZodEnum<["active", "suspended", "soft_deleted"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "active" | "soft_deleted" | "suspended" | undefined;
    role?: "user" | "admin" | undefined;
    search?: string | undefined;
}, {
    status?: "active" | "soft_deleted" | "suspended" | undefined;
    role?: "user" | "admin" | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type AdminUsersListQuery = z.infer<typeof adminUsersListQuerySchema>;
export declare const adminUserStatusUpdateSchema: z.ZodObject<{
    status: z.ZodEnum<["active", "suspended", "soft_deleted"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "soft_deleted" | "suspended";
    reason?: string | undefined;
}, {
    status: "active" | "soft_deleted" | "suspended";
    reason?: string | undefined;
}>;
export type AdminUserStatusUpdate = z.infer<typeof adminUserStatusUpdateSchema>;
export declare const adminUserRoleUpdateSchema: z.ZodObject<{
    role: z.ZodEnum<["user", "admin"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    role: "user" | "admin";
    reason?: string | undefined;
}, {
    role: "user" | "admin";
    reason?: string | undefined;
}>;
export type AdminUserRoleUpdate = z.infer<typeof adminUserRoleUpdateSchema>;
export declare const adminUserSubscriptionUpdateSchema: z.ZodObject<{
    subscriptionTier: z.ZodEnum<["free", "pro"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    subscriptionTier: "free" | "pro";
    reason?: string | undefined;
}, {
    subscriptionTier: "free" | "pro";
    reason?: string | undefined;
}>;
export type AdminUserSubscriptionUpdate = z.infer<typeof adminUserSubscriptionUpdateSchema>;
