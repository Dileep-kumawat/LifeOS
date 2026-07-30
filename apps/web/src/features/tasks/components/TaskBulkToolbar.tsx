import React from 'react';
import { useTaskStore } from '../store/useTaskStore.js';
import { useBulkTaskOperation } from '../hooks/useTaskMutations.js';
import { TaskStatus, TaskPriority } from '@lifeos/shared';
import { EyeOff, Trash2, CheckCircle2, ChevronRight, X, AlertTriangle } from 'lucide-react';

export const TaskBulkToolbar: React.FC = () => {
  const { selectedTaskIds, clearSelection } = useTaskStore();
  const bulkMutation = useBulkTaskOperation();

  if (selectedTaskIds.length === 0) return null;

  const handleBulkAction = async (operation: any, payload?: any) => {
    try {
      await bulkMutation.mutateAsync({
        taskIds: selectedTaskIds,
        operation,
        payload,
      });
      clearSelection();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-surface px-4 py-3 rounded-lg flex items-center space-x-6 shadow-editorial-md border border-charcoal/20 font-mono text-xs">
      <div className="flex items-center space-x-2 border-r border-charcoal/50 pr-4">
        <span className="bg-charcoal px-2 py-0.5 rounded text-[10px] text-surface/90 font-bold">
          {selectedTaskIds.length}
        </span>
        <span className="text-muted/90 text-[10px] uppercase tracking-wide">Selected</span>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => handleBulkAction('status_change', { status: TaskStatus.COMPLETED })}
          className="flex items-center space-x-1.5 hover:text-accent-green-bg transition-colors"
          disabled={bulkMutation.isPending}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Complete</span>
        </button>

        <button
          onClick={() => handleBulkAction('priority_change', { priority: TaskPriority.HIGH })}
          className="flex items-center space-x-1.5 hover:text-accent-yellow-bg transition-colors"
          disabled={bulkMutation.isPending}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Priority High</span>
        </button>

        <button
          onClick={() => handleBulkAction('archive')}
          className="flex items-center space-x-1.5 hover:text-accent-blue-bg transition-colors"
          disabled={bulkMutation.isPending}
        >
          <EyeOff className="w-4 h-4" />
          <span>Archive</span>
        </button>

        <button
          onClick={() => handleBulkAction('trash')}
          className="flex items-center space-x-1.5 hover:text-accent-red-bg transition-colors"
          disabled={bulkMutation.isPending}
        >
          <Trash2 className="w-4 h-4" />
          <span>Trash</span>
        </button>
      </div>

      <button
        onClick={clearSelection}
        className="flex items-center space-x-1 pl-4 border-l border-charcoal/50 text-muted/80 hover:text-surface transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
export default TaskBulkToolbar;
