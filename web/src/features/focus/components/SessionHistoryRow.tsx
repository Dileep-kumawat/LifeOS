import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  GraduationCap,
  Flag,
  CheckSquare,
  Brain,
  Timer
} from "lucide-react";
import type { FocusSession } from "@lifeos/shared";

interface SessionHistoryRowProps {
  session: FocusSession;
}

export const SessionHistoryRow: React.FC<SessionHistoryRowProps> = ({ session }) => {
  const startDate = new Date(session.startedAt);
  const formattedDate = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const formattedTime = startDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });

  const isCompleted = session.status === "completed";
  const isAbandoned = session.status === "abandoned";
  const isActive = session.status === "active";


  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-[#e6e6e6] shadow-2xs hover:border-[#c1c6d5] transition-all">
      {/* Left: Icon, Date, Type Badge */}
      <div className="flex items-start gap-3 min-w-0">
        {/* Status Indicator Icon */}
        <div
          className={`size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            isCompleted
              ? "bg-[#1aae39]/10 text-[#1aae39]"
              : isAbandoned
                ? "bg-[#dd5b00]/10 text-[#dd5b00]"
                : isActive
                  ? "bg-[#0075de]/10 text-[#0075de] animate-pulse"
                  : "bg-[#615d59]/10 text-[#615d59]"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="size-4.5" />
          ) : isAbandoned ? (
            <AlertCircle className="size-4.5" />
          ) : (
            <Clock className="size-4.5" />
          )}
        </div>

        {/* Content Details */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#000000]">
              {session.linkedType === "topic"
                ? "Study Topic Focus"
                : session.linkedType === "goal"
                  ? "Strategic Goal Focus"
                  : session.linkedType === "task"
                    ? "Task Execution"
                    : "Deep Work Session"}
            </span>

            {/* Polymorphic Link Badge */}
            {session.linkedType === "topic" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0075de]/10 text-[#0075de] border border-[#0075de]/20">
                <GraduationCap className="size-3" />
                Topic
              </span>
            )}
            {session.linkedType === "goal" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2a9d99]/10 text-[#2a9d99] border border-[#2a9d99]/20">
                <Flag className="size-3" />
                Goal
              </span>
            )}
            {session.linkedType === "task" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#dd5b00]/10 text-[#dd5b00] border border-[#dd5b00]/20">
                <CheckSquare className="size-3" />
                Task
              </span>
            )}
            {session.linkedType === "none" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f6f5f4] text-[#615d59] border border-[#e6e6e6]">
                <Brain className="size-3" />
                General
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#615d59]">
            <span>
              {formattedDate} at {formattedTime}
            </span>
            <span>•</span>
            <span>Cycle {session.currentCycle}</span>
            <span>•</span>
            <span className="tabular-nums">
              {session.workMinutes}m interval
            </span>
          </div>
        </div>
      </div>

      {/* Right: Duration & Status Badge */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f6f5f4]">
        {/* Total Focus Time Pill */}
        <div className="text-left sm:text-right">
          <div className="flex items-center sm:justify-end gap-1 text-sm font-bold text-[#000000] tabular-nums">
            <Timer className="size-3.5 text-[#0075de]" />
            <span>{session.totalFocusMinutes} min</span>
          </div>
          {isAbandoned && (
            <span className="text-[10px] text-[#dd5b00] block mt-0.5">
              Partial time saved
            </span>
          )}
        </div>

        {/* Status Badge */}
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
            isCompleted
              ? "bg-[#1aae39]/10 text-[#1aae39] border-[#1aae39]/30"
              : isAbandoned
                ? "bg-[#dd5b00]/10 text-[#dd5b00] border-[#dd5b00]/30"
                : isActive
                  ? "bg-[#0075de]/10 text-[#0075de] border-[#0075de]/30"
                  : "bg-[#615d59]/10 text-[#615d59] border-[#615d59]/30"
          }`}
        >
          {session.status}
        </span>
      </div>
    </div>
  );
};
