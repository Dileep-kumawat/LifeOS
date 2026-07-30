import { FilterQuery, SortOrder, Types } from 'mongoose';
import { BaseRepository } from '../../../core/repository/BaseRepository.js';
import { TaskModel, ITaskDocument } from '../models/Task.model.js';
import { TaskStatus, TaskPriority, TaskFilters, TaskSortOptions, TaskStatistics, ActivityAction } from '@lifeos/shared';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/task.constants.js';

export interface TaskQueryOptions {
  filters?: TaskFilters;
  sort?: TaskSortOptions;
  page?: number;
  limit?: number;
}

export class TaskRepository extends BaseRepository<ITaskDocument> {
  constructor() {
    super(TaskModel);
  }

  public async findByUser(userId: string, options: TaskQueryOptions = {}) {
    const { filters = {}, sort = { field: 'createdAt', direction: 'desc' }, page = 1, limit = DEFAULT_PAGE_SIZE } = options;
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    const skip = (safePage - 1) * safeLimit;

    const query = this.buildFilterQuery(userId, filters);
    const sortObj = this.buildSortObject(sort);

    const [tasks, total] = await Promise.all([
      TaskModel.find(query)
        .populate('labelIds', 'id name color')
        .sort(sortObj)
        .skip(skip)
        .limit(safeLimit)
        .lean({ virtuals: true })
        .exec(),
      TaskModel.countDocuments(query).exec(),
    ]);

    return {
      tasks,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage: safePage < Math.ceil(total / safeLimit),
      hasPrevPage: safePage > 1,
    };
  }

  public async findByIdForUser(id: string, userId: string): Promise<ITaskDocument | null> {
    return TaskModel.findOne({ _id: id, userId, isDeleted: false })
      .populate('labelIds', 'id name color')
      .exec();
  }

  public async findSubtasks(parentTaskId: string, userId: string): Promise<any[]> {
    return TaskModel.find({ parentTaskId, userId, isDeleted: false })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean({ virtuals: true })
      .exec();
  }

  public async searchTasks(userId: string, query: string, filters: TaskFilters = {}) {
    const baseQuery = this.buildFilterQuery(userId, filters);
    const searchQuery: FilterQuery<ITaskDocument> = {
      ...baseQuery,
      $text: { $search: query },
    };

    return TaskModel.find(searchQuery)
      .populate('labelIds', 'id name color')
      .sort({ score: { $meta: 'textScore' } } as any)
      .limit(50)
      .lean({ virtuals: true })
      .exec();
  }

