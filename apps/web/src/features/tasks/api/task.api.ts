import { apiClient } from '../../../config/apiClient.js';
import {
  ApiResponse,
  ITask,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskSortOptions,
  BulkTaskOperation,
  TaskStatistics,
} from '@lifeos/shared';

export const taskApi = {
  list: async (
    filters: TaskFilters = {},
    sort?: TaskSortOptions,
    page = 1,
    limit = 25
  ): Promise<ApiResponse<ITask[]>> => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());

    if (sort) {
      params.set('sortField', sort.field);
      params.set('sortDir', sort.direction);
    }

    if (filters.status) {
      params.set('status', Array.isArray(filters.status) ? filters.status.join(',') : filters.status);
    }
    if (filters.priority) {
      params.set('priority', Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority);
    }
    if (filters.labelIds && filters.labelIds.length > 0) {
      params.set('labelIds', filters.labelIds.join(','));
    }
    if (filters.isFavorite !== undefined) {
      params.set('isFavorite', filters.isFavorite.toString());
    }
    if (filters.isArchived !== undefined) {
      params.set('isArchived', filters.isArchived.toString());
    }
    if (filters.isTrashed !== undefined) {
      params.set('isTrashed', filters.isTrashed.toString());
    }
    if (filters.dueDateFrom) params.set('dueDateFrom', filters.dueDateFrom);
    if (filters.dueDateTo) params.set('dueDateTo', filters.dueDateTo);
    if (filters.parentTaskId !== undefined) {
      params.set('parentTaskId', filters.parentTaskId === null ? 'null' : filters.parentTaskId);
    }
    if (filters.goalId) params.set('goalId', filters.goalId);
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.search) params.set('search', filters.search);

    const res = await apiClient.get('/tasks', { params });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<ITask>> => {
    const res = await apiClient.get(`/tasks/${id}`);
    return res.data;
  },

  create: async (data: CreateTaskInput): Promise<ApiResponse<ITask>> => {
    const res = await apiClient.post('/tasks', data);
    return res.data;
  },

  update: async (id: string, data: UpdateTaskInput): Promise<ApiResponse<ITask>> => {
    const res = await apiClient.put(`/tasks/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/tasks/${id}`);
    return res.data;
  },

  duplicate: async (id: string): Promise<ApiResponse<ITask>> => {
    const res = await apiClient.post(`/tasks/${id}/duplicate`);
    return res.data;
  },

  archive: async (id: string): Promise<ApiResponse<ITask>> => {
    const res = await apiClient.post(`/tasks/${id}/archive`);
    return res.data;
  },

  restore: async (id: string): Promise<ApiResponse<ITask>> => {
    const res = await apiClient.post(`/tasks/${id}/restore`);
    return res.data;
  },

  permanentDelete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/tasks/${id}/permanent`);
    return res.data;
  },

  bulk: async (data: BulkTaskOperation): Promise<ApiResponse<{ count: number }>> => {
    const res = await apiClient.post('/tasks/bulk', data);
    return res.data;
  },

  search: async (q: string, filters: { status?: string; priority?: string } = {}): Promise<ApiResponse<ITask[]>> => {
    const params = new URLSearchParams({ q });
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);

    const res = await apiClient.get('/tasks/search', { params });
    return res.data;
  },

  getStats: async (): Promise<ApiResponse<TaskStatistics>> => {
    const res = await apiClient.get('/tasks/stats');
    return res.data;
  },

  reorder: async (tasks: { id: string; sortOrder: number }[]): Promise<ApiResponse<null>> => {
    const res = await apiClient.patch('/tasks/reorder', { tasks });
    return res.data;
  },
};
