import mongoose from 'mongoose';
import { SystemHealth } from '@lifeos/shared';
import { env } from '../../config/env.js';

export class HealthService {
  public static getSystemHealth(): SystemHealth {
    const memory = process.memoryUsage();
    
    let dbStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
    const state = mongoose.connection.readyState;
    if (state === 1) dbStatus = 'connected';
    else if (state === 2) dbStatus = 'connecting';

    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: {
        status: dbStatus,
        name: mongoose.connection.db?.databaseName || 'lifeos',
      },
      memoryUsage: {
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      },
    };
  }
}
