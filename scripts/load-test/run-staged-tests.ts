import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runLoadTest, type LoadTestResult } from "./ws-load-test.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_DIR = path.resolve(__dirname, "../../load-test-results");

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const stages = [100, 500, 1000, 2500, 5000, 7500, 10000];
  const allResults: LoadTestResult[] = [];

  console.log("############################################################");
  console.log("# LifeOS NFR-1.3 WebSocket Concurrency Benchmark Suite      #");
  console.log("# Progressive Stages: 100 -> 500 -> 1k -> 2.5k -> 5k -> 10k#");
  console.log("############################################################\n");

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  for (const clientCount of stages) {
    console.log(`\n>>> STARTING STAGE: ${clientCount} CONCURRENT WEBSOCKET CLIENTS <<<`);
    
    // Choose sensible ramp and duration per stage
    const rampRate = clientCount <= 1000 ? 100 : clientCount <= 5000 ? 250 : 350;
    const durationSec = clientCount <= 1000 ? 10 : clientCount <= 5000 ? 15 : 25;
    const workers = clientCount <= 500 ? 1 : clientCount <= 2500 ? 2 : 4;

    try {
      const result = await runLoadTest({
        clients: clientCount,
        rampRate,
        durationSec,
        workers,
        trafficPercentage: 1,
        targets: ["http://localhost:4000"]
      });

      allResults.push(result);

      // Write intermediate progress to results.json
      fs.writeFileSync(
        path.join(RESULTS_DIR, "results.json"),
        JSON.stringify({ stages: allResults, timestamp: new Date().toISOString() }, null, 2)
      );

      // Grace period between stages for OS TCP port reclamation and GC
      console.log(`[Cooldown] Waiting 5s for OS socket recycling and V8 garbage collection...`);
      await sleep(5000);
    } catch (err) {
      console.error(`Stage ${clientCount} failed with error:`, err);
      break;
    }
  }

  console.log("\n############################################################");
  console.log("# ALL STAGES COMPLETED. SUMMARY TABLE:                     #");
  console.log("############################################################");
  console.table(
    allResults.map((r) => ({
      Stage: r.stage,
      Established: r.establishedClients,
      Failed: r.failedConnections,
      "p50 Latency (ms)": r.latencies.p50,
      "p99 Latency (ms)": r.latencies.p99,
      "Peak RSS (MB)": r.serverMetrics.peakRssMb,
      "Post RSS (MB)": r.serverMetrics.finalRssMb,
      "p99 Loop Lag (ms)": r.serverMetrics.maxEventLoopLagMs,
      Passed: r.success ? "YES" : "NO"
    }))
  );
}

main().catch((err) => {
  console.error("Benchmark suite encountered fatal error:", err);
  process.exit(1);
});
