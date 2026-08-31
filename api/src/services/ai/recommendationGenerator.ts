import { User } from "../../models/User.js";
import { Recommendation, type RecommendationDoc } from "../../models/Recommendation.js";
import { getProductivityAnalytics } from "../analytics/productivityAnalyticsService.js";
import { getFinanceAnalytics } from "../analytics/financeAnalyticsService.js";
import { callAI } from "./callAI.js";
import { scheduleNotification } from "../notifications/scheduler.js";
import { isPreferenceEnabled } from "../notifications/preferences.js";
import { dateKeyInZone } from "../recurrence.js";
import { logger } from "../../logger.js";
import type { RecommendationItem } from "@lifeos/shared";

/**
 * Computes default normalized date bounds (YYYY-MM-DD) for a weekly or monthly completed period.
 */
export function computePeriodBounds(
  period: "weekly" | "monthly",
  refDate: Date = new Date(),
  timezone: string = "UTC"
): { startDateStr: string; endDateStr: string } {
  const currentKey = dateKeyInZone(refDate, timezone);
  const [y, m, d] = currentKey.split("-").map(Number);
  const now = new Date(Date.UTC(y, m - 1, d));

  if (period === "weekly") {
    // Completed past 7 days (e.g. from 7 days ago to yesterday)
    const end = new Date(now.getTime() - 1 * 86_400_000);
    const start = new Date(now.getTime() - 7 * 86_400_000);
    return {
      startDateStr: dateKeyInZone(start, "UTC"),
      endDateStr: dateKeyInZone(end, "UTC")
    };
  } else {
    // Completed past month: 1st of previous month to last day of previous month
    const prevMonthEnd = new Date(Date.UTC(y, m - 1, 0)); // Last day of previous month
    const prevMonthStart = new Date(Date.UTC(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), 1));
    return {
      startDateStr: dateKeyInZone(prevMonthStart, "UTC"),
      endDateStr: dateKeyInZone(prevMonthEnd, "UTC")
    };
  }
}

/**
 * Generates periodic AI recommendations (weekly or monthly) grounded in real aggregated
 * productivity and financial metrics, upserts the Recommendation record, and delivers alerts.
 */
