import { labelRepository } from '../repositories/LabelRepository.js';
import { CreateLabelInput, UpdateLabelInput } from '@lifeos/shared';
import { AppError } from '../../../core/errors/AppError.js';
import { Types } from 'mongoose';

export class LabelService {
  public static async createLabel(userId: string, input: CreateLabelInput) {
    const existing = await labelRepository.findByName(userId, input.name);
    if (existing) {
      throw AppError.conflict(`Label with name "${input.name}" already exists`);
    }
    return labelRepository.create({ ...input, userId: new Types.ObjectId(userId) } as any);
  }

  public static async getLabels(userId: string) {
    return labelRepository.findByUser(userId);
  }

  public static async updateLabel(id: string, userId: string, input: UpdateLabelInput) {
    const label = await labelRepository.findOne({ _id: id, userId, isDeleted: false });
    if (!label) {
      throw AppError.notFound('Label not found');
    }

    if (input.name && input.name !== label.name) {
      const existing = await labelRepository.findByName(userId, input.name);
      if (existing) {
        throw AppError.conflict(`Label with name "${input.name}" already exists`);
      }
    }

    return labelRepository.update(id, input);
  }

  public static async deleteLabel(id: string, userId: string) {
    const success = await labelRepository.softDelete(id, userId);
    if (!success) {
      throw AppError.notFound('Label not found');
    }
    return true;
  }
}
