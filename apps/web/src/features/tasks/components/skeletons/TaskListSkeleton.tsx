import React from 'react';

export const TaskListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2 w-full animate-pulse py-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 border border-border bg-surface rounded-lg">
          <div className="flex items-center space-x-3 w-2/3">
            <div className="w-4 h-4 bg-bone rounded border border-border" />
            <div className="h-4 bg-bone rounded w-1/3" />
            <div className="h-3 bg-bone rounded w-12" />
          </div>
          <div className="flex items-center space-x-4 w-1/3 justify-end">
            <div className="h-4 bg-bone rounded w-16" />
            <div className="h-4 bg-bone rounded w-10" />
            <div className="w-8 h-8 bg-bone rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
export default TaskListSkeleton;
