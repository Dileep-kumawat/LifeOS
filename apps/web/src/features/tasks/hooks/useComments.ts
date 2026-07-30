import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '../api/comment.api.js';
import { CreateCommentInput, UpdateCommentInput } from '@lifeos/shared';

const COMMENTS_QUERY_KEY = 'comments';

export const useComments = (taskId: string | null) => {
  return useQuery({
    queryKey: [COMMENTS_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const response = await commentApi.list(taskId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch comments');
      }
      return response.data;
    },
    enabled: !!taskId,
  });
};

export const useCreateComment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => commentApi.create(taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, taskId] });
    },
  });
};

export const useUpdateComment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCommentInput }) =>
      commentApi.update(taskId, commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, taskId] });
    },
  });
};

export const useDeleteComment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentApi.delete(taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, taskId] });
    },
  });
};
