import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useDashboardHabits } from '../../hooks/useDashboard';
import { useToastStore } from '../../store/useToastStore';
import { Link } from 'react-router-dom';

export const HabitsOverviewWidget: React.FC = () => {
  const { data: response, isLoading, error } = useDashboardHabits(1, 10);
  const showToast = useToastStore((state) => state.addToast || ((msg: string) => alert(msg)));
  
  // Track local interactive checked status
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  const habits = response?.data || [];

  // Reset checked state when new server data arrives
  useEffect(() => {
    if (habits.length > 0) {
      const initialMap: Record<string, boolean> = {};
      const todayString = new Date().toDateString();
      for (const habit of habits) {
        // Check if today is already in habit's history
        const hasDoneToday = habit.history.some(
          (d) => new Date(d).toDateString() === todayString
        );
        initialMap[habit.id] = hasDoneToday;
      }
      setCheckedMap(initialMap);
    }
  }, [habits]);

  const handleToggle = (id: string, name: string) => {
    const isChecking = !checkedMap[id];
    setCheckedMap((prev) => ({
      ...prev,
      [id]: isChecking,
    }));

    if (isChecking) {
      showToast({
        title: 'Habit Completed',
        message: `You completed "${name}" for today! Keep it up.`,
        type: 'success',
      });
    }
  };

  // Mock days of the week for visual weekly history blocks
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dayLabel: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      dateString: d.toDateString(),
    };
  });

  return (
    <Card padding="md" className="h-full flex flex-col justify-between hover:shadow-editorial transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-ink">
              Habits Tracker
            </CardTitle>
            <p className="text-[10px] text-muted">Daily routine consistency</p>
          </div>
          <span className="text-[10px] font-mono text-muted">
            {habits.length > 0
              ? `${Math.round((Object.values(checkedMap).filter(Boolean).length / habits.length) * 100)}% done`
              : '0%'}
          </span>
        </div>

        <CardContent className="space-y-3 min-h-[190px]">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="h-3.5 w-24 rounded" />
                </div>
                <Skeleton className="h-2 w-16 rounded" />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-xs font-mono text-accent-red-text">Error loading habits</p>
            </div>
          ) : habits.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <p className="text-xs font-medium text-charcoal">No active habits</p>
              <p className="text-[10px] text-muted max-w-[200px] mx-auto">
                Build new streaks. Create a habit shortcut to begin!
              </p>
            </div>
          ) : (
            habits.map((habit) => {
              const isChecked = checkedMap[habit.id] || false;
              const displayStreak = habit.streak + (isChecked && !habit.history.some(d => new Date(d).toDateString() === new Date().toDateString()) ? 1 : 0);

              return (
                <div
                  key={habit.id}
                  className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-b-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggle(habit.id, habit.name)}
                      className={[
                        'w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all duration-150',
                        isChecked
                          ? 'bg-ink border-ink text-surface'
                          : 'border-border bg-bone hover:border-charcoal text-transparent',
                      ].join(' ')}
                      aria-label={`Mark habit ${habit.name} as completed`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${isChecked ? 'line-through text-muted' : 'text-ink'}`}>
                        {habit.name}
                      </p>
                      <p className="text-[9px] font-mono text-muted">
                        Streak: {displayStreak} days
                      </p>
                    </div>
                  </div>

                  {/* History micro grid */}
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    {last7Days.map((day, idx) => {
                      // Determine status of habit on this date
                      const completedOnDate = habit.history.some(
                        (hDate) => new Date(hDate).toDateString() === day.dateString
                      ) || (day.dateString === new Date().toDateString() && isChecked);

                      return (
                        <div
                          key={idx}
                          className={[
                            'w-2 h-2 rounded-[2px]',
                            completedOnDate
                              ? 'bg-charcoal'
                              : 'bg-bone border border-border',
                          ].join(' ')}
                          title={`${day.dayLabel}: ${completedOnDate ? 'Completed' : 'Missed'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </div>

      {/* Footer view */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
        <Link
          to="/dashboard/habits"
          className="text-[10px] font-mono text-muted hover:text-ink font-semibold flex items-center gap-0.5"
        >
          View Habits
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </Card>
  );
};
