// rrule's timezone math computes offsets relative to the process's local
// timezone, which yields wrong results on any non-UTC host (see rrule docs:
// "run your app with TZ=UTC"). Force UTC before any Intl/rrule call happens.
process.env.TZ = "UTC";

// rrule ships as a bundled CommonJS module; in ESM the exports live on the
// default export, so import it whole and destructure. The type import is
// erased at runtime so it coexists with the value binding of the same name.
import rrulePkg from "rrule";
import type { RRule } from "rrule";
import type {
  CalendarOccurrence,
  RecurrenceDescriptor
} from "@lifeos/shared";
import { buildRruleString } from "@lifeos/shared";

const rrule = (rrulePkg as unknown as typeof import("rrule")).RRule;

// Single home for all recurrence math. Nothing outside this module (and its
// tests) touches the rrule API directly — the rest of the codebase works with
// `expandRecurrence`/`expandEvent`, day-keys, and structured descriptors.

const DAY_MS = 86_400_000;

export class RecurrenceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecurrenceParseError";
  }
}

export interface ExceptionLike {
  originalDate: Date | string;
  isCancelled?: boolean;
  overrideEventId?: string | { toString(): string } | null;
}

export interface CalendarEventLike {
  _id: string | { toString(): string };
  title: string;
  description?: string;
  location?: string;
  startTime: Date | string;
  endTime: Date | string;
  timezone: string;
  isAllDay?: boolean;
  recurrenceRule?: string | null;
  recurrenceEndDate?: Date | string | null;
  exceptions?: ExceptionLike[];
}

export function idOf(value: string | { toString(): string }): string {
  return typeof value === "string" ? value : value.toString();
}

export function isValidTimezone(tzid: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tzid });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a raw RFC 5545 RRULE string and verify it is valid for the given
 * dtstart/timezone. Throws `RecurrenceParseError` with a clear message when
 * malformed so routes can return a 400 instead of a 500.
 */
export function parseRecurrenceRule(ruleString: string, dtstart: Date, tzid: string): RRule {
  try {
    if (!ruleString || !ruleString.trim()) {
      throw new RecurrenceParseError('Recurrence rule is empty.');
    }
    const parsed = rrule.fromString(ruleString);
    const freq = parsed.origOptions.freq;
    const validFreqs = [rrule.YEARLY, rrule.MONTHLY, rrule.WEEKLY, rrule.DAILY];
    if (typeof freq !== "number" || !validFreqs.includes(freq)) {
      throw new RecurrenceParseError(
        `Invalid recurrence rule "${ruleString}": must include a valid FREQ part (YEARLY, MONTHLY, WEEKLY or DAILY).`
      );
    }
    return new rrule({ ...parsed.origOptions, dtstart, tzid });
  } catch (err) {
    if (err instanceof RecurrenceParseError) throw err;
    const detail = err instanceof Error ? err.message : String(err);
    throw new RecurrenceParseError(`Invalid recurrence rule "${ruleString}": ${detail}`);
  }
}

export function validateRecurrenceRule(ruleString: string, dtstart: Date, tzid: string): void {
  parseRecurrenceRule(ruleString, dtstart, tzid);
}

/**
 * Calendar day (YYYY-MM-DD) of a given instant in a given IANA timezone.
 */
export function dateKeyInZone(date: Date, tzid: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tzid,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  let year = "";
  let month = "";
  let day = "";
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") day = part.value;
  }
  return `${year}-${month}-${day}`;
}

/** UTC midnight Date for a YYYY-MM-DD day-key. */
export function utcMidnightForKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * rrule interprets `dtstart`'s wall-clock components as the local time in
 * `tzid`. Our stored startTime is a true UTC instant, so before expanding we
 * re-express it as the wall-clock date it represents in the event's timezone
 * (e.g. 13:00Z in America/New_York on Aug 3 → 2026-08-03T09:00:00.000Z).
 * This keeps DST handling correct across the whole series.
 */
export function toWallClockInZone(instant: Date, tzid: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tzid,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(instant);
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  let hour = Number(values.hour);
  if (hour === 24) hour = 0; // Intl can emit "24" for midnight
  return new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      hour,
      Number(values.minute),
      Number(values.second)
    )
  );
}

/** Day-key of a Date that was stored as UTC midnight (i.e. an exception date). */
export function keyOfUtcMidnight(date: Date | string): string {
  return dateKeyInZone(typeof date === "string" ? new Date(date) : date, "UTC");
}

/**
 * Deterministic id for a single occurrence: `eventId@ISO-start`. The client
 * can paste it straight back into the occurrence-scoped endpoints to address
 * exactly one instance of a series.
 */
export function occurrenceIdFor(eventId: string, occurrenceStart: Date): string {
  return `${eventId}@${occurrenceStart.toISOString()}`;
}

export function parseOccurrenceId(occurrenceId: string): { eventId: string; occurrenceStart: Date } | null {
  const at = occurrenceId.lastIndexOf("@");
  if (at <= 0 || at === occurrenceId.length - 1) return null;
  const eventId = occurrenceId.slice(0, at);
  const occurrenceStart = new Date(occurrenceId.slice(at + 1));
  if (Number.isNaN(occurrenceStart.getTime())) return null;
  return { eventId, occurrenceStart };
}

export function exceptionByDateKey(event: CalendarEventLike, key: string): ExceptionLike | undefined {
  return (event.exceptions || []).find((e) => keyOfUtcMidnight(e.originalDate) === key);
}

