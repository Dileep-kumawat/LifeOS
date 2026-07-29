import React from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardActivity } from '../../hooks/useDashboard';

export const RecentActivityTimeline: React.FC = () => {
  const { data: response, isLoading, error } = useDashboardActivity(undefined, 1, 6);

  const formatActivityText = (act: { action: string; details: any }) => {
    const details = act.details || {};
    const title = details.title || details.name || '';
    
    switch (act.action) {
      case 'task_created':
        return `Created task: "${title}"`;
      case 'task_completed':
        return `Completed task: "${title}"`;
      case 'habit_completed':
        return `Checked off habit: "${title}"`;
      case 'note_edited':
        return `Edited notebook: "${title}"`;
      case 'goal_created':
        return `Set goal targets: "${title}"`;
      case 'goal_completed':
        return `Achieved goal milestones: "${title}"`;
      default:
        return `Performed system action: ${act.action.replace('_', ' ')}`;
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'task_created':
      case 'task_completed':
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        );
      case 'habit_completed':
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'note_edited':
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        );
      default:
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        );
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const logs = response?.data || [];

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="mb-4 border-b border-border pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight text-ink">
            Activity History
          </CardTitle>
          <p className="text-[10px] text-muted">Chronological audit logs of recent actions</p>
        </div>

        <CardContent className="min-h-[190px] relative pl-4 border-l border-border/80 ml-2.5 space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="relative py-1">
                <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-bone border border-border" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-2 w-1/4 rounded" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="text-center py-6 -ml-4">
              <p className="text-xs font-mono text-accent-red-text">Error loading logs</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 space-y-1 -ml-4">
              <p className="text-xs font-medium text-charcoal">No activity logged</p>
              <p className="text-[10px] text-muted max-w-[200px] mx-auto">
                Interact with modules to generate logs.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="relative group">
                {/* Timeline node */}
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-bone border border-border group-hover:border-charcoal group-hover:bg-ink group-hover:text-surface flex items-center justify-center text-[5px] text-transparent transition-all duration-150">
                  {getActivityIcon(log.action)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink leading-tight">
                    {formatActivityText(log)}
                  </p>
                  <p className="text-[9px] font-mono text-muted mt-0.5">
                    {formatTimeAgo(log.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </div>

      <div className="text-[9px] font-mono text-muted text-center pt-2 border-t border-border mt-2">
        Audit log updates in real-time
      </div>
    </Card>
  );
};
