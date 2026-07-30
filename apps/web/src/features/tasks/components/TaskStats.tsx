import React from 'react';
import { useTaskStats } from '../hooks/useTaskStats.js';
import { CheckSquare, ListTodo, AlertCircle, TrendingUp } from 'lucide-react';

export const TaskStats: React.FC = () => {
  const { data: stats, isLoading } = useTaskStats();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full animate-pulse mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-3 h-16" />
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: 'Active Tasks',
      value: stats.active,
      icon: <ListTodo className="w-4 h-4 text-accent-blue-text" />,
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: <CheckSquare className="w-4 h-4 text-accent-green-text" />,
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      icon: <AlertCircle className="w-4 h-4 text-accent-red-text" />,
      highlight: stats.overdue > 0,
    },
    {
      label: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: <TrendingUp className="w-4 h-4 text-accent-yellow-text" />,
    },
    {
      label: 'Total Tasks',
      value: stats.total,
      icon: <CheckSquare className="w-4 h-4 text-muted" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full mb-6 font-sans">
      {statItems.map((item, index) => (
        <div
          key={index}
          className={`bg-surface border p-3.5 rounded-lg flex items-center justify-between transition-all ${
            item.highlight ? 'border-accent-red-text bg-accent-red-bg/10' : 'border-border'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
              {item.label}
            </span>
            <div className="text-xl font-bold font-mono text-charcoal">{item.value}</div>
          </div>
          <div className="w-8 h-8 rounded bg-bone border border-border/40 flex items-center justify-center flex-shrink-0">
            {item.icon}
          </div>
        </div>
      ))}
    </div>
  );
};
export default TaskStats;
