import { taskRepository, TaskQueryOptions } from '../repositories/TaskRepository.js';
import { labelRepository } from '../repositories/LabelRepository.js';
import { commentRepository } from '../repositories/CommentRepository.js';
import { attachmentRepository } from '../repositories/AttachmentRepository.js';
import { ActivityService } from './ActivityService.js';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskPriority,
  ActivityAction,
  BulkTaskOperation,
  ITask,
} from '@lifeos/shared';
import { AppError } from '../../../core/errors/AppError.js';
import { Types } from 'mongoose';
import { TaskModel } from '../models/Task.model.js';

export class TaskService {
  public static async createTask(userId: string, input: CreateTaskInput) {
    // 1. Verify parent task if any
    if (input.parentTaskId) {
      const parent = await taskRepository.findOne({ _id: input.parentTaskId, userId, isDeleted: false });
      if (!parent) {
        throw AppError.notFound('Parent task not found');
      }
    }

    // 2. Validate labels
    if (input.labelIds && input.labelIds.length > 0) {
      const validLabels = await labelRepository.findByIds(input.labelIds, userId);
      if (validLabels.length !== input.labelIds.length) {
        throw AppError.badRequest('One or more labels are invalid');
      }
    }

    // 3. Setup dates & recurrence
    const taskData: any = {
      ...input,
      userId: new Types.ObjectId(userId),
      status: input.status || TaskStatus.INBOX,
      priority: input.priority || TaskPriority.NONE,
      progress: 0,
      labelIds: input.labelIds?.map((id: string) => new Types.ObjectId(id)) || [],
      parentTaskId: input.parentTaskId ? new Types.ObjectId(input.parentTaskId) : null,
      customMetadata: {},
    };

    if (input.startDate) taskData.startDate = new Date(input.startDate);
    if (input.dueDate) taskData.dueDate = new Date(input.dueDate);
    if (input.reminderAt) taskData.reminderAt = new Date(input.reminderAt);

    // Stubs for integration references
    if (input.goalId) taskData.goalRef = { goalId: new Types.ObjectId(input.goalId) };
    if (input.projectId) taskData.projectRef = { projectId: new Types.ObjectId(input.projectId) };

    const task = await taskRepository.create(taskData);

    // 4. Update parent's subtask list
    if (input.parentTaskId) {
      await taskRepository.update(input.parentTaskId, {
        $addToSet: { subTaskIds: task._id },
      });
      await this.updateParentProgress(input.parentTaskId, userId);
    }

    // 5. Log activity
    await ActivityService.logActivity(task._id.toString(), userId, ActivityAction.CREATED);

    return this.enrichTask(task, userId);
  }

  public static async listTasks(userId: string, options: TaskQueryOptions = {}) {
    const paginated = await taskRepository.findByUser(userId, options);
    const enrichedTasks = await Promise.all(
      paginated.tasks.map((t) => this.enrichTask(t as any, userId))
    );
    return {
      ...paginated,
      tasks: enrichedTasks,
    };
  }

  public static async getTask(id: string, userId: string) {
    const task = await taskRepository.findByIdForUser(id, userId);
    if (!task) {
      throw AppError.notFound('Task not found');
    }
    return this.enrichTask(task, userId);
  }

  public static async updateTask(id: string, userId: string, input: UpdateTaskInput) {
    const task = await taskRepository.findByIdForUser(id, userId);
    if (!task) {
      throw AppError.notFound('Task not found');
    }

    // 1. Verify parent task loop
    if (input.parentTaskId) {
      if (input.parentTaskId === id) {
        throw AppError.badRequest('A task cannot be its own parent');
      }
      const parent = await taskRepository.findOne({ _id: input.parentTaskId, userId, isDeleted: false });
      if (!parent) {
        throw AppError.notFound('Parent task not found');
      }
    }

    // 2. Validate labels
    if (input.labelIds && input.labelIds.length > 0) {
      const validLabels = await labelRepository.findByIds(input.labelIds, userId);
      if (validLabels.length !== input.labelIds.length) {
        throw AppError.badRequest('One or more labels are invalid');
      }
    }

    // 3. Verify task dependencies for completion
    if (input.status === TaskStatus.COMPLETED) {
      // Check if blocked by other incomplete tasks
      const incompleteDependencies = await taskRepository.find({
        _id: { $in: task.blockedBy },
        userId,
        status: { $ne: TaskStatus.COMPLETED },
        isDeleted: false,
      });

      if (incompleteDependencies.length > 0) {
        throw AppError.badRequest(
          `Cannot complete task. It is blocked by incomplete tasks: ${incompleteDependencies
            .map((t) => t.title)
            .join(', ')}`
        );
      }
    }

    const oldStatus = task.status;
    const oldPriority = task.priority;
    const oldParentId = task.parentTaskId?.toString();

    // Map dates
    const updateData: any = { ...input };
    if (input.startDate !== undefined) updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.reminderAt !== undefined) updateData.reminderAt = input.reminderAt ? new Date(input.reminderAt) : null;
    if (input.labelIds !== undefined) updateData.labelIds = input.labelIds.map((lid: string) => new Types.ObjectId(lid));

