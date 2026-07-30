import { Request, Response, NextFunction } from 'express';
import { LabelService } from '../services/LabelService.js';
import { ApiResponse } from '../../../core/response/ApiResponse.js';
import { HttpStatus } from '@lifeos/shared';

export class LabelController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const result = await LabelService.createLabel(userId, req.body);
      ApiResponse.success(res, result, 'Label created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const labels = await LabelService.getLabels(userId);
      ApiResponse.success(res, labels, 'Labels retrieved successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const labelId = req.params.id;
      const result = await LabelService.updateLabel(labelId, userId, req.body);
      ApiResponse.success(res, result, 'Label updated successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const labelId = req.params.id;
      await LabelService.deleteLabel(labelId, userId);
      ApiResponse.success(res, null, 'Label deleted successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}
