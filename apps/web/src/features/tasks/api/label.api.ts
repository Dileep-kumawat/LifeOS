import { apiClient } from '../../../config/apiClient.js';
import { ApiResponse, ILabel, CreateLabelInput, UpdateLabelInput } from '@lifeos/shared';

export const labelApi = {
  list: async (): Promise<ApiResponse<ILabel[]>> => {
    const res = await apiClient.get('/tasks/labels');
    return res.data;
  },

  create: async (data: CreateLabelInput): Promise<ApiResponse<ILabel>> => {
    const res = await apiClient.post('/tasks/labels', data);
    return res.data;
  },

  update: async (id: string, data: UpdateLabelInput): Promise<ApiResponse<ILabel>> => {
    const res = await apiClient.put(`/tasks/labels/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/tasks/labels/${id}`);
    return res.data;
  },
};
