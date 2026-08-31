import { Types } from "mongoose";
import { Transaction } from "../../models/Transaction.js";
import { Budget } from "../../models/Budget.js";
import { normalizeDateBounds } from "./productivityAnalyticsService.js";
import type {
  FinanceAnalytics,
  FinanceCategoryBreakdownItem,
  FinanceTrendItem,
  BudgetAdherenceItem
} from "@lifeos/shared";

/**
 * Aggregates financial performance metrics, category breakdowns, income/expense trends,
 * and budget adherence stats over a given date range.
 */
export async function getFinanceAnalytics(
  userId: string | Types.ObjectId,
  startDateStr: string,
  endDateStr: string
): Promise<FinanceAnalytics> {
  const userObjId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const { startBound, endBound, startDateIso, endDateIso, totalDays } = normalizeDateBounds(
    startDateStr,
    endDateStr
  );

  const matchStage = {
    userId: userObjId,
    date: { $gte: startBound, $lte: endBound }
  };

  // 1. Category breakdown aggregation
  const categoryAgg = await Transaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { category: "$category", type: "$type" },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransactionCount = 0;

  for (const item of categoryAgg) {
    const amt = item.totalAmount || 0;
    totalTransactionCount += item.count || 0;
    if (item._id.type === "income") {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
  }

  const categoryBreakdown: FinanceCategoryBreakdownItem[] = categoryAgg.map((item) => {
    const isExpense = item._id.type === "expense";
    const baseTotal = isExpense ? totalExpense : totalIncome;
    const percentage =
      baseTotal > 0 ? Math.round(((item.totalAmount || 0) / baseTotal) * 100) : 0;

    return {
      category: item._id.category,
      type: item._id.type as "income" | "expense",
      totalAmount: Math.round((item.totalAmount || 0) * 100) / 100,
      count: item.count || 0,
      percentage
    };
  });

  const netSavings = Math.round((totalIncome - totalExpense) * 100) / 100;
  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 10000) / 100)
      : 0;

  // 2. Trend aggregation (daily if <= 31 days, monthly if > 31 days)
  const isDaily = totalDays <= 31;
  const formatStr = isDaily ? "%Y-%m-%d" : "%Y-%m";

  const trendAgg = await Transaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: formatStr, date: "$date" } },
          type: "$type"
        },
        totalAmount: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.period": 1 } }
  ]);

  // Zero-fill all sequential intervals in trend
  const trendMap = new Map<string, { income: number; expense: number }>();
  const cursor = new Date(startBound);
  const end = new Date(endBound);

  while (cursor <= end) {
    const pKey = isDaily
      ? cursor.toISOString().split("T")[0]
      : `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;

    if (!trendMap.has(pKey)) {
      trendMap.set(pKey, { income: 0, expense: 0 });
    }

    if (isDaily) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    } else {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  for (const item of trendAgg) {
    const key = item._id.period;
    const entry = trendMap.get(key) || { income: 0, expense: 0 };
    if (item._id.type === "income") {
      entry.income = Math.round(item.totalAmount * 100) / 100;
    } else {
      entry.expense = Math.round(item.totalAmount * 100) / 100;
    }
    trendMap.set(key, entry);
  }

  const trend: FinanceTrendItem[] = Array.from(trendMap.entries()).map(([period, vals]) => ({
    period,
    income: vals.income,
    expense: vals.expense,
    net: Math.round((vals.income - vals.expense) * 100) / 100
  }));

  // 3. Budget adherence calculation
  const budgets = await Budget.find({ userId: userObjId }).lean();
  const expenseByCategoryMap = new Map<string, number>();

  for (const cat of categoryBreakdown) {
    if (cat.type === "expense") {
      expenseByCategoryMap.set(cat.category.toLowerCase(), cat.totalAmount);
    }
  }

  const budgetAdherenceList: BudgetAdherenceItem[] = [];
  let budgetsExceeded = 0;

  for (const budget of budgets) {
    const actualSpend = expenseByCategoryMap.get(budget.category.toLowerCase()) || 0;
    const limit = budget.limit;
    const percentUsed = limit > 0 ? Math.round((actualSpend / limit) * 100) : 0;
    const isOverBudget = actualSpend > limit;

    let status: "on_track" | "warning" | "exceeded" = "on_track";
    if (isOverBudget) {
      status = "exceeded";
      budgetsExceeded++;
    } else if (percentUsed >= 85) {
      status = "warning";
    }

    budgetAdherenceList.push({
      budgetId: budget._id.toString(),
      category: budget.category,
      limit,
      actualSpend,
      percentUsed,
      isOverBudget,
      status
    });
  }

  // Sort budgets: exceeded first, then highest percent used
  budgetAdherenceList.sort((a, b) => {
    if (a.isOverBudget !== b.isOverBudget) {
      return a.isOverBudget ? -1 : 1;
    }
    return b.percentUsed - a.percentUsed;
  });

  const budgetsTracked = budgets.length;
  const budgetsOnTrack = Math.max(0, budgetsTracked - budgetsExceeded);
  const adherenceRate =
    budgetsTracked > 0 ? Math.round((budgetsOnTrack / budgetsTracked) * 100) / 100 : 1.0;

  return {
    period: {
      startDate: startDateIso,
      endDate: endDateIso,
      totalDays
    },
    summary: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netSavings,
      savingsRate,
      transactionCount: totalTransactionCount
    },
    categoryBreakdown,
    trend,
    budgetAdherence: {
      budgetsTracked,
      budgetsOnTrack,
      budgetsExceeded,
      adherenceRate,
      budgets: budgetAdherenceList
    }
  };
}
