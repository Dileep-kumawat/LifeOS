import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock React Native and Expo runtime modules
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  AppState: {
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() })
  }
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: null }
}));

vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: 1,
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined)
}));

import { syncEngine } from "../syncEngine";
import { noteRepo } from "../../db/repositories/noteRepo";
import { financeRepo } from "../../db/repositories/financeRepo";
import { getDatabase, resetDatabaseForTests } from "../../db/database";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { apiClient } from "../apiClient";

vi.mock("../apiClient", () => ({
  apiClient: {
    post: vi.fn()
  },
  refreshAccessToken: vi.fn().mockResolvedValue("mock-token"),
  tokenStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined)
  }
}));

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test",
  role: "user" as const,
  status: "active" as const,
  emailVerified: true,
  createdAt: new Date().toISOString()
};

describe("Mobile Sync Engine - Per-Module Conflict Resolution Lifecycle", () => {
  const userId = "user-123";

  beforeEach(async () => {
    await resetDatabaseForTests();
    useAuthStore.getState().setAuth(mockUser, "valid-token");
    useSyncStore.getState().reset();
    useSyncStore.getState().setIsOnline(true);
    vi.clearAllMocks();
  });

  it("handles Note true conflict by storing conflict in SQLite and alerting user", async () => {
    // 1. Create a local pending note
    const note = await noteRepo.createNote({
      userId,
      title: "Local Note Edit",
      content: '{"type":"doc"}',
      contentText: "Local Note Edit text",
      folderId: null,
      tags: "[]"
    });

    const serverNoteRecord = {
      id: note.id,
      userId,
      title: "Server Note Edit",
      content: '{"type":"doc"}',
      contentText: "Server Note Edit text",
      folderId: null,
      tags: [],
      updatedAt: "2026-08-16T12:00:00.000Z"
    };

    // 2. Mock /sync/push returning a conflict
    (apiClient.post as any).mockImplementation((url: string) => {
      if (url === "/sync/push") {
        return Promise.resolve({
          data: {
            cursor: "2026-08-16T12:00:00.000Z",
            results: [
              {
                id: note.id,
                module: "notes",
                status: "conflict",
                conflictingFields: ["title", "content"],
                serverRecord: serverNoteRecord,
                conflictData: {
                  clientRecord: { title: "Local Note Edit" },
                  serverRecord: serverNoteRecord,
                  conflictingFields: ["title", "content"]
                }
              }
            ]
          }
        });
      }
      if (url === "/sync/pull") {
        return Promise.resolve({
          data: {
            cursor: "2026-08-16T12:00:00.000Z",
            serverTime: "2026-08-16T12:00:00.000Z",
            changes: {}
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    // 3. Run sync
    const success = await syncEngine.syncNow();
    expect(success).toBe(true);

    // 4. Verify conflict recorded in syncStore
    const conflicts = useSyncStore.getState().conflicts;
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].module).toBe("notes");
    expect(conflicts[0].entityId).toBe(note.id);

    // 5. Verify conflict recorded in SQLite table
    const db = await getDatabase();
    const conflictRows = await db.getAllAsync<any>(
      "SELECT * FROM sync_conflicts WHERE entityId = ?;",
      note.id
    );
    expect(conflictRows).toHaveLength(1);
    expect(conflictRows[0].status).toBe("unresolved");

    // 6. Verify local note syncStatus was marked 'conflict'
    const noteRows = await db.getAllAsync<any>("SELECT * FROM notes WHERE id = ?;", note.id);
    expect(noteRows[0].syncStatus).toBe("conflict");

    // 7. Verify in-app notice was triggered
    expect(useSyncStore.getState().conflictNotices.length).toBeGreaterThan(0);
  });

  it("resolves a Note conflict using 'keep_local'", async () => {
    const note = await noteRepo.createNote({
      userId,
      title: "My Local Keeper",
      content: '{"type":"doc"}',
      contentText: "Keep this local text",
      folderId: null,
      tags: "[]"
    });

    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_conflicts (id, entityId, module, localData, remoteData, conflictingFields, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      note.id,
      note.id,
      "notes",
      JSON.stringify({ title: "My Local Keeper", contentText: "Keep this local text" }),
      JSON.stringify({ title: "Remote Server Title", contentText: "Remote text" }),
      JSON.stringify(["title", "content"]),
      "unresolved",
      new Date().toISOString()
    );

    useSyncStore.getState().addConflict({
      id: note.id,
      entityId: note.id,
      module: "notes",
      localData: JSON.stringify({ title: "My Local Keeper", contentText: "Keep this local text" }),
      remoteData: JSON.stringify({ title: "Remote Server Title", contentText: "Remote text" }),
      conflictingFields: JSON.stringify(["title", "content"]),
      status: "unresolved",
      createdAt: new Date().toISOString()
    });

    (apiClient.post as any).mockResolvedValue({ data: { status: "applied" } });

    // User chooses 'keep_local'
    const resolved = await syncEngine.resolveConflict(note.id, "keep_local");
    expect(resolved).toBe(true);

    // Verify conflict removed from store and SQLite
    expect(useSyncStore.getState().conflicts).toHaveLength(0);
    const conflictRows = await db.getAllAsync<any>(
      "SELECT * FROM sync_conflicts WHERE entityId = ?;",
      note.id
    );
    expect(conflictRows).toHaveLength(0);

    // Verify local note preserved
    const noteRows = await db.getAllAsync<any>("SELECT * FROM notes WHERE id = ?;", note.id);
    expect(noteRows[0].title).toBe("My Local Keeper");
    expect(noteRows[0].syncStatus).toBe("synced");
  });

  it("resolves a Note conflict using 'keep_server'", async () => {
    const note = await noteRepo.createNote({
      userId,
      title: "Local Title to Overwrite",
      content: '{"type":"doc"}',
      contentText: "Local text",
      folderId: null,
      tags: "[]"
    });

    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_conflicts (id, entityId, module, localData, remoteData, conflictingFields, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      note.id,
      note.id,
      "notes",
      JSON.stringify({ title: "Local Title to Overwrite", contentText: "Local text" }),
      JSON.stringify({
        id: note.id,
        userId,
        title: "Remote Master Title",
        contentText: "Remote Master Content"
      }),
      JSON.stringify(["title"]),
      "unresolved",
      new Date().toISOString()
    );

    useSyncStore.getState().addConflict({
      id: note.id,
      entityId: note.id,
      module: "notes",
      localData: JSON.stringify({ title: "Local Title to Overwrite", contentText: "Local text" }),
      remoteData: JSON.stringify({
        id: note.id,
        userId,
        title: "Remote Master Title",
        contentText: "Remote Master Content"
      }),
      conflictingFields: JSON.stringify(["title"]),
      status: "unresolved",
      createdAt: new Date().toISOString()
    });

    (apiClient.post as any).mockResolvedValue({ data: { status: "applied" } });

    // User chooses 'keep_server'
    const resolved = await syncEngine.resolveConflict(note.id, "keep_server");
    expect(resolved).toBe(true);

    // Verify local record updated with server data
    const noteRows = await db.getAllAsync<any>("SELECT * FROM notes WHERE id = ?;", note.id);
    expect(noteRows[0].title).toBe("Remote Master Title");
    expect(noteRows[0].contentText).toBe("Remote Master Content");
    expect(noteRows[0].syncStatus).toBe("synced");
  });

  it("resolves a Note conflict using 'manual_merge'", async () => {
    const note = await noteRepo.createNote({
      userId,
      title: "Local Title",
      content: '{"type":"doc"}',
      contentText: "Local Body",
      folderId: null,
      tags: "[]"
    });

    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_conflicts (id, entityId, module, localData, remoteData, conflictingFields, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      note.id,
      note.id,
      "notes",
      JSON.stringify({ title: "Local Title", contentText: "Local Body" }),
      JSON.stringify({ id: note.id, userId, title: "Server Title", contentText: "Server Body" }),
      JSON.stringify(["title", "content"]),
      "unresolved",
      new Date().toISOString()
    );

    useSyncStore.getState().addConflict({
      id: note.id,
      entityId: note.id,
      module: "notes",
      localData: JSON.stringify({ title: "Local Title", contentText: "Local Body" }),
      remoteData: JSON.stringify({
        id: note.id,
        userId,
        title: "Server Title",
        contentText: "Server Body"
      }),
      conflictingFields: JSON.stringify(["title", "content"]),
      status: "unresolved",
      createdAt: new Date().toISOString()
    });

    (apiClient.post as any).mockResolvedValue({ data: { status: "applied" } });

    const mergedData = {
      title: "Combined Unified Title",
      contentText: "Combined Unified Content Body",
      content: { type: "doc", content: [] }
    };

    const resolved = await syncEngine.resolveConflict(note.id, "manual_merge", mergedData);
    expect(resolved).toBe(true);

    const noteRows = await db.getAllAsync<any>("SELECT * FROM notes WHERE id = ?;", note.id);
    expect(noteRows[0].title).toBe("Combined Unified Title");
    expect(noteRows[0].contentText).toBe("Combined Unified Content Body");
  });

  it("displays Calendar lightweight overwrite notice in syncStore without blocking UI", async () => {
    (apiClient.post as any).mockImplementation((url: string) => {
      if (url === "/sync/push") {
        return Promise.resolve({
          data: {
            cursor: "2026-08-16T12:00:00.000Z",
            results: [
              {
                id: "event-123",
                module: "events",
                status: "applied",
                conflictNotice:
                  "This event was updated on another device and your local change was overwritten"
              }
            ]
          }
        });
      }
      if (url === "/sync/pull") {
        return Promise.resolve({
          data: {
            cursor: "2026-08-16T12:00:00.000Z",
            serverTime: "2026-08-16T12:00:00.000Z",
            changes: {}
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    // Create a local pending event
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO events (id, userId, title, startTime, endTime, timezone, syncStatus, lastModifiedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "event-123",
      userId,
      "My Event",
      "2026-08-16T10:00:00.000Z",
      "2026-08-16T11:00:00.000Z",
      "UTC",
      "pending",
      Date.now(),
      new Date().toISOString(),
      new Date().toISOString()
    );

    const success = await syncEngine.syncNow();
    expect(success).toBe(true);

    // Verify conflictNotice was added to store
    const notices = useSyncStore.getState().conflictNotices;
    expect(notices).toContain(
      "This event was updated on another device and your local change was overwritten"
    );

    // Verify NO blocking conflict was added to conflicts list
    expect(useSyncStore.getState().conflicts).toHaveLength(0);
  });

  it("handles Finance transaction true conflict without silent discard", async () => {
    const tx = await financeRepo.createTransaction({
      userId,
      amount: 100.0,
      type: "expense",
      category: "Tech",
      date: "2026-08-16",
      note: "Offline Laptop accessory",
      receiptAttachment: null
    });

    (apiClient.post as any).mockImplementation((url: string) => {
      if (url === "/sync/push") {
        return Promise.resolve({
          data: {
            cursor: "2026-08-16T12:00:00.000Z",
            results: [
              {
                id: tx.id,
                module: "transactions",
                status: "conflict",
                conflictingFields: ["amount"],
                serverRecord: {
                  id: tx.id,
                  amount: 150.0,
                  category: "Tech",
                  note: "Server edit laptop accessory"
                }
              }
            ]
          }
        });
      }
      if (url === "/sync/pull") {
        return Promise.resolve({
          data: { cursor: "123", serverTime: "123", changes: {} }
        });
      }
      return Promise.resolve({ data: {} });
    });

    await syncEngine.syncNow();

    // Verify transaction conflict is surfaced
    const conflicts = useSyncStore.getState().conflicts;
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].module).toBe("transactions");
    expect(conflicts[0].entityId).toBe(tx.id);

    const db = await getDatabase();
    const rows = await db.getAllAsync<any>("SELECT * FROM transactions WHERE id = ?;", tx.id);
    expect(rows[0].syncStatus).toBe("conflict");
  });
});
