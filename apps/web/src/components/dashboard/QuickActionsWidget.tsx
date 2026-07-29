import React from 'react';
import { Card, CardTitle } from '../ui/Card';
import { useDashboardStore, QuickActionType } from '../../store/useDashboardStore';

interface ActionItem {
  type: QuickActionType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const QuickActionsWidget: React.FC = () => {
  const openQuickCapture = useDashboardStore((state) => state.openQuickCapture);

  const actions: ActionItem[] = [
    {
      type: 'task',
      label: 'Task',
      color: 'bg-accent-blue-bg text-accent-blue-text',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      ),
    },
    {
      type: 'note',
      label: 'Note',
      color: 'bg-accent-yellow-bg text-accent-yellow-text',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
    },
    {
      type: 'project',
      label: 'Project',
      color: 'bg-accent-green-bg text-accent-green-text',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
        </svg>
      ),
    },
    {
      type: 'goal',
      label: 'Goal',
      color: 'bg-accent-red-bg text-accent-red-text',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
    },
    {
      type: 'habit',
      label: 'Habit',
      color: 'bg-accent-blue-bg text-accent-blue-text',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      type: 'journal',
      label: 'Journal',
      color: 'bg-accent-yellow-bg text-accent-yellow-text',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      ),
    },
    {
      type: 'event',
      label: 'Event',
      color: 'bg-accent-green-bg text-accent-green-text',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="11.5" y2="10"/>
        </svg>
      ),
    },
    {
      type: 'expense',
      label: 'Expense',
      color: 'bg-accent-red-bg text-accent-red-text',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      type: 'capture',
      label: 'Capture',
      color: 'bg-bone text-charcoal border border-border',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
  ];

  return (
    <Card padding="md" className="h-full flex flex-col justify-between">
      <div className="mb-3">
        <CardTitle className="text-sm font-semibold tracking-tight text-ink">
          Quick Actions
        </CardTitle>
        <p className="text-[10px] text-muted">Instantly create workspace entries</p>
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1">
        {actions.map((act) => (
          <button
            key={act.type}
            onClick={() => openQuickCapture(act.type)}
            className="flex flex-col items-center justify-center py-2.5 rounded border border-border hover:border-charcoal hover:bg-bone transition-all duration-150 group"
          >
            <div className={`w-7 h-7 rounded-[4px] flex items-center justify-center mb-1 bg-bone text-charcoal group-hover:bg-ink group-hover:text-surface transition-colors duration-150`}>
              {act.icon}
            </div>
            <span className="text-[10px] font-mono text-muted group-hover:text-ink font-medium">
              {act.label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
};