export async function generatePeriodicRecommendations(
  userId: string,
  period: "weekly" | "monthly",
  customStartDate?: string,
  customEndDate?: string
): Promise<RecommendationDoc> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const timezone = user.notificationPreferences?.dailySummary?.timezone || "UTC";
  const bounds = computePeriodBounds(period, new Date(), timezone);
  const startDateStr = customStartDate || bounds.startDateStr;
  const endDateStr = customEndDate || bounds.endDateStr;

  // 1. Direct reuse of Prompt 1's aggregation pipelines
  const [productivity, finance] = await Promise.all([
    getProductivityAnalytics(userId, startDateStr, endDateStr),
    getFinanceAnalytics(userId, startDateStr, endDateStr)
  ]);

  // 2. Build structured summary context for callAI
  const structuredContext = {
    period,
    dateRange: { startDate: startDateStr, endDate: endDateStr },
    productivity: {
      habitCompletionRate: `${Math.round(productivity.habits.completionRate * 100)}%`,
      totalHabitsExpected: productivity.habits.totalExpected,
      totalHabitsCompleted: productivity.habits.totalCompleted,
      habitConsistency: productivity.habitConsistency.map((h) => ({
        title: h.title,
        completionRate: `${Math.round(h.rangeCompletionRate * 100)}%`,
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak
      })),
      focus: {
        totalFocusMinutes: productivity.focus.totalFocusMinutes,
        completedSessions: productivity.focus.completedSessionsCount,
        abandonedSessions: productivity.focus.abandonedSessionsCount,
        averageSessionMinutes: productivity.focus.averageSessionMinutes
      }
    },
    finance: {
      totalIncome: finance.summary.totalIncome,
      totalExpense: finance.summary.totalExpense,
      netSavings: finance.summary.netSavings,
      savingsRate: `${finance.summary.savingsRate}%`,
      topExpenseCategories: finance.categoryBreakdown
        .filter((c) => c.type === "expense")
        .slice(0, 5)
        .map((c) => ({
          category: c.category,
          amount: c.totalAmount,
          percentage: `${c.percentage}%`
        })),
      budgetAdherence: {
        budgetsExceeded: finance.budgetAdherence.budgetsExceeded,
        adherenceRate: `${Math.round(finance.budgetAdherence.adherenceRate * 100)}%`,
        exceededBudgets: finance.budgetAdherence.budgets
          .filter((b) => b.isOverBudget)
          .map((b) => ({
            category: b.category,
            limit: b.limit,
            actualSpend: b.actualSpend,
            percentUsed: `${b.percentUsed}%`
          })),
        warningBudgets: finance.budgetAdherence.budgets
          .filter((b) => b.status === "warning")
          .map((b) => ({
            category: b.category,
            limit: b.limit,
            actualSpend: b.actualSpend,
            percentUsed: `${b.percentUsed}%`
          }))
      }
    }
  };

  // 3. System Prompt requiring structured output grounded in numbers
  const systemMessage = {
    role: "system" as const,
    content: `You are LifeOS AI Assistant. Analyze the user's aggregated productivity and financial metrics for the completed ${period} period (${startDateStr} to ${endDateStr}).
Generate 3 to 5 specific, high-impact, actionable recommendations strictly grounded in the provided real numbers, categories, habit names, and budget figures.
Do NOT give generic or hypothetical advice. Explicitly reference actual figures from the context (e.g. dollar amounts over budget, habit completion percentages, or focus minute totals).

Output strictly valid JSON with no markdown formatting or extra text in this exact schema:
{
  "recommendations": [
    {
      "domain": "productivity" | "finance" | "habits" | "general",
      "title": "Short concise headline",
      "category": "Relevant category or habit name",
      "message": "Specific observation grounded in the actual numbers",
      "actionableStep": "Concrete actionable next step for the user",
      "metricGrounded": "Short metric cue e.g. '$280 spent / $250 limit' or 'Morning Run: 40% consistency'",
      "impact": "high" | "medium" | "low"
    }
  ]
}`
  };

  const userMessage = {
    role: "user" as const,
    content: JSON.stringify(structuredContext)
  };

  // 4. Bounded callAI call with provider fallback
  const aiRes = await callAI([systemMessage, userMessage], {
    userId,
    requestType: "periodic_recommendation",
    isAsyncContext: true,
    temperature: 0.3
  });

  if (!aiRes.success || !aiRes.content) {
    throw new Error(
      `callAI failed during periodic recommendation generation: ${aiRes.error || "No content returned"}`
    );
  }

  let recommendations: RecommendationItem[] = [];

  try {
    const rawContent = aiRes.content.trim();
    const jsonStr = rawContent.startsWith("```")
      ? rawContent
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "")
          .trim()
      : rawContent;

    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed.recommendations)) {
      recommendations = parsed.recommendations.map((item: any, idx: number) => ({
        id: `rec-${idx + 1}`,
        domain: (["productivity", "finance", "habits", "general"].includes(item.domain)
          ? item.domain
          : "general") as any,
        title: String(item.title || "Recommendation"),
        category: String(item.category || "general"),
        message: String(item.message || ""),
        actionableStep: String(item.actionableStep || ""),
        metricGrounded: item.metricGrounded ? String(item.metricGrounded) : undefined,
        impact: (["high", "medium", "low"].includes(item.impact) ? item.impact : "medium") as any
      }));
    }
  } catch (parseErr) {
    logger.warn(
      { parseErr, content: aiRes.content },
      "Failed to parse AI response for recommendations, generating heuristic fallback"
    );
  }

  // 5. Deterministic fallback grounded in real numbers if AI parsing failed or was empty
  if (recommendations.length === 0) {
    // Exceeded budgets
    const exceeded = finance.budgetAdherence.budgets.filter((b) => b.isOverBudget);
    for (const b of exceeded) {
      recommendations.push({
        id: `rec-fallback-fin-${b.category}`,
        domain: "finance",
        title: `Rebalance ${b.category} Budget`,
        category: b.category,
        message: `Your ${b.category} spend ($${b.actualSpend}) exceeded your $${b.limit} limit by $${Math.round((b.actualSpend - b.limit) * 100) / 100}.`,
        actionableStep: `Review recent ${b.category} transactions and set an alert at 80% threshold for next ${period}.`,
        metricGrounded: `$${b.actualSpend} / $${b.limit} limit (${b.percentUsed}%)`,
        impact: "high"
      });
    }

    // Low completion habits
    const lowHabits = productivity.habitConsistency.filter((h) => h.rangeCompletionRate < 0.6);
    for (const h of lowHabits.slice(0, 2)) {
      recommendations.push({
        id: `rec-fallback-hab-${h.habitId}`,
        domain: "habits",
        title: `Adjust ${h.title} Cadence`,
        category: h.title,
        message: `${h.title} had a ${Math.round(h.rangeCompletionRate * 100)}% completion rate over the ${period}.`,
        actionableStep: `Consider adjusting the scheduled frequency or pairing it with an existing morning routine.`,
        metricGrounded: `${h.rangeCompleted}/${h.rangeExpected} check-ins (${Math.round(h.rangeCompletionRate * 100)}%)`,
        impact: "medium"
      });
    }

    // Focus session recommendation
    if (productivity.focus.totalFocusMinutes > 0) {
      recommendations.push({
        id: "rec-fallback-focus",
        domain: "productivity",
        title: "Maintain Focus Momentum",
        category: "Focus",
        message: `You accumulated ${productivity.focus.totalFocusMinutes} minutes across ${productivity.focus.completedSessionsCount} completed focus sessions.`,
        actionableStep: `Schedule dedicated 25-minute Pomodoro blocks during peak morning hours.`,
        metricGrounded: `${productivity.focus.totalFocusMinutes} focus mins (${productivity.focus.completedSessionsCount} sessions)`,
        impact: "low"
      });
    } else {
      recommendations.push({
        id: "rec-fallback-focus-start",
        domain: "productivity",
        title: "Kickstart Deep Work",
        category: "Focus",
        message: `No focus timer sessions were logged during this ${period}.`,
        actionableStep: `Try a single 25-minute focus session for your highest priority goal this week.`,
        metricGrounded: "0 logged focus minutes",
        impact: "medium"
      });
    }
  }

  // 6. Upsert Recommendation document
  const recommendationDoc = await Recommendation.findOneAndUpdate(
    { userId, period, periodStart: startDateStr },
    {
      $set: {
        userId,
        period,
        periodStart: startDateStr,
        periodEnd: endDateStr,
        recommendations,
        generatedAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 7. Delivery via Phase 2 notification engine
  const isPushEnabled = isPreferenceEnabled(
    user.notificationPreferences,
    "periodicRecommendations",
    "push"
  );
  const isInAppEnabled = isPreferenceEnabled(
    user.notificationPreferences,
    "periodicRecommendations",
    "in_app"
  );

  const topRec = recommendations[0]?.title || `Your ${period} performance recommendations are ready.`;
  const channelsToDeliver: ("push" | "in_app")[] = [];
  if (isPushEnabled) channelsToDeliver.push("push");
  if (isInAppEnabled) channelsToDeliver.push("in_app");

  for (const ch of channelsToDeliver) {
    await scheduleNotification({
      userId,
      type: "periodic_recommendation",
      channel: ch,
      title: `${period === "weekly" ? "Weekly" : "Monthly"} AI Recommendations`,
      body: topRec,
      data: {
        recommendationId: recommendationDoc._id.toString(),
        period,
        periodStart: startDateStr,
        periodEnd: endDateStr,
        deepLink: `/analytics`
      },
      scheduledFor: new Date()
    });
  }

  logger.info(
    {
      userId,
      period,
      recommendationId: recommendationDoc._id.toString(),
      recommendationsCount: recommendations.length
    },
    "Periodic recommendations generated and enqueued for delivery"
  );

  return recommendationDoc;
}
