import React from 'react';
import { TaskPriority, TASK_PRIORITY_LABELS } from '@lifeos/shared';
import { ShieldAlert, ChevronUp, ChevronsUp, Minus } from 'lucide-react';

interface TaskPriorityIconProps {
  priority: TaskPriority;
  className?: string;
}

export const TaskPriorityIcon: React.FC<TaskPriorityIconProps> = ({ priority, className = '' }) => {
  const getIcon = () => {
    switch (priority) {
      case TaskPriority.URGENT:
        return <ShieldAlert className="w-4 h-4 text-accent-red-text" strokeWidth={2.2} />;
      case TaskPriority.HIGH:
        return <ChevronsUp className="w-4 h-4 text-accent-red-text" strokeWidth={2.2} />;
      case TaskPriority.MEDIUM:
        return <ChevronUp className="w-4 h-4 text-accent-yellow-text" strokeWidth={2.2} />;
      case TaskPriority.LOW:
        return <ChevronUp className="w-4 h-4 text-accent-blue-text rotate-180" strokeWidth={2.2} />;
      case TaskPriority.NONE:
      default:
        return <Minus className="w-4 h-4 text-muted opacity-40" strokeWidth={2.2} />;
    }
  };

  return (
    <div
      title={TASK_PRIORITY_LABELS[priority]}
      className={`inline-flex items-center justify-center w-5 h-5 rounded hover:bg-bone transition-colors ${className}`}
    >
      {getIcon()}
    </div>
  );
};
export default TaskPriorityIcon;
