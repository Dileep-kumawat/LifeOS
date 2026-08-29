import React from "react";
import { Sparkles, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";

export interface StudyPlanSessionItem {
  topicId?: string;
  topicTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reasoning?: string;
}

export interface StudyPlanCardProps {
  targetDate: string;
  sessions: StudyPlanSessionItem[];
  totalStudyMinutes?: number;
  status?: "pending" | "executing" | "executed" | "cancelled";
  onConfirm?: () => void;
  onCancel?: () => void;
  isExecuting?: boolean;
}

export const StudyPlanCard: React.FC<StudyPlanCardProps> = ({
  targetDate,
  sessions = [],
  totalStudyMinutes,
  status = "pending",
  onConfirm,
  onCancel,
  isExecuting = false
}) => {
  const calculatedTotalMinutes =
    totalStudyMinutes ?? sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return isNaN(date.getTime())
        ? isoString
        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white border border-[#e6e6e6] rounded-xl shadow-xs overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-white border-b border-[#e6e6e6] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#0d0d0d]">AI Study Plan</h4>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {targetDate}
              </span>
            </div>
            <p className="text-xs text-[#615d59] mt-0.5">
              Optimized schedule allocated to your free calendar slots
            </p>
          </div>
        </div>

        {/* Metrics Pill */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#615d59] bg-white/80 px-2.5 py-1 rounded-md border border-[#e6e6e6]">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-semibold text-[#0d0d0d]">{calculatedTotalMinutes} mins</span>
          <span className="text-[#8e8e8e]">•</span>
          <span>{sessions.length} sessions</span>
        </div>
      </div>

      {/* Session Timeline List */}
      <div className="p-4 space-y-2.5">
        {sessions.map((session, idx) => (
          <div
            key={session.topicId || idx}
            className="flex items-start gap-3 p-3 rounded-lg border border-[#f0f0f0] bg-[#fafafa] hover:bg-white hover:border-indigo-200 transition-colors"
          >
            {/* Step Number */}
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </div>

            {/* Session Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#0d0d0d] truncate">
                  {session.topicTitle}
                </span>
                <span className="text-xs font-mono font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/80 shrink-0">
                  {formatTime(session.startTime)} – {formatTime(session.endTime)}
                </span>
              </div>

              {session.reasoning && (
                <p className="text-xs text-[#71717a] mt-1 line-clamp-1">{session.reasoning}</p>
              )}
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-6 text-xs text-[#8e8e8e]">
            No study sessions allocated in this plan.
          </div>
        )}
      </div>

      {/* Footer State & Actions */}
      <div className="px-4 py-3 bg-[#fafafa] border-t border-[#e6e6e6] flex items-center justify-between gap-3">
        {status === "executed" ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Scheduled to your calendar</span>
          </div>
        ) : status === "cancelled" ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <XCircle className="w-4 h-4 text-slate-400" />
            <span>Plan cancelled</span>
          </div>
        ) : (
          <>
            <span className="text-xs text-[#615d59]">Review and apply to calendar</span>
            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isExecuting}
                  className="px-3 py-1.5 text-xs font-medium text-[#615d59] hover:text-[#0d0d0d] hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              {onConfirm && (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isExecuting || sessions.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {isExecuting ? "Scheduling..." : "Confirm & Schedule"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
