import { apiClient } from '../config/apiClient';
import { ApiResponse } from '@lifeos/shared';

// Type definitions for Dashboard responses
export interface TodaySummary {
  date: string;
  greeting: string;
  currentStreak: number;
  tasksDueToday: number;
  tasksCompletedToday: number;
  habitsRemaining: number;
  habitsCompletedToday: number;
  totalHabitsCount: number;
  eventsCountToday: number;
  unreadNotifications: number;
  overallProductivityProgress: number;
}

export interface Statistics {
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

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  projectId?: string;
  labels: string[];
}

export interface EventItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  calendarSource: string;
  reminderStatus: 'none' | 'scheduled' | 'sent';
}

export interface HabitItem {
  id: string;
  name: string;
  streak: number;
  history: string[];
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  isPinned: boolean;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  module: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  details: any;
  createdAt: string;
}

export interface FavoriteItem {
  id: string;
  targetType: 'Project' | 'Note' | 'Page' | 'File' | 'Dashboard';
  targetId: string;
  title: string;
  url: string;
}

export const dashboardApi = {
  getSummary: async (timezoneOffset: number = 0): Promise<ApiResponse<TodaySummary>> => {
    const res = await apiClient.get('/dashboard/summary', { params: { timezoneOffset } });
    return res.data;
  },

  getStatistics: async (timezoneOffset: number = 0): Promise<ApiResponse<Statistics>> => {
    const res = await apiClient.get('/dashboard/statistics', { params: { timezoneOffset } });
    return res.data;
  },

  getTasks: async (params: { page?: number; limit?: number; status?: string; priority?: string }): Promise<ApiResponse<TaskItem[]>> => {
    const res = await apiClient.get('/dashboard/tasks', { params });
    return res.data;
  },

  getEvents: async (params: { page?: number; limit?: number; start?: string; end?: string }): Promise<ApiResponse<EventItem[]>> => {
    const res = await apiClient.get('/dashboard/events', { params });
    return res.data;
  },

  getHabits: async (params: { page?: number; limit?: number }): Promise<ApiResponse<HabitItem[]>> => {
    const res = await apiClient.get('/dashboard/habits', { params });
    return res.data;
  },

  getNotes: async (params: { page?: number; limit?: number; isPinned?: boolean; folder?: string }): Promise<ApiResponse<NoteItem[]>> => {
    const res = await apiClient.get('/dashboard/notes', { params });
    return res.data;
  },

  getNotifications: async (params: { page?: number; limit?: number; isRead?: boolean }): Promise<ApiResponse<NotificationItem[]>> => {
    const res = await apiClient.get('/dashboard/notifications', { params });
    return res.data;
  },

  getActivity: async (params: { page?: number; limit?: number; action?: string }): Promise<ApiResponse<ActivityItem[]>> => {
    const res = await apiClient.get('/dashboard/activity', { params });
    return res.data;
  },

  getFavorites: async (params: { page?: number; limit?: number }): Promise<ApiResponse<FavoriteItem[]>> => {
    const res = await apiClient.get('/dashboard/favorites', { params });
    return res.data;
  },

  markNotificationRead: async (id: string): Promise<ApiResponse<NotificationItem>> => {
    const res = await apiClient.patch(`/dashboard/notifications/${id}/read`);
    return res.data;
  },
};
