import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { Summary } from "../models/Summary.js";
import { generateDailySummary } from "../services/ai/summaryGenerator.js";
import { dateKeyInZone } from "../services/recurrence.js";
import { getCurrentHHMM } from "../services/ai/summaryDispatcher.js";
import { logger } from "../logger.js";

export const aiSummaryRouter = Router();

aiSummaryRouter.use(requireAuth);

function formatSummary(doc: any) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    date: doc.date,
    yesterdayCompleted: (doc.yesterdayCompleted || []).map((item: any) => ({
      id: item.id || undefined,
      title: item.title,
      type: item.type || "habit",
      completedAt: item.completedAt
        ? typeof item.completedAt === "string"
          ? item.completedAt
          : item.completedAt.toISOString()
        : undefined
    })),
    todaySchedule: (doc.todaySchedule || []).map((item: any) => ({
      occurrenceId: item.occurrenceId || undefined,
      title: item.title,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location || "",
      isAllDay: Boolean(item.isAllDay)
    })),
    topPriorities: (doc.topPriorities || []).map((item: any) => ({
      title: item.title,
      category: item.category || "general",
      rationale: item.rationale || ""
    })),
    generatedAt: doc.generatedAt
      ? typeof doc.generatedAt === "string"
        ? doc.generatedAt
        : doc.generatedAt.toISOString()
      : new Date().toISOString()
  };
}

/**
 * @openapi
 * /ai/summary/today:
 *   get:
 *     tags:
 *       - AI
 *     summary: Get today's daily summary
 *     description: |
 *       Returns today's AI-generated daily summary including yesterday's completed items,
 *       today's expanded calendar schedule, and top 3 priorities. If the user's configured
 *       delivery time has not passed yet and no summary has been pre-generated, returns
 *       a clear `generated: false` state with the configured delivery time.
 *     responses:
 *       200:
 *         description: Today's daily summary or status state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generated: { type: boolean }
 *                 reason: { type: string, nullable: true }
 *                 deliveryTime: { type: string, nullable: true }
 *                 summary:
 *                   $ref: "#/components/schemas/DailySummary"
 *             examples:
 *               populated:
 *                 value:
 *                   generated: true
 *                   summary:
 *                     id: 662c9f1e9f0b2a001c3d4e81
 *                     userId: 662c9f1e9f0b2a001c3d4e5a
 *                     date: "2026-08-12"
 *                     yesterdayCompleted:
 *                       - id: "habit-1"
 *                         title: "Morning 30-min run"
 *                         type: "habit"
 *                     todaySchedule:
 *                       - occurrenceId: "evt-1@2026-08-12T14:00:00.000Z"
 *                         title: "Product Architecture Review"
 *                         startTime: "2026-08-12T14:00:00.000Z"
 *                         endTime: "2026-08-12T15:00:00.000Z"
 *                         location: "Conference Room A"
 *                         isAllDay: false
 *                     topPriorities:
 *                       - title: "Finalize Phase 2 API specs"
 *                         category: "goal"
 *                         rationale: "Target date is approaching"
 *                       - title: "Product Architecture Review"
 *                         category: "schedule"
 *                         rationale: "Key team milestone today"
 *                       - title: "Complete 30-min morning run"
 *                         category: "habit"
 *                         rationale: "Maintain 5-day habit streak"
 *                     generatedAt: "2026-08-12T07:00:00.000Z"
 *               notYetGenerated:
 *                 value:
 *                   generated: false
 *                   reason: "not_yet_generated"
 *                   deliveryTime: "07:00"
 *                   summary: null
 *       401:
 *         description: Authentication required
 */
aiSummaryRouter.get("/ai/summary/today", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user._id.toString();
    const dsPref = user.notificationPreferences?.dailySummary;
    const timezone = dsPref?.timezone || "UTC";
    const deliveryTime = dsPref?.deliveryTime || "07:00";

    const todayKey = dateKeyInZone(new Date(), timezone);
    let summaryDoc: any = await Summary.findOne({ userId, date: todayKey });

    if (summaryDoc) {
      return res.status(200).json({
        generated: true,
        summary: formatSummary(summaryDoc)
      });
    }

    const currentHHMM = getCurrentHHMM(new Date(), timezone);

    // If delivery time has passed, attempt on-demand generation
    if (currentHHMM >= deliveryTime) {
      try {
        summaryDoc = await generateDailySummary(userId, todayKey);
        return res.status(200).json({
          generated: true,
          summary: formatSummary(summaryDoc)
        });
      } catch (genErr) {
        logger.error({ genErr, userId, date: todayKey }, "On-demand summary generation failed");
      }
    }

    return res.status(200).json({
      generated: false,
      reason: "not_yet_generated",
      deliveryTime,
      summary: null
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch today's summary");
    return res
      .status(500)
      .json({ error: "InternalServerError", message: "Failed to fetch today's summary" });
  }
});

/**
 * @openapi
 * /ai/summary/{date}:
 *   get:
 *     tags:
 *       - AI
 *     summary: Get historical daily summary by date
 *     description: Returns the daily summary document for a specific historical date (YYYY-MM-DD).
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-08-11"
 *     responses:
 *       200:
 *         description: Historical daily summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generated: { type: boolean }
 *                 summary:
 *                   $ref: "#/components/schemas/DailySummary"
 *       400:
 *         description: Invalid date format (must be YYYY-MM-DD)
 *       404:
 *         description: Summary not found for the specified date
 *       401:
 *         description: Authentication required
 *       429:
 *         description: AI daily rate limit exceeded for subscription tier
 */
aiSummaryRouter.get("/ai/summary/:date", async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const userId = req.user!._id.toString();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Invalid date format. Use YYYY-MM-DD."
      });
    }

    const summaryDoc = await Summary.findOne({ userId, date });

    if (!summaryDoc) {
      return res.status(404).json({
        error: "NotFound",
        message: `Daily summary not found for date ${date}`
      });
    }

    return res.status(200).json({
      generated: true,
      summary: formatSummary(summaryDoc)
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch historical summary");
    return res
      .status(500)
      .json({ error: "InternalServerError", message: "Failed to fetch summary" });
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     DailySummary:
 *       type: object
 *       required: [id, userId, date, yesterdayCompleted, todaySchedule, topPriorities, generatedAt]
 *       properties:
 *         id: { type: string }
 *         userId: { type: string }
 *         date: { type: string, example: "2026-08-12" }
 *         yesterdayCompleted:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               title: { type: string }
 *               type: { type: string }
 *               completedAt: { type: string, format: date-time }
 *         todaySchedule:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               occurrenceId: { type: string }
 *               title: { type: string }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               location: { type: string }
 *               isAllDay: { type: boolean }
 *         topPriorities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               rationale: { type: string }
 *         generatedAt: { type: string, format: date-time }
 */