    // Map stubs
    if (input.goalId !== undefined) updateData.goalRef = input.goalId ? { goalId: new Types.ObjectId(input.goalId) } : null;
    if (input.projectId !== undefined) updateData.projectRef = input.projectId ? { projectId: new Types.ObjectId(input.projectId) } : null;
    if (input.calendarEventId !== undefined) updateData.calendarEventRef = input.calendarEventId ? { calendarEventId: new Types.ObjectId(input.calendarEventId) } : null;

    if (input.status === TaskStatus.COMPLETED && oldStatus !== TaskStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    } else if (input.status && input.status !== TaskStatus.COMPLETED && oldStatus === TaskStatus.COMPLETED) {
      updateData.completedAt = null;
      updateData.progress = input.progress !== undefined ? input.progress : 0;
    }

    const updated = await taskRepository.update(id, updateData);
    if (!updated) throw AppError.notFound('Task not found');

    // 4. Handle hierarchy changes
    if (input.parentTaskId !== undefined) {
      const newParentId = input.parentTaskId;

      if (oldParentId && oldParentId !== newParentId) {
        // Remove from old parent
        await taskRepository.update(oldParentId, { $pull: { subTaskIds: task._id } });
        await this.updateParentProgress(oldParentId, userId);
      }

      if (newParentId && oldParentId !== newParentId) {
        // Add to new parent
        await taskRepository.update(newParentId, { $addToSet: { subTaskIds: task._id } });
        await this.updateParentProgress(newParentId, userId);
      }
    }

    // Update current parent progress if status changed
    if (updated.parentTaskId && input.status && oldStatus !== input.status) {
      await this.updateParentProgress(updated.parentTaskId.toString(), userId);
    }

    // 5. Logs activities
    if (input.status && oldStatus !== input.status) {
      await ActivityService.logActivity(id, userId, ActivityAction.STATUS_CHANGED, 'status', oldStatus, input.status);
      if (input.status === TaskStatus.COMPLETED) {
        await ActivityService.logActivity(id, userId, ActivityAction.COMPLETED);
      }
    }
    if (input.priority && oldPriority !== input.priority) {
      await ActivityService.logActivity(id, userId, ActivityAction.PRIORITY_CHANGED, 'priority', oldPriority, input.priority);
    }
    if (input.dueDate !== undefined) {
      if (input.dueDate) {
        await ActivityService.logActivity(id, userId, ActivityAction.DUE_DATE_SET, 'dueDate', undefined, input.dueDate);
      } else {
        await ActivityService.logActivity(id, userId, ActivityAction.DUE_DATE_REMOVED, 'dueDate');
      }
    }

