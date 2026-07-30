import React from 'react';
import { Plus, CheckSquare } from 'lucide-react';

interface NoTasksEmptyStateProps {
  onCreateClick: () => void;
}

export const NoTasksEmptyState: React.FC<NoTasksEmptyStateProps> = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border rounded-lg bg-surface max-w-lg mx-auto my-12">
      <div className="flex items-center justify-center w-12 h-12 rounded bg-bone border border-border text-muted mb-4">
        <CheckSquare className="w-6 h-6 text-charcoal" strokeWidth={1.8} />
      </div>
      <h3 className="font-editorial text-2xl text-ink mb-2">No tasks defined</h3>
      <p className="text-muted text-sm max-w-sm mb-6">
        Keep your day organized. Create tasks, set priorities, track subtasks and link them to your goals.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center justify-center px-4 py-2 bg-ink text-surface text-sm rounded border border-ink hover:bg-charcoal active:scale-95 transition-all shadow-none"
      >
        <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
        New Task
      </button>
    </div>
  );
};
export default NoTasksEmptyState;
