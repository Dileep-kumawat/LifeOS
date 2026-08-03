import { addDays, format, isSameDay, isSameMonth, startOfWeek } from "date-fns";
import type { CalendarOccurrence } from "@lifeos/shared";
import { cn } from "../../../lib/utils";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EventCard } from "./EventCard";
import {
  dayKeyForStartTime,
  localDayKey,
  monthGridDays,
  type CalendarView,
  type Range
} from "../lib/rangeMath";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function eventPosition(start: Date, end: Date) {
  const clamp = (n: number) => Math.min(24 * 60, Math.max(0, n));
  const top = (clamp(minutesFromMidnight(start)) / 60) * HOUR_HEIGHT;
  const bottom = (clamp(minutesFromMidnight(end)) / 60) * HOUR_HEIGHT;
  return { top, height: Math.max(HOUR_HEIGHT * 0.5, bottom - top) };
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function groupByDay(occurrences: CalendarOccurrence[]): Record<string, CalendarOccurrence[]> {
  const map: Record<string, CalendarOccurrence[]> = {};
  for (const occurrence of occurrences) {
    const key = dayKeyForStartTime(occurrence.startTime);
    (map[key] ??= []).push(occurrence);
  }
  return map;
}

interface SubViewProps {
  cursor: Date;
  occurrences: CalendarOccurrence[];
  onSelectDay: (date: Date) => void;
  onOpenEvent: (occurrence: CalendarOccurrence) => void;
}

function TimeColumn({
  occurrences,
  onOpenEvent
}: {
  occurrences: CalendarOccurrence[];
  onOpenEvent: (o: CalendarOccurrence) => void;
}) {
  return (
    <div className="relative h-[1152px]">
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-[#e6e6e6]"
          style={{ top: hour * HOUR_HEIGHT }}
        />
      ))}
      {occurrences
        .filter((o) => !o.isAllDay)
        .map((occurrence) => {
          const { top, height } = eventPosition(
            new Date(occurrence.startTime),
            new Date(occurrence.endTime)
          );
          return (
            <EventCard
              key={occurrence.occurrenceId}
              variant="block"
              occurrence={occurrence}
              onOpen={onOpenEvent}
              style={{ top, height }}
            />
          );
        })}
    </div>
  );
}

function AllDayChips({
  occurrences,
  onOpenEvent
}: {
  occurrences: CalendarOccurrence[];
  onOpenEvent: (o: CalendarOccurrence) => void;
}) {
  if (occurrences.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-[#e6e6e6] bg-[#f6f5f4]/50 p-1">
      {occurrences.map((occurrence) => (
        <EventCard key={occurrence.occurrenceId} occurrence={occurrence} onOpen={onOpenEvent} />
      ))}
    </div>
  );
}

function DayHeader({ day, onSelectDay }: { day: Date; onSelectDay: (date: Date) => void }) {
  const today = new Date();
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="text-[10px] uppercase tracking-wide text-[#615d59]">
        {format(day, "EEE")}
      </span>
      <button
        type="button"
        onClick={() => onSelectDay(day)}
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-sm transition-colors",
          isSameDay(day, today)
            ? "bg-[#0075de] font-bold text-white"
            : "text-[#31302e] hover:bg-[#f6f5f4]"
        )}
      >
        {format(day, "d")}
      </button>
    </div>
  );
}

