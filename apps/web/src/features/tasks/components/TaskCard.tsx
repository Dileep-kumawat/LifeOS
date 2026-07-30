import React from 'react';
import { ITask } from '@lifeos/shared';
import { TaskStatusBadge } from './TaskStatusBadge.js';
import { TaskPriorityIcon } from './TaskPriorityIcon.js';
import { LabelBadge } from './LabelBadge.js';
import { Calendar, CheckSquare, MessageSquare, Paperclip, GripVertical } from 'lucide-react';
import { formatDueDate } from '../../../utils/date.js';

interface TaskCardProps {
  task: ITask;
  onClick?: () => void;
  onToggleStatus?: () => void;
  dragListeners?: any;
  dragAttributes?: any;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  onToggleStatus,
  dragListeners,
  dragAttributes,
  isSelected = false,
  onSelect,
}) => {
  const isCompleted = task.status === 'completed';

  return (
    <div
      onClick={onClick}
      className={`group relative bg-surface border rounded-lg p-3 hover:shadow-editorial transition-all duration-200 cursor-pointer select-none ${
        isSelected ? 'border-charcoal bg-bone/30' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-2 flex-1 min-w-0">
          {/* Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus?.();
            }}
            className="flex-shrink-0 mt-0.5 w-4.5 h-4.5 rounded border border-border flex items-center justify-center hover:border-charcoal hover:bg-bone transition-colors"
          >
            {isCompleted && <CheckSquare className="w-3.5 h-3.5 text-charcoal" strokeWidth={2.5} />}
          </button>

          {/* Title and description stub */}
          <div className="flex-1 min-w-0">
            <h4
              className={`text-sm font-medium tracking-tight truncate transition-colors ${
                isCompleted ? 'text-muted line-through' : 'text-charcoal group-hover:text-ink'
              }`}
            >
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-muted truncate mt-0.5">{task.description}</p>
            )}
          </div>
        </div>

        {/* Drag handle or priority */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {dragListeners && (
            <div
              {...dragAttributes}
              {...dragListeners}
              className="p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-charcoal cursor-grab active:cursor-grabbing transition-opacity"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
          <TaskPriorityIcon priority={task.priority} />
        </div>
      </div>

      {/* Label Chips */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {task.labels.map((label) => (
            <LabelBadge key={label.id} label={label} />
          ))}
        </div>
      )}

      {/* Footer stats / metadata */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60 text-[10px] font-mono text-muted">
        <div className="flex items-center space-x-2 min-w-0">
          {task.dueDate && (
            <div
              className={`flex items-center space-x-1 ${
                new Date(task.dueDate) < new Date() && !isCompleted
                  ? 'text-accent-red-text'
                  : ''
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatDueDate(task.dueDate)}</span>
            </div>
          )}

          {task.subTaskCount > 0 && (
            <div className="flex items-center space-x-0.5">
              <span>
                {task.completedSubTaskCount}/{task.subTaskCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
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
          
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="w-3 h-3 border-border rounded focus:ring-0 text-charcoal accent-charcoal"
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default TaskCard;
