import { AppState } from "react-native";
type AppStateStatus = "active" | "background" | "inactive" | "unknown" | "extension";
import { apiClient, refreshAccessToken } from "./apiClient";

import { useAuthStore } from "../store/authStore";
import { useSyncStore } from "../store/syncStore";
import { getDatabase } from "../db/database";
import { tokenStorage } from "./tokenStorage";
import type { LocalSyncConflict } from "../db/schema";
import type {
  SyncModule,
  SyncPushItem,
  SyncPushResponse,
  SyncPullResponse
} from "@lifeos/shared";

const SYNC_TABLES: Array<{ tableName: string; module: SyncModule }> = [
  { tableName: "note_folders", module: "note_folders" },
  { tableName: "categories", module: "categories" },
  { tableName: "habits", module: "habits" },
  { tableName: "goals", module: "goals" },
  { tableName: "notes", module: "notes" },
  { tableName: "events", module: "events" },
  { tableName: "budgets", module: "budgets" },
  { tableName: "transactions", module: "transactions" },
  { tableName: "habit_check_ins", module: "habit_check_ins" },
  { tableName: "note_versions", module: "note_versions" }
];

const LAST_SYNC_CURSOR_KEY = "lifeos_last_sync_cursor";

let isSyncing = false;
let syncIntervalTimer: any = null;
let appStateSubscription: { remove: () => void } | null = null;
let inMemoryCursor: string | null = null;

