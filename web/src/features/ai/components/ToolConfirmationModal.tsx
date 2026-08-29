import React, { useEffect, useRef } from "react";
import { Calendar, CheckCircle2, FileText, Target, AlertTriangle, X, BookOpen } from "lucide-react";
import type { ToolCallPayload } from "../types";

export interface ToolConfirmationModalProps {
  isOpen: boolean;
  toolCall: ToolCallPayload | null;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export const ToolConfirmationModal: React.FC<ToolConfirmationModalProps> = ({
  isOpen,
  toolCall,
  onConfirm,
  onCancel,
  isExecuting = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: Escape key to close modal & Focus Management
  useEffect(() => {
    if (!isOpen) return;

    // Focus confirm button when modal opens
    confirmButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isExecuting) {
        onCancel();
      }

      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isExecuting, onCancel]);

  if (!isOpen || !toolCall) return null;

  const { toolName, args } = toolCall;

  // Format human readable title & details based on tool name
  const renderDetails = () => {
    switch (toolName) {
      case "create_calendar_event": {
        const title = args.title || "Untitled Event";
        const start = args.startTime
          ? new Date(args.startTime).toLocaleString()
          : "Unspecified start";
        const end = args.endTime ? new Date(args.endTime).toLocaleString() : "Unspecified end";
        const location = args.location ? `Location: ${args.location}` : null;
        const timezone = args.timezone || "UTC";

        return {
          icon: <Calendar className="w-6 h-6 text-[#0075de]" />,
          actionTitle: "Create Calendar Event",
          description: `Schedule "${title}" on your calendar?`,
          items: [
            { label: "Title", value: title },
            { label: "Start Time", value: start },
            { label: "End Time", value: end },
            { label: "Timezone", value: timezone },
            ...(location ? [{ label: "Location", value: args.location }] : []),
            ...(args.recurrenceRule ? [{ label: "Recurrence", value: args.recurrenceRule }] : [])
          ]
        };
      }

      case "create_habit": {
        const title = args.title || "Untitled Habit";
        const freq = args.frequency?.type || "daily";

        return {
          icon: <Target className="w-6 h-6 text-emerald-600" />,
          actionTitle: "Create Habit Tracker",
          description: `Create habit tracker "${title}" (${freq})?`,
          items: [
            { label: "Habit Name", value: title },
            { label: "Frequency", value: freq },
            ...(args.reminderTime ? [{ label: "Daily Reminder", value: args.reminderTime }] : [])
          ]
        };
      }

      case "create_note": {
        const title = args.title || "Untitled Note";
        const snippet = args.content
          ? args.content.length > 100
            ? args.content.slice(0, 100) + "..."
            : args.content
          : "Empty content";

        return {
          icon: <FileText className="w-6 h-6 text-purple-600" />,
          actionTitle: "Create Notebook Note",
          description: `Create new note "${title}" in your notebook?`,
          items: [
            { label: "Title", value: title },
            { label: "Content Preview", value: snippet },
            ...(args.tags?.length ? [{ label: "Tags", value: args.tags.join(", ") }] : [])
          ]
        };
      }

      case "generate_study_plan":
      case "create_study_plan": {
        const targetDate = args.targetDate || "tomorrow";
        const plan = Array.isArray(args.plan) ? args.plan : Array.isArray(args.assignments) ? args.assignments : [];
        const count = plan.length;
        const totalMins = args.totalStudyMinutes || plan.reduce((sum: number, p: any) => sum + (p.durationMinutes || 0), 0);

        return {
          icon: <BookOpen className="w-6 h-6 text-indigo-600" />,
          actionTitle: "Apply AI Study Plan",
          description: `Schedule ${count} study session${count === 1 ? "" : "s"} (${totalMins} min total) on your calendar for ${targetDate}?`,
          items: [
            { label: "Target Date", value: targetDate },
            { label: "Total Sessions", value: `${count} study session(s)` },
            { label: "Total Duration", value: `${totalMins} minutes` },
            ...plan.map((s: any, idx: number) => {
              const start = s.startTime
                ? new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";
              const end = s.endTime
                ? new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";
              return {
                label: `Session ${idx + 1}: ${s.topicTitle || "Study Topic"}`,
                value: `${start} – ${end} (${s.durationMinutes || 45} min)`
              };
            })
          ]
        };
      }

      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          actionTitle: `Execute Action: ${toolName}`,
          description: `Confirm proposed tool action with parameters below?`,
          items: Object.entries(args).map(([k, v]) => ({
            label: k,
            value: typeof v === "object" ? JSON.stringify(v) : String(v)
          }))
        };
    }
  };

  const details = renderDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-confirm-modal-title"
        aria-describedby="tool-confirm-modal-desc"
        className="bg-white rounded-xl shadow-xl border border-[#e6e6e6] max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e6] bg-[#f6f5f4]">
          <div className="flex items-center gap-3">
            {details.icon}
            <div>
              <h3 id="tool-confirm-modal-title" className="text-base font-semibold text-[#000000]">
                {details.actionTitle}
              </h3>
              <p className="text-xs text-[#615d59]">User action confirmation required (FR-2.4)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-[#615d59] hover:text-[#000000] p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <p id="tool-confirm-modal-desc" className="text-sm font-medium text-[#31302e]">
            {details.description}
          </p>

          {/* Formatted Parameters List */}
          <div className="bg-[#f6f5f4] border border-[#e6e6e6] rounded-lg p-4 flex flex-col gap-2.5">
            {details.items.map((item, idx) => (
              <div key={idx} className="flex flex-col text-xs">
                <span className="font-semibold text-[#615d59] uppercase tracking-wider">
                  {item.label}
                </span>
                <span className="font-medium text-[#000000] break-words">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e6e6e6] bg-slate-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-[#31302e] bg-white border border-[#e6e6e6] rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel Action
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0075de] rounded-lg hover:bg-[#005bab] transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isExecuting ? "Executing..." : "Confirm & Execute"}
          </button>
        </div>
      </div>
    </div>
  );
};
