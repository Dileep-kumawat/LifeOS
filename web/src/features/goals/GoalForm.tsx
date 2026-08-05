import React, { useState, useEffect } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, ListChecks } from "lucide-react";

export interface GoalFormData {
  _id?: string;
  title: string;
  description: string;
  targetDate: string;
  status: "active" | "completed" | "abandoned";
  progressPercent: number;
  milestones: Array<{ _id?: string; title: string; completed: boolean; order: number }>;
  linkedEventIds: string[];
  linkedNoteIds: string[];
}

export interface GoalFormProps {
  initialValues?: Partial<GoalFormData>;
  onSubmit: (data: Partial<GoalFormData>) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function GoalForm({ initialValues, onSubmit, onCancel, isSubmitting = false }: GoalFormProps) {
  const [title, setTitle] = useState(initialValues?.title || "");
  const [description, setDescription] = useState(initialValues?.description || "");
  const [targetDate, setTargetDate] = useState(
    initialValues?.targetDate ? initialValues.targetDate.split("T")[0] : ""
  );
  const [status, setStatus] = useState<"active" | "completed" | "abandoned">(
    initialValues?.status || "active"
  );
  const [progressPercent, setProgressPercent] = useState<number>(initialValues?.progressPercent || 0);

  const [milestones, setMilestones] = useState<
    Array<{ _id?: string; title: string; completed: boolean; order: number }>
  >(initialValues?.milestones || []);

  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const hasMilestones = milestones.length > 0;

  useEffect(() => {
    if (hasMilestones) {
      const done = milestones.filter((m) => m.completed).length;
      setProgressPercent(Math.round((done / milestones.length) * 100));
    }
  }, [milestones, hasMilestones]);

  const handleAddMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    setMilestones((prev) => [
      ...prev,
      { title: newMilestoneTitle.trim(), completed: false, order: prev.length }
    ]);
    setNewMilestoneTitle("");
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveMilestone = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= milestones.length) return;
    const updated = [...milestones];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // Reassign order
    updated.forEach((m, idx) => (m.order = idx));
    setMilestones(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description,
      targetDate: targetDate || undefined,
      status,
      progressPercent: hasMilestones ? undefined : progressPercent,
      milestones,
      linkedEventIds: initialValues?.linkedEventIds || [],
      linkedNoteIds: initialValues?.linkedNoteIds || []
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-md max-w-xl w-full">
      <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-4">
        <h2 className="text-xl font-bold text-[#000000]">
          {initialValues?._id ? "Edit Goal" : "Create New Goal"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#615d59] hover:text-[#000000]"
        >
          Cancel
        </button>
      </div>

      {/* Goal Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-title" className="text-xs font-semibold text-[#31302e]">
          Goal Title <span className="text-red-500">*</span>
        </label>
        <input
          id="goal-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Run a half marathon"
          required
          className="rounded-lg border border-[#e6e6e6] bg-[#ffffff] px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-description" className="text-xs font-semibold text-[#31302e]">
          Description
        </label>
        <textarea
          id="goal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why is this goal important?"
          rows={3}
          className="rounded-lg border border-[#e6e6e6] bg-[#ffffff] px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none"
        />
      </div>

      {/* Status & Target Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-status" className="text-xs font-semibold text-[#31302e]">
            Status
          </label>
          <select
            id="goal-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-lg border border-[#e6e6e6] bg-[#ffffff] px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-target-date" className="text-xs font-semibold text-[#31302e]">
            Target Date
          </label>
          <input
            id="goal-target-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-lg border border-[#e6e6e6] bg-[#ffffff] px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none"
          />
        </div>
      </div>

      {/* Progress Percent (Manual if no milestones) */}
      {!hasMilestones ? (
        <div className="flex flex-col gap-1.5 rounded-lg bg-[#f6f5f4] p-3 border border-[#e6e6e6]">
          <div className="flex items-center justify-between">
            <label htmlFor="manual-progress" className="text-xs font-semibold text-[#31302e]">
              Manual Progress Percentage
            </label>
            <span className="text-xs font-bold text-[#0075de]">{progressPercent}%</span>
          </div>
          <input
            id="manual-progress"
            type="range"
            min="0"
            max="100"
            value={progressPercent}
            onChange={(e) => setProgressPercent(Number(e.target.value))}
            className="w-full accent-[#0075de]"
          />
        </div>
      ) : (
        <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-100 text-xs text-blue-800 flex items-center gap-2">
          <ListChecks className="size-4 text-[#0075de] shrink-0" />
          <span>
            Progress is automatically computed ({progressPercent}%) based on milestone completion below.
          </span>
        </div>
      )}

      {/* Milestones Checklist Builder */}
      <div className="flex flex-col gap-3 border-t border-[#e6e6e6] pt-4">
        <label className="text-xs font-semibold text-[#31302e]">
          Milestones Checklist ({milestones.length})
        </label>

        {milestones.map((m, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-2 rounded-lg border border-[#e6e6e6] bg-[#f6f5f4] px-3 py-2"
          >
            <span className="text-xs text-[#000000] font-medium flex-1 truncate">{m.title}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveMilestone(index, "up")}
                disabled={index === 0}
                className="p-1 text-[#615d59] hover:text-[#000000] disabled:opacity-30"
                title="Move up"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveMilestone(index, "down")}
                disabled={index === milestones.length - 1}
                className="p-1 text-[#615d59] hover:text-[#000000] disabled:opacity-30"
                title="Move down"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveMilestone(index)}
                className="p-1 text-red-500 hover:text-red-700 ml-1"
                title="Remove milestone"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
            placeholder="Add milestone item..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddMilestone();
              }
            }}
            className="flex-1 rounded-lg border border-[#e6e6e6] bg-white px-3 py-1.5 text-xs text-[#000000] focus:border-[#0075de] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddMilestone}
            className="inline-flex items-center gap-1 rounded-lg bg-[#f6f5f4] border border-[#e6e6e6] px-3 py-1.5 text-xs font-semibold text-[#0075de] hover:bg-[#e6e6e6]"
          >
            <Plus className="size-3.5" data-icon="inline-start" />
            Add
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-[#e6e6e6] pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#e6e6e6] bg-white px-4 py-2 text-xs font-medium text-[#31302e] hover:bg-[#f6f5f4]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="rounded-lg bg-[#0075de] px-5 py-2 text-xs font-semibold text-white hover:bg-[#005bab] disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : initialValues?._id ? "Update Goal" : "Create Goal"}
        </button>
      </div>
    </form>
  );
}
