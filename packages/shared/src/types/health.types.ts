export interface SystemHealth {
  status: 'ok' | 'degraded' | 'error';
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  database: {
    status: 'connected' | 'disconnected' | 'connecting';
    name?: string;
  };
  memoryUsage: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
  };
}
