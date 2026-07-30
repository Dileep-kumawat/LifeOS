import { BaseRepository } from '../../../core/repository/BaseRepository.js';
import { CommentModel, ICommentDocument } from '../models/Comment.model.js';

export class CommentRepository extends BaseRepository<ICommentDocument> {
  constructor() {
    super(CommentModel);
  }

  public async findByTask(taskId: string): Promise<ICommentDocument[]> {
    return CommentModel.find({ taskId, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findByIdForTask(commentId: string, taskId: string): Promise<ICommentDocument | null> {
    return CommentModel.findOne({ _id: commentId, taskId, isDeleted: false }).exec();
  }

  public async softDelete(id: string, userId: string): Promise<boolean> {
    const result = await CommentModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
    ).exec();
    return result !== null;
  }

  public async countByTask(taskId: string): Promise<number> {
    return CommentModel.countDocuments({ taskId, isDeleted: false }).exec();
  }
}

export const commentRepository = new CommentRepository();
