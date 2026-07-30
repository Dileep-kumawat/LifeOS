import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore.js';
import { useCreateTask } from '../hooks/useTaskMutations.js';
import { useLabels } from '../hooks/useLabels.js';
import { TaskStatus, TaskPriority } from '@lifeos/shared';
import { X, Calendar, AlertTriangle, Tag, Plus } from 'lucide-react';

export const TaskCreateModal: React.FC = () => {
  const { isCreateModalOpen, setCreateModalOpen } = useTaskStore();
  const { data: labels = [] } = useLabels();
  const createMutation = useCreateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NONE);
  const [dueDate, setDueDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  if (!isCreateModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        labelIds: selectedLabels,
      });
      
      // Reset state
      setTitle('');
      setDescription('');
      setStatus(TaskStatus.TODO);
      setPriority(TaskPriority.NONE);
      setDueDate('');
      setSelectedLabels([]);
      setCreateModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-[2px] font-sans">
      <div className="bg-surface border border-border w-full max-w-lg rounded-lg shadow-editorial-md overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-editorial text-2xl text-ink">New Task</h4>
          <button
            onClick={() => setCreateModalOpen(false)}
            className="text-muted hover:text-charcoal transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full text-base font-semibold border-b border-border focus:border-charcoal focus:ring-0 outline-none p-1 bg-transparent text-charcoal font-sans"
            />
          </div>

          <div className="space-y-1">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description..."
              rows={3}
              className="w-full text-xs border border-border focus:border-charcoal focus:ring-0 outline-none rounded p-2 bg-surface text-charcoal font-medium placeholder:text-muted/65"
            />
          </div>

          {/* Properties row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 flex flex-col">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-bold">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="text-xs border border-border rounded p-1.5 focus:border-charcoal outline-none bg-surface text-charcoal"
              >
                {Object.values(TaskStatus)
                  .filter((s) => s !== TaskStatus.ARCHIVED)
                  .map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase().replace('_', ' ')}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1 flex flex-col">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-bold">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="text-xs border border-border rounded p-1.5 focus:border-charcoal outline-none bg-surface text-charcoal"
              >
                {Object.values(TaskPriority).map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 flex flex-col">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-bold">Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs border border-border rounded p-1.5 focus:border-charcoal outline-none bg-surface text-charcoal font-medium"
              />
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-bold">Select Labels</span>
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => {
                const isSelected = selectedLabels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    style={{
                      backgroundColor: isSelected ? label.color : `${label.color}15`,
                      color: isSelected ? '#111' : label.color,
                      borderColor: isSelected ? label.color : `${label.color}44`,
                    }}
                    className="px-2.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wide transition-all active:scale-95"
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border mt-6">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-border hover:bg-bone text-charcoal text-xs rounded transition-all active:scale-95 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-ink text-surface text-xs rounded border border-ink hover:bg-charcoal active:scale-95 transition-all font-medium flex items-center"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TaskCreateModal;
