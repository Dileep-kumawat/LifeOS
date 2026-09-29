import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment from api/.env or root .env
dotenv.config({ path: path.resolve(process.cwd(), "api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const rawMongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lifeos";
const mongoUri = rawMongoUri.includes("localhost") ? rawMongoUri.replace("localhost", "127.0.0.1") : rawMongoUri;
const vectorIndexName = process.env.MONGO_VECTOR_INDEX || "vector_index";

async function main() {
  console.log("=================================================");
  console.log("LifeOS RAG & Data Diagnostics");
  console.log("=================================================");
  console.log(`Connecting to: ${mongoUri.replace(/:([^:@]{3,})@/, ":***@")}`);

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db();
    console.log(`Connected to database: "${db.databaseName}"`);

    // 1. List users and find target user
    const usersCol = db.collection("users");
    const allUsers = await usersCol.find({}).toArray();
    console.log(`Found ${allUsers.length} total user(s) in database:`);
    for (const u of allUsers) {
      console.log(`  • ID: ${u._id.toString()} | Email: ${u.email} | Name: ${u.name ?? "N/A"} | Role: ${u.role}`);
    }

    const userArg = process.argv.slice(2).find((a) => a.startsWith("--user="))?.split("=")[1];

    let user: any = null;
    if (userArg) {
      if (ObjectId.isValid(userArg)) {
        user = await usersCol.findOne({ _id: new ObjectId(userArg) });
      }
      if (!user) {
        user = await usersCol.findOne({ email: userArg });
      }
    } else {
      // Pick the user with the most events or habits
      let maxDocs = -1;
      for (const u of allUsers) {
        const hCount = await db.collection("habits").countDocuments({ $or: [{ userId: u._id }, { userId: u._id.toString() }] });
        const eCount = await db.collection("events").countDocuments({ $or: [{ userId: u._id }, { userId: u._id.toString() }] });
        if (hCount + eCount > maxDocs) {
          maxDocs = hCount + eCount;
          user = u;
        }
      }
      if (!user) user = allUsers[0];
    }

    if (!user) {
      console.log("❌ No user found in database.");
      return;
    }

    const userId = user._id;
    const userIdStr = userId.toString();
    console.log(`\nDiagnosing for User: ${user.email ?? "Unknown"} (ID: ${userIdStr})`);
    console.log("-------------------------------------------------");

    // 2. Count docs per collection for this user
    const collections = [
      { name: "habits", col: "habits" },
      { name: "habitcheckins", col: "habitcheckins" },
      { name: "events", col: "events" },
      { name: "notes", col: "notes" },
      { name: "transactions", col: "transactions" },
      { name: "goals", col: "goals" },
      { name: "budgets", col: "budgets" },
      { name: "embeddings", col: "embeddings" }
    ];

    console.log("\n📦 Document counts for this user:");
    for (const c of collections) {
      const col = db.collection(c.col);
      const userCount = await col.countDocuments({
        $or: [{ userId }, { userId: userIdStr }]
      });
      const totalCount = await col.countDocuments({});
      console.log(`  • ${c.name.padEnd(16)}: ${userCount} user docs (Total in DB: ${totalCount})`);
    }

    // 3. Count embeddings by source type for this user
    const embeddingsCol = db.collection("embeddings");
    const sourceTypes = ["habit", "event", "note", "transaction", "goal", "budget"];
    console.log("\n🧠 Embeddings by source type for this user:");
    for (const st of sourceTypes) {
      const count = await embeddingsCol.countDocuments({
        $or: [{ userId }, { userId: userIdStr }],
        sourceType: st
      });
      console.log(`  • ${st.padEnd(16)}: ${count} embeddings`);
    }

    // 4. Sample embedding inspection
    const sampleEmbedding = await embeddingsCol.findOne({
      $or: [{ userId }, { userId: userIdStr }]
    });

    if (sampleEmbedding) {
      const vec = sampleEmbedding.vector;
      console.log(`\n🔍 Sample Embedding:`);
      console.log(`  • Source Type: ${sampleEmbedding.sourceType}`);
      console.log(`  • Source ID:   ${sampleEmbedding.sourceId}`);
      console.log(`  • Title:       "${sampleEmbedding.title}"`);
      console.log(`  • Vector Length: ${Array.isArray(vec) ? vec.length : "NOT AN ARRAY"}`);
      if (Array.isArray(vec) && vec.length > 0) {
        const norm = Math.sqrt(vec.reduce((sum: number, v: number) => sum + v * v, 0));
        console.log(`  • Vector L2 Norm: ${norm.toFixed(4)} (Expected: ~1.0000)`);
        console.log(`  • First 3 dims: [${vec.slice(0, 3).map((v: number) => v.toFixed(4)).join(", ")}]`);
      }
    } else {
      console.log("\n❌ No embeddings found for this user in 'embeddings' collection!");
    }

    // 5. Atlas Vector Search Indexes Check
    console.log("\n🔎 Atlas Search / Vector Search Index Check:");
    try {
      if (typeof (embeddingsCol as any).listSearchIndexes === "function") {
        const cursor = (embeddingsCol as any).listSearchIndexes();
        const indexes = await cursor.toArray();
        console.log(`  Found ${indexes.length} search/vector index(es) on 'embeddings':`);
        for (const idx of indexes) {
          console.log(`    - Name: "${idx.name}", Status: ${idx.status || idx.queryable ? "queryable" : "building/unknown"}`);
          console.log(`      Definition:`, JSON.stringify(idx.latestDefinition ?? idx.definition ?? idx, null, 2));
        }

        const hasTargetIndex = indexes.some((idx: any) => idx.name === vectorIndexName);
        if (!hasTargetIndex) {
          console.log(`  ⚠️ Configured MONGO_VECTOR_INDEX ("${vectorIndexName}") is NOT found in search indexes!`);
        }
      } else {
        console.log("  ⚠️ listSearchIndexes is not a function on this MongoClient / MongoDB driver.");
      }
    } catch (err: any) {
      console.log(`  ⚠️ listSearchIndexes error (likely local standalone/Docker MongoDB without Atlas Search): ${err.message}`);
    }

    // 6. Sample vector query test
    console.log("\n🎯 Sample Vector Query Test:");
    console.log("  Query: 'What habits should I focus on completing before the day ends based on my current schedule?'");
    try {
      const { generateEmbedding } = await import("../api/src/services/ai/embeddings.js");
      const queryWithTimeout = Promise.race([
        generateEmbedding("What habits should I focus on completing before the day ends based on my current schedule?"),
        new Promise<number[]>((_, reject) => setTimeout(() => reject(new Error("generateEmbedding timed out after 5000ms")), 5000))
      ]);
      const queryVec = await queryWithTimeout;
      console.log(`  Generated query vector with ${queryVec.length} dimensions.`);

      // Test Atlas $vectorSearch if available
      try {
        const pipeline = [
          {
            $vectorSearch: {
              index: vectorIndexName,
              path: "vector",
              queryVector: queryVec,
              numCandidates: 20,
              limit: 5,
              filter: { userId }
            }
          },
          {
            $project: {
              _id: 1,
              sourceType: 1,
              title: 1,
              score: { $meta: "vectorSearchScore" }
            }
          }
        ];
        const res = await embeddingsCol.aggregate(pipeline).toArray();
        console.log(`  Atlas $vectorSearch result count: ${res.length}`);
        for (const r of res) {
          console.log(`    - [${r.sourceType}] ${r.title} (score: ${r.score})`);
        }
      } catch (atlasErr: any) {
        console.log(`  Atlas $vectorSearch query failed (expected on local MongoDB): ${atlasErr.message}`);
      }

      // Test local fallback cosine similarity
      const userEmbeddings = await embeddingsCol.find({
        $or: [{ userId }, { userId: userIdStr }]
      }).toArray();

      if (userEmbeddings.length > 0) {
        const { cosineSimilarity } = await import("../api/src/services/ai/retriever.js");
        const scored = userEmbeddings.map((doc: any) => ({
          sourceType: doc.sourceType,
          title: doc.title,
          score: cosineSimilarity(queryVec, doc.vector)
        })).sort((a: any, b: any) => b.score - a.score);

        console.log(`  Local cosine similarity results (top 5 of ${userEmbeddings.length} docs):`);
        for (const r of scored.slice(0, 5)) {
          console.log(`    - [${r.sourceType}] ${r.title} (score: ${r.score.toFixed(4)})`);
        }
      } else {
        console.log("  Local fallback cannot run because user has 0 embeddings.");
      }
    } catch (embErr: any) {
      console.log(`  Error running sample vector query: ${embErr.message}`);
    }

    console.log("\n=================================================");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Diagnostic script failed:", err);
  process.exit(1);
});
