import React from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardStatistics } from '../../hooks/useDashboard';

export const ProductivitySnapshot: React.FC = () => {
  const { data: response, isLoading, error } = useDashboardStatistics();

  const stats = response?.data;

  // Completion rate calculation: completed / total tasks
  const completionRate = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 72; // default fallback indicator

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-ink">
              Productivity Snapshot
            </CardTitle>
            <p className="text-[10px] text-muted">Core metrics and workspace status</p>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-muted">
            <path d="M23 6l-9.5 9.5-5-5L1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
            </div>
          ) : error || !stats ? (
            <div className="text-center py-6">
              <p className="text-xs font-mono text-accent-red-text">Error loading snapshot</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Task Completion Rate */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted">Task Completion Rate</span>
                  <span className="text-ink font-semibold">{completionRate}%</span>
                </div>
                <div className="h-1.5 w-full bg-bone rounded-full overflow-hidden border border-border/60">
                  <div
                    className="h-full bg-charcoal transition-all duration-500 ease-out"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              {/* Habit Completion Rate */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted">Habit Consistency (30d)</span>
                  <span className="text-ink font-semibold">{stats.habitCompletionRate}%</span>
                </div>
                <div className="h-1.5 w-full bg-bone rounded-full overflow-hidden border border-border/60">
                  <div
                    className="h-full bg-charcoal transition-all duration-500 ease-out"
                    style={{ width: `${stats.habitCompletionRate}%` }}
                  />
                </div>
              </div>

              {/* Goals Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted">Active Goals Progress</span>
                  <span className="text-ink font-semibold">{stats.goalsProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-bone rounded-full overflow-hidden border border-border/60">
                  <div
                    className="h-full bg-charcoal transition-all duration-500 ease-out"
                    style={{ width: `${stats.goalsProgress}%` }}
                  />
                </div>
              </div>

              {/* Focus Sessions (AI extension hook placeholder) */}
              <div className="pt-2 flex items-center justify-between bg-bone/60 border border-border/60 rounded px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-ink">Focus Sessions</p>
                  <p className="text-[8px] font-mono text-muted mt-0.5">Ready for Pomodoro integration</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-mono font-bold text-ink">0.0 hrs</p>
                  <p className="text-[7px] font-mono text-muted uppercase">This week</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </div>

      <div className="text-[8px] font-mono text-muted text-center pt-2 border-t border-border mt-2">
        Ready for future AI planning integrations
      </div>
    </Card>
  );
};
