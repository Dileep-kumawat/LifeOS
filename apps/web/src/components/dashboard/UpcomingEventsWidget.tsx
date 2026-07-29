import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardEvents } from '../../hooks/useDashboard';
import { Link } from 'react-router-dom';

export const UpcomingEventsWidget: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 4;

  const { data: response, isLoading, error } = useDashboardEvents(
    undefined,
    undefined,
    page,
    limit
  );

  const formatEventTime = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  };

  const events = response?.data || [];
  const meta = response?.meta;

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-ink">
              Schedule & Events
            </CardTitle>
            <p className="text-[10px] text-muted">Upcoming meetings, routines, and sessions</p>
          </div>
          <Badge variant="neutral" className="bg-bone text-muted border border-border tracking-wider text-[9px] uppercase">
            Local Cal
          </Badge>
        </div>

        <CardContent className="space-y-2.5 min-h-[190px]">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-1/2 rounded" />
                  <Skeleton className="h-2 w-1/3 rounded" />
                </div>
                <Skeleton className="h-3 w-8 rounded" />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-xs font-mono text-accent-red-text">Error loading schedule</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <p className="text-xs font-medium text-charcoal">No upcoming events</p>
              <p className="text-[10px] text-muted max-w-[200px] mx-auto">
                Your calendar is empty. Enjoy the quiet time!
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="py-2 border-b border-border/40 last:border-b-0 px-1 rounded hover:bg-bone/40 transition-colors duration-150 flex items-start justify-between"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-xs font-medium text-ink truncate">{event.title}</p>
                  <p className="text-[10px] font-mono text-muted mt-0.5">
                    {formatEventTime(event.startTime, event.endTime)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  {event.reminderStatus !== 'none' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green-text" title="Reminders active" />
                  )}
                  <span className="text-[9px] font-mono text-muted bg-bone border border-border px-1.5 py-0.5 rounded uppercase">
                    {event.calendarSource}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </div>

      {/* Pagination & Deep Link */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
        <Link
          to="/dashboard/calendar"
          className="text-[10px] font-mono text-muted hover:text-ink font-semibold flex items-center gap-0.5"
        >
          View Calendar
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
