import { Types } from "mongoose";
import { Budget, type BudgetDoc } from "../models/Budget.js";
import { BudgetHistory } from "../models/BudgetHistory.js";
import { Transaction } from "../models/Transaction.js";
import { scheduleNotification } from "./notifications/scheduler.js";
import { logger } from "../logger.js";

/**
 * Returns UTC boundaries (start of month 00:00:00.000, end of month 23:59:59.999) for a date.
 */
export function getMonthBounds(refDate: Date = new Date()): {
  startOfMonth: Date;
  endOfMonth: Date;
} {
  const year = refDate.getUTCFullYear();
  const month = refDate.getUTCMonth();

  const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { startOfMonth, endOfMonth };
}

/**
 * Recalculates cached currentSpend for a specific user & category budget for the current period month.
 * Handles one-time threshold crossing alerts and status resets when spend drops back below limit.
 */
export async function recalculateBudgetSpend(
  userId: string | Types.ObjectId,
  category: string,
  refDate: Date = new Date()
): Promise<BudgetDoc | null> {
  const budget = await Budget.findOne({
    userId: new Types.ObjectId(userId),
    category,
    period: "monthly"
  });

  if (!budget) {
    return null;
  }

  const { startOfMonth, endOfMonth } = getMonthBounds(refDate);

  // Aggregate sum of expense transactions for this user & category in current month
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        type: "expense",
        category,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: "$amount" }
      }
    }
  ]);

  const newSpend = result.length > 0 ? result[0].totalSpend : 0;
  const limit = budget.limit;
  const isOverNow = newSpend > limit;

  // Threshold crossing: was not over before, is over now -> send one-time alert
  if (isOverNow && !budget.notifiedOverspend) {
    budget.notifiedOverspend = true;

    try {
      await scheduleNotification({
        userId: userId.toString(),
        type: "budget_alert",
        channel: "in_app",
        title: `Over Budget Alert: ${budget.category}`,
        body: `You have exceeded your monthly limit of $${limit.toFixed(2)} for ${budget.category} (current spend: $${newSpend.toFixed(2)}).`,
        data: {
          budgetId: budget._id.toString(),
          category: budget.category,
          limit,
          currentSpend: newSpend
        }
      });
    } catch (err) {
      logger.error({ err, userId, category }, "Failed to schedule budget overspend notification");
    }
  } else if (!isOverNow && budget.notifiedOverspend) {
    // If spend dropped back below limit (e.g. edited transaction amount down, or deleted), reset flag
    budget.notifiedOverspend = false;
  }

  budget.currentSpend = newSpend;
  await budget.save();

  return budget;
}

/**
 * Monthly rollover process for budgets.
 * Snapshots the ending period spend into BudgetHistory and resets currentSpend for the new month.
 */
export async function processBudgetRollover(
  refDate: Date = new Date()
): Promise<{ processed: number }> {
  const budgets = await Budget.find({ period: "monthly" });
  let processed = 0;

  // Compute previous month range
  const currentBounds = getMonthBounds(refDate);
  const prevMonthDate = new Date(currentBounds.startOfMonth.getTime() - 24 * 60 * 60 * 1000);
  const prevBounds = getMonthBounds(prevMonthDate);

  for (const budget of budgets) {
    // Calculate final spend for the previous period month
    const result = await Transaction.aggregate([
      {
        $match: {
          userId: budget.userId,
          type: "expense",
          category: budget.category,
          date: { $gte: prevBounds.startOfMonth, $lte: prevBounds.endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: "$amount" }
        }
      }
    ]);

    const finalSpend = result.length > 0 ? result[0].totalSpend : 0;

    // Save BudgetHistory snapshot
    await BudgetHistory.create({
      userId: budget.userId,
      budgetId: budget._id,
      category: budget.category,
      period: "monthly",
      periodStart: prevBounds.startOfMonth,
      periodEnd: prevBounds.endOfMonth,
      limit: budget.limit,
      finalSpend,
      wasOverBudget: finalSpend > budget.limit
    });

    // Recalculate spend for the new month
    await recalculateBudgetSpend(budget.userId, budget.category, refDate);
    processed++;
  }

  return { processed };
}
