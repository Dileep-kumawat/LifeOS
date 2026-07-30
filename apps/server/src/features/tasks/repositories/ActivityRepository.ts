import { BaseRepository } from '../../../core/repository/BaseRepository.js';
import { ActivityLogModel, IActivityLogDocument } from '../models/ActivityLog.model.js';
import { ActivityAction } from '@lifeos/shared';

export interface LogActivityPayload {
  taskId: string;
  userId: string;
  action: ActivityAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  meta?: Record<string, any>;
}

export class ActivityRepository extends BaseRepository<IActivityLogDocument> {
  constructor() {
    super(ActivityLogModel);
  }

  public async log(payload: LogActivityPayload): Promise<IActivityLogDocument> {
    return ActivityLogModel.create(payload);
  }

  public async findByTask(taskId: string, limit = 50): Promise<IActivityLogDocument[]> {
    return ActivityLogModel.find({ taskId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  public async findByUser(userId: string, page = 1, limit = 25): Promise<IActivityLogDocument[]> {
    const skip = (page - 1) * limit;
    return ActivityLogModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }
}

export const activityRepository = new ActivityRepository();
