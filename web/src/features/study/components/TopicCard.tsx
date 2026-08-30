import React from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  Edit2,
  Trash2,
  Timer,
  Info
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { getDeadlineProximity } from "./SubjectCard";

export interface TopicCardProps {
  id: string;
  subjectId: string;
  title: string;
  deadline?: string | null;
  priority?: "low" | "medium" | "high";
  status?: "not_started" | "in_progress" | "completed";
  estimatedMinutes?: number | null;
  onStatusChange?: (id: string, status: "not_started" | "in_progress" | "completed") => void;
  onViewDetails?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const PRIORITY_STYLES = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200"
};

export const TopicCard: React.FC<TopicCardProps> = ({
  id,
  title,
  deadline,
  priority = "medium",
  status = "not_started",
  estimatedMinutes,
  onStatusChange,
  onViewDetails,
  onEdit,
  onDelete
}) => {
  const proximity = getDeadlineProximity(deadline);

  const cycleStatus = () => {
    if (!onStatusChange) return;
    if (status === "not_started") onStatusChange(id, "in_progress");
    else if (status === "in_progress") onStatusChange(id, "completed");
    else onStatusChange(id, "not_started");
  };

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-white p-4 transition-all duration-150 shadow-2xs hover:shadow-xs",
        status === "completed"
          ? "border-[#e6e6e6] bg-[#faf9f8]"
          : "border-[#e6e6e6] hover:border-[#c1c6d5]"
      )}
    >
      {/* Left: Status Toggle + Title + Badges */}
      <div className="flex items-start gap-3 min-w-0">
        <button
          type="button"
          onClick={cycleStatus}
          className="mt-0.5 shrink-0 text-[#a39e98] hover:text-[#0075de] transition-colors"
          title={`Status: ${status.replace("_", " ")} (click to cycle)`}
          aria-label="Toggle status"
        >
          {status === "completed" ? (
            <CheckCircle2 className="size-5 text-[#1aae39]" />
          ) : status === "in_progress" ? (
            <Clock3 className="size-5 text-[#0075de]" />
          ) : (
            <Circle className="size-5" />
          )}
        </button>

        <div className="min-w-0">
          <h4
            onClick={() => onViewDetails && onViewDetails(id)}
            className={cn(
              "text-sm font-semibold text-[#000000] leading-snug break-words",
              onViewDetails && "cursor-pointer hover:text-[#0075de] transition-colors",
              status === "completed" && "line-through text-[#615d59]"
            )}
          >
            {title}
          </h4>

          {/* Badges Row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Priority */}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border capitalize",
                PRIORITY_STYLES[priority]
              )}
            >
              {priority} priority
            </span>

            {/* Estimated Duration */}
            {estimatedMinutes && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f5f4] text-[#615d59] border border-[#e6e6e6] px-2 py-0.5 text-[11px] font-medium">
                <Timer className="size-3" />
                {estimatedMinutes} min
              </span>
            )}

            {/* Deadline Proximity */}
            {deadline && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
                  proximity.variant === "overdue" &&
                    "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
                  proximity.variant === "dueSoon" &&
                    "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
                  proximity.variant === "comfortable" &&
                    "bg-[#f6f5f4] text-[#615d59] border-[#e6e6e6]"
                )}
              >
                {proximity.variant === "overdue" || proximity.variant === "dueSoon" ? (
                  <Clock className="size-3" />
                ) : (
                  <Calendar className="size-3" />
                )}
                {proximity.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e6e6e6]/60">
        {onViewDetails && (
          <button
            type="button"
            onClick={() => onViewDetails(id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4] rounded-lg transition-colors"
            title="View topic details, study plan, focus time, and flashcards"
          >
            <Info className="size-3.5" />
            <span>Details</span>
          </button>
        )}
        <a
          href={`/focus?linkedType=topic&linkedId=${id}&linkedTitle=${encodeURIComponent(title)}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0075de] hover:bg-[#0075de]/10 rounded-lg transition-colors mr-1"
          title="Start Pomodoro Focus on this topic"
        >
          <Timer className="size-3.5" />
          <span>Focus</span>
        </a>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(id)}
            className="p-1.5 text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4] rounded-lg transition-colors"
            title="Edit topic"
            aria-label="Edit topic"
          >
            <Edit2 className="size-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="p-1.5 text-[#615d59] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete topic"
            aria-label="Delete topic"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
};

