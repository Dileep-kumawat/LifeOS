import React from 'react';
import { Search } from 'lucide-react';

interface NoResultsEmptyStateProps {
  onClearFilters?: () => void;
}

export const NoResultsEmptyState: React.FC<NoResultsEmptyStateProps> = ({ onClearFilters }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-border rounded-lg bg-surface max-w-lg mx-auto my-12">
      <div className="flex items-center justify-center w-12 h-12 rounded bg-bone border border-border text-muted mb-4">
        <Search className="w-5 h-5 text-muted" strokeWidth={2.2} />
      </div>
      <h3 className="font-editorial text-2xl text-ink mb-1">No matching tasks</h3>
      <p className="text-muted text-sm max-w-sm mb-6">
        No tasks matched your current search query or active filter settings. Try adjusting your query.
      </p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 border border-border hover:bg-bone text-charcoal text-sm rounded transition-all active:scale-95 shadow-none"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
};
export default NoResultsEmptyState;
