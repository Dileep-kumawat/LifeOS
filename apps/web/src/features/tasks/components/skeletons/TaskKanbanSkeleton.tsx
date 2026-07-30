import React from 'react';

export const TaskKanbanSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full h-[60vh] py-4 animate-pulse">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="bg-bone border border-border rounded-lg p-3 space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="h-4 bg-border rounded w-24 animate-pulse" />
            <div className="w-5 h-5 bg-border rounded-full" />
          </div>
          <div className="space-y-3 flex-1">
            {[1, 2].map((card) => (
              <div key={card} className="bg-surface border border-border p-3 rounded-md space-y-2">
                <div className="h-4 bg-bone rounded w-3/4" />
                <div className="h-3 bg-bone rounded w-1/2" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-3 bg-bone rounded w-1/4" />
                  <div className="w-5 h-5 bg-bone rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
export default TaskKanbanSkeleton;
