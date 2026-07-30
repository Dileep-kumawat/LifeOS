import React, { useState } from 'react';
import { ITask } from '@lifeos/shared';
import { Plus, CheckSquare, CornerDownRight, Trash2 } from 'lucide-react';
import { useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTaskMutations.js';
import { useTasks } from '../hooks/useTasks.js';

interface SubtaskListProps {
  parentId: string;
  subTasks: ITask[];
  onSubtaskClick?: (taskId: string) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ parentId, subTasks, onSubtaskClick }) => {
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createTaskMutation.mutateAsync({
        title: newTitle.trim(),
        parentTaskId: parentId,
      });
      setNewTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = (subtask: ITask) => {
    const nextStatus = subtask.status === 'completed' ? 'todo' : 'completed';
    updateTaskMutation.mutate({
      id: subtask.id,
      data: { status: nextStatus as any },
    });
  };

  const handleDelete = (subtaskId: string) => {
    if (confirm('Are you sure you want to delete this subtask?')) {
      deleteTaskMutation.mutate(subtaskId);
    }
  };

  return (
    <div className="space-y-2 mt-4 font-sans">
      <div className="flex items-center justify-between border-b border-border pb-1">
        <h5 className="text-xs font-mono uppercase tracking-wider text-muted">Subtasks</h5>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs flex items-center text-charcoal hover:text-ink font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </button>
        )}
      </div>

      {/* Subtask list */}
      <div className="space-y-1">
        {subTasks.length === 0 ? (
          <div className="text-xs text-muted py-2">No subtasks defined.</div>
        ) : (
          subTasks.map((sub) => {
            const isCompleted = sub.status === 'completed';
            return (
              <div
                key={sub.id}
                onClick={() => onSubtaskClick?.(sub.id)}
                className="group flex items-center justify-between p-2 hover:bg-bone rounded border border-transparent hover:border-border transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(sub);
                    }}
                    className="w-4 h-4 rounded border border-border flex items-center justify-center hover:border-charcoal transition-colors bg-surface"
                  >
                    {isCompleted && <CheckSquare className="w-3 h-3 text-charcoal" strokeWidth={2.5} />}
                  </button>
                  <span
                    className={`text-xs font-medium truncate ${
                      isCompleted ? 'text-muted line-through' : 'text-charcoal'
                    }`}
                  >
                    {sub.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(sub.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-accent-red-text rounded hover:bg-accent-red-bg/30 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add form */}
      {isAdding && (
        <form onSubmit={handleAddSubtask} className="flex items-center space-x-2 mt-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Subtask name..."
            className="flex-1 text-xs border border-border focus:border-charcoal focus:ring-0 outline-none rounded p-1.5 bg-surface text-charcoal"
            autoFocus
          />
          <button
            type="submit"
            disabled={createTaskMutation.isPending}
            className="px-2.5 py-1.5 bg-ink text-surface text-xs rounded border border-ink hover:bg-charcoal active:scale-95 transition-all font-medium"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="px-2.5 py-1.5 border border-border hover:bg-bone text-charcoal text-xs rounded transition-all active:scale-95 font-medium"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};
export default SubtaskList;
