import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Calendar, Check } from "lucide-react";
import { createSubjectSchema, type CreateSubjectInput } from "@lifeos/shared";
import { cn } from "../../../lib/utils";

export interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubjectInput) => Promise<void>;
  initialData?: {
    id?: string;
    name?: string;
    color?: string;
    examDate?: string | null;
  };
  title?: string;
}

const STICKER_COLORS = [
  { name: "Blue", value: "#0075de" },
  { name: "Green", value: "#1aae39" },
  { name: "Orange", value: "#dd5b00" },
  { name: "Purple", value: "#d6b6f6" },
  { name: "Pink", value: "#ff64c8" },
  { name: "Sky", value: "#62aef0" },
  { name: "Teal", value: "#2a9d99" },
  { name: "Brown", value: "#523410" },
  { name: "Deep Purple", value: "#391c57" },
  { name: "Charcoal", value: "#31302e" }
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = "New Subject"
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateSubjectInput>({
    resolver: zodResolver(createSubjectSchema) as any,
    defaultValues: {
      name: "",
      color: "#0075de",
      examDate: null
    }
  });

  const selectedColor = watch("color");

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        color: initialData.color || "#0075de",
        examDate: initialData.examDate ? (new Date(initialData.examDate) as any) : null
      });
    } else {
      reset({
        name: "",
        color: "#0075de",
        examDate: null
      });
    }
  }, [initialData, reset, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data as CreateSubjectInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
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
          {/* Subject Name */}
          <div>
            <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
              Subject Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Organic Chemistry, Algorithms..."
              {...register("name")}
              className={cn(
                "w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#000000] placeholder:text-[#a39e98] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20",
                errors.name ? "border-rose-400 focus:border-rose-500" : "border-[#e6e6e6] focus:border-[#0075de]"
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>

          {/* Color Palette Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-2">
              Subject Color Theme
            </label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {STICKER_COLORS.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  onClick={() => setValue("color", col.value)}
                  className={cn(
                    "size-7 rounded-full flex items-center justify-center transition-all duration-150 border",
                    selectedColor === col.value
                      ? "ring-2 ring-offset-2 ring-[#0075de] scale-110 border-transparent shadow-xs"
                      : "border-black/10 hover:scale-105"
                  )}
                  style={{ backgroundColor: col.value }}
                  title={col.name}
                  aria-label={`Select ${col.name} color`}
                >
                  {selectedColor === col.value && (
                    <Check className="size-3.5 text-white drop-shadow-xs" />
                  )}
                </button>
              ))}
            </div>
            {errors.color && (
              <p className="mt-1 text-xs text-rose-600">{errors.color.message}</p>
            )}
          </div>

          {/* Exam Date / Deadline */}
          <div>
            <label className="block text-xs font-semibold text-[#31302e] uppercase tracking-wider mb-1.5">
              Exam Date / Final Deadline (Optional)
            </label>
            <div className="relative">
              <input
                type="date"
                defaultValue={
                  initialData?.examDate
                    ? new Date(initialData.examDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setValue("examDate", val ? new Date(val) : null);
                }}
                className="w-full rounded-lg border border-[#e6e6e6] px-3.5 py-2.5 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
              />
              <Calendar className="absolute right-3.5 top-3 size-4 text-[#a39e98] pointer-events-none" />
            </div>
            <p className="mt-1 text-[11px] text-[#a39e98]">
              Helps surface upcoming exams and urgency indicators across your dashboard.
            </p>
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
              {isSubmitting ? "Saving..." : initialData?.id ? "Update Subject" : "Create Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
