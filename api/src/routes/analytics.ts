import { Router, type Request, type Response } from "express";
import {
  analyticsDateRangeSchema,
  analyticsExportQuerySchema
} from "@lifeos/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getProductivityAnalytics } from "../services/analytics/productivityAnalyticsService.js";
import { getFinanceAnalytics } from "../services/analytics/financeAnalyticsService.js";
import { generateAnalyticsExport } from "../services/analytics/exportService.js";
import { exportRateLimiter } from "../services/analytics/rateLimiter.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

/**
 * @openapi
 * /analytics/productivity:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Aggregated productivity metrics across habits and focus sessions
 *     description: |
 *       Aggregates completed vs scheduled habits (reusing frequency calculation math),
 *       focus time totals and linked category distribution (reusing Focus module aggregation pipelines),
 *       per-habit streak and consistency data, and contiguous daily time-series trends over a bounded date range.
 *       
 *       **Cross-Domain Integration:**
 *       This endpoint feeds into `/ai/recommendations/latest` (FR-10.3) for generating grounded weekly and monthly AI productivity coaching recommendations.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, example: "2026-08-01" }
 *         description: Range start date (YYYY-MM-DD or ISO string)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, example: "2026-08-31" }
 *         description: Range end date (YYYY-MM-DD or ISO string, maximum 366 days from startDate)
 *     responses:
 *       200:
 *         description: Aggregated productivity analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProductivityAnalytics"
 *             examples:
 *               monthlyProductivity:
 *                 summary: Realistic August 2026 productivity analytics
 *                 value:
 *                   period:
 *                     startDate: "2026-08-01"
 *                     endDate: "2026-08-31"
 *                     totalDays: 31
 *                   habits:
 *                     totalExpected: 62
 *                     totalCompleted: 54
 *                     completionRate: 0.87
 *                   focus:
 *                     totalFocusMinutes: 1240
 *                     totalSessionsCount: 32
 *                     completedSessionsCount: 28
 *                     abandonedSessionsCount: 4
 *                     activeSessionsCount: 0
 *                     averageSessionMinutes: 38.8
 *                     linkedTypeBreakdown:
 *                       - linkedType: "topic"
 *                         totalMinutes: 620
 *                         count: 15
 *                         percentage: 50
 *                       - linkedType: "goal"
 *                         totalMinutes: 372
 *                         count: 9
 *                         percentage: 30
 *                       - linkedType: "task"
 *                         totalMinutes: 186
 *                         count: 6
 *                         percentage: 15
 *                       - linkedType: "none"
 *                         totalMinutes: 62
 *                         count: 2
 *                         percentage: 5
 *                   habitConsistency:
 *                     - habitId: "662c9f1e9f0b2a001c3d4e5f"
 *                       title: "Morning 30-min run"
 *                       frequency:
 *                         type: "daily"
 *                       currentStreak: 5
 *                       longestStreak: 14
 *                       rangeExpected: 31
 *                       rangeCompleted: 27
 *                       rangeCompletionRate: 0.87
 *                       lastCheckInDate: "2026-08-30"
 *                     - habitId: "662c9f1e9f0b2a001c3d4e60"
 *                       title: "Read 20 mins"
 *                       frequency:
 *                         type: "daily"
 *                       currentStreak: 12
 *                       longestStreak: 21
 *                       rangeExpected: 31
 *                       rangeCompleted: 27
 *                       rangeCompletionRate: 0.87
 *                       lastCheckInDate: "2026-08-31"
 *                   trend:
 *                     - date: "2026-08-01"
 *                       focusMinutes: 50
 *                       completedSessions: 2
 *                       abandonedSessions: 0
 *                       habitsCompleted: 2
 *                       habitsExpected: 2
 *                     - date: "2026-08-02"
 *                       focusMinutes: 75
 *                       completedSessions: 2
 *                       abandonedSessions: 0
 *                       habitsCompleted: 2
 *                       habitsExpected: 2
 *                     - date: "2026-08-03"
 *                       focusMinutes: 45
 *                       completedSessions: 1
 *                       abandonedSessions: 1
 *                       habitsCompleted: 1
 *                       habitsExpected: 2
 *       400:
 *         description: Validation error (missing dates, invalid format, startDate > endDate, or range > 366 days)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "ValidationError"
 *               message: "Date range cannot exceed 366 days (1 year)"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "Unauthorized"
 *               message: "Authentication token missing or expired"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "InternalServerError"
 *               message: "Failed to generate productivity analytics"
 */
