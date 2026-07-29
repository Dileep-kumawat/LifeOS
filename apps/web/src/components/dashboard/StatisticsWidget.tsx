import React from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardStatistics } from '../../hooks/useDashboard';

export const StatisticsWidget: React.FC = () => {
  const { data: response, isLoading, error } = useDashboardStatistics();

  const stats = response?.data;

  // Find max activity count to scale chart heights
  const maxActivity = stats?.weeklyActivity.reduce((max, day) => Math.max(max, day.count), 0) || 1;

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-ink">
              Productivity Overview
            </CardTitle>
            <p className="text-[10px] text-muted">Weekly workspace statistics & score</p>
          </div>
          {stats && (
            <div className="bg-ink text-surface rounded-[4px] px-2 py-0.5 text-xs font-mono font-bold">
              Score {stats.productivityScore}
            </div>
          )}
        </div>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-bone border border-border p-2.5 rounded">
                    <Skeleton className="h-2.5 w-10 mb-1 rounded" />
                    <Skeleton className="h-4 w-6 rounded" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-24 w-full rounded" />
            </div>
          ) : error || !stats ? (
            <div className="text-center py-6">
              <p className="text-xs font-mono text-accent-red-text">Error loading statistics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Counters Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-bone border border-border/80 p-2 rounded">
                  <p className="text-[9px] font-mono text-muted uppercase">Completed Tasks</p>
                  <p className="text-sm font-semibold text-ink mt-0.5">{stats.completedTasks}</p>
                </div>
                <div className="bg-bone border border-border/80 p-2 rounded">
                  <p className="text-[9px] font-mono text-muted uppercase">Projects Active</p>
                  <p className="text-sm font-semibold text-ink mt-0.5">{stats.activeProjects}</p>
                </div>
                <div className="bg-bone border border-border/80 p-2 rounded">
                  <p className="text-[9px] font-mono text-muted uppercase">Goals Progress</p>
                  <p className="text-sm font-semibold text-ink mt-0.5">{stats.goalsProgress}%</p>
                </div>
              </div>

              {/* Weekly activity bar chart */}
              <div className="pt-2">
                <p className="text-[10px] font-mono text-muted mb-3 uppercase tracking-wider text-center">
                  Workspace Actions (Last 7 Days)
                </p>
                <div className="flex justify-between items-end h-20 px-2">
                  {stats.weeklyActivity.map((act) => {
                    const heightPercent = (act.count / maxActivity) * 100;
                    return (
                      <div key={act.day} className="flex flex-col items-center group w-8">
                        {/* Tooltip on hover */}
                        <span className="opacity-0 group-hover:opacity-100 bg-ink text-surface text-[8px] font-mono rounded px-1 py-0.5 -translate-y-1 transition-opacity duration-150 absolute pointer-events-none mb-10">
                          {act.count} logs
                        </span>
                        {/* Bar */}
                        <div
                          className="w-3 bg-charcoal/80 group-hover:bg-ink rounded-t-[1px] transition-all duration-300"
                          style={{ height: `${Math.max(heightPercent, 5)}%`, minHeight: '3px' }}
                        />
                        {/* Label */}
                        <span className="text-[8px] font-mono text-muted mt-1.5">{act.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </div>

      <div className="text-[9px] font-mono text-muted text-center pt-2 border-t border-border mt-2">
        Metrics computed dynamically from active collections
      </div>
    </Card>
  );
};