    return this.enrichTask(updated, userId);
  }

  public static async duplicateTask(id: string, userId: string) {
    const duplicated = await taskRepository.duplicateTask(id, userId);
    if (!duplicated) {
      throw AppError.notFound('Task not found');
    }
    await ActivityService.logActivity(duplicated._id.toString(), userId, ActivityAction.DUPLICATED, undefined, undefined, duplicated.title);
    return this.enrichTask(duplicated, userId);
  }

  public static async archiveTask(id: string, userId: string) {
    const task = await taskRepository.archive(id, userId);
    if (!task) throw AppError.notFound('Task not found');
    await ActivityService.logActivity(id, userId, ActivityAction.ARCHIVED);
    return this.enrichTask(task, userId);
  }

  public static async restoreTask(id: string, userId: string) {
    const task = await taskRepository.restore(id, userId);
    if (!task) throw AppError.notFound('Task not found');
    await ActivityService.logActivity(id, userId, ActivityAction.RESTORED);
    return this.enrichTask(task, userId);
  }

  public static async trashTask(id: string, userId: string) {
    const task = await taskRepository.softDelete(id, userId);
    if (!task) throw AppError.notFound('Task not found');
    await ActivityService.logActivity(id, userId, ActivityAction.TRASHED);
    return this.enrichTask(task, userId);
  }

  public static async permanentDeleteTask(id: string, userId: string) {
    const task = await taskRepository.findByIdForUser(id, userId);
    if (!task) throw AppError.notFound('Task not found');

    const success = await taskRepository.permanentDelete(id, userId);
    if (!success) throw AppError.notFound('Task not found');

    // Clean parent reference
    if (task.parentTaskId) {
      await taskRepository.update(task.parentTaskId.toString(), {
        $pull: { subTaskIds: task._id },
      });
      await this.updateParentProgress(task.parentTaskId.toString(), userId);
    }

    return true;
  }

  public static async bulkOperation(userId: string, input: BulkTaskOperation) {
    const { taskIds, operation, payload } = input;
    let count = 0;

    switch (operation) {
      case 'delete':
        const results = await Promise.all(
          taskIds.map((id: string) => taskRepository.permanentDelete(id, userId).catch(() => false))
        );
        count = results.filter(Boolean).length;
        break;
      case 'trash':
        count = await taskRepository.bulkUpdate(taskIds, userId, {
          isTrashed: true,
          isArchived: false,
        } as any);
        break;
      case 'archive':
        count = await taskRepository.bulkUpdate(taskIds, userId, {
          isArchived: true,
          isTrashed: false,
        } as any);
        break;
      case 'restore':
        count = await taskRepository.bulkUpdate(taskIds, userId, {
          isTrashed: false,
          isArchived: false,
          isDeleted: false,
          deletedAt: undefined,
        } as any);
        break;
      case 'status_change':
        if (payload?.status) {
          count = await taskRepository.bulkUpdate(taskIds, userId, {
            status: payload.status,
            completedAt: payload.status === TaskStatus.COMPLETED ? new Date() : undefined,
            progress: payload.status === TaskStatus.COMPLETED ? 100 : 0,
          } as any);
        }
        break;
      case 'priority_change':
        if (payload?.priority) {
          count = await taskRepository.bulkUpdate(taskIds, userId, {
            priority: payload.priority,
          } as any);
        }
        break;
      case 'label_assign':
        if (payload?.labelId) {
          const res = await TaskModel.updateMany(
            { _id: { $in: taskIds.map((id: string) => new Types.ObjectId(id)) }, userId, isDeleted: false },
            { $addToSet: { labelIds: new Types.ObjectId(payload.labelId) } }
          ).exec();
          count = res.modifiedCount;
        }
        break;
      case 'label_remove':
        if (payload?.labelId) {
          const res = await TaskModel.updateMany(
            { _id: { $in: taskIds.map((id: string) => new Types.ObjectId(id)) }, userId, isDeleted: false },
            { $pull: { labelIds: new Types.ObjectId(payload.labelId) } }
          ).exec();
          count = res.modifiedCount;
        }
        break;
      default:
        throw AppError.badRequest('Invalid bulk operation type');
    }

    return { count };
  }

  public static async searchTasks(userId: string, query: string, filters: any = {}) {
    const tasks = await taskRepository.searchTasks(userId, query, filters);
    return Promise.all(tasks.map((t) => this.enrichTask(t as any, userId)));
  }

  public static async getStatistics(userId: string) {
    return taskRepository.getStatistics(userId);
  }

  public static async reorderTasks(userId: string, tasks: { id: string; sortOrder: number }[]) {
    const ops = tasks.map((t) =>
      TaskModel.updateOne(
        { _id: new Types.ObjectId(t.id), userId },
        { $set: { sortOrder: t.sortOrder } }
      ).exec()
    );
    await Promise.all(ops);
    return true;
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  private static async updateParentProgress(parentId: string | Types.ObjectId, userId: string) {
    const id = parentId.toString();
    const subtasks = await taskRepository.find({
      parentTaskId: new Types.ObjectId(id),
      userId,
      isDeleted: false,
      isTrashed: false,
    });

    if (subtasks.length === 0) return;

    const completed = subtasks.filter((s) => s.status === TaskStatus.COMPLETED).length;
    const progress = Math.round((completed / subtasks.length) * 100);

    // If all subtasks completed, auto complete parent
    const statusUpdate: any = { progress };
    if (completed === subtasks.length) {
      statusUpdate.status = TaskStatus.COMPLETED;
      statusUpdate.completedAt = new Date();
    } else {
      statusUpdate.status = TaskStatus.IN_PROGRESS;
      statusUpdate.completedAt = null;
    }

    await taskRepository.update(id, statusUpdate);
  }

  private static async enrichTask(task: any, userId: string): Promise<ITask> {
    const taskId = task.id || task._id.toString();

    // 1. Fetch related counts
    const [subTasks, commentCount, attachmentCount] = await Promise.all([
      taskRepository.findSubtasks(taskId, userId),
      commentRepository.countByTask(taskId),
      attachmentRepository.countByTask(taskId),
    ]);

    const completedSubTasks = subTasks.filter((s) => s.status === TaskStatus.COMPLETED).length;

    // Convert labelIds from Types.ObjectId[] to string[]
    const labelIds = (task.labelIds || []).map((lid: any) =>
      lid._id ? lid._id.toString() : lid.toString()
    );

    // Labels are already populated in repository as documents
    const labels = (task.labelIds || []).filter((lid: any) => lid._id).map((l: any) => ({
      id: l._id.toString(),
      userId: l.userId?.toString() || userId,
      name: l.name,
      color: l.color,
      createdAt: l.createdAt?.toISOString(),
      updatedAt: l.updatedAt?.toISOString(),
    }));

    return {
      id: taskId,
      userId: task.userId.toString(),
      title: task.title,
      description: task.description,
      notes: task.notes,
      status: task.status,
      priority: task.priority,
      progress: task.progress,

      startDate: task.startDate?.toISOString(),
      dueDate: task.dueDate?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      reminderAt: task.reminderAt?.toISOString(),

      labels,
      labelIds,

      estimatedDuration: task.estimatedDuration,
      actualDuration: task.actualDuration,

      isRecurring: task.isRecurring,
      recurrenceRule: task.recurrenceRule,
      recurrenceParentId: task.recurrenceParentId?.toString(),

      parentTaskId: task.parentTaskId?.toString(),
      subTasks: subTasks.map((st) => ({
        id: st.id || st._id.toString(),
        title: st.title,
        status: st.status,
        priority: st.priority,
        progress: st.progress,
        dueDate: st.dueDate?.toISOString(),
      } as any)),
      subTaskCount: subTasks.length,
      completedSubTaskCount: completedSubTasks,

      blockedBy: (task.blockedBy || []).map((id: any) => id.toString()),
      blocks: (task.blocks || []).map((id: any) => id.toString()),
      relatedTasks: (task.relatedTasks || []).map((id: any) => id.toString()),

      assignedTo: task.assignedTo?.toString(),
      watchers: (task.watchers || []).map((id: any) => id.toString()),

      goalRef: task.goalRef?.goalId ? { goalId: task.goalRef.goalId.toString(), goalTitle: '' } : undefined,
      projectRef: task.projectRef?.projectId ? { projectId: task.projectRef.projectId.toString(), projectTitle: '' } : undefined,
      calendarEventRef: task.calendarEventRef?.calendarEventId ? { calendarEventId: task.calendarEventRef.calendarEventId.toString() } : undefined,
      habitRef: task.habitRef?.habitId ? { habitId: task.habitRef.habitId.toString() } : undefined,


      isFavorite: task.isFavorite,
      isArchived: task.isArchived,
      isTrashed: task.isTrashed,
      isDeleted: task.isDeleted,

      sortOrder: task.sortOrder,
      attachmentCount,
      commentCount,

      createdAt: task.createdAt?.toISOString(),
      updatedAt: task.updatedAt?.toISOString(),
      deletedAt: task.deletedAt?.toISOString(),
      customMetadata: task.customMetadata,
    };
  }
}
