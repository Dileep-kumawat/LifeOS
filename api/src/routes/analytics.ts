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
 *     tags: [Analytics]
 *     summary: Aggregated productivity metrics across habits and focus sessions
 *     description: |
 *       Aggregates completed vs scheduled habits (reusing frequency calculation math),
 *       focus time totals and linked category distribution (reusing Focus module aggregation pipelines),
 *       per-habit streak and consistency data, and contiguous daily time-series trends over a bounded date range.
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
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate: { type: string, example: "2026-08-01" }
 *                     endDate: { type: string, example: "2026-08-31" }
 *                     totalDays: { type: integer, example: 31 }
 *                 habits:
 *                   type: object
 *                   properties:
 *                     totalExpected: { type: integer, example: 62 }
 *                     totalCompleted: { type: integer, example: 54 }
 *                     completionRate: { type: number, example: 0.87 }
 *                 focus:
 *                   type: object
 *                   properties:
 *                     totalFocusMinutes: { type: number, example: 1240 }
 *                     totalSessionsCount: { type: integer, example: 32 }
 *                     completedSessionsCount: { type: integer, example: 28 }
 *                     abandonedSessionsCount: { type: integer, example: 4 }
 *                     activeSessionsCount: { type: integer, example: 0 }
 *                     averageSessionMinutes: { type: number, example: 38.8 }
 *                     linkedTypeBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           linkedType: { type: string, enum: [topic, goal, task, none], example: "topic" }
 *                           totalMinutes: { type: number, example: 620 }
 *                           count: { type: integer, example: 15 }
 *                           percentage: { type: number, example: 50 }
 *                 habitConsistency:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       habitId: { type: string, example: "662c9f1e9f0b2a001c3d4e5f" }
 *                       title: { type: string, example: "Morning run" }
 *                       frequency:
 *                         type: object
 *                         properties:
 *                           type: { type: string, example: "daily" }
 *                       currentStreak: { type: integer, example: 5 }
 *                       longestStreak: { type: integer, example: 14 }
 *                       rangeExpected: { type: integer, example: 31 }
 *                       rangeCompleted: { type: integer, example: 27 }
 *                       rangeCompletionRate: { type: number, example: 0.87 }
 *                       lastCheckInDate: { type: string, nullable: true, example: "2026-08-30" }
 *                 trend:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date: { type: string, example: "2026-08-01" }
 *                       focusMinutes: { type: number, example: 50 }
 *                       completedSessions: { type: integer, example: 2 }
 *                       abandonedSessions: { type: integer, example: 0 }
 *                       habitsCompleted: { type: integer, example: 2 }
 *                       habitsExpected: { type: integer, example: 2 }
 *       400:
 *         description: Validation error (missing dates, invalid format, startDate > endDate, or range > 366 days)
 *       401:
 *         description: Authentication required
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
 *     tags: [Analytics]
 *     summary: Aggregated financial analytics, category breakdowns, and budget adherence
 *     description: |
 *       Aggregates income vs expense totals, category distribution, multi-month / daily spend trends,
 *       and budget adherence rates over a custom date range using Phase 4's underlying MongoDB aggregation pipelines.
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
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate: { type: string, example: "2026-08-01" }
 *                     endDate: { type: string, example: "2026-08-31" }
 *                     totalDays: { type: integer, example: 31 }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalIncome: { type: number, example: 4500.00 }
 *                     totalExpense: { type: number, example: 1280.50 }
 *                     netSavings: { type: number, example: 3219.50 }
 *                     savingsRate: { type: number, example: 71.54 }
 *                     transactionCount: { type: integer, example: 24 }
 *                 categoryBreakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category: { type: string, example: "Groceries" }
 *                       type: { type: string, enum: [income, expense], example: "expense" }
 *                       totalAmount: { type: number, example: 450.00 }
 *                       count: { type: integer, example: 6 }
 *                       percentage: { type: number, example: 35 }
 *                 trend:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period: { type: string, example: "2026-08-01" }
 *                       income: { type: number, example: 0 }
 *                       expense: { type: number, example: 45.00 }
 *                       net: { type: number, example: -45.00 }
 *                 budgetAdherence:
 *                   type: object
 *                   properties:
 *                     budgetsTracked: { type: integer, example: 4 }
 *                     budgetsOnTrack: { type: integer, example: 3 }
 *                     budgetsExceeded: { type: integer, example: 1 }
 *                     adherenceRate: { type: number, example: 0.75 }
 *                     budgets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           budgetId: { type: string, example: "662c9f1e9f0b2a001c3d4e30" }
 *                           category: { type: string, example: "Dining Out" }
 *                           limit: { type: number, example: 250.00 }
 *                           actualSpend: { type: number, example: 280.00 }
 *                           percentUsed: { type: number, example: 112 }
 *                           isOverBudget: { type: boolean, example: true }
 *                           status: { type: string, enum: [on_track, warning, exceeded], example: "exceeded" }
 *       400:
 *         description: Validation error (missing dates, invalid format, startDate > endDate, or range > 366 days)
 *       401:
 *         description: Authentication required
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
 *     tags: [Analytics]
 *     summary: Export analytics data as raw CSV or PDF report
 *     description: |
 *       Generates a synchronous export file for either productivity or financial performance data across the specified date range.
 *       
 *       **Note on Response Format**: This endpoint returns raw binary/text attachment payloads (`text/csv` or `application/pdf`)
 *       with an RFC 6266 `Content-Disposition: attachment; filename="..."` header rather than the API's standard JSON response envelope.
 *       Requests are rate-limited per user via Redis (maximum 20 exports per hour).
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
 *         description: File format (CSV spreadsheet or styled PDF document)
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
 *         description: Raw export file stream
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: attachment; filename="lifeos-productivity-2026-08-01-to-2026-08-31.csv"
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               description: Tabular CSV formatted data
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *               description: Binary PDF document
 *       400:
 *         description: Validation error (invalid parameters or date range)
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded (more than 20 exports per hour)
 *         headers:
 *           Retry-After:
 *             schema:
 *               type: integer
 *               example: 3600
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
