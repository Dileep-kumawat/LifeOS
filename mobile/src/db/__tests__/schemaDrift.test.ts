import { describe, it, expect } from "vitest";
import { getDatabase, resetDatabaseForTests } from "../database";
import { CREATE_TABLES_SQL } from "../schema";

// Mongoose schema field reference definitions to check for schema drift
const BACKEND_SCHEMA_SPECS = {
  users: [
    "id",
    "email",
    "name",
    "role",
    "emailVerified",
    "status",
    "subscriptionTier",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  events: [
    "id",
    "userId",
    "title",
    "description",
    "location",
    "startTime",
    "endTime",
    "timezone",
    "isAllDay",
    "recurrenceRule",
    "recurrenceEndDate",
    "exceptions",
    "reminderLeadMinutes",
    "reminderJobId",
    "isOverride",
    "parentEventId",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  goals: [
    "id",
    "userId",
    "title",
    "description",
    "targetDate",
    "status",
    "progressPercent",
    "milestones",
    "linkedEventIds",
    "linkedNoteIds",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  habits: [
    "id",
    "userId",
    "title",
    "frequency",
    "reminderTime",
    "reminderEnabled",
    "currentStreak",
    "longestStreak",
    "completionRate",
    "lastCheckInDate",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  habit_check_ins: [
    "id",
    "habitId",
    "userId",
    "date",
    "completed",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  notes: [
    "id",
    "userId",
    "title",
    "content",
    "contentText",
    "folderId",
    "tags",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  note_folders: [
    "id",
    "userId",
    "name",
    "parentFolderId",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  transactions: [
    "id",
    "userId",
    "amount",
    "type",
    "category",
    "date",
    "note",
    "receiptAttachment",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  budgets: [
    "id",
    "userId",
    "category",
    "limit",
    "period",
    "currentSpend",
    "notifiedOverspend",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  categories: [
    "id",
    "userId",
    "name",
    "type",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  note_versions: [
    "id",
    "noteId",
    "userId",
    "versionNumber",
    "title",
    "content",
    "contentText",
    "folderId",
    "tags",
    "changeSource",
    "createdAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  subjects: [
    "id",
    "userId",
    "name",
    "color",
    "examDate",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  topics: [
    "id",
    "userId",
    "subjectId",
    "title",
    "deadline",
    "priority",
    "status",
    "estimatedMinutes",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  flashcards: [
    "id",
    "userId",
    "subjectId",
    "topicId",
    "front",
    "back",
    "easeFactor",
    "intervalDays",
    "repetitions",
    "nextReviewDate",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ],
  focus_sessions: [
    "id",
    "userId",
    "workMinutes",
    "breakMinutes",
    "longBreakMinutes",
    "longBreakInterval",
    "currentCycle",
    "currentPhase",
    "linkedType",
    "linkedId",
    "status",
    "startedAt",
    "completedAt",
    "pausedAt",
    "lastResumedAt",
    "accumulatedWorkSeconds",
    "totalFocusMinutes",
    "createdAt",
    "updatedAt",
    "syncStatus",
    "lastModifiedAt"
  ]
};

describe("Local SQLite Schema Drift Check", () => {
  it("should contain all required models in CREATE_TABLES_SQL", () => {
    const tableNames = Object.keys(BACKEND_SCHEMA_SPECS);
    for (const table of tableNames) {
      expect(CREATE_TABLES_SQL).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("should have syncStatus and lastModifiedAt fields in every table definition", () => {
    const tableNames = Object.keys(BACKEND_SCHEMA_SPECS);
    for (const table of tableNames) {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(([^;]+)\\);`, "i");
      const match = CREATE_TABLES_SQL.match(tableRegex);
      expect(match, `Table ${table} should match SQL schema regex`).not.toBeNull();
      const body = match![1];
      expect(body).toContain("syncStatus TEXT NOT NULL");
      expect(body).toContain("lastModifiedAt INTEGER NOT NULL");
    }
  });

  it("should mirror every field from backend schema specs in local SQLite tables", () => {
    for (const [table, expectedFields] of Object.entries(BACKEND_SCHEMA_SPECS)) {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(([^;]+)\\);`, "i");
      const match = CREATE_TABLES_SQL.match(tableRegex);
      expect(match).not.toBeNull();
      const body = match![1];

      for (const field of expectedFields) {
        const fieldRegex = new RegExp(`\\b${field}\\b`, "i");
        expect(
          fieldRegex.test(body),
          `Table "${table}" missing expected field "${field}" from backend spec`
        ).toBe(true);
      }
    }
  });

  it("should successfully initialize database adapter and execute CRUD operations", async () => {
    await resetDatabaseForTests();
    const db = await getDatabase();
    expect(db).toBeDefined();

    // Test insert and retrieve a note
    const now = Date.now();
    await db.runAsync(
      "INSERT INTO notes (id, userId, title, content, contentText, folderId, tags, createdAt, updatedAt, syncStatus, lastModifiedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "note-123",
      "user-456",
      "My Test Note",
      JSON.stringify({ type: "doc", content: [] }),
      "My Test Note content",
      null,
      JSON.stringify(["personal"]),
      new Date().toISOString(),
      new Date().toISOString(),
      "pending",
      now
    );

    const note = await db.getFirstAsync<any>("SELECT * FROM notes WHERE id = ?", "note-123");
    expect(note).not.toBeNull();
    expect(note?.id).toBe("note-123");
    expect(note?.title).toBe("My Test Note");
    expect(note?.syncStatus).toBe("pending");
    expect(note?.lastModifiedAt).toBe(now);
  });
});
