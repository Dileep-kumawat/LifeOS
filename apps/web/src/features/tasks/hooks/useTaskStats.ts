import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../api/task.api.js';

const STATS_QUERY_KEY = 'task_stats';

export const useTaskStats = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY],
    queryFn: async () => {
      const response = await taskApi.getStats();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch task stats');
      }
      return response.data;
    },
    staleTime: 5000,
  });
};
