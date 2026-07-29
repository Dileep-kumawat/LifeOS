import mongoose, { FilterQuery } from 'mongoose';
import { TaskModel, ITaskDocument } from '../tasks/models/Task.model.js';
import { ProjectModel, IProjectDocument } from '../projects/models/Project.model.js';
import { GoalModel, IGoalDocument } from '../goals/models/Goal.model.js';
import { HabitModel, IHabitDocument } from '../habits/models/Habit.model.js';
import { EventModel, IEventDocument } from '../calendar/models/Event.model.js';
import { NoteModel, INoteDocument } from '../notes/models/Note.model.js';
import { NotificationModel, INotificationDocument } from '../notifications/models/Notification.model.js';
import { ActivityLogModel, IActivityLogDocument } from '../activity/models/ActivityLog.model.js';
import { FavoriteModel, IFavoriteDocument } from './models/Favorite.model.js';
import { PaginatedResult } from '../../core/repository/IRepository.js';

export class DashboardRepository {
  /**
   * Aggregates a lightweight daily summary for today
   */
  public async getTodaySummaryData(
    userId: string,
    startOfDay: Date,
    endOfDay: Date,
  ) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [
      dueTasksCount,
      completedTasksCount,
      eventsToday,
      unreadNotificationsCount,
      habits,
    ] = await Promise.all([
      // Tasks due today or overdue
      TaskModel.countDocuments({
        userId: userObjectId,
        isDeleted: false,
        status: { $ne: 'completed' },
        dueDate: { $lte: endOfDay },
      }).exec(),

      // Tasks completed today
      TaskModel.countDocuments({
        userId: userObjectId,
        isDeleted: false,
        status: 'completed',
        updatedAt: { $gte: startOfDay, $lte: endOfDay },
      }).exec(),

      // Events scheduled for today
      EventModel.find({
        userId: userObjectId,
        isDeleted: false,
        startTime: { $gte: startOfDay, $lte: endOfDay },
      })
        .sort({ startTime: 1 })
        .exec(),

      // Unread notifications count
      NotificationModel.countDocuments({
        userId: userObjectId,
        isRead: false,
      }).exec(),

      // Habits list to compute remaining ones
      HabitModel.find({
        userId: userObjectId,
        isDeleted: false,
      }).exec(),
    ]);

    // Calculate habits completed today vs total habits
    const startOfTodayTimestamp = startOfDay.getTime();
    const endOfTodayTimestamp = endOfDay.getTime();

    let totalHabits = habits.length;
    let completedHabits = 0;

    for (const habit of habits) {
      const completedToday = habit.history.some((date) => {
        const t = new Date(date).getTime();
        return t >= startOfTodayTimestamp && t <= endOfTodayTimestamp;
      });
      if (completedToday) {
        completedHabits++;
      }
    }

    // Dynamic streak calculation based on user habits average or maximum
    const currentStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