function DayView({ cursor, occurrences, onSelectDay, onOpenEvent }: SubViewProps) {
  const key = localDayKey(cursor);
  const byDay = groupByDay(occurrences);
  const allDay = (byDay[key] ?? []).filter((o) => o.isAllDay);
  const timed = (byDay[key] ?? []).filter((o) => !o.isAllDay);

  return (
    <div className="flex flex-col rounded-lg border border-[#e6e6e6]">
      <div className="flex flex-col items-center border-b border-[#e6e6e6] bg-[#f6f5f4]/50 py-2">
        <DayHeader day={cursor} onSelectDay={onSelectDay} />
      </div>
      <AllDayChips occurrences={allDay} onOpenEvent={onOpenEvent} />
      <div className="flex overflow-auto" style={{ maxHeight: 560 }}>
        <div className="relative w-14 shrink-0">
          {HOURS.map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-[#a39e98]"
              style={{ top: hour * HOUR_HEIGHT }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>
        <div className="flex-1">
          <TimeColumn occurrences={timed} onOpenEvent={onOpenEvent} />
        </div>
      </div>
    </div>
  );
}

function WeekView({ cursor, occurrences, onSelectDay, onOpenEvent }: SubViewProps) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = groupByDay(occurrences);

  return (
    <div className="flex flex-col rounded-lg border border-[#e6e6e6]">
      <div className="grid grid-cols-7 border-b border-[#e6e6e6] bg-[#f6f5f4]/50">
        {days.map((day) => (
          <DayHeader key={localDayKey(day)} day={day} onSelectDay={onSelectDay} />
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <div key={localDayKey(day)} className="border-l border-[#e6e6e6] first:border-l-0">
            <AllDayChips
              occurrences={(byDay[localDayKey(day)] ?? []).filter((o) => o.isAllDay)}
              onOpenEvent={onOpenEvent}
            />
          </div>
        ))}
      </div>
      <div className="flex overflow-auto" style={{ maxHeight: 560 }}>
        <div className="relative w-14 shrink-0">
          {HOURS.map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-[#a39e98]"
              style={{ top: hour * HOUR_HEIGHT }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7">
          {days.map((day) => (
            <div key={localDayKey(day)} className="border-l border-[#e6e6e6] first:border-l-0">
              <TimeColumn
                occurrences={(byDay[localDayKey(day)] ?? []).filter((o) => !o.isAllDay)}
                onOpenEvent={onOpenEvent}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({ cursor, occurrences, onSelectDay, onOpenEvent }: SubViewProps) {
  const days = monthGridDays(cursor);
  const byDay = groupByDay(occurrences);
  const today = new Date();
  const MAX_CHIPS = 3;

  return (
    <div className="flex flex-col rounded-lg border border-[#e6e6e6]">
      <div className="grid grid-cols-7 border-b border-[#e6e6e6] bg-[#f6f5f4]/60">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#615d59]"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = localDayKey(day);
          const dayOccurrences = byDay[key] ?? [];
          const inMonth = isSameMonth(day, cursor);
          return (
            <div
              key={key}
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-1 border-b border-r border-[#e6e6e6] p-1 transition-colors hover:bg-[#e8f1fb]/30",
                !inMonth && "bg-[#f6f5f4]/40"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center self-end rounded-full text-xs",
                  isSameDay(day, today)
                    ? "bg-[#0075de] font-bold text-white"
                    : inMonth
                      ? "text-[#31302e]"
                      : "text-[#a39e98]"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayOccurrences.slice(0, MAX_CHIPS).map((occurrence) => (
                  <EventCard
                    key={occurrence.occurrenceId}
                    occurrence={occurrence}
                    onOpen={onOpenEvent}
                  />
                ))}
                {dayOccurrences.length > MAX_CHIPS && (
                  <span className="px-1 text-[10px] text-[#615d59]">
                    +{dayOccurrences.length - MAX_CHIPS} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarSkeleton({ view }: { view: CalendarView }) {
  if (view === "month") {
    return (
      <div className="grid grid-cols-7 gap-px rounded-lg border border-[#e6e6e6] bg-[#e6e6e6]">
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-none bg-white" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[520px] w-full" />
    </div>
  );
}

interface CalendarViewProps {
  view: CalendarView;
  cursor: Date;
  range: Range;
  occurrences: CalendarOccurrence[];
  isLoading: boolean;
  onSelectDay: (date: Date) => void;
  onOpenEvent: (occurrence: CalendarOccurrence) => void;
}

export function CalendarView({
  view,
  cursor,
  occurrences,
  isLoading,
  onSelectDay,
  onOpenEvent
}: CalendarViewProps) {
  if (isLoading) return <CalendarSkeleton view={view} />;

  const shared = { cursor, occurrences, onSelectDay, onOpenEvent };
  if (view === "month") return <MonthView {...shared} />;
  if (view === "week") return <WeekView {...shared} />;
  return <DayView {...shared} />;
}
