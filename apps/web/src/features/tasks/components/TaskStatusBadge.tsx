import React from 'react';
import { TaskStatus, TASK_STATUS_LABELS } from '@lifeos/shared';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  onClick?: () => void;
  className?: string;
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status, onClick, className = '' }) => {
  const getColors = (s: TaskStatus) => {
    switch (s) {
      case TaskStatus.INBOX:
        return 'bg-bone text-muted border-border';
      case TaskStatus.TODO:
        return 'bg-accent-blue-bg text-accent-blue-text border-transparent';
      case TaskStatus.IN_PROGRESS:
        return 'bg-accent-yellow-bg text-accent-yellow-text border-transparent';
      case TaskStatus.WAITING:
        return 'bg-accent-red-bg text-accent-red-text border-transparent';
      case TaskStatus.BLOCKED:
        return 'bg-accent-red-bg text-red-900 border-red-200';
      case TaskStatus.COMPLETED:
        return 'bg-accent-green-bg text-accent-green-text border-transparent';
      case TaskStatus.ARCHIVED:
        return 'bg-bone text-muted border-border';
      default:
        return 'bg-bone text-charcoal border-border';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono tracking-wide uppercase border text-[10px] transition-all active:scale-95 ${getColors(status)} ${
        onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default pointer-events-none'
      } ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
      {TASK_STATUS_LABELS[status]}
    </button>
  );
};
