import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Target
} from "lucide-react";
import type { DailySummary } from "@lifeos/shared";
import { Skeleton } from "../../../components/ui/Skeleton";

export interface DailySummaryCardProps {
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  generated?: boolean;
  deliveryTime?: string;
  summary?: DailySummary | null;
}

export function DailySummaryCard({
  isLoading = false,
  isError = false,
  onRetry,
  generated = true,
  deliveryTime = "07:00",
  summary
}: DailySummaryCardProps) {
  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Could not load daily summary</h3>
              <p className="text-sm text-muted-foreground">
                An error occurred while generating or fetching today's summary.
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!generated || !summary) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Today's Daily Summary</h3>
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  Scheduled
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your AI Daily Summary will be generated at{" "}
                <span className="font-semibold text-foreground">{deliveryTime}</span>.
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              <RefreshCw className="size-3.5" />
              Generate Now
            </button>
          )}
        </div>
      </div>
    );
  }

  const { yesterdayCompleted, todaySchedule, topPriorities, date } = summary;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-6 shadow-md transition-all hover:shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-violet-500 text-primary-foreground shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Daily Summary</h2>
            <p className="text-xs text-muted-foreground">{date} Overview & Insights</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Clock className="size-3.5" />
          Generated for Today
        </span>
      </div>

      {/* Grid Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top 3 Priorities */}
        <div className="flex flex-col gap-3 rounded-xl bg-accent/30 p-4 border border-border/40">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
            <Target className="size-4" />
            Top 3 Priorities
          </div>
          {topPriorities.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No specific priorities set for today.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {topPriorities.map((priority, index) => (
                <li key={index} className="flex items-start gap-2.5 group">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {priority.title}
                    </p>
                    {priority.rationale && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {priority.rationale}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Yesterday's Accomplishments */}
        <div className="flex flex-col gap-3 rounded-xl bg-accent/30 p-4 border border-border/40">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            <CheckCircle2 className="size-4" />
            Yesterday's Accomplishments
          </div>
          {yesterdayCompleted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <p className="text-xs text-muted-foreground italic">
                No completed habits recorded yesterday.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto max-h-44 pr-1">
              {yesterdayCompleted.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                  <span className="truncate">{item.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Today's Schedule at a Glance */}
        <div className="flex flex-col gap-3 rounded-xl bg-accent/30 p-4 border border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
              <Calendar className="size-4" />
              Today's Schedule
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {todaySchedule.length} event{todaySchedule.length === 1 ? "" : "s"}
            </span>
          </div>
          {todaySchedule.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No calendar events scheduled for today.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto max-h-44 pr-1">
              {todaySchedule.slice(0, 4).map((evt, idx) => {
                const startTimeStr = new Date(evt.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                });
                return (
                  <li key={idx} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground truncate">{evt.title}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/60">
                      {evt.isAllDay ? "All Day" : startTimeStr}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
