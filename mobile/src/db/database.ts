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
      const columns = insertMatch[2].split(",").map((c) => c.trim().replace(/[`"']/g, ""));
      const table = this.tables.get(tableName) || new Map();
      const record: any = {};
      columns.forEach((col, idx) => {
        let val = params[idx];
        if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
          try {
            // Keep json string or object
          } catch {}
        }
        record[col] = val;
      });
      if (record.id) {
        table.set(record.id, record);
      }
      this.tables.set(tableName, table);
      return { lastInsertRowId: 1, changes: 1 };
    }

    const updateMatch = sql.match(/UPDATE (\w+)\s+SET\s+([^;]+)\s+WHERE\s+id\s*=\s*\?/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const id = params[params.length - 1];
      const table = this.tables.get(tableName);
      if (table && table.has(id)) {
        const record = table.get(id);
        const setParts = setClause.split(",").map((s) => s.trim());
        let paramIdx = 0;
        for (const part of setParts) {
          const colMatch = part.match(/`?(\w+)`?\s*=\s*(.+)/);
          if (colMatch) {
            const colName = colMatch[1];
            const valExpr = colMatch[2].trim();
            if (valExpr === "?") {
              record[colName] = params[paramIdx++];
            } else if (valExpr.startsWith("'") && valExpr.endsWith("'")) {
              record[colName] = valExpr.slice(1, -1);
            } else if (!isNaN(Number(valExpr))) {
              record[colName] = Number(valExpr);
            } else {
              record[colName] = valExpr;
            }
          }
        }
        table.set(id, record);
        return { lastInsertRowId: 0, changes: 1 };
      }
      return { lastInsertRowId: 0, changes: 0 };
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
    const selectMatch = sql.match(/SELECT\s+([^;]+)\s+FROM\s+(\w+)(?:\s+WHERE\s+([^;]+))?/i);
    if (!selectMatch) return [];
    const fields = selectMatch[1].trim();
    const tableName = selectMatch[2];
    const whereClause = selectMatch[3] ? selectMatch[3].trim() : "";

    const table = this.tables.get(tableName);
    if (!table) return [];
    let items = Array.from(table.values());

    if (whereClause) {
      let paramIdx = 0;
      if (whereClause.includes("syncStatus = 'pending'")) {
        items = items.filter((item: any) => item.syncStatus === "pending");
      }
      if (whereClause.includes("syncStatus = 'synced'")) {
        items = items.filter((item: any) => item.syncStatus === "synced");
      }
      if (whereClause.includes("id = ?")) {
        const idVal = params[paramIdx++];
        items = items.filter((item: any) => item.id === idVal);
      }
      if (whereClause.includes("userId = ?")) {
        const userVal = params[paramIdx++];
        items = items.filter((item: any) => item.userId === userVal);
      }
      if (whereClause.includes("habitId = ?")) {
        const habitVal = params[paramIdx++];
        items = items.filter((item: any) => item.habitId === habitVal);
      }
    }

    if (fields !== "*") {
      const fieldList = fields.split(",").map((f) => f.trim().replace(/[`"']/g, ""));
      return items.map((item: any) => {
        const projected: any = {};
        for (const f of fieldList) {
          projected[f] = item[f];
        }
        return projected;
      }) as T[];
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
