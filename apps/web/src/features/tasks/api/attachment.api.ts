import { apiClient } from '../../../config/apiClient.js';
import { ApiResponse, IAttachment } from '@lifeos/shared';

export interface AttachmentUploadPayload {
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  storageKey: string;
}

export const attachmentApi = {
  list: async (taskId: string): Promise<ApiResponse<IAttachment[]>> => {
    const res = await apiClient.get(`/tasks/${taskId}/attachments`);
    return res.data;
  },

  upload: async (taskId: string, data: AttachmentUploadPayload): Promise<ApiResponse<IAttachment>> => {
    const res = await apiClient.post(`/tasks/${taskId}/attachments`, data);
    return res.data;
  },

  delete: async (taskId: string, attachmentId: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    return res.data;
  },
};
