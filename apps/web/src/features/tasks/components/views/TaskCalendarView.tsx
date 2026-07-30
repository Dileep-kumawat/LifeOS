import React, { useState } from 'react';
import { ITask, TaskStatus } from '@lifeos/shared';
import { useTaskStore } from '../../store/useTaskStore.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskCalendarViewProps {
  tasks: ITask[];
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { openDrawer } = useTaskStore();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startOffset = firstDayOfMonth.getDay(); // 0 (Sun) – 6 (Sat)
  const totalDays = lastDayOfMonth.getDate();

  // Index tasks by date string "YYYY-MM-DD"
  const tasksByDate = tasks.reduce<Record<string, ITask[]>>((acc, task) => {
    if (!task.dueDate) return acc;
    const dateStr = new Date(task.dueDate).toISOString().split('T')[0];
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(task);
    return acc;
  }, {});

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const todayStr = new Date().toISOString().split('T')[0];

  // Build grid cells: empty cells + day cells
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full font-sans pb-12 select-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-5 border-b border-border pb-3">
        <h3 className="font-editorial text-2xl text-ink">
          {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 hover:bg-bone border border-transparent hover:border-border rounded transition-colors text-muted hover:text-charcoal"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border border-border hover:bg-bone rounded transition-colors text-charcoal"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1.5 hover:bg-bone border border-transparent hover:border-border rounded transition-colors text-muted hover:text-charcoal"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-mono text-muted uppercase tracking-wider py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div key={`empty-${idx}`} className="bg-bone/40 min-h-[100px]" />
            );
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={`bg-surface min-h-[100px] p-1.5 flex flex-col ${
                isToday ? 'bg-accent-blue-bg/20' : ''
              }`}
            >
              {/* Day number */}
              <div
                className={`self-start mb-1 w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono font-semibold transition-colors ${
                  isToday
                    ? 'bg-ink text-surface'
                    : 'text-charcoal hover:bg-bone cursor-default'
                }`}
              >
                {day}
              </div>

              {/* Task chips (max 3 shown) */}
              <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                {dayTasks.slice(0, 3).map((task) => {
                  const isCompleted = task.status === TaskStatus.COMPLETED;
                  return (
                    <button
                      key={task.id}
                      onClick={() => openDrawer(task.id)}
                      className={`text-left text-[9px] font-medium px-1.5 py-0.5 rounded truncate transition-all hover:opacity-80 active:scale-95 ${
                        isCompleted
                          ? 'bg-accent-green-bg text-accent-green-text line-through opacity-60'
                          : 'bg-accent-blue-bg text-accent-blue-text'
                      }`}
                      title={task.title}
                    >
                      {task.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <span className="text-[9px] font-mono text-muted px-1">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskCalendarView;
