import { commentRepository } from '../repositories/CommentRepository.js';
import { taskRepository } from '../repositories/TaskRepository.js';
import { ActivityService } from './ActivityService.js';
import { CreateCommentInput, UpdateCommentInput, ActivityAction } from '@lifeos/shared';
import { AppError } from '../../../core/errors/AppError.js';
import { Types } from 'mongoose';

export class CommentService {
  public static async createComment(taskId: string, userId: string, input: CreateCommentInput) {
    const task = await taskRepository.findOne({ _id: taskId, userId, isDeleted: false });
    if (!task) {
      throw AppError.notFound('Task not found');
    }

    const comment = await commentRepository.create({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      content: input.content,
    } as any);

    await ActivityService.logActivity(
      taskId,
      userId,
      ActivityAction.COMMENT_ADDED,
      undefined,
      undefined,
      input.content,
      { commentId: comment._id.toString() }
    );

    return comment;
  }

  public static async getComments(taskId: string, userId: string) {
    const task = await taskRepository.findOne({ _id: taskId, userId, isDeleted: false });
    if (!task) {
      throw AppError.notFound('Task not found');
    }
    return commentRepository.findByTask(taskId);
  }

  public static async updateComment(commentId: string, taskId: string, userId: string, input: UpdateCommentInput) {
    const comment = await commentRepository.findOne({ _id: commentId, taskId, userId, isDeleted: false });
    if (!comment) {
      throw AppError.notFound('Comment not found');
    }

    const oldContent = comment.content;
    comment.content = input.content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    await ActivityService.logActivity(
      taskId,
      userId,
      ActivityAction.COMMENT_EDITED,
      'content',
      oldContent,
      input.content,
      { commentId }
    );

    return comment;
  }

  public static async deleteComment(commentId: string, taskId: string, userId: string) {
    const success = await commentRepository.softDelete(commentId, userId);
    if (!success) {
      throw AppError.notFound('Comment not found or unauthorized');
    }

    await ActivityService.logActivity(
      taskId,
      userId,
      ActivityAction.COMMENT_DELETED,
      undefined,
      undefined,
      undefined,
      { commentId }
    );

    return true;
  }
}
