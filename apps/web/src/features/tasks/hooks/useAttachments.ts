import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentApi, AttachmentUploadPayload } from '../api/attachment.api.js';

const ATTACHMENTS_QUERY_KEY = 'attachments';

export const useAttachments = (taskId: string | null) => {
  return useQuery({
    queryKey: [ATTACHMENTS_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const response = await attachmentApi.list(taskId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch attachments');
      }
      return response.data;
    },
    enabled: !!taskId,
  });
};

export const useUploadAttachment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AttachmentUploadPayload) => attachmentApi.upload(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTACHMENTS_QUERY_KEY, taskId] });
    },
  });
};

export const useDeleteAttachment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => attachmentApi.delete(taskId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTACHMENTS_QUERY_KEY, taskId] });
    },
  });
};
