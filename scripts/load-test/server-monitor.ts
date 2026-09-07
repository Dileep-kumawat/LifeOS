import { Redis } from "ioredis";

export interface ServerMetricSample {
  timestamp: string;
  socketCount: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  eventLoopLagMs: {
    mean: number;
    p99: number;
  };
  redis?: {
    connectedClients: number;
    usedMemoryMb: number;
  };
}

export class ServerMonitor {
  private targetUrl: string;
  private redisUrl: string;
  private redisClient: Redis | null = null;
  private samples: ServerMetricSample[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(targetUrl: string = "http://localhost:4000", redisUrl: string = "redis://localhost:6379") {
    this.targetUrl = targetUrl;
    this.redisUrl = redisUrl;
  }

  async initRedis(): Promise<void> {
    try {
      this.redisClient = new Redis(this.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await this.redisClient.connect();
    } catch {
      this.redisClient = null;
    }
  }

  async sampleOnce(): Promise<ServerMetricSample | null> {
    try {
      const res = await fetch(`${this.targetUrl}/api/v1/health/metrics`);
      if (!res.ok) return null;
      const data = await res.json();

      let redisInfo: { connectedClients: number; usedMemoryMb: number } | undefined;
      if (this.redisClient && this.redisClient.status === "ready") {
        try {
          const rawClients = await this.redisClient.info("clients");
          const rawMemory = await this.redisClient.info("memory");
          const clientMatch = rawClients.match(/connected_clients:(\d+)/);
          const memMatch = rawMemory.match(/used_memory:(\d+)/);
          redisInfo = {
            connectedClients: clientMatch ? parseInt(clientMatch[1], 10) : 0,
            usedMemoryMb: memMatch ? Math.round((parseInt(memMatch[1], 10) / 1024 / 1024) * 100) / 100 : 0
          };
        } catch {
          // ignore redis info errors during fast sampling
        }
      }

      const sample: ServerMetricSample = {
        timestamp: new Date().toISOString(),
        socketCount: data.socketCount ?? 0,
        memory: {
          rssMb: data.memory?.rssMb ?? 0,
          heapUsedMb: data.memory?.heapUsedMb ?? 0,
          heapTotalMb: data.memory?.heapTotalMb ?? 0
        },
        eventLoopLagMs: {
          mean: data.eventLoopLagMs?.mean ?? 0,
          p99: data.eventLoopLagMs?.p99 ?? 0
        },
        redis: redisInfo
      };

      this.samples.push(sample);
      return sample;
    } catch {
      return null;
    }
  }

  start(intervalMs: number = 1000): void {
    this.samples = [];
    this.timer = setInterval(async () => {
      await this.sampleOnce();
    }, intervalMs);
  }

  stop(): ServerMetricSample[] {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.redisClient) {
      this.redisClient.disconnect();
      this.redisClient = null;
    }
    return this.samples;
  }

  getSummary() {
    if (this.samples.length === 0) {
      return {
        baselineRssMb: 0,
        peakRssMb: 0,
        peakHeapUsedMb: 0,
        maxSocketCount: 0,
        maxEventLoopLagMs: 0,
        finalRssMb: 0,
        samplesCount: 0
      };
    }

    const baseline = this.samples[0];
    const final = this.samples[this.samples.length - 1];

    let peakRss = 0;
    let peakHeap = 0;
    let maxSockets = 0;
    let maxLag = 0;

    for (const s of this.samples) {
      if (s.memory.rssMb > peakRss) peakRss = s.memory.rssMb;
      if (s.memory.heapUsedMb > peakHeap) peakHeap = s.memory.heapUsedMb;
      if (s.socketCount > maxSockets) maxSockets = s.socketCount;
      if (s.eventLoopLagMs.p99 > maxLag) maxLag = s.eventLoopLagMs.p99;
    }

    return {
      baselineRssMb: baseline.memory.rssMb,
      peakRssMb: peakRss,
      peakHeapUsedMb: peakHeap,
      finalRssMb: final.memory.rssMb,
      finalHeapUsedMb: final.memory.heapUsedMb,
      finalSocketCount: final.socketCount,
      maxSocketCount: maxSockets,
      maxEventLoopLagMs: maxLag,
      samplesCount: this.samples.length
    };
  }
}
