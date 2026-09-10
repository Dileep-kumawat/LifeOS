import { MongoClient, type IndexSpecification, type CreateIndexesOptions } from "mongodb";

export interface IndexDefinition {
  collection: string;
  keys: IndexSpecification;
  options?: CreateIndexesOptions;
  description: string;
}

export const RECOMMENDED_INDEXES: IndexDefinition[] = [
  {
    collection: "events",
    keys: { userId: 1, linkedTopicId: 1, startTime: 1 },
    options: { name: "userId_1_linkedTopicId_1_startTime_1" },
    description: "Topic detail view planned events query (studyRouter.get('/study/topics/:id'))"
  },
  {
    collection: "transactions",
    keys: { userId: 1, category: 1, type: 1, date: -1 },
    options: { name: "userId_1_category_1_type_1_date_-1" },
    description: "High-frequency recalculateBudgetSpend aggregation & category+type transaction queries"
  },
  {
    collection: "habitcheckins",
    keys: { userId: 1, habitId: 1, date: 1 },
    options: { name: "userId_1_habitId_1_date_1" },
    description: "Multi-tenant habit check-in history heatmap, stats recalculation, and cascade deletion"
  },
  {
    collection: "focussessions",
    keys: { userId: 1, linkedType: 1, linkedId: 1, startedAt: -1 },
    options: { name: "userId_1_linkedType_1_linkedId_1_startedAt_-1" },
    description: "Topic detail view recent focus sessions query & polymorphic linked session history"
  },
  {
    collection: "focussessions",
    keys: { userId: 1, status: 1, startedAt: -1 },
    options: { name: "userId_1_status_1_startedAt_-1" },
    description: "Active/paused session lookup (focusRouter.get('/focus/sessions/active')) and status-filtered lists"
  },
  {
    collection: "notes",
    keys: { userId: 1, updatedAt: -1 },
    options: { name: "userId_1_updatedAt_-1" },
    description: "Root/all-notes view without folder filter (notesRouter.get('/notes')) sorted by updatedAt"
  },
  {
    collection: "notes",
    keys: { userId: 1, tags: 1, updatedAt: -1 },
    options: { name: "userId_1_tags_1_updatedAt_-1" },
    description: "Tag-filtered notes view sorted by updatedAt"
  },
  {
    collection: "flashcards",
    keys: { userId: 1, subjectId: 1, createdAt: -1 },
    options: { name: "userId_1_subjectId_1_createdAt_-1" },
    description: "Subject-level flashcard listing (studyRouter.get('/study/flashcards?subjectId=...'))"
  },
  {
    collection: "topics",
    keys: { userId: 1, createdAt: -1 },
    options: { name: "userId_1_createdAt_-1" },
    description: "General topic list without subjectId filter (studyRouter.get('/study/topics'))"
  },
  {
    collection: "goals",
    keys: { userId: 1, createdAt: -1 },
    options: { name: "userId_1_createdAt_-1" },
    description: "General goal listing sorted by creation date (goalsRouter.get('/goals'))"
  },
  {
    collection: "goals",
    keys: { userId: 1, status: 1, createdAt: -1 },
    options: { name: "userId_1_status_1_createdAt_-1" },
    description: "Status-filtered goal listings sorted by creation date"
  },
  {
    collection: "notifications",
    keys: { userId: 1, scheduledFor: -1 },
    options: { name: "userId_1_scheduledFor_-1" },
    description: "General notifications feed sorted by scheduled time (notificationsRouter.get('/notifications'))"
  },
  {
    collection: "notifications",
    keys: { userId: 1, readStatus: 1, scheduledFor: -1 },
    options: { name: "userId_1_readStatus_1_scheduledFor_-1" },
    description: "Read/unread-filtered notification feed sorted by scheduled time"
  }
];

export async function applyIndexes(mongoUri: string): Promise<void> {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    console.log(`\n Connected to MongoDB database: "${db.databaseName}"`);
    console.log(` Applying ${RECOMMENDED_INDEXES.length} recommended compound performance indexes...\n`);

    for (const def of RECOMMENDED_INDEXES) {
      const col = db.collection(def.collection);
      const indexName = await col.createIndex(def.keys, def.options || {});
      console.log(`  ✓ [${def.collection}] ${indexName}`);
      console.log(`    ↳ Serves: ${def.description}`);
    }

    console.log(`\n Verifying all indexes via getIndexes()...\n`);
    const affectedCollections = [...new Set(RECOMMENDED_INDEXES.map((i) => i.collection))];

    for (const colName of affectedCollections) {
      const col = db.collection(colName);
      const indexes = await col.indexes();
      console.log(` Collection: "${colName}" (${indexes.length} total indexes)`);
      indexes.forEach((idx) => {
        const keysStr = JSON.stringify(idx.key);
        console.log(`   • ${idx.name}: ${keysStr}`);
      });
      console.log("");
    }

    console.log(`🎉 Index migration completed successfully and verified!\n`);
  } finally {
    await client.close();
  }
}

// CLI entrypoint
if (process.argv[1]?.endsWith("create-indexes.ts") || process.argv[1]?.endsWith("create-indexes.js")) {
  const args = process.argv.slice(2);
  const uriArg = args.find((a) => a.startsWith("--uri="))?.split("=")[1];
  const mongoUri = uriArg || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lifeos";

  applyIndexes(mongoUri)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Index migration failed:", err);
      process.exit(1);
    });
}
