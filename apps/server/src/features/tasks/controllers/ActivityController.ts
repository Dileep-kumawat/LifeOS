import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/ActivityService.js';
import { ApiResponse } from '../../../core/response/ApiResponse.js';
import { HttpStatus } from '@lifeos/shared';

export class ActivityController {
  public static async getTaskActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = req.params.taskId;
      const logs = await ActivityService.getTaskActivity(taskId);
      ApiResponse.success(res, logs, 'Task activity log retrieved', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getUserActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const logs = await ActivityService.getUserActivity(userId, page, limit);
      ApiResponse.success(res, logs, 'User activity log retrieved', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
