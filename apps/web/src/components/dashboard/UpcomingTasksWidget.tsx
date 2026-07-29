import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardTasks } from '../../hooks/useDashboard';
import { Link } from 'react-router-dom';

export const UpcomingTasksWidget: React.FC = () => {
  const [page, setPage] = useState(1);
  const [priority, setPriority] = useState<string | undefined>(undefined);
  const limit = 5;

  const { data: response, isLoading, error } = useDashboardTasks(
    'todo',
    priority,
    page,
    limit
  );

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <Badge variant="neutral" className="bg-accent-red-bg text-accent-red-text">Urgent</Badge>;
      case 'high':
        return <Badge variant="neutral" className="bg-accent-yellow-bg text-accent-yellow-text">High</Badge>;
      case 'medium':
        return <Badge variant="neutral" className="bg-accent-blue-bg text-accent-blue-text">Medium</Badge>;
      default:
        return <Badge variant="neutral" className="bg-bone text-muted border border-border">Low</Badge>;
    }
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const tasks = response?.data || [];
  const meta = response?.meta;

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-ink">
              Upcoming Tasks
            </CardTitle>
            <p className="text-[10px] text-muted">High priority items requiring attention</p>
          </div>
          {/* Priority filter */}
          <select
            value={priority || ''}
            onChange={(e) => {
              setPriority(e.target.value || undefined);
              setPage(1);
            }}
            className="text-[10px] bg-bone border border-border rounded px-1.5 py-0.5 font-mono text-charcoal outline-none focus:border-ink"
            aria-label="Filter tasks by priority"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <CardContent className="space-y-2.5 min-h-[190px]">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-2 w-1/4 rounded" />
                </div>
                <Skeleton className="h-4 w-12 rounded-[4px]" />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-xs font-mono text-accent-red-text">Error loading tasks</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <p className="text-xs font-medium text-charcoal">No upcoming tasks</p>
              <p className="text-[10px] text-muted max-w-[200px] mx-auto">
                You're all caught up. Keep up the great work!
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between py-1.5 border-b border-border/40 last:border-b-0 hover:bg-bone/40 px-1 rounded transition-colors duration-150"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-border border border-ink/40 mt-0.5 shrink-0" />
                    <Link
                      to={`/dashboard/tasks`}
                      className="text-xs font-medium text-ink hover:underline truncate block"
                    >
                      {task.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 mt-1 pl-3.5 text-[10px] font-mono text-muted">
                    <span>{formatDueDate(task.dueDate)}</span>
                    {task.labels && task.labels.length > 0 && (
                      <span className="truncate">· {task.labels.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">{getPriorityBadge(task.priority)}</div>
              </div>
            ))
          )}
        </CardContent>
      </div>

      {/* Pagination & Deep Link */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
        <Link
          to="/dashboard/tasks"
          className="text-[10px] font-mono text-muted hover:text-ink font-semibold flex items-center gap-0.5"
        >
          Manage Module
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!meta.hasPrevPage}
              className="px-1.5 py-0.5 border border-border rounded text-[9px] font-mono hover:border-ink disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-[9px] font-mono text-muted">
              {meta.page}/{meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={!meta.hasNextPage}
              className="px-1.5 py-0.5 border border-border rounded text-[9px] font-mono hover:border-ink disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
