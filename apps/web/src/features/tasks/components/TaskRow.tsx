import React from 'react';
import { ITask } from '@lifeos/shared';
import { TaskStatusBadge } from './TaskStatusBadge.js';
import { TaskPriorityIcon } from './TaskPriorityIcon.js';
import { LabelBadge } from './LabelBadge.js';
import { Calendar, CheckSquare, MessageSquare, Paperclip, ChevronRight, CornerDownRight } from 'lucide-react';
import { formatDueDate } from '../../../utils/date.js';

interface TaskRowProps {
  task: ITask;
  onClick?: () => void;
  onToggleStatus?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  isSubtask?: boolean;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  onClick,
  onToggleStatus,
  isSelected = false,
  onSelect,
  isSubtask = false,
}) => {
  const isCompleted = task.status === 'completed';

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between py-2.5 px-3 border border-border bg-surface hover:bg-bone/20 transition-all rounded-md cursor-pointer select-none ${
        isSelected ? 'border-charcoal bg-bone/30' : 'border-border'
      } ${isSubtask ? 'ml-6 border-l-2 border-l-border bg-surface/50' : ''}`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Bulk select checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="w-3.5 h-3.5 border-border rounded focus:ring-0 text-charcoal accent-charcoal transition-opacity opacity-0 group-hover:opacity-100 checked:opacity-100"
          />
        )}

        {/* Indent subtask arrow */}
        {isSubtask && (
          <CornerDownRight className="w-3.5 h-3.5 text-muted opacity-55 flex-shrink-0" />
        )}

        {/* Toggle Status Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus?.();
          }}
          className="flex-shrink-0 w-4.5 h-4.5 rounded border border-border flex items-center justify-center hover:border-charcoal hover:bg-bone transition-colors"
        >
          {isCompleted && <CheckSquare className="w-3.5 h-3.5 text-charcoal" strokeWidth={2.5} />}
        </button>

        {/* Priority Icon */}
        <TaskPriorityIcon priority={task.priority} className="flex-shrink-0" />

        {/* Task Title */}
        <div className="flex-1 min-w-0 flex items-center space-x-2">
          <span
            className={`text-sm font-medium truncate ${
              isCompleted ? 'text-muted line-through' : 'text-charcoal'
            }`}
          >
            {task.title}
          </span>
          {task.description && (
            <span className="text-xs text-muted truncate hidden sm:inline opacity-80">
              — {task.description}
            </span>
          )}
        </div>
      </div>

      {/* Meta statistics & badges */}
      <div className="flex items-center space-x-4 ml-4 flex-shrink-0 font-mono text-[10px] text-muted">
        {/* Label list (only first 2 to save space) */}
        {task.labels && task.labels.length > 0 && (
          <div className="hidden md:flex items-center space-x-1">
            {task.labels.slice(0, 2).map((label) => (
              <LabelBadge key={label.id} label={label} />
            ))}
            {task.labels.length > 2 && (
              <span className="px-1.5 py-0.5 rounded bg-bone text-muted border border-border">
                +{task.labels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Subtask count */}
        {task.subTaskCount > 0 && (
          <span className="hidden sm:inline-block px-1.5 py-0.5 bg-bone border border-border rounded text-[9px] text-charcoal">
            {task.completedSubTaskCount}/{task.subTaskCount} subtasks
          </span>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <div
            className={`flex items-center space-x-1 ${
              new Date(task.dueDate) < new Date() && !isCompleted
                ? 'text-accent-red-text font-bold'
                : ''
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{formatDueDate(task.dueDate)}</span>
          </div>
        )}

        {/* Status Badge */}
        <TaskStatusBadge status={task.status} className="hidden sm:flex" />

        {/* Comments/Attachments indicator */}
        <div className="flex items-center space-x-1.5">
          {task.commentCount > 0 && (
            <div className="flex items-center space-x-0.5">
              <MessageSquare className="w-3 h-3" />
              <span>{task.commentCount}</span>
            </div>
          )}
          {task.attachmentCount > 0 && (
            <div className="flex items-center space-x-0.5">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachmentCount}</span>
            </div>
          )}
        </div>

        {/* Chevron detail */}
        <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};
export default TaskRow;
