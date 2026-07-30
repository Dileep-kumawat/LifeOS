import { BaseRepository } from '../../../core/repository/BaseRepository.js';
import { AttachmentModel, IAttachmentDocument } from '../models/Attachment.model.js';

export class AttachmentRepository extends BaseRepository<IAttachmentDocument> {
  constructor() {
    super(AttachmentModel);
  }

  public async findByTask(taskId: string): Promise<IAttachmentDocument[]> {
    return AttachmentModel.find({ taskId, isDeleted: false }).sort({ createdAt: -1 }).exec();
  }

  public async countByTask(taskId: string): Promise<number> {
    return AttachmentModel.countDocuments({ taskId, isDeleted: false }).exec();
  }

  public async softDelete(id: string, userId: string): Promise<boolean> {
    const result = await AttachmentModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { isDeleted: true },
    ).exec();
    return result !== null;
  }
}

export const attachmentRepository = new AttachmentRepository();
