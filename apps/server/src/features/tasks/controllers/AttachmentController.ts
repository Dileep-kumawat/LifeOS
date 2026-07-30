import { Request, Response, NextFunction } from 'express';
import { AttachmentService } from '../services/AttachmentService.js';
import { ApiResponse } from '../../../core/response/ApiResponse.js';
import { HttpStatus } from '@lifeos/shared';

export class AttachmentController {
  public static async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.taskId;
      // Accept file details in request body.
      // This makes it compatible with simulated client uploads or Cloudinary signatures
      const { fileName, fileType, fileSize, url, storageKey } = req.body;
      
      const attachment = await AttachmentService.createAttachment(taskId, userId, {
        fileName,
        fileType,
        fileSize,
        url,
        storageKey,
      });

      ApiResponse.success(res, attachment, 'Attachment uploaded successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.taskId;
      const attachments = await AttachmentService.getAttachments(taskId, userId);
      ApiResponse.success(res, attachments, 'Attachments retrieved successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const taskId = req.params.taskId;
      const attachmentId = req.params.id;
      await AttachmentService.deleteAttachment(attachmentId, taskId, userId);
      ApiResponse.success(res, null, 'Attachment deleted successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
