import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/CommentService.js';
import { ApiResponse } from '../../../core/response/ApiResponse.js';
import { HttpStatus } from '@lifeos/shared';

export class CommentController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.taskId;
      const comment = await CommentService.createComment(taskId, userId, req.body);
      ApiResponse.success(res, comment, 'Comment added successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.taskId;
      const comments = await CommentService.getComments(taskId, userId);
      ApiResponse.success(res, comments, 'Comments retrieved successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.taskId;
      const commentId = req.params.id;
      const result = await CommentService.updateComment(commentId, taskId, userId, req.body);
      ApiResponse.success(res, result, 'Comment updated successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.taskId;
      const commentId = req.params.id;
      await CommentService.deleteComment(commentId, taskId, userId);
      ApiResponse.success(res, null, 'Comment deleted successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
