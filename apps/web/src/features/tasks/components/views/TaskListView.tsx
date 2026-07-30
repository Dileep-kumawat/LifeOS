import React from 'react';
import { ITask, TaskStatus, TaskPriority } from '@lifeos/shared';
import { TaskRow } from '../TaskRow.js';
import { useTaskStore } from '../../store/useTaskStore.js';
import { useUpdateTask } from '../../hooks/useTaskMutations.js';

interface TaskListViewProps {
  tasks: ITask[];
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks }) => {
  const { selectedTaskIds, toggleSelectTask, openDrawer } = useTaskStore();
  const updateMutation = useUpdateTask();

  const handleToggleStatus = (task: ITask) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateMutation.mutate({
      id: task.id,
      data: { status: nextStatus as any },
    });
  };

  if (tasks.length === 0) return null;

  // Let's divide tasks into groups: Active tasks vs. Completed tasks
  // to give a clean Notion/editorial-style layout
  const activeTasks = tasks.filter((t) => t.status !== TaskStatus.COMPLETED);
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED);

  return (
    <div className="space-y-6 w-full font-sans pb-12">
      {/* Active Tasks Group */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 px-1 py-1">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-bold">Active Tasks</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue-text" />
          </div>
          <div className="space-y-1.5">
            {activeTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => openDrawer(task.id)}
                onToggleStatus={() => handleToggleStatus(task)}
                isSelected={selectedTaskIds.includes(task.id)}
                onSelect={() => toggleSelectTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks Group */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 px-1 py-1">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-bold">Completed</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green-text" />
          </div>
          <div className="space-y-1.5">
            {completedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => openDrawer(task.id)}
                onToggleStatus={() => handleToggleStatus(task)}
                isSelected={selectedTaskIds.includes(task.id)}
                onSelect={() => toggleSelectTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default TaskListView;
