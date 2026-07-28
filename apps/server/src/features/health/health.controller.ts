import { Request, Response } from 'express';
import { ApiResponse } from '../../core/response/ApiResponse.js';
import { HealthService } from './health.service.js';

export class HealthController {
  public static getHealth = (_req: Request, res: Response): Response => {
    const health = HealthService.getSystemHealth();
    return ApiResponse.success(res, health, 'System health retrieved successfully');
  };
}
