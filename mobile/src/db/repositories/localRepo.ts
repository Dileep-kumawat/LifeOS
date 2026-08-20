import { getDatabase } from "../database";
import type { SyncStatus } from "../schema";

/**
 * Generate a client-side unique identifier (hex format compatible with MongoDB ObjectId)
 */
export function generateClientId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const random = "xxxxxxxxxxxxxxxx".replace(/[x]/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
  return timestamp + random;
}

export interface LocalMutationOptions {
  markPending?: boolean;
}

/**
 * Generic Local SQLite repository helper for offline-first writes
 */
export const localRepo = {
  /**
   * Insert a record into a local table with syncStatus = "pending" and current lastModifiedAt
   */
  async insert<T extends { id?: string; [key: string]: any }>(
    tableName: string,
    record: T,
    options: LocalMutationOptions = { markPending: true }
  ): Promise<T & { id: string; syncStatus: SyncStatus; lastModifiedAt: number }> {
    const db = await getDatabase();
    const id = record.id || generateClientId();
    const syncStatus: SyncStatus = options.markPending ? "pending" : "synced";
    const lastModifiedAt = Date.now();
    const createdAt = record.createdAt || new Date().toISOString();
    const updatedAt = record.updatedAt || new Date().toISOString();

    const entity = {
      ...record,
      id,
      syncStatus,
      lastModifiedAt,
      createdAt,
      updatedAt
    };

    const keys = Object.keys(entity);
    const columns = keys.map((k) => `\`${k}\``).join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const values = Object.values(entity).map((val) =>
      typeof val === "object" && val !== null ? JSON.stringify(val) : val
    );

    const sql = `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders});`;
    await db.runAsync(sql, ...values);

    return entity as any;
  },

  /**
   * Update an existing record in SQLite with syncStatus = "pending"
   */
  async update(
    tableName: string,
    id: string,
    updates: Record<string, any>,
    options: LocalMutationOptions = { markPending: true }
  ): Promise<boolean> {
    const db = await getDatabase();
    const lastModifiedAt = Date.now();
    const updatedAt = new Date().toISOString();
    const syncStatus: SyncStatus = options.markPending ? "pending" : "synced";

    const fieldsToSet: Record<string, any> = {
      ...updates,
      syncStatus,
      lastModifiedAt,
      updatedAt
    };

    const keys = Object.keys(fieldsToSet);
    const setClauses = keys.map((k) => `\`${k}\` = ?`).join(", ");
    const values = [
      ...Object.values(fieldsToSet).map((v) =>
        typeof v === "object" && v !== null ? JSON.stringify(v) : v
      ),
      id
    ];

    const sql = `UPDATE ${tableName} SET ${setClauses} WHERE id = ?;`;
    const res = await db.runAsync(sql, ...values);
    return res.changes > 0;
  },

  /**
   * Mark a record as pending deletion, or delete from table
   */
  async delete(tableName: string, id: string): Promise<boolean> {
    const db = await getDatabase();
    const sql = `DELETE FROM ${tableName} WHERE id = ?;`;
    const res = await db.runAsync(sql, id);
    return res.changes > 0;
  },

  /**
   * Query all records where syncStatus = "pending" across tables
   */
  async getPendingRecords(tableName: string): Promise<any[]> {
    const db = await getDatabase();
    return db.getAllAsync(`SELECT * FROM ${tableName} WHERE syncStatus = 'pending';`);
  },

  /**
   * Mark records as synced
   */
  async markAsSynced(tableName: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    for (const id of ids) {
      await db.runAsync(`UPDATE ${tableName} SET syncStatus = 'synced' WHERE id = ?;`, id);
    }
  }
};
