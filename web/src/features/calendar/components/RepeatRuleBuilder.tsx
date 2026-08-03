import type { RecurrenceDescriptor } from "@lifeos/shared";
import { format, parse } from "date-fns";
import { cn } from "../../../lib/utils";
import { Input } from "../../../components/ui/Input";
import { Label } from "../../../components/ui/Label";

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

interface RepeatRuleBuilderProps {
  value: RecurrenceDescriptor;
  onChange: (next: RecurrenceDescriptor) => void;
}

export function RepeatRuleBuilder({ value, onChange }: RepeatRuleBuilderProps) {
  const update = (patch: Partial<RecurrenceDescriptor>) => onChange({ ...value, ...patch });

  const untilDate = value.until ? format(new Date(value.until), "yyyy-MM-dd") : "";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#e6e6e6] bg-[#f6f5f4]/60 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rr-interval">Every</Label>
          <Input
            id="rr-interval"
            type="number"
            min={1}
            max={99}
            className="w-20"
            value={value.interval}
            onChange={(e) => update({ interval: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rr-frequency">Frequency</Label>
          <select
            id="rr-frequency"
            value={value.frequency}
            onChange={(e) =>
              update({
                frequency: e.target.value as RecurrenceDescriptor["frequency"],
                byDay: e.target.value === "weekly" ? value.byDay : undefined
              })
            }
            className="h-10 rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de]"
          >
            <option value="daily">day(s)</option>
            <option value="weekly">week(s)</option>
            <option value="monthly">month(s)</option>
            <option value="yearly">year(s)</option>
          </select>
        </div>
      </div>

      {value.frequency === "weekly" && (
        <div className="flex flex-col gap-1.5">
          <Label>On days</Label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const active = value.byDay?.includes(day) ?? false;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    update({
                      byDay: active
                        ? (value.byDay ?? []).filter((d) => d !== day)
                        : [...(value.byDay ?? []), day]
                    })
                  }
                  className={cn(
                    "h-8 w-9 rounded-md text-xs font-semibold transition-colors",
                    active
                      ? "bg-[#0075de] text-white"
                      : "border border-[#e6e6e6] bg-white text-[#615d59] hover:bg-[#f6f5f4]"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Ends</Label>
        <div className="flex flex-col gap-2 text-sm text-[#31302e]">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="rr-end"
              checked={value.endType === "never"}
              onChange={() => update({ endType: "never", until: undefined, count: undefined })}
            />
            Never
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="rr-end"
                checked={value.endType === "onDate"}
                onChange={() => update({ endType: "onDate", count: undefined })}
              />
              On date
            </label>
            {value.endType === "onDate" && (
              <Input
                type="date"
                className="w-40"
                value={untilDate}
                onChange={(e) => {
                  const parsed = e.target.value
                    ? parse(e.target.value, "yyyy-MM-dd", new Date())
                    : null;
                  update({ until: parsed ? parsed.toISOString() : undefined });
                }}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="rr-end"
                checked={value.endType === "after"}
                onChange={() => update({ endType: "after", until: undefined })}
              />
              After
            </label>
            {value.endType === "after" && (
              <Input
                type="number"
                min={1}
                max={999}
                className="w-20"
                value={value.count ?? 1}
                onChange={(e) => update({ count: Math.max(1, Number(e.target.value) || 1) })}
              />
            )}
            <span className="text-xs text-[#615d59]">occurrences</span>
          </div>
        </div>
      </div>
    </div>
  );
}
