import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardFavorites } from '../../hooks/useDashboard';
import { Link } from 'react-router-dom';

export const FavoritesWidget: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 4;

  const { data: response, isLoading, error } = useDashboardFavorites(page, limit);

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'Project':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green-text">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
          </svg>
        );
      case 'Note':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-yellow-text">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        );
      case 'File':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue-text">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
          </svg>
        );
      default:
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        );
    }
  };

  const favorites = response?.data || [];
  const meta = response?.meta;

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-ink">
              Workspace Pins
            </CardTitle>
            <p className="text-[10px] text-muted">Quick shortcuts to frequently used objects</p>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>

        <CardContent className="space-y-2.5 min-h-[190px]">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/40">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3.5 w-1/2 rounded" />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-xs font-mono text-accent-red-text">Error loading favorites</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <p className="text-xs font-medium text-charcoal">No workspace pins</p>
              <p className="text-[10px] text-muted max-w-[200px] mx-auto">
                Mark items as favorites inside notes or projects to list them here.
              </p>
            </div>
          ) : (
            favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-b-0 px-1 rounded hover:bg-bone/40 transition-colors duration-150"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="shrink-0">{getTargetIcon(fav.targetType)}</span>
                  <Link
                    to={fav.url}
                    className="text-xs font-medium text-ink hover:underline truncate block"
                  >
                    {fav.title}
                  </Link>
                </div>
                <span className="text-[9px] font-mono text-muted uppercase bg-bone border border-border px-1.5 py-0.5 rounded ml-3 shrink-0">
                  {fav.targetType}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end pt-3 border-t border-border mt-3">
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
