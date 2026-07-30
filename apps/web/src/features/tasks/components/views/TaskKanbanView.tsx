import React from 'react';
import { ITask, TaskStatus, TASK_STATUS_LABELS } from '@lifeos/shared';
import { TaskCard } from '../TaskCard.js';
import { useTaskStore } from '../../store/useTaskStore.js';
import { useUpdateTask } from '../../hooks/useTaskMutations.js';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

interface TaskKanbanViewProps {
  tasks: ITask[];
}

const columns: TaskStatus[] = [
  TaskStatus.INBOX,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.WAITING,
  TaskStatus.BLOCKED,
  TaskStatus.COMPLETED,
];

export const TaskKanbanView: React.FC<TaskKanbanViewProps> = ({ tasks }) => {
  const { selectedTaskIds, toggleSelectTask, openDrawer } = useTaskStore();
  const updateMutation = useUpdateTask();

  // Sensors for drag-drop interaction
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid triggering drag on simple clicks
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const nextStatus = over.id as TaskStatus;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== nextStatus) {
      updateMutation.mutate({
        id: taskId,
        data: { status: nextStatus },
      });
    }
  };

  const getColTasks = (status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  };

  const handleToggleStatus = (task: ITask) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateMutation.mutate({
      id: task.id,
      data: { status: nextStatus as any },
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex space-x-4 overflow-x-auto pb-12 w-full font-sans select-none min-h-[70vh] items-start">
        {columns.map((status) => {
          const colTasks = getColTasks(status);
          return (
            <div
              key={status}
              id={status}
              className="flex-shrink-0 w-72 bg-bone/35 border border-border/80 rounded-lg p-3 flex flex-col max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-charcoal font-bold">
                    {TASK_STATUS_LABELS[status]}
                  </span>
                  <span className="text-[10px] font-mono bg-bone border border-border px-1.5 py-0.2 rounded text-muted">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Column Body / Droppable Area */}
              <div className="space-y-2 flex-1 overflow-y-auto min-h-[150px] pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="text-[10px] text-muted italic text-center py-6 border border-dashed border-border rounded bg-surface/50">
                    No tasks here
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => openDrawer(task.id)}
                      onToggleStatus={() => handleToggleStatus(task)}
                      isSelected={selectedTaskIds.includes(task.id)}
                      onSelect={() => toggleSelectTask(task.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
};
export default TaskKanbanView;
