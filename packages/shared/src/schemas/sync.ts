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
] as const;

export type SyncModule = (typeof syncModules)[number];

export const syncOperations = ["create", "update", "delete"] as const;
export type SyncOperation = (typeof syncOperations)[number];

export const syncPushItemSchema = z.object({
  id: z.string().min(1),
  module: z.enum(syncModules),
  operation: z.enum(syncOperations),
  data: z.record(z.any()).optional(),
  lastModifiedAt: z.number(),
  clientId: z.string().optional()
});

export type SyncPushItem = z.infer<typeof syncPushItemSchema>;

export const syncPushRequestSchema = z.object({
  changes: z.array(syncPushItemSchema),
  deviceId: z.string().optional()
});

export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;

export const syncPushItemResultSchema = z.object({
  id: z.string(),
  module: z.enum(syncModules),
  status: z.enum(["applied", "conflict", "error"]),
  error: z.string().optional(),
  conflictData: z.record(z.any()).optional(),
  serverRecord: z.record(z.any()).optional()
});

export type SyncPushItemResult = z.infer<typeof syncPushItemResultSchema>;

export const syncPushResponseSchema = z.object({
  cursor: z.string(),
  results: z.array(syncPushItemResultSchema)
});

export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;

export const syncPullRequestSchema = z.object({
  since: z.string().nullable().optional(),
  deviceId: z.string().optional()
});

export type SyncPullRequest = z.infer<typeof syncPullRequestSchema>;

export const syncModuleChangesSchema = z.object({
  upserted: z.array(z.record(z.any())),
  deleted: z.array(z.string())
});

export type SyncModuleChanges = z.infer<typeof syncModuleChangesSchema>;

export const syncPullResponseSchema = z.object({
  cursor: z.string(),
  serverTime: z.string(),
  changes: z.record(z.enum(syncModules), syncModuleChangesSchema)
});

export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;

export const registerFcmTokenSchema = z.object({
  token: z.string().min(1),
  deviceType: z.enum(["android", "ios", "web"]).default("android"),
  deviceName: z.string().optional()
});

export type RegisterFcmTokenInput = z.infer<typeof registerFcmTokenSchema>;