    return {
      currentStreak,
      tasksDueToday: dueTasksCount,
      tasksCompletedToday: completedTasksCount,
      habitsRemaining: totalHabits - completedHabits,
      habitsCompletedToday: completedHabits,
      totalHabitsCount: totalHabits,
      eventsCountToday: eventsToday.length,
      unreadNotifications: unreadNotificationsCount,
    };
  }

  /**
   * Aggregates productivity analytics and counters
   */
  public async getStatisticsData(userId: string, startOfWeek: Date, endOfWeek: Date) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [
      totalTasks,
      completedTasks,
      activeProjects,
      goalsProgress,
      notesCount,
      habits,
      weeklyLogs,
    ] = await Promise.all([
      // Total tasks count
      TaskModel.countDocuments({ userId: userObjectId, isDeleted: false }).exec(),
      // Completed tasks count
      TaskModel.countDocuments({ userId: userObjectId, isDeleted: false, status: 'completed' }).exec(),
      // Active projects count
      ProjectModel.countDocuments({ userId: userObjectId, isDeleted: false, isCompleted: false }).exec(),
      // Goals progress average
      GoalModel.aggregate([
        { $match: { userId: userObjectId, isDeleted: false } },
        {
          $group: {
            _id: null,
            averageProgress: { $avg: '$progress' },
            totalGoals: { $sum: 1 },
          },
        },
      ]).exec(),
      // Total notes
      NoteModel.countDocuments({ userId: userObjectId, isDeleted: false }).exec(),
      // Habit completion rates
      HabitModel.find({ userId: userObjectId, isDeleted: false }).exec(),
      // Weekly activity timeline
      ActivityLogModel.find({
        userId: userObjectId,
        createdAt: { $gte: startOfWeek, $lte: endOfWeek },
      })
        .sort({ createdAt: 1 })
        .exec(),
    ]);

    // Average goal completion
    const avgGoalProgress = goalsProgress.length > 0 ? Math.round(goalsProgress[0].averageProgress) : 0;
    const goalsCount = goalsProgress.length > 0 ? goalsProgress[0].totalGoals : 0;

    // Habit completion score (e.g. average checks per habit)
    let totalHabitChecks = habits.reduce((sum, h) => sum + h.history.length, 0);
    let habitCompletionRate = habits.length > 0 ? Math.round((totalHabitChecks / (habits.length * 30)) * 100) : 0; // standard 30 day completion baseline
    habitCompletionRate = Math.min(habitCompletionRate, 100);

    // Productivity score placeholder (non-AI math formula based on tasks + habits + goals)
    const completedTasksWeight = completedTasks * 10;
    const projectWeight = activeProjects * 5;
    const goalWeight = avgGoalProgress * 0.5;
    const rawScore = completedTasksWeight + projectWeight + goalWeight + habitCompletionRate;
    const productivityScore = totalTasks > 0 ? Math.min(Math.round((rawScore / (totalTasks * 10 || 1)) * 100), 100) : 75; // baseline 75

    // Map weekly activity completion rates
    const weeklyActivity = this.mapWeeklyActivity(weeklyLogs, startOfWeek);

    return {
      totalTasks,
      completedTasks,
      activeProjects,
      goalsCount,
      goalsProgress: avgGoalProgress,
      habitCompletionRate,
      notesCount,
      productivityScore,
      weeklyActivity,
    };
  }

  private mapWeeklyActivity(logs: IActivityLogDocument[], startOfWeek: Date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const resultMap = days.reduce((acc, day) => {
      acc[day] = 0;
      return acc;
    }, {} as Record<string, number>);

    for (const log of logs) {
      const dayIndex = new Date(log.createdAt).getDay();
      const dayName = days[dayIndex];
      resultMap[dayName] = (resultMap[dayName] || 0) + 1;
    }

    return days.map((day) => ({
      day,
      count: resultMap[day],
    }));
  }

  /**
   * Generic paginated finder helper
   */
  private async paginateCollection<T>(
    model: any,
    filter: FilterQuery<any>,
    page: number,
    limit: number,
    sort: any = { createdAt: -1 },
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      model.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async getTasks(
    userId: string,
    filter: { status?: string; priority?: string },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ITaskDocument>> {
    const query: FilterQuery<ITaskDocument> = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    };

    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;

    return this.paginateCollection<ITaskDocument>(
      TaskModel,
      query,
      page,
      limit,
      { status: 1, dueDate: 1, priority: -1, createdAt: -1 },
    );
  }

  public async getEvents(
    userId: string,
    filter: { start?: Date; end?: Date },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<IEventDocument>> {
    const query: FilterQuery<IEventDocument> = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    };

    if (filter.start || filter.end) {
      query.startTime = {};
      if (filter.start) query.startTime.$gte = filter.start;
      if (filter.end) query.startTime.$lte = filter.end;
    }

    return this.paginateCollection<IEventDocument>(EventModel, query, page, limit, { startTime: 1 });
  }

  public async getHabits(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<IHabitDocument>> {
    const query: FilterQuery<IHabitDocument> = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    };

    return this.paginateCollection<IHabitDocument>(HabitModel, query, page, limit, { updatedAt: -1 });
  }

  public async getNotes(
    userId: string,
    filter: { isPinned?: boolean; folder?: string },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<INoteDocument>> {
    const query: FilterQuery<INoteDocument> = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    };

    if (filter.isPinned !== undefined) query.isPinned = filter.isPinned;
    if (filter.folder) query.folder = filter.folder;

    return this.paginateCollection<INoteDocument>(NoteModel, query, page, limit, { isPinned: -1, updatedAt: -1 });
  }

  public async getNotifications(
    userId: string,
    filter: { isRead?: boolean },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<INotificationDocument>> {
    const query: FilterQuery<INotificationDocument> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (filter.isRead !== undefined) query.isRead = filter.isRead;

    return this.paginateCollection<INotificationDocument>(NotificationModel, query, page, limit, { createdAt: -1 });
  }

  public async getActivityLogs(
    userId: string,
    filter: { action?: string },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<IActivityLogDocument>> {
    const query: FilterQuery<IActivityLogDocument> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (filter.action) query.action = filter.action;

    return this.paginateCollection<IActivityLogDocument>(ActivityLogModel, query, page, limit, { createdAt: -1 });
  }

  public async getFavorites(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<IFavoriteDocument>> {
    const query = { userId: new mongoose.Types.ObjectId(userId) };
    return this.paginateCollection<IFavoriteDocument>(FavoriteModel, query, page, limit, { createdAt: -1 });
  }

  public async markNotificationAsRead(userId: string, notificationId: string): Promise<INotificationDocument | null> {
    return NotificationModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(notificationId), userId: new mongoose.Types.ObjectId(userId) },
      { isRead: true },
      { new: true },
    ).exec();
  }
}
export const dashboardRepository = new DashboardRepository();
