import { z } from "zod";
/**
 * Mirrored sync modules in LifeOS
 */
export const syncModules = [
    "events",
    "goals",
    "habits",
    "habit_check_ins",
    "notes",
    "note_folders",
    "transactions",
    "budgets",
    "categories",
    "note_versions"
];
export const syncOperations = ["create", "update", "delete"];
export const syncPushItemSchema = z.object({
    id: z.string().min(1),
    module: z.enum(syncModules),
    operation: z.enum(syncOperations),
    data: z.record(z.any()).optional(),
    lastModifiedAt: z.number(),
    clientId: z.string().optional(),
    forceResolution: z.boolean().optional(),
    resolutionSource: z.enum(["keep_local", "keep_server", "manual_merge"]).optional()
});
export const syncPushRequestSchema = z.object({
    changes: z.array(syncPushItemSchema),
    deviceId: z.string().optional()
});
export const syncPushItemResultSchema = z.object({
    id: z.string(),
    module: z.enum(syncModules),
    status: z.enum(["applied", "conflict", "error"]),
    error: z.string().optional(),
    conflictData: z.record(z.any()).optional(),
    serverRecord: z.record(z.any()).optional(),
    conflictNotice: z.string().optional(),
    conflictingFields: z.array(z.string()).optional()
});
export const syncResolveConflictRequestSchema = z.object({
    id: z.string().min(1),
    module: z.enum(syncModules),
    resolution: z.enum(["keep_local", "keep_server", "manual_merge"]),
    resolvedData: z.record(z.any()).optional(),
    deviceId: z.string().optional()
});
export const syncPushResponseSchema = z.object({
    cursor: z.string(),
    results: z.array(syncPushItemResultSchema)
});
export const syncPullRequestSchema = z.object({
    since: z.string().nullable().optional(),
    deviceId: z.string().optional()
});
export const syncModuleChangesSchema = z.object({
    upserted: z.array(z.record(z.any())),
    deleted: z.array(z.string())
});
export const syncPullResponseSchema = z.object({
    cursor: z.string(),
    serverTime: z.string(),
    changes: z.record(z.enum(syncModules), syncModuleChangesSchema)
});
export const registerFcmTokenSchema = z.object({
    token: z.string().min(1),
    deviceType: z.enum(["android", "ios", "web"]).default("android"),
    deviceName: z.string().optional()
});