analyticsRouter.get(
  "/analytics/productivity",
  validate(analyticsDateRangeSchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id || req.user!._id;
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };

      const analytics = await getProductivityAnalytics(userId, startDate, endDate);
      return res.status(200).json(analytics);
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to generate productivity analytics"
      });
    }
  }
);

/**
 * @openapi
 * /analytics/finance:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Aggregated financial analytics, category breakdowns, and budget adherence
 *     description: |
 *       Aggregates income vs expense totals, category distribution, multi-month / daily spend trends,
 *       and budget adherence rates over a custom date range using Phase 4's underlying MongoDB aggregation pipelines.
 *       
 *       **Cross-Domain Integration:**
 *       This endpoint feeds into `/ai/recommendations/latest` (FR-10.3) for generating grounded weekly and monthly AI financial coaching recommendations.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, example: "2026-08-01" }
 *         description: Range start date (YYYY-MM-DD or ISO string)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, example: "2026-08-31" }
 *         description: Range end date (YYYY-MM-DD or ISO string, maximum 366 days from startDate)
 *     responses:
 *       200:
 *         description: Aggregated financial analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/FinanceAnalytics"
 *             examples:
 *               monthlyFinance:
 *                 summary: Realistic August 2026 financial analytics
 *                 value:
 *                   period:
 *                     startDate: "2026-08-01"
 *                     endDate: "2026-08-31"
 *                     totalDays: 31
 *                   summary:
 *                     totalIncome: 4500.00
 *                     totalExpense: 1280.50
 *                     netSavings: 3219.50
 *                     savingsRate: 71.54
 *                     transactionCount: 24
 *                   categoryBreakdown:
 *                     - category: "Groceries"
 *                       type: "expense"
 *                       totalAmount: 450.00
 *                       count: 6
 *                       percentage: 35.14
 *                     - category: "Dining Out"
 *                       type: "expense"
 *                       totalAmount: 280.00
 *                       count: 8
 *                       percentage: 21.87
 *                     - category: "Utilities"
 *                       type: "expense"
 *                       totalAmount: 220.50
 *                       count: 3
 *                       percentage: 17.22
 *                     - category: "Subscriptions"
 *                       type: "expense"
 *                       totalAmount: 145.00
 *                       count: 4
 *                       percentage: 11.32
 *                     - category: "Salary"
 *                       type: "income"
 *                       totalAmount: 4500.00
 *                       count: 1
 *                       percentage: 100.00
 *                   trend:
 *                     - period: "2026-08-01"
 *                       income: 4500.00
 *                       expense: 150.00
 *                       net: 4350.00
 *                     - period: "2026-08-08"
 *                       income: 0.00
 *                       expense: 320.00
 *                       net: -320.00
 *                     - period: "2026-08-15"
 *                       income: 0.00
 *                       expense: 410.50
 *                       net: -410.50
 *                     - period: "2026-08-22"
 *                       income: 0.00
 *                       expense: 280.00
 *                       net: -280.00
 *                     - period: "2026-08-29"
 *                       income: 0.00
 *                       expense: 120.00
 *                       net: -120.00
 *                   budgetAdherence:
 *                     budgetsTracked: 4
 *                     budgetsOnTrack: 3
 *                     budgetsExceeded: 1
 *                     adherenceRate: 0.75
 *                     budgets:
 *                       - budgetId: "662c9f1e9f0b2a001c3d4e30"
 *                         category: "Dining Out"
 *                         limit: 250.00
 *                         actualSpend: 280.00
 *                         percentUsed: 112.0
 *                         isOverBudget: true
 *                         status: "exceeded"
 *                       - budgetId: "662c9f1e9f0b2a001c3d4e31"
 *                         category: "Groceries"
 *                         limit: 500.00
 *                         actualSpend: 450.00
 *                         percentUsed: 90.0
 *                         isOverBudget: false
 *                         status: "warning"
 *                       - budgetId: "662c9f1e9f0b2a001c3d4e32"
 *                         category: "Utilities"
 *                         limit: 300.00
 *                         actualSpend: 220.50
 *                         percentUsed: 73.5
 *                         isOverBudget: false
 *                         status: "on_track"
 *                       - budgetId: "662c9f1e9f0b2a001c3d4e33"
 *                         category: "Subscriptions"
 *                         limit: 150.00
 *                         actualSpend: 145.00
 *                         percentUsed: 96.67
 *                         isOverBudget: false
 *                         status: "warning"
 *       400:
 *         description: Validation error (missing dates, invalid format, startDate > endDate, or range > 366 days)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "ValidationError"
 *               message: "startDate must be before or equal to endDate"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "Unauthorized"
 *               message: "Authentication token missing or expired"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "InternalServerError"
 *               message: "Failed to generate finance analytics"
 */
