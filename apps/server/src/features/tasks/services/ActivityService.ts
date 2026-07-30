import { activityRepository } from '../repositories/ActivityRepository.js';
import { ActivityAction } from '@lifeos/shared';

export class ActivityService {
  public static async logActivity(
    taskId: string,
    userId: string,
    action: ActivityAction,
    field?: string,
    oldValue?: string,
    newValue?: string,
    meta?: Record<string, any>
  ) {
    return activityRepository.log({
      taskId,
      userId,
      action,
      field,
      oldValue,
      newValue,
      meta,
    });
  }

  public static async getTaskActivity(taskId: string) {
    return activityRepository.findByTask(taskId);
  }

  public static async getUserActivity(userId: string, page = 1, limit = 25) {
    return activityRepository.findByUser(userId, page, limit);
  }
}
