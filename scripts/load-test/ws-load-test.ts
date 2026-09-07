import "./load-env.js";
import path from "path";
import { fileURLToPath } from "url";
import { fork, type ChildProcess } from "child_process";
import fs from "fs";
import { setupTestUsers, closeTestDb } from "./test-users.js";
import { ServerMonitor } from "./server-monitor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LoadTestOptions {
  targets?: string[];
  clients?: number;
  rampRate?: number;
  durationSec?: number;
  workers?: number;
  trafficPercentage?: number;
  outputPath?: string;
}

export interface LoadTestResult {
  stage: string;
  targetClients: number;
  establishedClients: number;
  failedConnections: number;
  disconnectRate: number;
  errorCount: number;
  rampRate: number;
  durationSec: number;
  latencies: {
    min: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  serverMetrics: {
    baselineRssMb: number;
    peakRssMb: number;
    peakHeapUsedMb: number;
    finalRssMb: number;
    finalHeapUsedMb: number;
    maxSocketCount: number;
    maxEventLoopLagMs: number;
  };
  success: boolean;
}

function calculatePercentiles(latencies: number[]) {
  if (latencies.length === 0) {
    return { min: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (pct: number) => sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))];
  return {
    min: sorted[0],
    p50: p(50),
    p95: p(95),
    p99: p(99),
    max: sorted[sorted.length - 1]
  };
}

