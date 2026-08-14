import { Flame, Trophy, AlertCircle } from "lucide-react";

export interface HabitStreakBadgeProps {
  currentStreak: number;
  longestStreak?: number;
  isCheckedInToday?: boolean;
  frequencyType?: "daily" | "weekly" | "custom";
  className?: string;
}

export function HabitStreakBadge({
  currentStreak,
  longestStreak = 0,
  isCheckedInToday = false,
  frequencyType = "daily",
  className = ""
}: HabitStreakBadgeProps) {
  const isPersonalBest = currentStreak > 0 && currentStreak >= longestStreak;
  const isAtRisk = currentStreak > 0 && !isCheckedInToday;
  const unitLabel = frequencyType === "daily" ? "d" : "w";

  if (currentStreak === 0) {
    return (
      <span
        className={`group inline-flex items-center gap-1.5 rounded-full bg-[#f6f5f4] px-2.5 py-1 text-xs font-medium text-[#615d59] border border-[#e6e6e6] transition-all duration-150 hover:scale-105 cursor-default ${className}`}
        title="No active streak"
      >
        <Flame className="size-3.5 text-[#a39e98] transition-transform duration-200 group-hover:scale-115" data-icon="inline-start" />
        <span>0{unitLabel} streak</span>
      </span>
    );
  }

  if (isPersonalBest) {
    return (
      <span
        className={`group inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200 shadow-sm transition-all duration-150 hover:scale-105 hover:shadow cursor-default ${className}`}
        title={`Personal Best! ${currentStreak}${unitLabel} streak (Tied or exceeded longest streak of ${longestStreak}${unitLabel})`}
      >
        <Trophy className="size-3.5 text-purple-600 transition-transform duration-200 group-hover:scale-120 group-hover:rotate-12" data-icon="inline-start" />
        <span>
          {currentStreak}
          {unitLabel} streak (PB!)
        </span>
      </span>
    );
  }

  if (isAtRisk) {
    return (
      <span
        className={`group inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-300 transition-all duration-150 hover:scale-105 cursor-default ${className}`}
        title="Streak at risk! Complete today's check-in to keep it going."
      >
        <AlertCircle className="size-3.5 text-amber-600 transition-transform duration-200 group-hover:scale-115" data-icon="inline-start" />
        <span>
          {currentStreak}
          {unitLabel} streak (At risk)
        </span>
      </span>
    );
  }

  return (
    <span
      className={`group inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 border border-orange-200 transition-all duration-150 hover:scale-105 hover:shadow-xs cursor-default ${className}`}
      title={`Active ${currentStreak} ${unitLabel} streak!`}
    >
      <Flame className="size-3.5 text-orange-500 fill-orange-500 transition-transform duration-200 group-hover:scale-125 group-hover:animate-flame-wobble" data-icon="inline-start" />
      <span>
        {currentStreak}
        {unitLabel} streak
      </span>
    </span>
  );
}
