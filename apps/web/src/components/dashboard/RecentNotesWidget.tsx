import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardNotes } from '../../hooks/useDashboard';
import { Link } from 'react-router-dom';

export const RecentNotesWidget: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 4;

  const { data: response, isLoading, error } = useDashboardNotes(
    undefined,
    undefined,
    page,
    limit
  );

  const formatLastEdited = (dateStr: string) => {
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

  const notes = response?.data || [];
  const meta = response?.meta;

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-ink">
              Recent Notes
            </CardTitle>
            <p className="text-[10px] text-muted">Pinned and recently modified notebooks</p>
          </div>
          <Badge variant="neutral" className="bg-bone text-muted border border-border tracking-wider text-[9px] uppercase">
            Notes
          </Badge>
        </div>

        <CardContent className="space-y-2.5 min-h-[190px]">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between py-1.5 border-b border-border/40">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-2 w-1/3 rounded" />
                </div>
                <Skeleton className="h-3 w-8 rounded" />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-xs font-mono text-accent-red-text">Error loading notes</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <p className="text-xs font-medium text-charcoal">No notes created</p>
              <p className="text-[10px] text-muted max-w-[200px] mx-auto">
                Capture thoughts. Click New Note action to begin!
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="py-1.5 border-b border-border/40 last:border-b-0 px-1 rounded hover:bg-bone/40 transition-colors duration-150"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      {note.isPinned && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-accent-yellow-text shrink-0">
                          <path d="M16 12V4h1v-2H7v2h1v8l-2 2v2h5.2v6l1.8 1.8 1.8-1.8v-6H18v-2l-2-2z"/>
                        </svg>
                      )}
                      <Link
                        to={`/dashboard/notes`}
                        className="text-xs font-medium text-ink hover:underline truncate block"
                      >
                        {note.title || 'Untitled note'}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted">
                      <span className="font-semibold text-charcoal">{note.folder}</span>
                      <span>·</span>
                      <span>Edited {formatLastEdited(note.updatedAt)}</span>
                    </div>
                  </div>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 shrink-0 mt-0.5 max-w-[80px] overflow-hidden">
                      <span className="text-[9px] font-mono text-accent-blue-text bg-accent-blue-bg px-1.5 py-0.5 rounded truncate">
                        {note.tags[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </div>

      {/* Pagination & Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
        <Link
          to="/dashboard/notes"
          className="text-[10px] font-mono text-muted hover:text-ink font-semibold flex items-center gap-0.5"
        >
          Open Editor
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
