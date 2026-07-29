import React from 'react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { TodaySummary } from '../../api/dashboard.api';

interface TodaySummaryWidgetProps {
  summary?: TodaySummary;
  isLoading: boolean;
  error: any;
}

export const TodaySummaryWidget: React.FC<TodaySummaryWidgetProps> = ({ summary, isLoading, error }) => {
  const formatDate = (isoString?: string) => {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card padding="lg" className="h-full flex flex-col justify-between">
        <div>
          <Skeleton className="h-4 w-32 mb-2 rounded" />
          <Skeleton className="h-8 w-48 mb-6 rounded" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-2 w-full rounded" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card padding="lg" className="h-full flex items-center justify-center border-dashed border-accent-red-text/30">
        <div className="text-center space-y-1">
          <p className="text-xs font-mono text-accent-red-text">Error loading today's overview</p>
          <p className="text-[10px] text-muted">Please refresh the page to retry.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <p className="text-xs text-muted font-mono tracking-wider uppercase mb-1">
          {formatDate(summary.date)}
        </p>
        <h2 className="font-serif text-3xl font-light text-ink tracking-tight leading-none mb-3">
          {summary.greeting}, dileep
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-charcoal bg-bone w-fit px-2 py-0.5 rounded border border-border mt-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-accent-yellow-text">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
          </svg>
          <span className="font-mono font-medium">{summary.currentStreak} day streak</span>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-muted font-mono">Tasks Due</p>
            <p className="text-lg font-sans font-semibold text-ink">{summary.tasksDueToday}</p>
          </div>
          <div>
            <p className="text-muted font-mono">Completed</p>
            <p className="text-lg font-sans font-semibold text-accent-green-text">{summary.tasksCompletedToday}</p>
          </div>
          <div>
            <p className="text-muted font-mono">Habits Left</p>
            <p className="text-lg font-sans font-semibold text-ink">{summary.habitsRemaining}</p>
          </div>
          <div>
            <p className="text-muted font-mono">Events Today</p>
            <p className="text-lg font-sans font-semibold text-ink">{summary.eventsCountToday}</p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">Today's Focus</span>
            <span className="text-ink font-semibold">{summary.overallProductivityProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-bone rounded-full overflow-hidden border border-border/60">
            <div
              className="h-full bg-ink transition-all duration-500 ease-out"
              style={{ width: `${summary.overallProductivityProgress}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
