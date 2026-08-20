import { Check, X, Calendar, Trash2, Edit } from "lucide-react";
import { HabitStreakBadge } from "./HabitStreakBadge";

export interface HabitCardItem {
  _id: string;
  title: string;
  frequency: {
    type: "daily" | "weekly" | "custom";
    daysOfWeek?: number[];
    timesPerPeriod?: number;
  };
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  lastCheckInDate?: string | null;
}

export interface HabitCardProps {
  habit: HabitCardItem;
  todayDateStr?: string; // YYYY-MM-DD
  recentCheckIns?: Array<{ date: string; completed: boolean }>;
  onToggleCheckIn: (habitId: string, date: string, completed: boolean) => void;
  onSelectHabit?: (habitId: string) => void;
  onEditHabit?: (habit: HabitCardItem) => void;
  onDeleteHabit?: (habitId: string) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HabitCard({
  habit,
  todayDateStr = new Date().toISOString().split("T")[0],
  recentCheckIns = [],
  onToggleCheckIn,
  onSelectHabit,
  onEditHabit,
  onDeleteHabit
}: HabitCardProps) {
  // Find today's check-in
  const todayRecord = recentCheckIns.find((c) => c.date === todayDateStr);
  const isCheckedInToday = todayRecord?.completed === true;
  const isMissedToday = todayRecord?.completed === false;

  // Build 7-day trailing date matrix ending today
  const last7Days: Array<{ date: string; dayLabel: string; record?: { completed: boolean } }> = [];
  const [y, m, d] = todayDateStr.split("-").map(Number);

  for (let i = 6; i >= 0; i--) {
    const dateObj = new Date(Date.UTC(y, m - 1, d - i));
    const dateStr = dateObj.toISOString().split("T")[0];
    const dayLabel = DAY_NAMES[dateObj.getUTCDay()];
    const record = recentCheckIns.find((c) => c.date === dateStr);
    last7Days.push({ date: dateStr, dayLabel, record });
  }

  // Format frequency label
  let freqLabel = "Daily";
  if (habit.frequency.type === "weekly") {
    const days = (habit.frequency.daysOfWeek || []).map((d) => DAY_NAMES[d]).join(", ");
    freqLabel = days ? `Weekly (${days})` : "Weekly";
  } else if (habit.frequency.type === "custom") {
    freqLabel = `${habit.frequency.timesPerPeriod || 1}x / week`;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#e6e6e6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex flex-col gap-1 cursor-pointer group/title"
          onClick={() => onSelectHabit?.(habit._id)}
        >
          <h3 className="text-lg font-semibold text-[#000000] group-hover/title:text-[#0075de] transition-colors duration-150">
            {habit.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-[#615d59]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" data-icon="inline-start" />
              {freqLabel}
            </span>
            <span>•</span>
            <span>{Math.round((habit.completionRate || 0) * 100)}% rate</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <HabitStreakBadge
            currentStreak={habit.currentStreak}
            longestStreak={habit.longestStreak}
            isCheckedInToday={isCheckedInToday}
            frequencyType={habit.frequency.type}
          />

          {onEditHabit && (
            <button
              onClick={() => onEditHabit(habit)}
              className="rounded-md p-1.5 text-[#615d59] hover:bg-[#f6f5f4] hover:text-[#000000] active:scale-90 transition-all duration-150 cursor-pointer"
              title="Edit habit"
            >
              <Edit className="size-4" />
            </button>
          )}

          {onDeleteHabit && (
            <button
              onClick={() => onDeleteHabit(habit._id)}
              className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 active:scale-90 transition-all duration-150 cursor-pointer"
              title="Delete habit"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 7-Day History Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e6e6] pt-3">
        <span className="text-xs font-medium text-[#615d59]">Recent 7 days:</span>
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
          {last7Days.map((item) => {
            const isToday = item.date === todayDateStr;
            let bgClass = "bg-[#f6f5f4] text-[#a39e98] border-[#e6e6e6]";

            if (item.record?.completed === true) {
              bgClass = "bg-emerald-500 text-white border-emerald-600 shadow-2xs";
            } else if (item.record?.completed === false) {
              bgClass = "bg-rose-500 text-white border-rose-600 shadow-2xs";
            } else if (isToday) {
              bgClass = "bg-white text-[#615d59] border-[#0075de] border-2";
            }

            return (
              <div
                key={item.date}
                className="flex flex-col items-center gap-0.5"
                title={`${item.dayLabel} (${item.date}): ${
                  item.record?.completed === true
                    ? "Completed"
                    : item.record?.completed === false
                      ? "Missed"
                      : "Not done"
                }`}
              >
                <div
                  className={`flex size-5 sm:size-6 items-center justify-center rounded-md text-[9px] sm:text-[10px] font-bold border transition-all duration-150 hover:scale-125 cursor-default ${bgClass}`}
                >
                  {item.record?.completed === true ? (
                    <Check className="size-2.5 sm:size-3 stroke-[3]" />
                  ) : item.record?.completed === false ? (
                    <X className="size-2.5 sm:size-3 stroke-[3]" />
                  ) : (
                    item.dayLabel.slice(0, 1)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Today Check-In Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f6f5f4] p-2.5 border border-[#e6e6e6]">
        <span className="text-xs font-semibold text-[#31302e]">Today's Status:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onToggleCheckIn(habit._id, todayDateStr, !isCheckedInToday)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold active:scale-95 transition-all duration-150 cursor-pointer ${
              isCheckedInToday
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow"
                : "bg-white text-[#000000] border border-[#e6e6e6] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
            }`}
          >
            <Check
              className={`size-3.5 ${isCheckedInToday ? "animate-check-pop" : ""}`}
              data-icon="inline-start"
            />
            <span>{isCheckedInToday ? "Completed" : "Mark Done"}</span>
          </button>

          <button
            onClick={() => onToggleCheckIn(habit._id, todayDateStr, false)}
            className={`inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium active:scale-95 transition-all duration-150 cursor-pointer ${
              isMissedToday
                ? "bg-rose-600 text-white shadow-sm hover:bg-rose-700"
                : "bg-white text-[#615d59] border border-[#e6e6e6] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            }`}
            title="Mark explicitly as missed"
          >
            <X className="size-3.5" data-icon="inline-start" />
            <span>Missed</span>
          </button>
        </div>
      </div>
    </div>
  );
}
