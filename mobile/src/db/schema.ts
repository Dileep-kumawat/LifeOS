/**
 * Local SQLite Database Schema Definitions
 *
 * Mirrors Phase 1–4 backend Mongoose models field-for-field.
 * Every entity table includes:
 * - `syncStatus`: "synced" | "pending" | "conflict"
 * - `lastModifiedAt`: integer timestamp (milliseconds)
 */

export type SyncStatus = "synced" | "pending" | "conflict";

export interface SyncableEntity {
  syncStatus: SyncStatus;
  lastModifiedAt: number;
}

export interface LocalUser extends SyncableEntity {
  id: string; // Server _id
  email: string;
  name: string;
  role: "user" | "admin";
  emailVerified: number; // 0 or 1
  status: "active" | "soft_deleted";
  subscriptionTier: "free" | "pro";
  createdAt: string;
  updatedAt: string;
}

export interface LocalEvent extends SyncableEntity {
  id: string;
  userId: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isAllDay: number; // 0 or 1
  recurrenceRule: string | null;
  recurrenceEndDate: string | null;
  exceptions: string; // JSON array of exception objects
  reminderLeadMinutes: number | null;
  reminderJobId: string | null;
  isOverride: number; // 0 or 1
  parentEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalGoal extends SyncableEntity {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate: string | null;
  status: "active" | "completed" | "abandoned";
  progressPercent: number;
  milestones: string; // JSON array of milestone objects
  linkedEventIds: string; // JSON array of event id strings
  linkedNoteIds: string; // JSON array of note id strings
  createdAt: string;
  updatedAt: string;
}

export interface LocalHabit extends SyncableEntity {
  id: string;
  userId: string;
  title: string;
  frequency: string; // JSON object: { type, daysOfWeek, timesPerPeriod }
  reminderTime: string | null;
  reminderEnabled: number; // 0 or 1
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  lastCheckInDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalHabitCheckIn extends SyncableEntity {
  id: string;
  habitId: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  completed: number; // 0 or 1
  createdAt: string;
  updatedAt: string;
}

export interface LocalNote extends SyncableEntity {
  id: string;
  userId: string;
  title: string;
  content: string; // JSON TipTap/ProseMirror doc
  contentText: string;
  folderId: string | null;
  tags: string; // JSON array of string tags
  createdAt: string;
  updatedAt: string;
}

export interface LocalNoteFolder extends SyncableEntity {
  id: string;
  userId: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalTransaction extends SyncableEntity {
  id: string;
  userId: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  note: string;
  receiptAttachment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalBudget extends SyncableEntity {
  id: string;
  userId: string;
  category: string;
  limit: number;
  period: "monthly";
  currentSpend: number;
  notifiedOverspend: number; // 0 or 1
  createdAt: string;
  updatedAt: string;
}

export interface LocalCategory extends SyncableEntity {
  id: string;
  userId: string;
  name: string;
  type: "income" | "expense";
  createdAt: string;
  updatedAt: string;
}

export interface LocalNoteVersion extends SyncableEntity {
  id: string;
  noteId: string;
  userId: string;
  versionNumber: number;
  title: string;
  content: string; // JSON doc
  contentText: string;
  folderId: string | null;
  tags: string; // JSON array
  changeSource: string;
  createdAt: string;
}

export interface LocalSubject extends SyncableEntity {
  id: string;
  userId: string;
  name: string;
  color: string;
  examDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalTopic extends SyncableEntity {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "completed";
  estimatedMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalFlashcard extends SyncableEntity {
  id: string;
  userId: string;
  subjectId: string | null;
  topicId: string | null;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalFocusSession extends SyncableEntity {
  id: string;
  userId: string;
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  currentCycle: number;
  currentPhase: "work" | "break" | "long_break";
  linkedType: "task" | "goal" | "topic" | "none";
  linkedId: string | null;
  status: "active" | "paused" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  pausedAt: string | null;
  lastResumedAt: string | null;
  accumulatedWorkSeconds: number;
  totalFocusMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSyncConflict {
  id: string;
  entityId: string;
  module: string;
  localData: string; // JSON string of local record
  remoteData: string; // JSON string of server record
  conflictingFields: string; // JSON array of conflicting field names
  status: "unresolved" | "resolved";
  createdAt: string;
}

/**
 * SQL DDL statements for creating all local database tables and indexes
 */
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  emailVerified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  subscriptionTier TEXT NOT NULL DEFAULT 'free',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  timezone TEXT NOT NULL,
  isAllDay INTEGER NOT NULL DEFAULT 0,
  recurrenceRule TEXT,
  recurrenceEndDate TEXT,
  exceptions TEXT NOT NULL DEFAULT '[]',
  reminderLeadMinutes INTEGER,
  reminderJobId TEXT,
  isOverride INTEGER NOT NULL DEFAULT 0,
  parentEventId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(userId, startTime);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  targetDate TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  progressPercent REAL NOT NULL DEFAULT 0,
  milestones TEXT NOT NULL DEFAULT '[]',
  linkedEventIds TEXT NOT NULL DEFAULT '[]',
  linkedNoteIds TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(userId, status);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL,
  reminderTime TEXT,
  reminderEnabled INTEGER NOT NULL DEFAULT 0,
  currentStreak INTEGER NOT NULL DEFAULT 0,
  longestStreak INTEGER NOT NULL DEFAULT 0,
  completionRate REAL NOT NULL DEFAULT 0,
  lastCheckInDate TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(userId, createdAt);

CREATE TABLE IF NOT EXISTS habit_check_ins (
  id TEXT PRIMARY KEY,
  habitId TEXT NOT NULL,
  userId TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL,
  UNIQUE(habitId, date)
);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_user_date ON habit_check_ins(userId, date);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  contentText TEXT NOT NULL DEFAULT '',
  folderId TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_user_folder ON notes(userId, folderId, updatedAt);

CREATE TABLE IF NOT EXISTS note_folders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  parentFolderId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_note_folders_user ON note_folders(userId, parentFolderId, name);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  receiptAttachment TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(userId, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat ON transactions(userId, category);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  category TEXT NOT NULL,
  \`limit\` REAL NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  currentSpend REAL NOT NULL DEFAULT 0,
  notifiedOverspend INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL,
  UNIQUE(userId, category, period)
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL,
  UNIQUE(userId, type, name)
);

CREATE TABLE IF NOT EXISTS note_versions (
  id TEXT PRIMARY KEY,
  noteId TEXT NOT NULL,
  userId TEXT NOT NULL,
  versionNumber INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  contentText TEXT NOT NULL DEFAULT '',
  folderId TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  changeSource TEXT NOT NULL DEFAULT 'local',
  createdAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(noteId, versionNumber);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0075de',
  examDate TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(userId, createdAt);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  subjectId TEXT NOT NULL,
  title TEXT NOT NULL,
  deadline TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'not_started',
  estimatedMinutes INTEGER,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topics_user_subject ON topics(userId, subjectId, createdAt);

CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  subjectId TEXT,
  topicId TEXT,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  easeFactor REAL NOT NULL DEFAULT 2.5,
  intervalDays INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  nextReviewDate TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_review ON flashcards(userId, nextReviewDate);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_topic ON flashcards(userId, topicId);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  workMinutes INTEGER NOT NULL DEFAULT 25,
  breakMinutes INTEGER NOT NULL DEFAULT 5,
  longBreakMinutes INTEGER NOT NULL DEFAULT 15,
  longBreakInterval INTEGER NOT NULL DEFAULT 4,
  currentCycle INTEGER NOT NULL DEFAULT 1,
  currentPhase TEXT NOT NULL DEFAULT 'work',
  linkedType TEXT NOT NULL DEFAULT 'none',
  linkedId TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  startedAt TEXT NOT NULL,
  completedAt TEXT,
  pausedAt TEXT,
  lastResumedAt TEXT,
  accumulatedWorkSeconds INTEGER NOT NULL DEFAULT 0,
  totalFocusMinutes INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'synced',
  lastModifiedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_status ON focus_sessions(userId, status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started ON focus_sessions(userId, startedAt);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  entityId TEXT NOT NULL,
  module TEXT NOT NULL,
  localData TEXT NOT NULL,
  remoteData TEXT NOT NULL,
  conflictingFields TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'unresolved',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status, module);
`;
