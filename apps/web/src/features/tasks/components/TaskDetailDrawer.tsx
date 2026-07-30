import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore.js';
import { useTask } from '../hooks/useTasks.js';
import { useUpdateTask, useDeleteTask, useArchiveTask, useDuplicateTask, usePermanentDeleteTask } from '../hooks/useTaskMutations.js';
import { useLabels } from '../hooks/useLabels.js';
import { TaskStatus, TaskPriority, ITask } from '@lifeos/shared';
import { X, Calendar, Sliders, Trash2, Folder, Archive, Copy, Clock, CheckCircle } from 'lucide-react';
import { SubtaskList } from './SubtaskList.js';
import { CommentPanel } from './CommentPanel.js';
import { AttachmentManager } from './AttachmentManager.js';
import { motion, AnimatePresence } from 'framer-motion';

export const TaskDetailDrawer: React.FC = () => {
  const { activeTaskId, closeDrawer } = useTaskStore();
  const { data: task, isLoading } = useTask(activeTaskId);
  
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const archiveMutation = useArchiveTask();
  const duplicateMutation = useDuplicateTask();
  const permanentDeleteMutation = usePermanentDeleteTask();

  const { data: labels = [] } = useLabels();

  // Local state for inline title/description edits
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setNotes(task.notes || '');
    }
  }, [task]);

  if (!activeTaskId) return null;

  const handleUpdateField = (field: string, value: any) => {
    if (!task) return;
    updateMutation.mutate({
      id: task.id,
      data: { [field]: value } as any,
    });
  };

  const handleBlur = (field: 'title' | 'description' | 'notes') => {
    if (!task) return;
    const currentVal = field === 'title' ? title : field === 'description' ? description : notes;
    if (currentVal !== task[field]) {
      handleUpdateField(field, currentVal);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (confirm('Move this task to trash?')) {
      await deleteMutation.mutateAsync(task.id);
      closeDrawer();
    }
  };

  const handleArchive = async () => {
    if (!task) return;
    await archiveMutation.mutateAsync(task.id);
    closeDrawer();
  };

  const handleDuplicate = async () => {
    if (!task) return;
    await duplicateMutation.mutateAsync(task.id);
    closeDrawer();
  };

  const toggleLabel = (labelId: string) => {
    if (!task) return;
    const ids = task.labelIds || [];
    const nextIds = ids.includes(labelId) ? ids.filter((id) => id !== labelId) : [...ids, labelId];
    handleUpdateField('labelIds', nextIds);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex justify-end font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeDrawer}
          className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]"
        />

        {/* Drawer panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-xl h-full bg-surface border-l border-border shadow-editorial-md flex flex-col z-50 overflow-hidden"
        >
          {/* Header toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleArchive}
                title="Archive task"
                className="p-1.5 hover:bg-bone border border-transparent hover:border-border rounded transition-colors text-muted hover:text-charcoal"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={handleDuplicate}
                title="Duplicate task"
                className="p-1.5 hover:bg-bone border border-transparent hover:border-border rounded transition-colors text-muted hover:text-charcoal"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                title="Trash task"
                className="p-1.5 hover:bg-bone border border-transparent hover:border-border rounded transition-colors text-muted hover:text-accent-red-text"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={closeDrawer}
              className="p-1.5 hover:bg-bone border border-transparent hover:border-border rounded transition-colors text-muted hover:text-charcoal"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {isLoading || !task ? (
            <div className="p-8 text-center text-xs text-muted">Loading details...</div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Title Input */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleBlur('title')}
                  className="w-full text-2xl font-bold border-b border-transparent focus:border-border focus:ring-0 outline-none p-1 bg-transparent text-charcoal font-sans"
                />
              </div>

              {/* Status and Priority pickers */}
              <div className="grid grid-cols-2 gap-4 border border-border bg-bone/35 p-3 rounded-lg text-xs">
                <div className="space-y-1.5 flex flex-col">
                  <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-semibold">Status</span>
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateField('status', e.target.value)}
                    className="border border-border rounded p-1 outline-none bg-surface text-charcoal font-medium"
                  >
                    {Object.values(TaskStatus).map((s) => (
                      <option key={s} value={s}>
                        {s.toUpperCase().replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-semibold">Priority</span>
                  <select
                    value={task.priority}
                    onChange={(e) => handleUpdateField('priority', e.target.value)}
                    className="border border-border rounded p-1 outline-none bg-surface text-charcoal font-medium"
                  >
                    {Object.values(TaskPriority).map((p) => (
                      <option key={p} value={p}>
                        {p.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Duration picker */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 flex flex-col">
                  <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-semibold">Due Date</span>
                  <input
                    type="date"
                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleUpdateField('dueDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="border border-border rounded p-1.5 outline-none bg-surface text-charcoal font-medium"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-semibold">Est. Duration (mins)</span>
                  <input
                    type="number"
                    value={task.estimatedDuration || ''}
                    onChange={(e) => handleUpdateField('estimatedDuration', e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="border border-border rounded p-1.5 outline-none bg-surface text-charcoal font-medium"
                  />
                </div>
              </div>

              {/* Description Textarea */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-semibold">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleBlur('description')}
                  rows={3}
                  placeholder="Provide task summary..."
                  className="w-full text-xs border border-border focus:border-charcoal focus:ring-0 outline-none rounded p-2.5 bg-surface text-charcoal font-medium placeholder:text-muted/65 leading-relaxed"
                />
              </div>

              {/* Labels Multi-select */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-semibold block">Labels</span>
                <div className="flex flex-wrap gap-1">
                  {labels.map((label) => {
                    const isSelected = (task.labelIds || []).includes(label.id);
                    return (
                      <button
                        key={label.id}
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

              {/* Subtasks Section */}
              <SubtaskList parentId={task.id} subTasks={task.subTasks || []} onSubtaskClick={(subId) => useTaskStore.getState().openDrawer(subId)} />

              {/* Attachments Section */}
              <AttachmentManager taskId={task.id} />

              {/* Comments Section */}
              <CommentPanel taskId={task.id} />

            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default TaskDetailDrawer;
