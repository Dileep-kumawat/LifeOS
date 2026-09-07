import { io, type Socket } from "socket.io-client";

interface WorkerConfig {
  workerId: number;
  targetUrls: string[];
  count: number;
  rampRate: number; // conn/sec
  durationSec: number;
  userTokens: string[];
  trafficPercentage?: number;
}

interface WorkerStats {
  connected: number;
  failed: number;
  disconnected: number;
  errors: number;
  latencies: number[];
  roundTripTimes: number[];
}

const sockets: Socket[] = [];
const stats: WorkerStats = {
  connected: 0,
  failed: 0,
  disconnected: 0,
  errors: 0,
  latencies: [],
  roundTripTimes: []
};

let trafficInterval: NodeJS.Timeout | null = null;
let isStopping = false;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on("message", async (msg: { action: string; config?: WorkerConfig }) => {
  if (msg.action === "start" && msg.config) {
    await runWorker(msg.config);
  } else if (msg.action === "stop") {
    await stopWorker();
  }
});

async function runWorker(config: WorkerConfig) {
  const { targetUrls, count, rampRate, durationSec, userTokens, trafficPercentage = 1 } = config;
  const delayBetweenConns = Math.max(1, Math.floor(1000 / Math.max(1, rampRate)));

  // Report progress every 500ms
  const progressTimer = setInterval(() => {
    if (process.send) {
      process.send({
        type: "progress",
        workerId: config.workerId,
        connected: stats.connected,
        failed: stats.failed,
        disconnected: stats.disconnected,
        errors: stats.errors
      });
    }
  }, 500);

  // Connect sockets with controlled ramp
  for (let i = 0; i < count; i++) {
    if (isStopping) break;

    const targetUrl = targetUrls[i % targetUrls.length];
    const token = userTokens[i % userTokens.length];
    const startTime = Date.now();

    try {
      const socket = io(targetUrl, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
        auth: { token },
        timeout: 15000
      });

      socket.on("connect", () => {
        const latency = Date.now() - startTime;
        stats.connected++;
        stats.latencies.push(latency);
      });

      socket.on("connect_error", () => {
        stats.failed++;
        stats.errors++;
      });

      socket.on("disconnect", () => {
        if (!isStopping) {
          stats.disconnected++;
          stats.connected = Math.max(0, stats.connected - 1);
        }
      });

      socket.on("error", () => {
        stats.errors++;
      });

      // Listen for broadcasts or chat errors
      socket.on("chat_error", () => {
        // expected if rate limit test triggered
      });

      sockets.push(socket);
    } catch {
      stats.failed++;
    }

    if (delayBetweenConns > 0) {
      await sleep(delayBetweenConns);
    }
  }

  // Realistic low-volume traffic generation during sustained hold
  const activeChatCount = Math.max(1, Math.floor((sockets.length * trafficPercentage) / 100));
  trafficInterval = setInterval(() => {
    if (isStopping || sockets.length === 0) return;
    for (let i = 0; i < activeChatCount; i++) {
      const idx = Math.floor(Math.random() * sockets.length);
      const s = sockets[idx];
      if (s && s.connected) {
        const pingTime = Date.now();
        // Emit ping or low-overhead presence event
        s.emit("client_heartbeat", { sentAt: pingTime });
      }
    }
  }, 5000);

  // Hold for the sustained duration
  const holdStart = Date.now();
  while (Date.now() - holdStart < durationSec * 1000 && !isStopping) {
    await sleep(500);
  }

  clearInterval(progressTimer);
  if (trafficInterval) clearInterval(trafficInterval);

  if (!isStopping) {
    await stopWorker();
  }
}

async function stopWorker() {
  isStopping = true;
  if (trafficInterval) clearInterval(trafficInterval);

  // Cleanly disconnect all sockets
  for (const s of sockets) {
    try {
      s.disconnect();
    } catch {
      // ignore
    }
  }

  // Wait for TCP close
  await sleep(1000);

  if (process.send) {
    process.send({
      type: "complete",
      stats: {
        connected: stats.connected,
        failed: stats.failed,
        disconnected: stats.disconnected,
        errors: stats.errors,
        latencies: stats.latencies,
        roundTripTimes: stats.roundTripTimes
      }
    });
  }
}
