import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../api/task.api.js';
import { TaskFilters, TaskSortOptions } from '@lifeos/shared';

export const TASKS_QUERY_KEY = 'tasks';

export const useTasks = (
  filters: TaskFilters = {},
  sort?: TaskSortOptions,
  page = 1,
  limit = 25
) => {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, { filters, sort, page, limit }],
    queryFn: async () => {
      const response = await taskApi.list(filters, sort, page, limit);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch tasks');
      }
      return {
        tasks: response.data,
        meta: response.meta,
      };
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });
};

export const useTask = (id: string | null) => {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await taskApi.getById(id);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch task');
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 10000,
  });
};
