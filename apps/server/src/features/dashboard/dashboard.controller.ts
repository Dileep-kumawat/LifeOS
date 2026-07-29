import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';
import { ApiResponse } from '../../core/response/ApiResponse.js';
import { HttpStatus, PaginationMeta } from '@lifeos/shared';

export class DashboardController {
  private static getPaginationMeta(total: number, page: number, limit: number, totalPages: number): PaginationMeta {
    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const timezoneOffset = req.query.timezoneOffset
        ? parseInt(req.query.timezoneOffset as string, 10)
        : 0;

      const summary = await dashboardService.getTodaySummary(userId, timezoneOffset);
      ApiResponse.success(res, summary, "Today's summary retrieved successfully", HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const timezoneOffset = req.query.timezoneOffset
        ? parseInt(req.query.timezoneOffset as string, 10)
        : 0;

      const stats = await dashboardService.getStatistics(userId, timezoneOffset);
      ApiResponse.success(res, stats, 'Productivity statistics retrieved successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;

      const result = await dashboardService.getTasks(userId, { status, priority }, page, limit);
      const meta = DashboardController.getPaginationMeta(result.total, result.page, result.limit, result.totalPages);

      ApiResponse.success(res, result.data, 'Upcoming tasks retrieved successfully', HttpStatus.OK, meta);
    } catch (error) {
      next(error);
    }
  }

  public static async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const start = req.query.start as string | undefined;
      const end = req.query.end as string | undefined;

      const result = await dashboardService.getEvents(userId, { start, end }, page, limit);
      const meta = DashboardController.getPaginationMeta(result.total, result.page, result.limit, result.totalPages);

      ApiResponse.success(res, result.data, 'Upcoming events retrieved successfully', HttpStatus.OK, meta);
    } catch (error) {
      next(error);
    }
  }

  public static async getHabits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await dashboardService.getHabits(userId, page, limit);
      const meta = DashboardController.getPaginationMeta(result.total, result.page, result.limit, result.totalPages);

      ApiResponse.success(res, result.data, 'Daily habits retrieved successfully', HttpStatus.OK, meta);
    } catch (error) {
      next(error);
    }
  }

  public static async getNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const folder = req.query.folder as string | undefined;
      const isPinnedStr = req.query.isPinned as string | undefined;
      const isPinned = isPinnedStr !== undefined ? isPinnedStr === 'true' : undefined;

      const result = await dashboardService.getNotes(userId, { isPinned, folder }, page, limit);
      const meta = DashboardController.getPaginationMeta(result.total, result.page, result.limit, result.totalPages);

      ApiResponse.success(res, result.data, 'Recent notes retrieved successfully', HttpStatus.OK, meta);
    } catch (error) {
      next(error);
    }
  }

  public static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const isReadStr = req.query.isRead as string | undefined;
      const isRead = isReadStr !== undefined ? isReadStr === 'true' : undefined;

      const result = await dashboardService.getNotifications(userId, { isRead }, page, limit);
      const meta = DashboardController.getPaginationMeta(result.total, result.page, result.limit, result.totalPages);

      ApiResponse.success(res, result.data, 'Dashboard notifications retrieved successfully', HttpStatus.OK, meta);
    } catch (error) {
      next(error);
    }
  }

  public static async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const action = req.query.action as string | undefined;

      const result = await dashboardService.getActivityLogs(userId, { action }, page, limit);
      const meta = DashboardController.getPaginationMeta(result.total, result.page, result.limit, result.totalPages);

      ApiResponse.success(res, result.data, 'Recent activity timeline retrieved successfully', HttpStatus.OK, meta);
    } catch (error) {
      next(error);
    }
  }

  public static async getFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await dashboardService.getFavorites(userId, page, limit);
      const meta = DashboardController.getPaginationMeta(result.total, result.page, result.limit, result.totalPages);

      ApiResponse.success(res, result.data, 'Favorite shortcuts retrieved successfully', HttpStatus.OK, meta);
    } catch (error) {
      next(error);
    }
  }

  public static async markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const id = req.params.id;

      const notification = await dashboardService.markNotificationRead(userId, id);
      ApiResponse.success(res, notification, 'Notification marked as read successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
