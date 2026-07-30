import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/TaskService.js';
import { ApiResponse } from '../../../core/response/ApiResponse.js';
import { HttpStatus, TaskStatus, TaskPriority } from '@lifeos/shared';

export class TaskController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const task = await TaskService.createTask(userId, req.body);
      ApiResponse.success(res, task, 'Task created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

      const filters: any = {};
      if (req.query.status) {
        filters.status = (req.query.status as string).split(',') as TaskStatus[];
      }
      if (req.query.priority) {
        filters.priority = (req.query.priority as string).split(',') as TaskPriority[];
      }
      if (req.query.labelIds) {
        filters.labelIds = (req.query.labelIds as string).split(',');
      }
      if (req.query.isFavorite !== undefined) {
        filters.isFavorite = req.query.isFavorite === 'true';
      }
      if (req.query.isArchived !== undefined) {
        filters.isArchived = req.query.isArchived === 'true';
      }
      if (req.query.isTrashed !== undefined) {
        filters.isTrashed = req.query.isTrashed === 'true';
      }
      if (req.query.dueDateFrom) filters.dueDateFrom = req.query.dueDateFrom as string;
      if (req.query.dueDateTo) filters.dueDateTo = req.query.dueDateTo as string;
      if (req.query.parentTaskId !== undefined) {
        filters.parentTaskId = req.query.parentTaskId === 'null' ? null : (req.query.parentTaskId as string);
      }
      if (req.query.goalId) filters.goalId = req.query.goalId as string;
      if (req.query.projectId) filters.projectId = req.query.projectId as string;
      if (req.query.search) filters.search = req.query.search as string;

      const sort: any = {
        field: req.query.sortField || 'createdAt',
        direction: req.query.sortDir || 'desc',
      };

      const result = await TaskService.listTasks(userId, { filters, sort, page, limit });
      ApiResponse.success(
        res,
        result.tasks,
        'Tasks list retrieved',
        HttpStatus.OK,
        {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        }
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.id;
      const task = await TaskService.getTask(taskId, userId);
      ApiResponse.success(res, task, 'Task details retrieved', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.id;
      const result = await TaskService.updateTask(taskId, userId, req.body);
      ApiResponse.success(res, result, 'Task updated successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.id;
      await TaskService.trashTask(taskId, userId);
      ApiResponse.success(res, null, 'Task moved to trash', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async duplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.id;
      const task = await TaskService.duplicateTask(taskId, userId);
      ApiResponse.success(res, task, 'Task duplicated successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.id;
      const task = await TaskService.archiveTask(taskId, userId);
      ApiResponse.success(res, task, 'Task archived successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.id;
      const task = await TaskService.restoreTask(taskId, userId);
      ApiResponse.success(res, task, 'Task restored successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async permanentDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.id;
      await TaskService.permanentDeleteTask(taskId, userId);
      ApiResponse.success(res, null, 'Task permanently deleted', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async bulkOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const result = await TaskService.bulkOperation(userId, req.body);
      ApiResponse.success(res, result, `Bulk operation completed on ${result.count} tasks`, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const query = req.query.q as string;
      const filters: any = {};
      if (req.query.status) filters.status = (req.query.status as string).split(',') as TaskStatus[];
      if (req.query.priority) filters.priority = (req.query.priority as string).split(',') as TaskPriority[];

      const tasks = await TaskService.searchTasks(userId, query, filters);
      ApiResponse.success(res, tasks, 'Search completed', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const stats = await TaskService.getStatistics(userId);
      ApiResponse.success(res, stats, 'Statistics retrieved successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      await TaskService.reorderTasks(userId, req.body.tasks);
      ApiResponse.success(res, null, 'Tasks reordered successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
