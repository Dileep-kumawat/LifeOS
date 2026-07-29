import { ITaskDocument } from '../tasks/models/Task.model.js';
import { IEventDocument } from '../calendar/models/Event.model.js';
import { IHabitDocument } from '../habits/models/Habit.model.js';
import { INoteDocument } from '../notes/models/Note.model.js';
import { INotificationDocument } from '../notifications/models/Notification.model.js';
import { IActivityLogDocument } from '../activity/models/ActivityLog.model.js';
import { IFavoriteDocument } from './models/Favorite.model.js';

export interface TodaySummaryResponse {
  date: string; // ISO String
  greeting: string;
  currentStreak: number;
  tasksDueToday: number;
  tasksCompletedToday: number;
  habitsRemaining: number;
  habitsCompletedToday: number;
  totalHabitsCount: number;
  eventsCountToday: number;
  unreadNotifications: number;
  overallProductivityProgress: number; // 0 to 100
}

export interface ActivityTimelineItem {
  id: string;
  action: string;
  details: any;
  createdAt: string;
}

export interface StatisticsResponse {
  totalTasks: number;
  completedTasks: number;
  activeProjects: number;
  goalsCount: number;
  goalsProgress: number;
  habitCompletionRate: number;
  notesCount: number;
  productivityScore: number;
  weeklyActivity: Array<{ day: string; count: number }>;
}
