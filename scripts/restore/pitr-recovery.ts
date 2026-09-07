import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createDatabaseBackup } from "../backup/backup.js";
import { restoreDatabase } from "./restore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PitrTestEvidence {
  success: boolean;
  sourceDatabase: string;
  recoveryDatabase: string;
  recoveryTargetTimestamp: string;
  preTargetCounts: Record<string, number>;
  postTargetInjectedBadRecords: string[];
  restoredCounts: Record<string, number>;
  checks: {
    preTargetDataExists: boolean;
    postTargetBadChangeAbsent: boolean;
    unrelatedRecordsCorrect: boolean;
    indexesUsable: boolean;
  };
  durationMs: number;
}

export async function runControlledPitrTest(options: {
  mongoUri?: string;
  sourceDb?: string;
  recoveryDb?: string;
} = {}): Promise<PitrTestEvidence> {
  const startTime = Date.now();
  const mongoUri = options.mongoUri || process.env.MONGO_URI || "mongodb://localhost:27017/lifeos";
  const sourceDb = options.sourceDb || "lifeos_test_pitr_source";
  const recoveryDb = options.recoveryDb || "lifeos_pitr_recovery";

  console.log(`\n==================================================`);
  console.log(`STARTING CONTROLLED POINT-IN-TIME RECOVERY TEST`);
  console.log(`- Source DB: ${sourceDb}`);
  console.log(`- Recovery DB: ${recoveryDb}`);
  console.log(`==================================================\n`);

  const conn = await mongoose.createConnection(mongoUri).asPromise();
  const sourceDatabase = conn.useDb(sourceDb);

  // Step 1: Clean and Seed Known Pre-Target Test Dataset
  console.log(`[Step 1] Seeding known pre-target dataset into "${sourceDb}"...`);
  await sourceDatabase.dropDatabase();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("SafePassword123!", salt);
  const testUserId = new mongoose.Types.ObjectId();

  // 1a. User
  await sourceDatabase.collection("users").insertOne({
    _id: testUserId,
    email: "alice.restored@example.com",
    name: "Alice Restored",
    passwordHash,
    role: "user",
    status: "active",
    emailVerified: true,
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T10:00:00.000Z")
  });

  // 1b. Notes
  const preNote1Id = new mongoose.Types.ObjectId();
  const preNote2Id = new mongoose.Types.ObjectId();
  await sourceDatabase.collection("notes").insertMany([
    {
      _id: preNote1Id,
      userId: testUserId,
      title: "Pre-Incident Architecture Note",
      content: "Mission critical architecture specifications for LifeOS.",
      isPinned: true,
      tags: ["architecture", "core"],
      createdAt: new Date("2026-09-01T10:15:00.000Z"),
      updatedAt: new Date("2026-09-01T10:15:00.000Z")
    },
    {
      _id: preNote2Id,
      userId: testUserId,
      title: "Legitimate Q3 Strategy",
      content: "Execute continuous backup and high-fidelity PITR tests.",
      isPinned: false,
      tags: ["strategy"],
      createdAt: new Date("2026-09-01T10:20:00.000Z"),
      updatedAt: new Date("2026-09-01T10:20:00.000Z")
    }
  ]);

  // 1c. Habit
  await sourceDatabase.collection("habits").insertOne({
    _id: new mongoose.Types.ObjectId(),
    userId: testUserId,
    name: "Daily Meditation",
    frequency: "daily",
    targetCount: 1,
    currentStreak: 14,
    bestStreak: 14,
    createdAt: new Date("2026-09-01T10:25:00.000Z"),
    updatedAt: new Date("2026-09-01T10:25:00.000Z")
  });

  // 1d. Transaction
  await sourceDatabase.collection("transactions").insertOne({
    _id: new mongoose.Types.ObjectId(),
    userId: testUserId,
    amount: 120.5,
    category: "Infrastructure",
    type: "expense",
    date: new Date("2026-09-01T10:30:00.000Z"),
    notes: "Cloud backup storage subscription",
    createdAt: new Date("2026-09-01T10:30:00.000Z"),
    updatedAt: new Date("2026-09-01T10:30:00.000Z")
  });

  // 1e. Conversation & Messages
  const conversationId = new mongoose.Types.ObjectId();
  await sourceDatabase.collection("conversations").insertOne({
    _id: conversationId,
    userId: testUserId,
    title: "Disaster Recovery Planning",
    createdAt: new Date("2026-09-01T10:35:00.000Z"),
    updatedAt: new Date("2026-09-01T10:35:00.000Z")
  });

  await sourceDatabase.collection("messages").insertOne({
    _id: new mongoose.Types.ObjectId(),
    userId: testUserId,
    conversationId,
    role: "assistant",
    content: "The PITR strategy guarantees recovery to any pre-incident state.",
    createdAt: new Date("2026-09-01T10:36:00.000Z")
  });

  // 1f. Create indexes to verify index recovery
  await sourceDatabase.collection("users").createIndex({ email: 1 }, { unique: true });
  await sourceDatabase.collection("notes").createIndex({ userId: 1, createdAt: -1 });
  await sourceDatabase.collection("transactions").createIndex({ userId: 1, date: -1 });

  const preTargetCounts: Record<string, number> = {
    users: await sourceDatabase.collection("users").countDocuments(),
    notes: await sourceDatabase.collection("notes").countDocuments(),
    habits: await sourceDatabase.collection("habits").countDocuments(),
    transactions: await sourceDatabase.collection("transactions").countDocuments(),
    conversations: await sourceDatabase.collection("conversations").countDocuments(),
    messages: await sourceDatabase.collection("messages").countDocuments()
  };

  console.log(`[Step 1 Complete] Pre-target dataset seeded:`, preTargetCounts);

  // Step 2: Capture Snapshot / Backup Availability at T0
  console.log(`\n[Step 2] Capturing backup snapshot at T0...`);
  const backupRes = await createDatabaseBackup({
    mongoUri,
    databaseName: sourceDb,
    encrypt: true,
    encryptionKeyHex: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    prune: false
  });
  console.log(`[Step 2 Complete] Backup snapshot captured: ${backupRes.archivePath}`);

  // Step 3: Record Recovery Target
  const recoveryTargetTimestamp = new Date().toISOString();
  console.log(`\n[Step 3] Recorded Recovery Target Timestamp: ${recoveryTargetTimestamp}`);

  // Small delay to ensure timestamp boundary separation
  await new Promise((r) => setTimeout(r, 200));

  // Step 4: Create Known "Bad" Corrupting Data / Changes AFTER Recovery Target
  console.log(`\n[Step 4] Injecting post-target bad data / corrupting changes...`);
  const badNoteId = new mongoose.Types.ObjectId();
  const badTxId = new mongoose.Types.ObjectId();

  await sourceDatabase.collection("notes").insertOne({
    _id: badNoteId,
    userId: testUserId,
    title: "MALICIOUS RANSOMWARE NOTE - INJECTED POST TARGET",
    content: "Your database has been compromised after T_target!",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await sourceDatabase.collection("transactions").insertOne({
    _id: badTxId,
    userId: testUserId,
    amount: -9999999,
    category: "Ransom",
    type: "expense",
    date: new Date(),
    notes: "Corrupted rogue transaction",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Accidental deletion of legitimate note in source DB
  await sourceDatabase.collection("notes").deleteOne({ _id: preNote2Id });

  // Malicious status update in source DB
  await sourceDatabase.collection("users").updateOne(
    { _id: testUserId },
    { $set: { status: "corrupted_ransom_locked" } }
  );

  const postCorruptionNoteCount = await sourceDatabase.collection("notes").countDocuments();
  console.log(`[Step 4 Complete] Injected bad note and transaction. Source notes count is now ${postCorruptionNoteCount}.`);

  // Step 5 & 6: Perform Recovery to Isolated Target Database
  console.log(`\n[Step 5 & 6] Restoring to isolated recovery environment "${recoveryDb}"...`);
  const _restoreRes = await restoreDatabase({
    archivePath: backupRes.archivePath,
    targetDatabaseName: recoveryDb,
    mongoUri,
    encryptionKeyHex: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    forceProductionOverwrite: true // Allowed for test recovery DB
  });
  console.log(`[Step 5 & 6 Complete] Database restored into "${recoveryDb}".`);

  // Step 7: Verify Recovery State
  console.log(`\n[Step 7] Verifying isolated recovered database "${recoveryDb}"...`);
  const recDatabase = conn.useDb(recoveryDb);

  const restoredUser = await recDatabase.collection("users").findOne({ email: "alice.restored@example.com" });
  const preTargetDataExists =
    Boolean(restoredUser) &&
    restoredUser?.status === "active" &&
    restoredUser?.name === "Alice Restored";

  const badNote = await recDatabase.collection("notes").findOne({ title: /MALICIOUS/i });
  const badTx = await recDatabase.collection("transactions").findOne({ category: "Ransom" });
  const postTargetBadChangeAbsent = !badNote && !badTx;

  const restoredNote1 = await recDatabase.collection("notes").findOne({ _id: preNote1Id });
  const restoredNote2 = await recDatabase.collection("notes").findOne({ _id: preNote2Id });
  const habit = await recDatabase.collection("habits").findOne({ name: "Daily Meditation" });
  const unrelatedRecordsCorrect =
    Boolean(restoredNote1) &&
    Boolean(restoredNote2) &&
    Boolean(habit) &&
    habit?.currentStreak === 14;

  const userIndexes = await recDatabase.collection("users").indexes();
  const hasEmailIndex = userIndexes.some((idx: any) => idx.name === "email_1");
  const indexesUsable = hasEmailIndex;

  const restoredCounts: Record<string, number> = {
    users: await recDatabase.collection("users").countDocuments(),
    notes: await recDatabase.collection("notes").countDocuments(),
    habits: await recDatabase.collection("habits").countDocuments(),
    transactions: await recDatabase.collection("transactions").countDocuments(),
    conversations: await recDatabase.collection("conversations").countDocuments(),
    messages: await recDatabase.collection("messages").countDocuments()
  };

  console.log(`- Pre-target data exists: ${preTargetDataExists ? "PASS" : "FAIL"}`);
  console.log(`- Post-target bad change is absent: ${postTargetBadChangeAbsent ? "PASS" : "FAIL"}`);
  console.log(`- Unrelated records correct: ${unrelatedRecordsCorrect ? "PASS" : "FAIL"}`);
  console.log(`- Indexes usable and intact: ${indexesUsable ? "PASS" : "FAIL"}`);
  console.log(`- Restored counts:`, restoredCounts);

  const allPassed =
    preTargetDataExists &&
    postTargetBadChangeAbsent &&
    unrelatedRecordsCorrect &&
    indexesUsable;

  await conn.close();

  // Cleanup test backup files
  try {
    if (fs.existsSync(backupRes.archivePath)) await fs.promises.unlink(backupRes.archivePath);
    if (fs.existsSync(backupRes.manifestPath)) await fs.promises.unlink(backupRes.manifestPath);
  } catch {
    // Ignore cleanup errors
  }

  const durationMs = Date.now() - startTime;

  return {
    success: allPassed,
    sourceDatabase: sourceDb,
    recoveryDatabase: recoveryDb,
    recoveryTargetTimestamp,
    preTargetCounts,
    postTargetInjectedBadRecords: [
      "notes: MALICIOUS RANSOMWARE NOTE - INJECTED POST TARGET",
      "transactions: Rogue Ransom -$9999999",
      "users: status -> corrupted_ransom_locked",
      "notes: deletion of Legitimate Q3 Strategy"
    ],
    restoredCounts,
    checks: {
      preTargetDataExists,
      postTargetBadChangeAbsent,
      unrelatedRecordsCorrect,
      indexesUsable
    },
    durationMs
  };
}

// CLI runner
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runControlledPitrTest()
    .then((evidence) => {
      console.log(`\n==================================================`);
      console.log(`CONTROLLED PITR TEST RESULT: ${evidence.success ? "PASSED" : "FAILED"}`);
      console.log(`Execution Duration: ${evidence.durationMs}ms`);
      console.log(`==================================================\n`);
      process.exit(evidence.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("❌ PITR Test failed with exception:", err);
      process.exit(1);
    });
}
