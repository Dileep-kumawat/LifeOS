import { ListChecks, Edit3 } from "lucide-react";

export interface GoalProgressBarProps {
  progressPercent: number;
  isMilestoneDerived?: boolean;
  milestoneCount?: number;
  completedMilestoneCount?: number;
  className?: string;
}

export function GoalProgressBar({
  progressPercent,
  isMilestoneDerived = false,
  milestoneCount = 0,
  completedMilestoneCount = 0,
  className = ""
}: GoalProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between text-xs font-medium text-[#31302e]">
        <div className="flex items-center gap-1.5">
          {isMilestoneDerived ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#f6f5f4] px-2 py-0.5 text-[11px] text-[#0075de] border border-[#e6e6e6] transition-transform duration-150 hover:scale-105 cursor-default"
              title="Progress is automatically calculated from milestone completion"
            >
              <ListChecks className="size-3.5" data-icon="inline-start" />
              <span>
                {completedMilestoneCount}/{milestoneCount} Milestones
              </span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#f6f5f4] px-2 py-0.5 text-[11px] text-[#615d59] border border-[#e6e6e6] transition-transform duration-150 hover:scale-105 cursor-default"
              title="Manual progress entry"
            >
              <Edit3 className="size-3.5" data-icon="inline-start" />
              <span>Manual Progress</span>
            </span>
          )}
        </div>
        <span className="font-semibold text-[#000000] tabular-nums transition-all duration-300">
          {clampedProgress}%
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#f6f5f4] border border-[#e6e6e6]">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            isMilestoneDerived ? "bg-[#0075de]" : "bg-[#2a9d99]"
          }`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
