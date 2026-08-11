import { describe, it, expect } from "vitest";
import { conflictsQuerySchema, listEventsQuerySchema } from "@lifeos/shared";
import { expandRange, filterOverlapping } from "../../services/recurrence.js";

const TZ = "America/New_York";

function single(id: string, startTime: string, endTime: string, title = "Event") {
  return {
    _id: id,
    title,
    description: "",
    location: "",
    startTime,
    endTime,
    timezone: TZ,
    isAllDay: false,
    recurrenceRule: null,
    recurrenceEndDate: null,
    exceptions: []
  };
}

describe("conflict detection", () => {
  it("catches partial overlaps, not just exact matches", () => {
    // Candidate 11:00-13:00; existing event 10:00-12:00 overlaps on the tail.
    const events = [single("a", "2026-08-03T10:00:00Z", "2026-08-03T12:00:00Z", "Morning block")];
    const occurrences = expandRange(
      events,
      new Date("2026-08-03T11:00:00Z"),
      new Date("2026-08-03T13:00:00Z")
    );
    const conflicts = filterOverlapping(
      occurrences,
      new Date("2026-08-03T11:00:00Z"),
      new Date("2026-08-03T13:00:00Z")
    );
    expect(conflicts.map((c) => c.eventId)).toEqual(["a"]);
  });

  it("treats a candidate fully inside an existing event as a conflict", () => {
    const events = [single("a", "2026-08-03T10:00:00Z", "2026-08-03T14:00:00Z")];
    const occurrences = expandRange(
      events,
      new Date("2026-08-03T11:00:00Z"),
      new Date("2026-08-03T12:00:00Z")
    );
    const conflicts = filterOverlapping(
      occurrences,
      new Date("2026-08-03T11:00:00Z"),
      new Date("2026-08-03T12:00:00Z")
    );
    expect(conflicts).toHaveLength(1);
  });

  it("treats an existing event fully inside the candidate window as a conflict", () => {
    const events = [single("a", "2026-08-03T11:30:00Z", "2026-08-03T11:45:00Z")];
    const occurrences = expandRange(
      events,
      new Date("2026-08-03T10:00:00Z"),
      new Date("2026-08-03T12:00:00Z")
    );
    const conflicts = filterOverlapping(
      occurrences,
      new Date("2026-08-03T10:00:00Z"),
      new Date("2026-08-03T12:00:00Z")
    );
    expect(conflicts).toHaveLength(1);
  });

  it("does not flag back-to-back adjacent events (end == next start)", () => {
    const events = [single("a", "2026-08-03T10:00:00Z", "2026-08-03T11:00:00Z")];
    const occurrences = expandRange(
      events,
      new Date("2026-08-03T11:00:00Z"),
      new Date("2026-08-03T12:00:00Z")
    );
    const conflicts = filterOverlapping(
      occurrences,
      new Date("2026-08-03T11:00:00Z"),
      new Date("2026-08-03T12:00:00Z")
    );
    expect(conflicts).toHaveLength(0);
  });

  it("detects conflicts from recurring series occurrences within the window", () => {
    // 09:00-09:30 EDT == 13:00-13:30 UTC; candidate 09:15-09:45 EDT partially overlaps.
    const recurring = {
      _id: "series-1",
      title: "Standup",
      description: "",
      location: "",
      startTime: "2026-08-03T13:00:00.000Z",
      endTime: "2026-08-03T13:30:00.000Z",
      timezone: TZ,
      isAllDay: false,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
      recurrenceEndDate: null,
      exceptions: []
    };
    const occurrences = expandRange(
      [recurring],
      new Date("2026-08-03T13:15:00Z"),
      new Date("2026-08-03T13:45:00Z")
    );
    const conflicts = filterOverlapping(
      occurrences,
      new Date("2026-08-03T13:15:00Z"),
      new Date("2026-08-03T13:45:00Z")
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].eventId).toBe("series-1");
  });

  it("excludes a single occurrence id when requested", () => {
    const events = [single("a", "2026-08-03T10:00:00Z", "2026-08-03T12:00:00Z")];
    const occurrences = expandRange(
      events,
      new Date("2026-08-03T10:00:00Z"),
      new Date("2026-08-03T12:00:00Z")
    );
    const id = occurrences[0].occurrenceId;
    const conflicts = filterOverlapping(
      occurrences,
      new Date("2026-08-03T10:00:00Z"),
      new Date("2026-08-03T12:00:00Z"),
      id
    );
    expect(conflicts).toHaveLength(0);
  });
});

describe("unbounded-range rejection", () => {
  it("rejects a list query with no rangeStart/rangeEnd", () => {
    const result = listEventsQuerySchema.safeParse({ view: "month" });
    expect(result.success).toBe(false);
  });

  it("rejects a list query whose range spans more than ~1 year", () => {
    const result = listEventsQuerySchema.safeParse({
      rangeStart: "2026-01-01T00:00:00.000Z",
      rangeEnd: "2027-06-01T00:00:00.000Z"
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().formErrors.join(" ")).toMatch(/1 year|366 days/);
    }
  });

  it("accepts a bounded range within one year", () => {
    const result = listEventsQuerySchema.safeParse({
      rangeStart: "2026-01-01T00:00:00.000Z",
      rangeEnd: "2026-12-01T00:00:00.000Z",
      view: "month"
    });
    expect(result.success).toBe(true);
  });

  it("rejects a conflicts query with end before start", () => {
    const result = conflictsQuerySchema.safeParse({
      startTime: "2026-08-03T12:00:00.000Z",
      endTime: "2026-08-03T11:00:00.000Z"
    });
    expect(result.success).toBe(false);
  });
});
