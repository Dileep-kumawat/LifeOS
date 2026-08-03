import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "date-fns";

export type CalendarView = "day" | "week" | "month";

export interface Range {
  start: Date;
  end: Date;
}

/** Inclusive local start of day through exclusive next midnight. */
export function dayRange(date: Date): Range {
  const start = startOfDay(date);
  return { start, end: addDays(start, 1) };
}

/** Monday-start local week, exclusive end (next Monday midnight). */
export function weekRange(date: Date): Range {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return { start, end: addDays(start, 7) };
}

/** Calendar month, exclusive end (first day of the following month). */
export function monthRange(date: Date): Range {
  const start = startOfMonth(date);
  return { start, end: addMonths(start, 1) };
}

export function rangeForView(view: CalendarView, cursor: Date): Range {
  if (view === "day") return dayRange(cursor);
  if (view === "week") return weekRange(cursor);
  return monthRange(cursor);
}

/**
 * The day cells for a month grid, padded with adjacent-month days so the
 * grid always shows whole weeks starting Monday.
 */
export function monthGridDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

export function moveCursor(view: CalendarView, cursor: Date, direction: -1 | 1): Date {
  if (view === "day") return addDays(cursor, direction);
  if (view === "week") return addWeeks(cursor, direction);
  return addMonths(cursor, direction);
}

export function viewLabel(view: CalendarView, cursor: Date): string {
  if (view === "day") return format(cursor, "EEEE, MMMM d");
  if (view === "week") {
    const { start } = weekRange(cursor);
    return `${format(start, "MMM d")} – ${format(addDays(start, 6), "MMM d, yyyy")}`;
  }
  return format(cursor, "MMMM yyyy");
}

/** Local calendar-day key (yyyy-MM-dd) used to group occurrences by day. */
export function localDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function dayKeyForStartTime(startTime: string): string {
  return localDayKey(new Date(startTime));
}
