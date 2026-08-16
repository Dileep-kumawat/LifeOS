/**
 * SQLite Local Database Manager
 * Uses expo-sqlite for native runtime with in-memory SQLite fallback for test suites.
 */

import { CREATE_TABLES_SQL } from "./schema";

export interface DatabaseAdapter {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]>;
  closeAsync(): Promise<void>;
}

// In-memory mock adapter for node/vitest tests
class InMemoryDatabaseAdapter implements DatabaseAdapter {
  private tables = new Map<string, Map<string, any>>();

  async execAsync(sql: string): Promise<void> {
    // Basic table schema initialization tracking
    const tableMatches = sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g);
    for (const match of tableMatches) {
      if (!this.tables.has(match[1])) {
        this.tables.set(match[1], new Map());
      }
    }
  }

  async runAsync(sql: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const insertMatch = sql.match(/INSERT (?:OR REPLACE )?INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const columns = insertMatch[2].split(",").map((c) => c.trim().replace(/`/g, ""));
      const table = this.tables.get(tableName) || new Map();
      const record: any = {};
      columns.forEach((col, idx) => {
        record[col] = params[idx];
      });
      if (record.id) {
        table.set(record.id, record);
      }
      this.tables.set(tableName, table);
      return { lastInsertRowId: 1, changes: 1 };
    }

    const deleteMatch = sql.match(/DELETE FROM (\w+) WHERE id = \?/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const id = params[0];
      const table = this.tables.get(tableName);
      if (table && table.has(id)) {
        table.delete(id);
        return { lastInsertRowId: 0, changes: 1 };
      }
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null> {
    const results = await this.getAllAsync<T>(sql, ...params);
    return results.length > 0 ? results[0] : null;
  }

  async getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]> {
    const selectMatch = sql.match(/SELECT \* FROM (\w+)(?:\s+WHERE\s+([^;]+))?/i);
    if (!selectMatch) return [];
    const tableName = selectMatch[1];
    const table = this.tables.get(tableName);
    if (!table) return [];
    const items = Array.from(table.values());

    if (params.length > 0 && selectMatch[2]) {
      // Basic id or userId filtering
      if (selectMatch[2].includes("id = ?")) {
        return items.filter((item: any) => item.id === params[0]) as T[];
      }
      if (selectMatch[2].includes("userId = ?")) {
        return items.filter((item: any) => item.userId === params[0]) as T[];
      }
    }
    return items as T[];
  }

  async closeAsync(): Promise<void> {
    this.tables.clear();
  }
}

let dbInstance: DatabaseAdapter | null = null;

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    // Attempt to load expo-sqlite in React Native / Expo environment
    const SQLite = await import("expo-sqlite");
    if (SQLite && SQLite.openDatabaseAsync) {
      const expoDb = await SQLite.openDatabaseAsync("lifeos.db");
      await expoDb.execAsync(CREATE_TABLES_SQL);
      dbInstance = expoDb as unknown as DatabaseAdapter;
      return dbInstance;
    }
  } catch (_err) {
    // In Node / Vitest testing environment, fallback to InMemoryDatabaseAdapter
  }

  const memoryDb = new InMemoryDatabaseAdapter();
  await memoryDb.execAsync(CREATE_TABLES_SQL);
  dbInstance = memoryDb;
  return dbInstance;
}

export async function resetDatabaseForTests(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
