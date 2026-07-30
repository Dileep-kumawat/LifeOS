import { apiClient } from '../../../config/apiClient.js';
import { ApiResponse, IComment, CreateCommentInput, UpdateCommentInput } from '@lifeos/shared';

export const commentApi = {
  list: async (taskId: string): Promise<ApiResponse<IComment[]>> => {
    const res = await apiClient.get(`/tasks/${taskId}/comments`);
    return res.data;
  },

  create: async (taskId: string, data: CreateCommentInput): Promise<ApiResponse<IComment>> => {
    const res = await apiClient.post(`/tasks/${taskId}/comments`, data);
    return res.data;
  },

  update: async (taskId: string, commentId: string, data: UpdateCommentInput): Promise<ApiResponse<IComment>> => {
    const res = await apiClient.put(`/tasks/${taskId}/comments/${commentId}`, data);
    return res.data;
  },

  delete: async (taskId: string, commentId: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
    return res.data;
  },
};