/**
 * Pure overlap predicate for conflict detection: an occurrence conflicts when
 * its window partially OR fully overlaps [start, end) — not only on exact
 * matches. Optionally excludes a single occurrence id (editing one instance).
 */
export function filterOverlapping(
  occurrences: CalendarOccurrence[],
  start: Date,
  end: Date,
  excludeOccurrenceId?: string
): CalendarOccurrence[] {
  return occurrences.filter((occurrence) => {
    if (excludeOccurrenceId && occurrence.occurrenceId === excludeOccurrenceId) return false;
    return (
      new Date(occurrence.endTime).getTime() > start.getTime() &&
      new Date(occurrence.startTime).getTime() < end.getTime()
    );
  });
}

function buildOccurrence(
  source: CalendarEventLike,
  start: Date,
  end: Date,
  eventId: string,
  originalOccurrenceStart: Date,
  isRecurring: boolean,
  isOverridden: boolean
): CalendarOccurrence {
  return {
    occurrenceId: occurrenceIdFor(eventId, originalOccurrenceStart),
    eventId,
    title: source.title,
    description: source.description ?? "",
    location: source.location ?? "",
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    timezone: source.timezone,
    isAllDay: Boolean(source.isAllDay),
    isRecurring,
    isOverridden
  };
}

/**
 * Expand a single event (recurring or not) into occurrences overlapping
 * [rangeStart, rangeEnd]. `overrides` maps overrideEventId -> the override
 * document, used to substitute title/times for specific instances.
 */
export function expandEvent(
  event: CalendarEventLike,
  rangeStart: Date,
  rangeEnd: Date,
  overrides: Map<string, CalendarEventLike> = new Map()
): CalendarOccurrence[] {
  const eventId = idOf(event._id);
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const duration = end.getTime() - start.getTime();
  const tzid = event.timezone || "UTC";
  const isRecurring = Boolean(event.recurrenceRule);

  if (!isRecurring) {
    if (end.getTime() <= rangeStart.getTime() || start.getTime() >= rangeEnd.getTime()) {
      return [];
    }
    return [buildOccurrence(event, start, end, eventId, start, false, false)];
  }

  const rule = parseRecurrenceRule(event.recurrenceRule as string, toWallClockInZone(start, tzid), tzid);

  // Pad the start boundary by at least one duration/day so occurrences that
  // begin just before the range (and spill into it) are still considered.
  const searchStart = new Date(rangeStart.getTime() - Math.max(duration, DAY_MS));
  const occurrenceStarts = rule.between(searchStart, rangeEnd, true);

  const results: CalendarOccurrence[] = [];
  for (const occStart of occurrenceStarts) {
    if (event.recurrenceEndDate) {
      const recurrenceEnd = new Date(event.recurrenceEndDate);
      if (occStart.getTime() > recurrenceEnd.getTime()) continue;
    }

    const exception = exceptionByDateKey(event, dateKeyInZone(occStart, tzid));
    if (exception?.isCancelled) continue;

    const overrideId = exception?.overrideEventId ? idOf(exception.overrideEventId) : null;
    const override = overrideId ? overrides.get(overrideId) : undefined;

    const occurrence = override
      ? buildOccurrence(override, new Date(override.startTime), new Date(override.endTime), eventId, occStart, true, true)
      : buildOccurrence(event, occStart, new Date(occStart.getTime() + duration), eventId, occStart, true, false);

    if (
      new Date(occurrence.endTime).getTime() <= rangeStart.getTime() ||
      new Date(occurrence.startTime).getTime() >= rangeEnd.getTime()
    ) {
      continue;
    }
    results.push(occurrence);
  }

  return results;
}

/**
 * Expand a batch of events into a single, time-sorted list of occurrences for
 * the given range. The standard entry point for list/conflict responses.
 */
export function expandRange(
  events: CalendarEventLike[],
  rangeStart: Date,
  rangeEnd: Date,
  overrides: Map<string, CalendarEventLike> = new Map()
): CalendarOccurrence[] {
  const out: CalendarOccurrence[] = [];
  for (const event of events) {
    out.push(...expandEvent(event, rangeStart, rangeEnd, overrides));
  }
  return out.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

const WEEKDAY_NAMES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export { buildRruleString };

export function describeRecurrence(ruleString: string | null): RecurrenceDescriptor | null {
  if (!ruleString) return null;
  try {
    const parsed = rrule.fromString(ruleString);
    const options = parsed.origOptions;

    const frequencyByFreq: Record<number, RecurrenceDescriptor["frequency"]> = {
      [rrule.YEARLY]: "yearly",
      [rrule.MONTHLY]: "monthly",
      [rrule.WEEKLY]: "weekly",
      [rrule.DAILY]: "daily"
    };

    const descriptor: RecurrenceDescriptor = {
      frequency: frequencyByFreq[options.freq as number] ?? "custom",
      interval: options.interval ?? 1,
      endType: "never"
    };

    if (options.until) {
      descriptor.endType = "onDate";
      descriptor.until = new Date(options.until).toISOString();
    } else if (typeof options.count === "number") {
      descriptor.endType = "after";
      descriptor.count = options.count;
    }

    const byweekday = options.byweekday;
    const days: string[] = [];
    if (Array.isArray(byweekday)) {
      for (const day of byweekday) {
        days.push(typeof day === "number" ? WEEKDAY_NAMES[day] : day.toString());
      }
    } else if (typeof byweekday === "number") {
      days.push(WEEKDAY_NAMES[byweekday]);
    }
    if (days.length) descriptor.byDay = days;

    return descriptor;
  } catch {
    return null;
  }
}
