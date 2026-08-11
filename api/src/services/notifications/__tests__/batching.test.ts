import { describe, it, expect, vi } from "vitest";
import {
  BATCH_WINDOW_MS,
  appendBatchItem,
  buildBatchQuery,
  deriveDedupeKey,
  findBatchableNotification,
  type BatchableNotificationLike
} from "../batching.js";
import type { NotificationItem } from "@lifeos/shared";

/**
 * FR-13.4 de-duplication. Verifies that same-type reminders for the same user
 * within the same short window resolve to the SAME carrier notification (merge
 * path) and the SAME dedupeKey (so the queue's jobId refuses a second enqueue).
 */
describe("notification batching / de-duplication (FR-13.4)", () => {
  const carrier = {
    _id: "carrier-id",
    deliveryStatus: "pending",
    payload: { items: [{ title: "Morning run", body: "" }] }
  };

  function matchingCollection(): BatchableNotificationLike {
    return {
      findOne: vi.fn().mockResolvedValue(carrier)
    };
  }

  it("returns the existing pending notification when a batchable one exists", async () => {
    const collection = matchingCollection();
    const scheduledFor = new Date("2026-08-06T08:00:00.000Z");

    const found = await findBatchableNotification(collection, {
      userId: "u1",
      type: "habit_reminder",
      channel: "push",
      scheduledFor,
      now: new Date("2026-08-06T08:00:30.000Z")
    });

    expect(found).toEqual(carrier);
  });

  it("buildBatchQuery only matches pending notifications within the same window", () => {
    const scheduledFor = new Date("2026-08-06T08:00:00.000Z");
    const anchor = new Date("2026-08-06T08:00:20.000Z");
    const filter = buildBatchQuery({
      userId: "u1",
      type: "habit_reminder",
      channel: "push",
      scheduledFor,
      now: anchor
    });

    expect(filter.userId).toBe("u1");
    expect(filter.type).toBe("habit_reminder");
    expect(filter.channel).toBe("push");
    expect(filter.deliveryStatus).toBe("pending");

    const range = filter.scheduledFor as { $gte: Date; $lte: Date };
    expect(range.$lte).toEqual(scheduledFor);
    // Start of the window is exactly BATCH_WINDOW_MS before the anchor.
    expect(range.$gte.getTime()).toBe(anchor.getTime() - BATCH_WINDOW_MS);
  });

  it("does NOT find a batch carrier when scheduled outside the window", async () => {
    const scheduledFor = new Date("2026-08-06T08:00:00.000Z");
    // Anchor is 90s later (> BATCH_WINDOW_MS); the carrier's dedicated would be
    // outside the merge window, so the collection should return null.
    const farCollection: BatchableNotificationLike = {
      findOne: vi.fn().mockResolvedValue(null)
    };
    const found = await findBatchableNotification(farCollection, {
      userId: "u1",
      type: "habit_reminder",
      channel: "push",
      scheduledFor,
      now: new Date("2026-08-06T08:01:30.000Z") // 90s later — beyond the 60s window
    });
    expect(found).toBeNull();
    expect(farCollection.findOne).toHaveBeenCalled();
  });

  it("appendBatchItem collapses multiple items onto one carrier", () => {
    const items: NotificationItem[] = [{ title: "Morning run" }];
    const merged = appendBatchItem(items, { title: "Read 20 pages" });
    expect(merged).toHaveLength(2);
  });

  it("deriveDedupeKey is identical for two reminders in the same minute", () => {
    const a = deriveDedupeKey("habit_reminder", "u1", new Date("2026-08-06T08:00:10.000Z"));
    const b = deriveDedupeKey("habit_reminder", "u1", new Date("2026-08-06T08:00:50.000Z"));
    const c = deriveDedupeKey("habit_reminder", "u1", new Date("2026-08-06T08:01:00.000Z"));
    expect(a).toBe(b); // same minute bucket → same BullMQ jobId → second enqueue refused
    expect(a).not.toBe(c); // next minute → different jobId
  });

  it("deriveDedupeKey separates different users and different types", () => {
    const base = new Date("2026-08-06T08:00:00.000Z");
    const u1 = deriveDedupeKey("habit_reminder", "u1", base);
    const u2 = deriveDedupeKey("habit_reminder", "u2", base);
    const cal = deriveDedupeKey("calendar_reminder", "u1", base);
    expect(u1).not.toBe(u2);
    expect(u1).not.toBe(cal);
  });
});
