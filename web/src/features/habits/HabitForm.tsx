import { useState } from "react";
import { useNotificationPreferences } from "../notifications/hooks/useNotifications";

export interface HabitFormData {
  _id?: string;
  title: string;
  frequency: {
    type: "daily" | "weekly" | "custom";
    daysOfWeek?: number[];
    timesPerPeriod?: number;
  };
  reminderTime?: string | null;
  reminderEnabled?: boolean;
}

export interface HabitFormProps {
  initialValues?: Partial<HabitFormData>;
  onSubmit: (data: Partial<HabitFormData>) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const WEEKDAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 }
];

export function HabitForm({ initialValues, onSubmit, onCancel, isSubmitting = false }: HabitFormProps) {
  const { data: userPreferences } = useNotificationPreferences();
  const areHabitRemindersDisabled =
    userPreferences?.habitReminders?.push === false &&
    userPreferences?.habitReminders?.inApp === false;

  const [title, setTitle] = useState(initialValues?.title || "");
  const [freqType, setFreqType] = useState<"daily" | "weekly" | "custom">(
    initialValues?.frequency?.type || "daily"
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    initialValues?.frequency?.daysOfWeek || [1, 2, 3, 4, 5]
  );
  const [timesPerPeriod, setTimesPerPeriod] = useState<number>(
    initialValues?.frequency?.timesPerPeriod || 3
  );
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(
    initialValues?.reminderEnabled ?? Boolean(initialValues?.reminderTime)
  );
  const [reminderTime, setReminderTime] = useState<string>(
    initialValues?.reminderTime || "08:00"
  );

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      frequency: {
        type: freqType,
        daysOfWeek: freqType === "weekly" ? daysOfWeek : [],
        timesPerPeriod: freqType === "custom" ? timesPerPeriod : 1
      },
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-md max-w-lg w-full">
      <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-4">
        <h2 className="text-xl font-bold text-[#000000]">
          {initialValues?._id ? "Edit Habit" : "Create New Habit"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#615d59] hover:text-[#000000]"
        >
          Cancel
        </button>
      </div>

      {/* Habit Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="habit-title" className="text-xs font-semibold text-[#31302e]">
          Habit Title <span className="text-red-500">*</span>
        </label>
        <input
          id="habit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Morning Meditation, Read 20 pages"
          required
          className="rounded-lg border border-[#e6e6e6] bg-[#ffffff] px-3 py-2 text-sm text-[#000000] focus:border-[#0075de] focus:outline-none"
        />
      </div>

      {/* Frequency Picker */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold text-[#31302e]">Frequency Type</label>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setFreqType("daily")}
            className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-center transition-all ${
              freqType === "daily"
                ? "border-[#0075de] bg-blue-50 text-[#0075de] font-bold"
                : "border-[#e6e6e6] bg-white text-[#615d59] hover:bg-[#f6f5f4]"
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setFreqType("weekly")}
            className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-center transition-all ${
              freqType === "weekly"
                ? "border-[#0075de] bg-blue-50 text-[#0075de] font-bold"
                : "border-[#e6e6e6] bg-white text-[#615d59] hover:bg-[#f6f5f4]"
            }`}
          >
            Specific Days
          </button>
          <button
            type="button"
            onClick={() => setFreqType("custom")}
            className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-center transition-all ${
              freqType === "custom"
                ? "border-[#0075de] bg-blue-50 text-[#0075de] font-bold"
                : "border-[#e6e6e6] bg-white text-[#615d59] hover:bg-[#f6f5f4]"
            }`}
          >
            Times Per Week
          </button>
        </div>

        {/* Dynamic Options based on frequency type */}
        {freqType === "daily" && (
          <p className="text-xs text-[#615d59] bg-[#f6f5f4] p-3 rounded-lg border border-[#e6e6e6]">
            Requires a check-in every single calendar day to maintain your streak.
          </p>
        )}

        {freqType === "weekly" && (
          <div className="flex flex-col gap-2 rounded-lg bg-[#f6f5f4] p-3 border border-[#e6e6e6]">
            <span className="text-xs font-semibold text-[#31302e]">Select Active Days:</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = daysOfWeek.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`size-9 rounded-lg text-xs font-bold transition-all border ${
                      active
                        ? "bg-[#0075de] text-white border-[#0075de]"
                        : "bg-white text-[#615d59] border-[#e6e6e6] hover:bg-[#e6e6e6]"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {freqType === "custom" && (
          <div className="flex flex-col gap-2 rounded-lg bg-[#f6f5f4] p-3 border border-[#e6e6e6]">
            <label htmlFor="times-per-week" className="text-xs font-semibold text-[#31302e]">
              Target Times per Week:
            </label>
            <div className="flex items-center gap-3">
              <input
                id="times-per-week"
                type="number"
                min="1"
                max="7"
                value={timesPerPeriod}
                onChange={(e) => setTimesPerPeriod(Math.min(7, Math.max(1, Number(e.target.value))))}
                className="w-20 rounded-lg border border-[#e6e6e6] bg-white px-3 py-1.5 text-sm font-semibold text-[#000000] focus:border-[#0075de] focus:outline-none"
              />
              <span className="text-xs text-[#615d59]">times per week (any days)</span>
            </div>
          </div>
        )}
      </div>

      {/* Daily Reminder Section */}
      <div className="flex flex-col gap-3 rounded-lg bg-[#f6f5f4] p-3 border border-[#e6e6e6]">
        <label className="flex items-center gap-2 text-xs font-semibold text-[#31302e]">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="size-4 accent-[#0075de]"
          />
          Enable Daily Reminder
        </label>

        {reminderEnabled && (
          <div className="flex items-center gap-3 pt-1">
            <label htmlFor="habit-reminder-time" className="text-xs font-medium text-[#615d59]">
              Reminder Time:
            </label>
            <input
              id="habit-reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="rounded-lg border border-[#e6e6e6] bg-white px-3 py-1.5 text-sm font-semibold text-[#000000] focus:border-[#0075de] focus:outline-none"
            />
          </div>
        )}

        {areHabitRemindersDisabled && (
          <p className="text-xs text-[#dd5b00] bg-[#fff8f0] p-2.5 rounded-md border border-[#fce3cf] mt-1">
            ⚠️ Habit reminders are disabled in your notification settings.
          </p>
        )}
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
          {isSubmitting ? "Saving..." : initialValues?._id ? "Update Habit" : "Create Habit"}
        </button>
      </div>
    </form>
  );
}
