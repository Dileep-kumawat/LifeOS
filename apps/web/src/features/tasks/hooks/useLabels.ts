import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labelApi } from '../api/label.api.js';
import { CreateLabelInput, UpdateLabelInput } from '@lifeos/shared';

const LABELS_QUERY_KEY = 'labels';

export const useLabels = () => {
  return useQuery({
    queryKey: [LABELS_QUERY_KEY],
    queryFn: async () => {
      const response = await labelApi.list();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch labels');
      }
      return response.data;
    },
  });
};

export const useCreateLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLabelInput) => labelApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LABELS_QUERY_KEY] });
    },
  });
};

export const useUpdateLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLabelInput }) => labelApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LABELS_QUERY_KEY] });
    },
  });
};

export const useDeleteLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => labelApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LABELS_QUERY_KEY] });
    },
  });
};
