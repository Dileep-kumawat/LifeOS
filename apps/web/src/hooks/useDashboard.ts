import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';

// Utility to get current browser timezone offset in minutes
const getTimezoneOffset = () => -new Date().getTimezoneOffset();

export const useDashboardSummary = () => {
  const tz = getTimezoneOffset();
  return useQuery({
    queryKey: ['dashboard', 'summary', tz],
    queryFn: () => dashboardApi.getSummary(tz),
    refetchOnWindowFocus: true,
  });
};

export const useDashboardStatistics = () => {
  const tz = getTimezoneOffset();
  return useQuery({
    queryKey: ['dashboard', 'statistics', tz],
    queryFn: () => dashboardApi.getStatistics(tz),
  });
};

export const useDashboardTasks = (status?: string, priority?: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'tasks', { status, priority, page, limit }],
    queryFn: () => dashboardApi.getTasks({ page, limit, status, priority }),
  });
};

export const useDashboardEvents = (start?: string, end?: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'events', { start, end, page, limit }],
    queryFn: () => dashboardApi.getEvents({ page, limit, start, end }),
  });
};

export const useDashboardHabits = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'habits', { page, limit }],
    queryFn: () => dashboardApi.getHabits({ page, limit }),
  });
};

export const useDashboardNotes = (isPinned?: boolean, folder?: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'notes', { isPinned, folder, page, limit }],
    queryFn: () => dashboardApi.getNotes({ page, limit, isPinned, folder }),
  });
};

export const useDashboardNotifications = (isRead?: boolean, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'notifications', { isRead, page, limit }],
    queryFn: () => dashboardApi.getNotifications({ page, limit, isRead }),
  });
};

export const useDashboardActivity = (action?: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['dashboard', 'activity', { action, page, limit }],
    queryFn: () => dashboardApi.getActivity({ page, limit, action }),
  });
};

export const useDashboardFavorites = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'favorites', { page, limit }],
    queryFn: () => dashboardApi.getFavorites({ page, limit }),
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dashboardApi.markNotificationRead(id),
    onSuccess: () => {
      // Invalidate both summary and notifications queries
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
    },
  });
};