  public async softDelete(id: string, userId: string): Promise<ITaskDocument | null> {
    return TaskModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { isTrashed: true, isArchived: false },
      { new: true },
    ).exec();
  }

  public async restore(id: string, userId: string): Promise<ITaskDocument | null> {
    return TaskModel.findOneAndUpdate(
      { _id: id, userId },
      { isTrashed: false, isArchived: false, isDeleted: false, deletedAt: null },
      { new: true },
    ).exec();
  }

  public async archive(id: string, userId: string): Promise<ITaskDocument | null> {
    return TaskModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { isArchived: true, isTrashed: false },
      { new: true },
    ).exec();
  }

  public async permanentDelete(id: string, userId: string): Promise<boolean> {
    const result = await TaskModel.deleteOne({ _id: id, userId }).exec();
    return result.deletedCount > 0;
  }

  public async bulkUpdate(ids: string[], userId: string, payload: Partial<ITaskDocument>): Promise<number> {
    const result = await TaskModel.updateMany(
      { _id: { $in: ids.map((id) => new Types.ObjectId(id)) }, userId, isDeleted: false },
      { $set: payload },
    ).exec();
    return result.modifiedCount;
  }

  public async duplicateTask(id: string, userId: string): Promise<ITaskDocument | null> {
    const original = await TaskModel.findOne({ _id: id, userId, isDeleted: false }).lean().exec();
    if (!original) return null;

    const { _id, createdAt, updatedAt, completedAt, ...rest } = original as any;
    const duplicate = await TaskModel.create({
      ...rest,
      title: `${rest.title} (Copy)`,
      status: TaskStatus.INBOX,
      isFavorite: false,
      isArchived: false,
      isTrashed: false,
      subTaskIds: [],
    });
    return duplicate;
  }

  public async getStatistics(userId: string): Promise<TaskStatistics> {
    const userObjId = new Types.ObjectId(userId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());

    const [stats] = await TaskModel.aggregate([
      { $match: { userId: userObjId, isDeleted: false } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', [TaskStatus.INBOX, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.WAITING, TaskStatus.BLOCKED]] },
                      1, 0,
                    ],
                  },
                },
                completed: { $sum: { $cond: [{ $eq: ['$status', TaskStatus.COMPLETED] }, 1, 0] } },
                overdue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$status', TaskStatus.COMPLETED] },
                          { $ne: ['$isArchived', true] },
                          { $lt: ['$dueDate', now] },
                          { $ne: ['$dueDate', null] },
                        ],
                      },
                      1, 0,
                    ],
                  },
                },
                archived: { $sum: { $cond: ['$isArchived', 1, 0] } },
                trashed: { $sum: { $cond: ['$isTrashed', 1, 0] } },
                favorites: { $sum: { $cond: ['$isFavorite', 1, 0] } },
                completedToday: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$completedAt', startOfDay] }, { $lt: ['$completedAt', endOfDay] }] },
                      1, 0,
                    ],
                  },
                },
                completedThisWeek: {
                  $sum: {
                    $cond: [{ $gte: ['$completedAt', startOfWeek] }, 1, 0],
                  },
                },
                dueToday: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$dueDate', startOfDay] }, { $lt: ['$dueDate', endOfDay] }, { $ne: ['$status', TaskStatus.COMPLETED] }] },
                      1, 0,
                    ],
                  },
                },
                dueThisWeek: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$dueDate', startOfWeek] }, { $ne: ['$status', TaskStatus.COMPLETED] }] },
                      1, 0,
                    ],
                  },
                },
                totalCompletionTime: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', TaskStatus.COMPLETED] }, { $ne: ['$actualDuration', null] }] },
                      '$actualDuration', 0,
                    ],
                  },
                },
              },
            },
          ],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        },
      },
    ]).exec();

    const t = stats?.totals?.[0] || {};
    const total = t.total || 0;
    const completed = t.completed || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byStatus: Record<string, number> = {};
    for (const s of Object.values(TaskStatus)) byStatus[s as string] = 0;
    (stats?.byStatus || []).forEach((s: any) => { byStatus[s._id] = s.count; });

    const byPriority: Record<string, number> = {};
    for (const p of Object.values(TaskPriority)) byPriority[p as string] = 0;
    (stats?.byPriority || []).forEach((p: any) => { byPriority[p._id] = p.count; });

    return {
      total,
      active: t.active || 0,
      completed,
      overdue: t.overdue || 0,
      archived: t.archived || 0,
      trashed: t.trashed || 0,
      favorites: t.favorites || 0,
      completionRate,
      avgCompletionTimeMinutes: completed > 0 ? Math.round((t.totalCompletionTime || 0) / completed) : 0,
      byStatus: byStatus as any,
      byPriority: byPriority as any,
      completedToday: t.completedToday || 0,
      completedThisWeek: t.completedThisWeek || 0,
      dueToday: t.dueToday || 0,
      dueThisWeek: t.dueThisWeek || 0,
    };
  }

  private buildFilterQuery(userId: string, filters: TaskFilters): FilterQuery<ITaskDocument> {
    const query: FilterQuery<ITaskDocument> = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    if (filters.isArchived !== undefined) query.isArchived = filters.isArchived;
    else query.isArchived = false;

    if (filters.isTrashed !== undefined) query.isTrashed = filters.isTrashed;
    else query.isTrashed = false;

    if (filters.status) {
      query.status = Array.isArray(filters.status)
        ? { $in: filters.status }
        : filters.status;
    }
    if (filters.priority) {
      query.priority = Array.isArray(filters.priority)
        ? { $in: filters.priority }
        : filters.priority;
    }
    if (filters.labelIds?.length) {
      query.labelIds = { $in: filters.labelIds.map((id: string) => new Types.ObjectId(id)) };
    }
    if (filters.isFavorite !== undefined) query.isFavorite = filters.isFavorite;
    if (filters.dueDateFrom || filters.dueDateTo) {
      query.dueDate = {};
      if (filters.dueDateFrom) query.dueDate.$gte = new Date(filters.dueDateFrom);
      if (filters.dueDateTo) query.dueDate.$lte = new Date(filters.dueDateTo);
    }
    if (filters.createdFrom || filters.createdTo) {
      query.createdAt = {};
      if (filters.createdFrom) (query.createdAt as any).$gte = new Date(filters.createdFrom);
      if (filters.createdTo) (query.createdAt as any).$lte = new Date(filters.createdTo);
    }
    if (filters.parentTaskId !== undefined) {
      query.parentTaskId = filters.parentTaskId
        ? new Types.ObjectId(filters.parentTaskId)
        : null;
    } else {
      // By default only top-level tasks
      query.parentTaskId = null;
    }
    if (filters.goalId) query['goalRef.goalId'] = new Types.ObjectId(filters.goalId);
    if (filters.projectId) query['projectRef.projectId'] = new Types.ObjectId(filters.projectId);
    if (filters.search) query.$text = { $search: filters.search };

    return query;
  }

  private buildSortObject(sort: TaskSortOptions): Record<string, SortOrder> {
    const dir: SortOrder = sort.direction === 'asc' ? 1 : -1;
    if (sort.field === 'priority') {
      // Priority is an enum string — sort by custom order via sortOrder proxy
      return { priority: dir, sortOrder: 1 };
    }
    return { [sort.field]: dir };
  }
}

export const taskRepository = new TaskRepository();
