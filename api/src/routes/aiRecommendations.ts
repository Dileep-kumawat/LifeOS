import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "../middleware/authMiddleware.js";
import { Recommendation } from "../models/Recommendation.js";
import { logger } from "../logger.js";

export const aiRecommendationsRouter = Router();

aiRecommendationsRouter.use(requireAuth);

function formatRecommendation(doc: any) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    period: doc.period,
    periodStart: doc.periodStart,
    periodEnd: doc.periodEnd,
    recommendations: (doc.recommendations || []).map((item: any) => ({
      id: item.id || undefined,
      domain: item.domain || "general",
      title: item.title,
      category: item.category || "general",
      message: item.message,
      actionableStep: item.actionableStep,
      metricGrounded: item.metricGrounded || undefined,
      impact: item.impact || "medium"
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
 * /ai/recommendations/latest:
 *   get:
 *     tags:
 *       - AI
 *     summary: Get latest periodic AI recommendations
 *     description: |
 *       Retrieves the latest scheduled AI recommendations for the user on a weekly or monthly cadence (FR-10.3).
 *       
 *       **Cross-Domain Architectural Integration:**
 *       This endpoint extends Phase 3's core AI assistant surface by composing Phase 9's Analytics aggregation layer
 *       (`/analytics/productivity` & `/analytics/finance`) with the LLM reasoning pipeline (`callAI`).
 *       Recommendations are generated strictly through automated background jobs (weekly on Sundays at 08:00 and monthly on the 1st of the month at 08:00),
 *       guaranteeing deterministic metric grounding in the user's real logged habits, focus minutes, and financial category budgets.
 *       
 *       If no recommendation has been generated yet for the requested cadence, returns `{ generated: false, reason: "not_yet_generated", recommendation: null }`.
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [weekly, monthly]
 *           default: weekly
 *         description: Cadence period to retrieve (weekly for past 7 days, monthly for past calendar month)
 *     responses:
 *       200:
 *         description: Latest recommendation document or scheduled status state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LatestRecommendationResponse"
 *             examples:
 *               weeklyPopulated:
 *                 summary: Populated weekly recommendation with grounded productivity & finance insights
 *                 value:
 *                   generated: true
 *                   period: "weekly"
 *                   recommendation:
 *                     id: "662c9f1e9f0b2a001c3d4e90"
 *                     userId: "662c9f1e9f0b2a001c3d4e5a"
 *                     period: "weekly"
 *                     periodStart: "2026-08-24"
 *                     periodEnd: "2026-08-30"
 *                     recommendations:
 *                       - id: "rec-1"
 *                         domain: "finance"
 *                         title: "Rebalance Dining Out Spending"
 *                         category: "Dining Out"
 *                         message: "Your Dining Out spend reached $280 this week, exceeding your $250 monthly category budget."
 *                         actionableStep: "Set an 80% spending threshold alert and substitute 2 restaurant dinners with meal prep."
 *                         metricGrounded: "$280 spent / $250 limit (112%)"
 *                         impact: "high"
 *                       - id: "rec-2"
 *                         domain: "habits"
 *                         title: "Strengthen Weekend Habit Consistency"
 *                         category: "Morning 30-min run"
 *                         message: "Habit check-in consistency dropped to 40% on weekends compared to 90% on weekdays."
 *                         actionableStep: "Try a lighter 15-minute weekend jogging goal to maintain streak."
 *                         metricGrounded: "40% weekend completion rate"
 *                         impact: "medium"
 *                       - id: "rec-3"
 *                         domain: "productivity"
 *                         title: "Maintain Deep Work Cadence"
 *                         category: "Focus"
 *                         message: "You accumulated 150 minutes across 5 completed focus timer sessions with 0 abandons."
 *                         actionableStep: "Schedule 2 morning 25-minute Pomodoro blocks for your core syllabus topic."
 *                         metricGrounded: "150 focus mins (5 sessions)"
 *                         impact: "low"
 *                     generatedAt: "2026-08-31T08:00:00.000Z"
 *               monthlyPopulated:
 *                 summary: Populated monthly recommendation summarizing August 2026 performance
 *                 value:
 *                   generated: true
 *                   period: "monthly"
 *                   recommendation:
 *                     id: "662c9f1e9f0b2a001c3d4e91"
 *                     userId: "662c9f1e9f0b2a001c3d4e5a"
 *                     period: "monthly"
 *                     periodStart: "2026-08-01"
 *                     periodEnd: "2026-08-31"
 *                     recommendations:
 *                       - id: "rec-m-1"
 *                         domain: "finance"
 *                         title: "Optimize Subscription Outflows"
 *                         category: "Subscriptions"
 *                         message: "Software subscriptions increased 18% month-over-month totaling $145."
 *                         actionableStep: "Review active SaaS recurring charges and cancel unused tool tiers."
 *                         metricGrounded: "$145 / month (+18% vs July)"
 *                         impact: "high"
 *                       - id: "rec-m-2"
 *                         domain: "habits"
 *                         title: "Reading Habit Milestone"
 *                         category: "Evening Reading"
 *                         message: "You achieved an 88% completion rate for evening reading across all 31 days."
 *                         actionableStep: "Consider increasing your daily reading goal from 20 to 30 minutes."
 *                         metricGrounded: "27/31 completed days (88%)"
 *                         impact: "medium"
 *                     generatedAt: "2026-09-01T08:00:00.000Z"
 *               notYetGenerated:
 *                 summary: Scheduled state prior to cron generator execution
 *                 value:
 *                   generated: false
 *                   period: "weekly"
 *                   reason: "not_yet_generated"
 *                   recommendation: null
 *       400:
 *         description: Invalid period parameter (must be weekly or monthly)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RecommendationError"
 *             example:
 *               error: "ValidationError"
 *               message: "Invalid period parameter. Must be 'weekly' or 'monthly'."
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RecommendationError"
 *             example:
 *               error: "Unauthorized"
 *               message: "Authentication token missing or expired"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RecommendationError"
 *             example:
 *               error: "InternalServerError"
 *               message: "Failed to fetch latest recommendations"
 */
aiRecommendationsRouter.get("/ai/recommendations/latest", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const period = (req.query.period as string) || "weekly";

    if (period !== "weekly" && period !== "monthly") {
      return res.status(400).json({
        error: "ValidationError",
        message: "Invalid period parameter. Must be 'weekly' or 'monthly'."
      });
    }

    const recommendationDoc = await Recommendation.findOne({ userId, period }).sort({
      generatedAt: -1,
      periodStart: -1
    });

    if (recommendationDoc) {
      return res.status(200).json({
        generated: true,
        period,
        recommendation: formatRecommendation(recommendationDoc)
      });
    }

    return res.status(200).json({
      generated: false,
      period,
      reason: "not_yet_generated",
      recommendation: null
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch latest recommendations");
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to fetch latest recommendations"
    });
  }
});

/**
 * @openapi
 * /ai/recommendations/{id}:
 *   get:
 *     tags:
 *       - AI
 *     summary: Get historical recommendation by ID
 *     description: |
 *       Returns a specific historical periodic recommendation document by its MongoDB ObjectId.
 *       Allows inspecting historical recommendations and coaching items generated in prior weeks or months.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "662c9f1e9f0b2a001c3d4e90"
 *         description: MongoDB ObjectID of the recommendation document
 *     responses:
 *       200:
 *         description: Historical recommendation document
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LatestRecommendationResponse"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RecommendationError"
 *             example:
 *               error: "ValidationError"
 *               message: "Invalid recommendation ID."
 *       404:
 *         description: Recommendation document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RecommendationError"
 *             example:
 *               error: "NotFound"
 *               message: "Recommendation not found with ID 662c9f1e9f0b2a001c3d4e90"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RecommendationError"
 *             example:
 *               error: "Unauthorized"
 *               message: "Authentication token missing or expired"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RecommendationError"
 *             example:
 *               error: "InternalServerError"
 *               message: "Failed to fetch recommendation"
 */
aiRecommendationsRouter.get("/ai/recommendations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id.toString();

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Invalid recommendation ID."
      });
    }

    const recommendationDoc = await Recommendation.findOne({ _id: id, userId });

    if (!recommendationDoc) {
      return res.status(404).json({
        error: "NotFound",
        message: `Recommendation not found with ID ${id}`
      });
    }

    return res.status(200).json({
      generated: true,
      period: recommendationDoc.period,
      recommendation: formatRecommendation(recommendationDoc)
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, "Failed to fetch recommendation by ID");
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to fetch recommendation"
    });
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     RecommendationError:
 *       type: object
 *       required: [error, message]
 *       properties:
 *         error:
 *           type: string
 *           example: "ValidationError"
 *         message:
 *           type: string
 *           example: "Invalid period parameter. Must be 'weekly' or 'monthly'."
 *     RecommendationItem:
 *       type: object
 *       required: [title, category, message, actionableStep, domain, impact]
 *       properties:
 *         id: { type: string, example: "rec-1" }
 *         domain:
 *           type: string
 *           enum: [productivity, finance, habits, general]
 *           example: "finance"
 *         title: { type: string, example: "Rebalance Dining Out Budget" }
 *         category: { type: string, example: "Dining Out" }
 *         message: { type: string, example: "Your Dining Out spend reached $280, exceeding your $250 monthly budget." }
 *         actionableStep: { type: string, example: "Set an 80% spending threshold alert and prepare meals at home this week." }
 *         metricGrounded: { type: string, example: "$280 spent / $250 limit (112%)" }
 *         impact:
 *           type: string
 *           enum: [high, medium, low]
 *           example: "high"
 *     Recommendation:
 *       type: object
 *       required: [id, userId, period, periodStart, periodEnd, recommendations, generatedAt]
 *       properties:
 *         id: { type: string, example: "662c9f1e9f0b2a001c3d4e90" }
 *         userId: { type: string, example: "662c9f1e9f0b2a001c3d4e5a" }
 *         period:
 *           type: string
 *           enum: [weekly, monthly]
 *           example: "weekly"
 *         periodStart: { type: string, example: "2026-08-24" }
 *         periodEnd: { type: string, example: "2026-08-30" }
 *         recommendations:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/RecommendationItem"
 *         generatedAt: { type: string, format: date-time, example: "2026-08-31T08:00:00.000Z" }
 *     LatestRecommendationResponse:
 *       type: object
 *       required: [generated, period]
 *       properties:
 *         generated: { type: boolean, example: true }
 *         period: { type: string, enum: [weekly, monthly], example: "weekly" }
 *         reason: { type: string, nullable: true, example: null }
 *         recommendation:
 *           allOf:
 *             - $ref: "#/components/schemas/Recommendation"
 *           nullable: true
 */