export const syncEngine = {
  /**
   * Get the saved cursor from storage / memory
   */
  async getStoredCursor(): Promise<string | null> {
    if (inMemoryCursor) return inMemoryCursor;
    try {
      const stored = await tokenStorage.getItem(LAST_SYNC_CURSOR_KEY);
      if (stored) inMemoryCursor = stored;
      return stored;
    } catch {
      return null;
    }
  },

  /**
   * Save the sync cursor
   */
  async saveCursor(cursor: string): Promise<void> {
    inMemoryCursor = cursor;
    try {
      await tokenStorage.setItem(LAST_SYNC_CURSOR_KEY, cursor);
    } catch {
      // Ignore storage errors on cursor
    }
  },

  /**
   * Load unresolved conflicts from local database into sync store
   */
  async loadConflicts(): Promise<LocalSyncConflict[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<LocalSyncConflict>(
      "SELECT * FROM sync_conflicts WHERE status = 'unresolved';"
    );
    useSyncStore.getState().setConflicts(rows);
    return rows;
  },

  /**
   * Count total pending records across all SQLite tables
   */
  async countPendingRecords(): Promise<number> {
    const db = await getDatabase();
    let total = 0;
    for (const { tableName } of SYNC_TABLES) {
      const rows = await db.getAllAsync(`SELECT id FROM ${tableName} WHERE syncStatus = 'pending';`);
      total += rows.length;
    }
    useSyncStore.getState().setPendingCount(total);
    return total;
  },

  /**
   * Perform a full synchronization cycle:
   * 1. Refresh auth token if expired
   * 2. Push pending local mutations to server
   * 3. Pull server changes since last cursor
   * 4. Merge remote changes into local SQLite
   */
  async syncNow(): Promise<boolean> {
    if (isSyncing) return false;

    const { isAuthenticated, accessToken } = useAuthStore.getState();
    const isOnline = useSyncStore.getState().isOnline;

    if (!isOnline) {
      useSyncStore.getState().setSyncStatus("offline");
      await this.countPendingRecords();
      return false;
    }

    if (!isAuthenticated) {
      return false;
    }

    isSyncing = true;
    useSyncStore.getState().setSyncStatus("syncing");

    try {
      // Step 1: Ensure valid auth token before sync
      let validToken = accessToken;
      if (!validToken) {
        validToken = await refreshAccessToken();
      }

      if (!validToken) {
        useSyncStore.getState().setLastError("Session expired. Please log in to sync changes.");
        useSyncStore.getState().setSyncStatus("error");
        await this.countPendingRecords();
        return false;
      }

      const db = await getDatabase();
      const pendingChanges: SyncPushItem[] = [];

      // Step 2: Collect all pending local records across tables
      for (const { tableName, module } of SYNC_TABLES) {
        const rows = await db.getAllAsync<any>(
          `SELECT * FROM ${tableName} WHERE syncStatus = 'pending';`
        );
        for (const row of rows) {
          const { id, syncStatus, lastModifiedAt, createdAt, updatedAt, ...rawFields } = row;

          // Safely deserialize any JSON string fields before sending over HTTP
          const data: Record<string, any> = {};
          for (const [key, val] of Object.entries(rawFields)) {
            if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
              try {
                data[key] = JSON.parse(val);
              } catch {
                data[key] = val;
              }
            } else {
              data[key] = val;
            }
          }

          pendingChanges.push({
            id,
            module,
            operation: "create", // Upsert behavior on server
            data,
            lastModifiedAt: lastModifiedAt || Date.now()
          });
        }
      }

      // Step 3: Push pending mutations to server
      if (pendingChanges.length > 0) {
        const pushRes = await apiClient.post<SyncPushResponse>("/sync/push", {
          changes: pendingChanges
        });

        const { results, cursor: newPushCursor } = pushRes.data;

        for (const result of results) {
          const tableMapping = SYNC_TABLES.find((t) => t.module === result.module);
          if (!tableMapping) continue;

          // Dispatch lightweight conflict notices (e.g. for Calendar LWW)
          if (result.conflictNotice) {
            useSyncStore.getState().addConflictNotice(result.conflictNotice);
          }

          if (result.status === "applied") {
            await db.runAsync(
              `UPDATE ${tableMapping.tableName} SET syncStatus = 'synced' WHERE id = ?;`,
              result.id
            );
            // Clean up any resolved conflict
            await db.runAsync(`DELETE FROM sync_conflicts WHERE entityId = ?;`, result.id);
            useSyncStore.getState().removeConflict(result.id);
          } else if (result.status === "conflict") {
            await db.runAsync(
              `UPDATE ${tableMapping.tableName} SET syncStatus = 'conflict' WHERE id = ?;`,
              result.id
            );

            // Record full conflict details in local SQLite for user review
            const localRecord = await db.getFirstAsync<any>(
              `SELECT * FROM ${tableMapping.tableName} WHERE id = ?;`,
              result.id
            );

            const conflictObj: LocalSyncConflict = {
              id: result.id,
              entityId: result.id,
              module: result.module,
              localData: JSON.stringify(localRecord || {}),
              remoteData: JSON.stringify(result.serverRecord || result.conflictData?.serverRecord || {}),
              conflictingFields: JSON.stringify(
                result.conflictingFields || result.conflictData?.conflictingFields || []
              ),
              status: "unresolved",
              createdAt: new Date().toISOString()
            };

            await db.runAsync(
              `INSERT OR REPLACE INTO sync_conflicts (id, entityId, module, localData, remoteData, conflictingFields, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
              conflictObj.id,
              conflictObj.entityId,
              conflictObj.module,
              conflictObj.localData,
              conflictObj.remoteData,
              conflictObj.conflictingFields,
              conflictObj.status,
              conflictObj.createdAt
            );

            useSyncStore.getState().addConflict(conflictObj);
            useSyncStore.getState().addConflictNotice(`Conflict detected in ${result.module} — tap to resolve.`);
          } else if (result.status === "error") {
            console.error(`[SyncEngine] Push error for ${result.module} (${result.id}):`, result.error);
            useSyncStore.getState().setLastError(`Sync error on ${result.module}: ${result.error}`);
          }
        }

        if (newPushCursor) {
          await this.saveCursor(newPushCursor);
        }
      }

      // Step 4: Pull server updates since last cursor
      const storedCursor = await this.getStoredCursor();
      const pullRes = await apiClient.post<SyncPullResponse>("/sync/pull", {
        since: storedCursor
      });

      const { cursor: latestCursor, changes } = pullRes.data;

      // Step 5: Apply pulled upserts and deletes to SQLite
      for (const { tableName, module } of SYNC_TABLES) {
        const moduleChanges = changes[module];
        if (!moduleChanges) continue;

        // Apply remote upserts
        for (const serverRecord of moduleChanges.upserted) {
          const localRecord = await db.getFirstAsync<any>(
            `SELECT syncStatus, lastModifiedAt FROM ${tableName} WHERE id = ?;`,
            serverRecord.id || serverRecord._id
          );

          // If local edit is pending or in conflict, do not silently overwrite
          if (localRecord && (localRecord.syncStatus === "pending" || localRecord.syncStatus === "conflict")) {
            continue;
          }

          const entityId = serverRecord.id || serverRecord._id;
          const columns = Object.keys(serverRecord)
            .filter((k) => k !== "_id" && k !== "__v")
            .concat(["id", "syncStatus", "lastModifiedAt"]);

          const columnList = columns.map((c) => `\`${c}\``).join(", ");
          const placeholders = columns.map(() => "?").join(", ");

          const values = columns.map((col) => {
            if (col === "id") return entityId;
            if (col === "syncStatus") return "synced";
            if (col === "lastModifiedAt")
              return new Date(serverRecord.updatedAt || Date.now()).getTime();

            const val = serverRecord[col];
            return typeof val === "object" && val !== null ? JSON.stringify(val) : val;
          });

          await db.runAsync(
            `INSERT OR REPLACE INTO ${tableName} (${columnList}) VALUES (${placeholders});`,
            ...values
          );
        }

        // Apply remote deletes
        for (const deletedId of moduleChanges.deleted) {
          const localRecord = await db.getFirstAsync<any>(
            `SELECT syncStatus FROM ${tableName} WHERE id = ?;`,
            deletedId
          );
          if (!localRecord || (localRecord.syncStatus !== "pending" && localRecord.syncStatus !== "conflict")) {
            await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?;`, deletedId);
          }
        }
      }

      if (latestCursor) {
        await this.saveCursor(latestCursor);
      }

      // Step 6: Update sync state & conflict list
      await this.loadConflicts();
      const remainingPending = await this.countPendingRecords();
      useSyncStore.getState().setSyncStatus(remainingPending > 0 ? "pending" : "synced");
      useSyncStore.getState().setLastSyncedAt(Date.now());
      useSyncStore.getState().setLastError(null);

      return true;
    } catch (err: any) {
      await this.countPendingRecords();
      useSyncStore.getState().setSyncStatus("error");
      useSyncStore.getState().setLastError(err.message || "Sync failed");
      return false;
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Explicitly resolve a pending conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: "keep_local" | "keep_server" | "manual_merge",
    mergedData?: any
  ): Promise<boolean> {
    const db = await getDatabase();
    const conflict = await db.getFirstAsync<LocalSyncConflict>(
      "SELECT * FROM sync_conflicts WHERE id = ? OR entityId = ?;",
      conflictId,
      conflictId
    );

    if (!conflict) return false;

    const tableMapping = SYNC_TABLES.find((t) => t.module === conflict.module);
    if (!tableMapping) return false;

    const localParsed = JSON.parse(conflict.localData || "{}");
    const remoteParsed = JSON.parse(conflict.remoteData || "{}");

    let resolvedRecord: any;

    if (resolution === "keep_local") {
      resolvedRecord = localParsed;
    } else if (resolution === "keep_server") {
      resolvedRecord = remoteParsed;
    } else {
      resolvedRecord = { ...remoteParsed, ...localParsed, ...mergedData };
    }

    // Update local table
    const entityId = conflict.entityId;
    const columns = Object.keys(resolvedRecord)
      .filter((k) => k !== "_id" && k !== "__v")
      .concat(["id", "syncStatus", "lastModifiedAt"]);

    const columnList = columns.map((c) => `\`${c}\``).join(", ");
    const placeholders = columns.map(() => "?").join(", ");

    const values = columns.map((col) => {
      if (col === "id") return entityId;
      if (col === "syncStatus") return "synced";
      if (col === "lastModifiedAt") return Date.now();

      const val = resolvedRecord[col];
      return typeof val === "object" && val !== null ? JSON.stringify(val) : val;
    });

    await db.runAsync(
      `INSERT OR REPLACE INTO ${tableMapping.tableName} (${columnList}) VALUES (${placeholders});`,
      ...values
    );

    // Remove from local conflicts table
    await db.runAsync("DELETE FROM sync_conflicts WHERE id = ? OR entityId = ?;", conflictId, conflictId);
    useSyncStore.getState().removeConflict(conflictId);

    // Call server conflict resolution endpoint
    try {
      await apiClient.post("/sync/resolve-conflict", {
        id: entityId,
        module: conflict.module,
        resolution,
        resolvedData: resolvedRecord
      });
    } catch {
      // If offline, mark as pending to sync when back online
      await db.runAsync(
        `UPDATE ${tableMapping.tableName} SET syncStatus = 'pending' WHERE id = ?;`,
        entityId
      );
    }

    await this.countPendingRecords();
    return true;
  },

  /**
   * Start periodic and lifecycle listeners
   */
  startSyncEngine(): void {
    this.stopSyncEngine();

    // Initial sync and conflict loading
    this.loadConflicts().catch(() => {});
    this.syncNow().catch(() => {});

    // Periodic sync every 5 minutes
    syncIntervalTimer = setInterval(() => {
      this.syncNow().catch(() => {});
    }, 5 * 60 * 1000);

    // App foreground listener
    appStateSubscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        this.syncNow().catch(() => {});
      }
    });
  },

  /**
   * Stop background sync interval and listeners
   */
  stopSyncEngine(): void {
    if (syncIntervalTimer) {
      clearInterval(syncIntervalTimer);
      syncIntervalTimer = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
  }
};