export async function runLoadTest(options: LoadTestOptions = {}): Promise<LoadTestResult> {
  const targets = options.targets && options.targets.length > 0 ? options.targets : ["http://localhost:4000"];
  const totalClients = options.clients ?? 1000;
  const rampRate = options.rampRate ?? 200;
  const durationSec = options.durationSec ?? 20;
  const workerCount = options.workers ?? (totalClients >= 5000 ? 5 : totalClients >= 1000 ? 2 : 1);
  const trafficPercentage = options.trafficPercentage ?? 1;

  console.log(`\n============================================================`);
  console.log(`[WS-LOAD-TEST] Stage: ${totalClients} Concurrent Connections`);
  console.log(`Targets:     ${targets.join(", ")}`);
  console.log(`Workers:     ${workerCount}`);
  console.log(`Ramp Rate:   ${rampRate} conn/sec`);
  console.log(`Duration:    ${durationSec}s sustained`);
  console.log(`Traffic:     ${trafficPercentage}% active heartbeat`);
  console.log(`============================================================\n`);

  // 1. Prepare test users and JWTs
  const usersPoolSize = Math.min(100, Math.max(10, Math.ceil(totalClients / 100)));
  console.log(`[1/5] Ensuring ${usersPoolSize} test user credentials in database...`);
  const testUsers = await setupTestUsers(usersPoolSize);
  const userTokens = testUsers.map((u) => u.token);

  // 2. Start server monitor
  console.log(`[2/5] Starting server telemetry monitor on ${targets[0]}...`);
  const monitor = new ServerMonitor(targets[0]);
  await monitor.initRedis();
  await monitor.sampleOnce();
  monitor.start(1000);

  // 3. Spawn workers
  console.log(`[3/5] Spawning ${workerCount} load generator workers...`);
  const workerScript = path.resolve(__dirname, "ws-worker.ts");
  const connsPerWorker = Math.floor(totalClients / workerCount);
  const remainder = totalClients % workerCount;
  const rampPerWorker = Math.max(10, Math.floor(rampRate / workerCount));

  const workers: ChildProcess[] = [];
  const workerStats: any[] = [];
  const liveCounts: { connected: number; failed: number; disconnected: number; errors: number }[] = [];

  const workerPromises = Array.from({ length: workerCount }, (_, idx) => {
    return new Promise<void>((resolve) => {
      const assignedCount = connsPerWorker + (idx === 0 ? remainder : 0);
      liveCounts[idx] = { connected: 0, failed: 0, disconnected: 0, errors: 0 };

      const worker = fork(workerScript, [], {
        execArgv: ["--loader", "tsx"]
      });

      worker.on("message", (msg: any) => {
        if (msg.type === "progress") {
          liveCounts[idx] = {
            connected: msg.connected,
            failed: msg.failed,
            disconnected: msg.disconnected,
            errors: msg.errors
          };
        } else if (msg.type === "complete") {
          workerStats.push(msg.stats);
          resolve();
        }
      });

      worker.on("error", (err) => {
        console.error(`Worker ${idx} error:`, err);
        resolve();
      });

      worker.on("exit", () => {
        resolve();
      });

      workers.push(worker);

      // Start worker
      worker.send({
        action: "start",
        config: {
          workerId: idx,
          targetUrls: targets,
          count: assignedCount,
          rampRate: rampPerWorker,
          durationSec,
          userTokens,
          trafficPercentage
        }
      });
    });
  });

  // Print progress ticker
  const ticker = setInterval(() => {
    const totalConn = liveCounts.reduce((acc, c) => acc + (c?.connected || 0), 0);
    const totalFail = liveCounts.reduce((acc, c) => acc + (c?.failed || 0), 0);
    const totalDisc = liveCounts.reduce((acc, c) => acc + (c?.disconnected || 0), 0);
    const totalErr = liveCounts.reduce((acc, c) => acc + (c?.errors || 0), 0);
    process.stdout.write(
      `\r--> Active Sockets: ${totalConn}/${totalClients} | Failed: ${totalFail} | Disconnects: ${totalDisc} | Errors: ${totalErr}   `
    );
  }, 500);

  // 4. Await test completion
  console.log(`[4/5] Running load test and holding connections...`);
  await Promise.all(workerPromises);
  clearInterval(ticker);
  console.log("\n");

  // Stop monitor
  monitor.stop();
  const summary = monitor.getSummary();

  // Close MongoDB client in test-users runner
  await closeTestDb();

  // 5. Aggregate metrics
  console.log(`[5/5] Compiling test metrics and telemetry summary...`);
  let totalConnected = 0;
  let totalFailed = 0;
  let totalDisconnected = 0;
  let totalErrors = 0;
  let allLatencies: number[] = [];

  for (const s of workerStats) {
    totalConnected += s.connected || 0;
    totalFailed += s.failed || 0;
    totalDisconnected += s.disconnected || 0;
    totalErrors += s.errors || 0;
    if (s.latencies) allLatencies = allLatencies.concat(s.latencies);
  }

  const latencies = calculatePercentiles(allLatencies);
  const disconnectRate = totalConnected > 0 ? Math.round((totalDisconnected / (totalConnected + totalDisconnected)) * 10000) / 100 : 0;
  const success = totalConnected >= totalClients * 0.95 && totalFailed === 0;

  const result: LoadTestResult = {
    stage: `${totalClients}`,
    targetClients: totalClients,
    establishedClients: totalConnected,
    failedConnections: totalFailed,
    disconnectRate,
    errorCount: totalErrors,
    rampRate,
    durationSec,
    latencies,
    serverMetrics: {
      baselineRssMb: summary.baselineRssMb,
      peakRssMb: summary.peakRssMb,
      peakHeapUsedMb: summary.peakHeapUsedMb,
      finalRssMb: summary.finalRssMb,
      finalHeapUsedMb: summary.finalHeapUsedMb,
      maxSocketCount: summary.maxSocketCount,
      maxEventLoopLagMs: summary.maxEventLoopLagMs
    },
    success
  };

  console.log(`\n================== STAGE RESULT ==================`);
  console.log(`Target Connections:      ${totalClients}`);
  console.log(`Established Connections: ${totalConnected}`);
  console.log(`Failed Connections:      ${totalFailed}`);
  console.log(`Disconnect Rate:         ${disconnectRate}%`);
  console.log(`Latency min/p50/p95/p99: ${latencies.min}ms / ${latencies.p50}ms / ${latencies.p95}ms / ${latencies.p99}ms`);
  console.log(`Peak Server RSS:         ${summary.peakRssMb} MB`);
  console.log(`Peak Server Heap Used:   ${summary.peakHeapUsedMb} MB`);
  console.log(`Post-Test Server RSS:    ${summary.finalRssMb} MB`);
  console.log(`Peak Event Loop Lag p99: ${summary.maxEventLoopLagMs} ms`);
  console.log(`Status:                  ${success ? "PASS" : "FAIL"}`);
  console.log(`==================================================\n`);

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, JSON.stringify(result, null, 2), "utf-8");
  }

  return result;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith("ws-load-test.ts")) {
  const args = process.argv.slice(2);
  const clientsArg = args.find((a) => a.startsWith("--clients="));
  const rampArg = args.find((a) => a.startsWith("--ramp="));
  const durationArg = args.find((a) => a.startsWith("--duration="));
  const targetArg = args.find((a) => a.startsWith("--target="));

  runLoadTest({
    clients: clientsArg ? parseInt(clientsArg.split("=")[1], 10) : 100,
    rampRate: rampArg ? parseInt(rampArg.split("=")[1], 10) : 100,
    durationSec: durationArg ? parseInt(durationArg.split("=")[1], 10) : 10,
    targets: targetArg ? targetArg.split("=")[1].split(",") : ["http://localhost:4000"]
  }).catch((err) => {
    console.error("Load test runner fatal error:", err);
    process.exit(1);
  });
}
