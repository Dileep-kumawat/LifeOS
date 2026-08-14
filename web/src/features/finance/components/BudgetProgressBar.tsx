import React from "react";

export interface BudgetProgressBarProps {
  currentSpend: number;
  limit: number;
  category?: string;
  period?: string;
  showLabels?: boolean;
  className?: string;
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  currentSpend,
  limit,
  category,
  period = "monthly",
  showLabels = true,
  className = ""
}) => {
  const safeLimit = Math.max(limit, 0.01);
  const percent = Math.max(0, (currentSpend / safeLimit) * 100);
  const overAmount = Math.max(0, currentSpend - limit);
  const isOver = currentSpend > limit;
  const isAtLimit = currentSpend === limit;
  const isApproaching = percent >= 80 && percent < 100;

  // Determine progress bar fill color and status badge styling based on thresholds
  let barColor = "bg-[#0075de]"; // Standard serene primary blue
  let badgeStyle = "bg-blue-50 text-[#0075de] border-blue-200";
  let statusText = "On Track";

  if (isOver) {
    barColor = "bg-red-600 animate-pulse";
    badgeStyle = "bg-red-50 text-red-700 border-red-200 font-semibold";
    statusText = `Over by ₹${overAmount.toFixed(2)}`;
  } else if (isAtLimit) {
    barColor = "bg-orange-500";
    badgeStyle = "bg-orange-50 text-orange-700 border-orange-200 font-semibold";
    statusText = "At Limit (100%)";
  } else if (isApproaching) {
    barColor = "bg-amber-500";
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
    statusText = "Approaching Limit";
  }

  // Cap visual bar width at 100% for progress track, while indicating overflow
  const visualWidth = Math.min(percent, 100);

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {category && <span className="font-semibold text-neutral-900">{category}</span>}
            <span className="text-xs text-neutral-500 capitalize">({period})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              <span className={isOver ? "font-bold text-red-600" : "text-neutral-900"}>
                ₹{currentSpend.toFixed(2)}
              </span>{" "}
              <span className="text-neutral-400">/ ₹{limit.toFixed(2)}</span>
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${badgeStyle}`}
            >
              {statusText}
            </span>
          </div>
        </div>
      )}

      {/* Progress Track */}
      <div className="relative w-full h-3 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
        <div
          className={`h-full transition-all duration-500 rounded-full ${barColor}`}
          style={{ width: `${visualWidth}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs text-neutral-500">
          <span>0%</span>
          <span className={isOver ? "text-red-600 font-medium" : ""}>
            {percent.toFixed(1)}% Used
          </span>
        </div>
      )}
    </div>
  );
};
