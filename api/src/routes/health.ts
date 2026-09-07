import { Router } from "express";
import { monitorEventLoopDelay } from "node:perf_hooks";
import type { Server } from "socket.io";

export const healthRouter = Router();

let activeIo: Server | null = null;
export function setActiveIo(io: Server) {
  activeIo = io;
}

const eldHistogram = monitorEventLoopDelay({ resolution: 20 });
eldHistogram.enable();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Liveness check
 *     description: Returns ok if the API process is up.
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * @openapi
 * /health/metrics:
 *   get:
 *     tags: [System]
 *     summary: Real-time server telemetry and WebSocket connection metrics
 *     description: Returns memory usage, CPU usage, event loop lag, and active socket count.
 *     responses:
 *       200:
 *         description: System metrics
 */
healthRouter.get("/health/metrics", (_req, res) => {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const meanLagMs = eldHistogram.mean > 0 ? (eldHistogram.mean / 1e6) : 0;
  const p99LagMs = eldHistogram.percentile(99) > 0 ? (eldHistogram.percentile(99) / 1e6) : 0;
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    socketCount: activeIo?.engine?.clientsCount ?? 0,
    memory: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100
    },
    eventLoopLagMs: {
      mean: Math.round(meanLagMs * 100) / 100,
      p99: Math.round(p99LagMs * 100) / 100
    },
    cpuUsageMicroseconds: cpu
  });
});

