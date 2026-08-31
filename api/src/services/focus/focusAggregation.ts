import { Types } from "mongoose";
import { FocusSession } from "../../models/FocusSession.js";
import type { FocusLinkedType } from "@lifeos/shared";

export interface FocusSummaryAggregatedResult {
  totalFocusMinutes: number;
  totalSessionsCount: number;
  completedSessionsCount: number;
  abandonedSessionsCount: number;
  activeSessionsCount: number;
  averageSessionMinutes: number;
  linkedTypeBreakdown: Array<{
    linkedType: FocusLinkedType;
    totalMinutes: number;
    count: number;
    percentage: number;
  }>;
  trend: Array<{
    date: string;
    totalMinutes: number;
    count: number;
    completedCount: number;
    abandonedCount: number;
  }>;
}

/**
 * Executes MongoDB aggregation pipelines over the FocusSession collection for a given user and date range.
 * Used by both GET /api/v1/focus/summary and GET /api/v1/analytics/productivity.
 */
export async function getFocusSummaryData(
  userId: string | Types.ObjectId,
  startBound: Date,
  endBound: Date
): Promise<FocusSummaryAggregatedResult> {
  const userObjId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;

  const overallMatch = {
    userId: userObjId,
    startedAt: { $gte: startBound, $lte: endBound }
  };

  // 1. Aggregation for overall totals and status counts
  const statsAggregation = await FocusSession.aggregate([
    { $match: overallMatch },
    {
      $group: {
        _id: null,
        totalFocusMinutes: { $sum: "$totalFocusMinutes" },
        totalSessionsCount: { $sum: 1 },
        completedSessionsCount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
        },
        abandonedSessionsCount: {
          $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] }
        },
        activeSessionsCount: {
          $sum: { $cond: [{ $in: ["$status", ["active", "paused"]] }, 1, 0] }
        }
      }
    }
  ]);

  const stats = statsAggregation[0] || {
    totalFocusMinutes: 0,
    totalSessionsCount: 0,
    completedSessionsCount: 0,
    abandonedSessionsCount: 0,
    activeSessionsCount: 0
  };

  const totalFocusMinutes = stats.totalFocusMinutes || 0;
  const totalSessionsCount = stats.totalSessionsCount || 0;
  const averageSessionMinutes =
    totalSessionsCount > 0 ? Number((totalFocusMinutes / totalSessionsCount).toFixed(1)) : 0;

  // 2. Aggregation for linkedType breakdown
  const linkedTypeAggregation = await FocusSession.aggregate([
    { $match: overallMatch },
    {
      $group: {
        _id: "$linkedType",
        totalMinutes: { $sum: "$totalFocusMinutes" },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalMinutes: -1 } }
  ]);

  const allLinkedTypes: FocusLinkedType[] = ["topic", "goal", "task", "none"];
  const linkedMap = new Map<FocusLinkedType, { totalMinutes: number; count: number }>();
  for (const t of allLinkedTypes) {
    linkedMap.set(t, { totalMinutes: 0, count: 0 });
  }

  for (const item of linkedTypeAggregation) {
    const t = item._id as FocusLinkedType;
    if (linkedMap.has(t)) {
      linkedMap.set(t, {
        totalMinutes: item.totalMinutes,
        count: item.count
      });
    }
  }

  const linkedTypeBreakdown = Array.from(linkedMap.entries()).map(([linkedType, val]) => ({
    linkedType,
    totalMinutes: val.totalMinutes,
    count: val.count,
    percentage: totalFocusMinutes > 0 ? Math.round((val.totalMinutes / totalFocusMinutes) * 100) : 0
  }));

  // 3. Aggregation for daily trend with zero-filling
  const trendAggregation = await FocusSession.aggregate([
    { $match: overallMatch },
    {
      $group: {
        _id: {
          dateKey: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } }
        },
        totalMinutes: { $sum: "$totalFocusMinutes" },
        count: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
        },
        abandonedCount: {
          $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] }
        }
      }
    },
    { $sort: { "_id.dateKey": 1 } }
  ]);

  const trendMap = new Map<
    string,
    { totalMinutes: number; count: number; completedCount: number; abandonedCount: number }
  >();

  // Generate sequential date keys across the entire interval
  const cursor = new Date(startBound);
  while (cursor <= endBound) {
    const dateKey = cursor.toISOString().split("T")[0];
    trendMap.set(dateKey, {
      totalMinutes: 0,
      count: 0,
      completedCount: 0,
      abandonedCount: 0
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const item of trendAggregation) {
    const key = item._id.dateKey;
    if (trendMap.has(key)) {
      trendMap.set(key, {
        totalMinutes: item.totalMinutes,
        count: item.count,
        completedCount: item.completedCount,
        abandonedCount: item.abandonedCount
      });
    }
  }

  const trend = Array.from(trendMap.entries()).map(([date, vals]) => ({
    date,
    totalMinutes: vals.totalMinutes,
    count: vals.count,
    completedCount: vals.completedCount,
    abandonedCount: vals.abandonedCount
  }));

  return {
    totalFocusMinutes,
    totalSessionsCount,
    completedSessionsCount: stats.completedSessionsCount || 0,
    abandonedSessionsCount: stats.abandonedSessionsCount || 0,
    activeSessionsCount: stats.activeSessionsCount || 0,
    averageSessionMinutes,
    linkedTypeBreakdown,
    trend
  };
}
