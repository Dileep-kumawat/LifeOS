import React from "react";
import { Calendar, CheckCircle2, Clock, MoreVertical, Edit2, Trash2, BookOpen } from "lucide-react";
import { cn } from "../../../lib/utils";

export interface SubjectCardProps {
  id: string;
  name: string;
  color?: string;
  examDate?: string | null;
  topicsCount?: number;
  completedTopicsCount?: number;
  dueFlashcardsCount?: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function getDeadlineProximity(examDate?: string | null): {
  label: string;
  variant: "overdue" | "dueSoon" | "comfortable" | "none";
  formattedDate: string;
} {
  if (!examDate) {
    return { label: "Ongoing", variant: "none", formattedDate: "No exam date" };
  }

  const target = new Date(examDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: `Overdue (${overdueDays}d ago)`,
      variant: "overdue",
      formattedDate
    };
  }

  if (diffDays === 0) {
    return {
      label: "Exam Today!",
      variant: "overdue",
      formattedDate
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Due soon (${diffDays}d left)`,
      variant: "dueSoon",
      formattedDate
    };
  }

  return {
    label: `${diffDays} days left`,
    variant: "comfortable",
    formattedDate
  };
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  id,
  name,
  color = "#0075de",
  examDate,
  topicsCount = 0,
  completedTopicsCount = 0,
  dueFlashcardsCount = 0,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const proximity = getDeadlineProximity(examDate);
  const progressPercent =
    topicsCount > 0 ? Math.round((completedTopicsCount / topicsCount) * 100) : 0;

  return (
    <div
      onClick={() => onSelect?.(id)}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border bg-white p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md",
        isSelected
          ? "border-[#0075de] ring-2 ring-[#0075de]/20 shadow-sm"
          : "border-[#e6e6e6] hover:border-[#c1c6d5]"
      )}
    >
      {/* Top Accent Strip & Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="size-3.5 shrink-0 rounded-full border border-black/10 shadow-2xs"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <h3 className="font-semibold text-base text-[#000000] truncate tracking-tight">
              {name}
            </h3>
          </div>

          {/* Actions Dropdown */}
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4] rounded-lg transition-colors"
              aria-label="Subject options"
            >
              <MoreVertical className="size-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-32 rounded-lg border border-[#e6e6e6] bg-white py-1 shadow-lg z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit?.(id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#31302e] hover:bg-[#f6f5f4]"
                  >
                    <Edit2 className="size-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.(id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Deadline Proximity Badge */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
              proximity.variant === "overdue" &&
                "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
              proximity.variant === "dueSoon" &&
                "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
              proximity.variant === "comfortable" &&
                "bg-[#f6f5f4] text-[#615d59] border-[#e6e6e6]",
              proximity.variant === "none" &&
                "bg-[#f6f5f4] text-[#a39e98] border-[#e6e6e6]"
            )}
          >
            {proximity.variant === "overdue" || proximity.variant === "dueSoon" ? (
              <Clock className="size-3 shrink-0" />
            ) : (
              <Calendar className="size-3 shrink-0" />
            )}
            <span>{proximity.label}</span>
          </div>

          {examDate && (
            <span className="text-[11px] text-[#a39e98]">{proximity.formattedDate}</span>
          )}

          {dueFlashcardsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0075de]/10 text-[#0075de] border border-[#0075de]/20 px-2 py-0.5 text-[11px] font-semibold">
              <BookOpen className="size-3" />
              {dueFlashcardsCount} due
            </span>
          )}
        </div>
      </div>

      {/* Progress & Topic Stats Footer */}
      <div className="mt-5 pt-3 border-t border-[#e6e6e6]/80">
        <div className="flex items-center justify-between text-xs text-[#615d59] mb-1.5">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-[#1aae39]" />
            <span>
              {completedTopicsCount}/{topicsCount} topics
            </span>
          </span>
          <span className="font-medium text-[#000000]">{progressPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f6f5f4] border border-[#e6e6e6]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: color || "#0075de"
            }}
          />
        </div>
      </div>
    </div>
  );
};
