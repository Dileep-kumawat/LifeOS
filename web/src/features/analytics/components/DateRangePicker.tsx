import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Check, AlertCircle } from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";

export type DateRangePreset = "this_week" | "this_month" | "last_3_months" | "custom";

export interface DateRangeValue {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  preset: DateRangePreset;
}

export interface DateRangePickerProps {
  value?: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

export function computePresetRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  switch (preset) {
    case "this_week": {
      const start = subDays(now, 6);
      return { startDate: format(start, "yyyy-MM-dd"), endDate: todayStr };
    }
    case "this_month": {
      const start = startOfMonth(now);
      return { startDate: format(start, "yyyy-MM-dd"), endDate: todayStr };
    }
    case "last_3_months": {
      const start = subDays(now, 89);
      return { startDate: format(start, "yyyy-MM-dd"), endDate: todayStr };
    }
    case "custom":
    default:
      return { startDate: format(subDays(now, 29), "yyyy-MM-dd"), endDate: todayStr };
  }
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className = ""
}) => {
  const initialValue = value || {
    ...computePresetRange("this_month"),
    preset: "this_month"
  };

  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(initialValue.preset);
  const [customStart, setCustomStart] = useState<string>(initialValue.startDate);
  const [customEnd, setCustomEnd] = useState<string>(initialValue.endDate);
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(initialValue.preset === "custom");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setSelectedPreset(value.preset);
      setCustomStart(value.startDate);
      setCustomEnd(value.endDate);
      setIsCustomOpen(value.preset === "custom");
    }
  }, [value?.startDate, value?.endDate, value?.preset]);

  const validateRange = (startStr: string, endStr: string): boolean => {
    if (!startStr || !endStr) {
      setErrorMessage("Please specify both start and end dates.");
      return false;
    }
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setErrorMessage("Invalid date format.");
      return false;
    }
    if (start.getTime() > end.getTime()) {
      setErrorMessage("Start date cannot be after end date.");
      return false;
    }
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 366) {
      setErrorMessage("Date range cannot exceed 366 days (1 year).");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    if (preset === "custom") {
      setIsCustomOpen(true);
      return;
    }

    setIsCustomOpen(false);
    setErrorMessage(null);
    const range = computePresetRange(preset);
    setCustomStart(range.startDate);
    setCustomEnd(range.endDate);
    onChange({ ...range, preset });
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateRange(customStart, customEnd)) {
      onChange({
        startDate: customStart,
        endDate: customEnd,
        preset: "custom"
      });
    }
  };

  const presets: Array<{ id: DateRangePreset; label: string }> = [
    { id: "this_week", label: "This Week" },
    { id: "this_month", label: "This Month" },
    { id: "last_3_months", label: "Last 3 Months" },
    { id: "custom", label: "Custom" }
  ];

  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid="date-range-picker">
      {/* Preset Pill Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap bg-[#f6f5f4] p-1 rounded-lg border border-[#e6e6e6]">
        {presets.map((p) => {
          const isActive = selectedPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetClick(p.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                isActive
                  ? "bg-white text-[#0075de] shadow-xs border border-[#e6e6e6]"
                  : "text-[#615d59] hover:text-[#000000] hover:bg-white/60"
              }`}
              aria-pressed={isActive}
            >
              {p.label}
              {isActive && <Check className="size-3 text-[#0075de]" />}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Popover / Form */}
      {isCustomOpen && (
        <form
          onSubmit={handleCustomApply}
          className="p-3 bg-white border border-[#e6e6e6] rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CalendarIcon className="size-4 text-[#615d59] shrink-0" />
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label htmlFor="start-date-input" className="sr-only">Start Date</label>
              <input
                id="start-date-input"
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  validateRange(e.target.value, customEnd);
                }}
                className="px-2.5 py-1.5 text-xs bg-[#f6f5f4] border border-[#e6e6e6] rounded-md text-[#000000] font-medium focus:outline-none focus:ring-1 focus:ring-[#0075de]"
              />
              <span className="text-xs text-[#615d59]">to</span>
              <label htmlFor="end-date-input" className="sr-only">End Date</label>
              <input
                id="end-date-input"
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  validateRange(customStart, e.target.value);
                }}
                className="px-2.5 py-1.5 text-xs bg-[#f6f5f4] border border-[#e6e6e6] rounded-md text-[#000000] font-medium focus:outline-none focus:ring-1 focus:ring-[#0075de]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 bg-[#0075de] text-white text-xs font-semibold rounded-md hover:bg-[#005bab] transition-colors active:scale-95 shadow-xs w-full sm:w-auto"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Inline Validation Alert */}
      {errorMessage && (
        <div
          className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-md animate-in fade-in"
          role="alert"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
