import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import path from "path";

export interface VerificationReport {
  success: boolean;
  targetDatabase: string;
  checks: {
    mongooseConnection: boolean;
    authenticationVerification: boolean;
    notesModelQuery: boolean;
    habitsModelQuery: boolean;
    analyticsAggregation: boolean;
    aiConversationsReadable: boolean;
    indexesExist: boolean;
    noCorruptionDetected: boolean;
  };
  details: {
    authenticatedUserId?: string;
    verifiedCollectionsCount: number;
    aggregatedTotalSpend?: number;
    conversationMessageCount?: number;
    verifiedIndexes: string[];
  };
  durationMs: number;
}

export async function verifyRestoredDatabase(options: {
  mongoUri?: string;
  databaseName?: string;
} = {}): Promise<VerificationReport> {
  const startTime = Date.now();
  const mongoUri = options.mongoUri || process.env.MONGO_URI || "mongodb://localhost:27017/lifeos";
  const databaseName = options.databaseName || "lifeos_pitr_recovery";

  console.log(`\n==================================================`);
  console.log(`VERIFYING RESTORED DATABASE APPLICATION COMPATIBILITY`);
  console.log(`- Target Database: ${databaseName}`);
  console.log(`==================================================\n`);

  const conn = await mongoose.createConnection(`${mongoUri.replace(/\/([^/?]+)(\?|$)/, `/${databaseName}$2`)}`).asPromise();
  const db = conn.useDb(databaseName);

  // 1. Connection check
  const pingRes = await db.db!.admin().ping();
  const mongooseConnection = pingRes.ok === 1;
  console.log(`1. Mongoose Connection: ${mongooseConnection ? "OK" : "FAILED"}`);

  // 2. Authentication check
  const user = await db.collection("users").findOne({ email: "alice.restored@example.com" });
  let authenticationVerification = false;
  if (user && user.passwordHash) {
    const isPasswordValid = await bcrypt.compare("SafePassword123!", user.passwordHash);
    authenticationVerification = isPasswordValid && user.status === "active";
  }
  console.log(`2. Authentication against restored data: ${authenticationVerification ? "OK" : "FAILED"}`);

  // 3. Notes Model & Query check
  const notes = await db.collection("notes").find({ userId: user?._id }).toArray();
  const notesModelQuery = notes.length >= 2 && notes.some((n: any) => n.title === "Pre-Incident Architecture Note");
  console.log(`3. Notes query & integrity: ${notesModelQuery ? "OK" : "FAILED"} (${notes.length} notes)`);

  // 4. Habits Model check
  const habits = await db.collection("habits").find({ userId: user?._id }).toArray();
  const habitsModelQuery = habits.length >= 1 && habits[0].currentStreak === 14;
  console.log(`4. Habits query & streak state: ${habitsModelQuery ? "OK" : "FAILED"}`);

  // 5. Analytics Aggregation Pipeline check
  const aggregationResult = await db.collection("transactions").aggregate([
    { $match: { userId: user?._id, type: "expense" } },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  const totalSpend = aggregationResult.reduce((sum, item) => sum + item.totalAmount, 0);
  const analyticsAggregation = aggregationResult.length > 0 && totalSpend > 0;
  console.log(`5. Analytics aggregation pipeline: ${analyticsAggregation ? "OK" : "FAILED"} (Spend: $${totalSpend.toFixed(2)})`);

  // 6. AI Conversations & Message History check
  const conv = await db.collection("conversations").findOne({ userId: user?._id });
  const messages = conv
    ? await db.collection("messages").find({ conversationId: conv._id }).toArray()
    : [];
  const aiConversationsReadable =
    Boolean(conv) &&
    messages.length > 0 &&
    messages[0].role === "assistant" &&
    messages[0].content.includes("PITR");
  console.log(`6. AI Conversation history readable: ${aiConversationsReadable ? "OK" : "FAILED"} (${messages.length} messages)`);

  // 7. Indexes exist & are usable
  const collections = await db.db!.listCollections().toArray();
  const verifiedIndexes: string[] = [];
  let indexesExist = true;

  for (const col of collections) {
    if (col.name.startsWith("system.")) continue;
    const idxs = await db.collection(col.name).indexes();
    idxs.forEach((idx: any) => verifiedIndexes.push(`${col.name}.${idx.name}`));
  }
  indexesExist = verifiedIndexes.length >= collections.length;
  console.log(`7. Indexes validated across collections: ${indexesExist ? "OK" : "FAILED"} (${verifiedIndexes.length} indexes)`);

  // 8. Corruption check
  const corruptRecord = await db.collection("notes").findOne({ title: /MALICIOUS/i });
  const noCorruptionDetected = !corruptRecord;
  console.log(`8. Database corruption check: ${noCorruptionDetected ? "CLEAN" : "CORRUPT"}`);

  const allPassed =
    mongooseConnection &&
    authenticationVerification &&
    notesModelQuery &&
    habitsModelQuery &&
    analyticsAggregation &&
    aiConversationsReadable &&
    indexesExist &&
    noCorruptionDetected;

  await conn.close();

  const durationMs = Date.now() - startTime;

  return {
    success: allPassed,
    targetDatabase: databaseName,
    checks: {
      mongooseConnection,
      authenticationVerification,
      notesModelQuery,
      habitsModelQuery,
      analyticsAggregation,
      aiConversationsReadable,
      indexesExist,
      noCorruptionDetected
    },
    details: {
      authenticatedUserId: user?._id?.toString(),
      verifiedCollectionsCount: collections.length,
      aggregatedTotalSpend: totalSpend,
      conversationMessageCount: messages.length,
      verifiedIndexes
    },
    durationMs
  };
}

// CLI runner
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const targetDb = process.argv.slice(2).find((a) => a.startsWith("--db="))?.split("=")[1];
  verifyRestoredDatabase({ databaseName: targetDb })
    .then((report) => {
      console.log(`\n==================================================`);
      console.log(`RESTORE VERIFICATION REPORT: ${report.success ? "PASSED" : "FAILED"}`);
      console.log(`Duration: ${report.durationMs}ms`);
      console.log(`==================================================\n`);
      process.exit(report.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("❌ Restore verification failed:", err);
      process.exit(1);
    });
}
