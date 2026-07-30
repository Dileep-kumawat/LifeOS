import React, { useCallback } from 'react';
import { useTasks } from '../features/tasks/hooks/useTasks.js';
import { useTaskStore } from '../features/tasks/store/useTaskStore.js';

import { TaskStats } from '../features/tasks/components/TaskStats.js';
import { TaskFilterPanel } from '../features/tasks/components/TaskFilterPanel.js';
import { TaskSearchBar } from '../features/tasks/components/TaskSearchBar.js';
import { TaskBulkToolbar } from '../features/tasks/components/TaskBulkToolbar.js';
import { TaskDetailDrawer } from '../features/tasks/components/TaskDetailDrawer.js';
import { TaskCreateModal } from '../features/tasks/components/TaskCreateModal.js';
import { LabelManager } from '../features/tasks/components/LabelManager.js';
import { TaskListView } from '../features/tasks/components/views/TaskListView.js';
import { TaskKanbanView } from '../features/tasks/components/views/TaskKanbanView.js';
import { TaskCalendarView } from '../features/tasks/components/views/TaskCalendarView.js';
import { TaskListSkeleton } from '../features/tasks/components/skeletons/TaskListSkeleton.js';
import { TaskKanbanSkeleton } from '../features/tasks/components/skeletons/TaskKanbanSkeleton.js';
import { NoTasksEmptyState } from '../features/tasks/components/empty-states/NoTasksEmptyState.js';
import { NoResultsEmptyState } from '../features/tasks/components/empty-states/NoResultsEmptyState.js';

import { List, KanbanSquare, CalendarDays, Plus, ArrowUpDown } from 'lucide-react';

const VIEW_OPTIONS = [
  { key: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
  { key: 'kanban', label: 'Board', icon: <KanbanSquare className="w-3.5 h-3.5" /> },
  { key: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-3.5 h-3.5" /> },
] as const;

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest First' },
  { value: 'createdAt:asc', label: 'Oldest First' },
  { value: 'dueDate:asc', label: 'Due Date ↑' },
  { value: 'dueDate:desc', label: 'Due Date ↓' },
  { value: 'priority:asc', label: 'Priority ↑' },
  { value: 'title:asc', label: 'Title A–Z' },
];

const TasksPage: React.FC = () => {
  const {
    activeView,
    setView,
    filters,
    sort,
    setFilters,
    setSort,
    setCreateModalOpen,
    resetFilters,
  } = useTaskStore();

  const { data, isLoading, isError } = useTasks(filters, sort);
  const tasks = data?.tasks ?? [];
  const hasFiltersActive =
    !!filters.status ||
    !!filters.priority ||
    (filters.labelIds && filters.labelIds.length > 0) ||
    !!filters.isFavorite ||
    !!filters.isArchived ||
    !!filters.isTrashed ||
    !!filters.search;

  const handleSearchChange = useCallback(
    (value: string) => setFilters({ search: value }),
    [setFilters]
  );

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [field, direction] = e.target.value.split(':');
    setSort({ field: field as any, direction: direction as 'asc' | 'desc' });
  };

  return (
    <div className="flex h-full overflow-hidden bg-canvas font-sans">
      {/* ── Sidebar Filter Panel ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 border-r border-border bg-surface overflow-y-auto p-4 space-y-4">
        <TaskFilterPanel />
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <header className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between flex-shrink-0 gap-4">
          {/* Page title + view switcher */}
          <div className="flex items-center space-x-4 min-w-0">
            <h1 className="font-editorial text-2xl text-ink whitespace-nowrap">Tasks</h1>

            {/* View toggle buttons */}
            <div className="hidden sm:flex items-center border border-border rounded overflow-hidden bg-bone">
              {VIEW_OPTIONS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeView === v.key
                      ? 'bg-ink text-surface'
                      : 'text-muted hover:text-charcoal hover:bg-bone/80'
                  }`}
                >
                  {v.icon}
                  <span className="hidden lg:inline">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search + Sort + Create */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <TaskSearchBar
              value={filters.search || ''}
              onChange={handleSearchChange}
            />

            <div className="relative hidden lg:flex items-center">
              <ArrowUpDown className="absolute left-2 w-3 h-3 text-muted pointer-events-none" />
              <select
                onChange={handleSortChange}
                className="pl-6 pr-2 py-1.5 border border-border rounded text-xs text-charcoal bg-surface focus:border-charcoal focus:ring-0 outline-none appearance-none cursor-pointer font-medium"
                defaultValue="createdAt:desc"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-ink text-surface text-xs font-medium rounded border border-ink hover:bg-charcoal active:scale-95 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>New Task</span>
            </button>
          </div>
        </header>

        {/* Stats Strip */}
        <div className="px-6 pt-5">
          <TaskStats />
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            activeView === 'kanban' ? (
              <TaskKanbanSkeleton />
            ) : (
              <TaskListSkeleton />
            )
          ) : isError ? (
            <div className="flex items-center justify-center py-20 text-sm text-accent-red-text">
              Failed to load tasks. Please try refreshing the page.
            </div>
          ) : tasks.length === 0 && !hasFiltersActive ? (
            <NoTasksEmptyState onCreateClick={() => setCreateModalOpen(true)} />
          ) : tasks.length === 0 && hasFiltersActive ? (
            <NoResultsEmptyState onClearFilters={resetFilters} />
          ) : activeView === 'list' ? (
            <TaskListView tasks={tasks} />
          ) : activeView === 'kanban' ? (
            <TaskKanbanView tasks={tasks} />
          ) : (
            <TaskCalendarView tasks={tasks} />
          )}
        </div>
      </main>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      <TaskDetailDrawer />
      <TaskCreateModal />
      <LabelManager />
      <TaskBulkToolbar />
    </div>
  );
};

export default TasksPage;
