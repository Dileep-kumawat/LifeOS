import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useToastStore } from '../../store/useToastStore';

export const QuickCaptureModal: React.FC = () => {
  const isOpen = useDashboardStore((state) => state.quickCaptureOpen);
  const type = useDashboardStore((state) => state.quickCaptureType);
  const close = useDashboardStore((state) => state.closeQuickCapture);
  const addToast = useToastStore((state) => state.addToast);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [extraValue, setExtraValue] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setExtraValue('');
  };

  const handleClose = () => {
    resetForm();
    close();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Dispatch toast notification
    addToast({
      title: `${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Item'} Captured`,
      message: `Successfully created "${title}" in your workspace.`,
      type: 'success',
    });

    handleClose();
  };

  if (!isOpen || !type) return null;

  const typeConfig: Record<string, { title: string; description: string; placeholder: string; extraLabel?: string }> = {
    task: {
      title: 'New Task',
      description: 'Add an item to your task inbox.',
      placeholder: 'Submit project report',
      extraLabel: 'Due Date',
    },
    note: {
      title: 'New Note',
      description: 'Quickly capture draft notes.',
      placeholder: 'Meeting thoughts & summaries',
      extraLabel: 'Folder (default: Inbox)',
    },
    project: {
      title: 'New Project',
      description: 'Initialize a project canvas.',
      placeholder: 'Web Development 2.0 overhaul',
      extraLabel: 'Color Hex Code',
    },
    goal: {
      title: 'New Goal',
      description: 'Set a new tracking milestone.',
      placeholder: 'Read 12 books this quarter',
      extraLabel: 'Target Date',
    },
    habit: {
      title: 'New Habit',
      description: 'Introduce a new daily check-in routine.',
      placeholder: 'Drink 3L water daily',
    },
    journal: {
      title: 'Daily Journal Entry',
      description: 'Reflect on today\'s learnings.',
      placeholder: 'Today was highly productive because...',
    },
    event: {
      title: 'New Event',
      description: 'Schedule a calendar block.',
      placeholder: 'Weekly sprint alignment',
      extraLabel: 'Start Time',
    },
    expense: {
      title: 'Add Expense',
      description: 'Log a workspace purchase.',
      placeholder: 'Domain renewal subscription',
      extraLabel: 'Amount (USD)',
    },
    capture: {
      title: 'Quick Capture',
      description: 'Brain-dump text logs directly to inbox.',
      placeholder: 'Read article on micro-frontends later today',
    },
  };

  const config = typeConfig[type];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={config.title} description={config.description}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="quick-title" className="text-[10px] font-mono text-muted uppercase">
            Title / Name
          </label>
          <Input
            id="quick-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={config.placeholder}
            required
            autoFocus
            className="w-full bg-bone text-xs border border-border focus:border-ink rounded"
          />
        </div>

        {/* If Task, Note, Journal, or Capture: display description input */}
        {['task', 'note', 'journal', 'capture'].includes(type) && (
          <div className="space-y-1">
            <label htmlFor="quick-desc" className="text-[10px] font-mono text-muted uppercase">
              Description / Content
            </label>
            <textarea
              id="quick-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide optional details..."
              rows={3}
              className="w-full bg-bone text-xs border border-border focus:border-ink rounded p-2 outline-none font-sans"
            />
          </div>
        )}

        {/* Extra inputs (due dates, amounts, colors) */}
        {config.extraLabel && (
          <div className="space-y-1">
            <label htmlFor="quick-extra" className="text-[10px] font-mono text-muted uppercase">
              {config.extraLabel}
            </label>
            <Input
              id="quick-extra"
              type={type === 'event' || type === 'task' || type === 'goal' ? 'date' : 'text'}
              value={extraValue}
              onChange={(e) => setExtraValue(e.target.value)}
              placeholder="e.g. 2026-07-30"
              className="w-full bg-bone text-xs border border-border focus:border-ink rounded"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border mt-5">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="bg-bone hover:bg-border text-charcoal border border-border text-xs px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-ink hover:bg-charcoal text-surface text-xs px-4 py-2 rounded"
          >
            Save Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
};
