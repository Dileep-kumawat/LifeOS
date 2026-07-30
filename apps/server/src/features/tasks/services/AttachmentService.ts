import { attachmentRepository } from '../repositories/AttachmentRepository.js';
import { taskRepository } from '../repositories/TaskRepository.js';
import { ActivityService } from './ActivityService.js';
import { ActivityAction } from '@lifeos/shared';
import { AppError } from '../../../core/errors/AppError.js';
import { Types } from 'mongoose';

export interface FileUploadInput {
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  storageKey: string;
}

export class AttachmentService {
  public static async createAttachment(
    taskId: string,
    userId: string,
    file: FileUploadInput
  ) {
    const task = await taskRepository.findOne({ _id: taskId, userId, isDeleted: false });
    if (!task) {
      throw AppError.notFound('Task not found');
    }

    const attachment = await attachmentRepository.create({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      url: file.url,
      storageKey: file.storageKey,
    } as any);

    await ActivityService.logActivity(
      taskId,
      userId,
      ActivityAction.ATTACHMENT_UPLOADED,
      'attachments',
      undefined,
      file.fileName,
      { attachmentId: attachment._id.toString() }
    );

    return attachment;
  }

  public static async getAttachments(taskId: string, userId: string) {
    const task = await taskRepository.findOne({ _id: taskId, userId, isDeleted: false });
    if (!task) {
      throw AppError.notFound('Task not found');
    }
    return attachmentRepository.findByTask(taskId);
  }

  public static async deleteAttachment(attachmentId: string, taskId: string, userId: string) {
    const attachment = await attachmentRepository.findOne({ _id: attachmentId, taskId, userId, isDeleted: false });
    if (!attachment) {
      throw AppError.notFound('Attachment not found or unauthorized');
    }

    const success = await attachmentRepository.softDelete(attachmentId, userId);
    if (!success) {
      throw AppError.notFound('Attachment could not be deleted');
    }

    await ActivityService.logActivity(
      taskId,
      userId,
      ActivityAction.ATTACHMENT_DELETED,
      'attachments',
      attachment.fileName,
      undefined,
      { attachmentId }
    );

    return true;
  }
}
