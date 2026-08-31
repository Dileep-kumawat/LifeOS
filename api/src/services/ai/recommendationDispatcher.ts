import { User } from "../../models/User.js";
import { Recommendation } from "../../models/Recommendation.js";
import { enqueueJob } from "../queue.js";
import { dateKeyInZone } from "../recurrence.js";
import { getCurrentHHMM } from "./summaryDispatcher.js";
import { computePeriodBounds } from "./recommendationGenerator.js";
import { logger } from "../../logger.js";

export async function dispatchPeriodicRecommendations(
  forcedCadence?: "weekly" | "monthly",
  forcedTime?: string,
  forcedDateKey?: string
): Promise<{ enqueuedWeekly: number; enqueuedMonthly: number; userIds: string[] }> {
  const users = await User.find({ status: "active" }).select("_id notificationPreferences").lean();
  const enqueuedUserIds = new Set<string>();
  let enqueuedWeekly = 0;
  let enqueuedMonthly = 0;

  for (const user of users) {
    const userId = user._id.toString();
    const prefs = user.notificationPreferences;
    const timezone = prefs?.dailySummary?.timezone || "UTC";
    const deliveryTime = "08:00";

    const now = new Date();
    const currentHHMM = forcedTime ?? getCurrentHHMM(now, timezone);
    const dateKey = forcedDateKey ?? dateKeyInZone(now, timezone);
    const [y, m, d] = dateKey.split("-").map(Number);
    const currentDayDate = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = currentDayDate.getUTCDay(); // 0 = Sunday
    const dayOfMonth = currentDayDate.getUTCDate(); // 1 = First of month

    const isTimeMatch = forcedTime ? true : currentHHMM === deliveryTime;

    // 1. Weekly dispatch check (Sunday 08:00 by default or if forced)
    const isWeeklyDue = (dayOfWeek === 0 || forcedCadence === "weekly") && isTimeMatch;
    if (isWeeklyDue) {
      const bounds = computePeriodBounds("weekly", currentDayDate, timezone);
      const existing = await Recommendation.findOne({
        userId,
        period: "weekly",
        periodStart: bounds.startDateStr
      });

      if (!existing) {
        const dedupeKey = `periodic_rec__${userId}__weekly__${bounds.startDateStr}`;
        const res = await enqueueJob(
          "generate_periodic_recommendations",
          {
            userId,
            period: "weekly",
            startDate: bounds.startDateStr,
            endDate: bounds.endDateStr
          },
          { dedupeKey }
        );
        if (res.queued) {
          enqueuedWeekly++;
          enqueuedUserIds.add(userId);
        }
      }
    }

    // 2. Monthly dispatch check (1st of month 08:00 by default or if forced)
    const isMonthlyDue = (dayOfMonth === 1 || forcedCadence === "monthly") && isTimeMatch;
    if (isMonthlyDue) {
      const bounds = computePeriodBounds("monthly", currentDayDate, timezone);
      const existing = await Recommendation.findOne({
        userId,
        period: "monthly",
        periodStart: bounds.startDateStr
      });

      if (!existing) {
        const dedupeKey = `periodic_rec__${userId}__monthly__${bounds.startDateStr}`;
        const res = await enqueueJob(
          "generate_periodic_recommendations",
          {
            userId,
            period: "monthly",
            startDate: bounds.startDateStr,
            endDate: bounds.endDateStr
          },
          { dedupeKey }
        );
        if (res.queued) {
          enqueuedMonthly++;
          enqueuedUserIds.add(userId);
        }
      }
    }
  }

  logger.info(
    { enqueuedWeekly, enqueuedMonthly, totalUsers: enqueuedUserIds.size },
    "Periodic recommendations dispatcher run complete"
  );

  return {
    enqueuedWeekly,
    enqueuedMonthly,
    userIds: Array.from(enqueuedUserIds)
  };
}
