import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Calendar } from "lucide-react";
import { createTopicSchema, type CreateTopicInput } from "@lifeos/shared";
import { cn } from "../../../lib/utils";

export interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTopicInput) => Promise<void>;
  subjects: Array<{ id: string; name: string; color?: string }>;
  defaultSubjectId?: string;
  initialData?: {
    id?: string;
    subjectId?: string;
    title?: string;
    deadline?: string | null;
    priority?: "low" | "medium" | "high";
    status?: "not_started" | "in_progress" | "completed";
    estimatedMinutes?: number | null;
  };
  title?: string;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  subjects,
  defaultSubjectId,
  initialData,
  title = "New Topic"
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateTopicInput>({
    resolver: zodResolver(createTopicSchema) as any,
    defaultValues: {
      subjectId: defaultSubjectId || subjects[0]?.id || "",
      title: "",
      deadline: null,
      priority: "medium",
      status: "not_started",
      estimatedMinutes: null
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        subjectId: initialData.subjectId || defaultSubjectId || subjects[0]?.id || "",
        title: initialData.title || "",
        deadline: initialData.deadline ? (new Date(initialData.deadline) as any) : null,
        priority: initialData.priority || "medium",
        status: initialData.status || "not_started",
        estimatedMinutes: initialData.estimatedMinutes ?? null
      });
    } else {
      reset({
        subjectId: defaultSubjectId || subjects[0]?.id || "",
        title: "",
        deadline: null,
        priority: "medium",
        status: "not_started",
        estimatedMinutes: null
      });
    }
  }, [initialData, defaultSubjectId, subjects, reset, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data as CreateTopicInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e6e6e6]">
          <h2 className="text-lg font-bold text-[#000000]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-5 space-y-4">
          {/* Subject Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
              Subject *
            </label>
            <select
              {...register("subjectId")}
              className="w-full rounded-lg border border-[#e6e6e6] bg-white px-3.5 py-2.5 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.subjectId && (
              <p className="mt-1 text-xs text-rose-600">{errors.subjectId.message}</p>
            )}
          </div>

          {/* Topic Title */}
          <div>
            <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
              Topic Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Binary Search Trees & AVL Rotations"
              {...register("title")}
              className={cn(
                "w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#000000] placeholder:text-[#a39e98] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20",
                errors.title ? "border-rose-400 focus:border-rose-500" : "border-[#e6e6e6] focus:border-[#0075de]"
              )}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>
            )}
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                {...register("priority")}
                className="w-full rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                {...register("status")}
                className="w-full rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Deadline & Estimated Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
                Deadline
              </label>
              <div className="relative">
                <input
                  type="date"
                  defaultValue={
                    initialData?.deadline
                      ? new Date(initialData.deadline).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue("deadline", val ? new Date(val) : null);
                  }}
                  className="w-full rounded-lg border border-[#e6e6e6] px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
                />
                <Calendar className="absolute right-3 top-2.5 size-4 text-[#a39e98] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
                Est. Minutes
              </label>
              <input
                type="number"
                min="5"
                step="5"
                placeholder="e.g. 60"
                {...register("estimatedMinutes", {
                  setValueAs: (v) => (v === "" ? null : Number(v))
                })}
                className="w-full rounded-lg border border-[#e6e6e6] px-3 py-2 text-sm text-[#000000] placeholder:text-[#a39e98] focus:border-[#0075de] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e6e6e6]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#e6e6e6] bg-white px-4 py-2 text-sm font-medium text-[#615d59] hover:bg-[#f6f5f4] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#0075de] px-5 py-2 text-sm font-semibold text-white hover:bg-[#005bab] transition-all shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : initialData?.id ? "Update Topic" : "Create Topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
