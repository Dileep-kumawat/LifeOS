import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardNotifications, useMarkNotificationRead } from '../../hooks/useDashboard';

export const NotificationsWidget: React.FC = () => {
  const [page, setPage] = useState(1);
  const [isRead, setIsRead] = useState<boolean | undefined>(false); // default to unread
  const limit = 4;

  const { data: response, isLoading, error } = useDashboardNotifications(
    isRead,
    page,
    limit
  );

  const markReadMutation = useMarkNotificationRead();

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-accent-red-text bg-accent-red-bg border border-accent-red-text/10';
      case 'medium': return 'text-accent-yellow-text bg-accent-yellow-bg border border-accent-yellow-text/10';
      default: return 'text-muted bg-bone border border-border';
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ', ' +
           date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const notifications = response?.data || [];
  const meta = response?.meta;

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-ink">
              System Notifications
            </CardTitle>
            <p className="text-[10px] text-muted">System actions and module reminders</p>
          </div>
          {/* Read Filter Toggles */}
          <div className="flex items-center gap-1 bg-bone p-0.5 rounded border border-border">
            <button
              onClick={() => { setIsRead(false); setPage(1); }}
              className={['px-2 py-0.5 rounded-[3px] text-[9px] font-mono transition-all duration-100', !isRead ? 'bg-surface text-ink font-semibold border border-border shadow-[0_1px_1px_rgba(0,0,0,0.02)]' : 'text-muted hover:text-charcoal'].join(' ')}
            >
              Unread
            </button>
            <button
              onClick={() => { setIsRead(true); setPage(1); }}
              className={['px-2 py-0.5 rounded-[3px] text-[9px] font-mono transition-all duration-100', isRead === true ? 'bg-surface text-ink font-semibold border border-border shadow-[0_1px_1px_rgba(0,0,0,0.02)]' : 'text-muted hover:text-charcoal'].join(' ')}
            >
              Read
            </button>
          </div>
        </div>

        <CardContent className="space-y-2.5 min-h-[190px]">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between py-1.5 border-b border-border/40">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-2/3 rounded" />
                  <Skeleton className="h-2 w-1/3 rounded" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-xs font-mono text-accent-red-text">Error loading notifications</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <p className="text-xs font-medium text-charcoal">No notifications found</p>
              <p className="text-[10px] text-muted max-w-[200px] mx-auto">
                {isRead ? 'You have no read messages.' : "You're all caught up on unread alerts."}
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={[
                  'p-2 rounded border transition-all duration-150 flex items-start justify-between group',
                  notif.isRead
                    ? 'bg-surface border-border/40 hover:bg-bone/20'
                    : 'bg-bone/80 border-border hover:bg-bone hover:border-charcoal/30',
                ].join(' ')}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className={['text-[8px] font-mono uppercase tracking-wider px-1 py-0.5 rounded-[2px]', getPriorityColor(notif.priority)].join(' ')}>
                      {notif.priority}
                    </span>
                    <span className="text-[9px] font-mono text-muted uppercase">
                      {notif.module}
                    </span>
                  </div>
                  <p className={`text-xs font-medium text-ink mt-1 ${notif.isRead ? 'text-charcoal/80' : 'font-semibold'}`}>
                    {notif.title}
                  </p>
                  {notif.content && (
                    <p className="text-[10px] text-muted leading-relaxed mt-0.5">
                      {notif.content}
                    </p>
                  )}
                  <p className="text-[8px] font-mono text-muted mt-1">
                    {formatTimestamp(notif.createdAt)}
                  </p>
                </div>

                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 border border-border hover:border-charcoal hover:bg-bone rounded transition-all duration-150 text-muted hover:text-ink shrink-0"
                    title="Mark as read"
                    aria-label="Mark notification as read"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
        <span className="text-[9px] font-mono text-muted">
          Read controls active
        </span>

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
