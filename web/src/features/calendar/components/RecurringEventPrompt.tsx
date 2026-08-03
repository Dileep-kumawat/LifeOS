import { cn } from "../../../lib/utils";

export type RecurrenceScope = "occurrence" | "series";

interface RecurringEventPromptProps {
  value: RecurrenceScope;
  onChange: (scope: RecurrenceScope) => void;
}

const OPTIONS: { value: RecurrenceScope; label: string; hint: string }[] = [
  { value: "occurrence", label: "Only this event", hint: "Changes just this one instance" },
  { value: "series", label: "All events", hint: "Changes the whole series" }
];

export function RecurringEventPrompt({ value, onChange }: RecurringEventPromptProps) {
  return (
    <div role="radiogroup" aria-label="Apply changes to" className="flex flex-col gap-1.5">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              selected ? "border-[#0075de] bg-[#e8f1fb]/50" : "border-[#e6e6e6] hover:bg-[#f6f5f4]"
            )}
          >
            <input
              type="radio"
              name="recurrence-scope"
              className="mt-1"
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-[#000000]">{option.label}</span>
              <span className="text-xs text-[#615d59]">{option.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
