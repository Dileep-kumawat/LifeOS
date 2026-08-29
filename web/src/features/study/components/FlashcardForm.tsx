import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFlashcardSchema, type CreateFlashcardInput } from "@lifeos/shared";
import { cn } from "../../../lib/utils";

export interface FlashcardFormProps {
  onSubmit: (data: CreateFlashcardInput) => Promise<void>;
  onCancel?: () => void;
  topics?: Array<{ id: string; title: string; subjectId: string }>;
  subjects?: Array<{ id: string; name: string }>;
  initialData?: {
    id?: string;
    front?: string;
    back?: string;
    topicId?: string | null;
    subjectId?: string | null;
  };
  defaultTopicId?: string;
  defaultSubjectId?: string;
  submitLabel?: string;
}

export const FlashcardForm: React.FC<FlashcardFormProps> = ({
  onSubmit,
  onCancel,
  topics = [],
  subjects = [],
  initialData,
  defaultTopicId,
  defaultSubjectId,
  submitLabel
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<CreateFlashcardInput>({
    resolver: zodResolver(createFlashcardSchema) as any,
    defaultValues: {
      front: initialData?.front || "",
      back: initialData?.back || "",
      topicId: initialData?.topicId || defaultTopicId || null,
      subjectId: initialData?.subjectId || defaultSubjectId || null
    }
  });

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data as CreateFlashcardInput);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Front / Prompt */}
      <div>
        <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
          Front (Question / Prompt) *
        </label>
        <textarea
          rows={3}
          placeholder="e.g. What is the time complexity of QuickSelect average case?"
          {...register("front")}
          className={cn(
            "w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#000000] placeholder:text-[#a39e98] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20",
            errors.front ? "border-rose-400 focus:border-rose-500" : "border-[#e6e6e6] focus:border-[#0075de]"
          )}
        />
        {errors.front && (
          <p className="mt-1 text-xs text-rose-600">{errors.front.message}</p>
        )}
      </div>

      {/* Back / Answer */}
      <div>
        <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
          Back (Answer / Explanation) *
        </label>
        <textarea
          rows={4}
          placeholder="e.g. O(n) average case, O(n^2) worst case with bad pivot selection."
          {...register("back")}
          className={cn(
            "w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#000000] placeholder:text-[#a39e98] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20",
            errors.back ? "border-rose-400 focus:border-rose-500" : "border-[#e6e6e6] focus:border-[#0075de]"
          )}
        />
        {errors.back && (
          <p className="mt-1 text-xs text-rose-600">{errors.back.message}</p>
        )}
      </div>

      {/* Associations: Topic / Subject */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
              Subject (Optional)
            </label>
            <select
              {...register("subjectId", {
                setValueAs: (v) => (v === "" ? null : v)
              })}
              className="w-full rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
            >
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {topics.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
              Topic (Optional)
            </label>
            <select
              {...register("topicId", {
                setValueAs: (v) => (v === "" ? null : v)
              })}
              className="w-full rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
            >
              <option value="">No topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e6e6e6]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#e6e6e6] bg-white px-4 py-2 text-sm font-medium text-[#615d59] hover:bg-[#f6f5f4] transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[#0075de] px-5 py-2 text-sm font-semibold text-white hover:bg-[#005bab] transition-all shadow-xs disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : submitLabel || (initialData?.id ? "Update Flashcard" : "Create Flashcard")}
        </button>
      </div>
    </form>
  );
};
