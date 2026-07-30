import { create } from 'zustand';
import { TaskFilters, TaskSortOptions, TaskStatus, TaskPriority } from '@lifeos/shared';

interface TaskState {
  activeView: 'list' | 'kanban' | 'calendar';
  filters: TaskFilters;
  sort: TaskSortOptions;
  selectedTaskIds: string[];
  activeTaskId: string | null;
  isCreateModalOpen: boolean;
  isLabelManagerOpen: boolean;

  // Actions
  setView: (view: 'list' | 'kanban' | 'calendar') => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  toggleStatusFilter: (status: TaskStatus) => void;
  togglePriorityFilter: (priority: TaskPriority) => void;
  toggleLabelFilter: (labelId: string) => void;
  resetFilters: () => void;
  setSort: (sort: TaskSortOptions) => void;
  selectTask: (id: string) => void;
  deselectTask: (id: string) => void;
  toggleSelectTask: (id: string) => void;
  clearSelection: () => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  setCreateModalOpen: (open: boolean) => void;
  setLabelManagerOpen: (open: boolean) => void;
}

const initialFilters: TaskFilters = {
  status: undefined,
  priority: undefined,
  labelIds: [],
  isFavorite: undefined,
  isArchived: false,
  isTrashed: false,
  parentTaskId: null, // by default only list top level tasks
  search: '',
};

export const useTaskStore = create<TaskState>((set) => ({
  activeView: 'list',
  filters: initialFilters,
  sort: { field: 'createdAt', direction: 'desc' },
  selectedTaskIds: [],
  activeTaskId: null,
  isCreateModalOpen: false,
  isLabelManagerOpen: false,

  setView: (activeView) => set({ activeView }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  toggleStatusFilter: (status) =>
    set((state) => {
      const current = state.filters.status;
      let next: TaskStatus | TaskStatus[] | undefined;

      if (!current) {
        next = status;
      } else if (Array.isArray(current)) {
        next = current.includes(status)
          ? current.filter((s) => s !== status)
          : [...current, status];
        if (next.length === 0) next = undefined;
      } else {
        next = current === status ? undefined : [current, status];
      }

      return { filters: { ...state.filters, status: next } };
    }),

  togglePriorityFilter: (priority) =>
    set((state) => {
      const current = state.filters.priority;
      let next: TaskPriority | TaskPriority[] | undefined;

      if (!current) {
        next = priority;
      } else if (Array.isArray(current)) {
        next = current.includes(priority)
          ? current.filter((p) => p !== priority)
          : [...current, priority];
        if (next.length === 0) next = undefined;
      } else {
        next = current === priority ? undefined : [current, priority];
      }

      return { filters: { ...state.filters, priority: next } };
    }),

  toggleLabelFilter: (labelId) =>
    set((state) => {
      const currentIds = state.filters.labelIds || [];
      const nextIds = currentIds.includes(labelId)
        ? currentIds.filter((id) => id !== labelId)
        : [...currentIds, labelId];
      return { filters: { ...state.filters, labelIds: nextIds } };
    }),

  resetFilters: () => set({ filters: initialFilters }),

  setSort: (sort) => set({ sort }),

  selectTask: (id) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.includes(id)
        ? state.selectedTaskIds
        : [...state.selectedTaskIds, id],
    })),

  deselectTask: (id) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.filter((taskId) => taskId !== id),
    })),

  toggleSelectTask: (id) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.includes(id)
        ? state.selectedTaskIds.filter((taskId) => taskId !== id)
        : [...state.selectedTaskIds, id],
    })),

  clearSelection: () => set({ selectedTaskIds: [] }),

  openDrawer: (activeTaskId) => set({ activeTaskId }),
  closeDrawer: () => set({ activeTaskId: null }),

  setCreateModalOpen: (isCreateModalOpen) => set({ isCreateModalOpen }),
  setLabelManagerOpen: (isLabelManagerOpen) => set({ isLabelManagerOpen }),
}));