analyticsRouter.get(
  "/analytics/finance",
  validate(analyticsDateRangeSchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id || req.user!._id;
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };

      const analytics = await getFinanceAnalytics(userId, startDate, endDate);
      return res.status(200).json(analytics);
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to generate finance analytics"
      });
    }
  }
);

/**
 * @openapi
 * /analytics/export:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Export analytics data as raw CSV or PDF report
 *     description: |
 *       Generates a synchronous export file for either productivity or financial performance data across the specified date range.
 *       
 *       **CRITICAL: Raw Binary / Tabular Attachment Protocol (No JSON Envelope):**
 *       Unlike standard REST endpoints in this API that return JSON envelopes (`{ data, ... }`), this endpoint returns raw stream payloads:
 *       - **CSV (`text/csv; charset=utf-8`):** Formatted RFC 4180 tabular text with clean comma separation, quoted strings, and multi-section tables.
 *       - **PDF (`application/pdf`):** Binary multi-page PDF document styled with the LifeOS Notion-calm palette, typography, summary cards, and data tables.
 *       
 *       All successful responses include standard RFC 6266 attachment headers:
 *       - `Content-Disposition: attachment; filename="lifeos-{type}-{startDate}-to-{endDate}.{format}"`
 *       - `Content-Type: text/csv; charset=utf-8` or `application/pdf`
 *       - `Content-Length: <byte_count>` (for binary PDF buffers)
 *       
 *       **Rate Limiting:**
 *       Protected by dedicated Redis sliding-window rate limiting of **20 exports per hour per user**. Exceeding this limit returns HTTP 429 Too Many Requests with a `Retry-After: 3600` header.
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [productivity, finance], example: "productivity" }
 *         description: Domain category of data to export
 *       - in: query
 *         name: format
 *         required: true
 *         schema: { type: string, enum: [csv, pdf], example: "csv" }
 *         description: Output file format (CSV spreadsheet or styled binary PDF)
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, example: "2026-08-01" }
 *         description: Range start date (YYYY-MM-DD or ISO string)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, example: "2026-08-31" }
 *         description: Range end date (YYYY-MM-DD or ISO string, maximum 366 days from startDate)
 *     responses:
 *       200:
 *         description: Raw export attachment stream (CSV or binary PDF)
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: "text/csv; charset=utf-8"
 *             description: MIME type of the exported file
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: attachment; filename="lifeos-productivity-2026-08-01-to-2026-08-31.csv"
 *             description: RFC 6266 download attachment header with deterministic filename
 *           Content-Length:
 *             schema:
 *               type: integer
 *               example: 18420
 *             description: Size of binary payload in bytes (included for PDF responses)
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               description: RFC 4180 compliant CSV spreadsheet string with headers
 *             example: |
 *               LifeOS Productivity Report (2026-08-01 to 2026-08-31)
 *               Generated at,2026-08-31T18:00:00.000Z
 *               
 *               Habits Summary
 *               Total Expected,62
 *               Total Completed,54
 *               Completion Rate,87.1%
 *               
 *               Focus Summary
 *               Total Focus Minutes,1240
 *               Total Sessions,32
 *               Completed Sessions,28
 *               Abandoned Sessions,4
 *               
 *               Habit Consistency Breakdown
 *               Habit,Frequency,Current Streak,Longest Streak,Expected,Completed,Rate
 *               "Morning 30-min run",daily,5,14,31,27,87.1%
 *               "Read 20 mins",daily,12,21,31,27,87.1%
 *               
 *               Daily Trend
 *               Date,Focus Minutes,Completed Sessions,Abandoned Sessions,Habits Completed,Habits Expected
 *               2026-08-01,50,2,0,2,2
 *               2026-08-02,75,2,0,2,2
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *               description: Binary PDFKit-generated document stream
 *       400:
 *         description: Validation error (invalid parameters, missing dates, or range > 366 days)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "ValidationError"
 *               message: "Date range cannot exceed 366 days (1 year)"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "Unauthorized"
 *               message: "Authentication token missing or expired"
 *       429:
 *         description: Rate limit exceeded (more than 20 exports per hour)
 *         headers:
 *           Retry-After:
 *             schema:
 *               type: integer
 *               example: 3600
 *             description: Seconds to wait before attempting another export
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "TooManyRequests"
 *               message: "Export rate limit exceeded. Maximum 20 exports per hour. Please try again later."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *             example:
 *               error: "InternalServerError"
 *               message: "Failed to generate analytics export"
 */
