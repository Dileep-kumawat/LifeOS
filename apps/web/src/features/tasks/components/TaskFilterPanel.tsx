import React from 'react';
import { useTaskStore } from '../store/useTaskStore.js';
import { useLabels } from '../hooks/useLabels.js';
import { TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@lifeos/shared';
import { Filter, Star, EyeOff, Trash2, SlidersHorizontal, Plus } from 'lucide-react';

export const TaskFilterPanel: React.FC = () => {
  const { filters, toggleStatusFilter, togglePriorityFilter, toggleLabelFilter, setFilters, resetFilters, setLabelManagerOpen } =
    useTaskStore();

  const { data: labels = [] } = useLabels();

  const activeStatusFilters = Array.isArray(filters.status)
    ? filters.status
    : filters.status
    ? [filters.status]
    : [];

  const activePriorityFilters = Array.isArray(filters.priority)
    ? filters.priority
    : filters.priority
    ? [filters.priority]
    : [];

  const activeLabelFilters = filters.labelIds || [];

  return (
    <div className="w-64 bg-surface border border-border rounded-lg p-4 space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center space-x-1.5 text-charcoal font-medium text-xs font-mono uppercase tracking-wider">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
        </div>
        <button
          onClick={resetFilters}
          className="text-[10px] font-mono text-muted hover:text-ink transition-colors uppercase tracking-wide"
        >
          Reset All
        </button>
      </div>

      {/* Flags & Special States */}
      <div className="space-y-1 text-xs">
        <button
          onClick={() => setFilters({ isFavorite: filters.isFavorite ? undefined : true })}
          className={`flex items-center justify-between w-full px-2 py-1.5 rounded transition-all active:scale-98 ${
            filters.isFavorite ? 'bg-bone font-medium text-charcoal' : 'text-muted hover:text-charcoal'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Star className={`w-3.5 h-3.5 ${filters.isFavorite ? 'fill-current' : ''}`} />
            <span>Favorites</span>
          </div>
          {filters.isFavorite && <span className="w-1.5 h-1.5 rounded-full bg-charcoal" />}
        </button>

        <button
          onClick={() => setFilters({ isArchived: !filters.isArchived, isTrashed: false })}
          className={`flex items-center justify-between w-full px-2 py-1.5 rounded transition-all active:scale-98 ${
            filters.isArchived ? 'bg-bone font-medium text-charcoal' : 'text-muted hover:text-charcoal'
          }`}
        >
          <div className="flex items-center space-x-2">
            <EyeOff className="w-3.5 h-3.5" />
            <span>Archived</span>
          </div>
          {filters.isArchived && <span className="w-1.5 h-1.5 rounded-full bg-charcoal" />}
        </button>

        <button
          onClick={() => setFilters({ isTrashed: !filters.isTrashed, isArchived: false })}
          className={`flex items-center justify-between w-full px-2 py-1.5 rounded transition-all active:scale-98 ${
            filters.isTrashed ? 'bg-bone font-medium text-charcoal' : 'text-muted hover:text-charcoal'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash</span>
          </div>
          {filters.isTrashed && <span className="w-1.5 h-1.5 rounded-full bg-charcoal" />}
        </button>
      </div>

      {/* Status section */}
      <div className="space-y-2">
        <h5 className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold">Status</h5>
        <div className="space-y-0.5 text-xs">
          {Object.values(TaskStatus)
            .filter((s) => s !== TaskStatus.ARCHIVED)
            .map((status) => {
              const isActive = activeStatusFilters.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`flex items-center justify-between w-full px-2 py-1 rounded transition-colors ${
                    isActive ? 'bg-bone font-medium text-charcoal' : 'text-muted hover:text-charcoal'
                  }`}
                >
                  <span>{TASK_STATUS_LABELS[status]}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-charcoal" />}
                </button>
              );
            })}
        </div>
      </div>

      {/* Priority section */}
      <div className="space-y-2">
        <h5 className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold">Priority</h5>
        <div className="space-y-0.5 text-xs">
          {Object.values(TaskPriority).map((priority) => {
            const isActive = activePriorityFilters.includes(priority);
            return (
              <button
                key={priority}
                onClick={() => togglePriorityFilter(priority)}
                className={`flex items-center justify-between w-full px-2 py-1 rounded transition-colors ${
                  isActive ? 'bg-bone font-medium text-charcoal' : 'text-muted hover:text-charcoal'
                }`}
              >
                <span>{TASK_PRIORITY_LABELS[priority]}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-charcoal" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Labels section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold">Labels</h5>
          <button
            onClick={() => setLabelManagerOpen(true)}
            className="text-[10px] text-muted hover:text-ink transition-colors flex items-center"
          >
            <Plus className="w-3 h-3 mr-0.5" /> Manage
          </button>
        </div>
        <div className="space-y-0.5 text-xs max-h-48 overflow-y-auto pr-1">
          {labels.length === 0 ? (
            <div className="text-muted text-xs px-2 py-1 italic">No labels defined.</div>
          ) : (
            labels.map((label) => {
              const isActive = activeLabelFilters.includes(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => toggleLabelFilter(label.id)}
                  className={`flex items-center justify-between w-full px-2 py-1 rounded transition-colors ${
                    isActive ? 'bg-bone font-medium text-charcoal' : 'text-muted hover:text-charcoal'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate">{label.name}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-charcoal" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
export default TaskFilterPanel;
