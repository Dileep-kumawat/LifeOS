import { BaseRepository } from '../../../core/repository/BaseRepository.js';
import { LabelModel, ILabelDocument } from '../models/Label.model.js';
import { Types } from 'mongoose';

export class LabelRepository extends BaseRepository<ILabelDocument> {
  constructor() {
    super(LabelModel);
  }

  public async findByUser(userId: string): Promise<ILabelDocument[]> {
    return LabelModel.find({ userId, isDeleted: false }).sort({ name: 1 }).exec();
  }

  public async findByName(userId: string, name: string): Promise<ILabelDocument | null> {
    return LabelModel.findOne({
      userId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isDeleted: false,
    }).exec();
  }

  public async findByIds(ids: string[], userId: string): Promise<ILabelDocument[]> {
    return LabelModel.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
      userId,
      isDeleted: false,
    }).exec();
  }

  public async softDelete(id: string, userId: string): Promise<boolean> {
    const result = await LabelModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { isDeleted: true },
    ).exec();
    return result !== null;
  }
}

export const labelRepository = new LabelRepository();
