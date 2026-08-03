import { describe, it, expect } from "vitest";
import {
  RecurrenceParseError,
  describeRecurrence,
  expandEvent,
  expandRange,
  occurrenceIdFor,
  parseOccurrenceId,
  validateRecurrenceRule
} from "../recurrence.js";

const TZ = "America/New_York";

function series(overrides: Partial<{
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isAllDay: boolean;
  recurrenceRule: string | null;
  recurrenceEndDate: string | null;
  exceptions: any[];
}>) {
  return {
    _id: overrides._id ?? "event-1",
    title: overrides.title ?? "Recurring standup",
    description: "",
    location: "",
    // 09:00 local in America/New_York, stored as the true UTC instant.
    startTime: overrides.startTime ?? "2026-08-03T13:00:00.000Z",
    endTime: overrides.endTime ?? "2026-08-03T13:30:00.000Z",
    timezone: overrides.timezone ?? TZ,
    isAllDay: overrides.isAllDay ?? false,
    recurrenceRule: overrides.recurrenceRule ?? null,
    recurrenceEndDate: overrides.recurrenceEndDate ?? null,
    exceptions: overrides.exceptions ?? []
  };
}

describe("RRULE expansion correctness", () => {
  it("expands a daily rule across the requested range", () => {
    const event = series({ recurrenceRule: "FREQ=DAILY" });
    const out = expandEvent(event, new Date("2026-08-03T00:00:00Z"), new Date("2026-08-08T00:00:00Z"));
    // 09:00 EDT == 13:00 UTC, 30-minute duration
    expect(out.map((o) => o.startTime)).toEqual([
      "2026-08-03T13:00:00.000Z",
      "2026-08-04T13:00:00.000Z",
      "2026-08-05T13:00:00.000Z",
      "2026-08-06T13:00:00.000Z",
      "2026-08-07T13:00:00.000Z"
    ]);
    expect(out[0].endTime).toBe("2026-08-03T13:30:00.000Z");
    expect(out[0].isRecurring).toBe(true);
  });

  it("expands a weekly rule honoring BYDAY (MO,WE)", () => {
    const event = series({ recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE" });
    const out = expandEvent(event, new Date("2026-08-01T00:00:00Z"), new Date("2026-08-15T00:00:00Z"));
    expect(out.map((o) => o.startTime)).toEqual([
      "2026-08-03T13:00:00.000Z", // Monday
      "2026-08-05T13:00:00.000Z", // Wednesday
      "2026-08-10T13:00:00.000Z", // Monday
      "2026-08-12T13:00:00.000Z" // Wednesday
    ]);
  });

  it("expands a monthly rule", () => {
    // Jan 15 at 09:00 EST == 14:00Z (UTC-5); Apr 15 is EDT (UTC-4) → 13:00Z.
    const event = series({ startTime: "2026-01-15T14:00:00.000Z", recurrenceRule: "FREQ=MONTHLY" });
    const out = expandEvent(event, new Date("2026-01-01T00:00:00Z"), new Date("2026-05-01T00:00:00Z"));
    expect(out).toHaveLength(4);
    expect(out[0].startTime).toBe("2026-01-15T14:00:00.000Z");
    expect(out[3].startTime).toBe("2026-04-15T13:00:00.000Z");
  });

  it("expands a custom interval rule (every other week)", () => {
    const event = series({ recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO" });
    const out = expandEvent(event, new Date("2026-08-01T00:00:00Z"), new Date("2026-09-15T00:00:00Z"));
    expect(out.map((o) => o.startTime)).toEqual([
      "2026-08-03T13:00:00.000Z",
      "2026-08-17T13:00:00.000Z",
      "2026-08-31T13:00:00.000Z",
      "2026-09-14T13:00:00.000Z"
    ]);
  });

  it("bounds an infinite rule by recurrenceEndDate", () => {
    const event = series({ recurrenceRule: "FREQ=WEEKLY;BYDAY=MO", recurrenceEndDate: "2026-08-16T00:00:00Z" });
    const out = expandEvent(event, new Date("2026-08-01T00:00:00Z"), new Date("2026-09-01T00:00:00Z"));
    // Recurrence end date is Aug 16, so only Mondays Aug 3 and Aug 10.
    expect(out.map((o) => o.startTime)).toEqual(["2026-08-03T13:00:00.000Z", "2026-08-10T13:00:00.000Z"]);
  });

  it("respects UNTIL embedded in the RRULE string", () => {
    // UNTIL is inclusive; the Aug 5 13:00Z occurrence is the last one at or
    // before 2026-08-06T00:00:00Z.
    const event = series({ recurrenceRule: "FREQ=DAILY;UNTIL=20260806T000000Z" });
    const out = expandEvent(event, new Date("2026-08-01T00:00:00Z"), new Date("2026-08-15T00:00:00Z"));
    expect(out).toHaveLength(3); // Aug 3, 4, 5
  });

  it("rejects malformed RRULE strings with a clear error (not a 500)", () => {
    expect(() => validateRecurrenceRule("FREQ=THIS_IS_NOT_VALID", new Date(), TZ)).toThrow(RecurrenceParseError);
    expect(() => validateRecurrenceRule("", new Date(), TZ)).toThrow(RecurrenceParseError);
    expect(() => validateRecurrenceRule("BYDAY=MO", new Date(), TZ)).toThrow(RecurrenceParseError);
  });

  it("returns nothing for a non-recurring event outside the range", () => {
    const event = series({
      startTime: "2026-01-01T09:00:00Z",
      endTime: "2026-01-01T10:00:00Z",
      recurrenceRule: null
    });
    const out = expandEvent(event, new Date("2026-08-01T00:00:00Z"), new Date("2026-08-31T00:00:00Z"));
    expect(out).toEqual([]);
  });
});

describe("describeRecurrence", () => {
  it("parses a structured descriptor from an RRULE string", () => {
    expect(describeRecurrence("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE")).toEqual({
      frequency: "weekly",
      interval: 2,
      endType: "never",
      byDay: ["MO", "WE"]
    });
  });

  it("detects onDate end type", () => {
    const d = describeRecurrence("FREQ=DAILY;UNTIL=20261231T000000Z");
    expect(d?.endType).toBe("onDate");
    expect(d?.until).toBe("2026-12-31T00:00:00.000Z");
  });

  it("detects after (COUNT) end type", () => {
    const d = describeRecurrence("FREQ=DAILY;COUNT=10");
    expect(d?.endType).toBe("after");
    expect(d?.count).toBe(10);
  });

  it("returns null for non-recurring events", () => {
    expect(describeRecurrence(null)).toBeNull();
    expect(describeRecurrence("not a rule")).toBeNull();
  });
});

describe("occurrence ids", () => {
  it("derives a deterministic occurrence id from eventId + start date", () => {
    const id = occurrenceIdFor("event-1", new Date("2026-08-03T13:00:00.000Z"));
    expect(id).toBe("event-1@2026-08-03T13:00:00.000Z");
    expect(occurrenceIdFor("event-1", new Date("2026-08-03T13:00:00.000Z"))).toBe(id);
  });

  it("round-trips an occurrence id back to eventId + start", () => {
    const parsed = parseOccurrenceId("event-1@2026-08-03T13:00:00.000Z");
    expect(parsed?.eventId).toBe("event-1");
    expect(parsed?.occurrenceStart.toISOString()).toBe("2026-08-03T13:00:00.000Z");
  });

  it("rejects malformed occurrence ids", () => {
    expect(parseOccurrenceId("not-an-id")).toBeNull();
    expect(parseOccurrenceId("event-1@")).toBeNull();
    expect(parseOccurrenceId("event-1@notadate")).toBeNull();
  });
});

describe("single-occurrence edits do not affect the rest of the series", () => {
  it("overrides only the edited instance (title + moved time)", () => {
    const event = series({ recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE" });
    // Instance on Aug 5 is overridden: title changes and it moves to 14:00-14:30.
    const overrides = new Map([
      [
        "override-1",
        {
          _id: "override-1",
          title: "Design review (rescheduled)",
          description: "",
          location: "Room 2",
          startTime: "2026-08-05T18:00:00.000Z", // 14:00 EDT
          endTime: "2026-08-05T18:30:00.000Z",
          timezone: TZ,
          isAllDay: false
        }
      ]
    ]);
    const eventWithException = {
      ...event,
      exceptions: [
        {
          originalDate: "2026-08-05T00:00:00.000Z", // UTC midnight of Aug 5
          isCancelled: false,
          overrideEventId: "override-1"
        }
      ]
    };
    const out = expandEvent(eventWithException, new Date("2026-08-01T00:00:00Z"), new Date("2026-08-15T00:00:00Z"), overrides);

    expect(out).toHaveLength(4); // other Mondays/Wednesdays unchanged
    const overridden = out.find((o) => o.startTime === "2026-08-05T18:00:00.000Z");
    expect(overridden?.title).toBe("Design review (rescheduled)");
    expect(overridden?.location).toBe("Room 2");
    expect(overridden?.isOverridden).toBe(true);
    // The occurrence id still references the ORIGINAL instance date/time.
    expect(overridden?.occurrenceId).toBe("event-1@2026-08-05T13:00:00.000Z");

    const untouched = out.find((o) => o.startTime === "2026-08-03T13:00:00.000Z");
    expect(untouched?.title).toBe("Recurring standup");
    expect(untouched?.isOverridden).toBe(false);
    expect(untouched?.occurrenceId).toBe("event-1@2026-08-03T13:00:00.000Z");
  });

  it("cancels only the deleted instance, leaving the rest intact", () => {
    const event = series({
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE",
      exceptions: [
        { originalDate: "2026-08-05T00:00:00.000Z", isCancelled: true, overrideEventId: null }
      ]
    });
    const out = expandEvent(event, new Date("2026-08-01T00:00:00Z"), new Date("2026-08-15T00:00:00Z"));
    expect(out).toHaveLength(3); // Aug 3, Aug 10, Aug 12 — Aug 5 is gone
    expect(out.some((o) => o.startTime === "2026-08-05T13:00:00.000Z")).toBe(false);
    expect(out.map((o) => o.startTime)).toEqual([
      "2026-08-03T13:00:00.000Z",
      "2026-08-10T13:00:00.000Z",
      "2026-08-12T13:00:00.000Z"
    ]);
  });

  it("keeps the deterministic occurrenceId stable when only the series document is expanded", () => {
    const event = series({ recurrenceRule: "FREQ=DAILY" });
    const out = expandRange([event], new Date("2026-08-01T00:00:00Z"), new Date("2026-08-08T00:00:00Z"));
    expect(out).toHaveLength(5); // Aug 3-7
    expect(out[0].eventId).toBe("event-1");
    expect(out[0].occurrenceId).toBe("event-1@2026-08-03T13:00:00.000Z");
  });
});
