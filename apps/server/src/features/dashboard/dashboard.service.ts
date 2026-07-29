import { dashboardRepository } from './dashboard.repository.js';
import { TodaySummaryResponse, StatisticsResponse } from './dashboard.types.js';

export class DashboardService {
  /**
   * Calculates local or UTC boundary times for today's queries
   */
  private getDayBoundaries(timezoneOffsetMinutes: number = 0) {
    // Current UTC time
    const now = new Date();

    // Shift date by user's local offset to calculate local day bounds
    // timezoneOffsetMinutes is the offset in minutes, e.g. client timezone offset
    // For example, IST is UTC+5:30 (+330 mins)
    const localTime = new Date(now.getTime() + timezoneOffsetMinutes * 60 * 1000);
    
    const startOfLocalDay = new Date(localTime);
    startOfLocalDay.setUTCHours(0, 0, 0, 0);

    const endOfLocalDay = new Date(localTime);
    endOfLocalDay.setUTCHours(23, 59, 59, 999);

    // Shift back to UTC representation for Mongoose query
    const startOfTodayUTC = new Date(startOfLocalDay.getTime() - timezoneOffsetMinutes * 60 * 1000);
    const endOfTodayUTC = new Date(endOfLocalDay.getTime() - timezoneOffsetMinutes * 60 * 1000);

    return {
      now,
      start: startOfTodayUTC,
      end: endOfTodayUTC,
      localHour: localTime.getUTCHours(),
    };
  }

  /**
   * Generates dynamic editorial greeting based on current local hour
   */
  private getGreeting(localHour: number): string {
    if (localHour >= 5 && localHour < 12) {
      return 'Good morning';
    } else if (localHour >= 12 && localHour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  }

  public async getTodaySummary(userId: string, timezoneOffsetMinutes?: number): Promise<TodaySummaryResponse> {
    const { start, end, localHour, now } = this.getDayBoundaries(timezoneOffsetMinutes);
    const rawSummary = await dashboardRepository.getTodaySummaryData(userId, start, end);

    const greeting = this.getGreeting(localHour);

    // Overall productivity progress today = tasks completed today + habits completed today
    // divided by tasks due today + tasks completed today + total habits
    const completedUnits = rawSummary.tasksCompletedToday + rawSummary.habitsCompletedToday;
    const totalUnits = rawSummary.tasksDueToday + rawSummary.tasksCompletedToday + rawSummary.totalHabitsCount;
    const progress = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

    return {
      date: now.toISOString(),
      greeting,
      currentStreak: rawSummary.currentStreak,
      tasksDueToday: rawSummary.tasksDueToday,
      tasksCompletedToday: rawSummary.tasksCompletedToday,
      habitsRemaining: rawSummary.habitsRemaining,
      habitsCompletedToday: rawSummary.habitsCompletedToday,
      totalHabitsCount: rawSummary.totalHabitsCount,
      eventsCountToday: rawSummary.eventsCountToday,
      unreadNotifications: rawSummary.unreadNotifications,
      overallProductivityProgress: Math.min(progress, 100),
    };
  }

  public async getStatistics(userId: string, timezoneOffsetMinutes?: number): Promise<StatisticsResponse> {
    const { now } = this.getDayBoundaries(timezoneOffsetMinutes);
    
    // Weekly statistics bounds: last 7 days inclusive of today
    const startOfWeek = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const endOfWeek = new Date(now);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    return dashboardRepository.getStatisticsData(userId, startOfWeek, endOfWeek);
  }

  public async getTasks(
    userId: string,
    filter: { status?: string; priority?: string },
    page: number,
    limit: number,
  ) {
    return dashboardRepository.getTasks(userId, filter, page, limit);
  }

  public async getEvents(
    userId: string,
    filter: { start?: string; end?: string },
    page: number,
    limit: number,
  ) {
    const start = filter.start ? new Date(filter.start) : undefined;
    const end = filter.end ? new Date(filter.end) : undefined;
    return dashboardRepository.getEvents(userId, { start, end }, page, limit);
  }

  public async getHabits(userId: string, page: number, limit: number) {
    return dashboardRepository.getHabits(userId, page, limit);
  }

  public async getNotes(
    userId: string,
    filter: { isPinned?: boolean; folder?: string },
    page: number,
    limit: number,
  ) {
    return dashboardRepository.getNotes(userId, filter, page, limit);
  }

  public async getNotifications(
    userId: string,
    filter: { isRead?: boolean },
    page: number,
    limit: number,
  ) {
    return dashboardRepository.getNotifications(userId, filter, page, limit);
  }

  public async getActivityLogs(
    userId: string,
    filter: { action?: string },
    page: number,
    limit: number,
  ) {
    return dashboardRepository.getActivityLogs(userId, filter, page, limit);
  }

  public async getFavorites(userId: string, page: number, limit: number) {
    return dashboardRepository.getFavorites(userId, page, limit);
  }

  public async markNotificationRead(userId: string, notificationId: string) {
    return dashboardRepository.markNotificationAsRead(userId, notificationId);
  }
}

export const dashboardService = new DashboardService();
