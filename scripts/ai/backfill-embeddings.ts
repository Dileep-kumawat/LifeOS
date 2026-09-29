import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Ensure dummy VAPID keys if running scripts standalone
if (!process.env.VAPID_PUBLIC_KEY) process.env.VAPID_PUBLIC_KEY = "placeholder-vapid-public-key";
if (!process.env.VAPID_PRIVATE_KEY) process.env.VAPID_PRIVATE_KEY = "placeholder-vapid-private-key";
if (!process.env.VAPID_SUBJECT) process.env.VAPID_SUBJECT = "mailto:admin@lifeos.example.com";

const rawMongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lifeos";
const mongoUri = rawMongoUri.includes("localhost") ? rawMongoUri.replace("localhost", "127.0.0.1") : rawMongoUri;

interface SourceConfig {
  sourceType: "habit" | "event" | "note" | "transaction" | "goal" | "budget";
  collection: string;
  filter?: Record<string, any>;
}

const SOURCES: SourceConfig[] = [
  { sourceType: "habit", collection: "habits" },
  { sourceType: "event", collection: "events", filter: { isOverride: { $ne: true } } },
  { sourceType: "note", collection: "notes" },
  { sourceType: "transaction", collection: "transactions" },
  { sourceType: "goal", collection: "goals" },
  { sourceType: "budget", collection: "budgets" }
];

async function main() {
  const args = process.argv.slice(2);
  const userArg = args.find((a) => a.startsWith("--user="))?.split("=")[1];
  const force = args.includes("--force");
  const batchSizeArg = args.find((a) => a.startsWith("--batch-size="))?.split("=")[1];
  const batchSize = batchSizeArg ? parseInt(batchSizeArg, 10) : 10;
  const delayMs = 150; // Pause between embedding calls to respect Mistral free-tier rate limits

  console.log("=================================================");
  console.log("LifeOS AI Embeddings Backfill Engine");
  console.log("=================================================");
  console.log(`Connecting to MongoDB...`);

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
  try {
    await client.connect();
    const db = client.db();
    console.log(`Connected to database: "${db.databaseName}"`);

    const { formatSourceRecordForEmbedding } = await import("../../api/src/services/ai/ragText.js");
    const { generateEmbedding } = await import("../../api/src/services/ai/embeddings.js");

    // 1. Resolve user filter
    let userFilter: Record<string, any> = {};
    if (userArg) {
      const usersCol = db.collection("users");
      let userDoc: any = null;
      if (ObjectId.isValid(userArg)) {
        userDoc = await usersCol.findOne({ _id: new ObjectId(userArg) });
      }
      if (!userDoc) {
        userDoc = await usersCol.findOne({ email: userArg });
      }
      if (!userDoc) {
        console.error(`❌ User "${userArg}" not found in database.`);
        process.exit(1);
      }
      const targetUserId = userDoc._id;
      userFilter = {
        $or: [{ userId: targetUserId }, { userId: targetUserId.toString() }]
      };
      console.log(`Targeting user: ${userDoc.email} (ID: ${targetUserId.toString()})`);
    } else {
      console.log("No specific user specified: running backfill for ALL users.");
    }

    if (force) {
      console.log("⚡ --force flag detected: existing embeddings will be re-generated.");
    }

    const embeddingsCol = db.collection("embeddings");

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    const breakdown: Record<string, { created: number; updated: number; skipped: number; errors: number }> = {};

    for (const src of SOURCES) {
      breakdown[src.sourceType] = { created: 0, updated: 0, skipped: 0, errors: 0 };
      const col = db.collection(src.collection);
      const query = { ...(src.filter || {}), ...userFilter };

      const totalCount = await col.countDocuments(query);
      console.log(`\n📂 Processing [${src.sourceType.toUpperCase()}] (${totalCount} candidate docs)...`);

      if (totalCount === 0) {
        continue;
      }

      const cursor = col.find(query);
      let batch: any[] = [];

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        batch.push(doc);

        if (batch.length >= batchSize) {
          await processBatch(batch, src.sourceType);
          batch = [];
        }
      }

      if (batch.length > 0) {
        await processBatch(batch, src.sourceType);
      }
    }

    async function processBatch(docs: any[], sourceType: SourceConfig["sourceType"]) {
      for (const doc of docs) {
        totalProcessed++;
        const sourceId = doc._id;
        const userId = doc.userId;

        try {
          const existing = await embeddingsCol.findOne({
            sourceType,
            $or: [{ sourceId: new ObjectId(sourceId.toString()) }, { sourceId: sourceId.toString() }]
          });

          if (existing && !force) {
            totalSkipped++;
            breakdown[sourceType].skipped++;
            continue;
          }

          const { title, embeddedText } = formatSourceRecordForEmbedding(sourceType, doc);
          const vector = await generateEmbedding(embeddedText);

          const result = await embeddingsCol.updateOne(
            {
              sourceType,
              sourceId: new ObjectId(sourceId.toString())
            },
            {
              $set: {
                userId: new ObjectId(userId.toString()),
                sourceType,
                sourceId: new ObjectId(sourceId.toString()),
                embeddedText,
                title,
                vector,
                updatedAt: new Date()
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            { upsert: true }
          );

          if (result.upsertedCount > 0) {
            totalCreated++;
            breakdown[sourceType].created++;
            console.log(`  ✓ Created [${sourceType}] "${title.substring(0, 40)}" (1024d)`);
          } else {
            totalUpdated++;
            breakdown[sourceType].updated++;
            console.log(`  ↻ Updated [${sourceType}] "${title.substring(0, 40)}" (1024d)`);
          }

          // Gentle delay for rate limiting
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        } catch (err: any) {
          totalErrors++;
          breakdown[sourceType].errors++;
          console.error(`  ❌ Failed to embed [${sourceType}] ID: ${sourceId}:`, err.message);
        }
      }
    }

    console.log("\n=================================================");
    console.log("🎉 Backfill Summary:");
    console.log(`  • Total Processed : ${totalProcessed}`);
    console.log(`  • Created         : ${totalCreated}`);
    console.log(`  • Updated         : ${totalUpdated}`);
    console.log(`  • Skipped (Exists): ${totalSkipped}`);
    console.log(`  • Errors          : ${totalErrors}`);
    console.log("-------------------------------------------------");
    console.log("Breakdown by collection:");
    for (const [st, counts] of Object.entries(breakdown)) {
      console.log(`  • ${st.padEnd(14)}: +${counts.created} created | ↻${counts.updated} updated | ⏭${counts.skipped} skipped | ❌${counts.errors} errors`);
    }
    console.log("=================================================");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Backfill script failed:", err);
  process.exit(1);
});
