import { z } from "zod";
/**
 * Mirrored sync modules in LifeOS
 */
export declare const syncModules: readonly ["events", "goals", "habits", "habit_check_ins", "notes", "note_folders", "transactions", "budgets", "categories", "note_versions"];
export type SyncModule = (typeof syncModules)[number];
export declare const syncOperations: readonly ["create", "update", "delete"];
export type SyncOperation = (typeof syncOperations)[number];
export declare const syncPushItemSchema: z.ZodObject<{
    id: z.ZodString;
    module: z.ZodEnum<["events", "goals", "habits", "habit_check_ins", "notes", "note_folders", "transactions", "budgets", "categories", "note_versions"]>;
    operation: z.ZodEnum<["create", "update", "delete"]>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    lastModifiedAt: z.ZodNumber;
    clientId: z.ZodOptional<z.ZodString>;
    forceResolution: z.ZodOptional<z.ZodBoolean>;
    resolutionSource: z.ZodOptional<z.ZodEnum<["keep_local", "keep_server", "manual_merge"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
    operation: "create" | "update" | "delete";
    lastModifiedAt: number;
    data?: Record<string, any> | undefined;
    clientId?: string | undefined;
    forceResolution?: boolean | undefined;
    resolutionSource?: "keep_local" | "keep_server" | "manual_merge" | undefined;
}, {
    id: string;
    module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
    operation: "create" | "update" | "delete";
    lastModifiedAt: number;
    data?: Record<string, any> | undefined;
    clientId?: string | undefined;
    forceResolution?: boolean | undefined;
    resolutionSource?: "keep_local" | "keep_server" | "manual_merge" | undefined;
}>;
export type SyncPushItem = z.infer<typeof syncPushItemSchema>;
export declare const syncPushRequestSchema: z.ZodObject<{
    changes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        module: z.ZodEnum<["events", "goals", "habits", "habit_check_ins", "notes", "note_folders", "transactions", "budgets", "categories", "note_versions"]>;
        operation: z.ZodEnum<["create", "update", "delete"]>;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        lastModifiedAt: z.ZodNumber;
        clientId: z.ZodOptional<z.ZodString>;
        forceResolution: z.ZodOptional<z.ZodBoolean>;
        resolutionSource: z.ZodOptional<z.ZodEnum<["keep_local", "keep_server", "manual_merge"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
        operation: "create" | "update" | "delete";
        lastModifiedAt: number;
        data?: Record<string, any> | undefined;
        clientId?: string | undefined;
        forceResolution?: boolean | undefined;
        resolutionSource?: "keep_local" | "keep_server" | "manual_merge" | undefined;
    }, {
        id: string;
        module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
        operation: "create" | "update" | "delete";
        lastModifiedAt: number;
        data?: Record<string, any> | undefined;
        clientId?: string | undefined;
        forceResolution?: boolean | undefined;
        resolutionSource?: "keep_local" | "keep_server" | "manual_merge" | undefined;
    }>, "many">;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    changes: {
        id: string;
        module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
        operation: "create" | "update" | "delete";
        lastModifiedAt: number;
        data?: Record<string, any> | undefined;
        clientId?: string | undefined;
        forceResolution?: boolean | undefined;
        resolutionSource?: "keep_local" | "keep_server" | "manual_merge" | undefined;
    }[];
    deviceId?: string | undefined;
}, {
    changes: {
        id: string;
        module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
        operation: "create" | "update" | "delete";
        lastModifiedAt: number;
        data?: Record<string, any> | undefined;
        clientId?: string | undefined;
        forceResolution?: boolean | undefined;
        resolutionSource?: "keep_local" | "keep_server" | "manual_merge" | undefined;
    }[];
    deviceId?: string | undefined;
}>;
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;
export declare const syncPushItemResultSchema: z.ZodObject<{
    id: z.ZodString;
    module: z.ZodEnum<["events", "goals", "habits", "habit_check_ins", "notes", "note_folders", "transactions", "budgets", "categories", "note_versions"]>;
    status: z.ZodEnum<["applied", "conflict", "error"]>;
    error: z.ZodOptional<z.ZodString>;
    conflictData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    serverRecord: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    conflictNotice: z.ZodOptional<z.ZodString>;
    conflictingFields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "applied" | "conflict" | "error";
    id: string;
    module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
    error?: string | undefined;
    conflictData?: Record<string, any> | undefined;
    serverRecord?: Record<string, any> | undefined;
    conflictNotice?: string | undefined;
    conflictingFields?: string[] | undefined;
}, {
    status: "applied" | "conflict" | "error";
    id: string;
    module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
    error?: string | undefined;
    conflictData?: Record<string, any> | undefined;
    serverRecord?: Record<string, any> | undefined;
    conflictNotice?: string | undefined;
    conflictingFields?: string[] | undefined;
}>;
export type SyncPushItemResult = z.infer<typeof syncPushItemResultSchema>;
export declare const syncResolveConflictRequestSchema: z.ZodObject<{
    id: z.ZodString;
    module: z.ZodEnum<["events", "goals", "habits", "habit_check_ins", "notes", "note_folders", "transactions", "budgets", "categories", "note_versions"]>;
    resolution: z.ZodEnum<["keep_local", "keep_server", "manual_merge"]>;
    resolvedData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
    resolution: "keep_local" | "keep_server" | "manual_merge";
    deviceId?: string | undefined;
    resolvedData?: Record<string, any> | undefined;
}, {
    id: string;
    module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
    resolution: "keep_local" | "keep_server" | "manual_merge";
    deviceId?: string | undefined;
    resolvedData?: Record<string, any> | undefined;
}>;
export type SyncResolveConflictRequest = z.infer<typeof syncResolveConflictRequestSchema>;
export declare const syncPushResponseSchema: z.ZodObject<{
    cursor: z.ZodString;
    results: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        module: z.ZodEnum<["events", "goals", "habits", "habit_check_ins", "notes", "note_folders", "transactions", "budgets", "categories", "note_versions"]>;
        status: z.ZodEnum<["applied", "conflict", "error"]>;
        error: z.ZodOptional<z.ZodString>;
        conflictData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        serverRecord: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        conflictNotice: z.ZodOptional<z.ZodString>;
        conflictingFields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: "applied" | "conflict" | "error";
        id: string;
        module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
        error?: string | undefined;
        conflictData?: Record<string, any> | undefined;
        serverRecord?: Record<string, any> | undefined;
        conflictNotice?: string | undefined;
        conflictingFields?: string[] | undefined;
    }, {
        status: "applied" | "conflict" | "error";
        id: string;
        module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
        error?: string | undefined;
        conflictData?: Record<string, any> | undefined;
        serverRecord?: Record<string, any> | undefined;
        conflictNotice?: string | undefined;
        conflictingFields?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    cursor: string;
    results: {
        status: "applied" | "conflict" | "error";
        id: string;
        module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
        error?: string | undefined;
        conflictData?: Record<string, any> | undefined;
        serverRecord?: Record<string, any> | undefined;
        conflictNotice?: string | undefined;
        conflictingFields?: string[] | undefined;
    }[];
}, {
    cursor: string;
    results: {
        status: "applied" | "conflict" | "error";
        id: string;
        module: "events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions";
        error?: string | undefined;
        conflictData?: Record<string, any> | undefined;
        serverRecord?: Record<string, any> | undefined;
        conflictNotice?: string | undefined;
        conflictingFields?: string[] | undefined;
    }[];
}>;
export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;
export declare const syncPullRequestSchema: z.ZodObject<{
    since: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    deviceId?: string | undefined;
    since?: string | null | undefined;
}, {
    deviceId?: string | undefined;
    since?: string | null | undefined;
}>;
export type SyncPullRequest = z.infer<typeof syncPullRequestSchema>;
export declare const syncModuleChangesSchema: z.ZodObject<{
    upserted: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">;
    deleted: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    upserted: Record<string, any>[];
    deleted: string[];
}, {
    upserted: Record<string, any>[];
    deleted: string[];
}>;
export type SyncModuleChanges = z.infer<typeof syncModuleChangesSchema>;
export declare const syncPullResponseSchema: z.ZodObject<{
    cursor: z.ZodString;
    serverTime: z.ZodString;
    changes: z.ZodRecord<z.ZodEnum<["events", "goals", "habits", "habit_check_ins", "notes", "note_folders", "transactions", "budgets", "categories", "note_versions"]>, z.ZodObject<{
        upserted: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">;
        deleted: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        upserted: Record<string, any>[];
        deleted: string[];
    }, {
        upserted: Record<string, any>[];
        deleted: string[];
    }>>;
}, "strip", z.ZodTypeAny, {
    changes: Partial<Record<"events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions", {
        upserted: Record<string, any>[];
        deleted: string[];
    }>>;
    cursor: string;
    serverTime: string;
}, {
    changes: Partial<Record<"events" | "goals" | "habits" | "habit_check_ins" | "notes" | "note_folders" | "transactions" | "budgets" | "categories" | "note_versions", {
        upserted: Record<string, any>[];
        deleted: string[];
    }>>;
    cursor: string;
    serverTime: string;
}>;
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;
export declare const registerFcmTokenSchema: z.ZodObject<{
    token: z.ZodString;
    deviceType: z.ZodDefault<z.ZodEnum<["android", "ios", "web"]>>;
    deviceName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    token: string;
    deviceType: "android" | "ios" | "web";
    deviceName?: string | undefined;
}, {
    token: string;
    deviceType?: "android" | "ios" | "web" | undefined;
    deviceName?: string | undefined;
}>;
export type RegisterFcmTokenInput = z.infer<typeof registerFcmTokenSchema>;
