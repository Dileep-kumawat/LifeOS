import { User } from "../../models/User.js";
import { Summary } from "../../models/Summary.js";
import { enqueueJob } from "../queue.js";
import { dateKeyInZone } from "../recurrence.js";
import { logger } from "../../logger.js";

export function getCurrentHHMM(date: Date = new Date(), timezone: string = "UTC"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    let hour = "";
    let minute = "";
    for (const p of parts) {
      if (p.type === "hour") hour = p.value;
      if (p.type === "minute") minute = p.value;
    }
    if (hour === "24") hour = "00";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  } catch {
    const h = String(date.getUTCHours()).padStart(2, "0");
    const m = String(date.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

export async function dispatchDailySummaries(
  forcedTime?: string,
  forcedDateKey?: string
): Promise<{ enqueuedCount: number; userIds: string[] }> {
  const users = await User.find({ status: "active" }).select("_id notificationPreferences").lean();
  const enqueuedUserIds: string[] = [];

  for (const user of users) {
    const dsPref = user.notificationPreferences?.dailySummary;
    const userTimezone = dsPref?.timezone || "UTC";
    const userDeliveryTime = dsPref?.deliveryTime || "07:00";

    const now = new Date();
    const currentHHMM = forcedTime ?? getCurrentHHMM(now, userTimezone);
    const dateKey = forcedDateKey ?? dateKeyInZone(now, userTimezone);

    // If current time matches delivery time (or if time is forced)
    if (currentHHMM === userDeliveryTime || forcedTime) {
      const userId = user._id.toString();
      const existing = await Summary.findOne({ userId, date: dateKey });

      if (!existing) {
        const dedupeKey = `daily_summary__${userId}__${dateKey}`;
        const res = await enqueueJob(
          "generate_daily_summary",
          { userId, date: dateKey },
          { dedupeKey }
        );
        if (res.queued) {
          enqueuedUserIds.push(userId);
        }
      }
    }
  }

  logger.info(
    { count: enqueuedUserIds.length, userIds: enqueuedUserIds },
    "Daily summary dispatcher run complete"
  );

  return { enqueuedCount: enqueuedUserIds.length, userIds: enqueuedUserIds };
}