analyticsRouter.get(
  "/analytics/export",
  exportRateLimiter,
  validate(analyticsExportQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id || req.user!._id.toString();
      const { type, format, startDate, endDate } = req.query as {
        type: "productivity" | "finance";
        format: "csv" | "pdf";
        startDate: string;
        endDate: string;
      };

      const { content, contentType, filename } = await generateAnalyticsExport(
        userId,
        type,
        format,
        startDate,
        endDate
      );

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      if (Buffer.isBuffer(content)) {
        res.setHeader("Content-Length", content.length);
        return res.status(200).end(content);
      }

      return res.status(200).send(content);
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to generate analytics export"
      });
    }
  }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     AnalyticsError:
 *       type: object
 *       required: [error, message]
 *       properties:
 *         error:
 *           type: string
 *           example: "ValidationError"
 *         message:
 *           type: string
 *           example: "Date range cannot exceed 366 days (1 year)"
 *     HabitConsistencyStat:
 *       type: object
 *       required: [habitId, title, frequency, currentStreak, longestStreak, rangeExpected, rangeCompleted, rangeCompletionRate]
 *       properties:
 *         habitId: { type: string, example: "662c9f1e9f0b2a001c3d4e5f" }
 *         title: { type: string, example: "Morning 30-min run" }
 *         frequency:
 *           type: object
 *           required: [type]
 *           properties:
 *             type: { type: string, enum: [daily, weekly, custom], example: "daily" }
 *             daysOfWeek: { type: array, items: { type: integer }, example: [1, 2, 3, 4, 5] }
 *             timesPerPeriod: { type: integer, example: 5 }
 *         currentStreak: { type: integer, example: 5 }
 *         longestStreak: { type: integer, example: 14 }
 *         rangeExpected: { type: integer, example: 31 }
 *         rangeCompleted: { type: integer, example: 27 }
 *         rangeCompletionRate: { type: number, example: 0.87 }
 *         lastCheckInDate: { type: string, nullable: true, example: "2026-08-30" }
 *     ProductivityDailyTrendItem:
 *       type: object
 *       required: [date, focusMinutes, completedSessions, abandonedSessions, habitsCompleted, habitsExpected]
 *       properties:
 *         date: { type: string, example: "2026-08-01" }
 *         focusMinutes: { type: number, example: 50 }
 *         completedSessions: { type: integer, example: 2 }
 *         abandonedSessions: { type: integer, example: 0 }
 *         habitsCompleted: { type: integer, example: 2 }
 *         habitsExpected: { type: integer, example: 2 }
 *     ProductivityAnalytics:
 *       type: object
 *       required: [period, habits, focus, habitConsistency, trend]
 *       properties:
 *         period:
 *           type: object
 *           required: [startDate, endDate, totalDays]
 *           properties:
 *             startDate: { type: string, example: "2026-08-01" }
 *             endDate: { type: string, example: "2026-08-31" }
 *             totalDays: { type: integer, example: 31 }
 *         habits:
 *           type: object
 *           required: [totalExpected, totalCompleted, completionRate]
 *           properties:
 *             totalExpected: { type: integer, example: 62 }
 *             totalCompleted: { type: integer, example: 54 }
 *             completionRate: { type: number, example: 0.87 }
 *         focus:
 *           type: object
 *           required: [totalFocusMinutes, totalSessionsCount, completedSessionsCount, abandonedSessionsCount, activeSessionsCount, averageSessionMinutes, linkedTypeBreakdown]
 *           properties:
 *             totalFocusMinutes: { type: number, example: 1240 }
 *             totalSessionsCount: { type: integer, example: 32 }
 *             completedSessionsCount: { type: integer, example: 28 }
 *             abandonedSessionsCount: { type: integer, example: 4 }
 *             activeSessionsCount: { type: integer, example: 0 }
 *             averageSessionMinutes: { type: number, example: 38.8 }
 *             linkedTypeBreakdown:
 *               type: array
 *               items:
 *                 type: object
 *                 required: [linkedType, totalMinutes, count, percentage]
 *                 properties:
 *                   linkedType: { type: string, enum: [topic, goal, task, none], example: "topic" }
 *                   totalMinutes: { type: number, example: 620 }
 *                   count: { type: integer, example: 15 }
 *                   percentage: { type: number, example: 50 }
 *         habitConsistency:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/HabitConsistencyStat"
 *         trend:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ProductivityDailyTrendItem"
 *     FinanceCategoryBreakdownItem:
 *       type: object
 *       required: [category, type, totalAmount, count, percentage]
 *       properties:
 *         category: { type: string, example: "Groceries" }
 *         type: { type: string, enum: [income, expense], example: "expense" }
 *         totalAmount: { type: number, example: 450.00 }
 *         count: { type: integer, example: 6 }
 *         percentage: { type: number, example: 35.14 }
 *     FinanceTrendItem:
 *       type: object
 *       required: [period, income, expense, net]
 *       properties:
 *         period: { type: string, example: "2026-08-01" }
 *         income: { type: number, example: 4500.00 }
 *         expense: { type: number, example: 150.00 }
 *         net: { type: number, example: 4350.00 }
 *     BudgetAdherenceItem:
 *       type: object
 *       required: [budgetId, category, limit, actualSpend, percentUsed, isOverBudget, status]
 *       properties:
 *         budgetId: { type: string, example: "662c9f1e9f0b2a001c3d4e30" }
 *         category: { type: string, example: "Dining Out" }
 *         limit: { type: number, example: 250.00 }
 *         actualSpend: { type: number, example: 280.00 }
 *         percentUsed: { type: number, example: 112.0 }
 *         isOverBudget: { type: boolean, example: true }
 *         status: { type: string, enum: [on_track, warning, exceeded], example: "exceeded" }
 *     FinanceAnalytics:
 *       type: object
 *       required: [period, summary, categoryBreakdown, trend, budgetAdherence]
 *       properties:
 *         period:
 *           type: object
 *           required: [startDate, endDate, totalDays]
 *           properties:
 *             startDate: { type: string, example: "2026-08-01" }
 *             endDate: { type: string, example: "2026-08-31" }
 *             totalDays: { type: integer, example: 31 }
 *         summary:
 *           type: object
 *           required: [totalIncome, totalExpense, netSavings, savingsRate, transactionCount]
 *           properties:
 *             totalIncome: { type: number, example: 4500.00 }
 *             totalExpense: { type: number, example: 1280.50 }
 *             netSavings: { type: number, example: 3219.50 }
 *             savingsRate: { type: number, example: 71.54 }
 *             transactionCount: { type: integer, example: 24 }
 *         categoryBreakdown:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/FinanceCategoryBreakdownItem"
 *         trend:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/FinanceTrendItem"
 *         budgetAdherence:
 *           type: object
 *           required: [budgetsTracked, budgetsOnTrack, budgetsExceeded, adherenceRate, budgets]
 *           properties:
 *             budgetsTracked: { type: integer, example: 4 }
 *             budgetsOnTrack: { type: integer, example: 3 }
 *             budgetsExceeded: { type: integer, example: 1 }
 *             adherenceRate: { type: number, example: 0.75 }
 *             budgets:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/BudgetAdherenceItem"
 */
