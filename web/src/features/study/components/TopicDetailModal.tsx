import React from "react";
import {
  X,
  Clock,
  Calendar,
  Sparkles,
  Timer,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight
} from "lucide-react";

import type {
  TopicPriority,
  TopicStatus,
  FocusSession,
  TopicPlanEvent,
  TopicFlashcardStats,
  TopicFocusTime
} from "@lifeos/shared";

export interface TopicDetailData {
  id: string;
  subjectId: string;
  subjectName?: string;
  subjectColor?: string;
  title: string;
  deadline?: string | null;
  priority?: TopicPriority;
  status?: TopicStatus;
  estimatedMinutes?: number | null;
  focusTime?: TopicFocusTime;
  focusSessions?: FocusSession[];
  planEvents?: TopicPlanEvent[];
  flashcardStats?: TopicFlashcardStats;
}

interface TopicDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: TopicDetailData | null;
  onStartFocus?: (topicId: string, title: string) => void;
  onStartReview?: (topicId: string) => void;
}

const PRIORITY_STYLES: Record<TopicPriority, string> = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200"
};

const STATUS_LABELS: Record<TopicStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed"
};

export const TopicDetailModal: React.FC<TopicDetailModalProps> = ({
  isOpen,
  onClose,
  topic,
  onStartFocus,
  onStartReview
}) => {
  if (!isOpen || !topic) return null;

  const totalFocusMinutes = topic.focusTime?.totalFocusMinutes ?? 0;
  const sessionCount = topic.focusTime?.sessionCount ?? 0;
  const completedCount = topic.focusTime?.completedCount ?? 0;
  const planEvents = topic.planEvents ?? [];
  const focusSessions = topic.focusSessions ?? [];
  const flashcardStats = topic.flashcardStats ?? { total: 0, due: 0, mastered: 0, learning: 0 };

  const formatHoursAndMins = (mins: number) => {
    if (mins < 60) return `${mins} mins`;
    const h = (mins / 60).toFixed(1);
    return `${h} hrs (${mins} mins)`;
  };

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-detail-title"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-[#e6e6e6] shadow-xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#e6e6e6] bg-[#f6f5f4]/50">
          <div className="min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {topic.subjectName && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow-2xs"
                  style={{ backgroundColor: topic.subjectColor || "#0075de" }}
                >
                  {topic.subjectName}
                </span>
              )}
              {topic.priority && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                    PRIORITY_STYLES[topic.priority]
                  }`}
                >
                  {topic.priority} priority
                </span>
              )}
              {topic.status && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    topic.status === "completed"
                      ? "bg-[#1aae39]/10 text-[#1aae39] border-[#1aae39]/30"
                      : topic.status === "in_progress"
                        ? "bg-[#0075de]/10 text-[#0075de] border-[#0075de]/30"
                        : "bg-[#615d59]/10 text-[#615d59] border-[#615d59]/30"
                  }`}
                >
                  {STATUS_LABELS[topic.status]}
                </span>
              )}
            </div>

            <h2 id="topic-detail-title" className="text-xl font-bold text-[#000000] tracking-tight leading-snug">
              {topic.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#615d59]">
              {topic.estimatedMinutes && (
                <span className="inline-flex items-center gap-1">
                  <Timer className="size-3.5 text-[#0075de]" />
                  <span>Est. {topic.estimatedMinutes} mins</span>
                </span>
              )}
              {topic.deadline && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5 text-[#a39e98]" />
                  <span>Deadline: {new Date(topic.deadline).toLocaleDateString()}</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#615d59] hover:text-[#000000] hover:bg-[#e6e6e6]/60 rounded-xl transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Accumulated Focus Time Summary */}
          <div className="p-5 rounded-xl border border-[#e6e6e6] bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0075de] uppercase tracking-wider mb-1">
                <Clock className="size-4" />
                <span>Accumulated Study Time</span>
              </div>
              <p className="text-2xl font-bold text-[#000000] tabular-nums">
                {formatHoursAndMins(totalFocusMinutes)}
              </p>
              <p className="text-xs text-[#615d59] mt-0.5">
                {sessionCount > 0
                  ? `${completedCount} completed focus session${completedCount === 1 ? "" : "s"} (${sessionCount} total logged)`
                  : "No focus sessions logged yet against this topic."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onStartFocus) onStartFocus(topic.id, topic.title);
                else {
                  window.location.href = `/focus?linkedType=topic&linkedId=${topic.id}&linkedTitle=${encodeURIComponent(
                    topic.title
                  )}`;
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0075de] text-white text-xs font-bold hover:bg-[#005bab] transition-colors shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Timer className="size-4" />
              <span>Start Pomodoro Session</span>
            </button>
          </div>

          {/* Section 2: AI Study Plan vs. Actual Focus Side-by-Side */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#000000]">Plan vs. Actual Focus</h3>
                <p className="text-xs text-[#615d59]">
                  AI-allocated schedule events alongside verified logged Pomodoro sessions
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Scheduled AI Study Plan Events */}
              <div className="p-4 rounded-xl border border-[#e6e6e6] bg-[#f6f5f4]/50 flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#000000] mb-2.5">
                    <Sparkles className="size-3.5 text-[#0075de]" />
                    <span>AI Study Plan Events ({planEvents.length})</span>
                  </div>

                  {planEvents.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#a39e98]">
                      No AI study plan scheduled for this topic yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {planEvents.slice(0, 4).map((evt) => (
                        <div
                          key={evt.id}
                          className="p-2.5 rounded-lg bg-white border border-[#e6e6e6] text-xs shadow-2xs"
                        >
                          <p className="font-semibold text-[#000000] truncate">{evt.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#615d59]">
                            <Calendar className="size-3" />
                            <span>{formatDateTime(evt.startTime)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Actual Pomodoro Focus Sessions */}
              <div className="p-4 rounded-xl border border-[#e6e6e6] bg-[#f6f5f4]/50 flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#000000] mb-2.5">
                    <Timer className="size-3.5 text-[#1aae39]" />
                    <span>Actual Focus Logged ({focusSessions.length})</span>
                  </div>

                  {focusSessions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#a39e98]">
                      No actual Pomodoro sessions logged yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {focusSessions.slice(0, 4).map((sess) => (
                        <div
                          key={sess.id}
                          className="p-2.5 rounded-lg bg-white border border-[#e6e6e6] text-xs shadow-2xs flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              {sess.status === "completed" ? (
                                <CheckCircle2 className="size-3.5 text-[#1aae39]" />
                              ) : (
                                <AlertCircle className="size-3.5 text-[#dd5b00]" />
                              )}
                              <span className="font-semibold text-[#000000]">
                                {sess.totalFocusMinutes} mins focus
                              </span>
                            </div>
                            <span className="text-[11px] text-[#a39e98] mt-0.5 block">
                              {formatDateTime(sess.startedAt)}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              sess.status === "completed"
                                ? "bg-[#1aae39]/10 text-[#1aae39]"
                                : "bg-[#dd5b00]/10 text-[#dd5b00]"
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Flashcards & Spaced Repetition (SM-2) */}
          <div className="p-5 rounded-xl border border-[#e6e6e6] bg-white shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#000000] mb-1">
                  <BookOpen className="size-4 text-[#0075de]" />
                  <span>Flashcard Deck & Spaced Repetition</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
                  <span className="font-semibold text-[#000000]">
                    {flashcardStats.total} total cards
                  </span>
                  <span className="text-[#0075de] font-semibold">
                    {flashcardStats.due} due for review
                  </span>
                  <span className="text-[#1aae39] font-medium">
                    {flashcardStats.mastered} mastered
                  </span>
                </div>
              </div>

              {flashcardStats.total > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onStartReview) onStartReview(topic.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0075de]/10 text-[#0075de] text-xs font-semibold hover:bg-[#0075de]/20 transition-colors shrink-0"
                >
                  <span>Review Deck</span>
                  <ArrowRight className="size-3.5" />
                </button>
              ) : (
                <span className="text-xs text-[#a39e98]">No flashcards in this topic</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#e6e6e6] bg-[#f6f5f4]/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white text-xs font-semibold text-[#615d59] hover:text-[#000000] rounded-xl border border-[#e6e6e6] shadow-2xs hover:bg-[#f6f5f4] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
