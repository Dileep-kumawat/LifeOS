import { describe, it, expect } from "vitest";
import {
  countUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationCollectionLike
} from "../notificationsRepo.js";

interface FakeDoc {
  _id: string;
  userId: string;
  readStatus: string;
  readAt: Date | null;
}

/**
 * In-memory stand-in for the Notification model implementing just the three
 * methods the repo uses, so the EXACT queries behind the unread-count and
 * mark-read endpoints are exercised without a database.
 */
class FakeNotifications implements NotificationCollectionLike {
  docs: FakeDoc[] = [];

  constructor(docs: FakeDoc[]) {
    this.docs = docs;
  }

  private matches(filter: Record<string, unknown>): FakeDoc[] {
    return this.docs.filter((d) =>
      Object.entries(filter).every(([key, value]) => {
        if (key === "_id") return d._id === value;
        return (d as unknown as Record<string, unknown>)[key] === value;
      })
    );
  }

  async countDocuments(filter: Record<string, unknown>): Promise<number> {
    return this.matches(filter).length;
  }

  async updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ modifiedCount?: number }> {
    const matched = this.matches(filter);
    const set = (update.$set ?? {}) as Partial<FakeDoc>;
    for (const d of matched) Object.assign(d, set);
    return { modifiedCount: matched.length };
  }

  async findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<FakeDoc | null> {
    const [hit] = this.matches(filter);
    if (!hit) return null;
    Object.assign(hit, (update.$set ?? {}) as Partial<FakeDoc>);
    return options?.new ? hit : hit;
  }
}

function seed(userId: string, count: number, read = 0): FakeNotifications {
  const docs: FakeDoc[] = Array.from({ length: count }, (_, i) => ({
    _id: `n-${i}`,
    userId,
    readStatus: i < read ? "read" : "unread",
    readAt: i < read ? new Date() : null
  }));
  return new FakeNotifications(docs);
}

describe("unread-count queries after mark-read / mark-all-read", () => {
  it("counts only this user's unread notifications", async () => {
    const collection = seed("u1", 5, 2); // 2 read, 3 unread
    await new FakeNotifications([
      { _id: "other", userId: "u2", readStatus: "unread", readAt: null }
    ]).countDocuments({ userId: "u2", readStatus: "unread" });

    expect(await countUnreadNotifications(collection, "u1")).toBe(3);
  });

  it("marking one notification read drops the unread count by exactly one", async () => {
    const collection = seed("u1", 3); // all unread
    await markNotificationRead(collection, "u1", "n-0");

    expect(await countUnreadNotifications(collection, "u1")).toBe(2);
  });

  it("mark-all-read zeroes the unread count and reports how many were flipped", async () => {
    const collection = seed("u1", 4, 1); // 1 read, 3 unread

    const { updatedCount } = await markAllNotificationsRead(collection, "u1");

    expect(updatedCount).toBe(3);
    expect(await countUnreadNotifications(collection, "u1")).toBe(0);
  });

  it("marking another user's notification read returns null (no cross-user mutation)", async () => {
    const collection = seed("u1", 2);
    const result = await markNotificationRead(collection, "u1", "other-user-notification");
    expect(result).toBeNull();
  });
});